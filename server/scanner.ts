import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ScannedFile, DuplicateGroup, OrganizationRecommendation, CleanupSection, RiskLevel } from './types';
import { normalizePath, isProtected } from './safePath';
import { formatSize } from './sizes';
import { classifyFile } from './fileClassifier';
import { detectDuplicates, DuplicateDetectionResult } from './duplicateDetector';
import { analyzeImportance } from './importanceAnalyzer';
import { generateOrganizationRecommendations } from './organizationEngine';
import { analyzeCleanupCandidates, CleanupEngineResult } from './cleanupEngine';
import { analyzeStorage, StorageAnalysisResult } from './storageAnalyzer';

export interface ScanStatusData {
  status: 'idle' | 'scanning' | 'paused' | 'completed' | 'cancelled' | 'error';
  scope: string | null;
  current_path: string;
  files_scanned: number;
  folders_scanned: number;
  skipped_count: number;
  elapsed_seconds: number;
  error_count: number;
  errors: Array<{ path: string; reason: string }>;
}

export class FilesystemScanner {
  public status: 'idle' | 'scanning' | 'paused' | 'completed' | 'cancelled' | 'error' = 'idle';
  public scope: string | null = null;
  public isClientScope = false;
  public currentPath = '';
  public filesScanned = 0;
  public foldersScanned = 0;
  public skippedCount = 0;
  public errors: Array<{ path: string; reason: string }> = [];
  public startTime = 0;
  public elapsedSeconds = 0;

  private isPaused = false;
  private isCancelled = false;

  // Cached analysis results
  public scannedFiles: ScannedFile[] = [];
  public filesById: Map<string, ScannedFile> = new Map();
  public duplicatesResult: DuplicateDetectionResult = {
    groups: [],
    total_groups: 0,
    total_duplicate_files: 0,
    total_reclaimable_bytes: 0,
    total_reclaimable_formatted: '0 B',
  };
  public organizationResult: OrganizationRecommendation[] = [];
  public cleanupResult: CleanupEngineResult = {
    sections: [],
    total_candidates: 0,
    safe_reclaimable_bytes: 0,
    safe_reclaimable_formatted: '0 B',
    guidance: '',
  };
  public storageResult: Partial<StorageAnalysisResult> = {};

  public getStatus(): ScanStatusData {
    const elapsed =
      this.status === 'scanning' || this.status === 'paused'
        ? (Date.now() - this.startTime) / 1000
        : this.elapsedSeconds;

    return {
      status: this.status,
      scope: this.scope,
      current_path: this.currentPath,
      files_scanned: this.filesScanned,
      folders_scanned: this.foldersScanned,
      skipped_count: this.skippedCount,
      elapsed_seconds: Math.round(elapsed * 10) / 10,
      error_count: this.errors.length,
      errors: this.errors.slice(-10),
    };
  }

  public startScan(scopePath: string): { status: string; scope: string; message: string } {
    if (this.status === 'scanning') {
      throw new Error('A scan is already actively running');
    }

    const normScope = normalizePath(scopePath);
    if (!fs.existsSync(normScope)) {
      throw new Error(`Directory '${scopePath}' does not exist on this machine. For web browser access, please use 'Select Folder' or 'Select Files' to grant permission to your device's files.`);
    }

    const stat = fs.statSync(normScope);
    if (!stat.isDirectory()) {
      throw new Error(`Path '${normScope}' is not a directory`);
    }

    const [protectedDir, reason] = isProtected(normScope);
    if (protectedDir) {
      throw new Error(`Cannot scan protected location: ${reason}`);
    }

    this.scope = normScope;
    this.isClientScope = false;
    this.status = 'scanning';
    this.filesScanned = 0;
    this.foldersScanned = 0;
    this.skippedCount = 0;
    this.errors = [];
    this.currentPath = normScope;
    this.startTime = Date.now();
    this.elapsedSeconds = 0;
    this.isPaused = false;
    this.isCancelled = false;

    // Run async scan
    this.runScanLoop(normScope).catch((err) => {
      console.error('Scan loop error:', err);
      this.status = 'error';
    });

    return {
      status: 'scanning',
      scope: this.scope,
      message: `Scan started for ${this.scope}`,
    };
  }

  public pauseScan(): { status: string; message: string } {
    if (this.status !== 'scanning') {
      return { status: this.status, message: 'Scan is not actively running' };
    }
    this.isPaused = true;
    this.status = 'paused';
    return { status: 'paused', message: 'Scan paused' };
  }

  public resumeScan(): { status: string; message: string } {
    if (this.status !== 'paused') {
      return { status: this.status, message: 'Scan is not paused' };
    }
    this.isPaused = false;
    this.status = 'scanning';
    return { status: 'scanning', message: 'Scan resumed' };
  }

  public cancelScan(): { status: string; message: string } {
    if (this.status !== 'scanning' && this.status !== 'paused') {
      return { status: this.status, message: 'No scan to cancel' };
    }
    this.isCancelled = true;
    this.isPaused = false;
    this.status = 'cancelled';
    return { status: 'cancelled', message: 'Scan cancellation requested' };
  }

  private async waitIfPaused(): Promise<void> {
    while (this.isPaused && !this.isCancelled) {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }

  private async runScanLoop(rootPath: string): Promise<void> {
    const discoveredRaw: ScannedFile[] = [];
    const stack: string[] = [rootPath];
    const visitedDirs = new Set<string>();

    while (stack.length > 0 && !this.isCancelled) {
      await this.waitIfPaused();
      if (this.isCancelled) break;

      const currentDir = stack.pop()!;
      const resolvedDir = path.resolve(currentDir);
      if (visitedDirs.has(resolvedDir)) {
        continue;
      }
      visitedDirs.add(resolvedDir);

      this.currentPath = currentDir;
      this.foldersScanned++;

      // Check protected
      const [protectedDir, reason] = isProtected(currentDir);
      if (protectedDir && currentDir !== this.scope) {
        this.skippedCount++;
        this.errors.push({ path: currentDir, reason });
        continue;
      }

      try {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
          if (this.isCancelled) break;
          await this.waitIfPaused();

          const fullPath = path.join(currentDir, entry.name);

          try {
            if (entry.isSymbolicLink()) {
              this.skippedCount++;
              this.errors.push({ path: fullPath, reason: 'Skipped symbolic link' });
              continue;
            }

            if (entry.isDirectory()) {
              const resolvedChild = path.resolve(fullPath);
              if (!visitedDirs.has(resolvedChild)) {
                stack.push(fullPath);
              }
            } else if (entry.isFile()) {
              const statRes = fs.statSync(fullPath);
              const fileId = `f_${crypto.randomBytes(5).toString('hex')}`;
              const [category, ext] = classifyFile(fullPath, entry.name);

              const item: ScannedFile = {
                id: fileId,
                path: fullPath,
                filename: entry.name,
                size: statRes.size,
                size_formatted: formatSize(statRes.size),
                mtime: Math.floor(statRes.mtimeMs / 1000),
                atime: Math.floor(statRes.atimeMs / 1000),
                mtime_formatted: statRes.mtime.toISOString().replace('T', ' ').substring(0, 19),
                category,
                ext,
              };

              discoveredRaw.push(item);
              this.filesScanned++;
            }
          } catch (entryErr: any) {
            this.skippedCount++;
            this.errors.push({ path: fullPath, reason: `Access error: ${entryErr.message}` });
          }
        }
      } catch (dirErr: any) {
        this.skippedCount++;
        this.errors.push({ path: currentDir, reason: `Directory unreadable: ${dirErr.message}` });
      }

      // Yield event loop occasionally
      if (this.foldersScanned % 15 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
    }

    if (this.isCancelled) {
      this.status = 'cancelled';
      this.elapsedSeconds = (Date.now() - this.startTime) / 1000;
      return;
    }

    // Post-scan analysis
    this.analyzeScannedFiles(discoveredRaw);
  }

  private analyzeScannedFiles(filesList: ScannedFile[]): void {
    // 1. Folder file counts
    const folderCounts = new Map<string, number>();
    for (const f of filesList) {
      const dir = path.dirname(f.path);
      folderCounts.set(dir, (folderCounts.get(dir) || 0) + 1);
    }

    // 2. Duplicate detection
    const duplicates = detectDuplicates(filesList);

    // Hash frequency map for importance analyzer
    const duplicateHashes = new Map<string, number>();
    for (const grp of duplicates.groups) {
      for (const copy of grp.copies) {
        if (copy.sha256) {
          duplicateHashes.set(copy.sha256, (duplicateHashes.get(copy.sha256) || 0) + 1);
        }
      }
    }

    // Duplicate non-keeper set
    const duplicateNonKeeperIds = new Set<string>();
    for (const grp of duplicates.groups) {
      for (const copy of grp.copies) {
        if (copy.id !== grp.suggested_keeper_id) {
          duplicateNonKeeperIds.add(copy.id);
        }
      }
    }

    // 3. Importance scoring
    for (const f of filesList) {
      const imp = analyzeImportance(f, folderCounts, duplicateHashes);
      f.importance_score = imp.score;
      f.importance_label = imp.label;
      f.importance_guidance = imp.guidance;
      f.importance_recommendation = imp.recommendation;
      f.can_permanently_delete = imp.can_permanently_delete;
      f.importance_reasons = imp.reasons;

      if (imp.score >= 70) {
        f.risk = 'HIGH';
      } else if (f.category === 'Temporary' || f.category === 'Logs') {
        f.risk = 'LOW';
      } else if (duplicateNonKeeperIds.has(f.id)) {
        f.risk = 'MEDIUM';
      } else if (f.category === 'Installers') {
        f.risk = 'MEDIUM';
      } else {
        f.risk = imp.score >= 50 ? 'HIGH' : 'MEDIUM';
      }
    }

    // 4. Organization recommendations
    const orgRecs = generateOrganizationRecommendations(filesList, this.scope);

    // 5. Cleanup candidates
    const cleanupRes = analyzeCleanupCandidates(filesList, duplicates.groups);

    // 6. Storage analysis
    const storageRes = analyzeStorage(
      this.scope,
      filesList,
      duplicates.total_reclaimable_bytes,
      cleanupRes.safe_reclaimable_bytes
    );

    this.scannedFiles = filesList;
    this.filesById = new Map(filesList.map((f) => [f.id, f]));
    this.duplicatesResult = duplicates;
    this.organizationResult = orgRecs;
    this.cleanupResult = cleanupRes;
    this.storageResult = storageRes;
    this.status = 'completed';
    this.elapsedSeconds = (Date.now() - this.startTime) / 1000;
  }

  public removeFileFromCache(filePathOrId: string): void {
    let target: ScannedFile | undefined;
    if (this.filesById.has(filePathOrId)) {
      target = this.filesById.get(filePathOrId);
    } else {
      target = this.scannedFiles.find((f) => f.path === filePathOrId);
    }

    if (!target) return;

    const targetId = target.id;
    this.scannedFiles = this.scannedFiles.filter((f) => f.id !== targetId);
    this.filesById.delete(targetId);

    // Remove from organization
    this.organizationResult = this.organizationResult.filter((r) => r.file_id !== targetId);

    // Remove from cleanup
    for (const sec of this.cleanupResult.sections) {
      sec.items = sec.items.filter((it) => it.id !== targetId);
      sec.count = sec.items.length;
      sec.total_bytes = sec.items.reduce((acc, it) => acc + (it.size || 0), 0);
      sec.total_formatted = formatSize(sec.total_bytes);
    }

    let totalCleanCandidates = 0;
    let safeReclaimableBytes = 0;
    for (const sec of this.cleanupResult.sections) {
      totalCleanCandidates += sec.count;
      if (sec.risk === 'LOW' || sec.risk === 'MEDIUM') {
        safeReclaimableBytes += sec.total_bytes;
      }
    }
    this.cleanupResult.total_candidates = totalCleanCandidates;
    this.cleanupResult.safe_reclaimable_bytes = safeReclaimableBytes;
    this.cleanupResult.safe_reclaimable_formatted = formatSize(safeReclaimableBytes);

    // Remove from duplicates
    let totalDupBytes = 0;
    let totalDupFiles = 0;
    for (const grp of this.duplicatesResult.groups) {
      grp.copies = grp.copies.filter((c) => c.id !== targetId);
      grp.copies_count = grp.copies.length;
      const keeperId = grp.suggested_keeper_id;
      const nonKeepers = grp.copies.filter((c) => c.id !== keeperId);
      grp.reclaimable_bytes = grp.file_size * nonKeepers.length;
      grp.reclaimable_formatted = formatSize(grp.reclaimable_bytes);
      totalDupBytes += grp.reclaimable_bytes;
      totalDupFiles += nonKeepers.length;
    }
    this.duplicatesResult.groups = this.duplicatesResult.groups.filter((g) => g.copies_count >= 2);
    this.duplicatesResult.total_groups = this.duplicatesResult.groups.length;
    this.duplicatesResult.total_duplicate_files = totalDupFiles;
    this.duplicatesResult.total_reclaimable_bytes = totalDupBytes;
    this.duplicatesResult.total_reclaimable_formatted = formatSize(totalDupBytes);

    // Recalculate storage analysis to reflect removed file
    this.storageResult = analyzeStorage(
      this.scope,
      this.scannedFiles,
      this.duplicatesResult.total_reclaimable_bytes,
      this.cleanupResult.safe_reclaimable_bytes
    );
  }

  public ingestClientFiles(scopeName: string, clientFiles: ScannedFile[]): any {
    this.scope = scopeName;
    this.isClientScope = true;
    this.currentPath = scopeName;
    this.status = 'scanning';
    this.startTime = Date.now();
    this.filesScanned = clientFiles.length;
    this.foldersScanned = new Set(clientFiles.map((f) => path.dirname(f.path))).size;
    this.skippedCount = 0;
    this.errors = [];

    // Ensure category and formatting for client files
    for (const f of clientFiles) {
      if (!f.category || f.category === 'Other / Unknown') {
        const [cat] = classifyFile(f.path, f.filename);
        f.category = cat;
      }
      if (!f.ext) {
        f.ext = path.extname(f.filename || f.path).toLowerCase();
      }
      if (!f.size_formatted) {
        f.size_formatted = formatSize(f.size || 0);
      }
      if (!f.mtime_formatted) {
        f.mtime_formatted = f.mtime ? new Date(f.mtime * 1000).toISOString().replace('T', ' ').substring(0, 19) : 'Unknown';
      }
    }

    this.analyzeScannedFiles(clientFiles);
    return {
      status: 'completed',
      scope: this.scope,
      files_count: clientFiles.length,
      message: `Successfully analyzed ${clientFiles.length} files from ${this.scope}`,
    };
  }
}
