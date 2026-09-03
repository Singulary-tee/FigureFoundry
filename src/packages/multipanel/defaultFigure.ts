import { MultiPanelFigure } from '../../types/multipanel';
import { BUILTIN_THEMES } from './themes';
import { bindPanelToDataset } from './datasetBinding';
import { profileDataset } from '../data-model/profiler';

const DEFAULT_FIGURE_TEMPLATE: MultiPanelFigure = {
  id: 'fig-starter-template',
  name: 'Example Scientific Figure',
  canvasSize: {
    width: 1200,
    height: 900,
    dpi: 300,
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
        title: 'Study effects with 95% CI',
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
        studies: [],
        pooledEstimate: { effect: Number.NaN, ciLower: Number.NaN, ciUpper: Number.NaN, weightTotal: 0, label: 'Awaiting dataset' },
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
        title: 'Study effects by standard error',
        xAxis: {
          scale: 'log',
          min: -2,
          max: 2,
          title: 'Effect (log scale)',
        },
        yAxis: {
          scale: 'linear',
          min: 0.0,
          max: 2.0,
          title: 'Standard error',
          inverted: true,
        },
        points: [],
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
        title: 'Outcome rates by study',
        groups: [],
        yAxis: {
          title: 'Event Rate (%)',
          min: 0,
          max: 40,
          autoMax: true,
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
        fieldMapping: { x: 'species', y: 'body_mass_g', color: 'island' },
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
          'Study effects, precision, outcome rates, and specimen measurements shown as separate panels.',
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

function createBoundExampleFigure(template: MultiPanelFigure): MultiPanelFigure {
  const studyProfile = profileDataset('example-study-estimates');
  const penguinProfile = profileDataset('palmer-penguins');
  return {
    ...template,
    panels: template.panels.map((panel) => {
      if (panel.spec.kind === 'text-caption') return panel;
      const datasetId = panel.spec.kind === 'single-chart' ? 'palmer-penguins' : 'example-study-estimates';
      return {
        ...panel,
        spec: bindPanelToDataset(panel.spec, datasetId, datasetId === 'palmer-penguins' ? penguinProfile : studyProfile),
      };
    }),
  };
}

export const DEFAULT_MULTIPANEL_FIGURE: MultiPanelFigure = createBoundExampleFigure(DEFAULT_FIGURE_TEMPLATE);

export function createNewFigure(title?: string): MultiPanelFigure {
  const id = `fig-${Date.now()}`;
  const name = title || `New Scientific Figure ${new Date().toLocaleDateString()}`;
  return {
    ...structuredClone(DEFAULT_FIGURE_TEMPLATE),
    id,
    name,
  };
}
