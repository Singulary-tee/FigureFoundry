import { FigureStore } from './store';
import { FigureSpec, DatasetProfile } from '../../types';
import { validateCommandBoundary } from '../validation/boundary';
import { profileDataset } from '../data-model/profiler';

export interface CommandExecutionResult<T = any> {
  success: boolean;
  result?: T;
  boundaryErrors?: Array<{ path: string; message: string; severity: 'blocking' | 'warning' }>;
}

export function proposeFigureRevision(
  store: FigureStore,
  payload: {
    proposedSpec: FigureSpec;
    basedOnRevision: number;
    actor: 'agent' | 'human';
    commandPayload?: Record<string, any>;
  }
): CommandExecutionResult {
  const currentState = store.getState();
  const profile = profileDataset(currentState.datasetId);
  const boundary = validateCommandBoundary('PROPOSE_REVISION', payload, profile);

  if (!boundary.valid) {
    return {
      success: false,
      boundaryErrors: boundary.errors
    };
  }

  const result = store.dispatch({
    type: 'PROPOSE_REVISION',
    payload
  });

  return {
    success: true,
    result
  };
}

export function applyFigureRevision(
  store: FigureStore,
  payload: {
    previewId: string;
    basedOnRevision: number;
    humanApprovalConfirmed: boolean;
    actor: 'agent' | 'human';
  }
): CommandExecutionResult {
  const boundary = validateCommandBoundary('APPLY_REVISION', payload);

  if (!boundary.valid) {
    return {
      success: false,
      boundaryErrors: boundary.errors
    };
  }

  const result = store.dispatch({
    type: 'APPLY_REVISION',
    payload
  });

  return {
    success: result.status === 'applied',
    result
  };
}

export function approvePreviewUi(store: FigureStore, previewId: string): CommandExecutionResult {
  const result = store.dispatch({
    type: 'APPROVE_PREVIEW_UI',
    payload: { previewId }
  });
  return { success: true, result };
}

export function rejectFigurePreview(store: FigureStore, previewId?: string): CommandExecutionResult {
  const result = store.dispatch({
    type: 'REJECT_PREVIEW',
    payload: { previewId }
  });
  return { success: true, result };
}

export function loadDataset(store: FigureStore, datasetId: string): CommandExecutionResult {
  const result = store.dispatch({
    type: 'LOAD_DATASET',
    payload: { datasetId }
  });
  return { success: true, result };
}

export function importDataset(store: FigureStore, profile: DatasetProfile, customSpec?: FigureSpec): CommandExecutionResult {
  const result = store.dispatch({
    type: 'IMPORT_DATASET',
    payload: { profile, customSpec }
  });
  return { success: true, result };
}

export function clearDataset(store: FigureStore): CommandExecutionResult {
  const result = store.dispatch({ type: 'CLEAR_DATASET' });
  return { success: true, result };
}

export function directHumanEdit(store: FigureStore, newSpec: FigureSpec, summary?: string): CommandExecutionResult {
  const result = store.dispatch({
    type: 'DIRECT_HUMAN_EDIT',
    payload: { newSpec, summary }
  });
  return { success: true, result };
}

export function restoreSnapshot(store: FigureStore, targetRevision: number): CommandExecutionResult {
  const result = store.dispatch({
    type: 'RESTORE_SNAPSHOT',
    payload: { targetRevision }
  });
  return { success: true, result };
}
