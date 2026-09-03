import { MultiPanelFigure } from '../../types/multipanel';
import { BUILTIN_THEMES } from './themes';
import { runMetaAnalysis, generateFunnelPlotData } from '../stats/metaAnalysis';

const initialStudies = [
  { id: 's1', study: 'Healey 2013', effect: 0.85, ciLower: 0.62, ciUpper: 1.16 },
  { id: 's2', study: 'Connolly 2016', effect: 0.69, ciLower: 0.52, ciUpper: 0.91 },
  { id: 's3', study: 'Eikelboom 2018', effect: 0.92, ciLower: 0.70, ciUpper: 1.21 },
  { id: 's4', study: 'Steffel 2019', effect: 1.15, ciLower: 0.82, ciUpper: 1.61 },
  { id: 's5', study: 'Kato 2020', effect: 0.76, ciLower: 0.57, ciUpper: 1.01 },
  { id: 's6', study: 'Bajaj 2021', effect: 0.90, ciLower: 0.65, ciUpper: 1.25 },
  { id: 's7', study: 'Lopes 2022', effect: 0.72, ciLower: 0.53, ciUpper: 0.98 },
];

const computedMeta = runMetaAnalysis(initialStudies, 'IV, Random Effects', 'Odds Ratio (OR)');
const computedFunnel = generateFunnelPlotData(computedMeta);

export const DEFAULT_MULTIPANEL_FIGURE: MultiPanelFigure = {
  id: 'fig-starter-template',
  name: 'Example Scientific Figure',
  canvasSize: {
    width: 1200,
    height: 900,
  },
  activeThemeId: 'default-figurefoundry',
  themes: BUILTIN_THEMES,
  panels: [
    {
      id: 'panel-a',
      label: 'Panel A',
      letter: 'A',
      frame: {
        x: 30,
        y: 20,
        width: 560,
        height: 360,
      },
      spec: {
        kind: 'forest-plot',
        title: 'Odds Ratio (95% CI)',
        model: 'IV, Random Effects',
        effectMeasure: 'Odds Ratio (OR)',
        showCi95: true,
        showWeights: true,
        showAxes: true,
        showGrid: true,
        showDataPoints: true,
        showErrorBars: true,
        showReferenceBars: true,
        showLabels: true,
        xAxis: {
          scale: 'log',
          min: 0.1,
          max: 10,
          referenceLine: 1.0,
        },
        studies: computedMeta.studies.map((s) => ({
          id: s.id,
          study: s.study,
          effect: s.effect,
          ciLower: s.ciLower,
          ciUpper: s.ciUpper,
          weight: s.weight,
        })),
        pooledEstimate: computedMeta.pooledEstimate,
        favorsLeftText: 'Favors Treatment',
        favorsRightText: 'Favors Control',
      },
    },
    {
      id: 'panel-b',
      label: 'Panel B',
      letter: 'B',
      frame: {
        x: 610,
        y: 20,
        width: 560,
        height: 360,
      },
      spec: {
        kind: 'funnel-plot',
        title: 'Funnel Plot (Publication Bias)',
        xAxis: {
          scale: 'log',
          min: -2,
          max: 2,
          title: 'Odds Ratio (log scale)',
        },
        yAxis: {
          scale: 'linear',
          min: 0.0,
          max: 2.0,
          title: 'SE (log OR)',
          inverted: true,
        },
        points: computedFunnel.points,
        showAxes: true,
        showGrid: true,
        showDataPoints: true,
        showLabels: true,
        showFunnelGuides: true,
      },
    },
    {
      id: 'panel-c',
      label: 'Panel C',
      letter: 'C',
      frame: {
        x: 30,
        y: 400,
        width: 560,
        height: 350,
      },
      spec: {
        kind: 'grouped-bar',
        title: 'Outcome Event Rates',
        groups: [
          { id: 'gb1', category: 'Bleeding', treatmentVal: 37, controlVal: 29 },
          { id: 'gb2', category: 'Stroke', treatmentVal: 17, controlVal: 23 },
          { id: 'gb3', category: 'MI', treatmentVal: 20, controlVal: 14 },
          { id: 'gb4', category: 'Mortality', treatmentVal: 10, controlVal: 15 },
        ],
        yAxis: {
          title: 'Event Rate (%)',
          min: 0,
          max: 40,
        },
        legend: {
          treatmentLabel: 'Treatment',
          controlLabel: 'Control',
        },
        showAxes: true,
        showGrid: true,
        showDataPoints: true,
        showLabels: true,
      },
    },
    {
      id: 'panel-d',
      label: 'Panel D',
      letter: 'D',
      frame: {
        x: 610,
        y: 400,
        width: 560,
        height: 350,
      },
      spec: {
        kind: 'single-chart',
        spec: {
          title: 'Comparative Morphometrics (Palmer Penguins)',
          figureIntent: 'comparison',
          mark: 'bar',
          encoding: {
            x: { field: 'species', type: 'categorical', axisTitle: 'Species' },
            y: { field: 'body_mass_g', type: 'quantitative', aggregate: 'mean', axisTitle: 'Mean Body Mass (g)' },
            color: { field: 'island', type: 'categorical', legendTitle: 'Island' },
          },
          showsRawObservations: false,
          uncertaintyEncoding: null,
        },
      },
    },
    {
      id: 'panel-caption',
      label: 'Caption',
      letter: '',
      frame: {
        x: 30,
        y: 770,
        width: 1140,
        height: 100,
      },
      spec: {
        kind: 'text-caption',
        title: 'Figure 1. Multi-panel data synthesis and comparative morphometrics.',
        captionText:
          'Forest plot of study effects (A), funnel plot demonstrating precision (B), stratified outcome rates (C), and agent-managed comparative specimen distributions (D).',
        fontSize: 13,
      },
    },
  ],
  layers: [
    { id: 'layer-a', panelId: 'panel-a', name: 'Panel A', visible: true, locked: false, order: 0 },
    { id: 'layer-b', panelId: 'panel-b', name: 'Panel B', visible: true, locked: false, order: 1 },
    { id: 'layer-c', panelId: 'panel-c', name: 'Panel C', visible: true, locked: false, order: 2 },
    { id: 'layer-d', panelId: 'panel-d', name: 'Panel D', visible: true, locked: false, order: 3 },
    { id: 'layer-caption', panelId: 'panel-caption', name: 'Caption', visible: true, locked: false, order: 4 },
  ],
  manualItems: [],
};

export function createNewFigure(title?: string): MultiPanelFigure {
  const id = `fig-${Date.now()}`;
  const name = title || `New Scientific Figure ${new Date().toLocaleDateString()}`;
  return {
    id,
    name,
    canvasSize: { width: 1200, height: 800 },
    activeThemeId: 'nature',
    themes: BUILTIN_THEMES,
    panels: [],
    layers: [],
    manualItems: [],
  };
}
