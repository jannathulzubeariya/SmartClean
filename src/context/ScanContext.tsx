import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { api } from '../api/client';
import { ScanStatus, ScannedFile } from '../types';
import {
  getStorageCapabilities,
  StorageCapabilities,
  formatScopeDisplayName,
  enumerateDirectoryHandle,
  parseFileList,
  computeBrowserFileHash,
  ClientFileEntry,
} from '../services/storageCapability';

export interface Toast {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

interface ScanContextType {
  scanStatus: ScanStatus | null;
  summary: any | null;
  isLoadingSummary: boolean;
  activeScope: string | null;
  displayScopeName: string;
  capabilities: StorageCapabilities;
  setActiveScope: (scope: string) => void;
  startScan: (scope: string) => Promise<void>;
  startClientScan: (scopeName: string, entries: ClientFileEntry[]) => Promise<void>;
  startDirectoryPickerScan: () => Promise<boolean>;
  startInputFileListScan: (fileList: FileList, customFolderName?: string) => Promise<void>;
  pauseScan: () => Promise<void>;
  resumeScan: () => Promise<void>;
  cancelScan: () => Promise<void>;
  generateDemo: () => Promise<void>;
  refreshSummary: () => Promise<void>;
  
  // UI drawers & modals
  selectedFileId: string | null;
  setSelectedFileId: (id: string | null) => void;
  deleteAnalysisTarget: ScannedFile | null;
  setDeleteAnalysisTarget: (file: ScannedFile | null) => void;

  // Toasts
  toasts: Toast[];
  showToast: (message: string, type?: Toast['type']) => void;
  dismissToast: (id: string) => void;

  // Global search
  globalSearchQuery: string;
  setGlobalSearchQuery: (q: string) => void;
}

const ScanContext = createContext<ScanContextType | null>(null);

export const ScanProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [capabilities, setCapabilities] = useState<StorageCapabilities>(() => getStorageCapabilities());
  const [scanStatus, setScanStatus] = useState<ScanStatus | null>(null);
  const [summary, setSummary] = useState<any | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [activeScope, setActiveScope] = useState<string | null>(null);

  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [deleteAnalysisTarget, setDeleteAnalysisTarget] = useState<ScannedFile | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  const cancelClientScanRef = useRef(false);
  const activeDirectoryHandleRef = useRef<any>(null);
  const prevStatusRef = useRef<string | undefined>(undefined);

  // Keep prevStatusRef in sync with scanStatus
  useEffect(() => {
    prevStatusRef.current = scanStatus?.status;
  }, [scanStatus?.status]);

  // Update capabilities on mount
  useEffect(() => {
    setCapabilities(getStorageCapabilities());
  }, []);

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshSummary = useCallback(async () => {
    setIsLoadingSummary(true);
    const res = await api.getSummary();
    if (res.success && res.data) {
      setSummary(res.data);
      if (res.data.scope) {
        setActiveScope(res.data.scope);
      }
    }
    setIsLoadingSummary(false);
  }, []);

  // Poll scan status while active
  useEffect(() => {
    let interval: any = null;

    const poll = async () => {
      const res = await api.getScanStatus();
      if (res.success && res.data) {
        const data = res.data as ScanStatus;
        const prev = prevStatusRef.current;
        prevStatusRef.current = data.status;
        setScanStatus(data);
        if (data.status === 'completed' && prev === 'scanning') {
          showToast('Scan completed successfully', 'success');
          refreshSummary();
        } else if (data.status === 'cancelled' && prev === 'scanning') {
          showToast('Scan was cancelled', 'warning');
          refreshSummary();
        }
      }
    };

    if (scanStatus?.status === 'scanning' || scanStatus?.status === 'paused') {
      interval = setInterval(poll, 1200);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [scanStatus?.status, showToast, refreshSummary]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      const statusRes = await api.getScanStatus();
      if (statusRes.success && statusRes.data) {
        setScanStatus(statusRes.data);
      }
      refreshSummary();
    };
    init();
  }, [refreshSummary]);

  const startScan = async (scope: string) => {
    setActiveScope(scope);
    showToast(`Initiating scan for ${formatScopeDisplayName(scope)}...`, 'info');
    const res = await api.startScan(scope);
    if (res.success) {
      setScanStatus({
        status: 'scanning',
        scope,
        current_path: scope,
        files_scanned: 0,
        folders_scanned: 0,
        skipped_count: 0,
        elapsed_seconds: 0,
        error_count: 0,
        errors: [],
      });
    } else {
      showToast(res.error?.message || 'Failed to start scan', 'error');
    }
  };

  const startClientScan = async (scopeName: string, entries: ClientFileEntry[]) => {
    if (entries.length === 0) {
      showToast('Selected folder contains no files.', 'warning');
      return;
    }

    cancelClientScanRef.current = false;
    setActiveScope(scopeName);
    showToast(`Analyzing ${entries.length} files from ${scopeName}...`, 'info');

    setScanStatus({
      status: 'scanning',
      scope: scopeName,
      current_path: scopeName,
      files_scanned: entries.length,
      folders_scanned: 1,
      skipped_count: 0,
      elapsed_seconds: 0,
      error_count: 0,
      errors: [],
    });

    try {
      // Step: Detect potential duplicate candidate sizes and compute partial hashes
      const sizeMap = new Map<number, ClientFileEntry[]>();
      for (const e of entries) {
        if (e.size > 0) {
          const list = sizeMap.get(e.size) || [];
          list.push(e);
          sizeMap.set(e.size, list);
        }
      }

      for (const files of sizeMap.values()) {
        if (files.length >= 2) {
          for (const item of files) {
            if (item.fileObject && !item.sha256) {
              const hash = await computeBrowserFileHash(item.fileObject, false);
              if (hash) {
                item.sha256 = hash;
              }
            }
          }
        }
      }

      // Prepare payload (without heavy DOM File objects)
      const sanitizedEntries = entries.map((e) => ({
        id: e.id,
        filename: e.filename,
        path: e.path,
        size: e.size,
        mtime: e.mtime,
        atime: e.atime,
        ext: e.ext,
        category: e.category,
        sha256: e.sha256,
      }));

      const res = await api.ingestFiles(scopeName, sanitizedEntries);
      if (res.success) {
        showToast(`Scan complete: ${entries.length} files analyzed in ${scopeName}`, 'success');
        setScanStatus({
          status: 'completed',
          scope: scopeName,
          current_path: scopeName,
          files_scanned: entries.length,
          folders_scanned: new Set(entries.map((e) => e.path.split('/')[0])).size,
          skipped_count: 0,
          elapsed_seconds: 1,
          error_count: 0,
          errors: [],
        });
        await refreshSummary();
      } else {
        showToast(res.error?.message || 'Ingestion analysis failed', 'error');
        setScanStatus((prev) => (prev ? { ...prev, status: 'error' } : null));
      }
    } catch (err: any) {
      showToast(`Scan failed: ${err.message}`, 'error');
      setScanStatus((prev) => (prev ? { ...prev, status: 'error' } : null));
    }
  };

  const startDirectoryPickerScan = async (): Promise<boolean> => {
    if (typeof (window as any).showDirectoryPicker !== 'function') {
      showToast('Native folder picker is not supported in this browser. Please use the folder selector below.', 'warning');
      return false;
    }

    try {
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'read',
      });
      activeDirectoryHandleRef.current = dirHandle;
      const folderName = dirHandle.name || 'Selected Folder';

      showToast(`Enumerating '${folderName}'...`, 'info');
      setScanStatus({
        status: 'scanning',
        scope: `Selected Folder: ${folderName}`,
        current_path: folderName,
        files_scanned: 0,
        folders_scanned: 0,
        skipped_count: 0,
        elapsed_seconds: 0,
        error_count: 0,
        errors: [],
      });
      const entries = await enumerateDirectoryHandle(
        dirHandle,
        folderName,
        (count, currentName) => {
          setScanStatus((prev) =>
            prev
              ? { ...prev, files_scanned: count, current_path: currentName }
              : null
          );
        },
        () => cancelClientScanRef.current
      );

      await startClientScan(`Selected Folder: ${folderName}`, entries);
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User cancelled picker
        return false;
      }
      showToast(`Folder access denied or cancelled: ${err.message}`, 'error');
      return false;
    }
  };

  const startInputFileListScan = async (fileList: FileList, customFolderName?: string) => {
    if (!fileList || fileList.length === 0) return;

    let folderName = customFolderName || 'Device Storage';
    if (!customFolderName && fileList[0]?.webkitRelativePath) {
      folderName = fileList[0].webkitRelativePath.split('/')[0] || 'Device Storage';
    }

    setScanStatus({
      status: 'scanning',
      scope: `Selected Storage: ${folderName}`,
      current_path: folderName,
      files_scanned: 0,
      folders_scanned: 0,
      skipped_count: 0,
      elapsed_seconds: 0,
      error_count: 0,
      errors: [],
    });

    const entries = parseFileList(fileList, (count) => {
      setScanStatus((prev) => (prev ? { ...prev, files_scanned: count } : null));
    });

    await startClientScan(`Selected Storage: ${folderName}`, entries);
  };

  const pauseScan = async () => {
    const res = await api.pauseScan();
    if (res.success) {
      showToast('Scan paused', 'info');
      setScanStatus((prev) => (prev ? { ...prev, status: 'paused' } : null));
    }
  };

  const resumeScan = async () => {
    const res = await api.resumeScan();
    if (res.success) {
      showToast('Scan resumed', 'info');
      setScanStatus((prev) => (prev ? { ...prev, status: 'scanning' } : null));
    }
  };

  const cancelScan = async () => {
    cancelClientScanRef.current = true;
    const res = await api.cancelScan();
    if (res.success) {
      showToast('Scan cancelled', 'warning');
      setScanStatus((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
    }
  };

  const generateDemo = async () => {
    showToast('Creating realistic SmartClean demo workspace...', 'info');
    const res = await api.generateDemo();
    if (res.success) {
      showToast('Demo workspace generated! Automatic scan started.', 'success');
      const demoPath = res.data?.demo?.demo_dir;
      if (demoPath) {
        setActiveScope(demoPath);
      }
      setScanStatus({
        status: 'scanning',
        scope: demoPath ?? null,
        current_path: demoPath ?? '',
        files_scanned: 0,
        folders_scanned: 0,
        skipped_count: 0,
        elapsed_seconds: 0,
        error_count: 0,
        errors: [],
      });
    } else {
      showToast(res.error?.message || 'Failed to generate demo workspace', 'error');
    }
  };

  const displayScopeName = formatScopeDisplayName(activeScope);

  return (
    <ScanContext.Provider
      value={{
        scanStatus,
        summary,
        isLoadingSummary,
        activeScope,
        displayScopeName,
        capabilities,
        setActiveScope,
        startScan,
        startClientScan,
        startDirectoryPickerScan,
        startInputFileListScan,
        pauseScan,
        resumeScan,
        cancelScan,
        generateDemo,
        refreshSummary,
        selectedFileId,
        setSelectedFileId,
        deleteAnalysisTarget,
        setDeleteAnalysisTarget,
        toasts,
        showToast,
        dismissToast,
        globalSearchQuery,
        setGlobalSearchQuery,
      }}
    >
      {children}
    </ScanContext.Provider>
  );
};

export const useScan = () => {
  const context = useContext(ScanContext);
  if (!context) {
    throw new Error('useScan must be used within a ScanProvider');
  }
  return context;
};

