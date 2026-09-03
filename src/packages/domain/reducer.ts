import { DomainState, getAccessibleDatasetIds } from './state';
import { DomainCommand } from './commands';
import { recordRevision } from '../provenance/ledger';
import { DEFAULT_MULTIPANEL_FIGURE, createNewFigure } from '../multipanel/defaultFigure';
import { saveFigureToStorage, saveActiveThemeId } from '../multipanel/storage';
import { registerDatasetRecord, unregisterRuntimeDataset } from '../data-model/profiler';
import { profileDataset } from '../data-model/profiler';
import { bindPanelToDataset, isDatasetBoundPanel } from '../multipanel/datasetBinding';
import { saveDomainState } from './persistence';
import { ProvenanceEvent } from '../../types';

function getFigureLedger(state: DomainState, figureId: string) {
  return state.provenanceByFigureId[figureId] || { events: [] };
}

function figureOwner(state: DomainState, figureId: string) {
  return state.projects.find((project) => project.figureIds.includes(figureId));
}

function scopeSnapshotForFigure(state: DomainState, figureId: string) {
  const project = figureOwner(state, figureId);
  if (!project) return undefined;
  const workspace = state.workspaces.find((candidate) => candidate.id === project.workspaceId);
  return {
    workspaceId: project.workspaceId,
    projectId: project.id,
    workspaceSharedDatasetIds: [...(workspace?.sharedDatasetIds || [])],
    projectDatasetIds: [...project.datasetIds],
  };
}

function recordFigureRevision(
  state: DomainState,
  figure: NonNullable<DomainState['figure']>,
  summary: string,
  actor: 'agent' | 'human' = 'human',
  options: Parameters<typeof recordRevision>[4] = {},
) {
  return recordRevision(state.provenanceByFigureId[figure.id] || { events: [] }, figure, summary, actor, {
    ...options,
    scopeSnapshot: options.scopeSnapshot || scopeSnapshotForFigure(state, figure.id),
  });
}

function datasetAccessibleToFigure(state: DomainState, figure: NonNullable<DomainState['figure']>, datasetId: string): boolean {
  const owner = figureOwner(state, figure.id);
  if (!owner) return getAccessibleDatasetIds(state).has(datasetId);
  const workspace = state.workspaces.find((candidate) => candidate.id === owner.workspaceId);
  return owner.datasetIds.includes(datasetId) || Boolean(workspace?.sharedDatasetIds.includes(datasetId));
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function safeProposalSpec(spec: any): boolean {
  if (!spec || typeof spec !== 'object' || typeof spec.kind !== 'string') return false;
  const title = spec.kind === 'single-chart' || spec.kind === 'volcano-plot' || spec.kind === 'heatmap' ? spec.spec?.title : spec.title;
  if (typeof title !== 'string' || !title.trim()) return false;
  if (spec.kind === 'single-chart' || spec.kind === 'volcano-plot' || spec.kind === 'heatmap') return Boolean(spec.spec && typeof spec.spec === 'object' && spec.spec.mark && spec.spec.encoding);
  if (spec.kind === 'forest-plot') return Array.isArray(spec.studies) && spec.pooledEstimate && typeof spec.pooledEstimate === 'object';
  if (spec.kind === 'funnel-plot') return Array.isArray(spec.points);
  if (spec.kind === 'grouped-bar') return Array.isArray(spec.groups);
  if (spec.kind === 'subgroup-analysis') return Array.isArray(spec.subgroups);
  return spec.kind === 'text-caption' && typeof spec.captionText === 'string';
}

function safeFrame(frame: any): boolean {
  return frame && ['x', 'y', 'width', 'height'].every((key) => Number.isFinite(frame[key])) && frame.width > 0 && frame.height > 0;
}

function figureValidationReport(state: DomainState, figure: NonNullable<DomainState['figure']>) {
  const issues: Array<{ ruleId: string; severity: 'blocking' | 'warning'; path: string; message: string }> = [];
  figure.panels.forEach((panel) => {
    if (!safeFrame(panel.frame)) issues.push({ ruleId: 'FIGURE-FRAME', severity: 'blocking', path: `panels.${panel.id}.frame`, message: 'Panel frame must contain finite positive dimensions.' });
    if (!isDatasetBoundPanel(panel.spec)) return;
    if (panel.spec.datasetId && !getAccessibleDatasetIds(state).has(panel.spec.datasetId)) issues.push({ ruleId: 'DATASET-SCOPE', severity: 'blocking', path: `panels.${panel.id}.datasetId`, message: 'Panel dataset is outside the active project/workspace scope.' });
    (panel.spec.bindingIssues || []).forEach((message) => issues.push({ ruleId: 'PANEL-BINDING', severity: 'blocking', path: `panels.${panel.id}.bindingIssues`, message }));
    (panel.spec.bindingWarnings || []).forEach((message) => issues.push({ ruleId: 'PANEL-DATA-WARNING', severity: 'warning', path: `panels.${panel.id}.bindingWarnings`, message }));
  });
  return { valid: !issues.some((issue) => issue.severity === 'blocking'), issues };
}

function replaceFigure(state: DomainState, figure: NonNullable<DomainState['figure']>) {
  const figures = state.figures.some((candidate) => candidate.id === figure.id)
    ? state.figures.map((candidate) => candidate.id === figure.id ? figure : candidate)
    : [...state.figures, figure];
  return { ...state, figure, activeFigureId: figure.id, figures };
}

function omitFigureRecord<T>(records: Record<string, T>, figureId: string): Record<string, T> {
  const { [figureId]: _removed, ...remaining } = records;
  return remaining;
}

function refreshFigureDatasetBindings(figure: NonNullable<DomainState['figure']>, datasetId: string, exists: boolean) {
  return {
    ...figure,
    panels: figure.panels.map((panel) => {
      if (!isDatasetBoundPanel(panel.spec) || panel.spec.datasetId !== datasetId) return panel;
      if (!exists) {
        const invalidatedSpec = {
          ...panel.spec,
          bindingIssues: ['Bound dataset is unavailable. Select a valid panel dataset.'],
          bindingWarnings: [],
          ...(panel.spec.kind === 'forest-plot' ? { studies: [], pooledEstimate: { ...panel.spec.pooledEstimate, effect: Number.NaN, ciLower: Number.NaN, ciUpper: Number.NaN, weightTotal: 0, label: 'Awaiting dataset' } } : {}),
          ...(panel.spec.kind === 'funnel-plot' ? { points: [] } : {}),
          ...(panel.spec.kind === 'grouped-bar' ? { groups: [] } : {}),
          ...(panel.spec.kind === 'subgroup-analysis' ? { subgroups: [] } : {}),
        };
        return {
          ...panel,
          spec: invalidatedSpec as typeof panel.spec,
        };
      }
      return { ...panel, spec: bindPanelToDataset(panel.spec, datasetId, profileDataset(datasetId)) };
    }),
  };
}

function datasetsHaveSameContent(left: DomainState['datasets'][number], right: DomainState['datasets'][number]): boolean {
  return JSON.stringify({ ...left, id: undefined }) === JSON.stringify({ ...right, id: undefined });
}

function importedDatasetId(baseId: string, existingIds: Set<string>): string {
  let candidate = `${baseId}-imported`;
  let suffix = 2;
  while (existingIds.has(candidate)) candidate = `${baseId}-imported-${suffix++}`;
  return candidate;
}

function importedFigureId(baseId: string, existingIds: Set<string>): string {
  let candidate = `${baseId}-imported`;
  let suffix = 2;
  while (existingIds.has(candidate)) candidate = `${baseId}-imported-${suffix++}`;
  return candidate;
}

function remapDatasetReferences<T>(value: T, idMap: Map<string, string>): T {
  if (Array.isArray(value)) return value.map((item) => remapDatasetReferences(item, idMap)) as T;
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, child]) => [
      key,
      key === 'datasetId' && typeof child === 'string' ? idMap.get(child) || child : remapDatasetReferences(child, idMap),
    ]),
  ) as T;
}

function remapFigureDatasetIds(figure: NonNullable<DomainState['figure']>, idMap: Map<string, string>) {
  return remapDatasetReferences(figure, idMap);
}

function remapImportedLedger(
  ledger: NonNullable<DomainState['provenanceByFigureId'][string]>,
  datasetIdMap: Map<string, string>,
  figureIdMap: Map<string, string>,
) {
  return {
    events: ledger.events.map((event) => ({
      ...event,
      specSnapshot: remapDatasetReferences(event.specSnapshot, datasetIdMap),
      workspaceSnapshot: event.workspaceSnapshot?.map((snapshot) => ({
        ...snapshot,
        spec: remapDatasetReferences(snapshot.spec, datasetIdMap),
      })),
      figureSnapshot: event.figureSnapshot
        ? { ...remapDatasetReferences(event.figureSnapshot, datasetIdMap), id: figureIdMap.get(event.figureSnapshot.id) || event.figureSnapshot.id }
        : undefined,
      scopeSnapshot: event.scopeSnapshot
        ? {
            ...event.scopeSnapshot,
            workspaceSharedDatasetIds: event.scopeSnapshot.workspaceSharedDatasetIds.map((id) => datasetIdMap.get(id) || id),
            projectDatasetIds: event.scopeSnapshot.projectDatasetIds.map((id) => datasetIdMap.get(id) || id),
            projectId: event.scopeSnapshot.projectId,
          }
        : undefined,
      datasetSnapshots: event.datasetSnapshots?.map((dataset) => ({
        ...dataset,
        id: datasetIdMap.get(dataset.id) || dataset.id,
      })),
      commandPayload: event.commandPayload
        ? Object.fromEntries(Object.entries(event.commandPayload).map(([key, value]) => [
            key,
            key === 'figureId' && typeof value === 'string'
              ? figureIdMap.get(value) || value
              : key === 'datasetId' && typeof value === 'string'
                ? datasetIdMap.get(value) || value
                : remapDatasetReferences(value, datasetIdMap),
          ]))
        : undefined,
    })),
  };
}

function datasetRevisionId(datasetId: string, revision: number, rows: Record<string, any>[]): string {
  let hash = 2166136261;
  for (const character of JSON.stringify(rows)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `${datasetId}:r${revision}:${(hash >>> 0).toString(16)}`;
}

function datasetsReferencedByFigure(state: DomainState, figure: NonNullable<DomainState['figure']>) {
  const ids = new Set(
    figure.panels.flatMap((panel) => isDatasetBoundPanel(panel.spec) && panel.spec.datasetId ? [panel.spec.datasetId] : []),
  );
  return state.datasets.filter((dataset) => ids.has(dataset.id));
}

function restoreDatasetSnapshots(state: DomainState, snapshots: NonNullable<DomainState['provenanceByFigureId'][string]['events'][number]['datasetSnapshots']>) {
  if (!snapshots.length) return state;
  snapshots.forEach(registerDatasetRecord);
  const snapshotIds = new Set(snapshots.map((dataset) => dataset.id));
  const existingIds = new Set(state.datasets.map((dataset) => dataset.id));
  const datasets = [
    ...state.datasets.map((dataset) => snapshots.find((snapshot) => snapshot.id === dataset.id) || dataset),
    ...snapshots.filter((snapshot) => !existingIds.has(snapshot.id)),
  ];
  const targetProjectId = state.figure
    ? state.projects.find((project) => project.figureIds.includes(state.figure.id))?.id || state.activeProjectId
    : state.activeProjectId;
  const projects = state.projects.map((project) => project.id === targetProjectId
    ? { ...project, datasetIds: Array.from(new Set([...project.datasetIds, ...snapshots.map((snapshot) => snapshot.id)])) }
    : project);
  const figures = state.figures.map((figure) => {
    const usesSnapshot = figure.panels.some((panel) =>
      isDatasetBoundPanel(panel.spec) && Boolean(panel.spec.datasetId) && snapshotIds.has(panel.spec.datasetId as string),
    );
    return usesSnapshot
      ? snapshots.reduce((nextFigure, snapshot) => refreshFigureDatasetBindings(nextFigure, snapshot.id, true), figure)
      : figure;
  });
  return { ...state, datasets, projects, figures, figure: figures.find((figure) => figure.id === state.figure?.id) || state.figure };
}

function restoreScopeSnapshot(state: DomainState, snapshot: NonNullable<ProvenanceEvent['scopeSnapshot']> | undefined) {
  if (!snapshot) return state;
  const workspace = state.workspaces.find((candidate) => candidate.id === snapshot.workspaceId);
  const project = state.projects.find((candidate) => candidate.id === snapshot.projectId && candidate.workspaceId === snapshot.workspaceId);
  if (!workspace || !project) return state;
  const knownDatasetIds = new Set(state.datasets.map((dataset) => dataset.id));
  return {
    ...state,
    workspaces: state.workspaces.map((candidate) => candidate.id === workspace.id
      ? { ...candidate, sharedDatasetIds: snapshot.workspaceSharedDatasetIds.filter((datasetId) => knownDatasetIds.has(datasetId)) }
      : candidate),
    projects: state.projects.map((candidate) => candidate.id === project.id
      ? { ...candidate, datasetIds: snapshot.projectDatasetIds.filter((datasetId) => knownDatasetIds.has(datasetId)) }
      : candidate),
  };
}

export function domainReducer(state: DomainState, command: DomainCommand): DomainState {
  switch (command.type) {
    case 'SET_ACTIVE_VIEW':
      return { ...state, activeView: command.payload };

    case 'SWITCH_ACCOUNT': {
      return {
        ...state,
        account: {
          ...state.account,
          type: command.payload,
        },
      };
    }

    case 'SWITCH_WORKSPACE': {
      const wsId = command.payload;
      const ws = state.workspaces.find((w) => w.id === wsId);
      if (!ws) return state;

      const wsProjects = state.projects.filter((p) => p.workspaceId === wsId);
      const activeProj = wsProjects[0] || null;
      const activeFig = activeProj
        ? state.figures.find((f) => activeProj.figureIds.includes(f.id)) || null
        : null;
      const nextScopeState = { ...state, activeWorkspaceId: wsId, activeProjectId: activeProj?.id || null };
      const nextAccessibleDatasetIds = getAccessibleDatasetIds(nextScopeState);

      return {
        ...state,
        activeWorkspaceId: wsId,
        projects: state.projects,
        activeProjectId: activeProj ? activeProj.id : null,
        figure: activeFig,
        activeFigureId: activeFig ? activeFig.id : null,
        selectedDatasetId: nextAccessibleDatasetIds.has(state.selectedDatasetId || '')
          ? state.selectedDatasetId
          : Array.from(nextAccessibleDatasetIds)[0] || null,
        provenance: activeFig ? getFigureLedger(state, activeFig.id) : { events: [] },
        activePreview: null,
        account: {
          ...state.account,
          activeWorkspaceId: wsId,
        },
      };
    }

    case 'CREATE_WORKSPACE': {
      const newWs = {
        id: `ws-${Date.now()}`,
        name: command.payload.name.trim() || 'New Team Workspace',
        ownerId: state.account.id,
        memberIds: [state.account.id],
        sharedDatasetIds: [],
        projectIds: [],
      };

      return {
        ...state,
        workspaces: [...state.workspaces, newWs],
        activeWorkspaceId: newWs.id,
        activeProjectId: null,
        figure: null,
        activeFigureId: null,
        selectedDatasetId: null,
        account: {
          ...state.account,
          activeWorkspaceId: newWs.id,
        },
      };
    }

    case 'RENAME_WORKSPACE': {
      const name = command.payload.name.trim();
      if (!name) return state;
      if (!state.workspaces.some((workspace) => workspace.id === command.payload.workspaceId)) return state;
      return {
        ...state,
        workspaces: state.workspaces.map((workspace) => workspace.id === command.payload.workspaceId
          ? { ...workspace, name }
          : workspace),
      };
    }

    case 'DELETE_WORKSPACE': {
      const wsIdToDelete = command.payload;
      if (!state.workspaces.some((workspace) => workspace.id === wsIdToDelete)) return state;
      const remainingWorkspaces = state.workspaces.filter((w) => w.id !== wsIdToDelete);

      let nextWsList = remainingWorkspaces;
      let nextWsId = state.activeWorkspaceId;

      if (remainingWorkspaces.length === 0) {
        const freshWs = {
          id: `ws-${Date.now()}`,
          name: 'Main Workspace',
          ownerId: state.account.id,
          memberIds: [state.account.id],
          sharedDatasetIds: [],
          projectIds: [],
        };
        nextWsList = [freshWs];
        nextWsId = freshWs.id;
      } else if (state.activeWorkspaceId === wsIdToDelete) {
        nextWsId = remainingWorkspaces[0].id;
      }

      // Remove projects and figures belonging to deleted workspace
      const remainingProjects = state.projects.filter((p) => p.workspaceId !== wsIdToDelete);
      const remainingFigureIds = new Set(remainingProjects.flatMap((project) => project.figureIds));
      const remainingFigures = state.figures.filter((figure) => remainingFigureIds.has(figure.id));
      const activeProj = state.activeWorkspaceId !== wsIdToDelete
        ? remainingProjects.find((p) => p.id === state.activeProjectId) || null
        : remainingProjects.find((p) => p.workspaceId === nextWsId) || null;
      const activeFig = activeProj
        ? remainingFigures.find((f) => activeProj.figureIds.includes(f.id)) || null
        : null;
      const nextScopeState = { ...state, activeWorkspaceId: nextWsId, activeProjectId: activeProj?.id || null };
      const nextAccessibleDatasetIds = getAccessibleDatasetIds(nextScopeState);

      return {
        ...state,
        workspaces: nextWsList,
        activeWorkspaceId: nextWsId,
        projects: remainingProjects,
        figures: remainingFigures,
        activeProjectId: activeProj ? activeProj.id : null,
        figure: activeFig,
        activeFigureId: activeFig ? activeFig.id : null,
        selectedDatasetId: nextAccessibleDatasetIds.has(state.selectedDatasetId || '')
          ? state.selectedDatasetId
          : Array.from(nextAccessibleDatasetIds)[0] || null,
        provenance: activeFig ? getFigureLedger(state, activeFig.id) : { events: [] },
        provenanceByFigureId: Object.fromEntries(
          Object.entries(state.provenanceByFigureId).filter(([figureId]) => remainingFigureIds.has(figureId))
        ),
        notesByFigureId: Object.fromEntries(
          Object.entries(state.notesByFigureId).filter(([figureId]) => remainingFigureIds.has(figureId))
        ),
        analysisRuns: (state.analysisRuns || []).filter((run) => !run.figureId || remainingFigureIds.has(run.figureId)),
        activePreview: null,
        account: {
          ...state.account,
          activeWorkspaceId: nextWsId,
        },
      };
    }

    case 'SWITCH_PROJECT': {
      const projId = command.payload;
      const proj = state.projects.find((p) => p.id === projId);
      if (!proj || proj.workspaceId !== state.activeWorkspaceId) return state;

      const activeFig = state.figures.find((f) => proj.figureIds.includes(f.id)) || null;
      const nextScopeState = { ...state, activeProjectId: projId };
      const nextAccessibleDatasetIds = getAccessibleDatasetIds(nextScopeState);

      return {
        ...state,
        activeProjectId: projId,
        figure: activeFig,
        activeFigureId: activeFig?.id || null,
        selectedDatasetId: nextAccessibleDatasetIds.has(state.selectedDatasetId || '')
          ? state.selectedDatasetId
          : Array.from(nextAccessibleDatasetIds)[0] || null,
        provenance: activeFig ? getFigureLedger(state, activeFig.id) : { events: [] },
        activePreview: null,
      };
    }

    case 'CREATE_PROJECT': {
      const newProj = {
        id: `proj-${Date.now()}`,
        workspaceId: state.activeWorkspaceId,
        name: command.payload.name.trim() || 'New Research Project',
        description: command.payload.description?.trim() || 'Multi-panel figure collection.',
        datasetIds: [],
        figureIds: [],
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
      };

      // Create an initial panel so the canvas is never blank on first open.
      const freshFig = {
        id: `fig-${Date.now()}`,
        name: `${newProj.name} - Canvas 1`,
        panels: [
          {
            id: 'panel-a',
            label: 'Panel A',
            letter: 'A',
            frame: { x: 30, y: 20, width: 560, height: 360 },
            spec: {
              kind: 'single-chart',
              spec: {
                title: 'WebMCP Chart',
                mark: 'bar',
                encoding: {
                  x: { field: 'species', type: 'nominal' },
                  y: { field: 'body_mass_g', type: 'quantitative', aggregate: 'mean' },
                },
              },
            },
          },
        ],
        layers: [
          {
            id: 'layer-panel-a',
            name: 'Panel A',
            visible: true,
            locked: false,
            panelId: 'panel-a',
            order: 0,
          },
        ],
        manualItems: [],
        canvasSize: { width: 1200, height: 800, dpi: 300 },
        activeThemeId: 'nature',
      };
      
      newProj.figureIds.push(freshFig.id);

      const updatedWorkspaces = state.workspaces.map((w) =>
        w.id === state.activeWorkspaceId
          ? { ...w, projectIds: [...w.projectIds, newProj.id] }
          : w
      );

      saveFigureToStorage(freshFig as any);

      return {
        ...state,
        workspaces: updatedWorkspaces,
        projects: [...state.projects, newProj],
        activeProjectId: newProj.id,
        figures: [...state.figures, freshFig as any],
        figure: freshFig as any,
        activeFigureId: freshFig.id,
        selectedDatasetId: getAccessibleDatasetIds({ ...state, activeProjectId: newProj.id }).values().next().value || null,
        provenance: { events: [] },
        provenanceByFigureId: { ...state.provenanceByFigureId, [freshFig.id]: { events: [] } },
        activePreview: null,
      };
    }

    case 'RENAME_PROJECT': {
      const name = command.payload.name.trim();
      const project = state.projects.find((candidate) => candidate.id === command.payload.projectId);
      if (!name || !project || project.workspaceId !== state.activeWorkspaceId) return state;
      return {
        ...state,
        projects: state.projects.map((candidate) => candidate.id === project.id
          ? {
            ...candidate,
            name,
            description: command.payload.description?.trim() || candidate.description,
            updatedAt: new Date().toISOString().split('T')[0],
          }
          : candidate),
      };
    }

    case 'DELETE_PROJECT': {
      const deletedProject = state.projects.find((project) => project.id === command.payload);
      if (!deletedProject || deletedProject.workspaceId !== state.activeWorkspaceId) return state;
      const filtered = state.projects.filter((p) => p.id !== command.payload);
      const deletedFigureIds = new Set(deletedProject?.figureIds || []);
      const remainingFigures = state.figures.filter((figure) => !deletedFigureIds.has(figure.id));
      const nextActive = state.activeProjectId === deletedProject.id
        ? filtered.find((p) => p.workspaceId === state.activeWorkspaceId) || null
        : filtered.find((p) => p.id === state.activeProjectId) || null;
      const nextFig = nextActive ? remainingFigures.find((figure) => nextActive.figureIds.includes(figure.id)) || null : null;
      const nextScopeState = { ...state, projects: filtered, activeProjectId: nextActive?.id || null };
      const nextAccessibleDatasetIds = getAccessibleDatasetIds(nextScopeState);
      const updatedWorkspaces = state.workspaces.map((workspace) => workspace.id === deletedProject.workspaceId
        ? { ...workspace, projectIds: workspace.projectIds.filter((projectId) => projectId !== deletedProject.id) }
        : workspace);

      return {
        ...state,
        workspaces: updatedWorkspaces,
        projects: filtered,
        figures: remainingFigures,
        activeProjectId: nextActive ? nextActive.id : null,
        figure: nextFig,
        activeFigureId: nextFig ? nextFig.id : null,
        selectedDatasetId: nextAccessibleDatasetIds.has(state.selectedDatasetId || '')
          ? state.selectedDatasetId
          : Array.from(nextAccessibleDatasetIds)[0] || null,
        provenance: nextFig ? getFigureLedger(state, nextFig.id) : { events: [] },
        provenanceByFigureId: Object.fromEntries(
          Object.entries(state.provenanceByFigureId).filter(([figureId]) => !deletedFigureIds.has(figureId))
        ),
        notesByFigureId: Object.fromEntries(
          Object.entries(state.notesByFigureId).filter(([figureId]) => !deletedFigureIds.has(figureId))
        ),
        analysisRuns: (state.analysisRuns || []).filter((run) => !run.figureId || !deletedFigureIds.has(run.figureId)),
        activePreview: deletedFigureIds.has(state.activePreview?.figureId || '') ? null : state.activePreview,
      };
    }

    case 'SWITCH_FIGURE': {
      const figId = command.payload;
      const targetFig = state.figures.find((f) => f.id === figId);
      const activeProject = state.projects.find((project) => project.id === state.activeProjectId);
      if (!targetFig || !activeProject?.figureIds.includes(figId)) return state;

      saveFigureToStorage(targetFig);
      return {
        ...state,
        figure: targetFig,
        activeFigureId: figId,
        provenance: getFigureLedger(state, figId),
        activePreview: null,
      };
    }

    case 'CREATE_FIGURE': {
      const activeProj = state.projects.find((p) => p.id === state.activeProjectId);
      if (!activeProj) return state;
      const figureCount = activeProj ? activeProj.figureIds.length + 1 : state.figures.length + 1;
      const title = command.payload?.name || `Figure ${figureCount}. New Canvas Composition`;
      
      // Keep the configured example useful without making new canvases inherit its bindings.
      const freshFig = createNewFigure(title);
      saveFigureToStorage(freshFig);

      const updatedProjects = state.projects.map((p) =>
        p.id === state.activeProjectId
          ? { ...p, figureIds: [...p.figureIds, freshFig.id], updatedAt: new Date().toISOString().split('T')[0] }
          : p
      );

      return {
        ...state,
        projects: updatedProjects,
        figures: [...state.figures, freshFig],
        figure: freshFig,
        activeFigureId: freshFig.id,
        activeView: 'figures',
        provenance: { events: [] },
        provenanceByFigureId: { ...state.provenanceByFigureId, [freshFig.id]: { events: [] } },
        activePreview: null,
      };
    }

    case 'DELETE_FIGURE': {
      const targetFigId = command.payload;
      const activeProject = state.projects.find((project) => project.id === state.activeProjectId);
      if (!activeProject || !activeProject.figureIds.includes(targetFigId)) return state;
      const filteredFigs = state.figures.filter((f) => f.id !== targetFigId);

      const updatedProjects = state.projects.map((p) => ({
        ...p,
        figureIds: p.id === activeProject.id ? p.figureIds.filter((id) => id !== targetFigId) : p.figureIds,
      }));

      const activeProj = updatedProjects.find((p) => p.id === state.activeProjectId);
      const currentFigureStillExists = filteredFigs.find((figure) => figure.id === state.activeFigureId) || null;
      const remainingFig = targetFigId === state.activeFigureId
        ? activeProj
          ? filteredFigs.find((figure) => activeProj.figureIds.includes(figure.id)) || null
          : null
        : currentFigureStillExists;

      return {
        ...state,
        projects: updatedProjects,
        figures: filteredFigs,
        figure: remainingFig,
        activeFigureId: remainingFig ? remainingFig.id : null,
        provenance: remainingFig ? getFigureLedger(state, remainingFig.id) : { events: [] },
        provenanceByFigureId: omitFigureRecord(state.provenanceByFigureId, targetFigId),
        notesByFigureId: omitFigureRecord(state.notesByFigureId, targetFigId),
        analysisRuns: (state.analysisRuns || []).filter((run) => run.figureId !== targetFigId),
        activePreview: state.activePreview?.figureId === targetFigId ? null : state.activePreview,
      };
    }

    case 'SELECT_DATASET':
      return getAccessibleDatasetIds(state).has(command.payload)
        ? { ...state, selectedDatasetId: command.payload }
        : state;

    case 'ADD_DATASET': {
      const { dataset: requestedDataset, scope } = command.payload;
      const existing = state.datasets.find((candidate) => candidate.id === requestedDataset.id);
      const dataset = existing && !datasetsHaveSameContent(existing, requestedDataset)
        ? { ...requestedDataset, id: importedDatasetId(requestedDataset.id, new Set(state.datasets.map((candidate) => candidate.id))) }
        : requestedDataset;
      const datasets = existing && dataset.id === existing.id
        ? state.datasets
        : [...state.datasets, dataset];

      registerDatasetRecord(dataset);

      let updatedProjects = state.projects;
      let updatedWorkspaces = state.workspaces;

      if (scope === 'project') {
        updatedProjects = state.projects.map((p) =>
          p.id === state.activeProjectId && !p.datasetIds.includes(dataset.id)
            ? { ...p, datasetIds: [...p.datasetIds, dataset.id] }
            : p
        );
      } else {
        updatedWorkspaces = state.workspaces.map((w) =>
          w.id === state.activeWorkspaceId && !w.sharedDatasetIds.includes(dataset.id)
            ? { ...w, sharedDatasetIds: [...w.sharedDatasetIds, dataset.id] }
            : w
        );
      }

      const nextState = {
        ...state,
        datasets,
        projects: updatedProjects,
        workspaces: updatedWorkspaces,
        selectedDatasetId: dataset.id,
      };
      saveDomainState(nextState);
      return nextState;
    }

    case 'TOGGLE_DATASET_SCOPE': {
      const { datasetId, scope } = command.payload;
      // Scope changes can refine an existing grant, but cannot grant access to an unrelated global record.
      if (!getAccessibleDatasetIds(state).has(datasetId)) return state;
      const updatedProjects = state.projects.map((p) => {
        if (p.id === state.activeProjectId) {
          const isScoped = p.datasetIds.includes(datasetId);
          const ids = scope === 'project'
            ? isScoped ? p.datasetIds.filter((id) => id !== datasetId) : [...p.datasetIds, datasetId]
            : p.datasetIds;
          return { ...p, datasetIds: ids };
        }
        return p;
      });

      const updatedWorkspaces = state.workspaces.map((w) => {
        if (w.id === state.activeWorkspaceId) {
          const isShared = w.sharedDatasetIds.includes(datasetId);
          const ids = scope === 'workspace'
            ? isShared ? w.sharedDatasetIds.filter((id) => id !== datasetId) : [...w.sharedDatasetIds, datasetId]
            : w.sharedDatasetIds;
          return { ...w, sharedDatasetIds: ids };
        }
        return w;
      });

      const nextState = {
        ...state,
        projects: updatedProjects,
        workspaces: updatedWorkspaces,
      };
      const accessibleAfter = getAccessibleDatasetIds(nextState);
      const figures = state.figures.map((figure) =>
        datasetAccessibleToFigure(nextState, figure, datasetId) ? figure : refreshFigureDatasetBindings(figure, datasetId, false),
      );
      const provenanceByFigureId = { ...state.provenanceByFigureId };
      figures.forEach((candidate, index) => {
        if (sameJson(candidate, state.figures[index])) return;
        provenanceByFigureId[candidate.id] = recordFigureRevision(
          state,
          candidate,
          `Dataset ${datasetId} became unavailable after a scope change`,
          'human',
          {
            actionType: 'CLEAR_DATASET',
            commandPayload: { datasetId, scope },
            figureSnapshot: state.figures.find((figure) => figure.id === candidate.id),
            validationReport: {
              valid: false,
              issues: [{ ruleId: 'DATASET-SCOPE', severity: 'blocking', path: `panels.${candidate.id}.datasetId`, message: 'The panel binding is outside its project/workspace scope.' }],
            },
          },
        );
      });
      nextState.figures = figures;
      nextState.figure = figures.find((figure) => figure.id === state.activeFigureId) || state.figure;
      nextState.provenanceByFigureId = provenanceByFigureId;
      nextState.provenance = nextState.figure ? provenanceByFigureId[nextState.figure.id] || state.provenance : state.provenance;
      nextState.selectedDatasetId = accessibleAfter.has(state.selectedDatasetId || '')
        ? state.selectedDatasetId
        : Array.from(accessibleAfter)[0] || null;
      saveDomainState(nextState);
      return nextState;
    }

    case 'UPDATE_DATASET': {
      const previousDataset = state.datasets.find((dataset) => dataset.id === command.payload.id);
      if (!previousDataset || !getAccessibleDatasetIds(state).has(command.payload.id)) return state;
      const datasets = state.datasets.map((d) => {
        if (d.id !== command.payload.id) return d;
        const revision = (d.revision || 0) + 1;
        return {
          ...d,
          rows: command.payload.rows,
          revision,
          revisionId: datasetRevisionId(d.id, revision, command.payload.rows),
        };
      });
      const updatedDataset = datasets.find((dataset) => dataset.id === command.payload.id);
      if (!updatedDataset) return state;
      registerDatasetRecord(updatedDataset);
      const figures = state.figures.map((figure) => refreshFigureDatasetBindings(figure, command.payload.id, true));
      const figure = state.figure ? figures.find((candidate) => candidate.id === state.figure?.id) || state.figure : null;
      const provenanceByFigureId = { ...state.provenanceByFigureId };
      figures.forEach((candidate) => {
        if (!candidate.panels.some((panel) => isDatasetBoundPanel(panel.spec) && panel.spec.datasetId === updatedDataset.id)) return;
        provenanceByFigureId[candidate.id] = recordFigureRevision(
          state,
          candidate,
          `Updated dataset ${updatedDataset.name}`,
          'human',
          {
            actionType: 'UPDATE_DATASET',
            commandPayload: { datasetId: updatedDataset.id, revisionId: updatedDataset.revisionId },
            datasetSnapshots: datasetsReferencedByFigure({ ...state, datasets }, candidate),
          },
        );
      });
      const provenance = figure ? provenanceByFigureId[figure.id] || getFigureLedger(state, figure.id) : state.provenance;
      const nextState = {
        ...state,
        datasets,
        figures,
        figure,
        provenance,
        provenanceByFigureId,
      };
      saveDomainState(nextState);
      return nextState;
    }

    case 'DELETE_DATASET': {
      const payload: any = (command as any).payload;
      const datasetId = typeof payload === 'string' ? payload : payload?.id;
      if (!datasetId || !getAccessibleDatasetIds(state).has(datasetId)) return state;
      const datasets = state.datasets.filter((d) => d.id !== datasetId);
      const updatedProjects = state.projects.map((p) => ({
        ...p,
        datasetIds: p.datasetIds.filter((id) => id !== datasetId),
      }));
      const updatedWorkspaces = state.workspaces.map((w) => ({
        ...w,
        sharedDatasetIds: w.sharedDatasetIds.filter((id) => id !== datasetId),
      }));
      const invalidatedFigures = state.figures.map((figure) => refreshFigureDatasetBindings(figure, datasetId, false));
      const provenanceByFigureId = { ...state.provenanceByFigureId };
      invalidatedFigures.forEach((candidate) => {
        if (!candidate.panels.some((panel) => isDatasetBoundPanel(panel.spec) && panel.spec.datasetId === datasetId)) return;
        const deletedDataset = state.datasets.find((dataset) => dataset.id === datasetId);
        if (deletedDataset) {
          provenanceByFigureId[candidate.id] = recordFigureRevision(
            state,
            candidate,
            `Deleted dataset ${deletedDataset.name}`,
            'human',
            {
              actionType: 'CLEAR_DATASET',
              commandPayload: { datasetId },
              figureSnapshot: state.figures.find((figure) => figure.id === candidate.id),
              datasetSnapshots: datasetsReferencedByFigure(state, candidate),
            },
          );
        }
      });
      const nextScopeState = { ...state, projects: updatedProjects, workspaces: updatedWorkspaces };
      const accessibleAfter = getAccessibleDatasetIds(nextScopeState);
      const selectedDatasetId = accessibleAfter.has(state.selectedDatasetId || '')
        ? state.selectedDatasetId
        : Array.from(accessibleAfter)[0] || null;
      const nextState = {
        ...state,
        datasets,
        figures: invalidatedFigures,
        projects: updatedProjects,
        workspaces: updatedWorkspaces,
        selectedDatasetId,
        analysisRuns: (state.analysisRuns || []).map((run) => run.datasetId === datasetId
          ? {
              ...run,
              status: 'unavailable' as const,
              unavailableReason: `Source dataset '${datasetId}' was deleted; the recorded result is retained for audit but cannot be interpreted or exported.`,
            }
          : run),
      };
      nextState.figure = nextState.figures.find((figure) => figure.id === state.figure?.id) || state.figure;
      nextState.provenanceByFigureId = provenanceByFigureId;
      nextState.provenance = nextState.figure ? provenanceByFigureId[nextState.figure.id] || state.provenance : state.provenance;
      unregisterRuntimeDataset(datasetId);
      saveDomainState(nextState);
      return nextState;
    }



    case 'UPDATE_PANEL_SPEC': {
      if (!state.figure) return state;
      if (
        isDatasetBoundPanel(command.payload.spec) &&
        command.payload.spec.datasetId &&
        !getAccessibleDatasetIds(state).has(command.payload.spec.datasetId)
      ) {
        return state;
      }
      const updatedPanels = state.figure.panels.map((p) =>
        p.id === command.payload.panelId ? { ...p, spec: command.payload.spec } : p
      );
      const figure = { ...state.figure, panels: updatedPanels };
      saveFigureToStorage(figure);
      const nextState = replaceFigure(state, figure);
      const provenance = recordFigureRevision(
        state,
        figure,
        'Updated panel specification',
        'human',
        {
          panelId: command.payload.panelId,
          actionType: 'DIRECT_HUMAN_EDIT',
          validationReport: figureValidationReport(state, figure),
          datasetSnapshots: datasetsReferencedByFigure(state, figure),
        },
      );
      return { ...nextState, provenance, provenanceByFigureId: { ...state.provenanceByFigureId, [figure.id]: provenance } };
    }

    case 'UPDATE_PANEL_FRAME': {
      if (!state.figure) return state;
      const updatedPanels = state.figure.panels.map((p) =>
        p.id === command.payload.panelId ? { ...p, frame: command.payload.frame } : p
      );
      const figure = { ...state.figure, panels: updatedPanels };
      saveFigureToStorage(figure);
      return replaceFigure(state, figure);
    }

    case 'SET_ACTIVE_THEME': {
      if (!state.figure) return state;
      const figure = { ...state.figure, activeThemeId: command.payload };
      saveFigureToStorage(figure);
      saveActiveThemeId(command.payload);
      return replaceFigure(state, figure);
    }

    case 'SET_CANVAS_SIZE': {
      if (!state.figure) return state;
      const figure = { ...state.figure, canvasSize: command.payload };
      saveFigureToStorage(figure);
      return replaceFigure(state, figure);
    }

    case 'UPDATE_FIGURE_NAME': {
      if (!state.figure) return state;
      const figure = { ...state.figure, name: command.payload };
      saveFigureToStorage(figure);
      const updatedFigures = state.figures.map((f) => (f.id === figure.id ? figure : f));
      return { ...replaceFigure(state, figure), figures: updatedFigures };
    }

    case 'LOAD_FIGURE': {
      if (command.payload.panels.some((panel) =>
        isDatasetBoundPanel(panel.spec) && panel.spec.datasetId && !getAccessibleDatasetIds(state).has(panel.spec.datasetId),
      )) return state;
      saveFigureToStorage(command.payload);
      const exists = state.figures.some((f) => f.id === command.payload.id);
      const figures = exists
        ? state.figures.map((f) => (f.id === command.payload.id ? command.payload : f))
        : [...state.figures, command.payload];
      const ledger = getFigureLedger(state, command.payload.id);
      const provenance = command.recordProvenance
        ? recordFigureRevision(
            state,
            command.payload,
            'Human edited figure',
            'human',
            {
              actionType: 'DIRECT_HUMAN_EDIT',
              validationReport: figureValidationReport(state, command.payload),
              commandPayload: { source: 'editor' },
              datasetSnapshots: datasetsReferencedByFigure(state, command.payload),
            },
          )
        : ledger;
      return {
        ...state,
        figure: command.payload,
        activeFigureId: command.payload.id,
        figures,
        provenance,
        provenanceByFigureId: { ...state.provenanceByFigureId, [command.payload.id]: provenance },
        activePreview: null,
      };
    }

    case 'RESET_FIGURE': {
      const fresh = {
        ...createNewFigure(`Reset Canvas ${new Date().toLocaleTimeString()}`),
        id: state.figure?.id || `fig-${Date.now()}`,
      };
      saveFigureToStorage(fresh);
      const provenance = recordFigureRevision(
        state,
        fresh,
        'Reset figure canvas',
        'human',
        { actionType: 'DIRECT_HUMAN_EDIT', commandPayload: { action: 'RESET_FIGURE' } },
      );
      return {
        ...replaceFigure(state, fresh),
        provenance,
        provenanceByFigureId: { ...state.provenanceByFigureId, [fresh.id]: provenance },
        activePreview: null,
      };
    }

    case 'IMPORT_FIGURE_BUNDLE': {
      const { figure: requestedFigure, datasets: requestedDatasets = [], notes, provenance, analysisRuns = [] } = command.payload;
      const existingIds = new Set(state.datasets.map((dataset) => dataset.id));
      const idMap = new Map<string, string>();
      const importedDatasets = requestedDatasets.map((requestedDataset) => {
        const existing = state.datasets.find((dataset) => dataset.id === requestedDataset.id);
        if (!existing) {
          idMap.set(requestedDataset.id, requestedDataset.id);
          existingIds.add(requestedDataset.id);
          return requestedDataset;
        }
        if (datasetsHaveSameContent(existing, requestedDataset)) {
          idMap.set(requestedDataset.id, existing.id);
          return null;
        }
        const remappedId = importedDatasetId(requestedDataset.id, existingIds);
        idMap.set(requestedDataset.id, remappedId);
        existingIds.add(remappedId);
        return { ...requestedDataset, id: remappedId };
      }).filter(Boolean) as typeof requestedDatasets;
      const existingFigureIds = new Set(state.figures.map((figure) => figure.id));
      const importedFig = {
        ...remapFigureDatasetIds(requestedFigure, idMap),
        id: existingFigureIds.has(requestedFigure.id) ? importedFigureId(requestedFigure.id, existingFigureIds) : requestedFigure.id,
      };
      saveFigureToStorage(importedFig);

      importedDatasets.forEach(registerDatasetRecord);
      const datasets = [...state.datasets, ...importedDatasets];
      const importedDatasetIds = requestedDatasets
        .map((dataset) => idMap.get(dataset.id))
        .filter((datasetId): datasetId is string => Boolean(datasetId));

      const updatedProjects = state.projects.map((p) =>
        p.id === state.activeProjectId
          ? {
              ...p,
              figureIds: Array.from(new Set([...p.figureIds, importedFig.id])),
              datasetIds: command.payload.scope === 'project'
                ? Array.from(new Set([...p.datasetIds, ...importedDatasetIds]))
                : p.datasetIds,
            }
          : p
      );
      const updatedWorkspaces = command.payload.scope === 'workspace'
        ? state.workspaces.map((workspace) => workspace.id === state.activeWorkspaceId
          ? { ...workspace, sharedDatasetIds: Array.from(new Set([...workspace.sharedDatasetIds, ...importedDatasetIds])) }
          : workspace)
        : state.workspaces;
      const figureIdMap = new Map([[requestedFigure.id, importedFig.id]]);
      const importedLedger = provenance
        ? remapImportedLedger(provenance, idMap, figureIdMap)
        : getFigureLedger(state, importedFig.id);
      const scopedImportedLedger = {
        events: importedLedger.events.map((event) => event.scopeSnapshot
          ? {
              ...event,
              scopeSnapshot: {
                ...event.scopeSnapshot,
                workspaceId: state.activeWorkspaceId,
                projectId: state.activeProjectId || event.scopeSnapshot.projectId,
              },
            }
          : event),
      };
      const availableImportedDatasetIds = new Set([...state.datasets, ...importedDatasets].map((dataset) => dataset.id));
      const existingRunIds = new Set((state.analysisRuns || []).map((run) => run.id));
      const importedAnalysisRuns = analysisRuns.map((run) => {
        const sourceRunId = run.sourceRunId || run.id;
        let runId = `imported-${sourceRunId}`;
        let suffix = 2;
        while (existingRunIds.has(runId)) runId = `imported-${sourceRunId}-${suffix++}`;
        existingRunIds.add(runId);
        const datasetId = idMap.get(run.datasetId) || run.datasetId;
        const sourceAvailable = availableImportedDatasetIds.has(datasetId);
        return {
          ...run,
          id: runId,
          sourceRunId,
          figureId: importedFig.id,
          datasetId,
          status: sourceAvailable ? (run.status || 'complete') : 'unavailable' as const,
          unavailableReason: sourceAvailable
            ? run.unavailableReason
            : `Source dataset '${datasetId}' was not included in the imported bundle.`,
        };
      });

      return {
        ...state,
        datasets,
        projects: updatedProjects,
        workspaces: updatedWorkspaces,
        figures: state.figures.some((figure) => figure.id === importedFig.id)
          ? state.figures.map((figure) => figure.id === importedFig.id ? importedFig : figure)
          : [...state.figures, importedFig],
        figure: importedFig,
        activeFigureId: importedFig.id,
        activeView: 'figures',
        provenance: scopedImportedLedger,
        provenanceByFigureId: { ...state.provenanceByFigureId, [importedFig.id]: scopedImportedLedger },
        notesByFigureId: notes ? { ...state.notesByFigureId, [importedFig.id]: notes } : state.notesByFigureId,
        analysisRuns: [...(state.analysisRuns || []), ...importedAnalysisRuns],
        activePreview: null,
      };
    }

    case 'APPROVE_PREVIEW_UI': {
      if (!state.activePreview || state.activePreview.previewId !== command.payload.previewId) return state;
      return {
        ...state,
        activePreview: {
          ...state.activePreview,
          approvedInUI: true,
          approval: { approvedAt: Date.now(), approvedBy: 'human', source: command.payload.source },
        },
      };
    }

    case 'APPLY_PROPOSAL': {
      const { panelId, spec, commitMessage, workspacePatch, provenance: provenanceMetadata } = command.payload;
      const preview = state.activePreview;
      const stagedPrimarySpec = preview?.panelKind === 'single-chart'
        ? {
            kind: 'single-chart',
            spec: (preview.proposedSpec as any)?.kind === 'single-chart' ? (preview.proposedSpec as any).spec : preview.proposedSpec,
            ...((preview as any).datasetId ? { datasetId: (preview as any).datasetId } : {}),
          }
        : preview?.proposedSpec;
      if (
        !state.figure ||
        !preview ||
        preview.figureId !== state.figure.id ||
        preview.panelId !== panelId ||
        !preview.approvedInUI ||
        preview.approval?.approvedBy !== 'human' ||
        preview.approval?.source !== 'native-confirmation' ||
        !command.payload.approval ||
        command.payload.approval.previewId !== preview.previewId ||
        provenanceMetadata?.previewId !== preview.previewId ||
        provenanceMetadata?.panelId !== panelId ||
        getFigureLedger(state, state.figure.id).events.length + 1 !== provenanceMetadata?.basedOnRevision ||
        !state.figure.panels.some((panel) => panel.id === panelId) ||
        !sameJson(spec, stagedPrimarySpec) ||
        !safeProposalSpec(stagedPrimarySpec) ||
        (isDatasetBoundPanel(stagedPrimarySpec as any) && (stagedPrimarySpec as any).datasetId && !getAccessibleDatasetIds(state).has((stagedPrimarySpec as any).datasetId))
      ) {
        return state;
      }
      const validPanelIds = new Set(state.figure.panels.map((panel) => panel.id));
      if (
        !sameJson(workspacePatch, preview.workspacePatch) ||
        (workspacePatch?.panelChanges || []).some((change) => !validPanelIds.has(change.panelId) || (change.spec && (!safeProposalSpec(change.spec) || (isDatasetBoundPanel(change.spec) && change.spec.datasetId && !getAccessibleDatasetIds(state).has(change.spec.datasetId))))) ||
        (workspacePatch?.layerOrder && (
          workspacePatch.layerOrder.length !== validPanelIds.size ||
          new Set(workspacePatch.layerOrder).size !== workspacePatch.layerOrder.length ||
          workspacePatch.layerOrder.some((panelId) => !validPanelIds.has(panelId))
        ))
      ) {
        return state;
      }
      const patchByPanelId = new Map((workspacePatch?.panelChanges || []).map((change) => [change.panelId, change]));
      const updatedPanels = state.figure.panels.map((p) => {
        const change = patchByPanelId.get(p.id);
        return {
          ...p,
          spec: p.id === panelId ? spec : change?.spec || p.spec,
          ...(change?.frame ? { frame: change.frame } : {}),
        };
      });
      const updatedLayers = workspacePatch?.layerOrder
        ? workspacePatch.layerOrder.map((panelIdInOrder, order) => {
            const layer = state.figure.layers.find((candidate) => candidate.panelId === panelIdInOrder);
            return layer ? { ...layer, order } : null;
          }).filter(Boolean) as typeof state.figure.layers
        : state.figure.layers;
      const updatedFigure = { ...state.figure, panels: updatedPanels, layers: updatedLayers };
      saveFigureToStorage(updatedFigure);

      const provenance = recordFigureRevision(
        state,
        updatedFigure,
        commitMessage || 'Applied WebMCP agent proposal',
        'agent',
        {
          panelId,
          previewId: provenanceMetadata?.previewId,
          approval: preview.approval,
          basedOnRevision: provenanceMetadata?.basedOnRevision,
          validationReport: provenanceMetadata?.validationReport,
          commandPayload: provenanceMetadata?.commandPayload,
          diffDescription: [
            `Updated ${updatedFigure.panels.find((panel) => panel.id === panelId)?.label || panelId}`,
            ...(workspacePatch?.panelChanges || [])
              .filter((change) => change.panelId !== panelId)
              .map((change) => `Updated ${change.panelId}`),
            ...(workspacePatch?.layerOrder ? ['Reordered workspace panels'] : []),
          ],
          workspaceSnapshot: updatedFigure.panels
            .map((panel) => ({ panelId: panel.id, kind: panel.spec.kind, spec: panel.spec, frame: panel.frame })),
          workspaceLayerOrder: [...updatedFigure.layers].sort((a, b) => a.order - b.order).map((layer) => layer.panelId),
          datasetSnapshots: datasetsReferencedByFigure(state, updatedFigure),
        }
      );

      return {
        ...state,
        figure: updatedFigure,
        figures: state.figures.map((figure) => figure.id === updatedFigure.id ? updatedFigure : figure),
        provenance,
        provenanceByFigureId: { ...state.provenanceByFigureId, [updatedFigure.id]: provenance },
        activePreview: null,
      };
    }

    case 'RESTORE_SNAPSHOT': {
      if (!state.figure) return state;
      const activeLedger = getFigureLedger(state, state.figure.id);
      const event = activeLedger.events.find((candidate) => candidate.revision === command.payload.targetRevision);
      if (!event) return state;
      const panelId = event.targetPanelId || event.commandPayload?.targetPanelId || event.commandPayload?.panelId || state.figure.panels[0]?.id;
      if (event.figureSnapshot) {
        const restoredFigure = structuredClone(event.figureSnapshot);
        const withDatasets = restoreDatasetSnapshots(state, event.datasetSnapshots || []);
        const restoredState = restoreScopeSnapshot(withDatasets, event.scopeSnapshot);
        saveFigureToStorage(restoredFigure);
        const provenance = recordFigureRevision(
          restoredState,
          restoredFigure,
          `Restored ${restoredFigure.name} from Revision ${event.revision}`,
          'human',
          {
            basedOnRevision: activeLedger.events.length + 1,
            validationReport: event.validationReport,
            actionType: 'TIME_TRAVEL_RESTORE',
            commandPayload: { targetRevision: event.revision },
            datasetSnapshots: datasetsReferencedByFigure(restoredState, restoredFigure),
          },
        );
        return {
          ...restoredState,
          figure: restoredFigure,
          figures: restoredState.figures.map((figure) => figure.id === restoredFigure.id ? restoredFigure : figure),
          provenance,
          provenanceByFigureId: { ...state.provenanceByFigureId, [restoredFigure.id]: provenance },
        };
      }
      const currentPanel = state.figure.panels.find((panel) => panel.id === panelId);
      if (!currentPanel) return state;
      const historicalSnapshots = event.workspaceSnapshot?.length
        ? event.workspaceSnapshot
        : [{ panelId, kind: event.targetPanelKind || currentPanel.spec.kind, spec: event.specSnapshot as any, frame: currentPanel.frame }];
      const normalizeSnapshot = (snapshot: { kind: string; spec: any }) => {
        if (snapshot.spec?.kind === snapshot.kind) return snapshot.spec;
        if (snapshot.kind === 'single-chart') {
          return { kind: 'single-chart', spec: snapshot.spec };
        }
        return { ...snapshot.spec, kind: snapshot.kind };
      };
      const restoredFigure = {
        ...state.figure,
        panels: state.figure.panels.map((panel) => {
          const snapshot = historicalSnapshots.find((candidate) => candidate.panelId === panel.id);
          return snapshot
            ? { ...panel, spec: normalizeSnapshot(snapshot), frame: snapshot.frame || panel.frame }
            : panel;
        }),
        layers: event.workspaceLayerOrder
          ? event.workspaceLayerOrder.map((panelIdInOrder, order) => {
              const layer = state.figure.layers.find((layer) => layer.panelId === panelIdInOrder);
              return layer ? { ...layer, order } : null;
            }).filter(Boolean) as typeof state.figure.layers
          : state.figure.layers,
      };
      const withDatasets = restoreDatasetSnapshots(state, event.datasetSnapshots || []);
      const restoredState = restoreScopeSnapshot(withDatasets, event.scopeSnapshot);
      saveFigureToStorage(restoredFigure);
      const provenance = recordFigureRevision(
        restoredState,
        restoredFigure,
        `Restored ${currentPanel.label} from Revision ${event.revision}`,
        'human',
        {
          panelId,
          basedOnRevision: activeLedger.events.length + 1,
          validationReport: event.validationReport,
          actionType: 'TIME_TRAVEL_RESTORE',
          commandPayload: { targetRevision: event.revision, panelId },
          datasetSnapshots: datasetsReferencedByFigure(restoredState, restoredFigure),
        }
      );
      return {
        ...restoredState,
        figure: restoredFigure,
        figures: restoredState.figures.map((figure) => figure.id === restoredFigure.id ? restoredFigure : figure),
        provenance,
        provenanceByFigureId: { ...state.provenanceByFigureId, [restoredFigure.id]: provenance },
      };
    }

    case 'SET_PREVIEW': {
      const preview = command.payload.preview;
      if (!state.figure || preview.figureId !== state.figure.id || !state.figure.panels.some((panel) => panel.id === preview.panelId)) {
        return state;
      }
      return { ...state, activePreview: preview };
    }

    case 'CLEAR_PREVIEW':
      return { ...state, activePreview: null };

    case 'SET_FIGURE_NOTES': {
      if (!state.figures.some((figure) => figure.id === command.payload.figureId)) return state;
      return {
        ...state,
        notesByFigureId: {
          ...state.notesByFigureId,
          [command.payload.figureId]: {
            ...state.notesByFigureId[command.payload.figureId],
            ...command.payload.notes,
            updatedAt: new Date().toISOString(),
          },
        },
      };
    }

    case 'RECORD_ANALYSIS_RUN': {
      const dataset = state.datasets.find((candidate) => candidate.id === command.payload.datasetId);
      if (!dataset || !getAccessibleDatasetIds(state).has(dataset.id)) return state;
      const run = {
        ...command.payload,
        id: command.payload.id || `analysis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        figureId: command.payload.figureId || state.activeFigureId || undefined,
        datasetRevisionId: command.payload.datasetRevisionId || dataset.revisionId,
        status: command.payload.status || 'complete',
        createdAt: command.payload.createdAt || new Date().toISOString(),
      };
      const nextState = { ...state, analysisRuns: [...(state.analysisRuns || []), run] };
      saveDomainState(nextState);
      return nextState;
    }

    case 'SET_WEBMCP_CONNECTED':
      return { ...state, isWebMcpConnected: command.payload };

    default:
      return state;
  }
}

export type FigureDomainAction = DomainCommand;

export interface ApplyResult {
  status: 'applied' | 'rejected_stale' | 'rejected_unknown_preview' | 'rejected_unapproved' | 'rejected_invalid_target' | 'rejected_wrong_target';
  newRevision: number;
  appliedSpec: any;
  provenanceEventId: string;
  message: string;
}

