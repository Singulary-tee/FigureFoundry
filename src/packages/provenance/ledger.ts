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
  targetPanelKind?: string;
  workspaceSnapshot?: ProvenanceEvent['workspaceSnapshot'];
  workspaceLayerOrder?: string[];
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
    commandPayload: params.commandPayload ? JSON.parse(JSON.stringify(params.commandPayload)) : undefined,
    targetPanelId: params.commandPayload?.targetPanelId,
    targetPanelKind: params.targetPanelKind,
    workspaceSnapshot: params.workspaceSnapshot ? JSON.parse(JSON.stringify(params.workspaceSnapshot)) : undefined,
    workspaceLayerOrder: params.workspaceLayerOrder ? [...params.workspaceLayerOrder] : undefined,
  };
}

export interface ProvenanceLedger {
  events: ProvenanceEvent[];
}

export function recordRevision(
  ledger: ProvenanceLedger,
  figure: any,
  summary: string,
  actor: 'agent' | 'human' = 'human',
  options: {
    panelId?: string;
    previewId?: string;
    basedOnRevision?: number;
    validationReport?: ValidationReport;
    commandPayload?: Record<string, any>;
    actionType?: ProvenanceEvent['actionType'];
    diffDescription?: string[];
    workspaceSnapshot?: ProvenanceEvent['workspaceSnapshot'];
    workspaceLayerOrder?: string[];
  } = {}
): ProvenanceLedger {
  const currentEvents = ledger?.events || [];
  const nextRev = currentEvents.length + 2;
  const targetPanel = options.panelId
    ? figure?.panels?.find((panel: any) => panel.id === options.panelId)
    : figure?.panels?.[0];
  const evt = createProvenanceEvent({
    revision: nextRev,
    actor,
    actionType: options.actionType || (actor === 'agent' ? 'PROPOSE_AND_APPLY' : 'DIRECT_HUMAN_EDIT'),
    summary,
    previewId: options.previewId,
    basedOnRevision: options.basedOnRevision ?? Math.max(0, nextRev - 1),
    specSnapshot: targetPanel?.spec || { title: 'Revision Snapshot' },
    validationReport: options.validationReport || { valid: true, issues: [] },
    diffDescription: options.diffDescription,
    commandPayload: options.commandPayload,
    targetPanelKind: targetPanel?.spec?.kind,
    workspaceSnapshot: options.workspaceSnapshot || (figure?.panels
      ? figure.panels.map((panel: any) => ({ panelId: panel.id, kind: panel.spec.kind, spec: panel.spec, frame: panel.frame }))
      : targetPanel
        ? [{ panelId: targetPanel.id, kind: targetPanel.spec.kind, spec: targetPanel.spec, frame: targetPanel.frame }]
        : undefined),
    workspaceLayerOrder: options.workspaceLayerOrder || (figure?.layers
      ? [...figure.layers].sort((a: any, b: any) => a.order - b.order).map((layer: any) => layer.panelId)
      : undefined),
  });
  return {
    events: [evt, ...currentEvents],
  };
}
