import { DatasetRecord } from '../data-model/datasets';
import { FigureProject, PanelSpec, PanelKind, WorkspacePatch } from '../../types/multipanel';
import { FigureNotes, AnalysisRun } from './state';
import { ProvenanceLedger } from '../provenance/ledger';
import { ActiveView } from './state';

export type DomainCommand =
  | { type: 'SET_ACTIVE_VIEW'; payload: ActiveView }
  | { type: 'SWITCH_ACCOUNT'; payload: 'guest' | 'authenticated' }
  | { type: 'SWITCH_WORKSPACE'; payload: string }
  | { type: 'CREATE_WORKSPACE'; payload: { name: string } }
  | { type: 'RENAME_WORKSPACE'; payload: { workspaceId: string; name: string } }
  | { type: 'DELETE_WORKSPACE'; payload: string }
  | { type: 'SWITCH_PROJECT'; payload: string }
  | { type: 'CREATE_PROJECT'; payload: { name: string; description?: string } }
  | { type: 'RENAME_PROJECT'; payload: { projectId: string; name: string; description?: string } }
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
  | { type: 'LOAD_FIGURE'; payload: FigureProject; recordProvenance?: boolean }
  | { type: 'RESET_FIGURE' }
  | {
      type: 'IMPORT_FIGURE_BUNDLE';
      payload: {
        figure: FigureProject;
        datasets?: import('../data-model/datasets').DatasetRecord[];
        notes?: FigureNotes;
        provenance?: ProvenanceLedger;
        analysisRuns?: import('./state').AnalysisRun[];
        scope?: 'project' | 'workspace';
      };
    }
  | {
      type: 'APPLY_PROPOSAL';
      payload: {
        panelId: string;
        spec: PanelSpec;
        commitMessage: string;
        workspacePatch?: WorkspacePatch;
        provenance?: {
          previewId?: string;
          approval?: { approvedAt: number; approvedBy: 'human'; source: 'native-confirmation' };
          basedOnRevision: number;
          validationReport: any;
          commandPayload?: Record<string, any>;
          panelId: string;
          workspacePatch?: WorkspacePatch;
        };
        approval?: { previewId: string };
      };
    }
  | { type: 'APPROVE_PREVIEW_UI'; payload: { previewId: string; source: 'native-confirmation' } }
  | { type: 'SET_FIGURE_NOTES'; payload: { figureId: string; notes: { legend?: string; methods?: string; research?: string } } }
  | { type: 'RECORD_ANALYSIS_RUN'; payload: Omit<AnalysisRun, 'id' | 'createdAt' | 'status'> & { id?: string; createdAt?: string; status?: AnalysisRun['status'] } }
  | { type: 'RESTORE_SNAPSHOT'; payload: { targetRevision: number } }
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
  const state = store.getState();
  const datasetId = params.datasetId || state.datasetId || '';
  const figureId = state.activeFigureId || state.figure?.id;
  const panelId = params.commandPayload?.targetPanelId;
  const targetPanel = state.figure?.panels?.find((panel: any) => panel.id === panelId);
  if (!figureId || !targetPanel) {
    return {
      success: false,
      result: {
        valid: false,
        issues: [{ severity: 'blocking', path: 'targetPanelId', message: 'The requested panel is not present in the active figure.' }],
      },
    };
  }
  const profile = params.datasetProfile || profileDataset(datasetId);
  const panelKind: PanelKind = params.panelKind || params.commandPayload?.panelKind || spec.kind || 'single-chart';
  const chartSpec = panelKind === 'single-chart' && spec?.kind === 'single-chart' ? spec.spec : spec;
  const validation = panelKind === 'single-chart'
    ? validateFigureSpec(chartSpec as any, profile)
    : validatePanelSpec(spec, panelKind, profile);
  const preview = {
    previewId: 'prev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    basedOnRevision: params.basedOnRevision,
    proposedSpec: spec,
    panelKind,
    validation,
    nextAction: validation.valid
      ? 'Preview staged. Call apply_figure_revision with this previewId to request user confirmation.'
      : 'Validation failed. Fix the blocking issues and re-propose.',
    createdAt: Date.now(),
    approvedInUI: false,
    actor: params.actor || 'agent',
    figureId,
    datasetId,
    panelId,
    commandPayload: JSON.parse(JSON.stringify(params.commandPayload || {})),
    workspacePatch: params.workspacePatch ? JSON.parse(JSON.stringify(params.workspacePatch)) : undefined,
  };
  store.dispatch({ type: 'SET_PREVIEW', payload: { preview } });
  return { success: true, result: preview };
}

function validatePanelSpec(spec: any, panelKind: string, profile: ReturnType<typeof profileDataset>) {
  const issues: Array<{ ruleId: string; severity: 'blocking'; path: string; message: string }> = [];
  const requireArray = (path: string, value: unknown) => {
    if (!Array.isArray(value) || value.length === 0) {
      issues.push({ ruleId: 'PANEL-SPEC-REQUIRED', severity: 'blocking', path, message: `${path} must be a non-empty array.` });
    }
  };

  if (!spec || typeof spec !== 'object' || spec.kind !== panelKind) {
    issues.push({ ruleId: 'PANEL-SPEC-KIND', severity: 'blocking', path: 'panelSpec.kind', message: `panelSpec.kind must equal the requested panelKind '${panelKind}'.` });
  }
  if (typeof spec?.title !== 'string' || !spec.title.trim()) {
    issues.push({ ruleId: 'PANEL-SPEC-TITLE', severity: 'blocking', path: 'panelSpec.title', message: 'Every panel specification needs a non-empty title.' });
  }

  switch (panelKind) {
    case 'forest-plot':
      requireArray('panelSpec.studies', spec?.studies);
      if (!spec?.pooledEstimate || typeof spec.pooledEstimate !== 'object') {
        issues.push({ ruleId: 'PANEL-SPEC-POOLED', severity: 'blocking', path: 'panelSpec.pooledEstimate', message: 'Forest plots require a pooledEstimate object.' });
      }
      break;
    case 'funnel-plot':
      requireArray('panelSpec.points', spec?.points);
      break;
    case 'grouped-bar':
      requireArray('panelSpec.groups', spec?.groups);
      break;
    case 'subgroup-analysis':
      requireArray('panelSpec.subgroups', spec?.subgroups);
      break;
    case 'volcano-plot':
    case 'heatmap':
      if (!spec?.spec || typeof spec.spec !== 'object') {
        issues.push({ ruleId: 'PANEL-SPEC-CHART', severity: 'blocking', path: 'panelSpec.spec', message: `${panelKind} panels require a complete Vega chart specification.` });
      } else {
        const chartValidation = validateFigureSpec(spec.spec, profile);
        issues.push(...chartValidation.issues
          .filter((issue) => issue.severity === 'blocking')
          .map((issue) => ({ ruleId: issue.ruleId, severity: 'blocking' as const, path: `panelSpec.spec.${issue.path}`, message: issue.message })));
      }
      break;
    case 'text-caption':
      if (typeof spec?.captionText !== 'string' || !spec.captionText.trim()) {
        issues.push({ ruleId: 'PANEL-SPEC-CAPTION', severity: 'blocking', path: 'panelSpec.captionText', message: 'Caption panels require non-empty captionText.' });
      }
      break;
    default:
      issues.push({ ruleId: 'PANEL-SPEC-UNSUPPORTED', severity: 'blocking', path: 'panelKind', message: `Unsupported panel kind '${panelKind}'.` });
  }

  return { valid: issues.length === 0, issues };
}

/**
 * Two-phase proposal, phase 2: commit the staged preview to its requested
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

  if (preview.figureId !== state.activeFigureId || preview.figureId !== state.figure?.id) {
    return {
      success: false,
      result: {
        status: 'rejected_stale',
        newRevision: state.currentRevision,
        appliedSpec: null,
        provenanceEventId: '',
        message: 'The active figure changed after this proposal was staged. Re-propose for the current figure.',
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

  if (
    !params.humanApprovalConfirmed ||
    params.approvalToken !== preview.previewId ||
    !preview.approvedInUI ||
    preview.approval?.approvedBy !== 'human' ||
    preview.approval?.source !== 'native-confirmation'
  ) {
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

  const commitMessage = params.commitMessage || `Applied WebMCP agent proposal: ${preview.proposedSpec?.title || preview.proposedSpec?.spec?.title || 'Figure revision'}`;
  const primarySpec: PanelSpec = preview.panelKind === 'single-chart'
      ? {
        kind: 'single-chart',
        spec: preview.proposedSpec?.kind === 'single-chart' ? preview.proposedSpec.spec : preview.proposedSpec,
        ...(preview.datasetId ? { datasetId: preview.datasetId } : {}),
      }
    : { ...preview.proposedSpec, kind: preview.panelKind };
  store.dispatch({
    type: 'APPLY_PROPOSAL',
    payload: {
      panelId: preview.panelId || state.figure?.panels?.[0]?.id,
      spec: primarySpec,
      commitMessage,
      workspacePatch: preview.workspacePatch,
      provenance: {
        previewId: preview.previewId,
        approval: preview.approval,
        basedOnRevision: preview.basedOnRevision,
        validationReport: preview.validation,
        commandPayload: preview.commandPayload,
        panelId: preview.panelId,
        workspacePatch: preview.workspacePatch,
      },
      approval: { previewId: preview.previewId },
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
      provenanceEventId: newState.provenanceLedger[0]?.eventId || '',
      message: commitMessage,
    },
  };
}

