import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Folder,
  Database,
  TrendingUp,
  Image as ImageIcon,
  FileText,
  Plus,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  FileSpreadsheet,
  HelpCircle,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  Trash2,
  MoveUp,
  MoveDown,
  Undo2,
  Redo2,
  History,
  Sun,
  Moon,
  Download,
  FileCode,
  MoreVertical,
  CheckCircle2,
} from 'lucide-react';
import { MultiPanelFigure, Panel, Layer } from '../../types/multipanel';
import { SidebarSeparator } from './SidebarSeparator';
import { ConfirmDeleteModal, ConfirmDeleteState } from '../modals/ConfirmDeleteModal';

export type AppView = 'figures' | 'dashboard' | 'data' | 'analyses' | 'notes' | 'settings' | 'help';

interface LeftSidebarProps {
  figure: MultiPanelFigure;
  selectedPanelId: string | null;
  activeView: AppView;
  onSelectView: (view: AppView) => void;
  onSelectPanel: (panelId: string) => void;
  onToggleLayerVisibility: (panelId: string) => void;
  onToggleLayerLock: (panelId: string) => void;
  onReorderLayer: (panelId: string, direction: 'up' | 'down') => void;
  onToggleElement: (elementKey: string) => void;
  onAddNewPanel: () => void;
  onDeleteLayer?: (panelId: string) => void;
  onRenameLayer?: (panelId: string, name: string) => void;
  onDeleteFigure?: (figureId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  // Consolidated Top Bar Controls
  figureTitle?: string;
  onRenameFigure?: (title: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onExportPng?: () => void;
  onExportSvg?: () => void;
  onExportJson?: () => void;
  onOpenWebMcpDev?: () => void;
  onOpenProvenance?: () => void;
  saveStatus?: 'saved' | 'saving';
  // Additional workspace/editor parameters
  figures?: any[];
  activeFigureId?: string;
  datasets?: any[];
  selectedDatasetId?: string;
  onSwitchFigure?: (figId: string) => void;
  onCreateFigure?: (name?: string) => void;
  onSelectDataset?: (dsId: string) => void;
  onCreateWorkspace?: () => void;
  workspaceName?: string;
  workspaces?: { id: string; name: string }[];
  activeWorkspaceId?: string;
  onSwitchWorkspace?: (workspaceId: string) => void;
  onRenameWorkspace?: (name: string) => void;
  onDeleteWorkspace?: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  figure,
  selectedPanelId,
  activeView,
  onSelectView,
  onSelectPanel,
  onToggleLayerVisibility,
  onToggleLayerLock,
  onReorderLayer,
  onToggleElement,
  onAddNewPanel,
  onDeleteLayer,
  onRenameLayer,
  onDeleteFigure,
  isCollapsed,
  onToggleCollapse,
  figureTitle = figure.name || 'Untitled Figure',
  onRenameFigure,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  theme = 'light',
  onToggleTheme,
  onExportPng,
  onExportSvg,
  onExportJson,
  onOpenWebMcpDev,
  onOpenProvenance,
  saveStatus = 'saved',
  figures = [],
  activeFigureId,
  datasets = [],
  selectedDatasetId,
  onSwitchFigure,
  onCreateFigure,
  onSelectDataset,
  onCreateWorkspace,
  workspaceName = 'Workspace',
  workspaces = [],
  activeWorkspaceId,
  onSwitchWorkspace,
  onRenameWorkspace,
  onDeleteWorkspace,
}) => {
  const [isFigureExpanded, setIsFigureExpanded] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteState | null>(null);
  const [openQuickMenu, setOpenQuickMenu] = useState<string | null>(null);
  const [editingFigureId, setEditingFigureId] = useState<string | null>(null);
  const [figureNameDraft, setFigureNameDraft] = useState('');
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [layerNameDraft, setLayerNameDraft] = useState('');
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [workspaceEditing, setWorkspaceEditing] = useState(false);
  const [workspaceDraft, setWorkspaceDraft] = useState(workspaceName);

  useEffect(() => {
    if (!openQuickMenu && !workspaceMenuOpen) return;
    const closeMenusOnOutsidePointer = (event: PointerEvent) => {
      if (!(event.target as HTMLElement).closest('[data-options-menu], [data-options-trigger]')) {
        setOpenQuickMenu(null);
        setWorkspaceMenuOpen(false);
      }
    };
    const closeMenusOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenQuickMenu(null);
        setWorkspaceMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeMenusOnOutsidePointer);
    document.addEventListener('keydown', closeMenusOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeMenusOnOutsidePointer);
      document.removeEventListener('keydown', closeMenusOnEscape);
    };
  }, [openQuickMenu, workspaceMenuOpen]);

  // Selected panel's spec element toggles
  const isEditorMode = ['figures', 'data', 'analyses', 'notes'].includes(activeView);
  const selectedPanel = figure.panels.find((p) => p.id === selectedPanelId);
  const specAny = selectedPanel ? (selectedPanel.spec as any) : null;

  if (isCollapsed) {
    return (
      <div className="flex shrink-0 z-30">
        <aside className="w-14 bg-white dark:bg-[#121212] flex flex-col justify-between items-center py-3 select-none shrink-0 transition-all border-r border-[#e4e4e7] dark:border-[#27272a] h-full">
          <div className="flex flex-col items-center">
            <button
              onClick={onToggleCollapse}
              className="p-2 text-[#71717a] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] rounded-md mb-4 cursor-pointer"
              title="Expand sidebar"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>

            {isEditorMode ? (
              <>
                <button
                  onClick={() => onSelectView('dashboard')}
                  className="p-2 text-[#71717a] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] rounded-md mb-4 cursor-pointer text-xs font-bold"
                  title="Exit Editor"
                >
                  <Undo2 className="w-4 h-4 text-[#24b47e]" />
                </button>
                <hr className="w-8 border-[#e4e4e7] dark:border-[#27272a] mb-4" />
                <button
                  onClick={() => onSelectView('figures')}
                  className={`p-2 rounded-md mb-2 cursor-pointer transition-colors ${
                    activeView === 'figures'
                      ? 'bg-[#24b47e] text-white shadow-xs'
                      : 'text-[#71717a] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a]'
                  }`}
                  title="Canvas Editor"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onSelectView('data')}
                  className={`p-2 rounded-md mb-2 cursor-pointer transition-colors ${
                    activeView === 'data'
                      ? 'bg-[#24b47e] text-white shadow-xs'
                      : 'text-[#71717a] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a]'
                  }`}
                  title="Data Tables"
                >
                  <Database className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onSelectView('analyses')}
                  className={`p-2 rounded-md mb-2 cursor-pointer transition-colors ${
                    activeView === 'analyses'
                      ? 'bg-[#24b47e] text-white shadow-xs'
                      : 'text-[#71717a] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a]'
                  }`}
                  title="Statistical Analyses"
                >
                  <TrendingUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onSelectView('notes')}
                  className={`p-2 rounded-md mb-2 cursor-pointer transition-colors ${
                    activeView === 'notes'
                      ? 'bg-[#24b47e] text-white shadow-xs'
                      : 'text-[#71717a] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a]'
                  }`}
                  title="Manuscript Notes"
                >
                  <FileText className="w-4 h-4" />
                </button>
                {onOpenProvenance && (
                  <button
                    onClick={onOpenProvenance}
                    className="p-2 rounded-md mb-2 cursor-pointer transition-colors text-[#71717a] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a]"
                    title="Revision History"
                  >
                    <History className="w-4 h-4" />
                  </button>
                )}
              </>
            ) : (
              // Outer shell mode collapsed: navigate between views
              <>
                <button
                  onClick={() => onSelectView('dashboard')}
                  className={`p-2 rounded-md mb-2 cursor-pointer transition-colors ${
                    activeView === 'dashboard'
                      ? 'bg-[#24b47e] text-white shadow-xs'
                      : 'text-[#71717a] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a]'
                  }`}
                  title="Dashboard"
                >
                  <LayoutDashboard className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onSelectView('data')}
                  className={`p-2 rounded-md mb-2 cursor-pointer transition-colors ${
                    activeView === 'data'
                      ? 'bg-[#24b47e] text-white shadow-xs'
                      : 'text-[#71717a] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a]'
                  }`}
                  title="Dataset"
                >
                  <Database className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onSelectView('analyses')}
                  className={`p-2 rounded-md mb-2 cursor-pointer transition-colors ${
                    activeView === 'analyses'
                      ? 'bg-[#24b47e] text-white shadow-xs'
                      : 'text-[#71717a] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a]'
                  }`}
                  title="Analyses"
                >
                  <TrendingUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onSelectView('notes')}
                  className={`p-2 rounded-md mb-2 cursor-pointer transition-colors ${
                    activeView === 'notes'
                      ? 'bg-[#24b47e] text-white shadow-xs'
                      : 'text-[#71717a] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a]'
                  }`}
                  title="Notes"
                >
                  <FileText className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
          
          {/* Collapsed Bottom */}
          {!isEditorMode && (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => onSelectView('help')}
                className={`p-2 rounded-md cursor-pointer transition-colors ${
                  activeView === 'help'
                    ? 'bg-[#24b47e] text-white'
                    : 'text-[#71717a] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a]'
                }`}
                title="Help"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => onSelectView('settings')}
                className={`p-2 rounded-md cursor-pointer transition-colors ${
                  activeView === 'settings'
                    ? 'bg-[#24b47e] text-white'
                    : 'text-[#71717a] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a]'
                }`}
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          )}
        </aside>
        <SidebarSeparator side="left" isCollapsed={true} onToggle={onToggleCollapse} />
      </div>
    );
  }

  return (
    <div className="flex shrink-0 z-30 h-full">
      <aside className="w-64 bg-white dark:bg-[#121212] flex flex-col justify-between select-none shrink-0 overflow-y-auto transition-colors border-r border-[#e4e4e7] dark:border-[#27272a] h-full">
        <div className="p-3 space-y-5 flex-1 flex flex-col justify-between">
          <div className="space-y-5">
            {isEditorMode ? (
              // 1. Editor Mode: Back to Dashboard, Workspace Modules, Figures switcher, Datasets switcher, and optional Canvas properties
              <>
                <button
                  onClick={() => onSelectView('dashboard')}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-[#1f1f23] dark:hover:bg-[#27272a] text-[#71717a] hover:text-[#0f172a] dark:text-[#a1a1aa] dark:hover:text-[#f4f4f5] rounded-lg text-xs font-bold transition-colors cursor-pointer border border-[#e4e4e7] dark:border-[#27272a] shadow-xs"
                >
                  <Undo2 className="w-4 h-4 rotate-180 text-[#24b47e]" />
                  <span>← Back to Dashboard</span>
                </button>

                {/* Workspace Modules Switcher */}
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2 px-2">
                    Workspace Modules
                  </div>
                  <nav className="space-y-1">
                    <button
                      onClick={() => onSelectView('figures')}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        activeView === 'figures'
                          ? 'bg-[#24b47e]/10 text-[#24b47e] font-bold'
                          : 'text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#f4f4f5] dark:hover:bg-[#1f1f23] hover:text-[#0f172a] dark:hover:text-[#f4f4f5]'
                      }`}
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span>Canvas Editor</span>
                    </button>
                    <button
                      onClick={() => onSelectView('data')}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        activeView === 'data'
                          ? 'bg-[#24b47e]/10 text-[#24b47e] font-bold'
                          : 'text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#f4f4f5] dark:hover:bg-[#1f1f23] hover:text-[#0f172a] dark:hover:text-[#f4f4f5]'
                      }`}
                    >
                      <Database className="w-4 h-4" />
                      <span>Data Tables</span>
                    </button>
                    <button
                      onClick={() => onSelectView('analyses')}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        activeView === 'analyses'
                          ? 'bg-[#24b47e]/10 text-[#24b47e] font-bold'
                          : 'text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#f4f4f5] dark:hover:bg-[#1f1f23] hover:text-[#0f172a] dark:hover:text-[#f4f4f5]'
                      }`}
                    >
                      <TrendingUp className="w-4 h-4" />
                      <span>Statistical Analyses</span>
                    </button>
                    <button
                      onClick={() => onSelectView('notes')}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        activeView === 'notes'
                          ? 'bg-[#24b47e]/10 text-[#24b47e] font-bold'
                          : 'text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#f4f4f5] dark:hover:bg-[#1f1f23] hover:text-[#0f172a] dark:hover:text-[#f4f4f5]'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      <span>Manuscript Notes</span>
                    </button>
                    {onOpenProvenance && (
                      <button
                        onClick={onOpenProvenance}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#f4f4f5] dark:hover:bg-[#1f1f23] hover:text-[#0f172a] dark:hover:text-[#f4f4f5] transition-colors cursor-pointer"
                      >
                        <History className="w-4 h-4" />
                        <span>Revision History</span>
                      </button>
                    )}
                  </nav>
                </div>

                <hr className="border-[#e4e4e7] dark:border-[#27272a]" />

                {/* Figures Switcher */}
                {figures && figures.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between px-2 mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa]">
                        Project Figures
                      </span>
                      {onCreateFigure && (
                        <button
                          onClick={() => onCreateFigure()}
                          title="Create New Figure"
                          className="p-1 rounded text-[#24b47e] hover:bg-[#24b47e]/10 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="space-y-1">
                      {figures.map((fig) => {
                        const isActive = fig.id === figure.id || fig.id === activeFigureId;
                        return (
                          <div key={fig.id} className="relative group">
                            <button
                              onClick={() => onSwitchFigure && onSwitchFigure(fig.id)}
                              className={`w-full flex items-center gap-2 px-2.5 py-1.5 pr-8 rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                                isActive
                                  ? 'bg-[#24b47e]/10 text-[#24b47e] font-bold'
                                  : 'text-[#71717a] hover:bg-[#f4f4f5] dark:text-[#a1a1aa] dark:hover:bg-[#27272a]'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#24b47e]' : 'bg-transparent border border-zinc-400'}`} />
                              {editingFigureId === fig.id ? <input autoFocus value={figureNameDraft} onChange={(event) => setFigureNameDraft(event.target.value)} onClick={(event) => event.stopPropagation()} onBlur={() => { const name = figureNameDraft.trim(); if (name) { onSwitchFigure?.(fig.id); onRenameFigure?.(name); } setEditingFigureId(null); }} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') setEditingFigureId(null); }} aria-label="Figure name" className="min-w-0 w-full rounded border border-[#24b47e] bg-white px-1 py-0.5 text-xs outline-none dark:bg-[#18181b]" /> : <span className="truncate">{fig.name}</span>}
                            </button>
                            <button type="button" data-options-trigger onClick={() => setOpenQuickMenu(openQuickMenu === `figure-${fig.id}` ? null : `figure-${fig.id}`)} className="absolute right-1 top-1 rounded p-0.5 text-[#71717a] opacity-70 hover:bg-white hover:text-[#0f172a] dark:hover:bg-[#27272a] dark:hover:text-white" title="Figure quick options" aria-label={`Figure quick options for ${fig.name}`}><MoreVertical className="h-3.5 w-3.5" /></button>
                            {openQuickMenu === `figure-${fig.id}` && <div data-options-menu className="absolute right-0 top-7 z-20 w-36 rounded-md border border-[#e4e4e7] bg-white p-1 shadow-lg dark:border-[#27272a] dark:bg-[#18181b]"><button type="button" onClick={() => { setFigureNameDraft(fig.name); setEditingFigureId(fig.id); setOpenQuickMenu(null); }} className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-[#f4f4f5] dark:hover:bg-[#27272a]">Rename figure</button><button type="button" onClick={() => { setOpenQuickMenu(null); setConfirmDelete({ isOpen: true, title: `Delete Figure “${fig.name}”`, description: 'This removes the figure from the active project.', confirmLabel: 'Delete Figure', onConfirm: () => onDeleteFigure?.(fig.id) }); }} className="block w-full rounded px-2 py-1.5 text-left text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30">Delete figure</button></div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Datasets Switcher */}
                {datasets && datasets.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between px-2 mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa]">
                        Project Datasets
                      </span>
                    </div>
                    <div className="space-y-1">
                      {datasets.map((ds) => {
                        const isActive = ds.id === selectedDatasetId;
                        return (
                          <button
                            key={ds.id}
                            onClick={() => onSelectDataset && onSelectDataset(ds.id)}
                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                              isActive
                                ? 'bg-amber-500/10 text-amber-500 font-bold'
                                : 'text-[#71717a] hover:bg-[#f4f4f5] dark:text-[#a1a1aa] dark:hover:bg-[#27272a]'
                            }`}
                          >
                            <Database className="w-3.5 h-3.5 text-zinc-500" />
                            <span className="truncate">{ds.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <hr className="border-[#e4e4e7] dark:border-[#27272a]" />

                {/* Only render Layers and Elements if activeView is 'figures' (actual Canvas Editor) */}
                {activeView === 'figures' && (
                  <>
                    {/* Layers Section */}
                    <div>
                      <div className="flex items-center justify-between px-2 mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa]">
                          Layers
                        </span>
                        <button
                          onClick={onAddNewPanel}
                          title="Add layer / panel"
                          className="p-1 rounded text-[#71717a] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] hover:text-[#0f172a] dark:hover:text-[#f4f4f5] transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Collapsible Figure 1 Group */}
                      <div className="space-y-0.5">
                        <button
                          onClick={() => setIsFigureExpanded(!isFigureExpanded)}
                          className="w-full flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-[#71717a] dark:text-[#a1a1aa] hover:text-[#0f172a] dark:hover:text-[#f4f4f5] cursor-pointer"
                        >
                          {isFigureExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                          <span>Figure Panels</span>
                        </button>

                        {isFigureExpanded && (
                          <div className="pl-2 space-y-0.5">
                            {figure.layers
                              .slice()
                              .sort((a, b) => a.order - b.order)
                              .map((layer, index) => {
                                const panel = figure.panels.find((p) => p.id === layer.panelId);
                                const isSelected = selectedPanelId === layer.panelId;

                                return (
                                  <div
                                    key={layer.id}
                                    onClick={() => onSelectPanel(layer.panelId)}
                                    className={`relative flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors cursor-pointer group ${
                                      isSelected
                                        ? 'bg-[#f4f4f5] dark:bg-[#27272a] font-semibold text-[#0f172a] dark:text-[#f4f4f5]'
                                        : 'text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#fafafa] dark:hover:bg-[#1f1f23]'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <FileSpreadsheet className="w-3.5 h-3.5 text-[#71717a] shrink-0" />
                                      {editingLayerId === layer.panelId ? <input autoFocus value={layerNameDraft} onChange={(event) => setLayerNameDraft(event.target.value)} onClick={(event) => event.stopPropagation()} onBlur={() => { const name = layerNameDraft.trim(); if (name) onRenameLayer?.(layer.panelId, name); setEditingLayerId(null); }} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') setEditingLayerId(null); }} aria-label="Layer name" className="min-w-0 w-full rounded border border-[#24b47e] bg-white px-1 py-0.5 text-xs outline-none dark:bg-[#18181b]" /> : <span className="truncate">{panel?.label || layer.name}</span>}
                                    </div>

                                    <div className="flex items-center gap-1">
                                      <button type="button" data-options-trigger onClick={(e) => { e.stopPropagation(); setOpenQuickMenu(openQuickMenu === `layer-${layer.panelId}` ? null : `layer-${layer.panelId}`); }} title="Layer quick options" aria-label={`Layer quick options for ${panel?.label || layer.name}`} className="rounded p-0.5 text-[#71717a] opacity-80 hover:bg-white hover:text-[#0f172a] group-hover:opacity-100 dark:hover:bg-[#27272a] dark:hover:text-white"><MoreVertical className="h-3.5 w-3.5" /></button>

                                      {/* Reorder Up/Down */}
                                      {index > 0 && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onReorderLayer(layer.panelId, 'up');
                                          }}
                                          title="Move up"
                                          className="p-0.5 text-[#71717a] hover:text-[#0f172a] dark:hover:text-[#f4f4f5] cursor-pointer"
                                        >
                                          <MoveUp className="w-3 h-3" />
                                        </button>
                                      )}
                                      {index < figure.layers.length - 1 && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onReorderLayer(layer.panelId, 'down');
                                          }}
                                          title="Move down"
                                          className="p-0.5 text-[#71717a] hover:text-[#0f172a] dark:hover:text-[#f4f4f5] cursor-pointer"
                                        >
                                          <MoveDown className="w-3 h-3" />
                                        </button>
                                      )}

                                      {/* Visibility Eye Toggle */}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onToggleLayerVisibility(layer.panelId);
                                        }}
                                        title={layer.visible ? 'Hide layer' : 'Show layer'}
                                        className="p-0.5 text-[#71717a] hover:text-[#0f172a] dark:hover:text-[#f4f4f5] cursor-pointer"
                                      >
                                        {layer.visible ? (
                                          <Eye className="w-3.5 h-3.5" />
                                        ) : (
                                          <EyeOff className="w-3.5 h-3.5 text-[#a1a1aa]" />
                                        )}
                                      </button>

                                      {/* Lock Toggle */}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onToggleLayerLock(layer.panelId);
                                        }}
                                        title={layer.locked ? 'Unlock' : 'Lock'}
                                        className="p-0.5 text-[#71717a] hover:text-[#0f172a] dark:hover:text-[#f4f4f5] cursor-pointer"
                                      >
                                        {layer.locked ? (
                                          <Lock className="w-3.5 h-3.5 text-[#d97706]" />
                                        ) : (
                                          <Unlock className="w-3.5 h-3.5 text-[#a1a1aa]" />
                                        )}
                                      </button>

                                      {/* Delete Layer button if multiple panels exist */}
                                      {figure.panels.length > 1 && onDeleteLayer && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setConfirmDelete({
                                              isOpen: true,
                                              title: `Delete Panel "${panel.label}"`,
                                              description: `Are you sure you want to delete panel "${panel.label}" from this figure layout?`,
                                              confirmLabel: 'Delete Panel',
                                              onConfirm: () => {
                                                onDeleteLayer(layer.panelId);
                                              },
                                            });
                                          }}
                                          title="Delete panel"
                                          className="p-0.5 text-[#71717a] hover:text-rose-500 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                    {openQuickMenu === `layer-${layer.panelId}` && <div data-options-menu className="absolute right-0 top-7 z-30 w-36 rounded-md border border-[#e4e4e7] bg-white p-1 text-left shadow-lg opacity-100 dark:border-[#27272a] dark:bg-[#18181b]"><button type="button" onClick={() => { setEditingLayerId(layer.panelId); setLayerNameDraft(panel?.label || layer.name); setOpenQuickMenu(null); }} className="block w-full rounded px-2 py-1.5 text-xs hover:bg-[#f4f4f5] dark:hover:bg-[#27272a]">Rename layer</button><button type="button" onClick={() => { setOpenQuickMenu(null); setConfirmDelete({ isOpen: true, title: `Delete Layer “${panel?.label || layer.name}”`, description: 'This removes the panel from the figure layout.', confirmLabel: 'Delete Layer', onConfirm: () => onDeleteLayer?.(layer.panelId) }); }} className="block w-full rounded px-2 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30">Delete layer</button></div>}
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Elements Section - Hidden if panel doesn't support them */}
                    {activeView === 'figures' && specAny && specAny.kind !== 'single-chart' && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between px-2 mb-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa]">
                            Elements
                          </span>
                        </div>

                        <div className="space-y-0.5 px-2">
                        <button
                          onClick={() => onToggleElement('showAxes')}
                          className={`w-full flex items-center justify-between py-1 text-xs transition-colors cursor-pointer ${
                            specAny?.showAxes !== false ? 'text-[#0f172a] dark:text-[#f4f4f5]' : 'text-[#a1a1aa]'
                          }`}
                        >
                          <span>Axes</span>
                          <span className={`w-2 h-2 rounded-full ${specAny?.showAxes !== false ? 'bg-[#24b47e]' : 'bg-zinc-400'}`} />
                        </button>

                        <button
                          onClick={() => onToggleElement('showGrid')}
                          className={`w-full flex items-center justify-between py-1 text-xs transition-colors cursor-pointer ${
                            specAny?.showGrid ? 'text-[#0f172a] dark:text-[#f4f4f5]' : 'text-[#a1a1aa]'
                          }`}
                        >
                          <span>Grid</span>
                          <span className={`w-2 h-2 rounded-full ${specAny?.showGrid ? 'bg-[#24b47e]' : 'bg-zinc-400'}`} />
                        </button>

                        <button
                          onClick={() => onToggleElement('showDataPoints')}
                          className={`w-full flex items-center justify-between py-1 text-xs transition-colors cursor-pointer ${
                            specAny?.showDataPoints !== false ? 'text-[#0f172a] dark:text-[#f4f4f5] font-medium' : 'text-[#a1a1aa]'
                          }`}
                        >
                          <span>Data Points</span>
                          <span className={`w-2 h-2 rounded-full ${specAny?.showDataPoints !== false ? 'bg-[#24b47e]' : 'bg-zinc-400'}`} />
                        </button>

                        <button
                          onClick={() => onToggleElement('showErrorBars')}
                          className={`w-full flex items-center justify-between py-1 text-xs transition-colors cursor-pointer ${
                            specAny?.showErrorBars !== false ? 'text-[#0f172a] dark:text-[#f4f4f5]' : 'text-[#a1a1aa]'
                          }`}
                        >
                          <span>± Error Bars</span>
                          <span className={`w-2 h-2 rounded-full ${specAny?.showErrorBars !== false ? 'bg-[#24b47e]' : 'bg-zinc-400'}`} />
                        </button>

                        <button
                          onClick={() => onToggleElement('showReferenceBars')}
                          className={`w-full flex items-center justify-between py-1 text-xs transition-colors cursor-pointer ${
                            specAny?.showReferenceBars !== false ? 'text-[#0f172a] dark:text-[#f4f4f5]' : 'text-[#a1a1aa]'
                          }`}
                        >
                          <span>─ Reference Bars</span>
                          <span className={`w-2 h-2 rounded-full ${specAny?.showReferenceBars !== false ? 'bg-[#24b47e]' : 'bg-zinc-400'}`} />
                        </button>

                        <button
                          onClick={() => onToggleElement('showLabels')}
                          className={`w-full flex items-center justify-between py-1 text-xs transition-colors cursor-pointer ${
                            specAny?.showLabels !== false ? 'text-[#0f172a] dark:text-[#f4f4f5]' : 'text-[#a1a1aa]'
                          }`}
                        >
                          <span>T Labels</span>
                          <span className={`w-2 h-2 rounded-full ${specAny?.showLabels !== false ? 'bg-[#24b47e]' : 'bg-zinc-400'}`} />
                        </button>
                      </div>
                    </div>
                    )}
                  </>
                )}
              </>
            ) : (
              // 2. Outer Shell Mode: Logo, Dashboard-level links, and "Open Editor" CTA
              <>
                {/* Product Logo / Branding */}
                <div className="flex items-center gap-2.5 px-2.5 py-1">
                  <div className="w-8 h-8 flex items-center justify-center shrink-0">
                    <img src="/logo-mark.webp" alt="FigureFoundry Logo" className="w-8 h-8 shrink-0 object-contain block" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <span className="font-bold text-sm tracking-tight text-[#0f172a] dark:text-[#f4f4f5]">
                      FigureFoundry
                    </span>
                    <span className="text-[10px] text-[#71717a] dark:text-[#a1a1aa] font-medium leading-none">
                      Scientific Composition
                    </span>
                  </div>
                </div>

                <hr className="border-[#e4e4e7] dark:border-[#27272a]" />

                <section aria-label="Workspace switcher" className="rounded-lg border border-[#e4e4e7] bg-[#fafafa] p-2.5 dark:border-[#27272a] dark:bg-[#18181b]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Workspace</span>
                      {workspaceEditing ? <input autoFocus value={workspaceDraft} onChange={(event) => setWorkspaceDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { if (workspaceDraft.trim()) onRenameWorkspace?.(workspaceDraft.trim()); setWorkspaceEditing(false); } if (event.key === 'Escape') setWorkspaceEditing(false); }} className="mt-1 w-full rounded border border-[#24b47e] bg-white px-1 py-0.5 text-xs font-semibold outline-none dark:bg-[#121212]" aria-label="Workspace name" /> : <span className="mt-1 block truncate text-xs font-semibold text-[#0f172a] dark:text-[#f4f4f5]">{workspaceName}</span>}
                    </div>
                    {onCreateWorkspace && (
                      <button type="button" onClick={onCreateWorkspace} title="Create workspace" aria-label="Create workspace" className="rounded p-1 text-[#24b47e] hover:bg-white hover:text-[#168a5b] dark:hover:bg-[#27272a] dark:hover:text-[#52d69a]"><Plus className="h-3.5 w-3.5" /></button>
                    )}
                    <div className="relative shrink-0">
                      <button type="button" data-options-trigger onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)} title="Workspace options" aria-label="Workspace options" className="rounded p-1 text-[#71717a] hover:bg-white hover:text-[#0f172a] dark:hover:bg-[#27272a] dark:hover:text-white"><MoreVertical className="h-3.5 w-3.5" /></button>
                      {workspaceMenuOpen && <div data-options-menu className="absolute right-0 top-7 z-20 w-40 rounded-md border border-[#e4e4e7] bg-white p-1 shadow-lg opacity-100 dark:border-[#27272a] dark:bg-[#18181b]"><button type="button" onClick={() => { setWorkspaceDraft(workspaceName); setWorkspaceEditing(true); setWorkspaceMenuOpen(false); }} className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-[#f4f4f5] dark:hover:bg-[#27272a]">Rename workspace</button><button type="button" onClick={() => { setWorkspaceMenuOpen(false); setConfirmDelete({ isOpen: true, title: `Delete workspace “${workspaceName}”`, description: 'This removes the workspace and its projects. A replacement workspace is kept when this is the last one.', confirmLabel: 'Delete workspace', onConfirm: () => onDeleteWorkspace?.() }); }} className="block w-full rounded px-2 py-1.5 text-left text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30">Delete workspace</button></div>}
                    </div>
                  </div>
                  <span className="mt-3 block border-t border-[#e4e4e7] pt-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:border-[#27272a]">Other workspaces</span>
                  <div className="mt-1 space-y-0.5">{workspaces.filter((workspace) => workspace.id !== activeWorkspaceId).map((workspace) => <button key={workspace.id} type="button" onClick={() => onSwitchWorkspace?.(workspace.id)} className="block w-full truncate rounded px-2 py-1.5 text-left text-xs text-[#71717a] hover:bg-white hover:text-[#0f172a] dark:text-[#a1a1aa] dark:hover:bg-[#27272a] dark:hover:text-white">{workspace.name}</button>)}{workspaces.filter((workspace) => workspace.id !== activeWorkspaceId).length === 0 && <span className="block px-2 py-1 text-[11px] text-zinc-400">No other workspaces</span>}</div>
                </section>

                {/* Navigation Items */}
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2 px-2.5">
                    Platform Shell
                  </div>
                  <nav className="space-y-1">
                    <button
                      onClick={() => onSelectView('dashboard')}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        activeView === 'dashboard'
                          ? 'bg-[#24b47e]/10 text-[#24b47e] font-bold'
                          : 'text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#f4f4f5] dark:hover:bg-[#1f1f23] hover:text-[#0f172a] dark:hover:text-[#f4f4f5]'
                      }`}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <span>Dashboard</span>
                    </button>
                    <button
                      onClick={() => onSelectView('data')}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        activeView === 'data'
                          ? 'bg-[#24b47e]/10 text-[#24b47e] font-bold'
                          : 'text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#f4f4f5] dark:hover:bg-[#1f1f23] hover:text-[#0f172a] dark:hover:text-[#f4f4f5]'
                      }`}
                    >
                      <Database className="w-4 h-4" />
                      <span>Data Tables</span>
                    </button>
                    <button
                      onClick={() => onSelectView('analyses')}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        activeView === 'analyses'
                          ? 'bg-[#24b47e]/10 text-[#24b47e] font-bold'
                          : 'text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#f4f4f5] dark:hover:bg-[#1f1f23] hover:text-[#0f172a] dark:hover:text-[#f4f4f5]'
                      }`}
                    >
                      <TrendingUp className="w-4 h-4" />
                      <span>Statistical Analyses</span>
                    </button>
                    <button
                      onClick={() => onSelectView('notes')}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        activeView === 'notes'
                          ? 'bg-[#24b47e]/10 text-[#24b47e] font-bold'
                          : 'text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#f4f4f5] dark:hover:bg-[#1f1f23] hover:text-[#0f172a] dark:hover:text-[#f4f4f5]'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      <span>Manuscript Notes</span>
                    </button>
                  </nav>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer / Settings Section (Only in Outer Shell, or nicely formatted in both) */}
        <div className="p-3 border-t border-[#e4e4e7] dark:border-[#27272a] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => onSelectView('help')}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                activeView === 'help'
                  ? 'bg-[#24b47e] text-white shadow-xs'
                  : 'text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] hover:text-[#0f172a] dark:hover:text-[#f4f4f5]'
              }`}
              title="Help & Guides"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              onClick={() => onSelectView('settings')}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                activeView === 'settings'
                  ? 'bg-[#24b47e] text-white shadow-xs'
                  : 'text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] hover:text-[#0f172a] dark:hover:text-[#f4f4f5]'
              }`}
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
          
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded text-[#71717a] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] cursor-pointer"
            title="Collapse Sidebar"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
        </div>
      </aside>
      <SidebarSeparator side="left" isCollapsed={false} onToggle={onToggleCollapse} />

      <ConfirmDeleteModal
        state={confirmDelete}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
};

