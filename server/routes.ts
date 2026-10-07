import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { FilesystemScanner } from './scanner';
import { normalizePath, isProtected, safeDestinationFilename, verifyPathInScope } from './safePath';
import { formatSize } from './sizes';
import { quarantineFile, restoreQuarantinedFile, deletePermanentlyFromQuarantine, listQuarantinedFiles, addQuarantineManifestEntry } from './quarantineManager';
import { logAction, getHistory, undoAction } from './historyManager';
import { createDemoWorkspace } from './demoGenerator';
import { SETTINGS_FILE, DEFAULT_SETTINGS, DEMO_DIR, IS_WINDOWS } from './config';
import { getDiskUsage } from './storageAnalyzer';

export const scanner = new FilesystemScanner();
export const apiRouter = Router();

function loadSettings() {
  if (!fs.existsSync(SETTINGS_FILE)) {
    return { ...DEFAULT_SETTINGS };
  }
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings: any) {
  fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
}

function makeSuccess<T = any>(data: T, message?: string) {
  return {
    success: true,
    data,
    ...(message ? { message } : {}),
  };
}

function makeError(code: string, message: string, status = 400) {
  return {
    status,
    payload: {
      success: false,
      error: { code, message },
    },
  };
}

// ----------------- HEALTH CHECK -----------------
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json(makeSuccess({ status: 'healthy', service: 'SmartClean API', engine: 'Node.js Express' }));
});

// ----------------- DRIVES & SCOPES -----------------
apiRouter.get('/drives', (req: Request, res: Response) => {
  const drives: any[] = [];
  const userHome = os.homedir();

  const diskUsage = getDiskUsage(userHome);
  drives.push({
    name: IS_WINDOWS ? 'Local Disk (C:)' : 'System Root (/)',
    path: IS_WINDOWS ? 'C:\\' : '/',
    type: 'drive',
    total_formatted: diskUsage.total_formatted,
    free_formatted: diskUsage.free_formatted,
    used_percent: diskUsage.percent_used,
  });

  const userPresets = [
    { name: 'Home Folder', path: userHome, type: 'preset' },
    { name: 'Desktop', path: path.join(userHome, 'Desktop'), type: 'preset' },
    { name: 'Documents', path: path.join(userHome, 'Documents'), type: 'preset' },
    { name: 'Downloads', path: path.join(userHome, 'Downloads'), type: 'preset' },
    { name: 'Pictures', path: path.join(userHome, 'Pictures'), type: 'preset' },
  ];

  const validPresets = userPresets.filter((p) => fs.existsSync(p.path));
  const demoExists = fs.existsSync(DEMO_DIR);

  res.json(
    makeSuccess({
      drives,
      presets: validPresets,
      demo_available: demoExists,
      demo_path: demoExists ? DEMO_DIR : null,
      current_scope: scanner.scope,
    })
  );
});

// ----------------- SCAN CONTROLS -----------------
apiRouter.post('/scan/start', (req: Request, res: Response) => {
  const scope = req.body?.scope;
  if (!scope) {
    return res.status(400).json(makeError('MISSING_SCOPE', 'Target scan directory path is required').payload);
  }

  // Guard against sending Windows client paths (e.g. C:\Users\...) or other client paths to remote Linux server
  if (
    !IS_WINDOWS &&
    (/^[a-zA-Z]:[/\\]/.test(scope) ||
      scope.startsWith('/Users/') ||
      scope.startsWith('C:') ||
      scope.startsWith('D:') ||
      scope.startsWith('~/'))
  ) {
    return res.status(400).json(
      makeError(
        'REMOTE_PATH_UNSUPPORTED',
        `Cannot scan local client device path ('${scope}') directly on the remote server. Please use your browser's folder selector so SmartClean can access your files directly.`,
        400
      ).payload
    );
  }

  try {
    const result = scanner.startScan(scope);
    return res.json(makeSuccess(result, 'Scan initiated successfully'));
  } catch (err: any) {
    return res.status(400).json(makeError('SCAN_ERROR', err.message).payload);
  }
});

apiRouter.post('/scan/ingest', (req: Request, res: Response) => {
  const { scope_name, files } = req.body || {};
  if (!files || !Array.isArray(files)) {
    return res.status(400).json(makeError('MISSING_FILES', 'Array of scanned file records is required').payload);
  }

  try {
    const scopeLabel = scope_name || 'Selected Storage';
    const result = scanner.ingestClientFiles(scopeLabel, files);
    return res.json(makeSuccess(result, `Analyzed ${files.length} files from ${scopeLabel}`));
  } catch (err: any) {
    return res.status(500).json(makeError('INGESTION_ERROR', err.message, 500).payload);
  }
});

apiRouter.post('/scan/pause', (req: Request, res: Response) => {
  const result = scanner.pauseScan();
  res.json(makeSuccess(result));
});

apiRouter.post('/scan/resume', (req: Request, res: Response) => {
  const result = scanner.resumeScan();
  res.json(makeSuccess(result));
});

apiRouter.post('/scan/cancel', (req: Request, res: Response) => {
  const result = scanner.cancelScan();
  res.json(makeSuccess(result));
});

apiRouter.get('/scan/status', (req: Request, res: Response) => {
  const status = scanner.getStatus();
  res.json(makeSuccess(status));
});

// ----------------- SUMMARY & DASHBOARD -----------------
apiRouter.get('/summary', (req: Request, res: Response) => {
  const status = scanner.getStatus();

  if (!scanner.scannedFiles.length && status.status !== 'completed') {
    return res.json(
      makeSuccess({
        has_scanned: false,
        status: status.status,
        scope: scanner.scope,
        total_files: 0,
        total_storage_formatted: '0 B',
        used_storage_formatted: '0 B',
        free_storage_formatted: '0 B',
        reclaimable_storage_formatted: '0 B',
        reclaimable_bytes: 0,
        reclaimable_storage_bytes: 0,
        duplicate_count: 0,
        temporary_files_count: 0,
        misplaced_files_count: 0,
        important_files_count: 0,
        categories: [],
        top_folders: [],
      })
    );
  }

  const tempCount = scanner.scannedFiles.filter((f) => f.category === 'Temporary').length;
  const importantCount = scanner.scannedFiles.filter((f) => (f.importance_score ?? 0) >= 70).length;
  const misplacedCount = scanner.organizationResult.length;
  const dupCount = scanner.duplicatesResult.total_duplicate_files;

  const storage = scanner.storageResult.disk || getDiskUsage(scanner.scope);
  const dupReclaimableFmt = scanner.duplicatesResult.total_reclaimable_formatted || '0 B';
  const cleanReclaimableFmt = scanner.cleanupResult.safe_reclaimable_formatted || '0 B';
  const cleanupTotalItems = scanner.cleanupResult.total_candidates;

  return res.json(
    makeSuccess({
      has_scanned: true,
      status: status.status,
      scope: scanner.scope,
      is_client_scope: scanner.isClientScope,
      total_scanned_bytes: scanner.storageResult.total_scanned_bytes || 0,
      total_scanned_formatted: scanner.storageResult.total_scanned_formatted || '0 B',
      total_files: scanner.scannedFiles.length,
      scanned_files_count: scanner.scannedFiles.length,
      total_storage_formatted: storage.total_formatted || '0 B',
      used_storage_formatted: storage.used_formatted || '0 B',
      free_storage_formatted: storage.free_formatted || '0 B',
      percent_used: storage.percent_used || 0,
      reclaimable_bytes: scanner.storageResult.reclaimable_bytes || 0,
      reclaimable_storage_bytes: scanner.storageResult.reclaimable_bytes || 0,
      reclaimable_storage_formatted: scanner.storageResult.reclaimable_formatted || '0 B',
      duplicate_count: dupCount,
      duplicates_count: dupCount,
      duplicate_reclaimable_formatted: dupReclaimableFmt,
      cleanup_count: cleanupTotalItems,
      cleanup_reclaimable_formatted: cleanReclaimableFmt,
      temporary_files_count: tempCount,
      misplaced_files_count: misplacedCount,
      misplaced_count: misplacedCount,
      important_files_count: importantCount,
      important_count: importantCount,
      categories: scanner.storageResult.categories || [],
      top_folders: scanner.storageResult.top_folders || [],
      safe_cleanup_summary: {
        total_candidates: cleanupTotalItems,
        safe_reclaimable_formatted: cleanReclaimableFmt,
      },
    })
  );
});

// ----------------- FILES LIST & DETAILS -----------------
apiRouter.get('/files', (req: Request, res: Response) => {
  const catFilter = req.query.type as string | undefined;
  const riskFilter = req.query.risk as string | undefined;
  const importanceFilter = req.query.importance as string | undefined;
  const query = (req.query.q as string | undefined)?.trim().toLowerCase() || '';

  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const limit = Math.min(200, Math.max(10, parseInt((req.query.limit as string) || '50', 10)));
  const sortBy = (req.query.sort_by as string) || 'size';
  const sortDir = (req.query.sort_dir as string) || 'desc';

  let filtered = [...scanner.scannedFiles];

  if (catFilter && catFilter !== 'all') {
    filtered = filtered.filter((f) => f.category === catFilter);
  }

  if (riskFilter && riskFilter !== 'all') {
    filtered = filtered.filter((f) => f.risk === riskFilter);
  }

  if (importanceFilter && importanceFilter !== 'all') {
    filtered = filtered.filter((f) => f.importance_label === importanceFilter);
  }

  if (query) {
    filtered = filtered.filter(
      (f) =>
        f.filename.toLowerCase().includes(query) ||
        f.path.toLowerCase().includes(query)
    );
  }

  const reverse = sortDir === 'desc';
  filtered.sort((a, b) => {
    let diff = 0;
    if (sortBy === 'size') {
      diff = (a.size || 0) - (b.size || 0);
    } else if (sortBy === 'mtime') {
      diff = (a.mtime || 0) - (b.mtime || 0);
    } else if (sortBy === 'name') {
      diff = a.filename.localeCompare(b.filename);
    } else if (sortBy === 'importance') {
      diff = (a.importance_score || 0) - (b.importance_score || 0);
    }
    return reverse ? -diff : diff;
  });

  const totalCount = filtered.length;
  const startIdx = (page - 1) * limit;
  const pageItems = filtered.slice(startIdx, startIdx + limit);

  return res.json(
    makeSuccess({
      items: pageItems,
      files: pageItems,
      total: totalCount,
      page,
      limit,
      total_pages: totalCount > 0 ? Math.ceil(totalCount / limit) : 1,
    })
  );
});

apiRouter.get('/files/:file_id', (req: Request, res: Response) => {
  const fileId = req.params.file_id;
  const fileInfo = scanner.filesById.get(fileId);

  if (!fileInfo) {
    return res.status(404).json(makeError('FILE_NOT_FOUND', 'File record not found in current scan session', 404).payload);
  }

  const fileExists = fs.existsSync(fileInfo.path);
  const dupGroup = scanner.duplicatesResult.groups.find((g) =>
    g.copies.some((c) => c.id === fileId)
  );
  const orgRec = scanner.organizationResult.find((r) => r.file_id === fileId);

  return res.json(
    makeSuccess({
      ...fileInfo,
      exists_on_disk: fileExists,
      duplicate_group: dupGroup || null,
      organization_recommendation: orgRec || null,
    })
  );
});

// ----------------- DUPLICATES -----------------
apiRouter.get('/duplicates', (req: Request, res: Response) => {
  res.json(makeSuccess(scanner.duplicatesResult));
});

// ----------------- ORGANIZATION -----------------
apiRouter.get('/organize', (req: Request, res: Response) => {
  res.json(
    makeSuccess({
      recommendations: scanner.organizationResult,
      total_count: scanner.organizationResult.length,
    })
  );
});

// ----------------- CLEANUP -----------------
apiRouter.get('/cleanup', (req: Request, res: Response) => {
  res.json(makeSuccess(scanner.cleanupResult));
});

// ----------------- ACTIONS (MOVE, QUARANTINE, DELETE, RESTORE, UNDO) -----------------
apiRouter.post('/actions/move', (req: Request, res: Response) => {
  const data = req.body || {};
  let moves = data.moves || [];

  if (!moves.length && data.file_id && data.destination_folder) {
    moves = [{ file_id: data.file_id, destination_folder: data.destination_folder }];
  }

  if (!moves.length) {
    return res.status(400).json(makeError('MISSING_DATA', 'At least one move instruction must be supplied').payload);
  }

  const results: any[] = [];
  for (const item of moves) {
    const fileId = item.file_id;
    const destFolder = item.destination_folder;

    const fileInfo = scanner.filesById.get(fileId);
    if (!fileInfo) {
      results.push({ file_id: fileId, success: false, error: 'File not found in scan' });
      continue;
    }

    const srcPath = fileInfo.path;

    try {
      const verifiedSrc = verifyPathInScope(srcPath, scanner.scope || undefined);
      if (!fs.existsSync(verifiedSrc)) {
        results.push({
          file_id: fileId,
          success: false,
          error: `File '${fileInfo.filename}' does not exist on disk at '${verifiedSrc}'`,
        });
        continue;
      }

      const normDestFolder = normalizePath(destFolder);
      const [destProt, destReason] = isProtected(normDestFolder);
      if (destProt) {
        results.push({
          file_id: fileId,
          success: false,
          error: `Destination folder is protected: ${destReason}`,
        });
        continue;
      }

      fs.mkdirSync(normDestFolder, { recursive: true });
      const [safeDest, finalName] = safeDestinationFilename(normDestFolder, fileInfo.filename);

      fs.renameSync(verifiedSrc, safeDest);

      const record = logAction(
        'move',
        verifiedSrc,
        safeDest,
        finalName,
        fileInfo.size,
        'success',
        `Organized to ${normDestFolder}`,
        true,
        { original_source: verifiedSrc, destination: safeDest }
      );

      scanner.removeFileFromCache(fileId);

      results.push({
        file_id: fileId,
        success: true,
        original_path: verifiedSrc,
        new_path: safeDest,
        final_filename: finalName,
        action_id: record.id,
      });
    } catch (err: any) {
      results.push({ file_id: fileId, success: false, error: err.message });
    }
  }

  return res.json(makeSuccess({ results }, `Processed ${results.length} move operations`));
});

apiRouter.post('/actions/quarantine', (req: Request, res: Response) => {
  const data = req.body || {};
  const fileId = data.file_id;
  const filePath = data.file_path;
  const reason = data.reason || 'User initiated safe quarantine';

  let targetPath: string | null = null;
  let fileInfo: any = null;

  if (fileId && scanner.filesById.has(fileId)) {
    fileInfo = scanner.filesById.get(fileId);
    targetPath = fileInfo.path;
  } else if (filePath && scanner.scannedFiles.some((f) => f.path === filePath)) {
    targetPath = filePath;
    fileInfo = scanner.scannedFiles.find((f) => f.path === filePath);
  } else if (filePath && fs.existsSync(filePath)) {
    targetPath = filePath;
    fileInfo = scanner.scannedFiles.find((f) => f.path === filePath);
  } else if (fileId && (fs.existsSync(fileId) || fileId.includes('/') || fileId.includes('\\'))) {
    targetPath = fileId;
    fileInfo = scanner.scannedFiles.find((f) => f.path === fileId);
  }

  if (!targetPath) {
    return res.status(400).json(makeError('MISSING_FILE', 'A valid file ID or path must be supplied for quarantine').payload);
  }

  try {
    const verifiedPath = verifyPathInScope(targetPath, scanner.scope || undefined);
    if (!fs.existsSync(verifiedPath)) {
      return res.status(404).json(
        makeError('FILE_NOT_FOUND', `Cannot quarantine: File does not exist on disk at '${verifiedPath}'`, 404).payload
      );
    }

    const entry = quarantineFile(verifiedPath, reason, fileInfo || {});

    const record = logAction(
      'quarantine',
      verifiedPath,
      entry.quarantine_path,
      entry.filename,
      entry.size,
      'success',
      reason,
      true,
      { quarantine_id: entry.id }
    );

    scanner.removeFileFromCache(fileInfo?.id || verifiedPath);

    return res.json(
      makeSuccess(
        {
          quarantine_entry: entry,
          action_id: record.id,
        },
        `File '${entry.filename}' safely moved to quarantine`
      )
    );
  } catch (err: any) {
    return res.status(500).json(makeError('QUARANTINE_FAILED', err.message, 500).payload);
  }
});

apiRouter.post('/actions/delete', (req: Request, res: Response) => {
  const data = req.body || {};
  const fileId = data.file_id;
  const filePath = data.file_path;
  const confirmed = data.confirmed === true;

  if (!confirmed) {
    return res.status(400).json(makeError('CONFIRMATION_REQUIRED', 'Permanent deletion requires explicit user confirmation').payload);
  }

  let targetPath: string | null = null;
  let fileInfo: any = null;

  if (fileId && scanner.filesById.has(fileId)) {
    fileInfo = scanner.filesById.get(fileId);
    targetPath = fileInfo.path;
  } else if (filePath && scanner.scannedFiles.some((f) => f.path === filePath)) {
    targetPath = filePath;
    fileInfo = scanner.scannedFiles.find((f) => f.path === filePath);
  } else if (filePath && fs.existsSync(filePath)) {
    targetPath = filePath;
    fileInfo = scanner.scannedFiles.find((f) => f.path === filePath);
  } else if (fileId && (fs.existsSync(fileId) || fileId.includes('/') || fileId.includes('\\'))) {
    targetPath = fileId;
    fileInfo = scanner.scannedFiles.find((f) => f.path === fileId);
  }

  if (!targetPath) {
    return res.status(404).json(makeError('MISSING_FILE', 'File record not found', 404).payload);
  }

  // Safety checks: Never delete high risk or protected importance files
  if (
    fileInfo &&
    (fileInfo.can_permanently_delete === false ||
      (fileInfo.importance_score ?? 0) >= 70 ||
      fileInfo.risk === 'HIGH')
  ) {
    return res.status(403).json(
      makeError(
        'PROTECTED_FILE',
        `File '${fileInfo.filename}' is protected by SmartClean safety policies (Importance: ${fileInfo.importance_label || 'HIGH'}, Risk: ${fileInfo.risk || 'HIGH'}). Permanent deletion is disabled. Please use Quarantine instead.`,
        403
      ).payload
    );
  }

  try {
    const verifiedPath = verifyPathInScope(targetPath, scanner.scope || undefined);
    if (!fs.existsSync(verifiedPath)) {
      return res.status(404).json(
        makeError('FILE_NOT_FOUND', `Cannot delete: File does not exist on disk at '${verifiedPath}'`, 404).payload
      );
    }

    const size = fs.statSync(verifiedPath).size;
    fs.unlinkSync(verifiedPath);

    logAction(
      'delete',
      verifiedPath,
      null,
      path.basename(verifiedPath),
      size,
      'success',
      'Permanently deleted after explicit user confirmation',
      false
    );

    scanner.removeFileFromCache(fileInfo?.id || verifiedPath);

    return res.json(
      makeSuccess(
        { deleted_path: verifiedPath },
        `File '${path.basename(verifiedPath)}' permanently deleted`
      )
    );
  } catch (err: any) {
    return res.status(500).json(makeError('DELETE_FAILED', `Failed to delete file: ${err.message}`, 500).payload);
  }
});

apiRouter.post('/actions/restore', (req: Request, res: Response) => {
  const data = req.body || {};
  const qId = data.quarantine_id;
  const dest = data.destination;

  if (!qId) {
    return res.status(400).json(makeError('MISSING_QUARANTINE_ID', 'Quarantine entry ID is required').payload);
  }

  try {
    const result = restoreQuarantinedFile(qId, dest);

    logAction(
      'restore',
      `quarantine:${qId}`,
      result.restored_path,
      result.final_filename,
      result.entry.size,
      'success',
      'Restored from quarantine',
      false
    );

    return res.json(makeSuccess(result, `File successfully restored to '${result.restored_path}'`));
  } catch (err: any) {
    return res.status(400).json(makeError('RESTORE_FAILED', err.message).payload);
  }
});

apiRouter.post('/actions/undo', (req: Request, res: Response) => {
  const data = req.body || {};
  const actionId = data.action_id;

  if (!actionId) {
    return res.status(400).json(makeError('MISSING_ACTION_ID', 'Action ID to undo is required').payload);
  }

  try {
    const result = undoAction(actionId);
    return res.json(makeSuccess(result, result.message || 'Action reverted successfully'));
  } catch (err: any) {
    return res.status(400).json(makeError('UNDO_FAILED', err.message).payload);
  }
});

// ----------------- QUARANTINE LIST -----------------
apiRouter.get('/quarantine', (req: Request, res: Response) => {
  const items = listQuarantinedFiles();
  const totalBytes = items.reduce((acc, it) => acc + (it.size || 0), 0);
  res.json(
    makeSuccess({
      items,
      count: items.length,
      total_bytes: totalBytes,
      total_formatted: formatSize(totalBytes),
    })
  );
});

apiRouter.post('/quarantine/:q_id/delete', (req: Request, res: Response) => {
  const qId = req.params.q_id;
  try {
    const entry = deletePermanentlyFromQuarantine(qId);
    logAction(
      'delete',
      `quarantine:${qId}`,
      null,
      entry.filename,
      entry.size,
      'success',
      'Permanently deleted from quarantine manifest',
      false
    );
    res.json(makeSuccess(entry, `Quarantined item '${entry.filename}' permanently deleted`));
  } catch (err: any) {
    res.status(400).json(makeError('DELETE_FAILED', err.message).payload);
  }
});

// ----------------- HISTORY -----------------
apiRouter.get('/history', (req: Request, res: Response) => {
  const limit = parseInt((req.query.limit as string) || '100', 10);
  const items = getHistory(limit);
  res.json(
    makeSuccess({
      history: items,
      count: items.length,
    })
  );
});

// ----------------- SETTINGS -----------------
apiRouter.get('/settings', (req: Request, res: Response) => {
  const settings = loadSettings();
  res.json(makeSuccess(settings));
});

apiRouter.post('/settings', (req: Request, res: Response) => {
  const data = req.body || {};
  const current = loadSettings();
  const updated = { ...current, ...data };
  saveSettings(updated);
  res.json(makeSuccess(updated, 'Settings updated successfully'));
});

// ----------------- DEMO GENERATOR -----------------
apiRouter.post('/demo/generate', (req: Request, res: Response) => {
  try {
    const result = createDemoWorkspace();
    // Auto-start scan of demo workspace immediately
    const scanRes = scanner.startScan(result.demo_dir);

    res.json(
      makeSuccess(
        {
          demo: result,
          scan: scanRes,
        },
        `Demo workspace generated at '${result.demo_dir}' and scan started!`
      )
    );
  } catch (err: any) {
    res.status(500).json(makeError('DEMO_GEN_FAILED', err.message, 500).payload);
  }
});
