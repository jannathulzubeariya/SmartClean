import { ScannedFile, DuplicateGroup, CleanupSection, CleanupItem, RiskLevel } from './types';
import { formatSize } from './sizes';

export interface CleanupEngineResult {
  sections: CleanupSection[];
  total_candidates: number;
  safe_reclaimable_bytes: number;
  safe_reclaimable_formatted: string;
  guidance: string;
}

export function analyzeCleanupCandidates(
  scannedFiles: ScannedFile[],
  duplicateGroups?: DuplicateGroup[]
): CleanupEngineResult {
  const now = Date.now() / 1000;

  const sectionsMap: Record<
    string,
    {
      key: string;
      title: string;
      risk: RiskLevel;
      description: string;
      safe_action: string;
      items: CleanupItem[];
      total_bytes: number;
    }
  > = {
    temporary: {
      key: 'temporary',
      title: 'Temporary & Cache Files',
      risk: 'LOW',
      description: 'Transient scratch files, incomplete downloads, and crash dumps that applications left behind.',
      safe_action: 'quarantine',
      items: [],
      total_bytes: 0,
    },
    duplicates: {
      key: 'duplicates',
      title: 'Redundant Duplicate Copies',
      risk: 'MEDIUM',
      description: 'Secondary identical copies of files that already have an original preserved elsewhere.',
      safe_action: 'quarantine',
      items: [],
      total_bytes: 0,
    },
    installers: {
      key: 'installers',
      title: 'Outdated Setup Packages',
      risk: 'MEDIUM',
      description: 'Downloaded application installers and update packages usually no longer required after setup.',
      safe_action: 'review',
      items: [],
      total_bytes: 0,
    },
    logs: {
      key: 'logs',
      title: 'Application Logs & Dumps',
      risk: 'LOW',
      description: 'Diagnostic execution logs and debug dumps generated during prior application runs.',
      safe_action: 'quarantine',
      items: [],
      total_bytes: 0,
    },
    large_stale: {
      key: 'large_stale',
      title: 'Large Stale Files (>90 days untouched)',
      risk: 'HIGH',
      description: 'Unusually large files that have not been modified or accessed recently. Always review before acting.',
      safe_action: 'review',
      items: [],
      total_bytes: 0,
    },
  };

  const duplicateNonKeepers = new Set<string>();
  if (duplicateGroups) {
    for (const grp of duplicateGroups) {
      const keeperId = grp.suggested_keeper_id;
      for (const copy of grp.copies || []) {
        if (copy.id !== keeperId) {
          duplicateNonKeepers.add(copy.id);
          sectionsMap.duplicates.items.push({
            id: copy.id,
            filename: copy.filename,
            path: copy.path,
            size: copy.size,
            size_formatted: copy.size_formatted || formatSize(copy.size),
            reason: `Exact duplicate copy of preserved file in group '${grp.group_id}'`,
            risk: 'MEDIUM',
            importance_score: copy.importance_score ?? 20,
            suggested_action: 'quarantine',
          });
          sectionsMap.duplicates.total_bytes += copy.size;
        }
      }
    }
  }

  for (const f of scannedFiles) {
    if (duplicateNonKeepers.has(f.id)) continue;

    const category = f.category || 'Other / Unknown';
    const mtime = f.mtime || 0;
    const size = f.size || 0;
    const ageDays = (now - mtime) / (24 * 3600);
    const importanceScore = f.importance_score ?? 50;

    // 1. Temporary
    if (category === 'Temporary') {
      sectionsMap.temporary.items.push({
        id: f.id,
        filename: f.filename,
        path: f.path,
        size,
        size_formatted: f.size_formatted || formatSize(size),
        reason: 'Identified as temporary scratch/cache file format',
        risk: 'LOW',
        importance_score: importanceScore,
        suggested_action: 'quarantine',
      });
      sectionsMap.temporary.total_bytes += size;
    }

    // 2. Logs & Dumps (>7 days old)
    else if (category === 'Logs' && ageDays > 7) {
      sectionsMap.logs.items.push({
        id: f.id,
        filename: f.filename,
        path: f.path,
        size,
        size_formatted: f.size_formatted || formatSize(size),
        reason: `Diagnostic log file untouched for ${Math.floor(ageDays)} days`,
        risk: 'LOW',
        importance_score: importanceScore,
        suggested_action: 'quarantine',
      });
      sectionsMap.logs.total_bytes += size;
    }

    // 3. Installers (>14 days old)
    else if (category === 'Installers' && ageDays > 14) {
      sectionsMap.installers.items.push({
        id: f.id,
        filename: f.filename,
        path: f.path,
        size,
        size_formatted: f.size_formatted || formatSize(size),
        reason: `Setup package downloaded ${Math.floor(ageDays)} days ago`,
        risk: 'MEDIUM',
        importance_score: importanceScore,
        suggested_action: 'review',
      });
      sectionsMap.installers.total_bytes += size;
    }

    // 4. Large stale files (>50MB and >90 days untouched)
    else if (size > 50 * 1024 * 1024 && ageDays > 90 && category !== 'Executables') {
      sectionsMap.large_stale.items.push({
        id: f.id,
        filename: f.filename,
        path: f.path,
        size,
        size_formatted: f.size_formatted || formatSize(size),
        reason: `Large ${category.toLowerCase()} file (${formatSize(size)}) untouched for ${Math.floor(ageDays)} days`,
        risk: 'HIGH',
        importance_score: importanceScore,
        suggested_action: 'review',
      });
      sectionsMap.large_stale.total_bytes += size;
    }
  }

  let totalSafeReclaimableBytes = 0;
  let totalCleanupCandidates = 0;
  const sectionList: CleanupSection[] = [];

  for (const sec of Object.values(sectionsMap)) {
    const count = sec.items.length;
    totalCleanupCandidates += count;
    if (sec.risk === 'LOW' || sec.risk === 'MEDIUM') {
      totalSafeReclaimableBytes += sec.total_bytes;
    }

    sectionList.push({
      key: sec.key,
      title: sec.title,
      risk: sec.risk,
      description: sec.description,
      safe_action: sec.safe_action,
      count,
      total_bytes: sec.total_bytes,
      total_formatted: formatSize(sec.total_bytes),
      items: sec.items,
    });
  }

  return {
    sections: sectionList,
    total_candidates: totalCleanupCandidates,
    safe_reclaimable_bytes: totalSafeReclaimableBytes,
    safe_reclaimable_formatted: formatSize(totalSafeReclaimableBytes),
    guidance: 'SmartClean isolates candidates in Quarantine first. Permanent deletion is always gated.',
  };
}
