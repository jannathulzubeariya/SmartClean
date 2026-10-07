import React, { useState, useEffect } from 'react';
import { Copy, Archive, ShieldCheck, RotateCw } from 'lucide-react';
import { api } from '../api/client';
import { useScan } from '../context/ScanContext';
import { DuplicateGroup } from '../types';
import { formatDisplayPath } from '../services/storageCapability';
import { Button } from '../components/Buttons';
import { FramedIcon } from '../components/FramedIcon';
import { Chip } from '../components/Chips';
import { DuplicatesIcon } from '../components/HandDrawnDecorations';

export const Duplicates: React.FC = () => {
  const { showToast, refreshSummary, scanStatus } = useScan();
  const [duplicateData, setDuplicateData] = useState<{
    groups: DuplicateGroup[];
    total_reclaimable_formatted: string;
    total_duplicate_files: number;
  }>({ groups: [], total_reclaimable_formatted: '0 B', total_duplicate_files: 0 });

  const [loading, setLoading] = useState(false);
  const [keeperOverrides, setKeeperOverrides] = useState<Record<string, string>>({});
  const [processingGroup, setProcessingGroup] = useState<string | null>(null);

  const fetchDuplicates = async () => {
    setLoading(true);
    const res = await api.getDuplicates();
    if (res.success && res.data) {
      setDuplicateData(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDuplicates();
  }, []);

  useEffect(() => {
    if (scanStatus?.status === 'completed') {
      fetchDuplicates();
    }
  }, [scanStatus?.status]);

  const handleSetKeeper = (groupId: string, copyId: string) => {
    setKeeperOverrides((prev) => ({
      ...prev,
      [groupId]: copyId,
    }));
  };

  const handleQuarantineRedundant = async (group: DuplicateGroup) => {
    const keeperId = keeperOverrides[group.group_id] || group.suggested_keeper_id;
    const redundantCopies = group.copies.filter((c) => c.id !== keeperId);

    if (redundantCopies.length === 0) return;

    setProcessingGroup(group.group_id);
    let successCount = 0;

    for (const copy of redundantCopies) {
      const res = await api.quarantineFile(copy.id, `Quarantined redundant duplicate of ${group.group_id}`);
      if (res.success) {
        successCount++;
      }
    }

    setProcessingGroup(null);
    if (successCount === redundantCopies.length) {
      showToast(`Quarantined ${successCount} duplicate copy${successCount > 1 ? 's' : ''}`, 'success');
    } else if (successCount > 0) {
      showToast(`Quarantined ${successCount} of ${redundantCopies.length} copies. Some could not be quarantined.`, 'warning');
    } else {
      showToast('Could not quarantine duplicate files', 'error');
    }
    fetchDuplicates();
    refreshSummary();
  };

  return (
    <div className="max-w-[1080px] mx-auto px-6 md:px-10 py-12 space-y-8 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b-[1.5px] border-[var(--ink)]">
        <div className="flex items-center gap-3">
          <FramedIcon icon={DuplicatesIcon} size="md" />
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[var(--ink)]">
              Duplicate Detection
            </h1>
            <p className="text-sm text-[var(--ink-soft)] mt-0.5">
              Byte-for-byte identical duplicates via 3-stage size & SHA-256 analysis.
            </p>
          </div>
        </div>

        <button
          onClick={fetchDuplicates}
          className="w-[44px] h-[44px] rounded-[4px] border-[1.5px] border-[var(--ink)] bg-[var(--paper)] hover:bg-[var(--paper-2)] flex items-center justify-center transition-colors cursor-pointer self-start md:self-auto"
          title="Refresh duplicates"
          aria-label="Refresh duplicates"
        >
          <RotateCw className="w-4 h-4 text-[var(--ink)]" />
        </button>
      </div>

      {/* Summary Card */}
      <div className="analog-card paper-grain p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <FramedIcon icon={DuplicatesIcon} size="lg" />
          <div>
            <div className="font-mono text-2xl font-bold text-[var(--ink)]">
              {duplicateData.total_reclaimable_formatted} Reclaimable
            </div>
            <p className="text-xs text-[var(--ink-soft)] mt-1">
              {duplicateData.total_duplicate_files} redundant files across {duplicateData.groups.length} duplicate groups.
            </p>
          </div>
        </div>

        <div className="p-3 bg-[var(--paper-2)] border-[1.5px] border-[var(--ink)] rounded-[4px] text-xs text-[var(--ink)] max-w-sm">
          <strong>Safety Rule:</strong> Never deleted automatically. You select the original copy to preserve. Non-keepers move to Quarantine first.
        </div>
      </div>

      {/* Duplicates Groups List */}
      {loading ? (
        <div className="py-16 text-center text-xs text-[var(--ink-soft)] font-medium">
          Checking duplicate groups...
        </div>
      ) : duplicateData.groups.length === 0 ? (
        <div className="analog-card paper-grain py-16 text-center space-y-3">
          <FramedIcon icon={DuplicatesIcon} size="lg" className="mx-auto" />
          <h3 className="font-serif text-2xl font-semibold text-[var(--ink)]">
            No duplicates found
          </h3>
          <p className="text-xs text-[var(--ink-soft)] max-w-sm mx-auto">
            Great — SmartClean couldn't find matching files in this scan.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {duplicateData.groups.map((group) => {
            const currentKeeperId = keeperOverrides[group.group_id] || group.suggested_keeper_id;
            const isProcessing = processingGroup === group.group_id;

            return (
              <div
                key={group.group_id}
                className="analog-card paper-grain p-6 space-y-4 text-xs"
              >
                {/* Group header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-[1.5px] border-[var(--ink)]/15">
                  <div>
                    <div className="font-mono font-bold text-sm text-[var(--ink)] flex items-center gap-2">
                      <span>{group.copies[0]?.filename}</span>
                      <span className="text-xs font-normal text-[var(--ink-soft)]">
                        ({group.copies_count} copies · {group.file_size_formatted} each)
                      </span>
                    </div>
                    <div className="font-mono text-[11px] text-[var(--ink-soft)] mt-0.5 truncate">
                      SHA-256: {group.hash}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-medium text-[var(--ink-soft)]">Reclaimable</div>
                      <div className="font-mono font-bold text-sm text-[var(--ink)]">
                        {group.reclaimable_formatted}
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      size="small"
                      onClick={() => handleQuarantineRedundant(group)}
                      disabled={isProcessing}
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>{isProcessing ? 'Quarantining...' : 'Quarantine Non-Keepers'}</span>
                    </Button>
                  </div>
                </div>

                {/* Copies list */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-[var(--ink)]">
                    Select which copy to keep as original:
                  </div>

                  {group.copies.map((copy) => {
                    const isKeeper = copy.id === currentKeeperId;
                    const isSuggestedKeeper = copy.id === group.suggested_keeper_id;

                    return (
                      <div
                        key={copy.id}
                        onClick={() => handleSetKeeper(group.group_id, copy.id)}
                        className={`p-3 rounded-[4px] border-[1.5px] border-[var(--ink)] cursor-pointer transition-all flex items-center justify-between gap-4 ${
                          isKeeper ? 'bg-[#B9D1C9] shadow-xs' : 'bg-[var(--paper)] hover:bg-[var(--paper-2)]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <label className="min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 cursor-pointer">
                            <input
                              type="radio"
                              name={`keeper-${group.group_id}`}
                              checked={isKeeper}
                              onChange={() => handleSetKeeper(group.group_id, copy.id)}
                              aria-label={`Select ${copy.filename} at ${formatDisplayPath(copy.path)} as original keeper`}
                              className="w-4 h-4 text-[var(--ink)] focus:ring-0 cursor-pointer"
                            />
                          </label>
                          <div className="min-w-0">
                            <div className="font-mono text-xs font-medium text-[var(--ink)] truncate" title={copy.path}>
                              {formatDisplayPath(copy.path)}
                            </div>
                            <div className="text-[11px] text-[var(--ink-soft)] mt-0.5">
                              Modified: {copy.mtime_formatted}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          {isSuggestedKeeper && (
                            <Chip label="Suggested Keeper" variant="review" />
                          )}
                          {isKeeper ? (
                            <Chip label="Keeping" variant="completed" />
                          ) : (
                            <span className="text-xs text-[var(--ink-soft)] font-mono">
                              Will quarantine
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
