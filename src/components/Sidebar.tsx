import React, { useEffect } from 'react';
import {
  Home,
  FolderSync,
  X
} from 'lucide-react';
import { useScan } from '../context/ScanContext';
import { FramedIcon } from './FramedIcon';
import {
  FernSprig,
  HandCraftLogo,
  StorageAnalyzerIcon,
  OrganizeIcon,
  DuplicatesIcon,
  ReclaimableIcon,
  SafeguardedIcon,
  ActivityHistoryIcon,
  SettingsControlIcon
} from './HandDrawnDecorations';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen = false,
  onClose,
  isCollapsed = false,
}) => {
  const { summary, displayScopeName, generateDemo, scanStatus } = useScan();

  // Handle Escape key to close mobile drawer
  useEffect(() => {
    if (!isOpen || !onClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'analyzer', label: 'Storage Analyzer', icon: StorageAnalyzerIcon },
    { id: 'organize', label: 'Organize', icon: OrganizeIcon, count: summary?.misplaced_files_count },
    { id: 'duplicates', label: 'Duplicates', icon: DuplicatesIcon, count: summary?.duplicate_count },
    { id: 'cleanup', label: 'Safe Cleanup', icon: ReclaimableIcon, count: summary?.safe_cleanup_summary?.total_candidates },
    { id: 'important', label: 'Important Files', icon: SafeguardedIcon, count: summary?.important_files_count },
    { id: 'activity', label: 'Activity & History', icon: ActivityHistoryIcon },
    { id: 'settings', label: 'Settings', icon: SettingsControlIcon },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay (only on mobile/tablet when open) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-[var(--ink)]/40 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar: Drawer on mobile/tablet (<lg), static sidebar on desktop (>=lg) */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 lg:z-10 w-72 max-w-[85vw] lg:w-64 shrink-0 bg-[var(--paper)] border-r-[1.5px] border-[var(--ink)] flex flex-col justify-between h-screen select-none transition-all duration-200 ease-in-out ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0 shadow-none'
        } ${isCollapsed ? 'lg:hidden' : 'lg:flex'}`}
        aria-label="Sidebar Navigation"
      >
        {/* Top Brand Header */}
        <div className="overflow-y-auto">
          <div className="p-4 sm:p-6 border-b-[1.5px] border-[var(--ink)] bg-[var(--paper)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HandCraftLogo className="w-9 h-9 shrink-0" />
              <div>
                <h2 className="font-serif font-semibold text-xl tracking-tight text-[var(--ink)] leading-none">
                  SmartClean
                </h2>
                <span className="font-hand text-[var(--red)] text-sm block mt-0.5 leading-none">
                  the computer cleaner that thinks
                </span>
              </div>
            </div>

            {/* Close Button on Mobile Drawer */}
            {onClose && (
              <button
                onClick={onClose}
                className="lg:hidden w-[44px] h-[44px] rounded-[4px] border-[1.5px] border-[var(--ink)] bg-[var(--paper)] hover:bg-[var(--paper-2)] flex items-center justify-center cursor-pointer shrink-0"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5 text-[var(--ink)]" />
              </button>
            )}
          </div>

          {/* Navigation List */}
          <nav className="p-3 space-y-1.5" aria-label="Main Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (onClose) onClose();
                  }}
                  className={`w-full min-h-[44px] flex items-center justify-between px-3.5 py-2 rounded-[2px] text-sm font-medium transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-[#B9D1C9] text-[var(--ink)] border-[1.5px] border-[var(--ink)] font-semibold shadow-xs'
                      : 'text-[var(--ink)] hover:bg-[var(--paper-2)] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FramedIcon icon={Icon} size="sm" framed={isActive} />
                    <span>{item.label}</span>
                  </div>
                  {typeof item.count === 'number' && item.count > 0 && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border border-[var(--ink)] font-mono ${
                        isActive ? 'bg-[var(--paper)] text-[var(--ink)]' : 'bg-[var(--paper-2)] text-[var(--ink-soft)]'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Area: Workspace Status & Edge Decoration */}
        <div className="p-4 border-t-[1.5px] border-[var(--ink)] bg-[var(--paper-2)] m-3 rounded-[2px] border relative shrink-0">
          <div className="text-[11px] font-sans font-medium text-[var(--ink-soft)] uppercase tracking-wider mb-1">
            Active Scope
          </div>
          <div
            className="font-mono text-xs text-[var(--ink)] truncate"
            title={displayScopeName}
          >
            {displayScopeName}
          </div>

          {scanStatus?.status === 'scanning' ? (
            <div className="mt-2 text-xs text-[var(--blue)] flex items-center gap-2 font-medium">
              <span className="w-2 h-2 rounded-full bg-[var(--coral)] border border-[var(--ink)] animate-pulse" />
              Scanning {scanStatus.files_scanned} files...
            </div>
          ) : (
            <div className="mt-3 pt-3 border-t border-[var(--ink)]/15">
              <button
                onClick={() => {
                  generateDemo();
                  if (onClose) onClose();
                }}
                className="w-full min-h-[36px] flex items-center justify-center gap-2 py-1.5 px-3 bg-[var(--paper)] text-[var(--ink)] border-[1.5px] border-[var(--ink)] rounded-full text-xs font-medium hover:bg-[var(--paper-2)] transition-colors cursor-pointer"
              >
                <FolderSync className="w-3.5 h-3.5 text-[var(--ink)]" />
                <span>Load Demo Workspace</span>
              </button>
            </div>
          )}

          {/* Handwritten margin note at sidebar edge */}
          <div className="mt-4 pt-3 flex items-center justify-between border-t border-[var(--ink)]/10">
            <span className="font-hand text-[var(--red)] text-sm leading-tight">
              good morning, what are we cleaning?
            </span>
            <FernSprig className="w-4 h-8" />
          </div>
        </div>
      </aside>
    </>
  );
};
