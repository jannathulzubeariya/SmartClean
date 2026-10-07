import React, { useState, useEffect, useCallback } from 'react';
import {
  HardDrive,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Terminal,
  FileCode,
  FileQuestion,
  Pause,
  Play,
  XCircle,
  MoreHorizontal
} from 'lucide-react';
import { api } from '../api/client';
import { useScan } from '../context/ScanContext';
import { ScannedFile } from '../types';
import { formatDisplayPath } from '../services/storageCapability';
import { Button } from '../components/Buttons';
import { FramedIcon } from '../components/FramedIcon';
import { Chip } from '../components/Chips';
import { StorageAnalyzerIcon } from '../components/HandDrawnDecorations';

interface StorageAnalyzerProps {
  onOpenScopePicker: () => void;
  onSelectFile: (id: string) => void;
  onTriggerDeleteAnalysis: (file: ScannedFile) => void;
}

export const StorageAnalyzer: React.FC<StorageAnalyzerProps> = ({
  onOpenScopePicker,
  onSelectFile,
  onTriggerDeleteAnalysis
}) => {
  const { scanStatus, activeScope, pauseScan, resumeScan, cancelScan, globalSearchQuery } = useScan();

  const [files, setFiles] = useState<ScannedFile[]>([]);
  const [totalFiles, setTotalFiles] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [importanceFilter, setImportanceFilter] = useState('all');
  const [sortBy, setSortBy] = useState('size');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [localSearch, setLocalSearch] = useState('');

  const effectiveSearch = globalSearchQuery || localSearch;

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    const res = await api.getFiles({
      type: categoryFilter !== 'all' ? categoryFilter : undefined,
      risk: riskFilter !== 'all' ? riskFilter : undefined,
      importance: importanceFilter !== 'all' ? importanceFilter : undefined,
      q: effectiveSearch.trim() || undefined,
      page: currentPage,
      limit: 50,
      sort_by: sortBy,
      sort_dir: sortDir
    });

    if (res.success && res.data) {
      setFiles(res.data.items || []);
      setTotalFiles(res.data.total || 0);
      setTotalPages(res.data.total_pages || 1);
    }
    setLoading(false);
  }, [categoryFilter, riskFilter, importanceFilter, effectiveSearch, currentPage, sortBy, sortDir]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Refetch when a background or new scan finishes
  useEffect(() => {
    if (scanStatus?.status === 'completed') {
      setCurrentPage(1);
      fetchFiles();
    }
  }, [scanStatus?.status, fetchFiles]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Documents': return FileText;
      case 'Images': return Image;
      case 'Videos': return Video;
      case 'Audio': return Music;
      case 'Archives': return Archive;
      case 'Executables':
      case 'Installers': return Terminal;
      case 'Code': return FileCode;
      default: return FileQuestion;
    }
  };

  const isScanning = scanStatus?.status === 'scanning';
  const isPaused = scanStatus?.status === 'paused';

  return (
    <div className="max-w-[1080px] mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 md:py-12 space-y-6 sm:space-y-8 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b-[1.5px] border-[var(--ink)]">
        <div className="flex items-center gap-3">
          <FramedIcon icon={StorageAnalyzerIcon} size="md" />
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[var(--ink)]">
              Storage Analyzer
            </h1>
            <p className="text-sm text-[var(--ink-soft)] mt-0.5">
              Deep inspection of files inside the active scope.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] uppercase font-medium text-[var(--ink-soft)]">Scope</div>
            <div className="font-mono text-xs text-[var(--ink)] max-w-xs truncate">
              {activeScope || 'No active scope'}
            </div>
          </div>
          <Button variant="primary" onClick={onOpenScopePicker}>
            <span>Change Scope</span>
          </Button>
        </div>
      </div>

      {/* Live Scan Bar */}
      {(isScanning || isPaused) && (
        <div className="analog-card paper-grain p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full border border-[var(--ink)] ${
                  isPaused ? 'bg-[var(--coral)]' : 'bg-[#2E6B3E] animate-pulse'
                }`}
              />
              <strong className="text-xs font-semibold text-[var(--ink)]">
                {isPaused ? 'Scan is paused' : 'Scanning active directory...'}
              </strong>
            </div>
            <div className="flex items-center gap-2">
              {isPaused ? (
                <Button variant="primary" size="small" onClick={resumeScan}>
                  <Play className="w-3 h-3" /> Resume
                </Button>
              ) : (
                <Button variant="secondary" size="small" onClick={pauseScan}>
                  <Pause className="w-3 h-3" /> Pause
                </Button>
              )}
              <Button variant="secondary" size="small" onClick={cancelScan}>
                <XCircle className="w-3 h-3 text-[var(--red)]" /> Stop
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-[var(--ink-soft)] pt-1">
            <div>Files: <strong className="text-[var(--ink)]">{scanStatus?.files_scanned}</strong></div>
            <div>Folders: <strong className="text-[var(--ink)]">{scanStatus?.folders_scanned}</strong></div>
            <div>Skipped: <strong className="text-[var(--ink)]">{scanStatus?.skipped_count}</strong></div>
            <div>Elapsed: <strong className="text-[var(--ink)]">{scanStatus?.elapsed_seconds}s</strong></div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="analog-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search input */}
          <div className="relative flex-1 min-w-[170px] sm:min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 text-[var(--ink)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Filter by filename..."
              className="w-full h-[44px] bg-[var(--paper)] border-[1.5px] border-[var(--ink)] rounded-[4px] pl-9 pr-3 text-xs text-[var(--ink)] placeholder-[var(--ink-soft)] focus:outline-none"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-[44px] bg-[var(--paper)] border-[1.5px] border-[var(--ink)] rounded-[4px] px-3 text-[var(--ink)] text-xs focus:outline-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="Documents">Documents</option>
              <option value="Images">Images</option>
              <option value="Videos">Videos</option>
              <option value="Audio">Audio</option>
              <option value="Archives">Archives</option>
              <option value="Executables">Executables</option>
              <option value="Code">Code</option>
              <option value="Installers">Installers</option>
              <option value="Temporary">Temporary</option>
              <option value="Logs">Logs</option>
            </select>

            <select
              value={riskFilter}
              onChange={(e) => {
                setRiskFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-[44px] bg-[var(--paper)] border-[1.5px] border-[var(--ink)] rounded-[4px] px-3 text-[var(--ink)] text-xs focus:outline-none cursor-pointer"
            >
              <option value="all">All Risk Levels</option>
              <option value="LOW">LOW Risk</option>
              <option value="MEDIUM">MEDIUM Risk</option>
              <option value="HIGH">HIGH Risk</option>
            </select>

            <select
              value={importanceFilter}
              onChange={(e) => {
                setImportanceFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-[44px] bg-[var(--paper)] border-[1.5px] border-[var(--ink)] rounded-[4px] px-3 text-[var(--ink)] text-xs focus:outline-none cursor-pointer"
            >
              <option value="all">All Importance</option>
              <option value="HIGH">HIGH (70–100)</option>
              <option value="MEDIUM">MEDIUM (40–69)</option>
              <option value="LOW">LOW (0–39)</option>
            </select>

            <button
              onClick={() => setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              className="w-[44px] h-[44px] bg-[var(--paper)] border-[1.5px] border-[var(--ink)] rounded-[4px] flex items-center justify-center text-[var(--ink)] hover:bg-[var(--paper-2)] cursor-pointer"
              title={`Sort ${sortDir === 'desc' ? 'Descending' : 'Ascending'}`}
              aria-label="Toggle sort order"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Files Table / List */}
      <div className="analog-card paper-grain overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[var(--paper-2)] border-b-[1.5px] border-[var(--ink)] text-[var(--ink)] font-semibold">
                <th className="py-3 px-4 font-sans">File</th>
                <th className="py-3 px-4 font-sans">Category</th>
                <th className="py-3 px-4 font-sans">Size</th>
                <th className="py-3 px-4 font-sans">Importance</th>
                <th className="py-3 px-4 font-sans">Risk</th>
                <th className="py-3 px-4 font-sans text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ink)]/10">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--ink-soft)] font-medium">
                    Loading records...
                  </td>
                </tr>
              ) : files.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center space-y-3">
                    <FramedIcon icon={StorageAnalyzerIcon} size="md" className="mx-auto mb-2" />
                    <div className="font-serif text-base font-semibold text-[var(--ink)]">
                      No files found matching criteria
                    </div>
                    <p className="text-xs text-[var(--ink-soft)] max-w-sm mx-auto">
                      Adjust your category or risk filter, or select another scope to inspect files.
                    </p>
                  </td>
                </tr>
              ) : (
                files.map((file) => {
                  const IconComp = getCategoryIcon(file.category);
                  return (
                    <tr
                      key={file.id}
                      className="hover:bg-[var(--paper-2)] transition-colors cursor-pointer select-none"
                      onClick={() => onSelectFile(file.id)}
                    >
                      <td className="py-3 px-4 max-w-md">
                        <div className="flex items-center gap-3">
                          <FramedIcon icon={IconComp} size="sm" />
                          <div className="min-w-0">
                            <span className="font-mono font-medium text-[var(--ink)] block truncate">
                              {file.filename}
                            </span>
                            <span className="font-mono text-[10px] text-[var(--ink-soft)] block truncate max-w-sm">
                              {formatDisplayPath(file.path)}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-[var(--ink)]">
                        {file.category}
                      </td>

                      <td className="py-3 px-4 font-mono font-medium text-[var(--ink)]">
                        {file.size_formatted}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 font-mono">
                          <span className="font-semibold text-sm text-[var(--ink)]">
                            {file.importance_score}
                          </span>
                          <Chip
                            label={file.importance_label}
                            variant={
                              file.importance_score >= 70
                                ? 'completed'
                                : file.importance_score >= 40
                                ? 'review'
                                : 'neutral'
                            }
                          />
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <Chip
                          label={file.risk}
                          variant={
                            file.risk === 'HIGH'
                              ? 'review'
                              : file.risk === 'MEDIUM'
                              ? 'in-progress'
                              : 'completed'
                          }
                        />
                      </td>

                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelectFile(file.id)}
                            className="w-[44px] h-[44px] sm:w-8 sm:h-8 rounded-[4px] border-[1.5px] border-[var(--ink)] bg-[var(--paper)] hover:bg-[var(--paper-2)] flex items-center justify-center cursor-pointer"
                            title="Inspect file"
                            aria-label={`Inspect ${file.filename}`}
                          >
                            <Eye className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-[var(--ink)]" />
                          </button>
                          <button
                            onClick={() => onTriggerDeleteAnalysis(file)}
                            className="w-[44px] h-[44px] sm:w-8 sm:h-8 rounded-[4px] border-[1.5px] border-[var(--ink)] bg-[var(--paper)] hover:bg-[#F2D7CE] flex items-center justify-center cursor-pointer"
                            title="Safe clean analysis"
                            aria-label={`Safe clean ${file.filename}`}
                          >
                            <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-[var(--red)]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 bg-[var(--paper-2)] border-t-[1.5px] border-[var(--ink)] flex items-center justify-between text-xs text-[var(--ink)]">
          <div>
            Showing {files.length} of {totalFiles} files
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="w-[44px] h-[44px] sm:w-8 sm:h-8 border-[1.5px] border-[var(--ink)] rounded-[4px] bg-[var(--paper)] flex items-center justify-center disabled:opacity-40 cursor-pointer"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4 text-[var(--ink)]" />
            </button>
            <span className="font-mono text-xs">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="w-[44px] h-[44px] sm:w-8 sm:h-8 border-[1.5px] border-[var(--ink)] rounded-[4px] bg-[var(--paper)] flex items-center justify-center disabled:opacity-40 cursor-pointer"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4 text-[var(--ink)]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
