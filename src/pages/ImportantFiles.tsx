import React, { useState, useEffect } from 'react';
import { ShieldCheck, Eye, Lock, Info, RotateCw } from 'lucide-react';
import { api } from '../api/client';
import { ScannedFile } from '../types';
import { formatDisplayPath } from '../services/storageCapability';
import { Button } from '../components/Buttons';
import { FramedIcon } from '../components/FramedIcon';
import { Chip } from '../components/Chips';
import { SafeguardedIcon } from '../components/HandDrawnDecorations';

import { useScan } from '../context/ScanContext';

interface ImportantFilesProps {
  onSelectFile: (id: string) => void;
}

export const ImportantFiles: React.FC<ImportantFilesProps> = ({ onSelectFile }) => {
  const { scanStatus } = useScan();
  const [files, setFiles] = useState<ScannedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterTier, setFilterTier] = useState<'all' | 'HIGH' | 'MEDIUM'>('all');

  const fetchImportantFiles = async () => {
    setLoading(true);
    const res = await api.getFiles({
      limit: 100,
      sort_by: 'importance',
      sort_dir: 'desc'
    });

    if (res.success && res.data) {
      const allItems: ScannedFile[] = res.data.items || [];
      setFiles(allItems.filter((f) => f.importance_score >= 40));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchImportantFiles();
  }, []);

  useEffect(() => {
    if (scanStatus?.status === 'completed') {
      fetchImportantFiles();
    }
  }, [scanStatus?.status]);

  const displayedFiles = files.filter((f) => {
    if (filterTier === 'HIGH') return f.importance_score >= 70;
    if (filterTier === 'MEDIUM') return f.importance_score >= 40 && f.importance_score < 70;
    return true;
  });

  return (
    <div className="max-w-[1080px] mx-auto px-6 md:px-10 py-12 space-y-8 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b-[1.5px] border-[var(--ink)]">
        <div className="flex items-center gap-3">
          <FramedIcon icon={SafeguardedIcon} size="md" />
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[var(--ink)]">
              Transparent Importance Engine
            </h1>
            <p className="text-sm text-[var(--ink-soft)] mt-0.5">
              Rule-based importance heuristics protect critical files from accidental cleanup. No opaque models.
            </p>
          </div>
        </div>

        <button
          onClick={fetchImportantFiles}
          className="w-[44px] h-[44px] rounded-[4px] border-[1.5px] border-[var(--ink)] bg-[var(--paper)] hover:bg-[var(--paper-2)] flex items-center justify-center transition-colors cursor-pointer self-start md:self-auto"
          title="Refresh important files"
          aria-label="Refresh important files"
        >
          <RotateCw className="w-4 h-4 text-[var(--ink)]" />
        </button>
      </div>

      {/* Transparent Rules Explainer Box */}
      <div className="analog-card paper-grain p-6 space-y-4 text-xs">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-[var(--blue)] shrink-0" />
          <h3 className="font-serif text-lg font-semibold text-[var(--ink)]">
            How SmartClean Determines Importance (0–100 Score)
          </h3>
        </div>
        <p className="text-[var(--ink-soft)] leading-relaxed">
          SmartClean evaluates verifiable filesystem characteristics to calculate an explainable importance score. Permanent deletion is automatically disabled for high-importance files (70+).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className="p-3 bg-[var(--paper-2)] rounded-[4px] border-[1.5px] border-[var(--ink)] space-y-1">
            <div className="font-semibold text-[var(--ink)]">+15 Recency</div>
            <div className="text-[11px] text-[var(--ink-soft)]">Modified in last 30 days.</div>
          </div>
          <div className="p-3 bg-[var(--paper-2)] rounded-[4px] border-[1.5px] border-[var(--ink)] space-y-1">
            <div className="font-semibold text-[var(--ink)]">+15 Safe Location</div>
            <div className="text-[11px] text-[var(--ink-soft)]">In Documents or desktop workspace.</div>
          </div>
          <div className="p-3 bg-[var(--paper-2)] rounded-[4px] border-[1.5px] border-[var(--ink)] space-y-1">
            <div className="font-semibold text-[var(--ink)]">+15 Uniqueness</div>
            <div className="text-[11px] text-[var(--ink-soft)]">Sole copy with no duplicate.</div>
          </div>
          <div className="p-3 bg-[var(--paper-2)] rounded-[4px] border-[1.5px] border-[var(--ink)] space-y-1">
            <div className="font-semibold text-[var(--ink)]">+10 Meaningful Terms</div>
            <div className="text-[11px] text-[var(--ink-soft)]">Named 'report', 'final', etc.</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-3 text-xs">
        <Button
          variant={filterTier === 'all' ? 'primary' : 'secondary'}
          size="small"
          onClick={() => setFilterTier('all')}
        >
          All Safeguarded ({files.length})
        </Button>
        <Button
          variant={filterTier === 'HIGH' ? 'primary' : 'secondary'}
          size="small"
          onClick={() => setFilterTier('HIGH')}
        >
          High Importance (70–100)
        </Button>
        <Button
          variant={filterTier === 'MEDIUM' ? 'primary' : 'secondary'}
          size="small"
          onClick={() => setFilterTier('MEDIUM')}
        >
          Medium Importance (40–69)
        </Button>
      </div>

      {/* Files List */}
      {loading ? (
        <div className="py-16 text-center text-xs text-[var(--ink-soft)] font-medium">
          Loading importance analysis...
        </div>
      ) : displayedFiles.length === 0 ? (
        <div className="analog-card paper-grain py-12 text-center space-y-3">
          <FramedIcon icon={SafeguardedIcon} size="md" className="mx-auto" />
          <div className="font-serif text-base font-semibold text-[var(--ink)]">
            No files match this importance filter
          </div>
          <p className="text-xs text-[var(--ink-soft)] max-w-xs mx-auto">
            Try switching to 'All Files' to inspect the full scope scoring.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedFiles.map((file) => {
            const isHigh = file.importance_score >= 70;

            return (
              <div
                key={file.id}
                className="analog-card paper-grain p-5 text-xs space-y-3"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {isHigh ? (
                      <span title="Permanent deletion disabled">
                        <Lock className="w-4 h-4 text-[var(--red)] shrink-0" />
                      </span>
                    ) : (
                      <ShieldCheck className="w-4 h-4 text-[#2E6B3E] shrink-0" />
                    )}
                    <div>
                      <span className="font-mono font-bold text-sm text-[var(--ink)]">
                        {file.filename}
                      </span>
                      <span className="text-[var(--ink-soft)] text-xs ml-2">
                        ({file.size_formatted} · {file.category})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sm text-[var(--ink)]">
                      {file.importance_score} / 100
                    </span>
                    <Chip
                      label={file.importance_label}
                      variant={isHigh ? 'completed' : 'review'}
                    />
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => onSelectFile(file.id)}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect</span>
                    </Button>
                  </div>
                </div>

                {/* Path */}
                <div className="font-mono text-[11px] text-[var(--ink-soft)] truncate" title={file.path}>
                  {formatDisplayPath(file.path)}
                </div>

                {/* Guidance sentence */}
                <div className="text-xs text-[var(--ink)] font-medium">
                  {file.importance_guidance} — {file.importance_recommendation}
                </div>

                {/* Signals breakdown */}
                {file.importance_reasons && file.importance_reasons.length > 0 && (
                  <div className="pt-2 border-t-[1.5px] border-[var(--ink)]/10">
                    <div className="text-[10px] font-semibold text-[var(--ink-soft)] uppercase tracking-wider mb-1.5">
                      Signal Reasons:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {file.importance_reasons.map((r, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 bg-[var(--paper-2)] border border-[var(--ink)]/20 text-[var(--ink)] rounded-[2px] text-[11px]"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
