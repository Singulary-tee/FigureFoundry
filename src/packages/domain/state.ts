import { DatasetRecord, BUILTIN_DATASETS } from '../data-model/datasets';
import { FigureProject } from '../../types/multipanel';
import { FigurePreview } from '../../types';
import { ProvenanceLedger } from '../provenance/ledger';
import { DEFAULT_MULTIPANEL_FIGURE } from '../multipanel/defaultFigure';

export type ActiveView = 'dashboard' | 'data' | 'analyses' | 'projects' | 'notes' | 'settings' | 'help' | 'figures';

export interface Account {
  id: string;
  type: 'guest' | 'authenticated';
  activeWorkspaceId: string;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  memberIds: string[];
  sharedDatasetIds: string[]; // Shared across all projects in this workspace
  projectIds: string[];
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  datasetIds: string[]; // Scoped specifically to this project
  figureIds: string[];  // Figures belonging to this project
  createdAt: string;
  updatedAt: string;
}

export interface FigureNotes {
  legend?: string;
  methods?: string;
  research?: string;
  updatedAt: string;
}

export interface AnalysisRun {
  id: string;
  figureId?: string;
  datasetId: string;
  datasetRevisionId?: string;
  operation: string;
  fields: string[];
  inputs: Record<string, unknown>;
  result: Record<string, unknown>;
  status: 'complete' | 'unavailable';
  unavailableReason?: string;
  sourceRunId?: string;
  actor: 'agent' | 'human';
  createdAt: string;
}

export interface DomainState {
  account: Account;
  workspaces: Workspace[];
  activeWorkspaceId: string;
  projects: Project[];
  activeProjectId: string | null;
  figures: FigureProject[];
  activeFigureId: string | null;
  figure: FigureProject | null;
  datasets: DatasetRecord[];
  selectedDatasetId: string | null;
  activeView: ActiveView;
  /** The active figure's ledger, retained for compatibility with existing views. */
  provenance: ProvenanceLedger;
  /** Ledgers are independent because revisions are meaningful only within one figure. */
  provenanceByFigureId: Record<string, ProvenanceLedger>;
  notesByFigureId: Record<string, FigureNotes>;
  analysisRuns: AnalysisRun[];
  isWebMcpConnected: boolean;
  activePreview: FigurePreview | null;
}

/** Dataset IDs visible to the active project, including its workspace shares. */
export function getAccessibleDatasetIds(state: DomainState): Set<string> {
  const activeProject = state.projects.find((project) =>
    project.id === state.activeProjectId && project.workspaceId === state.activeWorkspaceId,
  );
  const activeWorkspace = state.workspaces.find((workspace) => workspace.id === state.activeWorkspaceId);
  const knownDatasetIds = new Set(state.datasets.map((dataset) => dataset.id));
  return new Set(
    [
      ...(activeProject?.datasetIds || []),
      ...(activeWorkspace?.sharedDatasetIds || []),
    ].filter((datasetId) => knownDatasetIds.has(datasetId)),
  );
}

export function isDatasetAccessible(state: DomainState, datasetId: string): boolean {
  return getAccessibleDatasetIds(state).has(datasetId);
}

export const INITIAL_DOMAIN_STATE: DomainState = {
  account: {
    id: 'acc-1',
    type: 'guest',
    activeWorkspaceId: 'ws-1',
  },
  workspaces: [
    {
      id: 'ws-1',
      name: 'Example Workspace',
      ownerId: 'acc-1',
      memberIds: ['acc-1'],
      sharedDatasetIds: [], // Removed demo datasets from workspace level to prevent inheritance
      projectIds: ['proj-1'],
    },
  ],
  activeWorkspaceId: 'ws-1',
  projects: [
    {
      id: 'proj-1',
      workspaceId: 'ws-1',
      name: 'Example Project',
      description: 'An example data exploration and figure composition project.',
      datasetIds: ['palmer-penguins', 'gapminder-life-expectancy', 'example-study-estimates'],
      figureIds: [DEFAULT_MULTIPANEL_FIGURE.id],
      createdAt: '2026-08-31',
      updatedAt: '2026-08-31',
    },
  ],
  activeProjectId: 'proj-1',
  figures: [DEFAULT_MULTIPANEL_FIGURE],
  activeFigureId: DEFAULT_MULTIPANEL_FIGURE.id,
  figure: DEFAULT_MULTIPANEL_FIGURE,
  datasets: Object.values(BUILTIN_DATASETS),
  selectedDatasetId: 'palmer-penguins',
  activeView: 'figures',
  provenance: { events: [] },
  provenanceByFigureId: { [DEFAULT_MULTIPANEL_FIGURE.id]: { events: [] } },
  notesByFigureId: {},
  analysisRuns: [],
  isWebMcpConnected: true,
  activePreview: null,
};
