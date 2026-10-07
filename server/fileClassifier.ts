import fs from 'fs';
import path from 'path';

export const EXTENSION_CATEGORIES: Record<string, string> = {
  // Documents
  '.pdf': 'Documents',
  '.docx': 'Documents',
  '.doc': 'Documents',
  '.xlsx': 'Documents',
  '.xls': 'Documents',
  '.pptx': 'Documents',
  '.ppt': 'Documents',
  '.txt': 'Documents',
  '.rtf': 'Documents',
  '.odt': 'Documents',
  '.ods': 'Documents',
  '.odp': 'Documents',
  '.csv': 'Documents',
  '.tsv': 'Documents',
  '.epub': 'Documents',
  '.pages': 'Documents',
  '.numbers': 'Documents',
  '.key': 'Documents',

  // Images
  '.jpg': 'Images',
  '.jpeg': 'Images',
  '.png': 'Images',
  '.gif': 'Images',
  '.webp': 'Images',
  '.svg': 'Images',
  '.bmp': 'Images',
  '.ico': 'Images',
  '.tiff': 'Images',
  '.tif': 'Images',
  '.psd': 'Images',
  '.ai': 'Images',
  '.raw': 'Images',
  '.heic': 'Images',
  '.avif': 'Images',

  // Videos
  '.mp4': 'Videos',
  '.mkv': 'Videos',
  '.avi': 'Videos',
  '.mov': 'Videos',
  '.wmv': 'Videos',
  '.flv': 'Videos',
  '.webm': 'Videos',
  '.m4v': 'Videos',
  '.3gp': 'Videos',

  // Audio
  '.mp3': 'Audio',
  '.wav': 'Audio',
  '.flac': 'Audio',
  '.aac': 'Audio',
  '.ogg': 'Audio',
  '.m4a': 'Audio',
  '.wma': 'Audio',
  '.mid': 'Audio',
  '.midi': 'Audio',

  // Archives
  '.zip': 'Archives',
  '.rar': 'Archives',
  '.7z': 'Archives',
  '.tar': 'Archives',
  '.gz': 'Archives',
  '.bz2': 'Archives',
  '.xz': 'Archives',
  '.tgz': 'Archives',
  '.iso': 'Archives',
  '.dmg': 'Archives',

  // Executables
  '.exe': 'Executables',
  '.bat': 'Executables',
  '.cmd': 'Executables',
  '.sh': 'Executables',
  '.bin': 'Executables',
  '.app': 'Executables',

  // Installers
  '.msi': 'Installers',
  '.pkg': 'Installers',
  '.deb': 'Installers',
  '.rpm': 'Installers',

  // Code
  '.py': 'Code',
  '.js': 'Code',
  '.ts': 'Code',
  '.jsx': 'Code',
  '.tsx': 'Code',
  '.html': 'Code',
  '.htm': 'Code',
  '.css': 'Code',
  '.scss': 'Code',
  '.sass': 'Code',
  '.json': 'Code',
  '.xml': 'Code',
  '.yaml': 'Code',
  '.yml': 'Code',
  '.java': 'Code',
  '.c': 'Code',
  '.cpp': 'Code',
  '.h': 'Code',
  '.hpp': 'Code',
  '.cs': 'Code',
  '.go': 'Code',
  '.rs': 'Code',
  '.php': 'Code',
  '.rb': 'Code',
  '.swift': 'Code',
  '.kt': 'Code',
  '.sql': 'Code',
  '.md': 'Code',

  // Temporary
  '.tmp': 'Temporary',
  '.temp': 'Temporary',
  '.bak': 'Temporary',
  '.swp': 'Temporary',
  '.dmp': 'Temporary',
  '.crdownload': 'Temporary',
  '.part': 'Temporary',
  '.cache': 'Temporary',

  // Logs
  '.log': 'Logs',
  '.trace': 'Logs',
  '.out': 'Logs',
};

export function classifyFile(filePath: string, filename?: string): [string, string] {
  const fname = filename || path.basename(filePath);
  const lowerName = fname.toLowerCase();
  const ext = path.extname(lowerName);

  // Installer heuristic
  if (['.exe', '.msi'].includes(ext)) {
    if (['setup', 'install', 'installer', 'update', 'patch'].some((t) => lowerName.includes(t))) {
      return ['Installers', ext];
    }
  }

  // Temporary heuristic
  if (
    lowerName.startsWith('~') ||
    lowerName.endsWith('~') ||
    ['.tmp', '.temp', '.bak', '.swp', '.dmp', '.crdownload', '.part'].includes(ext)
  ) {
    return ['Temporary', ext];
  }

  // Log heuristic
  if (['.log', '.trace', '.out'].includes(ext) || lowerName.includes('.log.')) {
    return ['Logs', ext];
  }

  // Office format check
  if (['.docx', '.xlsx', '.pptx', '.odt', '.ods', '.odp'].includes(ext)) {
    return ['Documents', ext];
  }

  // Extension category
  const extCategory = EXTENSION_CATEGORIES[ext];
  if (extCategory) {
    return [extCategory, ext];
  }

  // Magic bytes check if file exists
  if (filePath && fs.existsSync(filePath)) {
    try {
      const buffer = Buffer.alloc(16);
      const fd = fs.openSync(filePath, 'r');
      const bytesRead = fs.readSync(fd, buffer, 0, 16, 0);
      fs.closeSync(fd);

      if (bytesRead >= 4) {
        if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
          return ['Images', ext];
        }
        if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
          return ['Images', ext];
        }
        if (buffer.toString('utf8', 0, 4) === '%PDF') {
          return ['Documents', ext];
        }
        if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
          return ['Archives', ext];
        }
        if (buffer[0] === 0x4d && buffer[1] === 0x5a) {
          return ['Executables', ext];
        }
      }
    } catch {
      // Ignore read errors
    }
  }

  return ['Other / Unknown', ext];
}
