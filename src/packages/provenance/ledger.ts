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

export interface ProvenanceLedger {
  events: ProvenanceEvent[];
}

export function recordRevision(
  ledger: ProvenanceLedger,
  figure: any,
  summary: string,
  actor: 'agent' | 'human' = 'human'
): ProvenanceLedger {
  const currentEvents = ledger?.events || [];
  const nextRev = currentEvents.length + 1;
  const evt = createProvenanceEvent({
    revision: nextRev,
    actor,
    actionType: actor === 'agent' ? 'PROPOSE_AND_APPLY' : 'DIRECT_HUMAN_EDIT',
    summary,
    basedOnRevision: Math.max(0, nextRev - 1),
    specSnapshot: figure?.panels?.[0]?.spec || { title: 'Revision Snapshot', figureIntent: 'comparison', mark: 'bar', encoding: { x: { field: '', type: 'categorical' }, y: { field: '', type: 'quantitative' } }, showsRawObservations: false, uncertaintyEncoding: null },
    validationReport: { valid: true, issues: [] },
  });
  return {
    events: [evt, ...currentEvents],
  };
}
