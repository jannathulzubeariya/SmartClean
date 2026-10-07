import React, { useRef, useState } from 'react';
import {
  Folder,
  FolderOpen,
  PlayCircle,
  X,
  Smartphone,
  Laptop,
  ShieldCheck,
  Files,
} from 'lucide-react';
import { useScan } from '../context/ScanContext';
import { Button } from './Buttons';
import { FramedIcon } from './FramedIcon';

interface ScopePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScopePickerModal: React.FC<ScopePickerModalProps> = ({ isOpen, onClose }) => {
  const {
    capabilities,
    startDirectoryPickerScan,
    startInputFileListScan,
    startScan,
    generateDemo,
    showToast,
  } = useScan();

  const [customPath, setCustomPath] = useState('');
  const [isPicking, setIsPicking] = useState(false);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleDirectoryPickerClick = async () => {
    setIsPicking(true);
    const success = await startDirectoryPickerScan();
    setIsPicking(false);
    if (success) {
      onClose();
    }
  };

  const handleFolderInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onClose();
      await startInputFileListScan(files);
    }
    // reset input
    if (e.target) e.target.value = '';
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onClose();
      await startInputFileListScan(files, 'Selected Files');
    }
    if (e.target) e.target.value = '';
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customPath.trim();
    if (!trimmed) return;

    if (!capabilities.isLocalhost && /^[a-zA-Z]:[/\\]/.test(trimmed)) {
      showToast(
        "Windows paths like 'C:\\...' cannot be accessed by a remote Linux server. Please use 'Select Folder' or 'Select Files' above so SmartClean can access your device files directly.",
        'warning'
      );
      return;
    }

    onClose();
    await startScan(trimmed);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[var(--ink)]/40 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scope-picker-title"
    >
      <div className="analog-card paper-grain max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b-[1.5px] border-[var(--ink)] bg-[var(--paper-2)] flex items-center justify-between shrink-0">
          <div>
            <span className="font-hand text-[var(--red)] text-base block leading-none">
              location picker
            </span>
            <h2 id="scope-picker-title" className="font-serif font-bold text-xl sm:text-2xl text-[var(--ink)] mt-1">
              Select Storage to Clean
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-[44px] h-[44px] rounded-[4px] border-[1.5px] border-[var(--ink)] bg-[var(--paper)] flex items-center justify-center cursor-pointer hover:bg-[var(--paper-2)] transition-colors shrink-0"
            aria-label="Close modal"
          >
            <X className="w-4 h-4 text-[var(--ink)]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5 text-xs overflow-y-auto">
          {/* Privacy statement banner */}
          <div className="p-3.5 bg-[var(--paper-2)] border-[1.5px] border-[var(--ink)] rounded-[4px] text-xs text-[var(--ink)] flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#2E6B3E] shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Device Privacy:</strong> SmartClean scans only the folder or files you explicitly select. We never ask for or assume access to your entire device storage, and your local files stay under your control.
            </div>
          </div>

          {/* Option A: Desktop Native Directory Picker (if supported) */}
          {capabilities.hasDirectoryPicker && (
            <div className="p-4 bg-[var(--paper)] border-[1.5px] border-[var(--ink)] rounded-[4px] space-y-3">
              <div className="flex items-center gap-3">
                <FramedIcon icon={Laptop} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="font-serif font-bold text-base text-[var(--ink)]">
                    Choose Folder on this Device
                  </div>
                  <p className="text-xs text-[var(--ink-soft)] mt-0.5">
                    Select any local directory (e.g. Documents, Downloads, Desktop) using your browser's native folder picker.
                  </p>
                </div>
              </div>
              <div className="pt-1 flex justify-end">
                <Button
                  variant="primary"
                  onClick={handleDirectoryPickerClick}
                  disabled={isPicking}
                  className="w-full sm:w-auto"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>{isPicking ? 'Opening folder...' : 'Select Folder'}</span>
                </Button>
              </div>
            </div>
          )}

          {/* Option B: Mobile / Directory Upload Fallback */}
          <div className="p-4 bg-[var(--paper)] border-[1.5px] border-[var(--ink)] rounded-[4px] space-y-3">
            <div className="flex items-center gap-3">
              <FramedIcon icon={capabilities.isMobile ? Smartphone : Folder} size="md" />
              <div className="min-w-0 flex-1">
                <div className="font-serif font-bold text-base text-[var(--ink)]">
                  {capabilities.isMobile ? 'Choose Storage Location (Mobile)' : 'Select Folder / Files'}
                </div>
                <p className="text-xs text-[var(--ink-soft)] mt-0.5">
                  Pick a folder or group of files from your device storage to inspect duplicates, misplaced items, and storage breakdown.
                </p>
              </div>
            </div>

            {/* Hidden inputs */}
            <input
              type="file"
              ref={folderInputRef}
              onChange={handleFolderInputChange}
              // @ts-ignore
              webkitdirectory=""
              // @ts-ignore
              directory=""
              multiple
              className="hidden"
            />
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              multiple
              className="hidden"
            />

            <div className="pt-1 flex flex-wrap gap-2 justify-end">
              <Button
                variant="secondary"
                size="small"
                onClick={() => fileInputRef.current?.click()}
              >
                <Files className="w-3.5 h-3.5" />
                <span>Select Files</span>
              </Button>
              <Button
                variant="primary"
                size="small"
                onClick={() => folderInputRef.current?.click()}
              >
                <Folder className="w-3.5 h-3.5" />
                <span>Select Folder</span>
              </Button>
            </div>
          </div>

          {/* Option C: SmartClean Sandbox Demo Workspace */}
          <div className="p-4 bg-[#B9D1C9] border-[1.5px] border-[var(--ink)] rounded-[4px] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <FramedIcon icon={PlayCircle} size="md" />
              <div>
                <strong className="text-sm font-semibold text-[var(--ink)] block">
                  SmartClean Sandbox Demo Workspace
                </strong>
                <p className="text-xs text-[var(--ink)]">
                  Explore full features with realistic sample storage (duplicates, misplaced reports, temporary files).
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              size="small"
              onClick={() => {
                onClose();
                generateDemo();
              }}
              className="shrink-0 self-end sm:self-auto"
            >
              Start Demo Scan
            </Button>
          </div>

          {/* Option D: Localhost Path (Only available when running on local machine) */}
          {capabilities.isLocalhost && (
            <div className="pt-2 border-t-[1.5px] border-[var(--ink)]/15 space-y-2">
              <label
                htmlFor="custom-scan-path"
                className="font-semibold uppercase tracking-wider text-[10px] text-[var(--ink-soft)] block"
              >
                Local Developer Path (Localhost only)
              </label>
              <form onSubmit={handleCustomSubmit} className="flex gap-2">
                <input
                  id="custom-scan-path"
                  type="text"
                  value={customPath}
                  onChange={(e) => setCustomPath(e.target.value)}
                  placeholder="e.g. /home/user/Desktop"
                  className="flex-1 h-[44px] bg-[var(--paper)] border-[1.5px] border-[var(--ink)] rounded-[4px] px-3 text-xs text-[var(--ink)] font-mono focus:outline-none"
                />
                <Button type="submit" variant="primary" disabled={!customPath.trim()}>
                  Scan
                </Button>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 bg-[var(--paper-2)] border-t-[1.5px] border-[var(--ink)] flex justify-end shrink-0">
          <Button variant="secondary" size="small" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};
