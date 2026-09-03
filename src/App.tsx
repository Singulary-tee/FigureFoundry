import React, { useState, useMemo, useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import Konva from 'konva';
import { DomainState, getAccessibleDatasetIds } from './packages/domain/state';
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
import { bindPanelToDataset, isDatasetBoundPanel } from './packages/multipanel/datasetBinding';
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
import { ProposalConfirmationModal } from './components/ProposalConfirmationModal';
import { applyFigureRevision } from './packages/domain/commands';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './components/ui/dialog';
import { WebMcpDevPanel } from './components/WebMcpDevPanel';
import { Sliders, AlertTriangle } from 'lucide-react';
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
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

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
    const loadedFig = globalDomainStore.getState().figure || loadFigureFromStorage();
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
      if (!figure) return;
      const next = updater(figure);
      const truncated = history.slice(0, historyIndex + 1);
      const nextHistory = [...truncated, next].slice(-30);
      setFigure(next);
      setHistory(nextHistory);
      setHistoryIndex(nextHistory.length - 1);
      globalDomainStore.dispatch({ type: 'LOAD_FIGURE', payload: next as any, recordProvenance: true });
    },
    [figure, history, historyIndex]
  );

  // Undo / Redo handlers
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const targetIdx = historyIndex - 1;
      const targetFig = history[targetIdx];
      setHistoryIndex(targetIdx);
      setFigure(targetFig);
      saveFigureToStorage(targetFig);
      globalDomainStore.dispatch({ type: 'LOAD_FIGURE', payload: targetFig as any, recordProvenance: true });
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const targetIdx = historyIndex + 1;
      const targetFig = history[targetIdx];
      setHistoryIndex(targetIdx);
      setFigure(targetFig);
      saveFigureToStorage(targetFig);
      globalDomainStore.dispatch({ type: 'LOAD_FIGURE', payload: targetFig as any, recordProvenance: true });
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

  const handleRenameLayer = (panelId: string, name: string) => {
    updateFigureWithHistory((prev) => ({
      ...prev,
      panels: prev.panels.map((panel) => panel.id === panelId ? { ...panel, label: name } : panel),
      layers: prev.layers.map((layer) => layer.panelId === panelId ? { ...layer, name } : layer),
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
          studies: [],
          pooledEstimate: { effect: Number.NaN, ciLower: Number.NaN, ciUpper: Number.NaN, weightTotal: 0, label: 'Awaiting dataset' },
        };
      } else if (newKind === 'funnel-plot') {
        newSpec = {
          kind: 'funnel-plot',
          title: 'Funnel Plot (Study Dispersion)',
          xAxis: { scale: 'log', min: -2, max: 2, title: 'Effect (log scale)' },
          yAxis: { scale: 'linear', min: 0.0, max: 2.0, title: 'Standard error' },
          showFunnelGuides: true,
          showDataPoints: true,
          showLabels: true,
          showAxes: true,
          points: [],
        };
      } else if (newKind === 'grouped-bar') {
        newSpec = {
          kind: 'grouped-bar',
          title: 'Outcome Rates',
          yAxis: { min: 0, max: 40, autoMax: true, title: 'Event Rate (%)' },
          groups: [],
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
          subgroups: [],
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
            mark: 'rect',
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

      // Keep an existing panel-local source; an unbound conversion stays unbound
      // until the scientist explicitly chooses a dataset in the inspector.
      const existingDatasetId = isDatasetBoundPanel(panel.spec) ? panel.spec.datasetId : undefined;
      const existingFieldMapping = isDatasetBoundPanel(panel.spec) ? panel.spec.fieldMapping : undefined;
      const boundSpec = isDatasetBoundPanel(newSpec) && existingDatasetId
        ? bindPanelToDataset(
            { ...newSpec, fieldMapping: existingFieldMapping },
            existingDatasetId,
            profileDataset(existingDatasetId),
          )
        : newSpec;

      return {
        ...prev,
        panels: prev.panels.map((p) => (p.id === panelId ? { ...p, spec: boundSpec } : p)),
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
        dpi: settings.dpi,
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
        studies: [],
        pooledEstimate: { effect: Number.NaN, ciLower: Number.NaN, ciUpper: Number.NaN, weightTotal: 0, label: 'Awaiting dataset' },
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
  const getExportBlockReason = (targetPanelId?: string) => {
    if (!figure) return 'No figure is currently loaded.';
    const visiblePanelIds = new Set(
      figure.layers.filter((layer) => layer.visible).map((layer) => layer.panelId),
    );
    const panels = figure.panels.filter((panel) => !targetPanelId || panel.id === targetPanelId)
      .filter((panel) => !targetPanelId || visiblePanelIds.size === 0 || visiblePanelIds.has(panel.id));
    for (const panel of panels) {
      if (!isDatasetBoundPanel(panel.spec)) continue;
      if (!panel.spec.datasetId) return `${panel.label} has no dataset bound.`;
      if (!getAccessibleDatasetIds(domainState).has(panel.spec.datasetId)) return `${panel.label} is bound to a dataset outside the active project/workspace.`;
      if (panel.spec.bindingIssues?.length) return `${panel.label} has unresolved validation issues: ${panel.spec.bindingIssues.join(' ')}`;
      if (panel.spec.bindingWarnings?.length) return `${panel.label} has unresolved data warnings: ${panel.spec.bindingWarnings.join(' ')}`;
    }
    const figureRuns = domainState.analysisRuns.filter((run) => !run.figureId || run.figureId === figure.id);
    for (const run of figureRuns) {
      if (run.status === 'unavailable') {
        return `Analysis run ${run.operation} is unavailable: ${run.unavailableReason || 'its result cannot be interpreted safely.'}`;
      }
      if (!domainState.datasets.some((dataset) => dataset.id === run.datasetId)) {
        return `Analysis run ${run.operation} references a missing source dataset.`;
      }
      if (!getAccessibleDatasetIds(domainState).has(run.datasetId)) {
        return `Analysis run ${run.operation} references a dataset outside the active project/workspace.`;
      }
    }
    return null;
  };

  const [exportBlockError, setExportBlockError] = useState<string | null>(null);

  const blockExport = (targetPanelId?: string) => {
    const reason = getExportBlockReason(targetPanelId);
    if (reason) {
      setExportBlockError(`Export blocked: ${reason} Resolve the panel validation state before exporting.`);
      return true;
    }
    return false;
  };

  const handleExportFullPng = () => {
    if (blockExport()) return;
    if (stageRef.current) {
      exportFigureToPng(stageRef.current, `${figure.name.toLowerCase().replace(/\s+/g, '-')}.png`);
    }
  };

  const handleExportFullSvg = () => {
    if (blockExport()) return;
    if (stageRef.current) {
      exportFigureToSvg(stageRef.current, `${figure.name.toLowerCase().replace(/\s+/g, '-')}.svg`);
    }
  };

  const handleExportJson = () => {
    if (blockExport()) return;
    const accessibleDatasetIds = getAccessibleDatasetIds(domainState);
    const referencedDatasetIds = new Set([
      ...figure.panels.flatMap((panel) => 'datasetId' in panel.spec && panel.spec.datasetId ? [panel.spec.datasetId] : []),
      ...domainState.analysisRuns.filter((run) => !run.figureId || run.figureId === figure.id).map((run) => run.datasetId),
    ].filter((datasetId) => accessibleDatasetIds.has(datasetId)));
    exportBundle(
      figure,
      `${figure.name.toLowerCase().replace(/\s+/g, '-')}-bundle.json`,
      {
        datasets: domainState.datasets.filter((dataset) => referencedDatasetIds.has(dataset.id)),
        notes: domainState.notesByFigureId[figure.id],
        provenance: domainState.provenanceByFigureId[figure.id],
        analysisRuns: domainState.analysisRuns.filter((run) => !run.figureId || run.figureId === figure.id),
      },
    );
  };

  const handleExportPanelPng = (panelId: string) => {
    if (blockExport(panelId)) return;
    if (stageRef.current) {
      exportPanelToPng(stageRef.current, panelId, `panel-${panelId}.png`);
    }
  };

  const handleExportPanelSvg = (panelId: string) => {
    if (blockExport(panelId)) return;
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
  const accessibleDatasetIds = getAccessibleDatasetIds(domainState);
  const accessibleDatasets = domainState.datasets.filter((dataset) => accessibleDatasetIds.has(dataset.id));
  const activeProject = domainState.projects.find((project) => project.id === domainState.activeProjectId);
  const activeProjectFigures = domainState.figures.filter((candidate) => activeProject?.figureIds.includes(candidate.id));

  // WebMCP-facing snapshot derived from the authoritative domain store.
  const figureState = useSyncExternalStore(
    globalFigureStore.subscribe,
    globalFigureStore.getState,
    globalFigureStore.getState
  ) as any;

  const customDispatch = useCallback((action: any) => {
    if (
      action.type === 'APPLY_PROPOSAL' ||
      action.type === 'PROPOSE_SPEC' ||
      action.type === 'APPROVE_PREVIEW_UI' ||
      action.type === 'CLEAR_PREVIEW'
    ) {
      return globalFigureStore.dispatch(action);
    }
    return globalDomainStore.dispatch(action);
  }, []);

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const confirmationResolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const confirmHandler = useCallback((_details: any): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      confirmationResolverRef.current = resolve;
      setIsReviewModalOpen(true);
    });
  }, []);

  const handleConfirmProposal = useCallback(() => {
    if (!figureState.activePreview) return;
    const prev = figureState.activePreview;
    customDispatch({
      type: 'APPROVE_PREVIEW_UI',
      payload: { previewId: prev.previewId, source: 'inapp-modal' },
    });
    applyFigureRevision(globalFigureStore, {
      previewId: prev.previewId,
      basedOnRevision: prev.basedOnRevision,
      humanApprovalConfirmed: true,
      approvalToken: prev.previewId,
      actor: 'human',
    });
    if (confirmationResolverRef.current) {
      confirmationResolverRef.current(true);
      confirmationResolverRef.current = null;
    }
    setIsReviewModalOpen(false);
  }, [figureState.activePreview, customDispatch]);

  const handleDiscardProposal = useCallback(() => {
    customDispatch({ type: 'CLEAR_PREVIEW' });
    if (confirmationResolverRef.current) {
      confirmationResolverRef.current(false);
      confirmationResolverRef.current = null;
    }
    setIsReviewModalOpen(false);
  }, [customDispatch]);

  const handleCancelProposal = useCallback(() => {
    if (confirmationResolverRef.current) {
      confirmationResolverRef.current(false);
      confirmationResolverRef.current = null;
    }
    setIsReviewModalOpen(false);
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
        setHistory([domainState.figure as any]);
        setHistoryIndex(0);
      }
    }
  }, [domainState.activeFigureId, domainState.figure, currentView]);

  return (
    <WebMcpProvider
      currentState={{
        ...figureState,
        activeView: currentView,
        activeFigureId: domainState.activeFigureId,
        figures: activeProjectFigures,
        panelIds: figure?.panels.map((panel) => panel.id) || [],
        panels: figure?.panels || [],
        selectedPanelId,
        selectedPanel: figure?.panels.find((panel) => panel.id === selectedPanelId) || null,
        datasets: accessibleDatasets,
      }}
      dispatchDomainAction={customDispatch}
      confirmHandler={confirmHandler}
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

        {restoreMessage && <div role="status" className="absolute left-1/2 top-16 z-50 -translate-x-1/2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 shadow-lg dark:border-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200">{restoreMessage}</div>}

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
              onRenameLayer={handleRenameLayer}
              onDeleteFigure={(figureId) => globalDomainStore.dispatch({ type: 'DELETE_FIGURE', payload: figureId })}
              onOpenProvenance={() => setIsProvenanceDrawerOpen(true)}
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
              onCreateWorkspace={() => {
                globalDomainStore.dispatch({ type: 'CREATE_WORKSPACE', payload: { name: 'New Workspace' } });
              }}
              onSelectDataset={(dsId) => {
                globalDomainStore.dispatch({ type: 'SELECT_DATASET', payload: dsId });
              }}
              workspaceName={domainState.workspaces.find((workspace) => workspace.id === domainState.activeWorkspaceId)?.name || 'Workspace'}
              workspaces={domainState.workspaces.map((workspace) => ({ id: workspace.id, name: workspace.name }))}
              activeWorkspaceId={domainState.activeWorkspaceId}
              onSwitchWorkspace={(workspaceId) => globalDomainStore.dispatch({ type: 'SWITCH_WORKSPACE', payload: workspaceId })}
              onRenameWorkspace={(name) => globalDomainStore.dispatch({ type: 'RENAME_WORKSPACE', payload: { workspaceId: domainState.activeWorkspaceId, name } })}
              onDeleteWorkspace={() => {
                const workspace = domainState.workspaces.find((candidate) => candidate.id === domainState.activeWorkspaceId);
                if (workspace) globalDomainStore.dispatch({ type: 'DELETE_WORKSPACE', payload: workspace.id });
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

                <ProposalReviewBanner
                  preview={figureState.activePreview}
                  onReviewAndConfirm={() => setIsReviewModalOpen(true)}
                  onDiscard={handleDiscardProposal}
                />

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
                    accessibleDatasetIds={new Set(figureState.accessibleDatasetIds || [])}
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
                availableDatasets={accessibleDatasets}
                onSelectDataset={(dsId) => globalDomainStore.dispatch({ type: 'SELECT_DATASET', payload: dsId })}
                onUpdateDataset={(datasetId, rows) => globalDomainStore.dispatch({ type: 'UPDATE_DATASET', payload: { id: datasetId, rows } })}
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
              availableDatasets={accessibleDatasets}
              analysisRuns={domainState.analysisRuns}
              onSelectDataset={(datasetId) => globalDomainStore.dispatch({ type: 'SELECT_DATASET', payload: datasetId })}
              onUpdatePanelSpec={handleUpdatePanelSpec}
              onRecordAnalysisRun={(run) => globalDomainStore.dispatch({ type: 'RECORD_ANALYSIS_RUN', payload: run })}
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
              onUpdateCanvasSettings={handleUpdateCanvasSettings}
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
          onRestoreRevision={(rev) => {
            globalFigureStore.dispatch({ type: 'RESTORE_SNAPSHOT', payload: { targetRevision: rev } });
            setRestoreMessage(`Restored revision ${rev}`);
            window.setTimeout(() => setRestoreMessage(null), 3500);
          }}
        />

        {/* WebMCP Proposal Confirmation Modal (In-App) */}
        {figureState.activePreview && (
          <ProposalConfirmationModal
            isOpen={isReviewModalOpen}
            onOpenChange={(open) => {
              if (!open) handleCancelProposal();
            }}
            details={{
              previewId: figureState.activePreview.previewId,
              targetPanelId: figureState.activePreview.panelId || selectedPanelId || 'panel-a',
              title:
                figureState.activePreview.proposedSpec?.title ||
                figureState.activePreview.proposedSpec?.spec?.title ||
                'Untitled figure',
              panelKind: figureState.activePreview.panelKind,
              basedOnRevision: figureState.activePreview.basedOnRevision,
              preview: figureState.activePreview,
            }}
            onConfirm={handleConfirmProposal}
            onDiscard={handleDiscardProposal}
            onCancel={handleCancelProposal}
          />
        )}

        {/* Export Blocked Modal */}
        {exportBlockError && (
          <Dialog open={Boolean(exportBlockError)} onOpenChange={(open) => !open && setExportBlockError(null)}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 text-zinc-900 dark:text-zinc-100">
              <DialogHeader>
                <DialogTitle className="text-sm font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Export Blocked
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-600 dark:text-zinc-300 mt-2">
                  {exportBlockError}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="mt-4">
                <button
                  type="button"
                  onClick={() => setExportBlockError(null)}
                  className="px-3 py-1.5 text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded text-zinc-800 dark:text-zinc-200"
                >
                  Dismiss
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

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
