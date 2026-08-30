import { WebMcpToolDefinition, WebMcpCallLog, FigureState } from '../../types';
import { profileDataset } from '../data-model/profiler';
import { validateFigureSpec } from '../validation/validator';
import { FigureDomainAction, ApplyResult } from '../domain/reducer';
import { globalFigureStore, FigureStore } from '../domain/store';
import { proposeFigureRevision, applyFigureRevision } from '../domain/commands';
import { BASE_WEBMCP_TOOLS, getDatasetAwareTools } from './tools';
import { runTwoGroupTtest, runPearsonCorrelation } from '../stats';

export { BASE_WEBMCP_TOOLS as WEBMCP_TOOLS, getDatasetAwareTools };

export class WebMcpServer {
  private dispatchDomainAction: (action: FigureDomainAction) => any;
  private getState: () => FigureState;
  private store: FigureStore;

  constructor(dispatch: (action: FigureDomainAction) => any, getState: () => FigureState, store: FigureStore = globalFigureStore) {
    this.dispatchDomainAction = dispatch;
    this.getState = getState;
    this.store = store;
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
    let result: any = null;
    let status: 'success' | 'error' | 'rejected' = 'success';

    try {
      switch (toolName) {
        case 'inspect_dataset_fields': {
          const profile = profileDataset(currentState.datasetId);
          result = {
            datasetId: profile.datasetId,
            rowCount: profile.rowCount,
            fields: profile.fields.map(f => ({
              name: f.name,
              type: f.type,
              unit: f.unit,
              missingCount: f.missingCount,
              cardinality: f.cardinality,
              exampleValues: f.exampleValues
            }))
          };
          break;
        }

        case 'inspect_figure_state': {
          result = {
            datasetId: currentState.datasetId,
            currentRevision: currentState.currentRevision,
            spec: currentState.spec,
            activePreviewId: currentState.activePreview?.previewId || null,
            hasPendingApproval: !!currentState.activePreview && !currentState.activePreview.approvedInUI
          };
          break;
        }

        case 'propose_figure_revision': {
          const candidateSpec = {
            ...currentState.spec,
            title:
              inputArgs.title ||
              `${inputArgs.figureIntent?.toUpperCase() || 'FIGURE'}: ${inputArgs.encoding?.y?.field || 'Y'} vs ${inputArgs.encoding?.x?.field || 'X'}`,
            subtitle: `Analytical mark: ${inputArgs.mark} | Intent: ${inputArgs.figureIntent}`,
            figureIntent: inputArgs.figureIntent,
            mark: inputArgs.mark,
            encoding: inputArgs.encoding,
            showsRawObservations: inputArgs.showsRawObservations,
            uncertaintyEncoding: inputArgs.uncertaintyEncoding
          };

          const domainCmdResult = proposeFigureRevision(this.store, {
            proposedSpec: candidateSpec,
            basedOnRevision: currentState.currentRevision,
            actor,
            commandPayload: inputArgs
          });

          result = domainCmdResult.result || domainCmdResult.boundaryErrors;
          if (!domainCmdResult.success) {
            status = 'rejected';
          }
          break;
        }

        case 'apply_figure_revision': {
          const domainCmdResult = applyFigureRevision(this.store, {
            previewId: inputArgs.previewId,
            basedOnRevision: inputArgs.basedOnRevision,
            humanApprovalConfirmed: inputArgs.humanApprovalConfirmed,
            actor
          });

          result = domainCmdResult.result || domainCmdResult.boundaryErrors;
          if (!domainCmdResult.success) {
            status = 'rejected';
          }
          break;
        }

        case 'validate_figure_revision': {
          const profile = profileDataset(currentState.datasetId);
          const candidateSpec = {
            ...currentState.spec,
            figureIntent: inputArgs.figureIntent,
            mark: inputArgs.mark,
            encoding: inputArgs.encoding,
            showsRawObservations: inputArgs.showsRawObservations,
            uncertaintyEncoding: inputArgs.uncertaintyEncoding
          };
          result = validateFigureSpec(candidateSpec, profile);
          break;
        }

        case 'perform_statistical_test': {
          const profile = profileDataset(currentState.datasetId);
          if (inputArgs.testType === 'correlation') {
            const corr = runPearsonCorrelation(profile.records, inputArgs.valueField, inputArgs.groupField);
            result = {
              testName: 'Pearson Correlation Analysis',
              statisticName: 'r',
              statisticValue: corr.r,
              degreesOfFreedom: corr.n - 2,
              pValue: corr.pValue,
              significanceStars: corr.stars,
              groupStats: [],
              summary: corr.summary,
              recommendedAnnotation: {
                group1: inputArgs.valueField,
                group2: inputArgs.groupField,
                pValue: corr.pValue,
                stars: corr.stars
              }
            };
          } else {
            const ttest = runTwoGroupTtest(profile.records, inputArgs.valueField, inputArgs.groupField, inputArgs.group1Val, inputArgs.group2Val);
            result = ttest;
          }
          break;
        }

        case 'set_publication_style': {
          if (!currentState.spec) {
            throw new Error('No active figure specification to format.');
          }
          const formattedSpec = {
            ...currentState.spec,
            themePreset: inputArgs.themePreset,
            title: inputArgs.customTitle || currentState.spec.title,
            subtitle: inputArgs.customSubtitle || `${currentState.spec.subtitle || ''} [Preset: ${String(inputArgs.themePreset).toUpperCase()}]`
          };

          const domainCmdResult = proposeFigureRevision(this.store, {
            proposedSpec: formattedSpec,
            basedOnRevision: currentState.currentRevision,
            actor,
            commandPayload: inputArgs
          });

          result = {
            ...(domainCmdResult.result || domainCmdResult.boundaryErrors),
            appliedPreset: inputArgs.themePreset,
            themeSummary: `Proposed ${String(inputArgs.themePreset).toUpperCase()} journal typography and color palette.`
          };
          break;
        }

        case 'export_publication_figure': {
          const profile = profileDataset(currentState.datasetId);
          const spec = currentState.spec;
          if (!spec) {
            throw new Error('No active figure to export.');
          }
          const validation = validateFigureSpec(spec, profile);
          const caption = `Figure 1. ${spec.title}. ${spec.subtitle || ''}. Data shown from dataset ${profile.title} (n=${profile.rowCount}). Figure generated with ${spec.themePreset ? spec.themePreset.toUpperCase() : 'standard'} layout rules. ${validation.valid ? 'Passed all scientific publication integrity checks.' : 'Validation warnings present.'}`;

          result = {
            datasetTitle: profile.title,
            revision: currentState.currentRevision,
            spec,
            caption,
            complianceScore: validation.valid ? 100 : 75,
            guidelineChecks: validation.issues
          };
          break;
        }

        default:
          throw new Error(
            `Unknown WebMCP tool '${toolName}'. Registered tools: ${this.listTools().map(t => t.name).join(', ')}`
          );
      }
    } catch (err: any) {
      status = 'error';
      result = {
        error: err.message || 'Internal WebMCP tool execution error'
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
      status
    };

    return { result, log };
  }
}
