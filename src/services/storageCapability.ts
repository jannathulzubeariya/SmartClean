/**
 * SmartClean Centralized Storage Capability Service
 *
 * Detects browser capabilities, platform, and provides safe,
 * device-aware folder/file access without assuming server filesystem paths.
 */

export type StorageAccessMode =
  | 'DIRECTORY_HANDLE_MODE' // Window.showDirectoryPicker supported (Desktop Chrome/Edge)
  | 'DIRECTORY_INPUT_MODE'  // <input webkitdirectory> supported (Desktop Firefox, Safari, Android Chrome)
  | 'FILE_SELECTION_MODE'   // Multiple file selection fallback
  | 'UNSUPPORTED_MODE';

export interface StorageCapabilities {
  mode: StorageAccessMode;
  isDesktop: boolean;
  isMobile: boolean;
  isSecureContext: boolean;
  hasDirectoryPicker: boolean;
  hasWebkitDirectory: boolean;
  isLocalhost: boolean;
  description: string;
}

export interface ClientFileEntry {
  id: string;
  filename: string;
  path: string;
  size: number;
  mtime: number;
  atime: number;
  ext: string;
  category?: string;
  sha256?: string;
  header_hex?: string;
  fileObject?: File;
  fileHandle?: any; // FileSystemFileHandle if available
}

/**
 * Detect capabilities of current browser environment
 */
export function getStorageCapabilities(): StorageCapabilities {
  const isBrowser = typeof window !== 'undefined';
  if (!isBrowser) {
    return {
      mode: 'UNSUPPORTED_MODE',
      isDesktop: true,
      isMobile: false,
      isSecureContext: false,
      hasDirectoryPicker: false,
      hasWebkitDirectory: false,
      isLocalhost: false,
      description: 'Non-browser environment',
    };
  }

  const isSecure = window.isSecureContext === true;
  const userAgent = navigator.userAgent || '';
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/i.test(userAgent)); // iPadOS
  const isDesktop = !isMobile;

  const hasDirectoryPicker = typeof (window as any).showDirectoryPicker === 'function' && isSecure;

  // Test webkitdirectory support via input element
  let hasWebkitDirectory = false;
  try {
    const input = document.createElement('input');
    hasWebkitDirectory = 'webkitdirectory' in input || 'directory' in input;
  } catch {
    hasWebkitDirectory = false;
  }

  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';

  let mode: StorageAccessMode = 'UNSUPPORTED_MODE';
  let description = '';

  if (hasDirectoryPicker) {
    mode = 'DIRECTORY_HANDLE_MODE';
    description = 'Direct Native Folder Access (File System Access API)';
  } else if (hasWebkitDirectory) {
    mode = 'DIRECTORY_INPUT_MODE';
    description = 'Standard Folder Selection (Directory Upload API)';
  } else {
    mode = 'FILE_SELECTION_MODE';
    description = 'Individual File Selection Mode';
  }

  return {
    mode,
    isDesktop,
    isMobile,
    isSecureContext: isSecure,
    hasDirectoryPicker,
    hasWebkitDirectory,
    isLocalhost,
    description,
  };
}

/**
 * Formats a location or scope string cleanly for display.
 * Strips internal container paths like `/app/applet/...`.
 */
export function formatScopeDisplayName(rawScope: string | null | undefined): string {
  if (!rawScope) return 'No storage selected';

  // Normalize slashes
  const s = rawScope.trim();

  if (s.includes('SmartClean_Demo') || s.toLowerCase().includes('demo workspace')) {
    return 'SmartClean Sandbox Demo';
  }

  // Strip container prefixes like /app/applet/ or /root/
  if (s.startsWith('/app/applet/')) {
    const sub = s.slice('/app/applet/'.length);
    return `Local Folder: ${sub}`;
  }

  // If client-provided folder name (e.g. "Selected Folder: Documents")
  if (
    s.startsWith('Selected Folder:') ||
    s.startsWith('Selected Storage:') ||
    s.startsWith('Device Storage:') ||
    s.startsWith('Selected Files')
  ) {
    return s;
  }

  // If system root
  if (s === '/' || s === '\\') {
    return 'System Storage';
  }

  // Otherwise return basename or truncated clean path
  const parts = s.split(/[/\\]+/).filter(Boolean);
  if (parts.length > 0) {
    return parts[parts.length - 1];
  }

  return s;
}

/**
 * Formats a file or directory path cleanly for display in the UI.
 * Strips internal container paths like `/app/applet/` and formats virtual paths.
 */
export function formatDisplayPath(rawPath: string | null | undefined): string {
  if (!rawPath) return '';
  let p = rawPath.trim();

  // Quarantine Vault paths
  if (p.startsWith('quarantine://client/')) {
    return `Quarantine Vault / ${p.slice('quarantine://client/'.length)}`;
  }
  if (p.startsWith('quarantine://')) {
    return `Quarantine Vault / ${p.slice('quarantine://'.length)}`;
  }
  if (p.includes('/quarantine/') || p.includes('\\quarantine\\')) {
    const fname = p.split(/[/\\]+/).pop() || '';
    const cleanName = fname.replace(/^q_\d+_[a-f0-9]+_/, '');
    return `Quarantine Vault / ${cleanName}`;
  }

  // Strip deployment container prefixes
  if (p.startsWith('/app/applet/')) {
    p = p.slice('/app/applet/'.length);
  } else if (p.startsWith('/app/')) {
    p = p.slice('/app/'.length);
  } else if (p.startsWith('/root/')) {
    p = p.slice('/root/'.length);
  }

  // Clean SmartClean_Demo path
  const demoIdx = p.indexOf('SmartClean_Demo');
  if (demoIdx !== -1) {
    p = p.slice(demoIdx).replace(/\\/g, '/');
  }

  return p;
}

/**
 * Computes partial SHA-256 for duplicate detection using native Web Crypto API
 */
export async function computeBrowserFileHash(file: File, partialOnly = false): Promise<string | null> {
  try {
    const PARTIAL_CHUNK = 64 * 1024; // 64 KB
    let buffer: ArrayBuffer;

    if (partialOnly && file.size > PARTIAL_CHUNK * 2) {
      // First 64KB + Last 64KB
      const headBlob = file.slice(0, PARTIAL_CHUNK);
      const tailBlob = file.slice(file.size - PARTIAL_CHUNK, file.size);
      const headBuf = await headBlob.arrayBuffer();
      const tailBuf = await tailBlob.arrayBuffer();

      const combined = new Uint8Array(headBuf.byteLength + tailBuf.byteLength);
      combined.set(new Uint8Array(headBuf), 0);
      combined.set(new Uint8Array(tailBuf), headBuf.byteLength);
      buffer = combined.buffer;
    } else {
      buffer = await file.arrayBuffer();
    }

    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    console.warn('Browser hash failed for file:', file.name, err);
    return null;
  }
}

/**
 * Recursively enumerates a FileSystemDirectoryHandle (Chrome/Edge Desktop)
 */
export async function enumerateDirectoryHandle(
  dirHandle: any,
  currentPath = '',
  onProgress?: (count: number, currentName: string) => void,
  shouldStop?: () => boolean
): Promise<ClientFileEntry[]> {
  const entries: ClientFileEntry[] = [];
  let fileCount = 0;

  async function walk(handle: any, relPath: string) {
    if (shouldStop && shouldStop()) return;

    for await (const entry of (handle as any).values()) {
      if (shouldStop && shouldStop()) return;

      if (entry.kind === 'file') {
        try {
          const file = await entry.getFile();
          const filePath = relPath ? `${relPath}/${entry.name}` : entry.name;
          const ext = file.name.includes('.') ? `.${file.name.split('.').pop()!.toLowerCase()}` : '';

          fileCount++;
          if (onProgress) {
            onProgress(fileCount, entry.name);
          }

          entries.push({
            id: `client_f_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            filename: file.name,
            path: filePath,
            size: file.size,
            mtime: Math.floor(file.lastModified / 1000),
            atime: Math.floor(file.lastModified / 1000),
            ext,
            fileObject: file,
            fileHandle: entry,
          });
        } catch (err) {
          console.warn('Could not read file from handle:', entry.name, err);
        }
      } else if (entry.kind === 'directory') {
        const nextRel = relPath ? `${relPath}/${entry.name}` : entry.name;
        await walk(entry, nextRel);
      }
    }
  }

  await walk(dirHandle, currentPath);
  return entries;
}

/**
 * Converts FileList from <input webkitdirectory> into ClientFileEntry[]
 */
export function parseFileList(
  fileList: FileList,
  onProgress?: (count: number, currentName: string) => void
): ClientFileEntry[] {
  const entries: ClientFileEntry[] = [];

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    const path = file.webkitRelativePath || file.name;
    const ext = file.name.includes('.') ? `.${file.name.split('.').pop()!.toLowerCase()}` : '';

    if (onProgress) {
      onProgress(i + 1, file.name);
    }

    entries.push({
      id: `client_f_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      filename: file.name,
      path,
      size: file.size,
      mtime: Math.floor(file.lastModified / 1000),
      atime: Math.floor(file.lastModified / 1000),
      ext,
      fileObject: file,
    });
  }

  return entries;
}
