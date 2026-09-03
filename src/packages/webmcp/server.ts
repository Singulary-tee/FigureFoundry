import { DatasetProfile, WebMcpToolDefinition, WebMcpCallLog, FigureState, FigurePreview } from '../../types';
import { profileDataset } from '../data-model/profiler';
import { validateFigureSpec } from '../validation/validator';
import { FigureDomainAction, ApplyResult } from '../domain/reducer';
import { globalFigureStore, FigureStore } from '../domain/store';
import { proposeFigureRevision, applyFigureRevision } from '../domain/commands';
import { BASE_WEBMCP_TOOLS, getDatasetAwareTools } from './tools';
import { WebMcpAgent } from './types';
import { calculateFrequencyDistribution, runLinearRegression, runPearsonCorrelation, runTwoGroupTtest, summarizeNumericFields } from '../stats';

export { BASE_WEBMCP_TOOLS as WEBMCP_TOOLS, getDatasetAwareTools };

function unavailableAnalysisReason(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Record<string, unknown>;
  const strings: string[] = [];
  const visit = (entry: unknown, depth = 0) => {
    if (depth > 4 || entry === null || entry === undefined) return;
    if (typeof entry === 'string') {
      strings.push(entry);
      return;
    }
    if (Array.isArray(entry)) {
      entry.forEach((item) => visit(item, depth + 1));
      return;
    }
    if (typeof entry === 'object') {
      Object.values(entry).forEach((item) => visit(item, depth + 1));
    }
  };
  visit(candidate);
  const unavailableSummary = strings
    .filter((summary) => /unavailable|insufficient|not estimable/i.test(summary))
    .sort((left, right) => right.length - left.length)[0];
  if (unavailableSummary) return unavailableSummary;
  if (Array.isArray(candidate.columns) && candidate.columns.length > 0 && candidate.columns.every((column) => (
    column && typeof column === 'object' && (column as Record<string, unknown>).count === 0
  ))) {
    return 'No finite observations were available for the selected field(s).';
  }
  return undefined;
}

function recordAnalysisRun(
  dispatch: (action: FigureDomainAction) => any,
  state: FigureState,
  toolName: string,
  inputArgs: Record<string, any>,
  result: any,
  actor: 'agent' | 'human',
) {
  if (!result?.datasetId) return;
  const operation = result.operation || (toolName === 'analyze_group_comparison' ? 'group-comparison' : toolName);
  const fields = Array.isArray(result.fields)
    ? result.fields
    : toolName === 'analyze_group_comparison'
      ? [inputArgs.valueField, inputArgs.groupField].filter((field): field is string => typeof field === 'string')
      : [];
  const analysisResult = toolName === 'analyze_dataset' ? result.result : result;
  const unavailableReason = unavailableAnalysisReason(analysisResult);
  dispatch({
    type: 'RECORD_ANALYSIS_RUN',
    payload: {
      figureId: (state as any).activeFigureId || undefined,
      datasetId: result.datasetId,
      operation,
      fields,
      inputs: inputArgs,
      result: analysisResult,
      status: unavailableReason ? 'unavailable' : 'complete',
      unavailableReason,
      actor,
    },
  } as any);
}

export type WebMcpConfirmHandler = (details: {
  previewId: string;
  targetPanelId: string;
  title: string;
  panelKind?: string;
  basedOnRevision: number;
  message?: string;
  preview: FigurePreview;
}) => Promise<boolean>;

export class WebMcpServer {
  private dispatchDomainAction: (action: FigureDomainAction) => any;
  private getState: () => FigureState;
  private store: FigureStore;
  private getTargetPanelIds: () => string[];
  private confirmHandler?: WebMcpConfirmHandler;

  constructor(
    dispatch: (action: FigureDomainAction) => any,
    getState: () => FigureState,
    store: FigureStore = globalFigureStore,
    getTargetPanelIds: () => string[] = () => [],
    confirmHandler?: WebMcpConfirmHandler
  ) {
    this.dispatchDomainAction = dispatch;
    this.getState = getState;
    this.store = store;
    this.getTargetPanelIds = getTargetPanelIds;
    this.confirmHandler = confirmHandler;
  }

  public listTools(): WebMcpToolDefinition[] {
    const state = this.getState();
    const accessibleDatasetIds = this.getAccessibleDatasetIds(state);
    const schemaDatasetId = ((state as any).datasets || []).find((dataset: any) =>
      accessibleDatasetIds.has(dataset.id),
    )?.id;
    if (schemaDatasetId) {
      return getDatasetAwareTools(
        schemaDatasetId,
        state.currentRevision,
        Array.from(accessibleDatasetIds),
      );
    }
    return BASE_WEBMCP_TOOLS;
  }

  private getAccessibleDatasetIds(state: FigureState): Set<string> {
    const explicit = (state as any).accessibleDatasetIds;
    return Array.isArray(explicit) ? new Set(explicit) : new Set();
  }

  private getActiveProjectFigureIds(state: FigureState): Set<string> | null {
    const activeProjectId = (state as any).activeProjectId;
    const projects = (state as any).projects;
    if (typeof activeProjectId !== 'string' || !Array.isArray(projects)) return null;
    const activeProject = projects.find((project: any) => project.id === activeProjectId);
    return activeProject && Array.isArray(activeProject.figureIds) ? new Set(activeProject.figureIds) : new Set();
  }

  private resolveDatasetProfile(state: FigureState, requestedDatasetId?: unknown): DatasetProfile {
    const accessibleDatasetIds = this.getAccessibleDatasetIds(state);
    const datasetId = typeof requestedDatasetId === 'string' && requestedDatasetId
      ? requestedDatasetId
      : state.datasetId;
    if (!datasetId || !accessibleDatasetIds.has(datasetId)) {
      throw new Error(`Dataset '${datasetId || '(none)'}' is not accessible in the active project/workspace scope.`);
    }
    const record = ((state as any).datasets || []).find((dataset: any) => dataset.id === datasetId);
    if (record) return profileDataset(record);
    const available = ((state as any).datasets || []).map((dataset: any) => dataset.id);
    throw new Error(`Dataset '${datasetId}' is not loaded. Available datasets: ${available.join(', ') || 'none'}.`);
  }

  private requireField(profile: DatasetProfile, field: unknown, role: string, allowedTypes?: DatasetProfile['fields'][number]['type'][]): string {
    if (typeof field !== 'string' || !field) throw new Error(`${role} is required.`);
    const metadata = profile.fields.find((candidate) => candidate.name === field);
    if (!metadata) throw new Error(`Field '${field}' does not exist in dataset '${profile.datasetId}'. Available fields: ${profile.fields.map((candidate) => candidate.name).join(', ')}.`);
    if (allowedTypes && !allowedTypes.includes(metadata.type)) {
      throw new Error(`${role} '${field}' must be ${allowedTypes.join(' or ')}; it is ${metadata.type}.`);
    }
    return field;
  }

  public async executeTool(
    toolName: string,
    inputArgs: Record<string, any>,
    actor: 'agent' | 'human' = 'agent',
    interactionAgent?: WebMcpAgent
  ): Promise<{ result: any; log: WebMcpCallLog }> {
    const startTime = performance.now();
    const currentState = this.getState();
    const targetPanelIds = this.getTargetPanelIds();
    let result: any = null;
    let status: 'success' | 'error' | 'rejected' = 'success';

    try {
      switch (toolName) {
        case 'inspect_figures':
          {
            const activeProjectFigureIds = this.getActiveProjectFigureIds(currentState);
            const figures = ((currentState as any).figures || []).filter((figure: any) =>
              !activeProjectFigureIds || activeProjectFigureIds.has(figure.id),
            );
            result = { figures, activeFigureId: (currentState as any).activeFigureId || null };
          }
          break;
        case 'inspect_dataset_catalog': {
          const accessibleDatasetIds = this.getAccessibleDatasetIds(currentState);
          result = {
            selectedDatasetId: currentState.datasetId || null,
            datasets: ((currentState as any).datasets || []).filter((dataset: any) => accessibleDatasetIds.has(dataset.id)).map((dataset: any) => {
              const profile = profileDataset(dataset);
              return {
                id: dataset.id,
                title: dataset.title || dataset.name || dataset.id,
                description: dataset.description || '',
                rowCount: profile.rowCount,
                fieldCount: profile.fields.length,
                selected: dataset.id === currentState.datasetId,
              };
            }),
          };
          break;
        }
        case 'inspect_selected_panel':
          result = { panelId: (currentState as any).selectedPanelId || null, panel: (currentState as any).selectedPanel || null };
          break;
        case 'inspect_dataset_fields': {
          const profile = this.resolveDatasetProfile(currentState, inputArgs.datasetId);
          result = {
            datasetId: profile.datasetId,
            rowCount: profile.rowCount,
            fields: profile.fields.map((f) => ({
              name: f.name,
              type: f.type,
              unit: f.unit,
              missingCount: f.missingCount,
              cardinality: f.cardinality,
              exampleValues: f.exampleValues,
            })),
          };
          break;
        }

        case 'analyze_group_comparison': {
          const profile = this.resolveDatasetProfile(currentState, inputArgs.datasetId);
          const { valueField, groupField, group1Val, group2Val } = inputArgs;
          const valueMeta = profile.fields.find((field) => field.name === valueField);
          const groupMeta = profile.fields.find((field) => field.name === groupField);
          if (!valueMeta || valueMeta.type === 'categorical' || !groupMeta || groupMeta.type !== 'categorical') {
            throw new Error(`Expected a numeric valueField and categorical groupField. Available fields: ${profile.fields.map((field) => field.name).join(', ')}`);
          }
          const analysis = runTwoGroupTtest(profile.records, valueField, groupField, group1Val, group2Val);
          const [first, second] = analysis.groupStats;
          const difference = first.mean - second.mean;
          const standardError = Math.sqrt(first.sem ** 2 + second.sem ** 2);
          const ciMargin = 1.96 * standardError;
          const pooledStandardDeviation = Math.sqrt(((Math.max(0, first.count - 1) * first.stdDev ** 2) + (Math.max(0, second.count - 1) * second.stdDev ** 2)) / Math.max(1, first.count + second.count - 2));
          result = {
            datasetId: profile.datasetId,
            method: analysis.testName,
            valueField,
            groupField,
            groups: analysis.groupStats.map(({ values, ...group }) => group),
            effect: {
              measure: 'mean difference',
              estimate: Number(difference.toFixed(4)),
              ci95Lower: Number((difference - ciMargin).toFixed(4)),
              ci95Upper: Number((difference + ciMargin).toFixed(4)),
              cohensD: Number((pooledStandardDeviation > 0 ? difference / pooledStandardDeviation : 0).toFixed(4)),
              direction: difference === 0 ? 'no difference' : difference > 0 ? `${first.groupName} > ${second.groupName}` : `${first.groupName} < ${second.groupName}`,
            },
            test: {
              statistic: analysis.statisticValue,
              degreesOfFreedom: analysis.degreesOfFreedom,
              pValue: analysis.pValue,
              significanceStars: analysis.significanceStars,
            },
            interpretation: analysis.summary,
          };
          break;
        }

        case 'analyze_dataset': {
          const profile = this.resolveDatasetProfile(currentState, inputArgs.datasetId);
          const operation = inputArgs.operation;
          if (operation === 'descriptive') {
            const fields = inputArgs.fields === undefined
              ? profile.fields.filter((field) => field.type === 'quantitative').map((field) => field.name)
              : inputArgs.fields;
            if (!Array.isArray(fields) || fields.length === 0) throw new Error('Descriptive analysis requires at least one numeric field.');
            const numericFields = fields.map((field) => this.requireField(profile, field, 'Descriptive field', ['quantitative']));
            result = { datasetId: profile.datasetId, operation, fields: numericFields, result: { columns: summarizeNumericFields(profile.records, numericFields) } };
            break;
          }
          if (operation === 'frequency') {
            const field = this.requireField(profile, inputArgs.field, 'Frequency field');
            result = {
              datasetId: profile.datasetId,
              operation,
              fields: [field],
              result: calculateFrequencyDistribution(profile.records, field, inputArgs.maxCategories || 50),
            };
            break;
          }
          if (operation === 'correlation') {
            const xField = this.requireField(profile, inputArgs.xField, 'Correlation xField', ['quantitative']);
            const yField = this.requireField(profile, inputArgs.yField, 'Correlation yField', ['quantitative']);
            result = { datasetId: profile.datasetId, operation, fields: [xField, yField], result: runPearsonCorrelation(profile.records, xField, yField) };
            break;
          }
          if (operation === 'linear-regression') {
            const xField = this.requireField(profile, inputArgs.xField, 'Regression xField', ['quantitative', 'temporal']);
            const yField = this.requireField(profile, inputArgs.yField, 'Regression yField', ['quantitative']);
            result = { datasetId: profile.datasetId, operation, fields: [xField, yField], result: runLinearRegression(profile.records, xField, yField) };
            break;
          }
          if (operation === 'group-comparison') {
            const valueField = this.requireField(profile, inputArgs.valueField, 'Comparison valueField', ['quantitative']);
            const groupField = this.requireField(profile, inputArgs.groupField, 'Comparison groupField', ['categorical', 'ordinal']);
            const analysis = runTwoGroupTtest(profile.records, valueField, groupField, inputArgs.group1Val, inputArgs.group2Val);
            result = {
              datasetId: profile.datasetId,
              operation,
              fields: [valueField, groupField],
              result: { ...analysis, groupStats: analysis.groupStats.map(({ values, ...group }) => group) },
            };
            break;
          }
          throw new Error(`Unsupported analysis operation '${String(operation)}'.`);
        }

        case 'inspect_figure_workspace': {
          const profile = this.resolveDatasetProfile(currentState);
          const lastValidation = currentState.spec ? validateFigureSpec(currentState.spec, profile) : null;

          const scientificQuestion = `What patterns, relationships, differences, or trends are present in ${profile.title}?`;

          result = {
            activeFigureId: (currentState as any).activeFigureId || null,
            targetPanelIds,
            layerOrder: [...((currentState as any).layers || [])].sort((a, b) => a.order - b.order).map((layer: any) => layer.panelId),
            selectedPanelId: (currentState as any).selectedPanelId || null,
            panels: ((currentState as any).panels || []).map((panel: any) => ({
              id: panel.id,
              label: panel.label,
              kind: panel.spec?.kind,
              datasetId: panel.spec?.datasetId || null,
              title: panel.spec?.kind === 'single-chart' ? panel.spec.spec?.title : panel.spec?.title,
              frame: panel.frame,
              agentEditable: targetPanelIds.includes(panel.id),
              spec: panel.spec,
            })),
            datasetId: currentState.datasetId || null,
            scientificQuestion,
            figureIntent: currentState.spec?.figureIntent || 'comparison',
            revision: currentState.currentRevision,
            currentSpec: currentState.spec,
            lastValidation: lastValidation
              ? {
                  valid: lastValidation.valid,
                  issues: lastValidation.issues.map((issue) => ({
                    severity: issue.severity,
                    path: issue.path,
                    message: issue.message,
                  })),
                }
              : null,
            provenanceEventCount: currentState.provenanceLedger.length,
          };
          break;
        }

        case 'propose_figure_revision': {
          if (
            typeof inputArgs.basedOnRevision === 'number' &&
            inputArgs.basedOnRevision !== currentState.currentRevision
          ) {
            status = 'rejected';
            result = {
              valid: false,
              issues: [{
                severity: 'blocking',
                path: 'basedOnRevision',
                message: `Project revision is Rev ${currentState.currentRevision}; re-inspect the workspace and propose against the latest revision.`,
              }],
            };
            break;
          }

          if (!inputArgs.targetPanelId || !targetPanelIds.includes(inputArgs.targetPanelId)) {
            status = 'rejected';
            result = {
              valid: false,
              issues: [
                {
                  severity: 'blocking',
                  path: 'targetPanelId',
                  message: `Target panel '${inputArgs.targetPanelId || 'undefined'}' is not present in the active figure. Inspect the workspace and choose one of: ${targetPanelIds.join(', ')}.`,
                },
              ],
            };
            break;
          }

          const targetPanel = ((currentState as any).panels || []).find((panel: any) => panel.id === inputArgs.targetPanelId);
          const profile = this.resolveDatasetProfile(currentState, inputArgs.datasetId);
          const requestedKind = inputArgs.panelKind || inputArgs.panelSpec?.kind || (inputArgs.encoding ? 'single-chart' : targetPanel?.spec?.kind || 'single-chart');
          const existingSpec = targetPanel?.spec?.kind === 'single-chart' ? targetPanel.spec.spec : targetPanel?.spec;
          const suppliedPanelSpec = inputArgs.panelSpec;
          const candidateSpec = suppliedPanelSpec
            ? (requestedKind === 'single-chart' && suppliedPanelSpec.kind === 'single-chart' ? suppliedPanelSpec.spec : suppliedPanelSpec)
            : inputArgs.encoding
              ? {
                  ...(targetPanel?.spec?.kind === 'single-chart' ? existingSpec : {}),
                  title:
                    inputArgs.title ||
                    `${inputArgs.figureIntent?.toUpperCase() || 'FIGURE'}: ${inputArgs.encoding?.y?.field || 'Y'} vs ${inputArgs.encoding?.x?.field || 'X'}`,
                  subtitle: inputArgs.subtitle || `Analytical mark: ${inputArgs.mark} | Intent: ${inputArgs.figureIntent}`,
                  figureIntent: inputArgs.figureIntent,
                  mark: inputArgs.mark,
                  encoding: inputArgs.encoding,
                  showsRawObservations: Boolean(inputArgs.showsRawObservations),
                  uncertaintyEncoding: inputArgs.uncertaintyEncoding || null,
                  errorBarMode: inputArgs.errorBarMode || existingSpec?.errorBarMode || 'none',
                  trendline: inputArgs.trendline || existingSpec?.trendline || 'none',
                  facetBy: inputArgs.facetBy || existingSpec?.facetBy,
                  filters: inputArgs.filters ?? existingSpec?.filters,
                }
              : existingSpec;

          const patch = inputArgs.workspacePatch;
          if (patch?.panelChanges) {
            if (!Array.isArray(patch.panelChanges)) {
              throw new Error('workspacePatch.panelChanges must be an array.');
            }
            const invalidChange = patch.panelChanges.find((change: any) => {
              if (!change?.panelId || !targetPanelIds.includes(change.panelId)) return true;
              if (!change.spec && !change.panelSpec && !change.frame) return true;
              if (change.frame && ['x', 'y', 'width', 'height'].some((key) => !Number.isFinite(change.frame[key]) || change.frame[key] < 0)) return true;
              return false;
            });
            if (invalidChange) {
              throw new Error('Every workspace panel change must target an existing panel and include a valid spec or frame.');
            }
          }
          if (patch?.layerOrder) {
            const layerOrder = patch.layerOrder;
            if (!Array.isArray(layerOrder) || layerOrder.length !== targetPanelIds.length || new Set(layerOrder).size !== layerOrder.length || layerOrder.some((id: string) => !targetPanelIds.includes(id))) {
              throw new Error('workspacePatch.layerOrder must contain each active panel exactly once.');
            }
          }
          const normalizedPatch = patch?.panelChanges
            ? {
                ...patch,
                panelChanges: patch.panelChanges.map((change: any) => ({
                  panelId: change.panelId,
                  ...(change.panelSpec ? { spec: change.panelSpec } : {}),
                  ...(change.frame ? { frame: change.frame } : {}),
                })),
              }
            : patch;

          const domainCmdResult = proposeFigureRevision(this.store, {
            proposedSpec: candidateSpec,
            basedOnRevision: currentState.currentRevision,
            actor,
            panelKind: requestedKind,
            datasetId: profile.datasetId,
            datasetProfile: profile,
            workspacePatch: normalizedPatch,
            commandPayload: inputArgs,
          });

          result = domainCmdResult.result;
          if (!domainCmdResult.success) {
            status = 'rejected';
          }
          break;
        }

        case 'apply_figure_revision': {
          // 1. Validate targetPanelId
          if (!inputArgs.targetPanelId || !targetPanelIds.includes(inputArgs.targetPanelId)) {
            status = 'rejected';
            result = {
              status: 'rejected_invalid_target',
              newRevision: currentState.currentRevision,
              appliedSpec: null,
              provenanceEventId: '',
              message: `Target panel '${inputArgs.targetPanelId || 'undefined'}' is not present in the active figure. Inspect the workspace and choose one of: ${targetPanelIds.join(', ')}.`,
            } as ApplyResult;
            break;
          }

          // 2. Validate preview existence and optimistic concurrency
          if (!currentState.activePreview || currentState.activePreview.previewId !== inputArgs.previewId) {
            status = 'rejected';
            result = {
              status: 'rejected_unknown_preview',
              newRevision: currentState.currentRevision,
              appliedSpec: null,
              provenanceEventId: '',
              message: `Preview ID '${inputArgs.previewId}' not found or already consumed.`,
            } as ApplyResult;
            break;
          }

          // A preview is bound to the panel it was proposed for; applying it
          // to any other editable panel would corrupt that panel's spec.
          if (currentState.activePreview.panelId && currentState.activePreview.panelId !== inputArgs.targetPanelId) {
            status = 'rejected';
            result = {
              status: 'rejected_wrong_target',
              newRevision: currentState.currentRevision,
              appliedSpec: null,
              provenanceEventId: '',
              message: `Preview '${inputArgs.previewId}' was proposed for panel '${currentState.activePreview.panelId}' but apply was requested for '${inputArgs.targetPanelId}'. Re-propose with targetPanelId '${currentState.activePreview.panelId}'.`,
            } as ApplyResult;
            break;
          }

          if (currentState.currentRevision !== inputArgs.basedOnRevision) {
            status = 'rejected';
            result = {
              status: 'rejected_stale',
              newRevision: currentState.currentRevision,
              appliedSpec: null,
              provenanceEventId: '',
              message: `Project revision has advanced to Rev ${currentState.currentRevision} (was based on Rev ${inputArgs.basedOnRevision}). Re-propose against the latest revision.`,
            } as ApplyResult;
            break;
          }

          // 3. Human Confirmation Gate (In-app confirmation modal)
          let userConfirmed = false;
          let confirmationUnavailable = false;
          const proposed: any = currentState.activePreview.proposedSpec;
          const confirmMessage = `Apply proposed figure revision to ${inputArgs.targetPanelId.toUpperCase()}?\n\nTitle: ${proposed?.title || proposed?.spec?.title || 'Untitled'}\nType: ${currentState.activePreview.panelKind || 'single-chart'}\nRevision: Rev ${currentState.currentRevision} -> Rev ${currentState.currentRevision + 1}`;

          if (currentState.activePreview.approvedInUI) {
            userConfirmed = true;
          } else if (this.confirmHandler) {
            try {
              userConfirmed = await this.confirmHandler({
                previewId: inputArgs.previewId,
                targetPanelId: inputArgs.targetPanelId,
                title: proposed?.title || proposed?.spec?.title || 'Untitled',
                panelKind: currentState.activePreview.panelKind,
                basedOnRevision: currentState.currentRevision,
                message: confirmMessage,
                preview: currentState.activePreview,
              });
            } catch {
              confirmationUnavailable = true;
            }
          } else if (interactionAgent?.requestUserInteraction) {
            try {
              userConfirmed = await interactionAgent.requestUserInteraction(async () => {
                return true;
              });
            } catch {
              confirmationUnavailable = true;
            }
          } else {
            confirmationUnavailable = true;
          }

          if (!userConfirmed) {
            status = 'rejected';
            result = {
              status: 'rejected_unapproved',
              newRevision: currentState.currentRevision,
              appliedSpec: null,
              provenanceEventId: '',
              message: confirmationUnavailable
                ? 'Human confirmation is required before applying this revision. Please confirm the proposal in the in-app review modal.'
                : 'Revision was declined in the confirmation prompt.',
            } as ApplyResult;
            break;
          }

          // 4. Mark approved and commit
          const freshState = this.store.getState();
          if (!freshState.activePreview && freshState.currentRevision > inputArgs.basedOnRevision) {
            status = 'success';
            result = {
              status: 'applied',
              newRevision: freshState.currentRevision,
              appliedSpec: (freshState as any).spec || null,
              provenanceEventId: '',
              message: `Revision Rev ${freshState.currentRevision} successfully applied and committed to canvas.`,
            } as ApplyResult;
            break;
          }

          this.store.dispatch({
            type: 'APPROVE_PREVIEW_UI',
            payload: { previewId: inputArgs.previewId, source: 'inapp-modal' },
          });

          const domainCmdResult = applyFigureRevision(this.store, {
            previewId: inputArgs.previewId,
            basedOnRevision: inputArgs.basedOnRevision,
            humanApprovalConfirmed: true,
            approvalToken: inputArgs.previewId,
            actor,
          });

          result = domainCmdResult.result;
          if (!domainCmdResult.success) {
            status = 'rejected';
          }
          break;
        }

        default:
          throw new Error(
            `Unknown WebMCP tool '${toolName}'. Registered tools: ${this.listTools().map((t) => t.name).join(', ')}`
          );
      }

      if (status === 'success' && (toolName === 'analyze_dataset' || toolName === 'analyze_group_comparison')) {
        recordAnalysisRun(this.dispatchDomainAction, currentState, toolName, inputArgs, result, actor);
      }
    } catch (err: any) {
      status = 'error';
      result = {
        error: err.message || 'Internal WebMCP tool execution error',
      };
    }

    const durationMs = Math.round(performance.now() - startTime);
    const jsonString = JSON.stringify(result);
    const payloadBytes = new Blob([jsonString]).size;

    const log: WebMcpCallLog = {
      id: 'log_' + Math.random().toString(36).substring(2, 9),
      toolName,
      timestamp: Date.now(),
      inputArgs,
      result,
      durationMs,
      payloadBytes,
      status,
    };

    return { result, log };
  }
}
