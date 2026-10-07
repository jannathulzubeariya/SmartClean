import React, { useState } from 'react';
import { ArrowRight, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { api } from '../api/client';
import { useScan } from '../context/ScanContext';
import { formatDisplayPath } from '../services/storageCapability';
import { Button } from './Buttons';

interface MoveItem {
  file_id: string;
  filename: string;
  current_path: string;
  suggested_folder_path: string;
  suggested_folder: string;
  collision_preview_name?: string;
  has_collision?: boolean;
  reason?: string;
}

interface MovePreviewModalProps {
  items: MoveItem[];
  onClose: () => void;
  onSuccess: () => void;
}

export const MovePreviewModal: React.FC<MovePreviewModalProps> = ({
  items,
  onClose,
  onSuccess
}) => {
  const { showToast, refreshSummary } = useScan();
  const [isMoving, setIsMoving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!items || items.length === 0) return null;

  const handleConfirmMove = async () => {
    setIsMoving(true);
    setErrorMsg(null);

    const movesPayload = items.map((it) => ({
      file_id: it.file_id,
      destination_folder: it.suggested_folder_path
    }));

    const res = await api.moveFiles(movesPayload);
    setIsMoving(false);

    if (res.success && res.data) {
      const results: Array<{ file_id: string; success: boolean; error?: string }> = res.data.results || [];
      const successCount = results.filter((r) => r.success).length;

      if (successCount === items.length) {
        showToast(`Successfully moved ${items.length} file${items.length > 1 ? 's' : ''}`, 'success');
        refreshSummary();
        onSuccess();
        onClose();
      } else if (successCount > 0) {
        showToast(`Moved ${successCount} of ${items.length} files. Some files could not be moved.`, 'warning');
        refreshSummary();
        onSuccess();
        onClose();
      } else {
        const firstErr = results.find((r) => !r.success)?.error;
        setErrorMsg(firstErr || res.message || 'Move operation failed');
      }
    } else {
      setErrorMsg(res.error?.message || 'Move operation failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[var(--ink)]/40 flex items-center justify-center p-4">
      <div className="analog-card paper-grain max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b-[1.5px] border-[var(--ink)] bg-[var(--paper-2)] flex items-center justify-between">
          <div>
            <span className="font-hand text-[var(--red)] text-base block leading-none">
              collision preview
            </span>
            <h2 className="font-serif font-bold text-xl text-[var(--ink)] mt-1">
              Preview Move Operations ({items.length})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-[44px] h-[44px] rounded-[4px] border-[1.5px] border-[var(--ink)] bg-[var(--paper)] flex items-center justify-center cursor-pointer hover:bg-[var(--paper-2)]"
            aria-label="Close modal"
          >
            <X className="w-4 h-4 text-[var(--ink)]" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="p-4 bg-[var(--paper-2)] border-[1.5px] border-[var(--ink)] rounded-[4px] space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-sm text-[var(--ink)]">{item.filename}</span>
                <span className="text-xs font-sans font-medium px-2 py-0.5 bg-[#B9D1C9] border border-[var(--ink)] rounded-full text-[var(--ink)]">
                  → {item.suggested_folder}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[var(--ink-soft)] font-mono text-xs">
                <span className="truncate max-w-[45%]" title={item.current_path}>{formatDisplayPath(item.current_path)}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[var(--ink)] shrink-0" />
                <span className="truncate max-w-[45%] text-[var(--ink)] font-semibold" title={item.suggested_folder_path}>
                  {formatDisplayPath(item.suggested_folder_path)}
                </span>
              </div>

              {item.has_collision && (
                <div className="flex items-center gap-2 text-[var(--ink)] bg-[#F2D7CE] p-2 rounded-[4px] border border-[var(--ink)] text-xs">
                  <AlertCircle className="w-4 h-4 text-[var(--coral)] shrink-0" />
                  <span>
                    Existing file detected in destination. Safe non-destructive rename:{' '}
                    <strong>{item.collision_preview_name}</strong>
                  </span>
                </div>
              )}

              {item.reason && (
                <div className="text-xs text-[var(--ink-soft)] italic">
                  "{item.reason}"
                </div>
              )}
            </div>
          ))}

          {errorMsg && (
            <div className="p-3 bg-[#F2D7CE] border border-[var(--ink)] text-[var(--red)] text-xs rounded-[4px]">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[var(--paper-2)] border-t-[1.5px] border-[var(--ink)] flex items-center justify-between">
          <div className="text-xs text-[var(--ink-soft)]">
            Never overwrites. Actions can be undone in Activity.
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="small" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="small"
              onClick={handleConfirmMove}
              disabled={isMoving}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isMoving ? 'Moving files...' : 'Confirm and Move'}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
