import { WebMcpToolDefinition, WebMcpCallLog, FigureState } from '../../types';
import { profileDataset } from '../data-model/profiler';
import { validateFigureSpec } from '../validation/validator';
import { FigureDomainAction, ApplyResult } from '../domain/reducer';
import { globalFigureStore, FigureStore } from '../domain/store';
import { proposeFigureRevision, applyFigureRevision } from '../domain/commands';
import { BASE_WEBMCP_TOOLS, getDatasetAwareTools } from './tools';
import { WebMcpAgent } from './types';
import { runTwoGroupTtest } from '../stats';

export { BASE_WEBMCP_TOOLS as WEBMCP_TOOLS, getDatasetAwareTools };

export class WebMcpServer {
  private dispatchDomainAction: (action: FigureDomainAction) => any;
  private getState: () => FigureState;
  private store: FigureStore;
  private getTargetPanelIds: () => string[];

  constructor(
    dispatch: (action: FigureDomainAction) => any,
    getState: () => FigureState,
    store: FigureStore = globalFigureStore,
    getTargetPanelIds: () => string[] = () => []
  ) {
    this.dispatchDomainAction = dispatch;
    this.getState = getState;
    this.store = store;
    this.getTargetPanelIds = getTargetPanelIds;
  }

  public listTools(): WebMcpToolDefinition[] {
    const state = this.getState();
    if (state?.datasetId) {
      return getDatasetAwareTools(state.datasetId, state.currentRevision);
    }
    return BASE_WEBMCP_TOOLS;
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
          result = { figures: (currentState as any).figures || [], activeFigureId: (currentState as any).activeFigureId || null };
          break;
        case 'inspect_dataset_catalog':
          result = { datasets: (currentState as any).datasets || [], selectedDatasetId: currentState.datasetId };
          break;
        case 'inspect_selected_panel':
          result = { panelId: (currentState as any).selectedPanelId || null, panel: (currentState as any).selectedPanel || null };
          break;
        case 'inspect_dataset_fields': {
          const profile = profileDataset(currentState.datasetId || 'palmer-penguins');
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
          const profile = profileDataset(currentState.datasetId || 'palmer-penguins');
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

        case 'inspect_figure_workspace': {
          const profile = profileDataset(currentState.datasetId || 'palmer-penguins');
          const lastValidation = currentState.spec ? validateFigureSpec(currentState.spec, profile) : null;

          let scientificQuestion =
            'How do morphometric measurements (bill length, depth, flipper length, body mass) differ across penguin species and sexes?';
          if (currentState.datasetId === 'gapminder-life-expectancy') {
            scientificQuestion =
              'What is the relationship between GDP per capita and life expectancy across different countries and continents?';
          } else if (currentState.datasetId === 'seattle-weather') {
            scientificQuestion =
              'What are the trends and relationships in precipitation, maximum temperature, and wind speed in Seattle weather over time?';
          }

          result = {
            targetPanelIds,
            layerOrder: [...((currentState as any).layers || [])].sort((a, b) => a.order - b.order).map((layer: any) => layer.panelId),
            selectedPanelId: (currentState as any).selectedPanelId || null,
            panels: ((currentState as any).panels || []).map((panel: any) => ({
              id: panel.id,
              label: panel.label,
              kind: panel.spec?.kind,
              title: panel.spec?.kind === 'single-chart' ? panel.spec.spec?.title : panel.spec?.title,
              frame: panel.frame,
              agentEditable: targetPanelIds.includes(panel.id),
              spec: panel.spec,
            })),
            datasetId: currentState.datasetId || 'palmer-penguins',
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
                  subtitle: `Analytical mark: ${inputArgs.mark} | Intent: ${inputArgs.figureIntent}`,
                  figureIntent: inputArgs.figureIntent,
                  mark: inputArgs.mark,
                  encoding: inputArgs.encoding,
                  showsRawObservations: Boolean(inputArgs.showsRawObservations),
                  uncertaintyEncoding: inputArgs.uncertaintyEncoding || null,
                  errorBarMode: inputArgs.errorBarMode || existingSpec?.errorBarMode || 'none',
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

          // 3. Native Browser Confirmation Gate (Invariant 3)
          let userConfirmed = false;
          let confirmationUnavailable = false;
          const proposed = currentState.activePreview.proposedSpec;
          const confirmMessage = `Apply proposed figure revision to ${inputArgs.targetPanelId.toUpperCase()}?\n\nTitle: ${proposed.title || 'Untitled'}\nType: ${currentState.activePreview.panelKind || 'single-chart'}\nRevision: Rev ${currentState.currentRevision} -> Rev ${currentState.currentRevision + 1}`;

          if (interactionAgent?.requestUserInteraction) {
            try {
              userConfirmed = await interactionAgent.requestUserInteraction(async () => {
                if (typeof window === 'undefined' || typeof window.confirm !== 'function') {
                  throw new Error('Browser confirmation is unavailable.');
                }
                return window.confirm(confirmMessage);
              });
            } catch (e) {
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
                ? 'Native confirmation is unavailable. Ask the user to open FigureFoundry in a WebMCP-capable browser before applying this revision.'
                : 'Revision was declined in the native confirmation prompt.',
            } as ApplyResult;
            break;
          }

          // 4. Mark approved and commit
          this.store.dispatch({
            type: 'APPROVE_PREVIEW_UI',
            payload: { previewId: inputArgs.previewId },
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
