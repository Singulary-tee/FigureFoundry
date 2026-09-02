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
  | { type: 'SET_PREVIEW'; payload: { preview: any } }
  | { type: 'CLEAR_PREVIEW' }
  | { type: 'SET_WEBMCP_CONNECTED'; payload: boolean };

import { profileDataset } from '../data-model/profiler';
import { validateFigureSpec } from '../validation/validator';

/**
 * Two-phase proposal, phase 1: validate the candidate spec, stage it as a
 * pending preview in the domain store, and return the preview handle.
 * NOTHING is applied here — application only happens in applyFigureRevision
 * after the browser-native user confirmation gate.
 */
export function proposeFigureRevision(store: any, params: any) {
  const spec = params.proposedSpec;
  const datasetId = store.getState().datasetId || 'palmer-penguins';
  const profile = profileDataset(datasetId);
  const validation = validateFigureSpec(spec as any, profile);
  const preview = {
    previewId: 'prev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    basedOnRevision: params.basedOnRevision,
    proposedSpec: spec,
    validation,
    nextAction: validation.valid
      ? 'Preview staged. Call apply_figure_revision with this previewId to request user confirmation.'
      : 'Validation failed. Fix the blocking issues and re-propose.',
    createdAt: Date.now(),
    approvedInUI: false,
    actor: params.actor || 'agent',
    panelId: params.commandPayload?.targetPanelId || 'panel-d',
  };
  store.dispatch({ type: 'SET_PREVIEW', payload: { preview } });
  return { success: true, result: preview };
}

/**
 * Two-phase proposal, phase 2: commit the staged preview to the agent-editable
 * panel after the native confirmation gate has accepted. Fails closed on any
 * mismatch between the staged preview and the request.
 */
export function applyFigureRevision(store: any, params: any) {
  const state = store.getState();
  const preview = state.activePreview;

  if (!preview || preview.previewId !== params.previewId) {
    return {
      success: false,
      result: {
        status: 'rejected_unknown_preview',
        newRevision: state.currentRevision,
        appliedSpec: null,
        provenanceEventId: '',
        message: `Preview ID '${params.previewId}' not found or already consumed.`,
      },
    };
  }

  if (state.currentRevision !== params.basedOnRevision) {
    return {
      success: false,
      result: {
        status: 'rejected_stale',
        newRevision: state.currentRevision,
        appliedSpec: null,
        provenanceEventId: '',
        message: `Project revision has advanced to Rev ${state.currentRevision}. Re-propose against the latest revision.`,
      },
    };
  }

  if (!preview.validation?.valid) {
    return {
      success: false,
      result: {
        status: 'rejected_validation_failed',
        newRevision: state.currentRevision,
        appliedSpec: null,
        provenanceEventId: '',
        message: 'Staged preview failed validation and cannot be applied.',
      },
    };
  }

  if (!params.humanApprovalConfirmed) {
    return {
      success: false,
      result: {
        status: 'rejected_unapproved',
        newRevision: state.currentRevision,
        appliedSpec: null,
        provenanceEventId: '',
        message: 'No human approval recorded for this revision.',
      },
    };
  }

  const commitMessage = params.commitMessage || `Applied WebMCP agent proposal: ${preview.proposedSpec?.title || 'Figure revision'}`;
  store.dispatch({
    type: 'APPLY_PROPOSAL',
    payload: {
      panelId: preview.panelId || 'panel-d',
      spec: { kind: 'single-chart', isAgentEditable: true, spec: preview.proposedSpec },
      commitMessage,
    },
  });
  store.dispatch({ type: 'CLEAR_PREVIEW' });

  const newState = store.getState();
  return {
    success: true,
    result: {
      status: 'applied',
      newRevision: newState.currentRevision,
      appliedSpec: preview.proposedSpec,
      provenanceEventId: newState.provenanceLedger[newState.provenanceLedger.length - 1]?.eventId || '',
      message: commitMessage,
    },
  };
}

