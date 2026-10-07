import React, { useState } from 'react';
import { ScanProvider, useScan } from './context/ScanContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { StorageAnalyzer } from './pages/StorageAnalyzer';
import { Organize } from './pages/Organize';
import { Duplicates } from './pages/Duplicates';
import { Cleanup } from './pages/Cleanup';
import { ImportantFiles } from './pages/ImportantFiles';
import { Activity } from './pages/Activity';
import { Settings } from './pages/Settings';
import { ScopePickerModal } from './components/ScopePickerModal';
import { FileDetailsDrawer } from './components/FileDetailsDrawer';
import { DeleteAnalysisModal } from './components/DeleteAnalysisModal';
import { MovePreviewModal } from './components/MovePreviewModal';
import { ToastContainer } from './components/ToastContainer';
import { ScannedFile, OrganizationRecommendation } from './types';

function MainAppContent() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isScopePickerOpen, setIsScopePickerOpen] = useState(false);
  // Mobile drawer open/closed
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  // Desktop sidebar collapsed/expanded
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const {
    selectedFileId,
    setSelectedFileId,
    deleteAnalysisTarget,
    setDeleteAnalysisTarget,
    refreshSummary
  } = useScan();

  const [movePreviewTarget, setMovePreviewTarget] = useState<OrganizationRecommendation[] | null>(null);

  const handleTriggerMoveFromDrawer = (orgRec: any) => {
    setMovePreviewTarget([orgRec]);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg)] text-[var(--ink)] font-sans antialiased">
      {/* Left Sidebar
          - Mobile/tablet (<lg): fixed drawer, controlled by isMobileNavOpen
          - Desktop (>=lg): static sidebar, controlled by isSidebarCollapsed */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setIsMobileNavOpen(false);
        }}
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        isCollapsed={isSidebarCollapsed}
      />

      {/* Main Content Area — grows/shrinks as sidebar collapses */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[var(--bg)]">
        <Header
          onOpenScopePicker={() => setIsScopePickerOpen(true)}
          onToggleMobileNav={() => setIsMobileNavOpen((prev) => !prev)}
          isMobileNavOpen={isMobileNavOpen}
          onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        {/* Dynamic Page Container */}
        <main className="flex-1 overflow-y-auto bg-[var(--bg)]">
          {activeTab === 'dashboard' && (
            <Dashboard
              setActiveTab={setActiveTab}
              onOpenScopePicker={() => setIsScopePickerOpen(true)}
            />
          )}

          {activeTab === 'analyzer' && (
            <StorageAnalyzer
              onOpenScopePicker={() => setIsScopePickerOpen(true)}
              onSelectFile={(id) => setSelectedFileId(id)}
              onTriggerDeleteAnalysis={(file) => setDeleteAnalysisTarget(file)}
            />
          )}

          {activeTab === 'organize' && <Organize />}

          {activeTab === 'duplicates' && <Duplicates />}

          {activeTab === 'cleanup' && (
            <Cleanup
              onSelectFile={(id) => setSelectedFileId(id)}
              onTriggerDeleteAnalysis={(file) => setDeleteAnalysisTarget(file)}
            />
          )}

          {activeTab === 'important' && (
            <ImportantFiles onSelectFile={(id) => setSelectedFileId(id)} />
          )}

          {activeTab === 'activity' && <Activity />}

          {activeTab === 'settings' && <Settings />}
        </main>
      </div>

      {/* Global Modals & Drawers */}
      <ScopePickerModal
        isOpen={isScopePickerOpen}
        onClose={() => setIsScopePickerOpen(false)}
      />

      <FileDetailsDrawer
        fileId={selectedFileId}
        onClose={() => setSelectedFileId(null)}
        onTriggerMove={handleTriggerMoveFromDrawer}
        onTriggerDeleteAnalysis={(file) => setDeleteAnalysisTarget(file)}
      />

      <DeleteAnalysisModal
        file={deleteAnalysisTarget}
        onClose={() => setDeleteAnalysisTarget(null)}
        onSuccess={() => {
          setSelectedFileId(null);
          refreshSummary();
        }}
      />

      {movePreviewTarget && (
        <MovePreviewModal
          items={movePreviewTarget}
          onClose={() => setMovePreviewTarget(null)}
          onSuccess={() => {
            setSelectedFileId(null);
            refreshSummary();
          }}
        />
      )}

      {/* Toasts */}
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <ScanProvider>
      <MainAppContent />
    </ScanProvider>
  );
}
