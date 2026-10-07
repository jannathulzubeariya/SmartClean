import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { HISTORY_FILE } from './config';
import { formatSize } from './sizes';
import { safeDestinationFilename } from './safePath';
import { HistoryRecord } from './types';
import { restoreQuarantinedFile } from './quarantineManager';

export function loadHistory(): HistoryRecord[] {
  if (!fs.existsSync(HISTORY_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(HISTORY_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveHistory(records: HistoryRecord[]): void {
  fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
  const tmp = `${HISTORY_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(records, null, 2), 'utf-8');
  fs.renameSync(tmp, HISTORY_FILE);
}

export function logAction(
  actionType: 'move' | 'quarantine' | 'restore' | 'delete' | 'undo',
  source: string,
  destination: string | null = null,
  filename?: string,
  fileSize = 0,
  status: 'success' | 'failed' = 'success',
  reason = '',
  undoable = false,
  undoPayload: any = null
): HistoryRecord {
  const history = loadHistory();
  const actionId = `act_${Math.floor(Date.now() / 1000)}_${crypto.randomBytes(3).toString('hex')}`;

  const record: HistoryRecord = {
    id: actionId,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    action_type: actionType,
    source,
    destination,
    filename: filename || path.basename(source),
    file_size: fileSize,
    file_size_formatted: formatSize(fileSize),
    status,
    reason,
    undoable,
    undone: false,
    undo_payload: undoPayload || {},
  };

  history.unshift(record);
  const trimmed = history.slice(0, 500);
  saveHistory(trimmed);
  return record;
}

export function getHistory(limit = 100): HistoryRecord[] {
  const history = loadHistory();
  return history.slice(0, limit);
}

export function undoAction(actionId: string): {
  reverted_action: string;
  restored_path: string;
  message: string;
} {
  const history = loadHistory();
  const record = history.find((item) => item.id === actionId);

  if (!record) {
    throw new Error(`Action '${actionId}' not found in history`);
  }

  if (record.undone) {
    throw new Error('This action has already been reverted');
  }

  if (!record.undoable) {
    throw new Error(`Action type '${record.action_type}' cannot be automatically undone`);
  }

  const actionType = record.action_type;
  const undoPayload = record.undo_payload || {};

  // Revert MOVE
  if (actionType === 'move') {
    const currentLoc = record.destination;
    const origLoc = record.source;

    if (!currentLoc || !fs.existsSync(currentLoc)) {
      throw new Error(`Cannot undo move: Current file location '${currentLoc}' does not exist on disk`);
    }

    const origDir = path.dirname(origLoc);
    const origName = path.basename(origLoc);
    const [safeBackPath, finalName] = safeDestinationFilename(origDir, origName);

    fs.renameSync(currentLoc, safeBackPath);

    record.undone = true;
    saveHistory(history);

    logAction(
      'undo',
      currentLoc,
      safeBackPath,
      finalName,
      record.file_size,
      'success',
      `Reverted previous move of ${record.filename}`,
      false
    );

    return {
      reverted_action: actionId,
      restored_path: safeBackPath,
      message: `Successfully moved '${finalName}' back to ${origDir}`,
    };
  }

  // Revert QUARANTINE
  if (actionType === 'quarantine') {
    const qId = undoPayload.quarantine_id;
    if (!qId) {
      throw new Error('Missing quarantine reference ID');
    }

    const restoreResult = restoreQuarantinedFile(qId);
    record.undone = true;
    saveHistory(history);

    logAction(
      'undo',
      `quarantine:${qId}`,
      restoreResult.restored_path,
      restoreResult.final_filename,
      record.file_size,
      'success',
      `Reverted quarantine of ${record.filename}`,
      false
    );

    return {
      reverted_action: actionId,
      restored_path: restoreResult.restored_path,
      message: `Restored '${restoreResult.final_filename}' from quarantine`,
    };
  }

  throw new Error(`Cannot undo action of type '${actionType}'`);
}
