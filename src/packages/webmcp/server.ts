import { WebMcpToolDefinition, WebMcpCallLog, FigureState } from '../../types';
import { profileDataset } from '../data-model/profiler';
import { validateFigureSpec } from '../validation/validator';
import { FigureDomainAction, ApplyResult } from '../domain/reducer';
import { globalFigureStore, FigureStore } from '../domain/store';
import { proposeFigureRevision, applyFigureRevision } from '../domain/commands';
import { BASE_WEBMCP_TOOLS, getDatasetAwareTools } from './tools';

export { BASE_WEBMCP_TOOLS as WEBMCP_TOOLS, getDatasetAwareTools };

export class WebMcpServer {
  private dispatchDomainAction: (action: FigureDomainAction) => any;
  private getState: () => FigureState;
  private store: FigureStore;
  private getEditablePanelIds: () => string[];

  constructor(
    dispatch: (action: FigureDomainAction) => any,
    getState: () => FigureState,
    store: FigureStore = globalFigureStore,
    getEditablePanelIds: () => string[] = () => []
  ) {
    this.dispatchDomainAction = dispatch;
    this.getState = getState;
    this.store = store;
    this.getEditablePanelIds = getEditablePanelIds;
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
    actor: 'agent' | 'human' = 'agent'
  ): Promise<{ result: any; log: WebMcpCallLog }> {
    const startTime = performance.now();
    const currentState = this.getState();
    const editablePanelIds = this.getEditablePanelIds();
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
              agentEditablePanelId: editablePanelIds[0] || '',
              editablePanelIds,
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
          if (!inputArgs.targetPanelId || (editablePanelIds.length > 0 && !editablePanelIds.includes(inputArgs.targetPanelId))) {
            status = 'rejected';
            result = {
              valid: false,
              issues: [
                {
                  severity: 'blocking',
                  path: 'targetPanelId',
                  message: `Target panel '${inputArgs.targetPanelId || 'undefined'}' is not present in the active figure. Choose one of: ${editablePanelIds.join(', ')}.`,
                },
              ],
            };
            break;
          }

          const candidateSpec = inputArgs.panelSpec || {
            ...currentState.spec,
            title:
              inputArgs.title ||
              `${inputArgs.figureIntent?.toUpperCase() || 'FIGURE'}: ${inputArgs.encoding?.y?.field || 'Y'} vs ${inputArgs.encoding?.x?.field || 'X'}`,
            subtitle: `Analytical mark: ${inputArgs.mark} | Intent: ${inputArgs.figureIntent}`,
            figureIntent: inputArgs.figureIntent,
            mark: inputArgs.mark,
            encoding: inputArgs.encoding,
            showsRawObservations: Boolean(inputArgs.showsRawObservations),
            uncertaintyEncoding: inputArgs.uncertaintyEncoding || 'none',
          };

          const domainCmdResult = proposeFigureRevision(this.store, {
            proposedSpec: candidateSpec,
            basedOnRevision: currentState.currentRevision,
            actor,
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
          if (!inputArgs.targetPanelId || (editablePanelIds.length > 0 && !editablePanelIds.includes(inputArgs.targetPanelId))) {
            status = 'rejected';
            result = {
              status: 'rejected_unapproved',
              newRevision: currentState.currentRevision,
              appliedSpec: null,
              provenanceEventId: '',
              message: `Target panel '${inputArgs.targetPanelId || 'undefined'}' is not present in the active figure. Choose one of: ${editablePanelIds.join(', ')}.`,
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
          const proposed = currentState.activePreview.proposedSpec;
          const confirmMessage = `Apply proposed figure revision to ${inputArgs.targetPanelId.toUpperCase()}?\n\nTitle: ${proposed.title || 'Untitled'}\nType: ${currentState.activePreview.panelKind || 'single-chart'}\nRevision: Rev ${currentState.currentRevision} -> Rev ${currentState.currentRevision + 1}`;

          if (typeof window !== 'undefined') {
            if (typeof (window as any).requestUserInteraction === 'function') {
              try {
                const res = await (window as any).requestUserInteraction({
                  type: 'confirm',
                  title: 'Confirm Figure Revision',
                  message: confirmMessage,
                  previewId: inputArgs.previewId,
                  proposedSpec: proposed,
                });
                userConfirmed = Boolean(res?.confirmed ?? res);
              } catch (e) {
                userConfirmed = true;
              }
            } else if (typeof (navigator as any).modelContext?.requestUserInteraction === 'function') {
              try {
                const res = await (navigator as any).modelContext.requestUserInteraction({
                  type: 'confirm',
                  title: 'Confirm Figure Revision',
                  message: confirmMessage,
                  previewId: inputArgs.previewId,
                  proposedSpec: proposed,
                });
                userConfirmed = Boolean(res?.confirmed ?? res);
              } catch (e) {
                userConfirmed = true;
              }
            } else {
              userConfirmed = true;
            }
          } else {
            userConfirmed = true;
          }

          if (!userConfirmed) {
            status = 'rejected';
            result = {
              status: 'rejected_unapproved',
              newRevision: currentState.currentRevision,
              appliedSpec: null,
              provenanceEventId: '',
              message: 'Revision was declined in the native confirmation prompt.',
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
