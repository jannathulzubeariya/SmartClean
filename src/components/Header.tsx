import React from 'react';
import { Search, Play, Pause, XCircle, RotateCw, HardDrive, Menu, X, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useScan } from '../context/ScanContext';
import { Button } from './Buttons';
import { HandCraftLogo } from './HandDrawnDecorations';

interface HeaderProps {
  onOpenScopePicker?: () => void;
  /** Toggle mobile/tablet drawer (< lg) */
  onToggleMobileNav?: () => void;
  isMobileNavOpen?: boolean;
  /** Toggle desktop sidebar collapse (>= lg) */
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenScopePicker,
  onToggleMobileNav,
  isMobileNavOpen,
  onToggleSidebar,
  isSidebarCollapsed,
}) => {
  const {
    scanStatus,
    pauseScan,
    resumeScan,
    cancelScan,
    globalSearchQuery,
    setGlobalSearchQuery,
    refreshSummary,
  } = useScan();

  const isScanning = scanStatus?.status === 'scanning';
  const isPaused = scanStatus?.status === 'paused';

  return (
    <header className="min-h-[64px] bg-[var(--paper)] border-b-[1.5px] border-[var(--ink)] px-3 sm:px-4 lg:px-5 flex items-center justify-between gap-2 sm:gap-3 shrink-0 z-10">
      {/* Left Area: Sidebar Toggle + Brand */}
      <div className="flex items-center gap-2 shrink-0">

        {/* Unified Navigation / Sidebar Toggle Button (Mobile drawer / Desktop collapse) */}
        <button
          id="nav-sidebar-toggle"
          onClick={() => {
            if (typeof window !== 'undefined' && window.innerWidth < 1024) {
              onToggleMobileNav?.();
            } else {
              onToggleSidebar?.();
            }
          }}
          className="w-[44px] h-[44px] rounded-[4px] border-[1.5px] border-[var(--ink)] bg-[var(--paper)] hover:bg-[var(--paper-2)] flex items-center justify-center transition-colors cursor-pointer shrink-0"
          aria-label={
            isMobileNavOpen
              ? 'Close navigation menu'
              : isSidebarCollapsed
              ? 'Expand sidebar'
              : 'Toggle navigation menu'
          }
          title={
            isMobileNavOpen
              ? 'Close navigation'
              : isSidebarCollapsed
              ? 'Expand sidebar'
              : 'Collapse sidebar'
          }
        >
          {/* Mobile icon (< lg) */}
          <span className="lg:hidden flex items-center justify-center pointer-events-none">
            {isMobileNavOpen ? (
              <X className="w-5 h-5 text-[var(--ink)]" />
            ) : (
              <Menu className="w-5 h-5 text-[var(--ink)]" />
            )}
          </span>
          {/* Desktop icon (>= lg) */}
          <span className="hidden lg:flex items-center justify-center pointer-events-none">
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="w-5 h-5 text-[var(--ink)]" />
            ) : (
              <PanelLeftClose className="w-5 h-5 text-[var(--ink)]" />
            )}
          </span>
        </button>

        {/* Brand wordmark — shown on mobile/tablet and on desktop when sidebar is collapsed */}
        <div className={`items-center gap-2 ${isSidebarCollapsed ? 'flex' : 'flex lg:hidden'}`}>
          <HandCraftLogo className="w-7 h-7 shrink-0" />
          <span className="font-serif font-bold text-base text-[var(--ink)] tracking-tight hidden sm:inline">
            SmartClean
          </span>
        </div>
      </div>

      {/* Search Field */}
      <div className="relative flex-1 min-w-[80px] sm:min-w-[140px] max-w-xs md:max-w-sm">
        <label htmlFor="global-search" className="sr-only">Search files</label>
        <Search
          className="w-4 h-4 text-[var(--ink)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          aria-hidden="true"
        />
        <input
          id="global-search"
          type="text"
          value={globalSearchQuery}
          onChange={(e) => setGlobalSearchQuery(e.target.value)}
          placeholder="Search..."
          className="w-full h-[44px] bg-[var(--paper)] border-[1.5px] border-[var(--ink)] rounded-[4px] pl-8 sm:pl-9 pr-9 text-xs text-[var(--ink)] placeholder-[var(--ink-soft)] focus:outline-none"
        />
        {globalSearchQuery && (
          <button
            onClick={() => setGlobalSearchQuery('')}
            className="absolute right-0.5 top-1/2 -translate-y-1/2 w-[38px] h-[38px] flex items-center justify-center text-sm text-[var(--ink-soft)] hover:text-[var(--ink)] cursor-pointer"
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {/* Right Actions & Live Scan Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {(isScanning || isPaused) && (
          <div className="flex items-center gap-1.5 sm:gap-2 bg-[var(--paper-2)] border-[1.5px] border-[var(--ink)] px-2 sm:px-2.5 py-1.5 rounded-[4px] text-xs">
            <span
              className={`w-2 h-2 rounded-full border border-[var(--ink)] shrink-0 ${
                isPaused ? 'bg-[var(--coral)]' : 'bg-[#2E6B3E] animate-pulse'
              }`}
              aria-hidden="true"
            />
            <span className="font-mono text-[var(--ink)] hidden md:inline">
              {isPaused ? 'Paused' : 'Scanning'}: {scanStatus?.files_scanned} files
            </span>
            <span className="font-mono text-[var(--ink)] hidden sm:inline md:hidden">
              {scanStatus?.files_scanned} files
            </span>
            <div className="h-3 w-[1px] bg-[var(--ink)]/20 mx-0.5 hidden sm:block" />
            {isPaused ? (
              <button
                onClick={resumeScan}
                className="text-[var(--ink)] hover:text-[var(--ink-soft)] font-medium inline-flex items-center gap-1 cursor-pointer"
                title="Resume scan"
              >
                <Play className="w-3 h-3 text-[var(--ink)]" />
                <span className="hidden md:inline">Resume</span>
              </button>
            ) : (
              <button
                onClick={pauseScan}
                className="text-[var(--ink)] hover:text-[var(--ink-soft)] font-medium inline-flex items-center gap-1 cursor-pointer"
                title="Pause scan"
              >
                <Pause className="w-3 h-3 text-[var(--ink)]" />
                <span className="hidden md:inline">Pause</span>
              </button>
            )}
            <button
              onClick={cancelScan}
              className="text-[var(--red)] hover:opacity-80 font-medium inline-flex items-center gap-1 cursor-pointer"
              title="Stop scan"
            >
              <XCircle className="w-3 h-3 text-[var(--red)]" />
              <span className="hidden md:inline">Stop</span>
            </button>
          </div>
        )}

        <button
          onClick={() => refreshSummary()}
          className="w-[44px] h-[44px] rounded-[4px] border-[1.5px] border-[var(--ink)] bg-[var(--paper)] hover:bg-[var(--paper-2)] flex items-center justify-center transition-colors cursor-pointer shrink-0"
          title="Refresh scan data"
          aria-label="Refresh scan data"
        >
          <RotateCw className="w-4 h-4 text-[var(--ink)]" />
        </button>

        {onOpenScopePicker && (
          <Button
            variant="primary"
            onClick={onOpenScopePicker}
            className="shrink-0 px-2.5 sm:px-4"
          >
            <HardDrive className="w-4 h-4 text-[var(--paper)]" />
            <span className="hidden sm:inline">Select Location</span>
          </Button>
        )}
      </div>
    </header>
  );
};
