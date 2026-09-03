import React, { useState, useMemo, useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import Konva from 'konva';
import { DomainState } from './packages/domain/state';
import { FigureDomainAction } from './packages/domain/reducer';
import { globalDomainStore, globalFigureStore, exportBundle, importBundle } from './packages/domain/store';
import { profileDataset } from './packages/data-model/profiler';
import { WebMcpProvider } from './packages/webmcp';
import { FigureSpec, ExportBundle } from './types';
import {
  MultiPanelFigure,
  Panel,
  CanvasItem,
  CanvasToolMode,
  CanvasTheme,
  PanelKind,
} from './types/multipanel';
import { BUILT_IN_THEMES, NATURE_THEME } from './packages/multipanel/themes';
import { DEFAULT_MULTIPANEL_FIGURE } from './packages/multipanel/defaultFigure';
import { createTidyPanelLayout } from './packages/multipanel/layout';
import {
  loadFigureFromStorage,
  saveFigureToStorage,
  loadCustomThemes,
  saveCustomThemes,
  loadActiveThemeId,
  saveActiveThemeId,
} from './packages/multipanel/storage';
import {
  exportFigureToPng,
  exportFigureToSvg,
  exportFigureToJson,
  exportPanelToPng,
  exportPanelToSvg,
} from './packages/multipanel/exportBundle';
import { TopBar } from './components/layout/TopBar';
import { LeftSidebar, AppView } from './components/layout/LeftSidebar';
import { CanvasToolbar } from './components/layout/CanvasToolbar';
import { FigureCanvas } from './components/canvas/FigureCanvas';
import { RightSidebar } from './components/layout/RightSidebar';
import { FooterBar } from './components/layout/FooterBar';
import { SaveThemeModal } from './components/modals/SaveThemeModal';
import { DashboardView } from './components/views/DashboardView';
import { DataView } from './components/views/DataView';
import { AnalysesView } from './components/views/AnalysesView';
import { NotesView } from './components/views/NotesView';
import { SettingsView } from './components/views/SettingsView';
import { HelpView } from './components/views/HelpView';
import { ProvenanceDrawer } from './components/ProvenanceDrawer';
import { ProposalReviewBanner } from './components/ProposalReviewBanner';
import { WebMcpDevPanel } from './components/WebMcpDevPanel';
import { Sliders } from 'lucide-react';
import { saveDomainState } from './packages/domain/persistence';

export default function App() {
  // ---
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  const [customThemes, setCustomThemes] = useState<CanvasTheme[]>([]);
  const [activeThemeId, setActiveThemeId] = useState<string>('nature');
  const [figure, setFigure] = useState<MultiPanelFigure | null>(DEFAULT_MULTIPANEL_FIGURE as any);
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>('panel-a');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [toolMode, setToolMode] = useState<CanvasToolMode>('select');
  const [zoom, setZoom] = useState<number>(0.85);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [layoutTransitionKey, setLayoutTransitionKey] = useState(0);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  // History stack for Undo / Redo
  const [history, setHistory] = useState<MultiPanelFigure[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Modals & Panels
  const [isSaveThemeModalOpen, setIsSaveThemeModalOpen] = useState(false);
  const [isProvenanceDrawerOpen, setIsProvenanceDrawerOpen] = useState(false);
  const [isWebMcpDevPanelOpen, setIsWebMcpDevPanelOpen] = useState(false);
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(true);
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false);
  const [isMobileInspectorOpen, setIsMobileInspectorOpen] = useState(false);

  const stageRef = useRef<Konva.Stage | null>(null);

  // Initialize from localStorage on mount
  useEffect(() => {
    const loadedFig = loadFigureFromStorage();
    const loadedThemes = loadCustomThemes();
    const loadedThemeId = loadActiveThemeId();

    setFigure(loadedFig);
    setCustomThemes(loadedThemes);
    setActiveThemeId(loadedThemeId);
    setHistory([loadedFig]);
    setHistoryIndex(0);
    globalDomainStore.dispatch({ type: 'LOAD_FIGURE', payload: loadedFig as any });
  }, []);

  // Sync dark class on root document
  useEffect(() => {
    if (themeMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [themeMode]);

  // Compute active theme
  const allThemes = useMemo(() => [...BUILT_IN_THEMES, ...customThemes], [customThemes]);
  const activeTheme = useMemo(() => {
    return allThemes.find((t) => t.id === activeThemeId) || NATURE_THEME;
  }, [allThemes, activeThemeId]);

  // Auto-save figure to localStorage with debounce
  useEffect(() => {
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      saveFigureToStorage(figure);
      setSaveStatus('saved');
    }, 400);
    return () => clearTimeout(timer);
  }, [figure]);

  // Helper to commit state mutation with undo/redo history tracking
  const updateFigureWithHistory = useCallback(
    (updater: (prev: MultiPanelFigure) => MultiPanelFigure) => {
      setFigure((prev) => {
        const next = updater(prev);
        setHistory((prevHist) => {
          const truncated = prevHist.slice(0, historyIndex + 1);
          const nextHist = [...truncated, next];
          if (nextHist.length > 30) {
            return nextHist.slice(nextHist.length - 30);
          }
          return nextHist;
        });
        setHistoryIndex((prevIdx) => Math.min(prevIdx + 1, 29));
        globalDomainStore.dispatch({ type: 'LOAD_FIGURE', payload: next as any });
        return next;
      });
    },
    [historyIndex]
  );

  // Undo / Redo handlers
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const targetIdx = historyIndex - 1;
      const targetFig = history[targetIdx];
      setHistoryIndex(targetIdx);
      setFigure(targetFig);
      saveFigureToStorage(targetFig);
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const targetIdx = historyIndex + 1;
      const targetFig = history[targetIdx];
      setHistoryIndex(targetIdx);
      setFigure(targetFig);
      saveFigureToStorage(targetFig);
    }
  }, [historyIndex, history]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input / textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'v' || e.key === 'V') {
        setToolMode('select');
      } else if (e.key === 'h' || e.key === 'H') {
        setToolMode('pan');
      } else if (e.key === 'z' || e.key === 'Z') {
        setToolMode('zoom');
      } else if (e.key === 't' || e.key === 'T') {
        setToolMode('text');
      } else if (e.key === 'r' || e.key === 'R') {
        setToolMode('shape');
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDeleteSelected();
      } else if (e.key === 'Escape') {
        setSelectedPanelId(null);
        setSelectedItemId(null);
        setToolMode('select');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Figure title rename
  const handleRenameFigure = (newTitle: string) => {
    updateFigureWithHistory((prev) => ({
      ...prev,
      name: newTitle,
    }));
  };

  // Panel Frame update
  const handleUpdatePanelFrame = (
    panelId: string,
    frame: { x: number; y: number; width: number; height: number }
  ) => {
    updateFigureWithHistory((prev) => ({
      ...prev,
      panels: prev.panels.map((p) => (p.id === panelId ? { ...p, frame } : p)),
    }));
  };

  // Panel Spec update
  const handleUpdatePanelSpec = (panelId: string, spec: any) => {
    updateFigureWithHistory((prev) => ({
      ...prev,
      panels: prev.panels.map((p) => (p.id === panelId ? { ...p, spec } : p)),
    }));
  };

  // Convert Panel Kind
  const handleConvertPanelKind = (panelId: string, newKind: PanelKind) => {
    updateFigureWithHistory((prev) => {
      const panel = prev.panels.find((p) => p.id === panelId);
      if (!panel) return prev;

      let newSpec: any;
      if (newKind === 'forest-plot') {
        newSpec = {
          kind: 'forest-plot',
          title: 'Odds Ratio (95% CI)',
          model: 'IV, Random Effects',
          effectMeasure: 'Odds Ratio (OR)',
          xAxis: { scale: 'log', min: 0.1, max: 10, referenceLine: 1 },
          showCi95: true,
          showWeights: true,
          showDataPoints: true,
          showErrorBars: true,
          showReferenceBars: true,
          showLabels: true,
          showAxes: true,
          studies: [
            { id: 's1', study: 'Study A (2020)', effect: 0.65, ciLower: 0.42, ciUpper: 0.98, weight: 24.5 },
            { id: 's2', study: 'Study B (2021)', effect: 0.82, ciLower: 0.58, ciUpper: 1.15, weight: 35.2 },
            { id: 's3', study: 'Study C (2023)', effect: 0.55, ciLower: 0.35, ciUpper: 0.85, weight: 40.3 },
          ],
          pooledEstimate: { effect: 0.68, ciLower: 0.52, ciUpper: 0.88, weightTotal: 100, label: 'Total (95% CI)' },
        };
      } else if (newKind === 'funnel-plot') {
        newSpec = {
          kind: 'funnel-plot',
          title: 'Funnel Plot',
          xAxis: { min: -2, max: 2, title: 'Odds Ratio (log scale)' },
          yAxis: { min: 0.0, max: 2.0, title: 'SE (log OR)' },
          showFunnelGuides: true,
          showDataPoints: true,
          showLabels: true,
          showAxes: true,
          points: [
            { id: 'p1', study: 'Study 1', effect: -0.4, standardError: 0.3 },
            { id: 'p2', study: 'Study 2', effect: 0.2, standardError: 0.6 },
            { id: 'p3', study: 'Study 3', effect: -0.1, standardError: 0.9 },
          ],
        };
      } else if (newKind === 'grouped-bar') {
        newSpec = {
          kind: 'grouped-bar',
          title: 'Outcome Rates',
          yAxis: { min: 0, max: 40, title: 'Event Rate (%)' },
          groups: [
            { id: 'g1', category: 'Bleeding', treatmentVal: 18, controlVal: 28 },
            { id: 'g2', category: 'Mortality', treatmentVal: 12, controlVal: 22 },
          ],
          legend: { treatmentLabel: 'Treatment', controlLabel: 'Control' },
          showDataPoints: true,
          showLabels: true,
          showAxes: true,
          showGrid: true,
        };
      } else if (newKind === 'subgroup-analysis') {
        newSpec = {
          kind: 'subgroup-analysis',
          title: 'Subgroup Analysis',
          xAxis: { min: 0.1, max: 10, referenceLine: 1 },
          subgroups: [
            { id: 'sg1', groupName: 'Group 1', effect: 0.68, ciLower: 0.5, ciUpper: 0.93, iSquared: 42 },
            { id: 'sg2', groupName: 'Group 2', effect: 0.75, ciLower: 0.54, ciUpper: 1.04, iSquared: 28 },
          ],
          showDataPoints: true,
          showErrorBars: true,
          showReferenceBars: true,
          showLabels: true,
          showAxes: true,
        };
      } else if (newKind === 'volcano-plot') {
        newSpec = {
          kind: 'volcano-plot',
          title: 'Volcano Plot',
          significanceThreshold: 0.05,
          spec: {
            title: 'Volcano Plot',
            figureIntent: 'relationship',
            mark: 'point',
            encoding: {
              x: { field: 'bill_length_mm', type: 'quantitative', axisTitle: 'Effect / fold change' },
              y: { field: 'body_mass_g', type: 'quantitative', axisTitle: 'Significance' },
            },
            showsRawObservations: true,
            uncertaintyEncoding: 'raw-points-only',
          },
        };
      } else if (newKind === 'heatmap') {
        newSpec = {
          kind: 'heatmap',
          title: 'Expression Heatmap',
          spec: {
            title: 'Expression Heatmap',
            figureIntent: 'relationship',
            mark: 'point',
            encoding: {
              x: { field: 'species', type: 'categorical', axisTitle: 'Group' },
              y: { field: 'island', type: 'categorical', axisTitle: 'Sample / condition' },
              color: { field: 'body_mass_g', type: 'quantitative', axisTitle: 'Expression' },
            },
            showsRawObservations: true,
            uncertaintyEncoding: 'raw-points-only',
          },
        };
      } else if (newKind === 'text-caption') {
        newSpec = {
          kind: 'text-caption',
          title: 'Figure Caption',
          captionText: 'Detailed scientific notes and methodology overview.',
          fontSize: 12,
        };
      } else {
        newSpec = {
          kind: 'single-chart',
          spec: {
          title: 'WebMCP Chart',
            mark: 'bar',
            encoding: {
              x: { field: 'species', type: 'nominal' },
              y: { field: 'body_mass_g', type: 'quantitative', aggregate: 'mean' },
            },
          },
        };
      }

      return {
        ...prev,
        panels: prev.panels.map((p) => (p.id === panelId ? { ...p, spec: newSpec } : p)),
      };
    });
  };

  // Layer Visibility & Lock Toggles
  const handleToggleLayerVisibility = (panelId: string) => {
    updateFigureWithHistory((prev) => ({
      ...prev,
      layers: prev.layers.map((l) => (l.panelId === panelId ? { ...l, visible: !l.visible } : l)),
    }));
  };

  const handleToggleLayerLock = (panelId: string) => {
    updateFigureWithHistory((prev) => ({
      ...prev,
      layers: prev.layers.map((l) => (l.panelId === panelId ? { ...l, locked: !l.locked } : l)),
    }));
  };

  // Layer Reordering
  const handleReorderLayer = (panelId: string, direction: 'up' | 'down') => {
    updateFigureWithHistory((prev) => {
      const idx = prev.layers.findIndex((l) => l.panelId === panelId);
      if (idx === -1) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.layers.length) return prev;

      const newLayers = [...prev.layers];
      const temp = newLayers[idx];
      newLayers[idx] = newLayers[targetIdx];
      newLayers[targetIdx] = temp;

      return {
        ...prev,
        layers: newLayers.map((l, i) => ({ ...l, order: i })),
      };
    });
  };

  // Delete Layer / Panel
  const handleDeleteLayer = (panelId: string) => {
    updateFigureWithHistory((prev) => {
      if (prev.panels.length <= 1) return prev;
      const nextPanels = prev.panels.filter((p) => p.id !== panelId);
      const nextLayers = prev.layers
        .filter((l) => l.panelId !== panelId)
        .map((l, idx) => ({ ...l, order: idx }));
      return {
        ...prev,
        panels: nextPanels,
        layers: nextLayers,
      };
    });
    if (selectedPanelId === panelId) {
      const remaining = figure.panels.find((p) => p.id !== panelId);
      setSelectedPanelId(remaining ? remaining.id : null);
    }
  };

  // Canvas Settings (Resolution / Dimensions)
  const handleUpdateCanvasSettings = (settings: { width: number; height: number; dpi: number; background: string }) => {
    updateFigureWithHistory((prev) => ({
      ...prev,
      canvasSize: {
        width: settings.width,
        height: settings.height,
      },
    }));
  };

  // Elements Toggle (Axes, Grid, Data Points, Error Bars, etc.)
  const handleToggleElement = (elementKey: string) => {
    if (!selectedPanelId) return;
    updateFigureWithHistory((prev) => {
      const panel = prev.panels.find((p) => p.id === selectedPanelId);
      if (!panel) return prev;
      const currentVal = (panel.spec as any)[elementKey];
      const nextVal = currentVal === undefined ? false : !currentVal;

      return {
        ...prev,
        panels: prev.panels.map((p) =>
          p.id === selectedPanelId
            ? {
                ...p,
                spec: {
                  ...p.spec,
                  [elementKey]: nextVal,
                },
              }
            : p
        ),
      };
    });
  };

  // Manual Canvas Items
  const handleAddManualItem = (item: CanvasItem) => {
    updateFigureWithHistory((prev) => ({
      ...prev,
      manualItems: [...prev.manualItems, item],
    }));
    setToolMode('select');
  };

  const handleUpdateManualItem = (item: CanvasItem) => {
    updateFigureWithHistory((prev) => ({
      ...prev,
      manualItems: prev.manualItems.map((m) => (m.id === item.id ? item : m)),
    }));
  };

  const handleUploadImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      const newItem: CanvasItem = {
        id: `img-${Date.now()}`,
        type: 'image',
        src,
        x: 200,
        y: 200,
        width: 200,
        height: 150,
        order: figure.manualItems.length,
      };
      handleAddManualItem(newItem);
    };
    reader.readAsDataURL(file);
  };

  // Delete Selected (Panel or Item)
  const handleDeleteSelected = () => {
    if (selectedPanelId) {
      updateFigureWithHistory((prev) => ({
        ...prev,
        panels: prev.panels.filter((p) => p.id !== selectedPanelId),
        layers: prev.layers.filter((l) => l.panelId !== selectedPanelId),
      }));
      setSelectedPanelId(null);
    } else if (selectedItemId) {
      updateFigureWithHistory((prev) => ({
        ...prev,
        manualItems: prev.manualItems.filter((m) => m.id !== selectedItemId),
      }));
      setSelectedItemId(null);
    }
  };

  // Duplicate Selected
  const handleDuplicateSelected = () => {
    if (selectedPanelId) {
      const panel = figure.panels.find((p) => p.id === selectedPanelId);
      if (!panel) return;
      const newId = `panel-${Date.now()}`;
      const newLetter = String.fromCharCode(65 + figure.panels.length);
      const newPanel: Panel = {
        ...panel,
        id: newId,
        letter: newLetter,
        label: `Panel ${newLetter}`,
        frame: {
          ...panel.frame,
          x: panel.frame.x + 30,
          y: panel.frame.y + 30,
        },
      };
      updateFigureWithHistory((prev) => ({
        ...prev,
        panels: [...prev.panels, newPanel],
        layers: [
          ...prev.layers,
          {
            id: `layer-${newId}`,
            name: `Panel ${newLetter}`,
            visible: true,
            locked: false,
            panelId: newId,
            order: prev.layers.length,
          },
        ],
      }));
      setSelectedPanelId(newId);
    }
  };

  // Toggle Lock Selected
  const handleToggleLockSelected = () => {
    if (selectedPanelId) {
      handleToggleLayerLock(selectedPanelId);
    } else if (selectedItemId) {
      updateFigureWithHistory((prev) => ({
        ...prev,
        manualItems: prev.manualItems.map((m) =>
          m.id === selectedItemId ? { ...m, locked: !m.locked } : m
        ),
      }));
    }
  };

  // Add New Panel from Left Sidebar '+'
  const handleAddNewPanel = () => {
    const newId = `panel-${Date.now()}`;
    const newLetter = String.fromCharCode(65 + figure.panels.length);
    const newPanel: Panel = {
      id: newId,
      letter: newLetter,
      label: `Panel ${newLetter}`,
      frame: { x: 100, y: 100, width: 500, height: 320 },
      spec: {
        kind: 'forest-plot',
        title: `Study Results (${newLetter})`,
        model: 'IV, Random Effects',
        effectMeasure: 'Odds Ratio (OR)',
        xAxis: { scale: 'log', min: 0.1, max: 10, referenceLine: 1 },
        showCi95: true,
        showWeights: true,
        showDataPoints: true,
        showErrorBars: true,
        showReferenceBars: true,
        showLabels: true,
        showAxes: true,
        studies: [
          { id: 'ns1', study: 'New Study Alpha', effect: 0.72, ciLower: 0.51, ciUpper: 0.98, weight: 45.0 },
          { id: 'ns2', study: 'New Study Beta', effect: 0.61, ciLower: 0.38, ciUpper: 0.89, weight: 55.0 },
        ],
        pooledEstimate: { effect: 0.66, ciLower: 0.5, ciUpper: 0.86, weightTotal: 100, label: 'Total (95% CI)' },
      },
    };

    updateFigureWithHistory((prev) => ({
      ...prev,
      panels: [...prev.panels, newPanel],
      layers: [
        ...prev.layers,
        {
          id: `layer-${newId}`,
          name: `Panel ${newLetter}`,
          visible: true,
          locked: false,
          panelId: newId,
          order: prev.layers.length,
        },
      ],
    }));
    setSelectedPanelId(newId);
  };

  // Arrange Bring to Front / Send to Back
  const handleArrange = (action: 'front' | 'back') => {
    if (selectedPanelId) {
      updateFigureWithHistory((prev) => {
        const layer = prev.layers.find((l) => l.panelId === selectedPanelId);
        if (!layer) return prev;
        const otherLayers = prev.layers.filter((l) => l.panelId !== selectedPanelId);
        const reordered = action === 'front' ? [...otherLayers, layer] : [layer, ...otherLayers];
        return {
          ...prev,
          layers: reordered.map((l, i) => ({ ...l, order: i })),
        };
      });
    }
  };

  const handleTidyLayout = () => {
    updateFigureWithHistory((prev) => createTidyPanelLayout(prev));
    setLayoutTransitionKey((key) => key + 1);
  };

  // Theme Management
  const handleSelectTheme = (themeId: string) => {
    setActiveThemeId(themeId);
    saveActiveThemeId(themeId);
  };

  const handleSaveCustomTheme = (newTheme: CanvasTheme) => {
    const nextCustom = [...customThemes, newTheme];
    setCustomThemes(nextCustom);
    saveCustomThemes(nextCustom);
    setActiveThemeId(newTheme.id);
    saveActiveThemeId(newTheme.id);
  };

  // Exports
  const handleExportFullPng = () => {
    if (stageRef.current) {
      exportFigureToPng(stageRef.current, `${figure.name.toLowerCase().replace(/\s+/g, '-')}.png`);
    }
  };

  const handleExportFullSvg = () => {
    if (stageRef.current) {
      exportFigureToSvg(stageRef.current, `${figure.name.toLowerCase().replace(/\s+/g, '-')}.svg`);
    }
  };

  const handleExportJson = () => {
    exportFigureToJson(figure, `${figure.name.toLowerCase().replace(/\s+/g, '-')}-bundle.json`);
  };

  const handleExportPanelPng = (panelId: string) => {
    if (stageRef.current) {
      exportPanelToPng(stageRef.current, panelId, `panel-${panelId}.png`);
    }
  };

  const handleExportPanelSvg = (panelId: string) => {
    if (stageRef.current) {
      exportPanelToSvg(stageRef.current, panelId, `panel-${panelId}.svg`);
    }
  };

  // WebMCP Domain Store Sync
  const domainState = useSyncExternalStore(
    globalDomainStore.subscribe.bind(globalDomainStore),
    globalDomainStore.getState.bind(globalDomainStore),
    globalDomainStore.getState.bind(globalDomainStore)
  ) as DomainState;

  // WebMCP-facing snapshot derived from the authoritative domain store.
  const figureState = useSyncExternalStore(
    globalFigureStore.subscribe,
    globalFigureStore.getState,
    globalFigureStore.getState
  ) as any;

  const customDispatch = useCallback((action: any) => {
    if (action.type === 'APPLY_PROPOSAL' || action.type === 'PROPOSE_SPEC') {
      return globalFigureStore.dispatch(action);
    }
    return globalDomainStore.dispatch(action);
  }, []);

  // The domain store is authoritative for agent commits as well as figure switches.
  useEffect(() => {
    if (!domainState.figure && currentView !== 'dashboard' && currentView !== 'settings' && currentView !== 'help') {
      setCurrentView('dashboard');
    }
    
    if (domainState.figure && domainState.figure !== figure) {
      setFigure(domainState.figure as any);
      if (domainState.figure.id !== figure?.id) {
        setSelectedPanelId(domainState.figure.panels[0]?.id || null);
      }
    }
  }, [domainState.activeFigureId, domainState.figure, currentView]);

  return (
    <WebMcpProvider
      currentState={{
        ...figureState,
        activeView: currentView,
        activeFigureId: domainState.activeFigureId,
        panelIds: figure?.panels.map((panel) => panel.id) || [],
        panels: figure?.panels || [],
        selectedPanelId,
        selectedPanel: figure?.panels.find((panel) => panel.id === selectedPanelId) || null,
        datasets: domainState.datasets,
      }}
      dispatchDomainAction={customDispatch}
    >
      <div className="flex flex-col h-screen w-screen bg-[#f8f9fa] dark:bg-[#121212] text-[#18181b] dark:text-[#EDEDED] font-sans antialiased overflow-hidden select-none transition-colors">
        {/* Top Navigation Bar */}
        {currentView === 'figures' && figure ? (
          <TopBar
            figureTitle={figure.name}
            onRenameFigure={handleRenameFigure}
            saveStatus={saveStatus}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
            onUndo={handleUndo}
            onRedo={handleRedo}
            theme={themeMode}
            onToggleTheme={() => setThemeMode((prev) => (prev === 'light' ? 'dark' : 'light'))}
            onExportPng={handleExportFullPng}
            onExportSvg={handleExportFullSvg}
            onExportJson={handleExportJson}
            onOpenWebMcpDev={() => setIsWebMcpDevPanelOpen(true)}
            onOpenProvenance={() => setIsProvenanceDrawerOpen(true)}
            onOpenMobileInspector={() => setIsMobileInspectorOpen(true)}
          />
        ) : (
          /* Immersive, clean Outer Shell Header */
          <header className="h-14 w-full bg-white dark:bg-[#121212] border-b border-[#e4e4e7] dark:border-[#27272a] px-4 sm:px-6 flex items-center justify-between select-none shrink-0 z-40 transition-colors">
            {/* Left: Active Workspace / Context Info */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-[#1f1f23] px-2.5 py-1 rounded-md">
                {domainState.workspaces.find((workspace) => workspace.id === domainState.activeWorkspaceId)?.name || 'Workspace'}
              </span>
            </div>

            {/* Right: Theme, Quick Jump */}
            <div className="flex items-center gap-4">
              {/* Quick Launch Editor */}
              {figure && (
                <button
                  onClick={() => setCurrentView('figures')}
                  className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-[#1f1f23] dark:hover:bg-[#27272a] px-3 py-1.5 rounded-lg transition-colors cursor-pointer border border-[#e4e4e7] dark:border-[#27272a]"
                >
                  <span>Launch Editor</span>
                </button>
              )}

              {/* Theme Toggle */}
              <button
                onClick={() => setThemeMode((prev) => (prev === 'light' ? 'dark' : 'light'))}
                className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-[#27272a] transition-colors cursor-pointer"
              >
                {themeMode === 'light' ? (
                  <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
            </div>
          </header>
        )}

        {/* Main Work Area: Left Sidebar + (Current View Component) */}
        <div className="flex-1 flex flex-row min-h-0 overflow-hidden relative">
          {/* Left Sidebar */}
          {figure && (
            <LeftSidebar
              figure={figure}
              selectedPanelId={selectedPanelId}
              activeView={currentView}
              onSelectView={setCurrentView}
              onSelectPanel={(id) => {
                setSelectedPanelId(id);
                setSelectedItemId(null);
              }}
              onToggleLayerVisibility={handleToggleLayerVisibility}
              onToggleLayerLock={handleToggleLayerLock}
              onReorderLayer={handleReorderLayer}
              onToggleElement={handleToggleElement}
              onAddNewPanel={handleAddNewPanel}
              onDeleteLayer={handleDeleteLayer}
              isCollapsed={isLeftSidebarCollapsed}
              onToggleCollapse={() => setIsLeftSidebarCollapsed(!isLeftSidebarCollapsed)}
              figures={domainState.figures.filter((fig) => {
                const activeProj = domainState.projects.find((p) => p.id === domainState.activeProjectId);
                return activeProj?.figureIds.includes(fig.id);
              })}
              activeFigureId={domainState.activeFigureId}
              datasets={domainState.datasets.filter((ds) => {
                const activeProj = domainState.projects.find((p) => p.id === domainState.activeProjectId);
                const activeWs = domainState.workspaces.find((w) => w.id === domainState.activeWorkspaceId);
                return (activeProj?.datasetIds || []).includes(ds.id) || (activeWs?.sharedDatasetIds || []).includes(ds.id);
              })}
              selectedDatasetId={domainState.selectedDatasetId}
              onSwitchFigure={(figId) => {
                globalDomainStore.dispatch({ type: 'SWITCH_FIGURE', payload: figId });
              }}
              onCreateFigure={(name) => {
                globalDomainStore.dispatch({ type: 'CREATE_FIGURE', payload: name ? { name } : undefined });
              }}
              onSelectDataset={(dsId) => {
                globalDomainStore.dispatch({ type: 'SELECT_DATASET', payload: dsId });
              }}
            />
          )}

          {/* Figures Canvas View */}
          {currentView === 'figures' && figure && (
            <>
              {/* Central Canvas Zone */}
              <div className="flex-1 flex flex-col min-w-0 min-h-0 relative overflow-hidden">
                {/* Canvas Toolbar */}
                <CanvasToolbar
                  toolMode={toolMode}
                  onSelectToolMode={setToolMode}
                  onUploadImage={handleUploadImage}
                  onArrange={handleArrange}
                  onTidyLayout={handleTidyLayout}
                />

                <ProposalReviewBanner preview={figureState.activePreview} />

                {/* Stage Canvas */}
                <div className="flex-1 min-h-0 relative flex">
                  <FigureCanvas
                    figure={figure}
                    selectedPanelId={selectedPanelId}
                    selectedItemId={selectedItemId}
                    activeTheme={activeTheme}
                    toolMode={toolMode}
                    zoom={zoom}
                    onZoomChange={setZoom}
                    panOffset={panOffset}
                    onPanChange={setPanOffset}
                    onSelectPanel={(id) => {
                      setSelectedPanelId(id);
                      if (id) setSelectedItemId(null);
                    }}
                    onSelectItem={(id) => {
                      setSelectedItemId(id);
                      if (id) setSelectedPanelId(null);
                    }}
                    onUpdatePanelFrame={handleUpdatePanelFrame}
                    onUpdateManualItem={handleUpdateManualItem}
                    onAddManualItem={handleAddManualItem}
                    onDeleteSelected={handleDeleteSelected}
                    onDuplicateSelected={handleDuplicateSelected}
                    onToggleLockSelected={handleToggleLockSelected}
                    stageRef={stageRef}
                    datasetId={figureState.datasetId}
                    isPendingApproval={!!figureState.activePreview}
                    pendingPanelId={figureState.activePreview?.panelId || null}
                    layoutTransitionKey={layoutTransitionKey}
                  />
                </div>

                {/* Bottom Footer Bar */}
                <FooterBar
                  activeTheme={activeTheme}
                  customThemes={customThemes}
                  onSelectTheme={handleSelectTheme}
                  zoom={zoom}
                  onZoomIn={() => setZoom((z) => Math.min(2.5, Math.round((z + 0.1) * 100) / 100))}
                  onZoomOut={() => setZoom((z) => Math.max(0.3, Math.round((z - 0.1) * 100) / 100))}
                  onResetZoom={() => {
                    setZoom(1.0);
                    setPanOffset({ x: 0, y: 0 });
                  }}
                  onFitCanvas={() => {
                    setZoom(0.85);
                    setPanOffset({ x: 0, y: 0 });
                  }}
                  canvasWidth={figure.canvasSize.width}
                  canvasHeight={figure.canvasSize.height}
                />
              </div>

              {/* Right Sidebar */}
              <RightSidebar
                figure={figure}
                selectedPanelId={selectedPanelId}
                activeTheme={activeTheme}
                onUpdatePanelSpec={handleUpdatePanelSpec}
                onConvertPanelKind={handleConvertPanelKind}
                onOpenSaveThemeModal={() => setIsSaveThemeModalOpen(true)}
                onExportPanelPng={handleExportPanelPng}
                onExportPanelSvg={handleExportPanelSvg}
                onExportFullPng={handleExportFullPng}
                onExportFullSvg={handleExportFullSvg}
                onExportJson={handleExportJson}
                isPendingApproval={!!figureState.activePreview}
                isOpenMobile={isMobileInspectorOpen}
                onCloseMobile={() => setIsMobileInspectorOpen(false)}
                isCollapsed={isRightSidebarCollapsed}
                onToggleCollapse={() => setIsRightSidebarCollapsed(!isRightSidebarCollapsed)}
                selectedDatasetId={domainState.selectedDatasetId}
                availableDatasets={domainState.datasets}
                onSelectDataset={(dsId) => globalDomainStore.dispatch({ type: 'SELECT_DATASET', payload: dsId })}
              />
            </>
          )}

          {/* Dashboard View */}
          {currentView === 'dashboard' && (
            <DashboardView
              domainState={domainState}
              onNavigate={setCurrentView}
              onDispatchAction={customDispatch}
            />
          )}

          {/* Data Management View */}
          {currentView === 'data' && (
            <DataView
              domainState={domainState}
              onNavigate={setCurrentView}
            />
          )}

          {/* Statistical Analyses View */}
          {currentView === 'analyses' && figure && (
            <AnalysesView
              figure={figure}
              selectedDatasetId={domainState.selectedDatasetId}
              availableDatasets={domainState.datasets}
              onSelectDataset={(datasetId) => globalDomainStore.dispatch({ type: 'SELECT_DATASET', payload: datasetId })}
              onUpdatePanelSpec={handleUpdatePanelSpec}
              onNavigate={setCurrentView}
            />
          )}

          {/* Research Notes & Manuscript Studio View */}
          {currentView === 'notes' && figure && (
            <NotesView
              figure={figure}
              domainState={domainState}
              onNavigate={setCurrentView}
            />
          )}

          {/* Settings View */}
          {currentView === 'settings' && figure && (
            <SettingsView
              figure={figure}
              onUpdateCanvasSize={(w, h) =>
                handleUpdateCanvasSettings({ width: w, height: h, dpi: 300, background: '#ffffff' })
              }
              onNavigate={setCurrentView}
            />
          )}

          {/* Help & Guides View */}
          {currentView === 'help' && (
            <HelpView
              onNavigate={setCurrentView}
            />
          )}
        </div>

        {/* Save As Theme Modal */}
        <SaveThemeModal
          isOpen={isSaveThemeModalOpen}
          onClose={() => setIsSaveThemeModalOpen(false)}
          onSaveTheme={handleSaveCustomTheme}
          currentTheme={activeTheme}
        />

        {/* Provenance Drawer */}
        <ProvenanceDrawer
          isOpen={isProvenanceDrawerOpen}
          onClose={() => setIsProvenanceDrawerOpen(false)}
          provenanceLedger={figureState.provenanceLedger}
          currentRevision={figureState.currentRevision}
          onRestoreRevision={(rev) =>
            globalFigureStore.dispatch({ type: 'RESTORE_SNAPSHOT', payload: { targetRevision: rev } })
          }
        />

        {/* WebMCP Dev Panel */}
        {import.meta.env.DEV && (
          <WebMcpDevPanel
            isOpen={isWebMcpDevPanelOpen}
            onClose={() => setIsWebMcpDevPanelOpen(false)}
          />
        )}
      </div>
    </WebMcpProvider>
  );
}
