import React, { useState, useEffect } from 'react';
import { FolderTree, ArrowRight, CheckSquare, Square, AlertCircle, ShieldCheck, RotateCw } from 'lucide-react';
import { api } from '../api/client';
import { useScan } from '../context/ScanContext';
import { OrganizationRecommendation } from '../types';
import { MovePreviewModal } from '../components/MovePreviewModal';
import { Button } from '../components/Buttons';
import { FramedIcon } from '../components/FramedIcon';
import { Chip } from '../components/Chips';
import { OrganizeIcon } from '../components/HandDrawnDecorations';

export const Organize: React.FC = () => {
  const { showToast, refreshSummary, scanStatus } = useScan();
  const [recommendations, setRecommendations] = useState<OrganizationRecommendation[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [previewItems, setPreviewItems] = useState<OrganizationRecommendation[] | null>(null);

  const fetchRecommendations = async () => {
    setLoading(true);
    const res = await api.getOrganization();
    if (res.success && res.data) {
      setRecommendations(res.data.recommendations || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  useEffect(() => {
    if (scanStatus?.status === 'completed') {
      fetchRecommendations();
    }
  }, [scanStatus?.status]);

  const toggleSelect = (fileId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === recommendations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(recommendations.map((r) => r.file_id)));
    }
  };

  const handleBatchMoveClick = () => {
    const itemsToMove = recommendations.filter((r) => selectedIds.has(r.file_id));
    if (itemsToMove.length === 0) return;
    setPreviewItems(itemsToMove);
  };

  const handleSingleMoveClick = (item: OrganizationRecommendation) => {
    setPreviewItems([item]);
  };

  const handleKeepItem = (item: OrganizationRecommendation) => {
    setRecommendations((prev) => prev.filter((r) => r.file_id !== item.file_id));
    selectedIds.delete(item.file_id);
    showToast(`Kept '${item.filename}' in current folder`, 'info');
  };

  const handleIgnoreItem = (item: OrganizationRecommendation) => {
    setRecommendations((prev) => prev.filter((r) => r.file_id !== item.file_id));
    selectedIds.delete(item.file_id);
    showToast(`Ignored recommendation for '${item.filename}'`, 'info');
  };

  return (
    <div className="max-w-[1080px] mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 md:py-12 space-y-6 sm:space-y-8 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b-[1.5px] border-[var(--ink)]">
        <div className="flex items-center gap-3">
          <FramedIcon icon={OrganizeIcon} size="md" />
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[var(--ink)]">
              Organization Engine
            </h1>
            <p className="text-sm text-[var(--ink-soft)] mt-0.5">
              Detects misplaced files and suggests standard system folders.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchRecommendations}
            className="w-[44px] h-[44px] rounded-[4px] border-[1.5px] border-[var(--ink)] bg-[var(--paper)] hover:bg-[var(--paper-2)] flex items-center justify-center transition-colors cursor-pointer"
            title="Refresh recommendations"
            aria-label="Refresh recommendations"
          >
            <RotateCw className="w-4 h-4 text-[var(--ink)]" />
          </button>
          {recommendations.length > 0 && (
            <Button
              variant="primary"
              onClick={handleBatchMoveClick}
              disabled={selectedIds.size === 0}
            >
              <span>Move Selected ({selectedIds.size})</span>
            </Button>
          )}
        </div>
      </div>

      {/* Overview Card */}
      <div className="analog-card paper-grain p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <FramedIcon icon={OrganizeIcon} size="lg" />
          <div>
            <h3 className="font-serif text-xl font-semibold text-[var(--ink)]">
              {recommendations.length} Misplaced Files Detected
            </h3>
            <p className="text-xs text-[var(--ink-soft)] mt-0.5">
              Nothing is moved automatically. Every action resolves potential filename collisions safely.
            </p>
          </div>
        </div>

        {recommendations.length > 0 && (
          <Button
            variant="secondary"
            size="small"
            onClick={toggleSelectAll}
          >
            {selectedIds.size === recommendations.length ? (
              <>
                <CheckSquare className="w-4 h-4 text-[var(--ink)]" />
                <span>Deselect All</span>
              </>
            ) : (
              <>
                <Square className="w-4 h-4 text-[var(--ink)]" />
                <span>Select All ({recommendations.length})</span>
              </>
            )}
          </Button>
        )}
      </div>

      {/* Recommendations List */}
      {loading ? (
        <div className="py-16 text-center text-xs text-[var(--ink-soft)] font-medium">
          Checking directory placement rules...
        </div>
      ) : recommendations.length === 0 ? (
        <div className="analog-card paper-grain py-16 text-center space-y-3">
          <FramedIcon icon={OrganizeIcon} size="lg" className="mx-auto" />
          <h3 className="font-serif text-2xl font-semibold text-[var(--ink)]">
            Everything is in its place
          </h3>
          <p className="text-xs text-[var(--ink-soft)] max-w-sm mx-auto">
            All files in the current scope appear to be resting in appropriate folders.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {recommendations.map((item) => {
            const isSelected = selectedIds.has(item.file_id);
            return (
              <div
                key={item.file_id}
                className={`analog-card paper-grain p-5 transition-all text-xs space-y-4 ${
                  isSelected ? 'ring-2 ring-[var(--ink)]' : ''
                }`}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleSelect(item.file_id)}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer text-[var(--ink)] -ml-2"
                      aria-label={`Select ${item.filename}`}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-[var(--ink)]" />
                      ) : (
                        <Square className="w-5 h-5 text-[var(--ink)]" />
                      )}
                    </button>
                    <div>
                      <span className="font-mono font-semibold text-sm text-[var(--ink)]">
                        {item.filename}
                      </span>
                      <span className="text-[var(--ink-soft)] text-xs ml-2">
                        ({item.size_formatted} · {item.category})
                      </span>
                    </div>
                  </div>

                  <Chip
                    label={`${item.confidence} Confidence`}
                    variant={item.confidence === 'HIGH' ? 'review' : 'neutral'}
                  />
                </div>

                {/* Path comparison row in --paper-2 block */}
                <div className="p-3 bg-[var(--paper-2)] border-[1.5px] border-[var(--ink)] rounded-[4px] font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                  <div className="truncate text-[var(--ink-soft)]" title={item.current_path}>
                    Current: <strong>{item.current_folder}</strong>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--ink)] shrink-0 hidden sm:block" />
                  <div className="truncate text-[var(--ink)] font-semibold" title={item.proposed_target_path}>
                    Target: <strong>{item.suggested_folder}</strong>
                  </div>
                </div>

                {/* Collision Warning if target exists */}
                {item.has_collision && (
                  <div className="flex items-center gap-2 text-[var(--ink)] bg-[#F2D7CE] p-2.5 rounded-[4px] border border-[var(--ink)] text-xs">
                    <AlertCircle className="w-4 h-4 text-[var(--coral)] shrink-0" />
                    <span>
                      Target filename collision detected. Safe non-destructive rename:{' '}
                      <strong>{item.collision_preview_name}</strong>
                    </span>
                  </div>
                )}

                <div className="text-xs text-[var(--ink-soft)] italic">
                  "{item.reason}"
                </div>

                {/* Actions */}
                <div className="pt-2 border-t-[1.5px] border-[var(--ink)]/10 flex flex-wrap items-center justify-end gap-2">
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => handleIgnoreItem(item)}
                  >
                    Ignore
                  </Button>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => handleKeepItem(item)}
                  >
                    Keep Here
                  </Button>
                  <Button
                    variant="primary"
                    size="small"
                    onClick={() => handleSingleMoveClick(item)}
                  >
                    Move to {item.suggested_folder}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Move Preview Modal */}
      {previewItems && (
        <MovePreviewModal
          items={previewItems}
          onClose={() => setPreviewItems(null)}
          onSuccess={() => {
            fetchRecommendations();
            setSelectedIds(new Set());
            refreshSummary();
          }}
        />
      )}
    </div>
  );
};
