import React from 'react';
import {
  HardDrive,
  Copy,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  RotateCw,
  Folder,
  FileText,
  Lightbulb,
  Heart,
  Compass,
  MoreHorizontal
} from 'lucide-react';
import { useScan } from '../context/ScanContext';
import { Button } from '../components/Buttons';
import { FramedIcon } from '../components/FramedIcon';
import { Chip } from '../components/Chips';
import {
  SailboatSketch,
  FernSprig,
  IndexedFilesIcon,
  ReclaimableIcon,
  DuplicatesIcon,
  ImportantFilesIcon
} from '../components/HandDrawnDecorations';
import { CodeBlock } from '../components/CodeBlock';

interface DashboardProps {
  setActiveTab: (tab: string) => void;
  onOpenScopePicker: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setActiveTab, onOpenScopePicker }) => {
  const { summary, isLoadingSummary, scanStatus, generateDemo, refreshSummary, displayScopeName } = useScan();

  const isScanning = scanStatus?.status === 'scanning';
  const hasScanned = summary?.has_scanned;

  // Time-aware greeting (Section 13)
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (isLoadingSummary && !summary) {
    return (
      <div className="p-16 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <RotateCw className="w-8 h-8 text-[var(--ink)] animate-spin mx-auto" />
          <p className="text-sm font-medium text-[var(--ink-soft)]">
            Opening storage records...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1080px] mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 md:py-12 space-y-8 sm:space-y-12 md:space-y-16 animate-in fade-in duration-150">
      {/* 1. HERO SECTION (Asymmetric two-column, text left, illustration right) */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center" aria-label="Overview">
        <div className="md:col-span-7 space-y-4 sm:space-y-6">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-[var(--ink)] leading-tight">
              {getGreeting()},
              <br />
              what are we cleaning?
            </h1>
            <p className="text-base text-[var(--ink-soft)] mt-2">
              A calm space to plan, understand, and safely manage your computer storage.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              variant="primary"
              onClick={onOpenScopePicker}
            >
              <span>Scan Location</span>
            </Button>
            <Button
              variant="secondary"
              onClick={() => setActiveTab('analyzer')}
            >
              <span>Open Explorer</span>
            </Button>
            <Button
              variant="secondary"
              onClick={() => generateDemo()}
            >
              <span>Load Demo</span>
            </Button>
          </div>
        </div>

        {/* Right column: Sailboat Sketchbook illustration from poster */}
        <div className="md:col-span-5 flex justify-center md:justify-end">
          <SailboatSketch className="w-full max-w-[280px]" />
        </div>
      </section>

      {/* 2. STORAGE STATUS CARDS (Separated by 24px, 2px radius, faint grain) */}
      <section aria-label="Storage Metrics" className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl font-semibold text-[var(--ink)]">
            Storage Overview
          </h2>
          <span className="font-hand text-[var(--red)] text-lg">
            measure twice, clean once
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Metric 1: Indexed Files */}
          <div className="analog-card paper-grain p-5 sm:p-6 flex flex-col justify-between h-full gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-1">
                <span className="text-xs font-medium text-[var(--ink-soft)] uppercase tracking-wider block">
                  Indexed Files
                </span>
                <div className="font-mono text-2xl sm:text-3xl font-semibold text-[var(--ink)] tracking-tight">
                  {summary?.total_files ?? 0}
                </div>
                <div className="text-xs text-[var(--ink-soft)] truncate">
                  {summary?.total_files === 0 && !summary?.has_scanned
                    ? 'No location scanned yet'
                    : summary?.is_client_scope
                    ? 'in selected folder'
                    : 'in active scan scope'}
                </div>
              </div>
              <FramedIcon icon={IndexedFilesIcon} size="md" className="shrink-0" />
            </div>
            <div className="pt-2 flex items-center gap-2 border-t border-[var(--ink)]/10">
              <Chip label={summary?.is_client_scope ? 'Folder' : 'Ready'} variant="in-progress" />
              <span className="text-[11px] font-mono text-[var(--ink-soft)] truncate">
                {summary?.is_client_scope ? summary?.total_scanned_formatted || '0 B' : `${summary?.percent_used ?? 0}% disk`}
              </span>
            </div>
          </div>

          {/* Metric 2: Reclaimable */}
          <div className="analog-card paper-grain p-5 sm:p-6 flex flex-col justify-between h-full gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-1">
                <span className="text-xs font-medium text-[var(--ink-soft)] uppercase tracking-wider block">
                  Reclaimable
                </span>
                <div className="font-mono text-2xl sm:text-3xl font-semibold text-[var(--ink)] tracking-tight">
                  {summary?.reclaimable_storage_formatted || '0 B'}
                </div>
                <div className="text-xs text-[var(--ink-soft)] truncate">
                  {(summary?.reclaimable_bytes ?? summary?.reclaimable_storage_bytes ?? 0) === 0
                    ? 'No reclaimable files found'
                    : 'ready for safe quarantine'}
                </div>
              </div>
              <FramedIcon icon={ReclaimableIcon} size="md" className="shrink-0" />
            </div>
            <div className="pt-2 flex items-center gap-2 border-t border-[var(--ink)]/10">
              <Chip label="Safe Review" variant="review" />
              <span className="text-[11px] font-mono text-[var(--ink-soft)]">Reversible</span>
            </div>
          </div>

          {/* Metric 3: Duplicates */}
          <div className="analog-card paper-grain p-5 sm:p-6 flex flex-col justify-between h-full gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-1">
                <span className="text-xs font-medium text-[var(--ink-soft)] uppercase tracking-wider block">
                  Duplicates
                </span>
                <div className="font-mono text-2xl sm:text-3xl font-semibold text-[var(--ink)] tracking-tight">
                  {summary?.duplicate_count ?? 0}
                </div>
                <div className="text-xs text-[var(--ink-soft)] truncate">
                  {summary?.duplicate_count === 0
                    ? 'No redundant copies found'
                    : 'redundant copies detected'}
                </div>
              </div>
              <FramedIcon icon={DuplicatesIcon} size="md" className="shrink-0" />
            </div>
            <div className="pt-2 flex items-center gap-2 border-t border-[var(--ink)]/10">
              <Chip label="Keeper Preserved" variant="in-progress" />
              <span className="text-[11px] font-mono text-[var(--ink-soft)]">Exact Match</span>
            </div>
          </div>

          {/* Metric 4: Important Files / Safeguards */}
          <div className="analog-card paper-grain p-5 sm:p-6 flex flex-col justify-between h-full gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-1">
                <span className="text-xs font-medium text-[var(--ink-soft)] uppercase tracking-wider block">
                  Important Files
                </span>
                <div className="font-mono text-2xl sm:text-3xl font-semibold text-[var(--ink)] tracking-tight">
                  {summary?.important_files_count ?? 0}
                </div>
                <div className="text-xs text-[var(--ink-soft)] truncate">
                  {summary?.important_files_count === 0
                    ? 'Protected by heuristics'
                    : 'high importance (locked)'}
                </div>
              </div>
              <FramedIcon icon={ImportantFilesIcon} size="md" className="shrink-0" />
            </div>
            <div className="pt-2 flex items-center gap-2 border-t border-[var(--ink)]/10">
              <Chip label="Protected" variant="completed" />
              <span className="text-[11px] font-mono text-[var(--ink-soft)]">No Auto-Delete</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. RECENT FILES & HOUSEKEEPING BREAKDOWN (Separated by 24px) */}
      <section aria-label="Recent Items" className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Recent Scanned Files List (like "Recent projects" on poster) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between pb-2">
            <h2 className="font-serif text-2xl font-semibold text-[var(--ink)]">
              Scanned Files & Distribution
            </h2>
            <button
              onClick={() => setActiveTab('analyzer')}
              className="min-h-[44px] text-xs text-[var(--ink)] hover:text-[var(--ink-soft)] font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Cards Table list */}
          <div className="analog-card paper-grain p-4 space-y-2">
            {summary?.categories && summary.categories.length > 0 ? (
              summary.categories.map((cat: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3 bg-[var(--paper)] hover:bg-[var(--paper-2)] border border-[var(--ink)]/15 rounded-[2px] transition-colors flex items-center justify-between gap-4 select-none cursor-pointer"
                  onClick={() => setActiveTab('analyzer')}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FramedIcon icon={Folder} size="sm" />
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-[var(--ink)] truncate">
                        {cat.category}
                      </div>
                      <div className="text-xs text-[var(--ink-soft)]">
                        {cat.count} files · {cat.formatted_size} ({cat.percentage}%)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-24 h-1.5 bg-[var(--paper-2)] border border-[var(--ink)]/20 rounded-full overflow-hidden hidden sm:block">
                      <div
                        className="h-full bg-[var(--ink)]"
                        style={{ width: `${Math.min(100, Math.max(2, cat.percentage))}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono font-medium text-[var(--ink)]">
                      {cat.formatted_size}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center space-y-3">
                <FramedIcon icon={IndexedFilesIcon} size="md" className="mx-auto" />
                <div>
                  <div className="font-serif text-lg font-semibold text-[var(--ink)]">
                    No storage scan yet
                  </div>
                  <p className="text-xs text-[var(--ink-soft)] mt-1 max-w-xs mx-auto">
                    Select a location above or load the demo workspace to explore file distribution.
                  </p>
                </div>
                <div className="pt-2">
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={onOpenScopePicker}
                  >
                    <span>Select Location</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Housekeeping Quick Notes & Code Block */}
        <div className="lg:col-span-4 space-y-6">
          <div className="analog-card paper-grain p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FramedIcon icon={ReclaimableIcon} size="sm" />
                <h3 className="font-serif text-lg font-semibold text-[var(--ink)]">
                  Safe Cleanup
                </h3>
              </div>
              <span className="w-2 h-2 rounded-full bg-[var(--coral)] border border-[var(--ink)]" />
            </div>
            <p className="text-xs text-[var(--ink-soft)] leading-relaxed">
              SmartClean isolates candidates in Quarantine first. Permanent deletion is always gated with explicit confirmation.
            </p>
            <div className="pt-2">
              <Button
                variant="primary"
                size="small"
                onClick={() => setActiveTab('cleanup')}
                className="w-full"
              >
                Inspect Cleanup ({summary?.safe_cleanup_summary?.total_candidates ?? 0})
              </Button>
            </div>
          </div>

          {/* Quick engine status code block from Section 5 & poster */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-[var(--ink-soft)] uppercase tracking-wider block">
              Local Engine Status
            </span>
            <CodeBlock
              language="bash"
              code={`# SmartClean Storage Engine\nscope="${displayScopeName || 'Ready'}"\nstatus="${summary?.status || 'idle'}"\nquarantine="Safe Quarantine Vault"`}
            />
          </div>
        </div>
      </section>

      {/* 4. FEATURE BAND AT THE BOTTOM (Teal background, 3 columns, sticky note) */}
      <section
        className="rounded-[2px] border-[1.5px] border-[var(--ink)] bg-[#B9D1C9] p-8 relative overflow-hidden"
        aria-label="System Principles"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Column 1 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <FramedIcon icon={Lightbulb} size="sm" />
              <h3 className="font-serif text-lg font-semibold text-[var(--ink)]">
                Why this system works
              </h3>
            </div>
            <ul className="text-xs text-[var(--ink)] space-y-1.5 leading-relaxed">
              <li>• Feels human and thoughtful, not mechanical.</li>
              <li>• Understands file context before touching anything.</li>
              <li>• Reversible quarantine protects against loss.</li>
              <li>• Transparent scoring: explain before you clean.</li>
            </ul>
          </div>

          {/* Column 2 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <FramedIcon icon={Heart} size="sm" />
              <h3 className="font-serif text-lg font-semibold text-[var(--ink)]">
                How it makes me feel
              </h3>
            </div>
            <ul className="text-xs text-[var(--ink)] space-y-1.5 leading-relaxed">
              <li>• Calm — like a quiet desk, not a busy dashboard.</li>
              <li>• Safe — final control stays in your hands.</li>
              <li>• In control — no silent or automated deletions.</li>
              <li>• Clear — plain language explanations for every rule.</li>
            </ul>
          </div>

          {/* Column 3 */}
          <div className="space-y-3 relative">
            <div className="flex items-center gap-2.5">
              <FramedIcon icon={Compass} size="sm" />
              <h3 className="font-serif text-lg font-semibold text-[var(--ink)]">
                Where it suits best
              </h3>
            </div>
            <ul className="text-xs text-[var(--ink)] space-y-1.5 leading-relaxed">
              <li>• Creative and writing workspaces.</li>
              <li>• Personal laptop and desktop decluttering.</li>
              <li>• Downloads and Desktop reorganization.</li>
              <li>• Duplicate photo and document cleanup.</li>
            </ul>

            {/* Sticky Note at edge (Section 6 & poster) */}
            <div className="mt-4 p-3 bg-[var(--paper)] border-[1.5px] border-[var(--ink)] rounded-[2px] shadow-sm max-w-[200px]">
              <span className="font-hand text-[var(--red)] text-base block leading-tight">
                Not just a cleaner — a digital housekeeping mindset.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Edge decoration (Section 6: one or two per screen at edges) */}
      <div className="flex justify-between items-center pt-8 border-t-[1.5px] border-[var(--ink)] text-xs text-[var(--ink-soft)]">
        <span className="font-mono">SmartClean · 100% Local & Privacy-First</span>
        <FernSprig className="w-6 h-12" />
      </div>
    </div>
  );
};
