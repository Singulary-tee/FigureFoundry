import React, { useState, useMemo, useCallback, useSyncExternalStore } from 'react';
import { INITIAL_FIGURE_STATE } from './packages/domain/state';
import { FigureDomainAction } from './packages/domain/reducer';
import { globalFigureStore } from './packages/domain/store';
import { profileDataset } from './packages/data-model/profiler';
import { WebMcpProvider } from './packages/webmcp';
import { FigureSpec } from './types';
import { TopNav } from './components/TopNav';
import { EncodingPanel } from './components/EncodingPanel';
import { VegaFigureView } from './packages/renderer-vega/VegaFigureView';
import { TwoPhaseApprovalBanner } from './components/TwoPhaseApprovalBanner';
import { DatasetDrawer } from './components/DatasetDrawer';
import { ProvenanceDrawer } from './components/ProvenanceDrawer';
import { WebMcpDevPanel } from './components/WebMcpDevPanel';
import { Sliders, BarChart3, Database, History } from 'lucide-react';

function MainWorkbench({
  state,
  dispatch,
  profile,
  theme,
  onToggleTheme
}: {
  state: typeof INITIAL_FIGURE_STATE;
  dispatch: React.Dispatch<FigureDomainAction>;
  profile: ReturnType<typeof profileDataset>;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}) {
  const [isDiffMode, setIsDiffMode] = useState<boolean>(true);
  const [isDatasetDrawerOpen, setIsDatasetDrawerOpen] = useState(false);
  const [isProvenanceDrawerOpen, setIsProvenanceDrawerOpen] = useState(false);
  const [isWebMcpDevPanelOpen, setIsWebMcpDevPanelOpen] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<'canvas' | 'encodings'>('canvas');

  const handleProposeDirectEdit = (newSpec: FigureSpec) => {
    dispatch({
      type: 'PROPOSE_REVISION',
      payload: {
        proposedSpec: newSpec,
        basedOnRevision: state.currentRevision,
        actor: 'human'
      }
    });
  };

  const handleDirectApply = (newSpec: FigureSpec) => {
    dispatch({
      type: 'DIRECT_HUMAN_EDIT',
      payload: {
        newSpec
      }
    });
  };

  const handleApproveUI = (previewId: string) => {
    dispatch({
      type: 'APPROVE_PREVIEW_UI',
      payload: { previewId }
    });
  };

  const handleApplyRevision = (previewId: string, basedOnRevision: number) => {
    dispatch({
      type: 'APPLY_REVISION',
      payload: {
        previewId,
        basedOnRevision,
        humanApprovalConfirmed: true,
        actor: 'human'
      }
    });
  };

  const handleRejectPreview = () => {
    dispatch({ type: 'REJECT_PREVIEW' });
  };

  const handleSelectDataset = (datasetId: string) => {
    if (!datasetId) {
      dispatch({ type: 'CLEAR_DATASET' });
      return;
    }
    dispatch({
      type: 'LOAD_DATASET',
      payload: { datasetId }
    });
  };

  const handleImportDataset = (profile: ReturnType<typeof profileDataset>) => {
    dispatch({
      type: 'IMPORT_DATASET',
      payload: { profile }
    });
    setIsDatasetDrawerOpen(false);
  };

  const handleClearDataset = () => {
    dispatch({ type: 'CLEAR_DATASET' });
    setIsDatasetDrawerOpen(false);
  };

  const handleRestoreRevision = (targetRevision: number) => {
    dispatch({
      type: 'RESTORE_SNAPSHOT',
      payload: { targetRevision }
    });
    setIsProvenanceDrawerOpen(false);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#f8f9fa] dark:bg-[#121212] text-[#18181b] dark:text-[#EDEDED] font-sans antialiased overflow-hidden transition-colors">
      
      <TopNav
        activeDatasetId={state.datasetId}
        currentRevision={state.currentRevision}
        userDatasets={state.userDatasets || []}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onSelectDataset={handleSelectDataset}
        onImportDataset={handleImportDataset}
        onOpenDatasetDrawer={() => setIsDatasetDrawerOpen(true)}
        onOpenProvenanceDrawer={() => setIsProvenanceDrawerOpen(true)}
        onOpenWebMcpDevPanel={() => setIsWebMcpDevPanelOpen(true)}
      />

      <main className="flex-1 flex flex-row overflow-hidden relative min-h-0">
        
        <div className={`${mobileActiveTab === 'encodings' ? 'block absolute inset-0 z-20 bg-white dark:bg-[#171717]' : 'hidden'} md:block md:relative md:z-auto h-full shrink-0 min-h-0`}>
          <EncodingPanel
            currentSpec={state.spec}
            profile={profile}
            onProposeDirectEdit={handleProposeDirectEdit}
            onDirectApply={handleDirectApply}
            isMobileModal={mobileActiveTab === 'encodings'}
            onCloseMobileModal={() => setMobileActiveTab('canvas')}
          />
        </div>

        <section className={`flex-1 p-3 sm:p-4 md:p-5 flex flex-col overflow-y-auto bg-[#f8f9fa] dark:bg-[#121212] min-h-0 ${mobileActiveTab === 'canvas' ? 'flex' : 'hidden md:flex'}`}>
          
          {state.activePreview && (
            <TwoPhaseApprovalBanner
              activePreview={state.activePreview}
              onApproveUI={handleApproveUI}
              onApplyRevision={handleApplyRevision}
              onRejectPreview={handleRejectPreview}
            />
          )}

          <VegaFigureView
            spec={state.spec}
            activePreview={state.activePreview}
            profile={profile}
            isDiffMode={isDiffMode}
            onToggleDiffMode={() => setIsDiffMode(!isDiffMode)}
            theme={theme}
          />
        </section>
      </main>

      <nav className="md:hidden bg-white dark:bg-[#171717] border-t border-[#e4e4e7] dark:border-[#262626] px-2 py-1 flex items-center justify-around z-30 shrink-0 min-h-[56px] transition-colors">
        <button
          onClick={() => setMobileActiveTab('canvas')}
          className={`flex flex-col items-center justify-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors min-h-[44px] min-w-[70px] leading-normal cursor-pointer ${
            mobileActiveTab === 'canvas' ? 'text-[#24b47e] dark:text-[#3ecf8e] bg-[#3ecf8e]/10 font-semibold' : 'text-[#71717a] dark:text-[#8C8C8C] hover:text-[#18181b] dark:hover:text-[#EDEDED]'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-[#24b47e] dark:text-[#3ecf8e] shrink-0" />
          <span>Figure</span>
        </button>

        <button
          onClick={() => setMobileActiveTab('encodings')}
          className={`flex flex-col items-center justify-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors min-h-[44px] min-w-[70px] leading-normal cursor-pointer ${
            mobileActiveTab === 'encodings' ? 'text-[#24b47e] dark:text-[#3ecf8e] bg-[#3ecf8e]/10 font-semibold' : 'text-[#71717a] dark:text-[#8C8C8C] hover:text-[#18181b] dark:hover:text-[#EDEDED]'
          }`}
        >
          <Sliders className="w-4 h-4 shrink-0" />
          <span>Controls</span>
        </button>

        <button
          onClick={() => setIsDatasetDrawerOpen(true)}
          className="flex flex-col items-center justify-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium text-[#71717a] dark:text-[#8C8C8C] hover:text-[#18181b] dark:hover:text-[#EDEDED] transition-colors min-h-[44px] min-w-[70px] leading-normal cursor-pointer"
        >
          <Database className="w-4 h-4 shrink-0" />
          <span>Dataset</span>
        </button>

        <button
          onClick={() => setIsProvenanceDrawerOpen(true)}
          className="flex flex-col items-center justify-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium text-[#71717a] dark:text-[#8C8C8C] hover:text-[#18181b] dark:hover:text-[#EDEDED] transition-colors min-h-[44px] min-w-[70px] leading-normal cursor-pointer"
        >
          <History className="w-4 h-4 shrink-0" />
          <span>History</span>
        </button>
      </nav>

      <DatasetDrawer
        isOpen={isDatasetDrawerOpen}
        onClose={() => setIsDatasetDrawerOpen(false)}
        profile={profile}
        onImportDataset={handleImportDataset}
        onClearDataset={handleClearDataset}
      />

      <ProvenanceDrawer
        isOpen={isProvenanceDrawerOpen}
        onClose={() => setIsProvenanceDrawerOpen(false)}
        provenanceLedger={state.provenanceLedger}
        currentRevision={state.currentRevision}
        onRestoreRevision={handleRestoreRevision}
      />

      <WebMcpDevPanel
        isOpen={isWebMcpDevPanelOpen}
        onClose={() => setIsWebMcpDevPanelOpen(false)}
      />
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  React.useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleToggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const state = useSyncExternalStore(
    cb => globalFigureStore.subscribe(cb),
    () => globalFigureStore.getState(),
    () => globalFigureStore.getState()
  );

  const profile = useMemo(() => profileDataset(state.datasetId), [state.datasetId]);

  const customDispatch = useCallback(
    (action: FigureDomainAction) => {
      return globalFigureStore.dispatch(action);
    },
    []
  );

  const dispatch = useCallback(
    (action: FigureDomainAction) => {
      globalFigureStore.dispatch(action);
    },
    []
  );

  return (
    <WebMcpProvider currentState={state} dispatchDomainAction={customDispatch}>
      <MainWorkbench state={state} dispatch={dispatch} profile={profile} theme={theme} onToggleTheme={handleToggleTheme} />
    </WebMcpProvider>
  );
}
