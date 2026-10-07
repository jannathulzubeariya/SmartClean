import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { MANIFEST_FILE, QUARANTINE_DIR } from './config';
import { normalizePath, safeDestinationFilename } from './safePath';
import { formatSize } from './sizes';
import { QuarantinedItem, RiskLevel } from './types';

export function loadManifest(): QuarantinedItem[] {
  if (!fs.existsSync(MANIFEST_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(MANIFEST_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveManifest(items: QuarantinedItem[]): void {
  fs.mkdirSync(path.dirname(MANIFEST_FILE), { recursive: true });
  const tmp = `${MANIFEST_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(items, null, 2), 'utf-8');
  fs.renameSync(tmp, MANIFEST_FILE);
}

export function quarantineFile(
  filePath: string,
  reason = 'User initiated safe quarantine',
  metadata: Partial<QuarantinedItem> = {}
): QuarantinedItem {
  const normPath = normalizePath(filePath);

  if (!fs.existsSync(normPath)) {
    throw new Error(`File '${normPath}' does not exist on disk`);
  }

  const stat = fs.statSync(normPath);
  if (stat.isDirectory()) {
    throw new Error(`'${normPath}' is a directory, not a regular file`);
  }

  const qId = `q_${Math.floor(Date.now() / 1000)}_${crypto.randomBytes(4).toString('hex')}`;
  const origFilename = path.basename(normPath);
  const qFilename = `${qId}_${origFilename}`;
  const qTargetPath = path.join(QUARANTINE_DIR, qFilename);

  // Move file into quarantine
  fs.renameSync(normPath, qTargetPath);

  const manifestEntry: QuarantinedItem = {
    id: qId,
    original_path: normPath,
    quarantine_filename: qFilename,
    quarantine_path: qTargetPath,
    filename: origFilename,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    size: stat.size,
    size_formatted: formatSize(stat.size),
    category: metadata.category || 'Other / Unknown',
    importance_score: metadata.importance_score ?? 30,
    risk: (metadata.risk as RiskLevel) || 'LOW',
    reason,
    status: 'quarantined',
  };

  const manifest = loadManifest();
  manifest.push(manifestEntry);
  saveManifest(manifest);

  return manifestEntry;
}

export function addQuarantineManifestEntry(entry: QuarantinedItem): void {
  const manifest = loadManifest();
  manifest.push(entry);
  saveManifest(manifest);
}

export function restoreQuarantinedFile(
  qId: string,
  customDestination?: string
): {
  restored_path: string;
  final_filename: string;
  had_collision: boolean;
  entry: QuarantinedItem;
} {
  const manifest = loadManifest();
  const entry = manifest.find((item) => item.id === qId && item.status === 'quarantined');

  if (!entry) {
    throw new Error('Quarantined item not found or already restored');
  }

  // Support virtual client items gracefully
  if (entry.quarantine_path.startsWith('quarantine://')) {
    entry.status = 'restored';
    entry.restored_to = customDestination || entry.original_path;
    entry.restored_at = new Date().toISOString().replace('T', ' ').substring(0, 19);
    saveManifest(manifest);

    return {
      restored_path: entry.restored_to,
      final_filename: entry.filename,
      had_collision: false,
      entry,
    };
  }

  const qPath = entry.quarantine_path;
  if (!fs.existsSync(qPath)) {
    throw new Error('Quarantined archive file is missing from disk');
  }

  const targetDestPath = customDestination || entry.original_path;
  const destFolder = path.dirname(targetDestPath);
  const origName = path.basename(entry.original_path);

  const [safeDestPath, finalName] = safeDestinationFilename(destFolder, origName);

  fs.renameSync(qPath, safeDestPath);

  entry.status = 'restored';
  entry.restored_to = safeDestPath;
  entry.restored_at = new Date().toISOString().replace('T', ' ').substring(0, 19);
  saveManifest(manifest);

  return {
    restored_path: safeDestPath,
    final_filename: finalName,
    had_collision: finalName !== origName,
    entry,
  };
}

export function deletePermanentlyFromQuarantine(qId: string): QuarantinedItem {
  const manifest = loadManifest();
  const entry = manifest.find((item) => item.id === qId && item.status === 'quarantined');

  if (!entry) {
    throw new Error('Item not found in active quarantine');
  }

  const qPath = entry.quarantine_path;
  if (fs.existsSync(qPath)) {
    try {
      fs.unlinkSync(qPath);
    } catch (err: any) {
      throw new Error(`Could not permanently delete file: ${err.message}`);
    }
  }

  entry.status = 'permanently_deleted';
  entry.deleted_at = new Date().toISOString().replace('T', ' ').substring(0, 19);
  saveManifest(manifest);

  return entry;
}

export function listQuarantinedFiles(): QuarantinedItem[] {
  const manifest = loadManifest();
  return manifest.filter((item) => item.status === 'quarantined');
}
