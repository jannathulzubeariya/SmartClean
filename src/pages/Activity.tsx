import React, { useState, useEffect } from 'react';
import {
  History as HistoryIcon,
  Archive,
  RotateCcw,
  CheckCircle2,
  Trash2,
  RotateCw,
} from 'lucide-react';
import { api } from '../api/client';
import { useScan } from '../context/ScanContext';
import { HistoryRecord, QuarantinedItem } from '../types';
import { formatDisplayPath } from '../services/storageCapability';
import { Button } from '../components/Buttons';
import { FramedIcon } from '../components/FramedIcon';
import { Chip } from '../components/Chips';
import { ActivityHistoryIcon, SafeguardedIcon } from '../components/HandDrawnDecorations';

export const Activity: React.FC = () => {
  const { showToast, refreshSummary } = useScan();
  const [activeSubTab, setActiveSubTab] = useState<'history' | 'quarantine'>('history');

  const [historyItems, setHistoryItems] = useState<HistoryRecord[]>([]);
  const [quarantineItems, setQuarantineItems] = useState<QuarantinedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<{ id: string; filename: string } | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    const res = await api.getHistory(150);
    if (res.success && res.data) {
      setHistoryItems(res.data.history || []);
    }
    setLoading(false);
  };

  const fetchQuarantine = async () => {
    setLoading(true);
    const res = await api.getQuarantineList();
    if (res.success && res.data) {
      setQuarantineItems(res.data.items || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (activeSubTab === 'history') {
      fetchHistory();
    } else {
      fetchQuarantine();
    }
  }, [activeSubTab]);

  const handleUndo = async (actionId: string) => {
    setUndoingId(actionId);
    const res = await api.undoAction(actionId);
    setUndoingId(null);

    if (res.success) {
      showToast(res.message || 'Action reverted successfully', 'success');
      fetchHistory();
      refreshSummary();
    } else {
      showToast(res.error?.message || 'Failed to undo action', 'error');
    }
  };

  const handleRestoreQuarantine = async (qId: string) => {
    const res = await api.restoreQuarantined(qId);
    if (res.success) {
      showToast(`File restored to '${res.data?.restored_path}'`, 'success');
      fetchQuarantine();
      refreshSummary();
    } else {
      showToast(res.error?.message || 'Restore failed', 'error');
    }
  };

  const executeDeleteQuarantinedPermanent = async () => {
    if (!confirmDeleteTarget) return;
    const { id, filename } = confirmDeleteTarget;
    setConfirmDeleteTarget(null);

    const res = await api.deleteQuarantinedItem(id);
    if (res.success) {
      showToast(`'${filename}' permanently deleted from quarantine`, 'info');
      fetchQuarantine();
      refreshSummary();
    } else {
      showToast(res.error?.message || 'Delete failed', 'error');
    }
  };

  return (
    <div className="max-w-[1080px] mx-auto px-6 md:px-10 py-12 space-y-8 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b-[1.5px] border-[var(--ink)]">
        <div className="flex items-center gap-3">
          <FramedIcon icon={ActivityHistoryIcon} size="md" />
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[var(--ink)]">
              Activity & History
            </h1>
            <p className="text-sm text-[var(--ink-soft)] mt-0.5">
              Audit trail of file moves, quarantines, restores, and undo operations.
            </p>
          </div>
        </div>

        <button
          onClick={() => (activeSubTab === 'history' ? fetchHistory() : fetchQuarantine())}
          className="w-[44px] h-[44px] rounded-[4px] border-[1.5px] border-[var(--ink)] bg-[var(--paper)] hover:bg-[var(--paper-2)] flex items-center justify-center transition-colors cursor-pointer"
          title="Refresh list"
          aria-label="Refresh list"
        >
          <RotateCw className="w-4 h-4 text-[var(--ink)]" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3">
        <Button
          variant={activeSubTab === 'history' ? 'primary' : 'secondary'}
          size="small"
          onClick={() => setActiveSubTab('history')}
        >
          <HistoryIcon className="w-3.5 h-3.5" />
          <span>Action Log ({historyItems.length})</span>
        </Button>

        <Button
          variant={activeSubTab === 'quarantine' ? 'primary' : 'secondary'}
          size="small"
          onClick={() => setActiveSubTab('quarantine')}
        >
          <Archive className="w-3.5 h-3.5" />
          <span>Quarantine Vault ({quarantineItems.length})</span>
        </Button>
      </div>

      {/* History Log Tab */}
      {activeSubTab === 'history' && (
        <div className="space-y-4">
          {loading ? (
            <div className="py-16 text-center text-xs text-[var(--ink-soft)] font-medium">
              Loading history log...
            </div>
          ) : historyItems.length === 0 ? (
            <div className="analog-card paper-grain py-12 text-center space-y-3">
              <FramedIcon icon={ActivityHistoryIcon} size="md" className="mx-auto" />
              <div className="font-serif text-base font-semibold text-[var(--ink)]">
                No actions recorded yet
              </div>
              <p className="text-xs text-[var(--ink-soft)] max-w-xs mx-auto">
                File moves, quarantine actions, and restores will appear here with one-click undo.
              </p>
            </div>
          ) : (
            <div className="analog-card paper-grain divide-y divide-[var(--ink)]/10 text-xs">
              {historyItems.map((record) => {
                const canUndo = record.undoable && !record.undone;

                return (
                  <div
                    key={record.id}
                    className="p-4 hover:bg-[var(--paper-2)] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Chip
                          label={record.action_type.toUpperCase()}
                          variant={
                            record.action_type === 'quarantine'
                              ? 'review'
                              : record.action_type === 'move'
                              ? 'in-progress'
                              : record.action_type === 'restore'
                              ? 'completed'
                              : 'neutral'
                          }
                        />
                        <span className="font-mono font-medium text-[var(--ink)]">
                          {record.filename}
                        </span>
                        <span className="text-[var(--ink-soft)] font-mono text-[11px]">
                          ({record.file_size_formatted})
                        </span>
                      </div>

                      <div className="font-mono text-[10px] text-[var(--ink-soft)] truncate" title={record.source}>
                        Source: {formatDisplayPath(record.source)}
                      </div>

                      {record.destination && (
                        <div className="font-mono text-[10px] text-[var(--ink)] truncate" title={record.destination}>
                          Destination: {formatDisplayPath(record.destination)}
                        </div>
                      )}

                      {record.reason && (
                        <div className="text-xs text-[var(--ink-soft)] italic">
                          "{record.reason}"
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right text-[11px] text-[var(--ink-soft)] font-mono">
                        {record.timestamp}
                      </div>

                      {record.undone && (
                        <span className="text-xs text-[var(--ink-soft)] italic font-mono">
                          (Reverted)
                        </span>
                      )}

                      {canUndo && (
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => handleUndo(record.id)}
                          disabled={undoingId === record.id}
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-[var(--ink)]" />
                          <span>{undoingId === record.id ? 'Undoing...' : 'Undo'}</span>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Quarantine Vault Tab */}
      {activeSubTab === 'quarantine' && (
        <div className="space-y-4">
          <div className="p-4 bg-[var(--paper-2)] border-[1.5px] border-[var(--ink)] rounded-[4px] text-xs text-[var(--ink)]">
            <strong>Safe Quarantine Vault:</strong> Files here are isolated in the local SmartClean quarantine folder. Restoring will safely return them to their original location without overwriting.
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-[var(--ink-soft)] font-medium">
              Reading quarantine manifest...
            </div>
          ) : quarantineItems.length === 0 ? (
            <div className="analog-card paper-grain py-12 text-center space-y-3">
              <FramedIcon icon={SafeguardedIcon} size="md" className="mx-auto" />
              <div className="font-serif text-base font-semibold text-[var(--ink)]">
                Quarantine vault is empty
              </div>
              <p className="text-xs text-[var(--ink-soft)] max-w-xs mx-auto">
                No files are currently held in the isolated quarantine area.
              </p>
            </div>
          ) : (
            <div className="analog-card paper-grain divide-y divide-[var(--ink)]/10 text-xs">
              {quarantineItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 hover:bg-[var(--paper-2)] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-[var(--ink)]">
                        {item.filename}
                      </span>
                      <span className="text-[var(--ink-soft)] font-mono text-[11px]">
                        ({item.size_formatted} · {item.category})
                      </span>
                    </div>

                    <div className="font-mono text-[10px] text-[var(--ink-soft)] truncate" title={item.original_path}>
                      Original Path: {formatDisplayPath(item.original_path)}
                    </div>

                    <div className="text-xs text-[var(--ink-soft)] italic">
                      Reason: "{item.reason}"
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right text-[11px] text-[var(--ink-soft)] font-mono">
                      {item.timestamp}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="primary"
                        size="small"
                        onClick={() => handleRestoreQuarantine(item.id)}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Restore</span>
                      </Button>
                      <button
                        onClick={() => setConfirmDeleteTarget({ id: item.id, filename: item.filename })}
                        className="w-[44px] h-[44px] sm:w-8 sm:h-8 rounded-[4px] border-[1.5px] border-[var(--ink)] bg-[var(--paper)] hover:bg-[#F2D7CE] flex items-center justify-center cursor-pointer"
                        title="Permanently remove"
                        aria-label={`Permanently remove ${item.filename}`}
                      >
                        <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-[var(--red)]" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* In-app confirmation modal for permanent deletion */}
      {confirmDeleteTarget && (
        <div className="fixed inset-0 z-50 bg-[var(--ink)]/40 flex items-center justify-center p-4">
          <div className="analog-card paper-grain max-w-md w-full p-6 space-y-4">
            <div className="space-y-1">
              <span className="font-hand text-[var(--red)] text-base block leading-none">
                permanent action
              </span>
              <h3 className="font-serif font-bold text-xl text-[var(--ink)]">
                Delete from Quarantine?
              </h3>
            </div>
            <p className="text-xs text-[var(--ink-soft)] leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <strong className="font-mono text-[var(--ink)]">
                {confirmDeleteTarget.filename}
              </strong>{' '}
              from the quarantine manifest? This file cannot be recovered.
            </p>
            <div className="pt-2 flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                size="small"
                onClick={() => setConfirmDeleteTarget(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="small"
                onClick={executeDeleteQuarantinedPermanent}
              >
                <Trash2 className="w-3.5 h-3.5 text-[var(--red)]" />
                <span>Permanently Delete</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
