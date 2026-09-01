import React, { useState } from 'react';
import { ConfirmDeleteModal, ConfirmDeleteState } from '../modals/ConfirmDeleteModal';
import {
  LayoutDashboard,
  Layers,
  ShieldCheck,
  Database,
  TrendingUp,
  Image as ImageIcon,
  Folder,
  FileText,
  Settings,
  ArrowRight,
  CheckCircle2,
  Plus,
  User,
  Building,
  Check,
  Calendar,
  ExternalLink,
  ChevronRight,
  FolderPlus,
  Briefcase,
  Trash2,
} from 'lucide-react';
import { DomainState } from '../../packages/domain/state';

interface DashboardViewProps {
  domainState: DomainState;
  onNavigate: (view: 'figures' | 'dashboard' | 'data' | 'analyses' | 'notes' | 'settings' | 'help') => void;
  onDispatchAction: (action: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  domainState,
  onNavigate,
  onDispatchAction,
}) => {
  const { account, workspaces, activeWorkspaceId, projects, activeProjectId, figures, datasets } = domainState;

  // Local state for inline creations
  const [showNewWorkspaceForm, setShowNewWorkspaceForm] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');

  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  // Confirmation modal state
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteState | null>(null);
  const [newProjectDesc, setNewProjectDesc] = useState('');

  const [showNewFigureForm, setShowNewFigureForm] = useState(false);
  const [newFigureName, setNewFigureName] = useState('');
  const [targetProjectIdForFigure, setTargetProjectIdForFigure] = useState('');

  // Find active workspace & its projects
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];
  const workspaceProjects = projects.filter((p) => p.workspaceId === activeWorkspaceId);
  const activeProject = projects.find((p) => p.id === activeProjectId);

  const handleCreateWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    onDispatchAction({
      type: 'CREATE_WORKSPACE',
      payload: { name: newWorkspaceName.trim() },
    });
    setNewWorkspaceName('');
    setShowNewWorkspaceForm(false);
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    onDispatchAction({
      type: 'CREATE_PROJECT',
      payload: { name: newProjectName.trim(), description: newProjectDesc.trim() },
    });
    setNewProjectName('');
    setNewProjectDesc('');
    setShowNewProjectForm(false);
  };

  const handleCreateFigure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFigureName.trim()) return;
    onDispatchAction({
      type: 'CREATE_FIGURE',
      payload: { name: newFigureName.trim() },
    });
    setNewFigureName('');
    setShowNewFigureForm(false);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#fafafa] dark:bg-[#0f0f11] text-[#0f172a] dark:text-[#f4f4f5] p-3 sm:p-6 lg:p-8 select-text min-w-0">
      <div className="max-w-6xl mx-auto space-y-8 min-w-0">
        
        {/* Top Header & Breadcrumb Hierarchy */}
        <div className="pb-5 border-b border-[#e4e4e7] dark:border-[#27272a] min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              <span className="flex items-center gap-1"><User className="w-3.5 h-3.5 text-[#24b47e]" /> {account.name}</span>
              <ChevronRight className="w-3 h-3 text-zinc-400" />
              <span className="flex items-center gap-1"><Building className="w-3.5 h-3.5 text-blue-500" /> {activeWorkspace?.name || 'Workspace'}</span>
              {activeProject && (
                <>
                  <ChevronRight className="w-3 h-3 text-zinc-400" />
                  <span className="flex items-center gap-1 text-zinc-700 dark:text-zinc-200 font-semibold"><Folder className="w-3.5 h-3.5 text-amber-500" /> {activeProject.name}</span>
                </>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0f172a] dark:text-[#f4f4f5] tracking-tight">
              Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigate('figures')}
              className="px-4 py-2 bg-[#24b47e] hover:bg-[#1f9d6e] text-white rounded-lg text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-xs whitespace-nowrap flex items-center gap-2"
            >
              <ImageIcon className="w-4 h-4" />
              <span>Open Figure Editor</span>
            </button>
          </div>
        </div>

        {/* 1. Account & Workspace Level */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Account Profile Card */}
          <div className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#f4f4f5] dark:border-[#27272a] pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa] flex items-center gap-1.5">
                  <User className="w-4 h-4 text-[#24b47e]" /> Account Identity
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#24b47e]/10 text-[#24b47e] uppercase">
                  {account.type}
                </span>
              </div>
              <div className="space-y-2.5">
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 block">User Name</label>
                  <span className="text-sm font-semibold text-[#0f172a] dark:text-[#f4f4f5]">{account.name}</span>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 block">Email Address</label>
                  <span className="text-xs font-mono text-zinc-600 dark:text-zinc-300">{account.email}</span>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 block">Unique User ID</label>
                  <span className="text-xs font-mono text-zinc-500">{account.id}</span>
                </div>
              </div>
            </div>
            <div className="pt-4 text-[11px] text-zinc-400 border-t border-[#f4f4f5] dark:border-[#27272a] mt-4">
              Authorized via automatic Guest Session tokens.
            </div>
          </div>

          {/* Workspace Level Card */}
          <div className="md:col-span-2 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#f4f4f5] dark:border-[#27272a] pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa] flex items-center gap-1.5">
                <Building className="w-4 h-4 text-blue-500" /> Active Workspace Scope
              </span>
              <button
                onClick={() => setShowNewWorkspaceForm(!showNewWorkspaceForm)}
                className="text-xs font-bold text-blue-500 hover:text-blue-600 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Workspace</span>
              </button>
            </div>

            {showNewWorkspaceForm && (
              <form onSubmit={handleCreateWorkspace} className="p-3.5 rounded-lg bg-zinc-50 dark:bg-[#141416] border border-blue-500/20 space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Workspace Name</label>
                  <input
                    type="text"
                    required
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    placeholder="e.g. Clinical Meta-Analysis Team"
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-md focus:outline-hidden focus:border-blue-500 dark:text-zinc-100"
                  />
                </div>
                <div className="flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowNewWorkspaceForm(false)}
                    className="px-2.5 py-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-[#27272a] rounded-md cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-md cursor-pointer"
                  >
                    Create Workspace
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {workspaces.map((ws) => {
                const isActive = ws.id === activeWorkspaceId;
                const projectCount = projects.filter((p) => p.workspaceId === ws.id).length;
                return (
                  <div
                    key={ws.id}
                    onClick={() => onDispatchAction({ type: 'SWITCH_WORKSPACE', payload: ws.id })}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between h-28 relative ${
                      isActive
                        ? 'border-blue-500 bg-blue-500/[0.02] dark:bg-blue-500/[0.01]'
                        : 'border-[#e4e4e7] dark:border-[#27272a] bg-[#fafafa] dark:bg-[#121214] hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                    }`}
                  >
                    <div className="space-y-1 pr-6">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-[#0f172a] dark:text-[#f4f4f5] truncate pr-4">
                          {ws.name}
                        </span>
                        {isActive && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" title="Active workspace" />
                        )}
                      </div>
                      <p className="text-[11px] text-[#71717a] line-clamp-1">
                        Owner: {ws.ownerId === account.id ? 'You (Owner)' : ws.ownerId}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span>{projectCount} projects</span>
                      <div className="flex items-center gap-2">
                        <span>{ws.memberIds?.length || 1} members</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDelete({
                              isOpen: true,
                              title: `Delete Workspace "${ws.name}"`,
                              description: `Are you sure you want to permanently delete workspace "${ws.name}" and all its associated projects? This action cannot be undone.`,
                              confirmLabel: 'Delete Workspace',
                              onConfirm: () => {
                                onDispatchAction({ type: 'DELETE_WORKSPACE', payload: ws.id });
                              },
                            });
                          }}
                          className="p-1 rounded text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Delete workspace"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Team Directory (Active Workspace) */}
            <div className="mt-4 pt-4 border-t border-[#f4f4f5] dark:border-[#27272a] space-y-3">
               <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Workspace Team Directory
                  </span>
                  <button
                    onClick={() => {
                      const email = prompt('Enter email address to invite:');
                      if (email) alert(`Invitation sent to ${email}`);
                    }}
                    className="text-[10px] font-bold text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 px-2 py-1 rounded transition-colors cursor-pointer"
                  >
                    + Invite Member
                  </button>
               </div>
               <div className="bg-[#fafafa] dark:bg-[#121214] rounded-lg border border-[#e4e4e7] dark:border-[#27272a] divide-y divide-[#e4e4e7] dark:divide-[#27272a]">
                 {activeWorkspace?.memberIds.map(memberId => {
                   const isMe = memberId === account.id;
                   const isOwner = memberId === activeWorkspace.ownerId;
                   return (
                     <div key={memberId} className="flex items-center justify-between px-3 py-2 text-xs">
                       <div className="flex items-center gap-2">
                         <div className="w-5 h-5 rounded bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-600 dark:text-zinc-400">
                           {isMe ? account.name.charAt(0) : 'U'}
                         </div>
                         <div>
                           <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                             {isMe ? account.name : `User ${memberId}`}
                           </span>
                           {isMe && <span className="ml-1.5 text-[9px] text-zinc-400 uppercase tracking-wider">(You)</span>}
                           {isOwner && <span className="ml-1.5 px-1 rounded bg-amber-500/10 text-amber-500 text-[9px] uppercase font-bold tracking-wider">Owner</span>}
                         </div>
                       </div>
                       {!isOwner && (
                         <button
                           onClick={() => {
                             if (true) {
                               alert('Feature coming soon: Requires backend permission synchronization.');
                             }
                           }}
                           className="text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer"
                           title="Remove member"
                         >
                           <Trash2 className="w-3.5 h-3.5" />
                         </button>
                       )}
                     </div>
                   );
                 })}
               </div>
            </div>
          </div>
        </div>

        {/* 2. Project Level Context */}
        <div className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl p-5 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-[#f4f4f5] dark:border-[#27272a] pb-3">
            <div>
              <h2 className="text-sm font-bold text-[#0f172a] dark:text-[#f4f4f5] flex items-center gap-1.5">
                <Folder className="w-4.5 h-4.5 text-amber-500" /> Workspace Research Projects
              </h2>
              <p className="text-xs text-[#71717a]">
                Active workspace has {workspaceProjects.length} dedicated project containers.
              </p>
            </div>
            <button
              onClick={() => setShowNewProjectForm(!showNewProjectForm)}
              className="text-xs font-bold text-amber-500 hover:text-amber-600 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </button>
          </div>

          {showNewProjectForm && (
            <form onSubmit={handleCreateProject} className="p-4 rounded-xl bg-zinc-50 dark:bg-[#141416] border border-amber-500/20 space-y-3 max-w-xl">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Project Name</label>
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. Cardiorespiratory Clinical Trial Phase III"
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-md focus:outline-hidden focus:border-amber-500 dark:text-zinc-100"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Description</label>
                <textarea
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="Clinical outcomes review, forest panel mapping and Egger funnel diagnostics."
                  className="w-full h-16 px-3 py-1.5 text-xs bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-md focus:outline-hidden focus:border-amber-500 dark:text-zinc-100 resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowNewProjectForm(false)}
                  className="px-2.5 py-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-[#27272a] rounded-md cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-md cursor-pointer"
                >
                  Create Project
                </button>
              </div>
            </form>
          )}

          <div className="space-y-6">
            {workspaceProjects.length === 0 ? (
               <div className="p-12 flex flex-col items-center justify-center border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl bg-white dark:bg-[#121214]">
                 <FolderPlus className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mb-3" />
                 <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-4">No projects in this workspace.</p>
                 <button
                   onClick={() => setShowNewProjectForm(true)}
                   className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-md transition-colors cursor-pointer"
                 >
                   Create Your First Project
                 </button>
               </div>
            ) : (
              workspaceProjects.map((proj) => {
              const isProjActive = proj.id === activeProjectId;
              const projFigures = figures.filter((f) => proj.figureIds.includes(f.id));
              const projDatasets = datasets.filter((d) => proj.datasetIds.includes(d.id));

              return (
                <div
                  key={proj.id}
                  className={`p-5 rounded-xl border transition-all ${
                    isProjActive
                      ? 'border-amber-500 bg-amber-500/[0.01]'
                      : 'border-[#e4e4e7] dark:border-[#27272a] bg-[#fafafa] dark:bg-[#121214]'
                  }`}
                >
                  {/* Project Info Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#f4f4f5] dark:border-[#27272a] pb-4 mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#0f172a] dark:text-[#f4f4f5]">
                          {proj.name}
                        </span>
                        {isProjActive ? (
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-500 uppercase">
                            Active Project
                          </span>
                        ) : (
                          <button
                            onClick={() => onDispatchAction({ type: 'SWITCH_PROJECT', payload: proj.id })}
                            className="px-2 py-0.5 rounded text-[9px] font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 uppercase bg-zinc-100 dark:bg-zinc-800 cursor-pointer"
                          >
                            Switch to Project
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 line-clamp-1">{proj.description}</p>
                    </div>

                    {isProjActive && (
                      <div className="flex items-center gap-2 self-start">
                        <button
                          onClick={() => {
                            setConfirmDelete({
                              isOpen: true,
                              title: `Delete Project "${proj.name}"`,
                              description: `Are you sure you want to delete the project "${proj.name}"? Figures inside will remain accessible in the global domain store.`,
                              confirmLabel: 'Delete Project',
                              onConfirm: () => {
                                onDispatchAction({ type: 'DELETE_PROJECT', payload: proj.id });
                              },
                            });
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                        <button
                          onClick={() => {
                            setTargetProjectIdForFigure(proj.id);
                            setShowNewFigureForm(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Figure to Project</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Show New Figure inline form */}
                  {showNewFigureForm && targetProjectIdForFigure === proj.id && (
                    <form onSubmit={handleCreateFigure} className="p-3.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 mb-4 space-y-3 max-w-md">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Figure Title / Name</label>
                        <input
                          type="text"
                          required
                          value={newFigureName}
                          onChange={(e) => setNewFigureName(e.target.value)}
                          placeholder="e.g. Heterogeneity and Bias Analysis (Egger Plot)"
                          className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-md focus:outline-hidden focus:border-[#24b47e] dark:text-zinc-100"
                        />
                      </div>
                      <div className="flex justify-end gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setShowNewFigureForm(false)}
                          className="px-2.5 py-1.5 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-[#27272a] rounded-md cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-[#24b47e] hover:bg-[#1f9d6e] text-white font-bold rounded-md cursor-pointer"
                        >
                          Create Figure
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Figure & Dataset Grid inside Project */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Figures column */}
                    <div className="space-y-3">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa] flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-[#24b47e]" /> Composed Figures ({projFigures.length})
                      </h4>
                      {projFigures.length === 0 ? (
                        <div className="text-xs text-zinc-400 p-4 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg text-center bg-white dark:bg-[#18181b]/50">
                          No figures created in this project.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {projFigures.map((fig) => {
                            const isFigActive = fig.id === domainState.activeFigureId;
                            return (
                              <div
                                key={fig.id}
                                className={`p-3 bg-white dark:bg-[#18181b] rounded-lg border transition-all flex items-center justify-between ${
                                  isFigActive
                                    ? 'border-[#24b47e]'
                                    : 'border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700'
                                }`}
                              >
                                <div className="space-y-0.5 pr-2 min-w-0">
                                  <div className="text-xs font-bold text-[#0f172a] dark:text-[#f4f4f5] truncate">
                                    {fig.name}
                                  </div>
                                  <div className="text-[10px] text-zinc-400">
                                    {fig.panels?.length || 0} panels • {fig.canvasSize?.width || 1200}×{fig.canvasSize?.height || 800}px
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    onClick={() => {
                                      if (!isProjActive) {
                                        onDispatchAction({ type: 'SWITCH_PROJECT', payload: proj.id });
                                      }
                                      onDispatchAction({ type: 'SWITCH_FIGURE', payload: fig.id });
                                    }}
                                    className={`px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                      isFigActive
                                        ? 'bg-[#24b47e] text-white'
                                        : 'bg-zinc-50 dark:bg-[#27272a] text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                    }`}
                                  >
                                    <span>{isFigActive ? 'Active Figure' : 'Load Figure'}</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      const figTitle = fig.name || 'Untitled Figure';
                                      setConfirmDelete({
                                        isOpen: true,
                                        title: `Delete Figure "${figTitle}"`,
                                        description: `Are you sure you want to permanently delete figure "${figTitle}"? This action cannot be undone.`,
                                        confirmLabel: 'Delete Figure',
                                        onConfirm: () => {
                                          onDispatchAction({ type: 'DELETE_FIGURE', payload: fig.id });
                                        },
                                      });
                                    }}
                                    title="Delete figure"
                                    className="p-1 rounded text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Datasets column */}
                    <div className="space-y-3">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa] flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-zinc-500" /> Active Data Tables ({projDatasets.length})
                      </h4>
                      {projDatasets.length === 0 ? (
                        <div className="text-xs text-zinc-400 p-4 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg text-center bg-white dark:bg-[#18181b]/50">
                          No datasets linked to this project.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {projDatasets.map((ds) => {
                            const isDatasetActive = ds.id === domainState.selectedDatasetId;
                            return (
                              <div
                                key={ds.id}
                                className={`p-3 bg-white dark:bg-[#18181b] rounded-lg border transition-all flex items-center justify-between ${
                                  isDatasetActive
                                    ? 'border-amber-500'
                                    : 'border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700'
                                }`}
                              >
                                <div className="space-y-0.5 pr-2 min-w-0">
                                  <div className="text-xs font-bold text-[#0f172a] dark:text-[#f4f4f5] truncate">
                                    {ds.title}
                                  </div>
                                  <div className="text-[10px] text-zinc-400">
                                    Format: {ds.id.includes('penguin') ? 'Observations Table' : 'Meta-Study Trials'}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    onClick={() => {
                                      if (!isProjActive) {
                                        onDispatchAction({ type: 'SWITCH_PROJECT', payload: proj.id });
                                      }
                                      onDispatchAction({ type: 'SELECT_DATASET', payload: ds.id });
                                      onNavigate('data');
                                    }}
                                    className={`px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                      isDatasetActive
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-zinc-50 dark:bg-[#27272a] text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                    }`}
                                  >
                                    <span>View Data</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setConfirmDelete({
                                        isOpen: true,
                                        title: `Remove Dataset "${ds.title}"`,
                                        description: `Are you sure you want to remove dataset "${ds.title}" from this project? The dataset will remain available in the global Data tab.`,
                                        confirmLabel: 'Remove Dataset',
                                        onConfirm: () => {
                                          onDispatchAction({ type: 'TOGGLE_DATASET_SCOPE', payload: { datasetId: ds.id, scope: 'project' } });
                                        },
                                      });
                                    }}
                                    title="Remove dataset"
                                    className="p-1 rounded text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                  </div>

                </div>
              );
            })
            )}
          </div>
        </div>

      </div>

      <ConfirmDeleteModal
        state={confirmDelete}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
};
