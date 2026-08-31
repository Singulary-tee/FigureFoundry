import { FigureSpec, DatasetField, DatasetProfile } from './index';

export type PanelKind =
  | 'forest-plot'
  | 'funnel-plot'
  | 'grouped-bar'
  | 'subgroup-analysis'
  | 'text-caption'
  | 'single-chart';

export interface StudyRow {
  id: string;
  study: string;
  year?: number;
  effect: number; // e.g. Odds Ratio
  ciLower: number;
  ciUpper: number;
  weight: number; // percentage, e.g. 12.4
  eventsTreatment?: number;
  totalTreatment?: number;
  eventsControl?: number;
  totalControl?: number;
}

export interface FunnelPlotPoint {
  id: string;
  study: string;
  effect: number; // log odds ratio
  standardError: number; // SE (log OR)
}

export interface SubgroupAnalysisItem {
  id: string;
  groupName: string;
  name?: string;
  effect: number;
  ciLower: number;
  ciUpper: number;
  iSquared: number; // percentage, e.g. 42
  studiesCount?: number;
}

export interface GroupedBarItem {
  id: string;
  category: string; // e.g. "Bleeding", "Stroke", "MI", "Mortality"
  treatmentVal: number; // %
  controlVal: number; // %
}

export interface ForestPlotSpec {
  kind: 'forest-plot';
  title: string;
  model: 'IV, Random Effects' | 'IV, Fixed Effect' | 'Mantel-Haenszel' | 'DerSimonian-Laird';
  effectMeasure: 'Odds Ratio (OR)' | 'Risk Ratio (RR)' | 'Risk Difference (RD)' | 'Hazard Ratio (HR)' | 'Mean Difference (MD)';
  showCi95: boolean;
  showWeights: boolean;
  showAxes: boolean;
  showGrid?: boolean;
  showDataPoints: boolean;
  showErrorBars: boolean;
  showReferenceBars: boolean;
  showLabels: boolean;
  xAxis: {
    scale: 'log' | 'linear';
    min: number;
    max: number;
    referenceLine: number;
  };
  studies: StudyRow[];
  pooledEstimate: {
    effect: number;
    ciLower: number;
    ciUpper: number;
    weightTotal: number;
    label: string;
  };
  favorsLeftText?: string;
  favorsRightText?: string;
}

export interface FunnelPlotSpec {
  kind: 'funnel-plot';
  title: string;
  xAxis: {
    scale: 'log' | 'linear';
    min: number;
    max: number;
    title: string;
  };
  yAxis: {
    scale: 'linear';
    min: number;
    max: number;
    title: string;
    inverted: boolean;
  };
  points: FunnelPlotPoint[];
  showAxes: boolean;
  showGrid: boolean;
  showDataPoints: boolean;
  showLabels: boolean;
  showFunnelGuides: boolean;
}

export interface SubgroupSpec {
  kind: 'subgroup-analysis';
  title: string;
  subgroups: SubgroupAnalysisItem[];
  xAxis: {
    scale: 'log' | 'linear';
    min: number;
    max: number;
    referenceLine: number;
  };
  showAxes: boolean;
  showGrid: boolean;
  showDataPoints: boolean;
  showErrorBars: boolean;
  showReferenceBars: boolean;
  showLabels: boolean;
  favorsLeftText?: string;
  favorsRightText?: string;
}

export interface GroupedBarSpec {
  kind: 'grouped-bar';
  title: string;
  groups: GroupedBarItem[];
  yAxis: {
    title: string;
    min: number;
    max: number;
  };
  legend: {
    treatmentLabel: string;
    controlLabel: string;
  };
  showAxes: boolean;
  showGrid: boolean;
  showDataPoints: boolean;
  showLabels: boolean;
}

export interface TextCaptionSpec {
  kind: 'text-caption';
  title: string;
  captionText: string;
  fontSize: number;
}

export interface SingleChartSpec {
  kind: 'single-chart';
  spec: FigureSpec;
  isAgentEditable: boolean;
  pendingProposal?: boolean;
}

export type PanelSpec =
  | ForestPlotSpec
  | FunnelPlotSpec
  | SubgroupSpec
  | GroupedBarSpec
  | TextCaptionSpec
  | SingleChartSpec;

export interface PanelFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Panel {
  id: string;
  label: string; // e.g. "Panel A"
  letter: string; // e.g. "A"
  frame: PanelFrame;
  isAgentEditable?: boolean;
  spec: PanelSpec;
}

export interface Layer {
  id: string;
  panelId: string;
  name: string;
  visible: boolean;
  locked: boolean;
  order: number;
}

export interface CanvasTheme {
  id: string;
  name: string;
  journalTarget?: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    cardBackground: string;
    gridline: string;
    text: string;
    mutedText: string;
    border: string;
    accent: string;
    pooledDiamond: string;
    controlBar: string;
  };
}

export type CanvasItemType =
  | 'rect'
  | 'ellipse'
  | 'text'
  | 'line'
  | 'arrow'
  | 'image'
  | 'table';

export interface CanvasItem {
  id: string;
  type: CanvasItemType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: number[]; // for line/arrow: [x1, y1, x2, y2]
  text?: string;
  fontSize?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  src?: string; // for image
  tableData?: string[][]; // for table
  locked?: boolean;
  order: number;
}

export interface MultiPanelFigure {
  id: string;
  name: string;
  canvasSize: {
    width: number;
    height: number;
  };
  activeThemeId: string;
  themes: CanvasTheme[];
  panels: Panel[];
  layers: Layer[];
  manualItems: CanvasItem[];
}

export type CanvasToolMode =
  | 'select'
  | 'pan'
  | 'zoom'
  | 'text'
  | 'shape'
  | 'line'
  | 'arrow'
  | 'image'
  | 'table'
  | 'arrange';

export type FigureProject = MultiPanelFigure;


export interface UIHistoryEntry {
  figure: MultiPanelFigure;
  description: string;
  timestamp: number;
}
