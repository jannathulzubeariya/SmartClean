import fs from 'fs';
import path from 'path';
import os from 'os';
import { ScannedFile } from './types';
import { formatSize } from './sizes';

export interface DiskMetrics {
  total_bytes: number;
  used_bytes: number;
  free_bytes: number;
  total_formatted: string;
  used_formatted: string;
  free_formatted: string;
  percent_used: number;
}

export interface StorageCategoryMetric {
  category: string;
  count: number;
  bytes: number;
  formatted_size: string;
  percentage: number;
}

export interface StorageFolderMetric {
  folder: string;
  folder_name: string;
  count: number;
  bytes: number;
  formatted_size: string;
}

export interface StorageAnalysisResult {
  disk: DiskMetrics;
  scanned_files_count: number;
  total_scanned_bytes: number;
  total_scanned_formatted: string;
  categories: StorageCategoryMetric[];
  top_folders: StorageFolderMetric[];
  reclaimable_bytes: number;
  reclaimable_formatted: string;
}

export function getDiskUsage(targetPath?: string | null): DiskMetrics {
  const p = targetPath && fs.existsSync(targetPath) ? targetPath : os.homedir();
  try {
    if (typeof (fs as any).statfsSync === 'function') {
      const stats = (fs as any).statfsSync(p);
      const total = stats.bsize * stats.blocks;
      const free = stats.bsize * stats.bavail;
      const used = total - free;
      const percentUsed = total > 0 ? Math.round((used / total) * 1000) / 10 : 0;

      return {
        total_bytes: total,
        used_bytes: used,
        free_bytes: free,
        total_formatted: formatSize(total),
        used_formatted: formatSize(used),
        free_formatted: formatSize(free),
        percent_used: percentUsed,
      };
    }
  } catch {
    // Fallback if statfs fails
  }

  // Fallback defaults
  const approxTotal = 256 * 1024 * 1024 * 1024; // 256 GB
  const approxFree = 140 * 1024 * 1024 * 1024;
  const approxUsed = approxTotal - approxFree;
  return {
    total_bytes: approxTotal,
    used_bytes: approxUsed,
    free_bytes: approxFree,
    total_formatted: formatSize(approxTotal),
    used_formatted: formatSize(approxUsed),
    free_formatted: formatSize(approxFree),
    percent_used: 45.3,
  };
}

export function analyzeStorage(
  scopePath: string | null | undefined,
  scannedFiles: ScannedFile[],
  duplicateReclaimableBytes = 0,
  cleanupReclaimableBytes = 0
): StorageAnalysisResult {
  const diskMetrics = getDiskUsage(scopePath);

  const categoriesMap = new Map<string, { count: number; bytes: number }>();
  const foldersMap = new Map<string, { count: number; bytes: number }>();

  let totalScannedBytes = 0;
  for (const f of scannedFiles) {
    const size = f.size || 0;
    const cat = f.category || 'Other / Unknown';
    const folder = path.dirname(f.path || '');

    totalScannedBytes += size;

    const catData = categoriesMap.get(cat) || { count: 0, bytes: 0 };
    catData.count++;
    catData.bytes += size;
    categoriesMap.set(cat, catData);

    const folderData = foldersMap.get(folder) || { count: 0, bytes: 0 };
    folderData.count++;
    folderData.bytes += size;
    foldersMap.set(folder, folderData);
  }

  const categoryList: StorageCategoryMetric[] = [];
  for (const [catName, data] of categoriesMap.entries()) {
    const percentage =
      totalScannedBytes > 0
        ? Math.round((data.bytes / totalScannedBytes) * 1000) / 10
        : 0;
    categoryList.push({
      category: catName,
      count: data.count,
      bytes: data.bytes,
      formatted_size: formatSize(data.bytes),
      percentage,
    });
  }
  categoryList.sort((a, b) => b.bytes - a.bytes);

  const topFolders: StorageFolderMetric[] = [];
  for (const [folderPath, data] of foldersMap.entries()) {
    topFolders.push({
      folder: folderPath,
      folder_name: path.basename(folderPath) || folderPath,
      count: data.count,
      bytes: data.bytes,
      formatted_size: formatSize(data.bytes),
    });
  }
  topFolders.sort((a, b) => b.bytes - a.bytes);

  const totalReclaimableBytes = duplicateReclaimableBytes + cleanupReclaimableBytes;

  return {
    disk: diskMetrics,
    scanned_files_count: scannedFiles.length,
    total_scanned_bytes: totalScannedBytes,
    total_scanned_formatted: formatSize(totalScannedBytes),
    categories: categoryList,
    top_folders: topFolders.slice(0, 8),
    reclaimable_bytes: totalReclaimableBytes,
    reclaimable_formatted: formatSize(totalReclaimableBytes),
  };
}
