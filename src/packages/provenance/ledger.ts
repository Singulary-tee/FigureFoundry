import { FigureSpec, ProvenanceEvent, ValidationReport } from '../../types';

export function generateEventId(): string {
  return 'evt_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
}

export function createProvenanceEvent(params: {
  revision: number;
  actor: 'agent' | 'human';
  actionType: 'PROPOSE_AND_APPLY' | 'DIRECT_HUMAN_EDIT' | 'LOAD_DATASET' | 'IMPORT_DATASET' | 'CLEAR_DATASET' | 'TIME_TRAVEL_RESTORE';
  summary: string;
  previewId?: string;
  basedOnRevision: number;
  specSnapshot: FigureSpec;
  validationReport: ValidationReport;
  diffDescription?: string[];
  commandPayload?: Record<string, any>;
}): ProvenanceEvent {
  return {
    eventId: generateEventId(),
    revision: params.revision,
    actor: params.actor,
    timestamp: new Date().toISOString(),
    actionType: params.actionType,
    summary: params.summary,
    previewId: params.previewId,
    basedOnRevision: params.basedOnRevision,
    specSnapshot: JSON.parse(JSON.stringify(params.specSnapshot)),
    validationReport: JSON.parse(JSON.stringify(params.validationReport)),
    diffDescription: params.diffDescription,
    commandPayload: params.commandPayload ? JSON.parse(JSON.stringify(params.commandPayload)) : undefined
  };
}
