import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronRight, FilePlus2, MoreHorizontal, Plus, Search, UserRound } from 'lucide-react';
import { ConfirmDeleteModal, ConfirmDeleteState } from '../modals/ConfirmDeleteModal';
import { DomainState } from '../../packages/domain/state';
import { MultiPanelFigure, PanelKind } from '../../types/multipanel';

interface DashboardViewProps {
  domainState: DomainState;
  onNavigate: (view: 'figures' | 'dashboard' | 'data' | 'analyses' | 'notes' | 'settings' | 'help') => void;
  onDispatchAction: (action: any) => void;
}

const kindAccent: Record<PanelKind, string> = {
  'forest-plot': '#0f766e',
  'funnel-plot': '#2563eb',
  'grouped-bar': '#7c3aed',
  'subgroup-analysis': '#c2410c',
  'volcano-plot': '#be123c',
  heatmap: '#0369a1',
  'single-chart': '#334155',
  'text-caption': '#64748b',
};

function FigureThumbnail({ figure }: { figure: MultiPanelFigure }) {
  const panels = figure.panels.filter((panel) => panel.spec.kind !== 'text-caption').slice(0, 6);
  return (
    <div className="aspect-[16/10] w-full overflow-hidden rounded-md border border-slate-200 bg-slate-50 p-2 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="grid h-full grid-cols-2 gap-1.5">
        {panels.length > 0 ? panels.map((panel) => {
          const accent = kindAccent[panel.spec.kind];
          return (
            <div key={panel.id} className="relative overflow-hidden rounded-[3px] border border-slate-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
              <div className="absolute left-1 top-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
              {panel.spec.kind === 'grouped-bar' || panel.spec.kind === 'single-chart' ? (
                <div className="absolute inset-x-2 bottom-2 top-5 flex items-end justify-around gap-0.5">
                  {[35, 58, 43, 76, 52].map((value, index) => <span key={index} className="w-full rounded-t-[2px]" style={{ height: `${value}%`, backgroundColor: accent, opacity: 0.72 }} />)}
                </div>
              ) : (
                <div className="absolute inset-x-2 bottom-2 top-6">
                  <span className="absolute left-0 right-0 top-1/2 border-t border-dashed" style={{ borderColor: accent, opacity: 0.55 }} />
                  {[20, 38, 56, 72].map((position, index) => <span key={index} className="absolute h-1 w-1 rounded-full" style={{ left: `${position}%`, top: `${(index * 19 + 20) % 68}%`, backgroundColor: accent }} />)}
                </div>
              )}
            </div>
          );
        }) : <div className="col-span-2 flex items-center justify-center text-[11px] text-slate-400">Empty canvas</div>}
      </div>
    </div>
  );
}

function FigureCard({
  figure,
  active,
  onOpen,
  onDelete,
  onRename,
}: {
  figure: MultiPanelFigure;
  active: boolean;
  onOpen: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(figure.name);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  const submitRename = () => {
    const name = draftName.trim();
    if (name) onRename(name);
    setEditing(false);
    setMenuOpen(false);
  };

  return (
    <article className={`group relative min-w-0 rounded-lg border bg-white p-2 transition-shadow hover:shadow-md dark:bg-zinc-900 ${active ? 'border-slate-900 dark:border-zinc-300' : 'border-slate-200 dark:border-zinc-700'}`}>
      <button type="button" onClick={onOpen} className="block w-full cursor-pointer text-left">
        <FigureThumbnail figure={figure} />
        <div className="flex items-start justify-between gap-2 px-1 pb-1 pt-2">
          <div className="min-w-0 flex-1">
            {editing ? (
              <input autoFocus value={draftName} onChange={(event) => setDraftName(event.target.value)} onClick={(event) => event.stopPropagation()} onBlur={submitRename} onKeyDown={(event) => { if (event.key === 'Enter') submitRename(); if (event.key === 'Escape') setEditing(false); }} className="w-full rounded border border-slate-400 bg-white px-1 py-0.5 text-sm font-semibold outline-none dark:border-zinc-500 dark:bg-zinc-950" aria-label="Figure name" />
            ) : <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-zinc-100">{figure.name || 'Untitled figure'}</h3>}
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-zinc-400">{figure.panels.length} panels · {figure.canvasSize.width} × {figure.canvasSize.height}</p>
          </div>
          {active && <Check className="mt-0.5 h-4 w-4 shrink-0 text-slate-700 dark:text-zinc-200" aria-label="Active figure" />}
        </div>
      </button>
      <div className="flex items-center justify-between border-t border-slate-100 px-1 pt-1.5 dark:border-zinc-800">
        <button type="button" onClick={onOpen} className="text-[11px] font-medium text-slate-600 hover:text-slate-950 dark:text-zinc-400 dark:hover:text-white">Open canvas</button>
        <div ref={menuRef} className="relative">
          <button type="button" onClick={() => setMenuOpen((open) => !open)} className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-zinc-800 dark:hover:text-white" title="Figure options" aria-label={`Figure options for ${figure.name}`}><MoreHorizontal className="h-3.5 w-3.5" /></button>
          {menuOpen && <div data-options-menu className="absolute right-0 z-20 mt-1 w-36 rounded-md border border-slate-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            <button type="button" onClick={() => { setEditing(true); setDraftName(figure.name); setMenuOpen(false); }} className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-zinc-800">Rename figure</button>
            <button type="button" onClick={onDelete} className="block w-full rounded px-2 py-1.5 text-left text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30">Delete figure</button>
          </div>}
        </div>
      </div>
    </article>
  );
}

export const DashboardView: React.FC<DashboardViewProps> = ({ domainState, onNavigate, onDispatchAction }) => {
  const { account, workspaces, activeWorkspaceId, projects, activeProjectId, figures } = domainState;
  const [search, setSearch] = useState('');
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [projectMenuOpen, setProjectMenuOpen] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [projectDraft, setProjectDraft] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteState | null>(null);

  useEffect(() => {
    if (!projectMenuOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!(event.target as HTMLElement).closest('[data-options-menu], [data-options-trigger]')) setProjectMenuOpen(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setProjectMenuOpen(null);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [projectMenuOpen]);

  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId) || workspaces[0];
  const workspaceProjects = projects.filter((project) => project.workspaceId === activeWorkspaceId);
  const visibleProjects = workspaceProjects.filter((project) => {
    const query = search.trim().toLowerCase();
    return !query || project.name.toLowerCase().includes(query) || project.description.toLowerCase().includes(query);
  });

  const submitProject = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newProjectName.trim()) return;
    onDispatchAction({ type: 'CREATE_PROJECT', payload: { name: newProjectName.trim(), description: newProjectDesc.trim() } });
    setNewProjectName('');
    setNewProjectDesc('');
    setShowNewProjectForm(false);
  };

  const openFigure = (figureId: string, projectId: string) => {
    if (projectId !== activeProjectId) onDispatchAction({ type: 'SWITCH_PROJECT', payload: projectId });
    onDispatchAction({ type: 'SWITCH_FIGURE', payload: figureId });
    onNavigate('figures');
  };

  const renameFigure = (figure: MultiPanelFigure, name: string) => {
    if (figure.id !== domainState.activeFigureId) onDispatchAction({ type: 'SWITCH_FIGURE', payload: figure.id });
    onDispatchAction({ type: 'UPDATE_FIGURE_NAME', payload: name });
  };

  const deleteFigure = (figure: MultiPanelFigure) => setConfirmDelete({
    isOpen: true,
    title: `Delete figure “${figure.name}”`,
    description: 'This removes the figure from the project. The project will keep its other figures.',
    confirmLabel: 'Delete figure',
    onConfirm: () => onDispatchAction({ type: 'DELETE_FIGURE', payload: figure.id }),
  });

  const deleteProject = (projectId: string, projectName: string) => setConfirmDelete({
    isOpen: true,
    title: `Delete project “${projectName}”`,
    description: 'This removes the project and all figures it contains. A workspace may remain without projects.',
    confirmLabel: 'Delete project',
    onConfirm: () => onDispatchAction({ type: 'DELETE_PROJECT', payload: projectId }),
  });

  return (
    <div className="min-w-0 flex-1 overflow-y-auto bg-[#f7f7f8] text-slate-900 dark:bg-[#101011] dark:text-zinc-100">
      <div className="mx-auto max-w-[1500px] px-5 py-4 sm:px-8">
        <header className="flex min-h-12 items-center justify-between gap-4 border-b border-slate-200 pb-3 dark:border-zinc-800">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <span className="font-semibold text-slate-500 dark:text-zinc-400">{account.type === 'guest' ? 'Guest session' : 'Authenticated session'}</span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <span className="truncate text-slate-500 dark:text-zinc-400">{activeWorkspace?.name || 'Workspace'}</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="hidden items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-500 sm:flex dark:border-zinc-700 dark:bg-zinc-900">
              <Search className="h-3.5 w-3.5" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects" className="w-32 bg-transparent outline-none placeholder:text-slate-400" />
            </label>
            <button type="button" onClick={() => setShowNewProjectForm((value) => !value)} className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"><Plus className="h-3.5 w-3.5" />New project</button>
          </div>
        </header>

        {showNewProjectForm && <form onSubmit={submitProject} className="mt-4 grid gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_1.5fr_auto] dark:border-zinc-700 dark:bg-zinc-900">
          <input required value={newProjectName} onChange={(event) => setNewProjectName(event.target.value)} placeholder="Project name" className="rounded-md border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-slate-500 dark:border-zinc-700 dark:bg-zinc-950" />
          <input value={newProjectDesc} onChange={(event) => setNewProjectDesc(event.target.value)} placeholder="Description (optional)" className="rounded-md border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-slate-500 dark:border-zinc-700 dark:bg-zinc-950" />
          <div className="flex gap-2"><button type="button" onClick={() => setShowNewProjectForm(false)} className="rounded-md px-3 py-2 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800">Cancel</button><button type="submit" className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">Create</button></div>
        </form>}

        <div className="mt-6 grid gap-8 grid-cols-1">
          <main className="min-w-0">
            <section className="flex items-end justify-between gap-4">
              <div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Figures & projects</p></div>
            </section>
            <div className="mt-8 space-y-10">
              {visibleProjects.map((project) => {
                const projectFigures = figures.filter((figure) => project.figureIds.includes(figure.id));
                const isActiveProject = project.id === activeProjectId;
                const isEditingProject = editingProject === project.id;
                return <section key={project.id}>
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <button type="button" onClick={() => onDispatchAction({ type: 'SWITCH_PROJECT', payload: project.id })} className="min-w-0 text-left">
                      <div className="flex items-center gap-2">{isEditingProject ? <input autoFocus value={projectDraft} onChange={(event) => setProjectDraft(event.target.value)} onClick={(event) => event.stopPropagation()} onBlur={() => { if (projectDraft.trim()) onDispatchAction({ type: 'RENAME_PROJECT', payload: { projectId: project.id, name: projectDraft } }); setEditingProject(null); setProjectMenuOpen(null); }} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') setEditingProject(null); }} className="rounded border border-slate-400 bg-white px-1 py-0.5 text-base font-semibold outline-none dark:bg-zinc-950" aria-label="Project name" /> : <h2 className="truncate text-base font-semibold">{project.name}</h2>}{isActiveProject && <span className="text-[10px] text-slate-400">Current</span>}</div>
                      <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-zinc-400">{project.description || 'No description'}</p>
                    </button>
                    <div className="flex items-center gap-2 text-xs text-slate-400"><span>{projectFigures.length} {projectFigures.length === 1 ? 'figure' : 'figures'}</span><button type="button" onClick={() => { if (project.id !== activeProjectId) onDispatchAction({ type: 'SWITCH_PROJECT', payload: project.id }); onDispatchAction({ type: 'CREATE_FIGURE', payload: { name: `${project.name} · Figure ${projectFigures.length + 1}` } }); }} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 font-medium text-slate-600 hover:border-slate-400 hover:text-slate-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"><FilePlus2 className="h-3.5 w-3.5" />New figure</button><div className="relative"><button type="button" data-options-trigger onClick={() => setProjectMenuOpen(projectMenuOpen === project.id ? null : project.id)} className="rounded p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800" title="Project actions" aria-label={`Project options for ${project.name}`}><MoreHorizontal className="h-4 w-4" /></button>{projectMenuOpen === project.id && <div data-options-menu className="absolute right-0 z-20 mt-1 w-36 rounded-md border border-slate-200 bg-white p-1 text-left shadow-lg dark:border-zinc-700 dark:bg-zinc-900"><button type="button" onClick={() => { setProjectDraft(project.name); setEditingProject(project.id); setProjectMenuOpen(null); }} className="block w-full rounded px-2 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-zinc-800">Rename project</button><button type="button" onClick={() => deleteProject(project.id, project.name)} className="block w-full rounded px-2 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-zinc-800">Delete project</button></div>}</div></div>
                  </div>
                  {projectFigures.length > 0 ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{projectFigures.filter((figure) => !search.trim() || figure.name.toLowerCase().includes(search.trim().toLowerCase())).map((figure) => <FigureCard key={figure.id} figure={figure} active={figure.id === domainState.activeFigureId} onOpen={() => openFigure(figure.id, project.id)} onRename={(name) => renameFigure(figure, name)} onDelete={() => deleteFigure(figure)} />)}</div> : <button type="button" onClick={() => { if (project.id !== activeProjectId) onDispatchAction({ type: 'SWITCH_PROJECT', payload: project.id }); onDispatchAction({ type: 'CREATE_FIGURE', payload: { name: `${project.name} · Figure 1` } }); }} className="flex min-h-32 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white text-sm text-slate-500 hover:border-slate-500 hover:text-slate-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-400 dark:hover:text-white"><FilePlus2 className="h-4 w-4" />Create the first figure</button>}
                </section>;
              })}
            </div>
            {visibleProjects.length === 0 && <div className="mt-10 rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">No matching projects.</div>}
          </main>
        </div>

        <footer className="mt-14 flex items-center gap-4 border-t border-slate-200 pt-4 text-xs text-slate-400 dark:border-zinc-800"><span className="inline-flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" />{account.type === 'guest' ? 'Guest session' : 'Authenticated session'}</span><span>{workspaces.length} workspace{workspaces.length === 1 ? '' : 's'}</span><button type="button" onClick={() => onNavigate('settings')} className="ml-auto hover:text-slate-700 dark:hover:text-zinc-200">Settings</button></footer>
      </div>
      <ConfirmDeleteModal state={confirmDelete} onClose={() => setConfirmDelete(null)} />
    </div>
  );
};

export default DashboardView;
