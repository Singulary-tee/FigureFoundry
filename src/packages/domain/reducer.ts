import { FigureState, FigureSpec, ValidationReport, DatasetProfile } from '../../types';
import { profileDataset, registerRuntimeDataset } from '../data-model/profiler';
import { generateInitialSpecForProfile } from '../data-model/generator';
import { validateFigureSpec } from '../validation/validator';
import { diffFigureSpecs } from '../figure-spec/diff';
import { createProvenanceEvent } from '../provenance/ledger';

export type FigureDomainAction =
  | {
      type: 'IMPORT_DATASET';
      payload: {
        profile: DatasetProfile;
        customSpec?: FigureSpec;
      };
    }
  | {
      type: 'LOAD_DATASET';
      payload: {
        datasetId: string;
      };
    }
  | {
      type: 'CLEAR_DATASET';
    }
  | {
      type: 'PROPOSE_REVISION';
      payload: {
        proposedSpec: FigureSpec;
        basedOnRevision: number;
        actor: 'agent' | 'human';
        commandPayload?: Record<string, any>;
      };
    }
  | {
      type: 'APPROVE_PREVIEW_UI';
      payload: {
        previewId: string;
      };
    }
  | {
      type: 'APPLY_REVISION';
      payload: {
        previewId: string;
        basedOnRevision: number;
        humanApprovalConfirmed: boolean;
        actor: 'agent' | 'human';
      };
    }
  | {
      type: 'REJECT_PREVIEW';
      payload?: {
        previewId?: string;
      };
    }
  | {
      type: 'DIRECT_HUMAN_EDIT';
      payload: {
        newSpec: FigureSpec;
        summary?: string;
      };
    }
  | {
      type: 'RESTORE_SNAPSHOT';
      payload: {
        targetRevision: number;
      };
    };

export interface ApplyResult {
  status: 'applied' | 'rejected_stale' | 'rejected_unapproved' | 'rejected_unknown_preview' | 'rejected_validation_failed';
  newRevision: number;
  appliedSpec: FigureSpec | null;
  provenanceEventId: string;
  message: string;
}

export function figureReducer(state: FigureState, action: FigureDomainAction): { state: FigureState; result?: any } {
  switch (action.type) {
    case 'IMPORT_DATASET': {
      const { profile, customSpec } = action.payload;

      registerRuntimeDataset({
        id: profile.datasetId,
        title: profile.title,
        description: profile.description,
        citation: profile.citation,
        records: profile.records
      });

      const initialSpec = customSpec || generateInitialSpecForProfile(profile);
      const validation = validateFigureSpec(initialSpec, profile);
      const newRevision = 1; // Reset to revision 1 for a brand new dataset session

      const event = createProvenanceEvent({
        revision: newRevision,
        actor: 'human',
        actionType: 'IMPORT_DATASET',
        summary: `Imported dataset '${profile.title}' (${profile.rowCount} rows, ${profile.fields.length} cols)`,
        basedOnRevision: 0,
        specSnapshot: initialSpec,
        validationReport: validation,
        diffDescription: [`Imported dataset ${profile.title} and compiled dynamic figure`]
      });

      const existingUserDatasets = state.userDatasets || [];
      const updatedUserDatasets = [
        profile,
        ...existingUserDatasets.filter(d => d.datasetId !== profile.datasetId)
      ];

      return {
        state: {
          ...state,
          datasetId: profile.datasetId,
          currentRevision: newRevision,
          spec: initialSpec,
          activePreview: null,
          provenanceLedger: [event], // Reset history for the new dataset
          undoStack: [], // Start clean for the new dataset
          redoStack: [],
          userDatasets: updatedUserDatasets
        },
        result: {
          datasetId: profile.datasetId,
          newRevision,
          profile,
          spec: initialSpec
        }
      };
    }

    case 'LOAD_DATASET': {
      const { datasetId } = action.payload;
      const profile = profileDataset(datasetId);

      if (!profile || profile.rowCount === 0) {
        return { state };
      }

      const adaptedSpec = generateInitialSpecForProfile(profile, state.spec?.theme || 'dark');
      const newRevision = 1; // Reset to revision 1 for a brand new dataset session
      const validation = validateFigureSpec(adaptedSpec, profile);

      const event = createProvenanceEvent({
        revision: newRevision,
        actor: 'human',
        actionType: 'LOAD_DATASET',
        summary: `Loaded dataset '${profile.title}'`,
        basedOnRevision: 0,
        specSnapshot: adaptedSpec,
        validationReport: validation,
        diffDescription: [`Dataset switched to ${profile.title}`]
      });

      return {
        state: {
          ...state,
          datasetId,
          currentRevision: newRevision,
          spec: adaptedSpec,
          activePreview: null,
          provenanceLedger: [event], // Reset history for the new dataset
          undoStack: [], // Start clean for the new dataset
          redoStack: []
        },
        result: {
          datasetId,
          newRevision,
          profile,
          spec: adaptedSpec
        }
      };
    }

    case 'CLEAR_DATASET': {
      return {
        state: {
          ...state,
          datasetId: '',
          spec: null,
          activePreview: null,
          undoStack: [],
          redoStack: []
        }
      };
    }

    case 'PROPOSE_REVISION': {
      const { proposedSpec, basedOnRevision, actor, commandPayload } = action.payload;
      const profile = profileDataset(state.datasetId);
      const validation: ValidationReport = validateFigureSpec(proposedSpec, profile);

      const previewId = 'prev_' + Math.random().toString(36).substring(2, 9);
      const nextAction = validation.valid
        ? 'Ask the researcher to review this preview diff in the UI, then call apply_figure_revision with this previewId.'
        : 'Correct blocking validation issues before requesting human approval.';

      const activePreview = {
        previewId,
        basedOnRevision,
        proposedSpec: JSON.parse(JSON.stringify(proposedSpec)),
        validation,
        nextAction,
        createdAt: Date.now(),
        approvedInUI: false,
        actor
      };

      return {
        state: {
          ...state,
          activePreview
        },
        result: {
          previewId,
          basedOnRevision,
          validation,
          nextAction
        }
      };
    }

    case 'APPROVE_PREVIEW_UI': {
      const { previewId } = action.payload;
      if (!state.activePreview || state.activePreview.previewId !== previewId) {
        return { state };
      }
      return {
        state: {
          ...state,
          activePreview: {
            ...state.activePreview,
            approvedInUI: true
          }
        }
      };
    }

    case 'APPLY_REVISION': {
      const { previewId, basedOnRevision, humanApprovalConfirmed, actor } = action.payload;

      if (!state.activePreview || state.activePreview.previewId !== previewId) {
        return {
          state,
          result: {
            status: 'rejected_unknown_preview',
            newRevision: state.currentRevision,
            appliedSpec: null,
            provenanceEventId: '',
            message: `Preview ID '${previewId}' not found or already consumed.`
          } as ApplyResult
        };
      }

      if (state.currentRevision !== basedOnRevision) {
        return {
          state,
          result: {
            status: 'rejected_stale',
            newRevision: state.currentRevision,
            appliedSpec: null,
            provenanceEventId: '',
            message: `Project revision has advanced to Rev ${state.currentRevision} (was based on Rev ${basedOnRevision}). Re-propose against the latest revision.`
          } as ApplyResult
        };
      }

      if (!state.activePreview.approvedInUI || !humanApprovalConfirmed) {
        return {
          state,
          result: {
            status: 'rejected_unapproved',
            newRevision: state.currentRevision,
            appliedSpec: null,
            provenanceEventId: '',
            message: 'Human approval has not been confirmed in the workbench interface for this previewId.'
          } as ApplyResult
        };
      }

      if (!state.activePreview.validation.valid) {
        return {
          state,
          result: {
            status: 'rejected_validation_failed',
            newRevision: state.currentRevision,
            appliedSpec: null,
            provenanceEventId: '',
            message: 'Cannot apply revision with blocking scientific validation errors.'
          } as ApplyResult
        };
      }

      const newRevision = state.currentRevision + 1;
      const appliedSpec = JSON.parse(JSON.stringify(state.activePreview.proposedSpec));
      const diffDescription = state.spec ? diffFigureSpecs(state.spec, appliedSpec) : ['Initial figure specification applied'];

      const event = createProvenanceEvent({
        revision: newRevision,
        actor,
        actionType: 'PROPOSE_AND_APPLY',
        summary: `Applied revision ${newRevision}: ${appliedSpec.title}`,
        previewId,
        basedOnRevision,
        specSnapshot: appliedSpec,
        validationReport: state.activePreview.validation,
        diffDescription
      });

      return {
        state: {
          ...state,
          currentRevision: newRevision,
          spec: appliedSpec,
          activePreview: null,
          provenanceLedger: [event, ...state.provenanceLedger],
          undoStack: state.spec ? [state.spec, ...state.undoStack] : [],
          redoStack: []
        },
        result: {
          status: 'applied',
          newRevision,
          appliedSpec,
          provenanceEventId: event.eventId,
          message: `Successfully applied revision ${newRevision}. Visible figure updated.`
        } as ApplyResult
      };
    }

    case 'REJECT_PREVIEW': {
      return {
        state: {
          ...state,
          activePreview: null
        }
      };
    }

    case 'DIRECT_HUMAN_EDIT': {
      const { newSpec, summary } = action.payload;
      const profile = profileDataset(state.datasetId);
      const validation = validateFigureSpec(newSpec, profile);
      const newRevision = state.currentRevision + 1;
      const diffDescription = state.spec ? diffFigureSpecs(state.spec, newSpec) : ['Direct specification applied'];

      const event = createProvenanceEvent({
        revision: newRevision,
        actor: 'human',
        actionType: 'DIRECT_HUMAN_EDIT',
        summary: summary || `Direct human edit: ${newSpec.title}`,
        basedOnRevision: state.currentRevision,
        specSnapshot: newSpec,
        validationReport: validation,
        diffDescription
      });

      return {
        state: {
          ...state,
          currentRevision: newRevision,
          spec: JSON.parse(JSON.stringify(newSpec)),
          activePreview: null,
          provenanceLedger: [event, ...state.provenanceLedger],
          undoStack: state.spec ? [state.spec, ...state.undoStack] : [],
          redoStack: []
        }
      };
    }

    case 'RESTORE_SNAPSHOT': {
      const { targetRevision } = action.payload;
      const record = state.provenanceLedger.find(e => e.revision === targetRevision);
      if (!record) return { state };

      const newRevision = state.currentRevision + 1;
      const restoredSpec = JSON.parse(JSON.stringify(record.specSnapshot));
      const diffDescription = state.spec ? diffFigureSpecs(state.spec, restoredSpec) : ['Restored snapshot'];

      const event = createProvenanceEvent({
        revision: newRevision,
        actor: 'human',
        actionType: 'TIME_TRAVEL_RESTORE',
        summary: `Restored workspace to historical Revision ${targetRevision} snapshot`,
        basedOnRevision: state.currentRevision,
        specSnapshot: restoredSpec,
        validationReport: record.validationReport,
        diffDescription
      });

      return {
        state: {
          ...state,
          currentRevision: newRevision,
          spec: restoredSpec,
          activePreview: null,
          provenanceLedger: [event, ...state.provenanceLedger],
          undoStack: state.spec ? [state.spec, ...state.undoStack] : [],
          redoStack: []
        }
      };
    }

    default:
      return { state };
  }
}
