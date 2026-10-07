import React, { useState } from 'react';
import { AlertTriangle, ShieldCheck, Trash2, Archive, X, Info } from 'lucide-react';
import { ScannedFile } from '../types';
import { formatDisplayPath } from '../services/storageCapability';
import { api } from '../api/client';
import { useScan } from '../context/ScanContext';
import { Button } from './Buttons';
import { Chip } from './Chips';

interface DeleteAnalysisModalProps {
  file: ScannedFile | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const DeleteAnalysisModal: React.FC<DeleteAnalysisModalProps> = ({
  file,
  onClose,
  onSuccess
}) => {
  const { showToast, refreshSummary } = useScan();
  const [isQuarantining, setIsQuarantining] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmPermanent, setConfirmPermanent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!file) return null;

  const isHighImportance =
    file.importance_score >= 70 || file.risk === 'HIGH' || file.can_permanently_delete === false;

  const handleQuarantine = async () => {
    setIsQuarantining(true);
    setErrorMessage(null);
    const res = await api.quarantineFile(file.id, `User cleaned via Delete Analysis: ${file.filename}`);
    setIsQuarantining(false);

    if (res.success) {
      showToast(`'${file.filename}' moved to safe quarantine`, 'success');
      refreshSummary();
      onSuccess();
      onClose();
    } else {
      setErrorMessage(res.error?.message || 'Failed to move to quarantine');
    }
  };

  const handlePermanentDelete = async () => {
    if (isHighImportance) {
      setErrorMessage('Permanent deletion is disabled for high-importance files.');
      return;
    }
    if (!confirmPermanent) {
      setErrorMessage('Please check the confirmation box to authorize permanent deletion.');
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);
    const res = await api.deleteFile(file.id, true);
    setIsDeleting(false);

    if (res.success) {
      showToast(`'${file.filename}' permanently deleted`, 'info');
      refreshSummary();
      onSuccess();
      onClose();
    } else {
      setErrorMessage(res.error?.message || 'Permanent deletion failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[var(--ink)]/40 flex items-center justify-center p-4">
      <div className="analog-card paper-grain max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b-[1.5px] border-[var(--ink)] bg-[var(--paper-2)] flex items-center justify-between">
          <div>
            <span className="font-hand text-[var(--red)] text-base block leading-none">
              safety inspection
            </span>
            <h2 className="font-serif font-bold text-xl text-[var(--ink)] mt-1">
              Before you clean this file...
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

        {/* Content */}
        <div className="p-6 space-y-5 text-xs overflow-y-auto">
          {/* File summary box */}
          <div className="bg-[var(--paper-2)] p-4 border-[1.5px] border-[var(--ink)] rounded-[4px] space-y-2">
            <div className="font-mono font-semibold text-sm text-[var(--ink)] break-all">
              {file.filename}
            </div>
            <div className="font-mono text-[11px] text-[var(--ink-soft)] break-all">
              {formatDisplayPath(file.path)}
            </div>
            <div className="flex items-center gap-3 pt-2 border-t border-[var(--ink)]/15 text-[var(--ink-soft)]">
              <span>Size: <strong className="text-[var(--ink)]">{file.size_formatted}</strong></span>
              <span>·</span>
              <span>Category: <strong className="text-[var(--ink)]">{file.category}</strong></span>
              <span>·</span>
              <Chip
                label={`Risk: ${file.risk}`}
                variant={file.risk === 'HIGH' ? 'review' : file.risk === 'MEDIUM' ? 'in-progress' : 'completed'}
              />
            </div>
          </div>

          {/* Importance Analysis Rating */}
          <div className="p-4 bg-[var(--paper)] border-[1.5px] border-[var(--ink)] rounded-[4px] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-[var(--ink)]">SmartClean Importance Score</span>
              <div className="flex items-center gap-2 font-mono">
                <span className="font-bold text-base text-[var(--ink)]">{file.importance_score}</span>
                <span className="text-[var(--ink-soft)]">/ 100</span>
                <Chip
                  label={file.importance_label}
                  variant={isHighImportance ? 'completed' : file.importance_score >= 40 ? 'review' : 'neutral'}
                />
              </div>
            </div>

            <div className="text-xs text-[var(--ink-soft)]">
              {file.importance_guidance} — {file.importance_recommendation}
            </div>

            {/* Evaluated Signals List */}
            {file.importance_reasons && file.importance_reasons.length > 0 && (
              <div className="pt-2 border-t border-[var(--ink)]/15">
                <div className="text-[11px] font-semibold text-[var(--ink)] mb-1">Evaluated Signals:</div>
                <ul className="space-y-1 text-xs text-[var(--ink)]">
                  {file.importance_reasons.map((r, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-[var(--coral)]">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* High importance safeguard */}
          {isHighImportance && (
            <div className="p-3 bg-[#F2D7CE] border-[1.5px] border-[var(--ink)] rounded-[4px] text-xs text-[var(--ink)] flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-[var(--red)]" />
              <div>
                <strong>High Importance Safeguard:</strong> This file is rated High Importance ({file.importance_score}/100). Permanent deletion is disabled to prevent accidental data loss. You may safely isolate it in Quarantine if desired.
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-2.5 bg-[#F2D7CE] border border-[var(--ink)] text-[var(--red)] text-xs rounded-[4px]">
              {errorMessage}
            </div>
          )}

          <div className="text-xs text-[var(--ink-soft)] flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-[var(--blue)] shrink-0" />
            <span>SmartClean recommends <strong>Move to Quarantine</strong>. Quarantined files can always be restored anytime.</span>
          </div>

          {!isHighImportance && (
            <div className="pt-2 border-t border-[var(--ink)]/15">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--ink)]">
                <input
                  type="checkbox"
                  checked={confirmPermanent}
                  onChange={(e) => setConfirmPermanent(e.target.checked)}
                  className="rounded-[2px] border-[1.5px] border-[var(--ink)] text-[var(--ink)] focus:ring-0 cursor-pointer"
                />
                <span>I understand this cannot be undone and authorize permanent deletion</span>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[var(--paper-2)] border-t-[1.5px] border-[var(--ink)] flex items-center justify-between gap-3">
          <Button variant="secondary" size="small" onClick={onClose}>
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            {!isHighImportance && confirmPermanent && (
              <Button
                variant="secondary"
                size="small"
                onClick={handlePermanentDelete}
                disabled={isDeleting}
                className="hover:bg-[#F2D7CE]"
              >
                <Trash2 className="w-3.5 h-3.5 text-[var(--red)]" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Permanently'}</span>
              </Button>
            )}

            <Button
              variant="primary"
              size="small"
              onClick={handleQuarantine}
              disabled={isQuarantining}
            >
              <Archive className="w-3.5 h-3.5 text-[var(--paper)]" />
              <span>{isQuarantining ? 'Quarantining...' : 'Move to Quarantine (Reversible)'}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
