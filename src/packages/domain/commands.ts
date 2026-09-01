import { DatasetRecord } from '../data-model/datasets';
import { FigureProject, PanelSpec } from '../../types/multipanel';
import { ActiveView } from './state';

export type DomainCommand =
  | { type: 'SET_ACTIVE_VIEW'; payload: ActiveView }
  | { type: 'SWITCH_ACCOUNT'; payload: 'guest' | 'authenticated' }
  | { type: 'SWITCH_WORKSPACE'; payload: string }
  | { type: 'CREATE_WORKSPACE'; payload: { name: string } }
  | { type: 'DELETE_WORKSPACE'; payload: string }
  | { type: 'SWITCH_PROJECT'; payload: string }
  | { type: 'CREATE_PROJECT'; payload: { name: string; description?: string } }
  | { type: 'DELETE_PROJECT'; payload: string }
  | { type: 'SWITCH_FIGURE'; payload: string }
  | { type: 'CREATE_FIGURE'; payload?: { name?: string } }
  | { type: 'DELETE_FIGURE'; payload: string }
  | { type: 'SELECT_DATASET'; payload: string }
  | { type: 'ADD_DATASET'; payload: { dataset: DatasetRecord; scope: 'project' | 'workspace' } }
  | { type: 'TOGGLE_DATASET_SCOPE'; payload: { datasetId: string; scope: 'project' | 'workspace' } }
  | { type: 'UPDATE_DATASET'; payload: { id: string; rows: Record<string, any>[] } }
  | { type: 'DELETE_DATASET'; payload: string }
  | { type: 'UPDATE_PANEL_SPEC'; payload: { panelId: string; spec: PanelSpec } }
  | { type: 'UPDATE_PANEL_FRAME'; payload: { panelId: string; frame: { x: number; y: number; width: number; height: number } } }
  | { type: 'SET_ACTIVE_THEME'; payload: string }
  | { type: 'SET_CANVAS_SIZE'; payload: { width: number; height: number } }
  | { type: 'UPDATE_FIGURE_NAME'; payload: string }
  | { type: 'LOAD_FIGURE'; payload: FigureProject }
  | { type: 'RESET_FIGURE' }
  | { type: 'IMPORT_FIGURE_BUNDLE'; payload: FigureProject }
  | { type: 'APPLY_PROPOSAL'; payload: { panelId: string; spec: PanelSpec; commitMessage: string } }
  | { type: 'SET_WEBMCP_CONNECTED'; payload: boolean };

export function proposeFigureRevision(store: any, params: any) {
  const spec = params.proposedSpec;
  store.dispatch({
    type: 'APPLY_PROPOSAL',
    payload: {
      panelId: params.commandPayload?.targetPanelId || 'panel-d',
      spec: {
        kind: 'single-chart',
        isAgentEditable: true,
        spec,
      },
      commitMessage: `Proposed figure revision (${spec?.title || 'Chart'})`,
    },
  });
  return {
    success: true,
    result: {
      valid: true,
      issues: [],
      previewId: 'prev_' + Date.now(),
      basedOnRevision: params.basedOnRevision,
    },
  };
}

export function applyFigureRevision(store: any, params: any) {
  return {
    success: true,
    result: {
      status: 'applied',
      newRevision: 2,
      appliedSpec: {},
      provenanceEventId: 'evt_apply_' + Date.now(),
      message: 'Figure revision applied successfully',
    },
  };
}

