import assert from 'node:assert/strict';
import { parseCSV, parseJSON } from '../src/packages/data-model/parser';
import { hydrateRuntimeDatasets, profileDataset } from '../src/packages/data-model/profiler';
import { loadDomainState, saveDomainState } from '../src/packages/domain/persistence';
import { WebMcpServer } from '../src/packages/webmcp/server';
import { bindPanelToDataset } from '../src/packages/multipanel/datasetBinding';
import { domainReducer } from '../src/packages/domain/reducer';
import { INITIAL_DOMAIN_STATE } from '../src/packages/domain/state';
import { DEFAULT_MULTIPANEL_FIGURE } from '../src/packages/multipanel/defaultFigure';
import { snapPanelFrame } from '../src/packages/multipanel/layout';
import { computeFromContingency, runMetaAnalysis } from '../src/packages/stats/metaAnalysis';
import { formatSignificanceStars } from '../src/packages/stats';
import { processImportedFile } from '../src/packages/validation/boundary';
import { getGroupedBarYAxisRange } from '../src/packages/multipanel/groupedBar';

const tabular = parseCSV('day\tduration_min\twater_l\tproduct\n2026-09-01\t12\t45\tsoap\n2026-09-02\t15\t55\tsoap\n2026-09-03\t18\t65\tgel');
assert.equal(tabular.length, 3);
assert.deepEqual(Object.keys(tabular[0]), ['day', 'duration_min', 'water_l', 'product']);

const nested = parseJSON(JSON.stringify({ data: [{ routine: { day: '2026-09-01', duration: 12 }, products: ['soap'] }] }));
assert.deepEqual(nested[0], { 'routine.day': '2026-09-01', 'routine.duration': 12, products: '["soap"]' });
const tabularJsonImport = processImportedFile(JSON.stringify([{ group: 'A', value: 12 }, { group: 'B', value: 18 }]), 'outcomes.json');
assert.equal(tabularJsonImport.valid, true);
assert.deepEqual(tabularJsonImport.dataset?.rows, [{ group: 'A', value: 12 }, { group: 'B', value: 18 }]);
const figureJsonImport = processImportedFile(JSON.stringify(DEFAULT_MULTIPANEL_FIGURE), 'figure.json');
assert.equal(figureJsonImport.valid, true);
assert.equal(figureJsonImport.figure?.id, DEFAULT_MULTIPANEL_FIGURE.id);
assert.throws(() => parseCSV(`value\n${'1\n'.repeat(6001)}`), /more than 5000/);
const malformedBundle = processImportedFile(JSON.stringify({
  bundleVersion: '1.0',
  project: DEFAULT_MULTIPANEL_FIGURE,
  datasets: [{ id: 'broken', rows: [null] }],
}), 'broken-bundle.json');
assert.equal(malformedBundle.valid, false);
assert.match(malformedBundle.errors.join(' '), /record objects/);

const wideRecord = Object.fromEntries(Array.from({ length: 24 }, (_, index) => [`metric_${index}`, index]));
assert.equal(profileDataset({ id: 'wide', title: 'Wide data', records: [wideRecord] }).fields.length, 24);

const dataset = {
  id: 'daily-shower-routine',
  name: 'Daily shower routine',
  description: 'A user-provided daily routine log.',
  citation: 'User-provided file: shower.tsv',
  rows: tabular,
};
const inaccessibleDataset = { ...dataset, id: 'private-dataset' };
hydrateRuntimeDatasets([dataset]);
const profile = profileDataset(dataset.id);
assert.equal(profile.fields.length, 4);
assert.deepEqual(profile.fields.filter((field) => field.type === 'quantitative').map((field) => field.name), ['duration_min', 'water_l']);

const forestTemplate: any = {
  kind: 'forest-plot',
  title: 'Routine effects',
  model: 'IV, Random Effects',
  effectMeasure: 'Odds Ratio (OR)',
  showCi95: true,
  showWeights: true,
  showAxes: true,
  showDataPoints: true,
  showErrorBars: true,
  showReferenceBars: true,
  showLabels: true,
  xAxis: { scale: 'log', min: 0.1, max: 10, referenceLine: 1 },
  studies: [],
  pooledEstimate: { effect: 1, ciLower: 0.8, ciUpper: 1.2, weightTotal: 0, label: 'Uncomputed' },
};
const invalidForest = bindPanelToDataset(
  forestTemplate,
  dataset.id,
  profile,
  { study: 'product', effect: 'duration_min', ciLower: 'water_l', ciUpper: 'duration_min' },
) as any;
assert.equal(invalidForest.studies.length, 0);
assert.ok(invalidForest.bindingIssues.some((issue: string) => issue.includes('No rows')));

const validForestDataset = {
  ...dataset,
  id: 'valid-forest',
  rows: [
    { study: 'A', effect: 1.2, ci_low: 0.8, ci_high: 1.8 },
    { study: 'B', effect: 0.9, ci_low: 0.6, ci_high: 1.3 },
    { study: 'Incomplete', effect: 1.1, ci_low: null, ci_high: 1.6 },
  ],
};
hydrateRuntimeDatasets([validForestDataset]);
const validForest = bindPanelToDataset(
  forestTemplate,
  validForestDataset.id,
  profileDataset(validForestDataset.id),
  { study: 'study', effect: 'effect', ciLower: 'ci_low', ciUpper: 'ci_high' },
) as any;
assert.equal(validForest.studies.length, 2);
assert.equal(validForest.bindingWarnings.length, 1);
assert.equal(validForest.bindingIssues.length, 0);
const blankForestDataset = {
  ...validForestDataset,
  id: 'blank-forest',
  rows: [{ study: 'Blank', effect: '', ci_low: 0.8, ci_high: 1.2 }],
};
assert.equal((bindPanelToDataset(
  forestTemplate,
  blankForestDataset.id,
  profileDataset(blankForestDataset),
  { study: 'study', effect: 'effect', ciLower: 'ci_low', ciUpper: 'ci_high' },
) as any).studies.length, 0);
assert.equal(formatSignificanceStars(Number.NaN), 'unavailable');

const inferredForest = bindPanelToDataset(
  forestTemplate,
  validForestDataset.id,
  profileDataset(validForestDataset.id),
) as any;
assert.deepEqual(inferredForest.fieldMapping, {
  study: 'study',
  effect: 'effect',
  ciLower: 'ci_low',
  ciUpper: 'ci_high',
  weight: '',
});
assert.equal(inferredForest.studies.length, 2);

const starterForest = DEFAULT_MULTIPANEL_FIGURE.panels.find((panel) => panel.id === 'panel-a')?.spec as any;
const starterGroupedBar = DEFAULT_MULTIPANEL_FIGURE.panels.find((panel) => panel.id === 'panel-c')?.spec as any;
assert.equal(starterForest.datasetId, 'example-study-estimates');
assert.equal(starterForest.studies.length, 5);
assert.equal(starterGroupedBar.fieldMapping.category, 'category');
assert.equal(starterGroupedBar.groups.length, 5);
assert.deepEqual(getGroupedBarYAxisRange([
  { id: 'a', category: 'A', treatmentVal: 72, controlVal: 81 },
], { min: 0, max: 40, autoMax: true }), { min: 0, max: 89.1 });
assert.deepEqual(getGroupedBarYAxisRange([
  { id: 'a', category: 'A', treatmentVal: 72, controlVal: 81 },
], { min: 0, max: 40, autoMax: false }), { min: 0, max: 40 });
assert.deepEqual(snapPanelFrame({ x: -80, y: 900, width: 9000, height: Number.NaN }, { width: 1200, height: 900 }), {
  x: 0,
  y: 680,
  width: 1200,
  height: 220,
});

const storage = new Map<string, string>();
const localStorage = {
  getItem: (key: string) => storage.get(key) || null,
  setItem: (key: string, value: string) => storage.set(key, value),
};
Object.assign(globalThis, {
  window: {
    localStorage,
  },
  localStorage,
});
storage.set('figurefoundry_domain_state_v1', JSON.stringify({
  datasets: [dataset],
  selectedDatasetId: dataset.id,
  projects: [{ ...INITIAL_DOMAIN_STATE.projects[0], datasetIds: [dataset.id] }],
}));
assert.equal(loadDomainState().selectedDatasetId, dataset.id);
assert.equal(profileDataset(dataset.id).rowCount, 3);
storage.set('figurefoundry_domain_state_v1', JSON.stringify({
  datasets: [dataset],
  selectedDatasetId: dataset.id,
  activeProjectId: 'proj-1',
  projects: [{ ...INITIAL_DOMAIN_STATE.projects[0], datasetIds: [] }],
}));
assert.equal(loadDomainState().selectedDatasetId, null);
const outOfScopeFigure = { ...DEFAULT_MULTIPANEL_FIGURE, panels: DEFAULT_MULTIPANEL_FIGURE.panels.map((panel) => panel.spec.kind === 'text-caption' ? panel : { ...panel, spec: { ...panel.spec, datasetId: 'private-dataset' } }) };
storage.set('figurefoundry_domain_state_v1', JSON.stringify({
  datasets: [inaccessibleDataset],
  selectedDatasetId: inaccessibleDataset.id,
  activeProjectId: 'proj-1',
  projects: [{ ...INITIAL_DOMAIN_STATE.projects[0], datasetIds: [] }],
  figures: [outOfScopeFigure],
  activeFigureId: outOfScopeFigure.id,
}));
const normalizedReload = loadDomainState();
assert.equal((normalizedReload.figure?.panels[0].spec as any).datasetId, undefined);
assert.ok((normalizedReload.figure?.panels[0].spec as any).bindingIssues?.length);

const state: any = {
  datasetId: dataset.id,
  accessibleDatasetIds: [dataset.id],
  currentRevision: 1,
  datasets: [dataset],
  provenanceLedger: [],
  activePreview: null,
};
const recordedAnalysisActions: any[] = [];
const server = new WebMcpServer((action) => recordedAnalysisActions.push(action), () => state, { getState: () => state, dispatch: () => undefined }, () => []);

const descriptive = await server.executeTool('analyze_dataset', { operation: 'descriptive', datasetId: dataset.id });
assert.equal(descriptive.result.result.columns.length, 2);
assert.equal(descriptive.result.result.columns[0].mean, 15);

const frequency = await server.executeTool('analyze_dataset', { operation: 'frequency', datasetId: dataset.id, field: 'product' });
assert.equal(frequency.result.result.categories[0].value, 'soap');
assert.equal(frequency.result.result.categories[0].count, 2);

const correlation = await server.executeTool('analyze_dataset', { operation: 'correlation', datasetId: dataset.id, xField: 'duration_min', yField: 'water_l' });
assert.equal(correlation.result.result.r, 1);
assert.equal(correlation.result.result.pValue, 0);

const regression = await server.executeTool('analyze_dataset', { operation: 'linear-regression', datasetId: dataset.id, xField: 'day', yField: 'duration_min' });
assert.equal(regression.result.result.n, 3);
assert.equal(regression.result.result.r2, 1);
assert.equal(regression.result.result.pValue, 0);
assert.equal(recordedAnalysisActions.length, 4);
assert.equal(recordedAnalysisActions[0].payload.status, 'complete');
assert.equal(recordedAnalysisActions[0].payload.operation, 'descriptive');

const constant = { ...dataset, id: 'constant', rows: [{ group: 'A', value: 1 }, { group: 'A', value: 1 }, { group: 'B', value: 1 }, { group: 'B', value: 1 }] };
hydrateRuntimeDatasets([constant]);
const constantRecordedActions: any[] = [];
const constantServer = new WebMcpServer((action) => constantRecordedActions.push(action), () => ({ ...state, datasets: [constant], accessibleDatasetIds: [constant.id] }), { getState: () => state, dispatch: () => undefined }, () => []);
const constantCorrelation = await constantServer.executeTool('analyze_dataset', { operation: 'correlation', datasetId: constant.id, xField: 'value', yField: 'value' });
assert.equal(Number.isNaN(constantCorrelation.result.result.r), true);
const unavailableComparison = await constantServer.executeTool('analyze_dataset', { operation: 'group-comparison', datasetId: constant.id, valueField: 'value', groupField: 'group' });
assert.equal(Number.isNaN(unavailableComparison.result.result.pValue), true);
const legacyUnavailableComparison = await constantServer.executeTool('analyze_group_comparison', { datasetId: constant.id, valueField: 'value', groupField: 'group' });
assert.equal(legacyUnavailableComparison.log.status, 'success');
assert.equal(constantRecordedActions.length, 3);
assert.equal(constantRecordedActions[0].payload.status, 'unavailable');
assert.equal(constantRecordedActions[0].payload.unavailableReason, 'Correlation is unavailable because at least one selected field has no variation.');
assert.equal(constantRecordedActions[2].payload.operation, 'group-comparison');
assert.equal(constantRecordedActions[2].payload.status, 'unavailable');

assert.equal(computeFromContingency(10, 100, 20, 100, 'Risk Difference (RD)').effect, -0.1);
assert.equal(computeFromContingency(10, 100, 20, 100, 'Risk Ratio (RR)').effect, 0.5);
const oneStudy = runMetaAnalysis([{ id: 'only', study: 'Only study', effect: 1, ciLower: 0.8, ciUpper: 1.2 }], 'IV, Random Effects');
assert.equal(oneStudy.k, 1);
assert.equal(Number.isNaN(oneStudy.pooledEstimate.effect), true);
assert.match(oneStudy.pooledEstimate.label, /two valid studies/);
assert.throws(() => runMetaAnalysis([
  { id: 'a', study: 'A', effect: 1, ciLower: 0.8, ciUpper: 1.2 },
  { id: 'b', study: 'B', effect: 1.1, ciLower: 0.9, ciUpper: 1.3 },
], 'Mantel-Haenszel'), /not available/);

const catalog = await server.executeTool('inspect_dataset_catalog', {});
assert.deepEqual(catalog.result.datasets.map((entry: { id: string }) => entry.id), [dataset.id]);
assert.equal('rows' in catalog.result.datasets[0], false);
const projectFigure = { id: 'figure-in-project' };
const unrelatedFigure = { id: 'figure-in-other-project' };
const figureScopeServer = new WebMcpServer(
  () => undefined,
  () => ({ ...state, activeProjectId: 'project-a', projects: [{ id: 'project-a', figureIds: [projectFigure.id] }], figures: [projectFigure, unrelatedFigure] }),
  { getState: () => state, dispatch: () => undefined },
  () => [],
);
const scopedFigures = await figureScopeServer.executeTool('inspect_figures', {});
assert.deepEqual(scopedFigures.result.figures.map((figure: { id: string }) => figure.id), [projectFigure.id]);
const fieldTool = server.listTools().find((tool) => tool.name === 'inspect_dataset_fields');
assert.deepEqual(fieldTool?.inputSchema.properties.datasetId.enum, [dataset.id]);

const unscopedServer = new WebMcpServer(() => undefined, () => ({ ...state, accessibleDatasetIds: undefined }), { getState: () => state, dispatch: () => undefined }, () => []);
const unscopedAnalysis = await unscopedServer.executeTool('analyze_dataset', { operation: 'descriptive', datasetId: dataset.id });
assert.match(unscopedAnalysis.result.error, /not accessible/);

const scopedState = {
  ...INITIAL_DOMAIN_STATE,
  datasets: [...INITIAL_DOMAIN_STATE.datasets, inaccessibleDataset],
  selectedDatasetId: 'palmer-penguins',
};
const rejectedSelection = domainReducer(scopedState, { type: 'SELECT_DATASET', payload: inaccessibleDataset.id });
assert.equal(rejectedSelection.selectedDatasetId, 'palmer-penguins');
const rejectedScopeGrant = domainReducer(scopedState, { type: 'TOGGLE_DATASET_SCOPE', payload: { datasetId: inaccessibleDataset.id, scope: 'project' } });
assert.equal(rejectedScopeGrant.projects[0].datasetIds.includes(inaccessibleDataset.id), false);
const switchedProjectState = {
  ...INITIAL_DOMAIN_STATE,
  datasets: [...INITIAL_DOMAIN_STATE.datasets, inaccessibleDataset],
  selectedDatasetId: inaccessibleDataset.id,
  projects: [
    { ...INITIAL_DOMAIN_STATE.projects[0], datasetIds: [inaccessibleDataset.id], figureIds: [DEFAULT_MULTIPANEL_FIGURE.id] },
    { ...INITIAL_DOMAIN_STATE.projects[0], id: 'project-without-dataset', datasetIds: [], figureIds: [] },
  ],
};
const switchedProject = domainReducer(switchedProjectState, { type: 'SWITCH_PROJECT', payload: 'project-without-dataset' });
assert.equal(switchedProject.selectedDatasetId, null);
const rejectedFigureLoad = domainReducer(scopedState, { type: 'LOAD_FIGURE', payload: outOfScopeFigure });
assert.equal(rejectedFigureLoad.figure?.id, DEFAULT_MULTIPANEL_FIGURE.id);
const scopedServer = new WebMcpServer(() => undefined, () => ({ ...state, datasets: [dataset, inaccessibleDataset], accessibleDatasetIds: [dataset.id] }), { getState: () => state, dispatch: () => undefined }, () => []);
const scopedCatalog = await scopedServer.executeTool('inspect_dataset_catalog', {});
assert.deepEqual(scopedCatalog.result.datasets.map((entry: { id: string }) => entry.id), [dataset.id]);
const rejectedFields = await scopedServer.executeTool('inspect_dataset_fields', { datasetId: inaccessibleDataset.id });
assert.match(rejectedFields.result.error, /not accessible/);

const collidingBundleDataset = {
  ...dataset,
  id: 'palmer-penguins',
  name: 'Unrelated replacement',
  rows: [{ species: 'Only this row', bill_length_mm: 1, body_mass_g: 2 }],
};
const importedFigure = {
  ...DEFAULT_MULTIPANEL_FIGURE,
  id: DEFAULT_MULTIPANEL_FIGURE.id,
  panels: DEFAULT_MULTIPANEL_FIGURE.panels.map((panel) => panel.spec.kind === 'text-caption'
    ? panel
    : { ...panel, spec: { ...panel.spec, datasetId: 'palmer-penguins' } }),
};
const importedState = domainReducer(INITIAL_DOMAIN_STATE, {
  type: 'IMPORT_FIGURE_BUNDLE',
  payload: { figure: importedFigure, datasets: [collidingBundleDataset], scope: 'project' },
});
assert.equal(importedState.datasets.some((candidate) => candidate.id === 'palmer-penguins-imported'), true);
assert.equal(
  importedState.figure?.panels.some((panel) => 'datasetId' in panel.spec && panel.spec.datasetId === 'palmer-penguins-imported'),
  true,
);

const importedLedger: any = {
  events: [{
    eventId: 'collision-event',
    revision: 2,
    actor: 'human',
    timestamp: '2026-09-03T00:00:00.000Z',
    actionType: 'DIRECT_HUMAN_EDIT',
    summary: 'Imported collision snapshot',
    basedOnRevision: 0,
    specSnapshot: importedFigure.panels[0].spec,
    validationReport: { valid: true, issues: [] },
    figureSnapshot: importedFigure,
    workspaceSnapshot: importedFigure.panels.map((panel: any) => ({ panelId: panel.id, kind: panel.spec.kind, spec: panel.spec, frame: panel.frame })),
    datasetSnapshots: [collidingBundleDataset],
    commandPayload: { figureId: importedFigure.id, datasetId: collidingBundleDataset.id },
  }],
};
const collisionImport = domainReducer(INITIAL_DOMAIN_STATE, {
  type: 'IMPORT_FIGURE_BUNDLE',
  payload: {
    figure: importedFigure,
    datasets: [collidingBundleDataset],
    notes: { legend: 'Imported notes', updatedAt: '2026-09-03T00:00:00.000Z' },
    provenance: importedLedger,
    analysisRuns: [{
      id: 'run-collision',
      datasetId: collidingBundleDataset.id,
      operation: 'descriptive',
      fields: ['body_mass_g'],
      inputs: { source: 'import-test' },
      result: { columns: [] },
      status: 'complete',
      actor: 'human',
      createdAt: '2026-09-03T00:00:00.000Z',
    }],
    scope: 'project',
  },
});
const collisionFigureId = `${DEFAULT_MULTIPANEL_FIGURE.id}-imported`;
assert.equal(collisionImport.figure?.id, collisionFigureId);
assert.equal(collisionImport.notesByFigureId[collisionFigureId].legend, 'Imported notes');
assert.notEqual(collisionImport.provenanceByFigureId[collisionFigureId], importedLedger);
assert.equal(collisionImport.provenanceByFigureId[collisionFigureId].events[0].figureSnapshot.id, collisionFigureId);
assert.equal(collisionImport.provenanceByFigureId[collisionFigureId].events[0].datasetSnapshots[0].id, 'palmer-penguins-imported');
assert.equal((collisionImport.provenanceByFigureId[collisionFigureId].events[0].figureSnapshot.panels[0].spec as any).datasetId, 'palmer-penguins-imported');
assert.equal(collisionImport.analysisRuns.find((run) => run.id === 'imported-run-collision')?.datasetId, 'palmer-penguins-imported');
const restoredCollision = domainReducer(collisionImport, { type: 'RESTORE_SNAPSHOT', payload: { targetRevision: 2 } });
assert.equal(restoredCollision.figure?.id, collisionFigureId);
assert.equal(restoredCollision.datasets.find((candidate) => candidate.id === 'palmer-penguins-imported')?.rows[0].species, 'Only this row');

const createdFigure = domainReducer(INITIAL_DOMAIN_STATE, { type: 'CREATE_FIGURE', payload: { name: 'Empty scientific canvas' } });
const createdScientificPanels = createdFigure.figure?.panels.filter((panel) => panel.spec.kind !== 'text-caption') || [];
assert.ok(createdScientificPanels.length > 0);
createdScientificPanels.forEach((panel) => {
  if (panel.spec.kind === 'forest-plot') {
    assert.equal(panel.spec.studies.length, 0);
    assert.ok(Number.isNaN(panel.spec.pooledEstimate.effect));
  }
  if (panel.spec.kind === 'funnel-plot') assert.equal(panel.spec.points.length, 0);
  if (panel.spec.kind === 'grouped-bar') assert.equal(panel.spec.groups.length, 0);
});

const revisionFigure: any = {
  ...DEFAULT_MULTIPANEL_FIGURE,
  id: 'figure-revision-test',
  panels: [{
    ...DEFAULT_MULTIPANEL_FIGURE.panels[0],
    spec: {
      kind: 'single-chart',
      datasetId: dataset.id,
      spec: {
        title: 'Revision test',
        figureIntent: 'relationship',
        mark: 'point',
        encoding: {
          x: { field: 'duration_min', type: 'quantitative' },
          y: { field: 'water_l', type: 'quantitative' },
        },
        showsRawObservations: true,
        uncertaintyEncoding: 'raw-points-only',
      },
    },
  }],
};
const revisionState: any = {
  ...INITIAL_DOMAIN_STATE,
  datasets: [dataset],
  projects: [{ ...INITIAL_DOMAIN_STATE.projects[0], datasetIds: [dataset.id], figureIds: [revisionFigure.id, 'figure-revision-second'] }],
  figures: [revisionFigure, { ...revisionFigure, id: 'figure-revision-second' }],
  figure: revisionFigure,
  activeFigureId: revisionFigure.id,
  provenance: { events: [] },
  provenanceByFigureId: { [revisionFigure.id]: { events: [] }, 'figure-revision-second': { events: [] } },
};
const revisionLoaded = domainReducer(revisionState, { type: 'LOAD_FIGURE', payload: revisionFigure, recordProvenance: true });
assert.equal(revisionLoaded.provenance.events[0].datasetSnapshots[0].rows.length, 3);
const revisionUpdated = domainReducer(revisionLoaded, {
  type: 'UPDATE_DATASET',
  payload: { id: dataset.id, rows: [...dataset.rows, { day: '2026-09-04', duration_min: 20, water_l: 70, product: 'soap' }] },
});
assert.equal(revisionUpdated.datasets.find((candidate) => candidate.id === dataset.id)?.revision, 1);
assert.equal(revisionUpdated.provenanceByFigureId['figure-revision-second'].events[0].actionType, 'UPDATE_DATASET');
const restoredRevision = domainReducer(revisionUpdated, {
  type: 'RESTORE_SNAPSHOT',
  payload: { targetRevision: revisionLoaded.provenance.events[0].revision },
});
assert.equal(restoredRevision.datasets.find((candidate) => candidate.id === dataset.id)?.rows.length, 3);

const revisionWithRun = {
  ...revisionUpdated,
  analysisRuns: [{
    id: 'deleted-source-run',
    datasetId: dataset.id,
    operation: 'descriptive',
    fields: ['duration_min'],
    inputs: {},
    result: { columns: [] },
    status: 'complete' as const,
    actor: 'human' as const,
    createdAt: '2026-09-03T00:00:00.000Z',
  }],
};
const deletedRevision = domainReducer(revisionWithRun, { type: 'DELETE_DATASET', payload: dataset.id });
assert.equal(deletedRevision.datasets.some((candidate) => candidate.id === dataset.id), false);
assert.equal(deletedRevision.projects[0].datasetIds.includes(dataset.id), false);
assert.ok((deletedRevision.figure?.panels[0].spec as any).bindingIssues?.length);
assert.equal(deletedRevision.provenance.events[0].actionType, 'CLEAR_DATASET');
assert.equal(deletedRevision.provenance.events[0].datasetSnapshots[0].rows.length, 4);
assert.equal(deletedRevision.provenanceByFigureId['figure-revision-second'].events[0].actionType, 'CLEAR_DATASET');
assert.equal(deletedRevision.analysisRuns[0].status, 'unavailable');
assert.match(deletedRevision.analysisRuns[0].unavailableReason, /was deleted/);

const restoredDeletedRevision = domainReducer(deletedRevision, {
  type: 'RESTORE_SNAPSHOT',
  payload: { targetRevision: deletedRevision.provenance.events[0].revision },
});
assert.equal(restoredDeletedRevision.datasets.find((candidate) => candidate.id === dataset.id)?.rows.length, 4);
assert.equal(restoredDeletedRevision.projects[0].datasetIds.includes(dataset.id), true);
assert.equal((restoredDeletedRevision.figure?.panels[0].spec as any).bindingIssues?.length || 0, 0);

const secondDataset = { ...dataset, id: 'second-dataset', rows: [{ ...dataset.rows[0], duration_min: 99 }] };
const topologyFigure: any = {
  ...DEFAULT_MULTIPANEL_FIGURE,
  id: 'figure-topology-test',
  panels: [
    { ...DEFAULT_MULTIPANEL_FIGURE.panels[0], id: 'panel-topology-a', spec: { ...DEFAULT_MULTIPANEL_FIGURE.panels[0].spec, datasetId: dataset.id } },
    { ...DEFAULT_MULTIPANEL_FIGURE.panels[1], id: 'panel-topology-b', spec: { ...DEFAULT_MULTIPANEL_FIGURE.panels[1].spec, datasetId: secondDataset.id } },
  ],
  layers: [
    { ...DEFAULT_MULTIPANEL_FIGURE.layers[1], id: 'layer-topology-b', panelId: 'panel-topology-b', order: 0 },
    { ...DEFAULT_MULTIPANEL_FIGURE.layers[0], id: 'layer-topology-a', panelId: 'panel-topology-a', order: 1 },
  ],
};
const topologyState: any = {
  ...INITIAL_DOMAIN_STATE,
  datasets: [dataset, secondDataset],
  projects: [{ ...INITIAL_DOMAIN_STATE.projects[0], datasetIds: [dataset.id, secondDataset.id], figureIds: [topologyFigure.id] }],
  figures: [topologyFigure],
  figure: topologyFigure,
  activeFigureId: topologyFigure.id,
  provenance: { events: [] },
  provenanceByFigureId: { [topologyFigure.id]: { events: [] } },
};
const topologyLoaded = domainReducer(topologyState, { type: 'LOAD_FIGURE', payload: topologyFigure, recordProvenance: true });
const topologyInitialRevision = topologyLoaded.provenance.events[0].revision;
const topologyChanged = domainReducer(topologyLoaded, {
  type: 'UPDATE_PANEL_FRAME',
  payload: { panelId: 'panel-topology-a', frame: { x: 123, y: 456, width: 321, height: 222 } },
});
const topologyDatasetChanged = domainReducer(topologyChanged, {
  type: 'UPDATE_DATASET',
  payload: { id: secondDataset.id, rows: [{ ...secondDataset.rows[0], duration_min: 101 }] },
});
assert.equal(topologyDatasetChanged.provenance.events[0].datasetSnapshots.length, 2);
const topologyRestored = domainReducer(topologyDatasetChanged, { type: 'RESTORE_SNAPSHOT', payload: { targetRevision: topologyInitialRevision } });
assert.deepEqual(topologyRestored.figure?.panels.map((panel) => panel.id), ['panel-topology-a', 'panel-topology-b']);
assert.deepEqual(topologyRestored.figure?.layers.map((layer) => layer.panelId), ['panel-topology-b', 'panel-topology-a']);
assert.deepEqual(topologyRestored.figure?.panels[0].frame, topologyFigure.panels[0].frame);
assert.equal(topologyRestored.datasets.find((candidate) => candidate.id === secondDataset.id)?.rows[0].duration_min, 99);

const scopeRemoved = domainReducer(revisionLoaded, {
  type: 'TOGGLE_DATASET_SCOPE',
  payload: { datasetId: dataset.id, scope: 'project' },
});
assert.equal(scopeRemoved.projects[0].datasetIds.includes(dataset.id), false);
assert.ok((scopeRemoved.figure?.panels[0].spec as any).bindingIssues?.length);
assert.equal(scopeRemoved.provenance.events[0].actionType, 'CLEAR_DATASET');
assert.deepEqual(scopeRemoved.provenance.events[0].scopeSnapshot?.projectDatasetIds, [dataset.id]);
const restoredScopedRevision = domainReducer(scopeRemoved, {
  type: 'RESTORE_SNAPSHOT',
  payload: { targetRevision: revisionLoaded.provenance.events[0].revision },
});
assert.equal(restoredScopedRevision.projects[0].datasetIds.includes(dataset.id), true);
assert.equal((restoredScopedRevision.figure?.panels[0].spec as any).datasetId, dataset.id);
assert.equal(domainReducer(scopedState, {
  type: 'UPDATE_DATASET',
  payload: { id: inaccessibleDataset.id, rows: [] },
}).datasets.some((candidate) => candidate.id === inaccessibleDataset.id), true);

const lifecycleFigureA = { ...DEFAULT_MULTIPANEL_FIGURE, id: 'lifecycle-figure-a' };
const lifecycleFigureB = { ...DEFAULT_MULTIPANEL_FIGURE, id: 'lifecycle-figure-b' };
const lifecycleProjectA = { ...INITIAL_DOMAIN_STATE.projects[0], id: 'lifecycle-project-a', figureIds: [lifecycleFigureA.id], datasetIds: [dataset.id] };
const lifecycleProjectB = { ...INITIAL_DOMAIN_STATE.projects[0], id: 'lifecycle-project-b', figureIds: [lifecycleFigureB.id], datasetIds: [] };
const lifecycleState: any = {
  ...INITIAL_DOMAIN_STATE,
  datasets: [dataset],
  projects: [lifecycleProjectA, lifecycleProjectB],
  workspaces: [{ ...INITIAL_DOMAIN_STATE.workspaces[0], projectIds: [lifecycleProjectA.id, lifecycleProjectB.id] }],
  activeProjectId: lifecycleProjectA.id,
  figures: [lifecycleFigureA, lifecycleFigureB],
  figure: lifecycleFigureA,
  activeFigureId: lifecycleFigureA.id,
  provenanceByFigureId: { [lifecycleFigureA.id]: { events: [] }, [lifecycleFigureB.id]: { events: [] } },
  notesByFigureId: { [lifecycleFigureB.id]: { legend: 'remove me', updatedAt: '2026-09-03' } },
  analysisRuns: [{ id: 'run-a', figureId: lifecycleFigureA.id, datasetId: dataset.id, operation: 'descriptive', fields: [], inputs: {}, result: {}, actor: 'human', createdAt: '2026-09-03' }, { id: 'run-b', figureId: lifecycleFigureB.id, datasetId: dataset.id, operation: 'descriptive', fields: [], inputs: {}, result: {}, actor: 'human', createdAt: '2026-09-03' }],
};
const afterInactiveFigureDelete = domainReducer(lifecycleState, { type: 'DELETE_FIGURE', payload: lifecycleFigureB.id });
assert.equal(afterInactiveFigureDelete.activeFigureId, lifecycleFigureA.id);
assert.equal(afterInactiveFigureDelete.figure?.id, lifecycleFigureA.id);
const afterInactiveProjectDelete = domainReducer(lifecycleState, { type: 'DELETE_PROJECT', payload: lifecycleProjectB.id });
assert.equal(afterInactiveProjectDelete.activeProjectId, lifecycleProjectA.id);
assert.equal(afterInactiveProjectDelete.workspaces[0].projectIds.includes(lifecycleProjectB.id), false);
assert.equal(afterInactiveProjectDelete.figures.some((figure) => figure.id === lifecycleFigureB.id), false);
assert.equal(afterInactiveProjectDelete.analysisRuns.some((run) => run.id === 'run-b'), false);
assert.equal(afterInactiveProjectDelete.notesByFigureId[lifecycleFigureB.id], undefined);
const afterActiveProjectDelete = domainReducer(afterInactiveProjectDelete, { type: 'DELETE_PROJECT', payload: lifecycleProjectA.id });
assert.equal(afterActiveProjectDelete.activeProjectId, null);
assert.equal(afterActiveProjectDelete.selectedDatasetId, null);
assert.equal(afterActiveProjectDelete.figures.length, 0);

const metadataState = domainReducer(revisionState, { type: 'SET_FIGURE_NOTES', payload: { figureId: revisionFigure.id, notes: { methods: 'Methods retained' } } });
const metadataWithRun = domainReducer(metadataState, {
  type: 'RECORD_ANALYSIS_RUN',
  payload: { figureId: revisionFigure.id, datasetId: dataset.id, operation: 'descriptive', fields: ['duration_min'], inputs: { test: true }, result: { columns: [] }, status: 'unavailable', unavailableReason: 'No finite observations were available.', actor: 'human' },
});
saveDomainState(metadataWithRun);
const reloadedMetadata = loadDomainState();
assert.equal(reloadedMetadata.notesByFigureId[revisionFigure.id].methods, 'Methods retained');
assert.equal(reloadedMetadata.analysisRuns[0].datasetId, dataset.id);
assert.equal(reloadedMetadata.analysisRuns[0].status, 'unavailable');
assert.equal(reloadedMetadata.analysisRuns[0].unavailableReason, 'No finite observations were available.');

console.log('data-analysis-e2e: passed');
