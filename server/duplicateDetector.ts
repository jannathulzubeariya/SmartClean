import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { ScannedFile, DuplicateGroup } from './types';
import { formatSize } from './sizes';

const PARTIAL_HASH_CHUNK = 64 * 1024; // 64 KB

export function computePartialHash(filePath: string, fileSize: number): string | null {
  try {
    const hasher = crypto.createHash('sha256');
    const fd = fs.openSync(filePath, 'r');

    // Read first chunk
    const firstChunk = Buffer.alloc(Math.min(PARTIAL_HASH_CHUNK, fileSize));
    const bytesRead1 = fs.readSync(fd, firstChunk, 0, firstChunk.length, 0);
    hasher.update(firstChunk.subarray(0, bytesRead1));

    // Read last chunk if file is larger
    if (fileSize > PARTIAL_HASH_CHUNK) {
      const seekPos = Math.max(0, fileSize - PARTIAL_HASH_CHUNK);
      const lastChunk = Buffer.alloc(PARTIAL_HASH_CHUNK);
      const bytesRead2 = fs.readSync(fd, lastChunk, 0, lastChunk.length, seekPos);
      hasher.update(lastChunk.subarray(0, bytesRead2));
    }

    fs.closeSync(fd);
    return hasher.digest('hex');
  } catch {
    return null;
  }
}

export function computeFullHash(filePath: string): string | null {
  try {
    const hasher = crypto.createHash('sha256');
    const fileBuffer = fs.readFileSync(filePath);
    hasher.update(fileBuffer);
    return hasher.digest('hex');
  } catch {
    return null;
  }
}

export function chooseSuggestedKeeper(copies: ScannedFile[]): string {
  if (!copies.length) return '';

  const scored = copies.map((item) => {
    const p = (item.path || '').toLowerCase();
    const fname = (item.filename || '').toLowerCase();
    let score = 0;

    if (p.includes('documents') || p.includes('projects')) {
      score += 50;
    } else if (p.includes('pictures') || p.includes('photos') || p.includes('music')) {
      score += 40;
    } else if (p.includes('desktop')) {
      score += 20;
    } else if (p.includes('downloads')) {
      score -= 20;
    } else if (p.includes('temp') || p.includes('tmp') || p.includes('cache')) {
      score -= 50;
    }

    if (
      fname.includes(' (1)') ||
      fname.includes(' (2)') ||
      fname.includes(' - copy') ||
      fname.includes('copy of')
    ) {
      score -= 30;
    }

    score -= Math.min(Math.floor(p.length / 10), 10);
    const mtime = item.mtime || 0;

    return { item, score, mtime };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.mtime - b.mtime; // older first
  });

  return scored[0].item.id;
}

export interface DuplicateDetectionResult {
  groups: DuplicateGroup[];
  total_groups: number;
  total_duplicate_files: number;
  total_reclaimable_bytes: number;
  total_reclaimable_formatted: string;
}

export function detectDuplicates(scannedFiles: ScannedFile[]): DuplicateDetectionResult {
  // Step 1: Group by size
  const sizeGroups = new Map<number, ScannedFile[]>();
  for (const f of scannedFiles) {
    if (f.size > 0) {
      const list = sizeGroups.get(f.size) || [];
      list.push(f);
      sizeGroups.set(f.size, list);
    }
  }

  // Filter to size >= 2
  const candidateSizeGroups: Array<[number, ScannedFile[]]> = [];
  for (const [sz, files] of sizeGroups.entries()) {
    if (files.length >= 2) {
      candidateSizeGroups.push([sz, files]);
    }
  }

  // Step 2 & 3: Compute or use SHA-256 hash for candidates
  const fullGroups = new Map<string, ScannedFile[]>();

  for (const [sz, files] of candidateSizeGroups) {
    // Stage 1: Group by partial hash or existing full sha256
    const partialGroups = new Map<string, ScannedFile[]>();
    for (const file of files) {
      if (file.sha256) {
        const key = `full_${file.sha256}`;
        const list = partialGroups.get(key) || [];
        list.push(file);
        partialGroups.set(key, list);
      } else if (fs.existsSync(file.path)) {
        const pHash = computePartialHash(file.path, sz);
        if (pHash) {
          const key = `part_${pHash}`;
          const list = partialGroups.get(key) || [];
          list.push(file);
          partialGroups.set(key, list);
        }
      }
    }

    // Stage 2: For any group with >= 2 candidates, verify with full SHA-256
    for (const pFiles of partialGroups.values()) {
      if (pFiles.length >= 2) {
        for (const file of pFiles) {
          if (!file.sha256 && fs.existsSync(file.path)) {
            const fHash = computeFullHash(file.path);
            if (fHash) {
              file.sha256 = fHash;
            }
          }
          if (file.sha256) {
            const hashKey = `${sz}_${file.sha256}`;
            const list = fullGroups.get(hashKey) || [];
            list.push(file);
            fullGroups.set(hashKey, list);
          }
        }
      }
    }
  }

  // Compile duplicate groups
  const duplicateGroups: DuplicateGroup[] = [];
  let totalReclaimableBytes = 0;
  let totalDuplicateFiles = 0;
  let groupIdx = 1;

  for (const [fHash, copies] of fullGroups.entries()) {
    if (copies.length >= 2) {
      const fileSize = copies[0].size;
      const keeperId = chooseSuggestedKeeper(copies);
      const reclaimableForGroup = fileSize * (copies.length - 1);
      totalReclaimableBytes += reclaimableForGroup;
      totalDuplicateFiles += copies.length - 1;

      duplicateGroups.push({
        group_id: `dup-group-${groupIdx++}`,
        hash: fHash,
        file_size: fileSize,
        file_size_formatted: formatSize(fileSize),
        reclaimable_bytes: reclaimableForGroup,
        reclaimable_formatted: formatSize(reclaimableForGroup),
        suggested_keeper_id: keeperId,
        copies_count: copies.length,
        copies,
      });
    }
  }

  duplicateGroups.sort((a, b) => b.reclaimable_bytes - a.reclaimable_bytes);

  return {
    groups: duplicateGroups,
    total_groups: duplicateGroups.length,
    total_duplicate_files: totalDuplicateFiles,
    total_reclaimable_bytes: totalReclaimableBytes,
    total_reclaimable_formatted: formatSize(totalReclaimableBytes),
  };
}
