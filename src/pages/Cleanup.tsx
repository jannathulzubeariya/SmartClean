import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ShieldCheck,
  Archive,
  RotateCw,
  Eye,
  Trash2,
} from 'lucide-react';
import { api } from '../api/client';
import { useScan } from '../context/ScanContext';
import { CleanupSection } from '../types';
import { formatDisplayPath } from '../services/storageCapability';
import { Button } from '../components/Buttons';
import { FramedIcon } from '../components/FramedIcon';
import { Chip } from '../components/Chips';
import { ReclaimableIcon } from '../components/HandDrawnDecorations';

interface CleanupProps {
  onSelectFile: (id: string) => void;
  onTriggerDeleteAnalysis: (file: any) => void;
}

export const Cleanup: React.FC<CleanupProps> = ({ onSelectFile, onTriggerDeleteAnalysis }) => {
  const { showToast, refreshSummary, scanStatus } = useScan();
  const [cleanupData, setCleanupData] = useState<{
    sections: CleanupSection[];
    total_candidates: number;
    safe_reclaimable_bytes: number;
    safe_reclaimable_formatted: string;
    guidance: string;
  }>({
    sections: [],
    total_candidates: 0,
    safe_reclaimable_bytes: 0,
    safe_reclaimable_formatted: '0 B',
    guidance: ''
  });

  const [activeTab, setActiveTab] = useState<string>('temporary');
  const [loading, setLoading] = useState(false);
  const [isCleaningLowRisk, setIsCleaningLowRisk] = useState(false);

  const fetchCleanup = async () => {
    setLoading(true);
    const res = await api.getCleanup();
    if (res.success && res.data) {
      setCleanupData(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCleanup();
  }, []);

  useEffect(() => {
    if (scanStatus?.status === 'completed') {
      fetchCleanup();
    }
  }, [scanStatus?.status]);

  const handleCleanAllLowRisk = async () => {
    const lowRiskItems = cleanupData.sections
      .filter((s) => s.risk === 'LOW')
      .flatMap((s) => s.items);

    if (lowRiskItems.length === 0) {
      showToast('No low-risk items available to clean', 'info');
      return;
    }

    setIsCleaningLowRisk(true);
    let successCount = 0;

    for (const item of lowRiskItems) {
      const res = await api.quarantineFile(item.id, `Bulk safe cleanup: ${item.reason}`);
      if (res.success) {
        successCount++;
      }
    }

    setIsCleaningLowRisk(false);
    if (successCount === lowRiskItems.length) {
      showToast(`Safely moved ${successCount} low-risk file${successCount > 1 ? 's' : ''} to Quarantine`, 'success');
    } else if (successCount > 0) {
      showToast(`Moved ${successCount} of ${lowRiskItems.length} files to Quarantine. Some could not be quarantined.`, 'warning');
    } else {
      showToast('Could not quarantine selected files', 'error');
    }
    fetchCleanup();
    refreshSummary();
  };

  const currentSection = cleanupData.sections.find((s) => s.key === activeTab) || cleanupData.sections[0];

  return (
    <div className="max-w-[1080px] mx-auto px-6 md:px-10 py-12 space-y-8 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b-[1.5px] border-[var(--ink)]">
        <div className="flex items-center gap-3">
          <FramedIcon icon={ReclaimableIcon} size="md" />
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[var(--ink)]">
              Safe Cleanup Center
            </h1>
            <p className="text-sm text-[var(--ink-soft)] mt-0.5">
              Reversible isolation in Quarantine. Nothing important is deleted without confirmation.
            </p>
          </div>
        </div>

        <button
          onClick={fetchCleanup}
          className="w-[44px] h-[44px] rounded-[4px] border-[1.5px] border-[var(--ink)] bg-[var(--paper)] hover:bg-[var(--paper-2)] flex items-center justify-center transition-colors cursor-pointer self-start md:self-auto"
          title="Refresh cleanup candidates"
          aria-label="Refresh cleanup candidates"
        >
          <RotateCw className="w-4 h-4 text-[var(--ink)]" />
        </button>
      </div>

      {/* "What can I safely clean?" Highlight Card */}
      <div className="analog-card paper-grain p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <FramedIcon icon={ReclaimableIcon} size="lg" />
            <div>
              <div className="text-xs uppercase tracking-wider font-medium text-[var(--ink-soft)]">
                What can I safely clean?
              </div>
              <div className="font-mono text-3xl font-bold text-[var(--ink)] mt-0.5">
                {cleanupData.safe_reclaimable_formatted} Safe Storage
              </div>
            </div>
          </div>

          <Button
            variant="primary"
            onClick={handleCleanAllLowRisk}
            disabled={isCleaningLowRisk || cleanupData.total_candidates === 0}
          >
            <Archive className="w-4 h-4" />
            <span>{isCleaningLowRisk ? 'Quarantining...' : 'Quarantine All Low-Risk Files'}</span>
          </Button>
        </div>

        <div className="p-3 bg-[var(--paper-2)] border-[1.5px] border-[var(--ink)] rounded-[4px] text-xs text-[var(--ink)] flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#2E6B3E] shrink-0" />
          <span>
            <strong>Reversible Isolation:</strong> Cleaned files are preserved in your local quarantine folder and can be restored back anytime.
          </span>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b-[1.5px] border-[var(--ink)]/15">
        {cleanupData.sections.map((sec) => (
          <button
            key={sec.key}
            onClick={() => setActiveTab(sec.key)}
            className={`min-h-[44px] px-4 rounded-full border-[1.5px] border-[var(--ink)] text-xs font-medium transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === sec.key
                ? 'bg-[var(--ink)] text-[var(--paper)]'
                : 'bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-2)]'
            }`}
          >
            <span>{sec.title}</span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border border-[var(--ink)] ${
                activeTab === sec.key
                  ? 'bg-[var(--paper)] text-[var(--ink)]'
                  : 'bg-[var(--paper-2)] text-[var(--ink)]'
              }`}
            >
              {sec.count} ({sec.total_formatted})
            </span>
          </button>
        ))}
      </div>

      {/* Current Section Items */}
      {currentSection && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-[var(--ink-soft)]">
            <p>{currentSection.description}</p>
            <Chip
              label={`Risk: ${currentSection.risk}`}
              variant={
                currentSection.risk === 'HIGH'
                  ? 'review'
                  : currentSection.risk === 'MEDIUM'
                  ? 'in-progress'
                  : 'completed'
              }
            />
          </div>

          {currentSection.items.length === 0 ? (
            <div className="analog-card paper-grain py-12 text-center space-y-3">
              <FramedIcon icon={ReclaimableIcon} size="md" className="mx-auto" />
              <div className="font-serif text-base font-semibold text-[var(--ink)]">
                No items in this category
              </div>
              <p className="text-xs text-[var(--ink-soft)] max-w-xs mx-auto">
                No {currentSection.title.toLowerCase()} files detected for cleanup in this scope.
              </p>
            </div>
          ) : (
            <div className="analog-card paper-grain divide-y divide-[var(--ink)]/10 text-xs">
              {currentSection.items.map((item) => (
                <div
                  key={item.id}
                  className="p-4 hover:bg-[var(--paper-2)] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="font-mono font-medium text-xs text-[var(--ink)] truncate" title={item.filename}>
                      {item.filename}
                    </div>
                    <div className="font-mono text-[10px] text-[var(--ink-soft)] truncate" title={item.path}>
                      {formatDisplayPath(item.path)}
                    </div>
                    <div className="text-xs text-[var(--ink-soft)] italic">
                      "{item.reason}"
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="font-mono font-medium text-xs text-[var(--ink)]">
                        {item.size_formatted}
                      </div>
                      <div className="text-[10px] text-[var(--ink-soft)]">
                        Score: {item.importance_score}/100
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectFile(item.id)}
                        className="w-[44px] h-[44px] sm:w-8 sm:h-8 rounded-[4px] border-[1.5px] border-[var(--ink)] bg-[var(--paper)] hover:bg-[var(--paper-2)] flex items-center justify-center cursor-pointer"
                        title="Inspect details"
                        aria-label={`Inspect ${item.filename}`}
                      >
                        <Eye className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-[var(--ink)]" />
                      </button>
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => onTriggerDeleteAnalysis(item)}
                      >
                        <Archive className="w-3.5 h-3.5 text-[var(--ink)]" />
                        <span>Quarantine</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
