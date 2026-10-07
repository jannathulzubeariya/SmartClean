import React, { useEffect, useState } from 'react';
import { X, ShieldAlert, FolderTree, Copy, Trash2, Archive, ArrowRight } from 'lucide-react';
import { api } from '../api/client';
import { useScan } from '../context/ScanContext';
import { ScannedFile } from '../types';
import { formatDisplayPath } from '../services/storageCapability';
import { Button } from './Buttons';
import { FramedIcon } from './FramedIcon';
import { Chip } from './Chips';

interface FileDetailsDrawerProps {
  fileId: string | null;
  onClose: () => void;
  onTriggerMove: (item: any) => void;
  onTriggerDeleteAnalysis: (file: ScannedFile) => void;
}

export const FileDetailsDrawer: React.FC<FileDetailsDrawerProps> = ({
  fileId,
  onClose,
  onTriggerMove,
  onTriggerDeleteAnalysis
}) => {
  const { showToast } = useScan();
  const [fileData, setFileData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!fileId) {
      setFileData(null);
      return;
    }

    const loadDetails = async () => {
      setLoading(true);
      const res = await api.getFileDetails(fileId);
      if (res.success && res.data) {
        setFileData(res.data);
      } else {
        showToast('Unable to load file details', 'error');
        onClose();
      }
      setLoading(false);
    };

    loadDetails();
  }, [fileId, showToast, onClose]);

  if (!fileId) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[460px] bg-[var(--paper)] border-l-[1.5px] border-[var(--ink)] shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-150">
      {/* Drawer Header */}
      <div className="px-6 py-4 bg-[var(--paper-2)] border-b-[1.5px] border-[var(--ink)] flex items-center justify-between">
        <div>
          <span className="font-hand text-[var(--red)] text-base block leading-none">
            file inspection
          </span>
          <h2 className="font-serif font-bold text-xl text-[var(--ink)] mt-1">
            File Details & Signals
          </h2>
        </div>
        <button
          onClick={onClose}
          className="w-[44px] h-[44px] rounded-[4px] border-[1.5px] border-[var(--ink)] bg-[var(--paper)] flex items-center justify-center cursor-pointer hover:bg-[var(--paper-2)]"
          aria-label="Close drawer"
        >
          <X className="w-4 h-4 text-[var(--ink)]" />
        </button>
      </div>

      {/* Drawer Body */}
      <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
        {loading || !fileData ? (
          <div className="py-12 text-center text-[var(--ink-soft)] font-medium">
            Loading file properties...
          </div>
        ) : (
          <>
            {/* Primary Details Box */}
            <div className="bg-[var(--paper-2)] p-4 border-[1.5px] border-[var(--ink)] rounded-[4px] space-y-2">
              <div className="font-mono font-bold text-sm text-[var(--ink)] break-all">
                {fileData.filename}
              </div>
              <div className="font-mono text-[11px] text-[var(--ink-soft)] break-all">
                {formatDisplayPath(fileData.path)}
              </div>
              <div className="pt-2 border-t border-[var(--ink)]/15 grid grid-cols-2 gap-2 text-[var(--ink-soft)]">
                <div>Size: <strong className="text-[var(--ink)]">{fileData.size_formatted}</strong></div>
                <div>Category: <strong className="text-[var(--ink)]">{fileData.category}</strong></div>
                <div>Modified: <span className="text-[var(--ink)] font-mono">{fileData.mtime_formatted}</span></div>
                <div>Format: <span className="text-[var(--ink)] font-mono">{fileData.ext || 'none'}</span></div>
              </div>
            </div>

            {/* Importance Analysis Rating */}
            <div className="analog-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-[var(--ink)]">Importance Rating</span>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold text-base text-[var(--ink)]">{fileData.importance_score}</span>
                  <span className="text-[var(--ink-soft)]">/ 100</span>
                  <Chip
                    label={fileData.importance_label}
                    variant={fileData.importance_score >= 70 ? 'completed' : fileData.importance_score >= 40 ? 'review' : 'neutral'}
                  />
                </div>
              </div>

              <div className="text-[var(--ink-soft)] leading-relaxed">
                {fileData.importance_guidance} — {fileData.importance_recommendation}
              </div>

              {fileData.importance_reasons && fileData.importance_reasons.length > 0 && (
                <div className="pt-2 border-t border-[var(--ink)]/15">
                  <div className="text-[11px] font-semibold text-[var(--ink)] mb-1">Evaluated Signals:</div>
                  <ul className="space-y-1">
                    {fileData.importance_reasons.map((r: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-1.5 text-[var(--ink)]">
                        <span className="text-[var(--coral)]">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Organization Recommendation if misplaced */}
            {fileData.organization_recommendation && (
              <div className="p-4 bg-[#B9D1C9] border-[1.5px] border-[var(--ink)] rounded-[4px] space-y-3">
                <div className="flex items-center gap-2 font-semibold text-[var(--ink)] text-sm">
                  <FolderTree className="w-4 h-4 text-[var(--ink)]" />
                  <span>Misplaced File Recommendation</span>
                </div>
                <p className="text-[var(--ink)] text-xs leading-relaxed">
                  {fileData.organization_recommendation.reason}
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="font-mono text-xs text-[var(--ink)] font-bold">
                    → {fileData.organization_recommendation.suggested_folder}
                  </span>
                  <Button
                    variant="primary"
                    size="small"
                    onClick={() => onTriggerMove(fileData.organization_recommendation)}
                  >
                    Move File
                  </Button>
                </div>
              </div>
            )}

            {/* Duplicate Notice */}
            {fileData.duplicate_group && (
              <div className="p-4 bg-[#F2D7CE] border-[1.5px] border-[var(--ink)] rounded-[4px] space-y-2">
                <div className="flex items-center gap-2 font-semibold text-[var(--ink)] text-sm">
                  <Copy className="w-4 h-4 text-[var(--ink)]" />
                  <span>Part of Duplicate Group</span>
                </div>
                <p className="text-[var(--ink)] text-xs">
                  {fileData.duplicate_group.copies_count} identical copies detected.
                  {fileData.duplicate_group.suggested_keeper_id === fileData.id
                    ? ' This copy is the suggested keeper.'
                    : ' This copy is redundant and can be quarantined safely.'}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Drawer Action Bar */}
      {fileData && (
        <div className="p-4 bg-[var(--paper-2)] border-t-[1.5px] border-[var(--ink)] flex items-center justify-between gap-3">
          <Button
            variant="secondary"
            size="small"
            onClick={() => onTriggerDeleteAnalysis(fileData)}
            className="flex-1 hover:bg-[#F2D7CE]"
          >
            <Archive className="w-3.5 h-3.5 text-[var(--red)]" />
            <span>Clean / Quarantine</span>
          </Button>

          <Button
            variant="primary"
            size="small"
            onClick={onClose}
            className="flex-1"
          >
            Done
          </Button>
        </div>
      )}
    </div>
  );
};
