import { DomainState, INITIAL_DOMAIN_STATE, getAccessibleDatasetIds } from './state';
import { hydrateRuntimeDatasets } from '../data-model/profiler';
import { isDatasetBoundPanel } from '../multipanel/datasetBinding';
import { snapPanelFrame } from '../multipanel/layout';

const DOMAIN_STATE_KEY = 'figurefoundry_domain_state_v1';

function normalizeFigureBindings(figure: DomainState['figure'], accessibleDatasetIds: Set<string>) {
  if (!figure) return figure;
  return {
    ...figure,
    canvasSize: {
      ...figure.canvasSize,
      dpi: Number.isFinite(figure.canvasSize?.dpi) ? figure.canvasSize.dpi : 300,
    },
    panels: figure.panels.map((panel) => {
      const safeFrame = snapPanelFrame(panel.frame, figure.canvasSize);
      if (!isDatasetBoundPanel(panel.spec) || !panel.spec.datasetId || accessibleDatasetIds.has(panel.spec.datasetId)) {
        return safeFrame === panel.frame ? panel : { ...panel, frame: safeFrame };
      }
      return {
        ...panel,
        frame: safeFrame,
        spec: {
          ...panel.spec,
          datasetId: undefined,
          bindingIssues: ['Panel dataset is outside the active project scope. Rebind this panel.'],
          ...(panel.spec.kind === 'forest-plot' ? { studies: [], pooledEstimate: { ...panel.spec.pooledEstimate, effect: Number.NaN, ciLower: Number.NaN, ciUpper: Number.NaN, label: 'Awaiting dataset' } } : {}),
          ...(panel.spec.kind === 'funnel-plot' ? { points: [] } : {}),
          ...(panel.spec.kind === 'grouped-bar' ? { groups: [] } : {}),
          ...(panel.spec.kind === 'subgroup-analysis' ? { subgroups: [] } : {}),
        } as typeof panel.spec,
      };
    }),
  };
}

function accessibleIdsForFigure(state: DomainState, figureId: string): Set<string> {
  const owner = state.projects.find((project) => project.figureIds.includes(figureId));
  if (!owner) return getAccessibleDatasetIds(state);
  const workspace = state.workspaces.find((candidate) => candidate.id === owner.workspaceId);
  const known = new Set(state.datasets.map((dataset) => dataset.id));
  return new Set([...owner.datasetIds, ...(workspace?.sharedDatasetIds || [])].filter((id) => known.has(id)));
}

/** Persist catalog and provenance; a pending WebMCP proposal remains session-scoped. */
export function loadDomainState(): DomainState {
  if (typeof window === 'undefined') return INITIAL_DOMAIN_STATE;
  try {
    const raw = localStorage.getItem(DOMAIN_STATE_KEY);
    if (!raw) return INITIAL_DOMAIN_STATE;
    const saved = JSON.parse(raw) as Partial<DomainState>;
    const persistedDatasets = saved.datasets || [];
    const datasets = [
      ...INITIAL_DOMAIN_STATE.datasets.filter((dataset) => !persistedDatasets.some((candidate) => candidate.id === dataset.id)),
      ...persistedDatasets,
    ];
    const storedFigures = saved.figures || INITIAL_DOMAIN_STATE.figures;
    const storedStarter = storedFigures.find((candidate) => candidate.id === INITIAL_DOMAIN_STATE.activeFigureId);
    const starterNeedsRefresh = storedStarter?.panels.some((panel) =>
      panel.spec.kind !== 'text-caption' && (!panel.spec.datasetId || Boolean(panel.spec.bindingIssues?.length)),
    );
    const figures = starterNeedsRefresh
      ? storedFigures.map((candidate) => candidate.id === INITIAL_DOMAIN_STATE.activeFigureId ? INITIAL_DOMAIN_STATE.figures[0] : candidate)
      : storedFigures;
    const activeFigureId = saved.activeFigureId || saved.figure?.id || figures[0]?.id || null;
    const figure = figures.find((candidate) => candidate.id === activeFigureId) || figures[0] || null;
    const legacyLedger = saved.provenance || INITIAL_DOMAIN_STATE.provenance;
    const provenanceByFigureId = {
      ...INITIAL_DOMAIN_STATE.provenanceByFigureId,
      ...(saved.provenanceByFigureId || {}),
      ...(activeFigureId && !saved.provenanceByFigureId ? { [activeFigureId]: legacyLedger } : {}),
    };
    const restoresStarterProject = Boolean(saved.figures?.some((candidate) => candidate.id === INITIAL_DOMAIN_STATE.activeFigureId));
    const restoredProjects = (saved.projects || INITIAL_DOMAIN_STATE.projects).map((project) =>
      restoresStarterProject && project.id === 'proj-1'
        ? { ...project, datasetIds: Array.from(new Set([...project.datasetIds, ...INITIAL_DOMAIN_STATE.projects[0].datasetIds])) }
        : project,
    );
    const restored: DomainState = {
      ...INITIAL_DOMAIN_STATE,
      ...saved,
      account: { ...INITIAL_DOMAIN_STATE.account, ...saved.account },
      workspaces: saved.workspaces || INITIAL_DOMAIN_STATE.workspaces,
      projects: restoredProjects,
      figures,
      activeFigureId,
      figure,
      datasets,
      provenance: activeFigureId ? provenanceByFigureId[activeFigureId] || { events: [] } : { events: [] },
      provenanceByFigureId,
      notesByFigureId: saved.notesByFigureId || {},
      analysisRuns: saved.analysisRuns || [],
      activePreview: null,
      isWebMcpConnected: INITIAL_DOMAIN_STATE.isWebMcpConnected,
    };
    hydrateRuntimeDatasets(restored.datasets);
    restored.figures = restored.figures.map((candidate) => normalizeFigureBindings(candidate, accessibleIdsForFigure(restored, candidate.id))!);
    restored.figure = normalizeFigureBindings(restored.figure, restored.figure ? accessibleIdsForFigure(restored, restored.figure.id) : getAccessibleDatasetIds(restored));
    if (restored.figure) {
      restored.figures = restored.figures.map((candidate) => candidate.id === restored.figure?.id ? restored.figure : candidate);
    }
    const accessibleDatasetIds = getAccessibleDatasetIds(restored);
    restored.selectedDatasetId = accessibleDatasetIds.has(restored.selectedDatasetId || '')
      ? restored.selectedDatasetId
      : Array.from(accessibleDatasetIds)[0] || null;
    return restored;
  } catch {
    return INITIAL_DOMAIN_STATE;
  }
}

export function saveDomainState(state: DomainState): void {
  if (typeof window === 'undefined') return;
  try {
    const { activePreview, isWebMcpConnected, ...persisted } = state;
    localStorage.setItem(DOMAIN_STATE_KEY, JSON.stringify(persisted));
  } catch {
    // Storage is best effort; the in-memory state remains authoritative.
  }
}
