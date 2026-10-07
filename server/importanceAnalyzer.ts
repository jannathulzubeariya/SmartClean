import path from 'path';
import { ScannedFile, ImportanceLabel } from './types';

export const MEANINGFUL_TERMS = [
  'report',
  'final',
  'thesis',
  'invoice',
  'project',
  'assignment',
  'certificate',
  'resume',
  'important',
  'tax',
  'statement',
  'contract',
  'agreement',
  'budget',
  'plan',
  'presentation',
  'paper',
  'notes',
  'client',
  'draft',
  'master',
];

export interface ImportanceAnalysisResult {
  score: number;
  label: ImportanceLabel;
  guidance: string;
  recommendation: string;
  can_permanently_delete: boolean;
  reasons: string[];
}

export function analyzeImportance(
  fileInfo: ScannedFile,
  folderFileCounts?: Map<string, number>,
  duplicateHashes?: Map<string, number>
): ImportanceAnalysisResult {
  let score = 0;
  const reasons: string[] = [];

  const filePath = fileInfo.path || '';
  const filename = fileInfo.filename || '';
  const lowerName = filename.toLowerCase();
  const lowerPath = filePath.toLowerCase();
  const category = fileInfo.category || 'Other / Unknown';
  const mtime = fileInfo.mtime || 0;
  const atime = fileInfo.atime || 0;
  const size = fileInfo.size || 0;
  const now = Date.now() / 1000;

  // 1. Modified in last 30 days (+15)
  const thirtyDaysSec = 30 * 24 * 3600;
  if (now - mtime <= thirtyDaysSec) {
    score += 15;
    reasons.push('Modified in the last 30 days (+15)');
  }

  // 2. Accessed recently (+8)
  if (atime && now - atime <= 14 * 24 * 3600 && atime > mtime) {
    score += 8;
    reasons.push('Recently accessed by user or application (+8)');
  }

  // 3. Located in Documents, Desktop, or project folder (+15)
  const userLocations = ['documents', 'projects', 'desktop', 'my documents', 'workspace'];
  if (userLocations.some((loc) => lowerPath.includes(loc))) {
    score += 15;
    reasons.push('Located in user workspace or document directory (+15)');
  }

  // 4. Document / project file type (+12)
  if (category === 'Documents' || category === 'Code') {
    score += 12;
    reasons.push(`${category} file type (+12)`);
  } else if (category === 'Images' && lowerPath.includes('pictures')) {
    score += 8;
    reasons.push('Image in dedicated photo library (+8)');
  }

  // 5. Meaningful filename terms (+10)
  const foundTerms = MEANINGFUL_TERMS.filter((t) => lowerName.includes(t));
  if (foundTerms.length > 0) {
    score += 10;
    const termsStr = foundTerms.slice(0, 3).join(', ');
    reasons.push(`Filename contains meaningful term: '${termsStr}' (+10)`);
  }

  // 6. Sole copy detected (+15)
  const sha256 = fileInfo.sha256;
  if (duplicateHashes && sha256 && (duplicateHashes.get(sha256) || 0) > 1) {
    if (category === 'Installers' || category === 'Temporary') {
      score -= 15;
      reasons.push('Replaceable installer/temp file with existing duplicate (-15)');
    } else {
      reasons.push('Duplicate copies detected on disk');
    }
  } else {
    score += 15;
    reasons.push('Unique file; no duplicate copies detected (+15)');
  }

  // 7. Sits in a folder with related files (+10)
  const folderPath = path.dirname(filePath);
  const countInFolder = folderFileCounts?.get(folderPath) || 0;
  if (countInFolder >= 3) {
    score += 10;
    reasons.push(`Surrounded by ${countInFolder} files in folder (+10)`);
  }

  // 8. Unusually large size for its type (+7)
  if (category === 'Documents' && size > 15 * 1024 * 1024) {
    score += 7;
    reasons.push('Substantial document content size (+7)');
  } else if (category === 'Images' && size > 25 * 1024 * 1024) {
    score += 7;
    reasons.push('High resolution original image (+7)');
  }

  // 9. Penalties for clearly temporary, cache, or crash dumps
  if (category === 'Temporary') {
    score -= 25;
    reasons.push('Temporary file format (-25)');
  } else if (category === 'Logs' && now - mtime > 14 * 24 * 3600) {
    score -= 15;
    reasons.push('Historical log file over two weeks old (-15)');
  } else if (category === 'Installers' && now - mtime > 60 * 24 * 3600) {
    score -= 20;
    reasons.push('Old installer package over two months old (-20)');
  }

  // Clamp 0 - 100
  score = Math.max(0, Math.min(100, score));

  let label: ImportanceLabel = 'LOW';
  let guidance = 'Low importance candidate';
  let recommendation = 'Review candidate for safe cleanup';
  let canPermanentlyDelete = true;

  if (score >= 70) {
    label = 'HIGH';
    guidance = 'Potentially important';
    recommendation = 'Recommended to keep; permanent deletion disabled';
    canPermanentlyDelete = false;
  } else if (score >= 40) {
    label = 'MEDIUM';
    guidance = 'Likely important';
    recommendation = 'Review recommended; quarantine only';
    canPermanentlyDelete = false;
  }

  return {
    score,
    label,
    guidance,
    recommendation,
    can_permanently_delete: canPermanentlyDelete,
    reasons,
  };
}
