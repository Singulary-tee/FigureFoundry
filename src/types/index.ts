
export type StatisticalType = 'quantitative' | 'categorical' | 'temporal' | 'ordinal';

export interface DatasetField {
  name: string;
  type: StatisticalType;
  unit: string | null;
  missingCount: number;
  cardinality: number | null;
  exampleValues: (string | number | boolean)[];
  min?: number;
  max?: number;
  uniqueValues?: (string | number | boolean)[];
}

export interface DatasetProfile {
  datasetId: string;
  title: string;
  description: string;
  citation: string;
  rowCount: number;
  fields: DatasetField[];
  records: Record<string, any>[];
}

export type FigureIntent = 'comparison' | 'distribution' | 'relationship' | 'trend';

export type MarkType = 'point' | 'bar' | 'boxplot' | 'tick' | 'line' | 'area';

export type UncertaintyEncoding = 'errorbar' | 'band' | 'raw-points-only' | null;

export interface ChannelMapping {
  field: string;
  type: StatisticalType;
  scaleType?: 'linear' | 'log' | 'sqrt' | 'time' | 'band';
  zero?: boolean;
  legendTitle?: string;
  axisTitle?: string;
  aggregate?: 'mean' | 'median' | 'sum' | 'count' | 'min' | 'max';
}

export interface FigureEncoding {
  x: ChannelMapping;
  y: ChannelMapping;
  color?: ChannelMapping;
  shape?: ChannelMapping;
  size?: ChannelMapping;
}

export interface FigureSpec {
  id?: string;
  title: string;
  subtitle?: string;
  figureIntent: FigureIntent;
  mark: MarkType;
  encoding: FigureEncoding;
  showsRawObservations: boolean;
  uncertaintyEncoding: UncertaintyEncoding;
  jitterRawPoints?: boolean;
  opacity?: number;
  theme?: 'dark' | 'light';
  themePreset?: 'nature' | 'science' | 'cell' | 'ieee' | 'prism' | 'dark' | 'light';
  trendline?: 'linear' | 'polynomial' | 'loess' | 'none';
  errorBarMode?: 'sd' | 'sem' | 'ci95' | 'none';
  facetBy?: { field: string; type: StatisticalType };
  statisticalAnnotations?: Array<{ group1: string; group2: string; pValue: number; stars: string; yLevel?: number }>;
  filters?: Array<{ field: string; operator: '==' | '!=' | '>' | '<' | 'in'; value: any }>;
}

export type ValidationSeverity = 'blocking' | 'warning';

export interface ValidationIssue {
  ruleId: string;
  severity: ValidationSeverity;
  path: string;
  message: string;
  rationale?: string;
  nextAction?: string;
}

export interface ValidationReport {
  valid: boolean;
  issues: ValidationIssue[];
}

export interface FigurePreview {
  previewId: string;
  basedOnRevision: number;
  proposedSpec: FigureSpec;
  validation: ValidationReport;
  nextAction: string;
  createdAt: number;
  approvedInUI: boolean;
  actor: 'agent' | 'human';
  panelKind?: string;
}

export interface ProvenanceEvent {
  eventId: string;
  revision: number;
  actor: 'agent' | 'human';
  timestamp: string;
  actionType: 'PROPOSE_AND_APPLY' | 'DIRECT_HUMAN_EDIT' | 'LOAD_DATASET' | 'IMPORT_DATASET' | 'CLEAR_DATASET' | 'TIME_TRAVEL_RESTORE';
  summary: string;
  previewId?: string;
  basedOnRevision: number;
  specSnapshot: FigureSpec;
  validationReport: ValidationReport;
  diffDescription?: string[];
  commandPayload?: Record<string, any>;
}

export interface FigureState {
  datasetId: string;
  currentRevision: number;
  spec: FigureSpec | null;
  activePreview: FigurePreview | null;
  provenanceLedger: ProvenanceEvent[];
  undoStack: FigureSpec[];
  redoStack: FigureSpec[];
  userDatasets?: DatasetProfile[];
}

export type FigureProject = FigureState;

export interface ExportBundle {
  bundleVersion: "1.0";
  project: FigureProject;
}

export interface WebMcpToolAnnotations {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  untrustedContentHint?: boolean;
  requiresHumanApproval?: boolean;
}

export interface WebMcpToolDefinition {
  name: string;
  title: string;
  description: string;
  annotations: WebMcpToolAnnotations;
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
}

export interface WebMcpCallLog {
  id: string;
  toolName: string;
  timestamp: number;
  inputArgs: Record<string, any>;
  result: Record<string, any>;
  durationMs: number;
  payloadBytes: number;
  status: 'success' | 'error' | 'rejected';
}
