import { WebMcpToolDefinition } from '../../types';
import { profileDataset } from '../data-model/profiler';

export const BASE_WEBMCP_TOOLS: WebMcpToolDefinition[] = [
  {
    name: 'inspect_dataset_fields',
    title: 'Inspect dataset fields',
    description: 'Returns the columns of the currently loaded dataset: name, type, unit, missing-value count, cardinality, and up to 5 example values per field. Read-only. Context budget <1.5 KB.',
    annotations: {
      readOnlyHint: true,
      untrustedContentHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    },
    outputSchema: {
      type: 'object',
      properties: {
        datasetId: { type: 'string' },
        rowCount: { type: 'integer', minimum: 0 },
        fields: {
          type: 'array',
          maxItems: 12,
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              type: { type: 'string', enum: ['quantitative', 'categorical', 'temporal', 'ordinal'] },
              unit: { type: ['string', 'null'] },
              missingCount: { type: 'integer', minimum: 0 },
              cardinality: { type: ['integer', 'null'], minimum: 0 },
              exampleValues: {
                type: 'array',
                maxItems: 5,
                items: { type: ['string', 'number', 'boolean'] }
              }
            },
            required: ['name', 'type', 'unit', 'missingCount', 'cardinality', 'exampleValues']
          }
        }
      },
      required: ['datasetId', 'rowCount', 'fields']
    }
  },
  {
    name: 'inspect_figure_state',
    title: 'Inspect current figure state',
    description: 'Returns the current active datasetId, currentRevision, canonical FigureSpec, active staging preview (if any), and recent provenance events. Read-only.',
    annotations: {
      readOnlyHint: true,
      untrustedContentHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    },
    outputSchema: {
      type: 'object',
      properties: {
        datasetId: { type: 'string' },
        currentRevision: { type: 'integer', minimum: 0 },
        spec: { type: 'object' },
        activePreviewId: { type: ['string', 'null'] },
        hasPendingApproval: { type: 'boolean' }
      },
      required: ['datasetId', 'currentRevision', 'spec', 'activePreviewId', 'hasPendingApproval']
    }
  },
  {
    name: 'propose_figure_revision',
    title: 'Propose a figure revision',
    description: 'Prepares a candidate figure specification from stated intent and field mappings, and runs deterministic scientific validation against it. Does not mutate canonical state; returns previewId for human review.',
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      untrustedContentHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {
        figureIntent: {
          type: 'string',
          enum: ['comparison', 'distribution', 'relationship', 'trend'],
          description: 'The analytical purpose of the figure.'
        },
        mark: {
          type: 'string',
          enum: ['point', 'bar', 'boxplot', 'tick', 'line', 'area']
        },
        encoding: {
          type: 'object',
          properties: {
            x: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                type: { type: 'string', enum: ['quantitative', 'categorical', 'temporal', 'ordinal'] },
                legendTitle: { type: 'string' },
                axisTitle: { type: 'string' }
              },
              required: ['field', 'type']
            },
            y: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                type: { type: 'string', enum: ['quantitative', 'categorical', 'temporal', 'ordinal'] },
                legendTitle: { type: 'string' },
                axisTitle: { type: 'string' }
              },
              required: ['field', 'type']
            },
            color: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                type: { type: 'string', enum: ['quantitative', 'categorical', 'temporal', 'ordinal'] },
                legendTitle: { type: 'string' }
              },
              required: ['field', 'type']
            },
            shape: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                type: { type: 'string', enum: ['quantitative', 'categorical', 'temporal', 'ordinal'] },
                legendTitle: { type: 'string' }
              },
              required: ['field', 'type']
            }
          },
          required: ['x', 'y']
        },
        showsRawObservations: {
          type: 'boolean',
          description: 'True if individual data points are shown alongside any aggregate. Required true when figureIntent is distribution.'
        },
        uncertaintyEncoding: {
          type: 'string',
          enum: ['errorbar', 'band', 'raw-points-only', 'none'],
          description: 'Method for encoding data uncertainty or null/none.'
        }
      },
      required: ['figureIntent', 'mark', 'encoding', 'showsRawObservations', 'uncertaintyEncoding']
    },
    outputSchema: {
      type: 'object',
      properties: {
        previewId: { type: 'string' },
        basedOnRevision: { type: 'integer', minimum: 0 },
        validation: {
          type: 'object',
          properties: {
            valid: { type: 'boolean' },
            issues: { type: 'array' }
          },
          required: ['valid', 'issues']
        },
        nextAction: { type: 'string' }
      },
      required: ['previewId', 'basedOnRevision', 'validation', 'nextAction']
    }
  },
  {
    name: 'apply_figure_revision',
    title: 'Apply an approved figure revision',
    description: 'Commits a previously proposed figure revision after the human has reviewed and approved it in the UI. Enforces optimistic concurrency and UI human approval check.',
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      untrustedContentHint: false,
      requiresHumanApproval: true
    },
    inputSchema: {
      type: 'object',
      properties: {
        previewId: { type: 'string', description: 'Must match a previewId returned by propose_figure_revision.' },
        basedOnRevision: { type: 'integer', minimum: 0, description: 'Must equal the project current revision.' },
        humanApprovalConfirmed: { type: 'boolean', description: 'Confirmation that human approved in UI.' }
      },
      required: ['previewId', 'basedOnRevision', 'humanApprovalConfirmed']
    },
    outputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['applied', 'rejected_stale', 'rejected_unapproved', 'rejected_unknown_preview', 'rejected_validation_failed'] },
        newRevision: { type: 'integer', minimum: 0 },
        appliedSpec: { type: ['object', 'null'] },
        provenanceEventId: { type: 'string' },
        message: { type: 'string' }
      },
      required: ['status', 'newRevision', 'appliedSpec', 'provenanceEventId', 'message']
    }
  },
  {
    name: 'validate_figure_revision',
    title: 'Speculatively validate figure revision',
    description: 'Dry-run evaluation of scientific validation rules without creating a previewId or mutating staging state.',
    annotations: {
      readOnlyHint: true,
      untrustedContentHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {
        figureIntent: { type: 'string' },
        mark: { type: 'string' },
        encoding: { type: 'object' },
        showsRawObservations: { type: 'boolean' },
        uncertaintyEncoding: { type: ['string', 'null'] }
      },
      required: ['figureIntent', 'mark', 'encoding', 'showsRawObservations']
    },
    outputSchema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean' },
        issues: { type: 'array' }
      },
      required: ['valid', 'issues']
    }
  },
  {
    name: 'perform_statistical_test',
    title: 'Perform scientific statistical test',
    description: 'Runs Welch\'s two-sample t-test or Pearson correlation analysis on active dataset fields. Returns p-value, degrees of freedom, significance stars, and recommended figure annotation brackets.',
    annotations: {
      readOnlyHint: true,
      untrustedContentHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {
        testType: { type: 'string', enum: ['t-test', 'correlation'] },
        valueField: { type: 'string', description: 'Quantitative outcome variable' },
        groupField: { type: 'string', description: 'Categorical group variable (for t-test) or second quantitative field (for correlation)' },
        group1Val: { type: 'string', description: 'Optional first group name' },
        group2Val: { type: 'string', description: 'Optional second group name' }
      },
      required: ['testType', 'valueField', 'groupField']
    },
    outputSchema: {
      type: 'object',
      properties: {
        testName: { type: 'string' },
        statisticName: { type: 'string' },
        statisticValue: { type: 'number' },
        degreesOfFreedom: { type: 'number' },
        pValue: { type: 'number' },
        significanceStars: { type: 'string' },
        groupStats: { type: 'array' },
        summary: { type: 'string' },
        recommendedAnnotation: { type: 'object' }
      },
      required: ['testName', 'statisticValue', 'pValue', 'significanceStars', 'summary']
    }
  },
  {
    name: 'set_publication_style',
    title: 'Set publication journal theme style',
    description: 'Proposes applying a major scientific journal theme preset (Nature, Science, Cell, IEEE, GraphPad Prism) with compliant typography, margins, color palettes, and axis rules.',
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      untrustedContentHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {
        themePreset: { type: 'string', enum: ['nature', 'science', 'cell', 'ieee', 'prism', 'dark', 'light'] },
        customTitle: { type: 'string' },
        customSubtitle: { type: 'string' }
      },
      required: ['themePreset']
    },
    outputSchema: {
      type: 'object',
      properties: {
        previewId: { type: 'string' },
        basedOnRevision: { type: 'integer' },
        appliedPreset: { type: 'string' },
        themeSummary: { type: 'string' }
      },
      required: ['previewId', 'basedOnRevision', 'appliedPreset', 'themeSummary']
    }
  },
  {
    name: 'export_publication_figure',
    title: 'Export publication figure bundle',
    description: 'Generates a publication-ready figure bundle including compiled Vega-Lite spec, formatted scientific caption with statistics/n-counts, and journal compliance score.',
    annotations: {
      readOnlyHint: true,
      untrustedContentHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {
        format: { type: 'string', enum: ['vegalite', 'caption', 'full-bundle'] }
      },
      required: ['format']
    },
    outputSchema: {
      type: 'object',
      properties: {
        datasetTitle: { type: 'string' },
        revision: { type: 'integer' },
        spec: { type: 'object' },
        caption: { type: 'string' },
        complianceScore: { type: 'number' },
        guidelineChecks: { type: 'array' }
      },
      required: ['datasetTitle', 'revision', 'spec', 'caption', 'complianceScore']
    }
  }
];

export function getDatasetAwareTools(datasetId: string, currentRevision?: number): WebMcpToolDefinition[] {
  const profile = profileDataset(datasetId);
  const columnNames = profile.fields.map(f => f.name);

  return BASE_WEBMCP_TOOLS.map(tool => {
    if (tool.name === 'propose_figure_revision') {
      const toolCopy = JSON.parse(JSON.stringify(tool)) as WebMcpToolDefinition;
      
      if (toolCopy.inputSchema.properties?.encoding?.properties?.x?.properties?.field) {
        toolCopy.inputSchema.properties.encoding.properties.x.properties.field.enum = columnNames;
      }
      if (toolCopy.inputSchema.properties?.encoding?.properties?.y?.properties?.field) {
        toolCopy.inputSchema.properties.encoding.properties.y.properties.field.enum = columnNames;
      }
      if (toolCopy.inputSchema.properties?.encoding?.properties?.color?.properties?.field) {
        toolCopy.inputSchema.properties.encoding.properties.color.properties.field.enum = columnNames;
      }
      if (toolCopy.inputSchema.properties?.encoding?.properties?.shape?.properties?.field) {
        toolCopy.inputSchema.properties.encoding.properties.shape.properties.field.enum = columnNames;
      }
      return toolCopy;
    }

    if (tool.name === 'apply_figure_revision' && typeof currentRevision === 'number') {
      const toolCopy = JSON.parse(JSON.stringify(tool)) as WebMcpToolDefinition;
      if (toolCopy.inputSchema.properties?.basedOnRevision) {
        toolCopy.inputSchema.properties.basedOnRevision.description = `Must equal current project revision: ${currentRevision}`;
      }
      return toolCopy;
    }

    return tool;
  });
}
