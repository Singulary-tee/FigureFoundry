import { WebMcpToolDefinition } from '../../types';
import { profileDataset } from '../data-model/profiler';

export const BASE_WEBMCP_TOOLS: WebMcpToolDefinition[] = [
  {
    name: 'inspect_dataset_catalog',
    title: 'Inspect available datasets',
    description: 'Lists every loaded dataset with its identifier, title, row count, and currently selected status. Use datasetId from this result to inspect or analyze any loaded dataset without changing the user’s selection.',
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    outputSchema: {
      type: 'object',
      properties: {
        selectedDatasetId: { type: ['string', 'null'] },
        datasets: { type: 'array', items: { type: 'object' } },
      },
      required: ['selectedDatasetId', 'datasets'],
    },
  },
  {
    name: 'inspect_dataset_fields',
    title: 'Inspect dataset fields',
    description: 'Returns the columns of a loaded dataset: name, type, unit, missing-value count, cardinality, and up to 5 example values per field. Read-only.',
    annotations: {
      readOnlyHint: true,
      untrustedContentHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {
        datasetId: { type: 'string', description: 'Optional loaded dataset identifier. Defaults to the selected dataset.' },
      },
      additionalProperties: false
    },
    outputSchema: {
      type: 'object',
      properties: {
        datasetId: { type: 'string' },
        rowCount: { type: 'integer', minimum: 0 },
        fields: {
          type: 'array',
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
    name: 'inspect_figure_workspace',
    title: 'Inspect current figure workspace state',
    description: 'Returns the current page and figure state, including every panelId available for an agent proposal across all panel types. Read-only. Call this first in a session or after applying a revision.',
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
        activeFigureId: { type: ['string', 'null'], description: 'The figure that owns every panel and revision in this response.' },
        targetPanelIds: { type: 'array', items: { type: 'string' }, description: 'Panels in the active figure that can be targeted by a revision proposal. Always inspect this fresh after the user changes figures.' },
        layerOrder: { type: 'array', items: { type: 'string' }, description: 'Current panel arrangement order.' },
        selectedPanelId: { type: ['string', 'null'], description: 'The panel the user currently has selected, if any.' },
        panels: {
          type: 'array',
          description: 'A compact map of panels in the active figure for choosing a proposal target.',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              label: { type: 'string' },
              kind: { type: 'string' },
              datasetId: { type: ['string', 'null'], description: 'Dataset bound to this panel, or the currently selected dataset when the panel has no explicit binding.' },
              title: { type: 'string' },
              frame: {
                type: 'object',
                properties: {
                  x: { type: 'number' },
                  y: { type: 'number' },
                  width: { type: 'number' },
                  height: { type: 'number' },
                },
                required: ['x', 'y', 'width', 'height'],
              },
              agentEditable: { type: 'boolean' },
              spec: { type: 'object', additionalProperties: true },
            },
            required: ['id', 'label', 'kind', 'datasetId', 'title', 'frame', 'agentEditable', 'spec'],
            additionalProperties: false,
          },
        },
        datasetId: { type: 'string' },
        scientificQuestion: { type: 'string' },
        figureIntent: {
          type: 'string',
          enum: ['comparison', 'distribution', 'relationship', 'trend']
        },
        revision: { type: 'integer', minimum: 0 },
        currentSpec: {
          type: ['object', 'null'],
          description: 'The current FigureSpec when the selected panel is a Vega chart; structured panel specifications are listed in panels.'
        },
        lastValidation: {
          type: ['object', 'null'],
          properties: {
            valid: { type: 'boolean' },
            issues: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  severity: { type: 'string', enum: ['blocking', 'warning'] },
                  path: { type: 'string' },
                  message: { type: 'string' }
                },
                required: ['severity', 'path', 'message'],
                additionalProperties: false
              }
            }
          },
          additionalProperties: false
        },
        provenanceEventCount: { type: 'integer', minimum: 0 }
      },
      required: ['activeFigureId', 'targetPanelIds', 'layerOrder', 'selectedPanelId', 'panels', 'datasetId', 'scientificQuestion', 'figureIntent', 'revision', 'currentSpec', 'lastValidation', 'provenanceEventCount'],
      additionalProperties: false
    }
  },
  {
    name: 'analyze_dataset',
    title: 'Run a dataset analysis',
    description: 'Runs a deterministic analysis on any loaded dataset. Supported operations are descriptive statistics, categorical frequencies, Pearson correlation, linear regression (including temporal x fields), and Welch two-group comparison. Inspect fields first, then supply only the fields needed by the operation.',
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        datasetId: { type: 'string', description: 'Optional loaded dataset identifier. Defaults to the selected dataset.' },
        operation: { type: 'string', enum: ['descriptive', 'frequency', 'correlation', 'linear-regression', 'group-comparison'] },
        fields: { type: 'array', items: { type: 'string' }, description: 'Numeric fields for descriptive statistics. Defaults to every numeric field.' },
        field: { type: 'string', description: 'Field for frequency analysis.' },
        xField: { type: 'string', description: 'Numeric or temporal predictor field for correlation or linear regression.' },
        yField: { type: 'string', description: 'Numeric outcome field for correlation or linear regression.' },
        valueField: { type: 'string', description: 'Numeric outcome field for group comparison.' },
        groupField: { type: 'string', description: 'Categorical grouping field for group comparison.' },
        group1Val: { type: 'string', description: 'Optional first group for group comparison.' },
        group2Val: { type: 'string', description: 'Optional second group for group comparison.' },
        maxCategories: { type: 'integer', minimum: 1, maximum: 100, description: 'Maximum returned categories for frequency analysis.' },
      },
      required: ['operation'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        datasetId: { type: 'string' },
        operation: { type: 'string' },
        fields: { type: 'array', items: { type: 'string' } },
        result: { type: 'object' },
      },
      required: ['datasetId', 'operation', 'fields', 'result'],
    },
  },
  {
    name: 'analyze_group_comparison',
    title: 'Analyze two groups with uncertainty',
    description: 'Computes a deterministic Welch two-sample comparison from the loaded dataset, including group means, 95% confidence intervals, the mean difference with a 95% confidence interval, and a significance annotation. Use this before proposing a comparison or significance overlay.',
    annotations: {
      readOnlyHint: true,
      untrustedContentHint: false,
    },
    inputSchema: {
      type: 'object',
      properties: {
        datasetId: { type: 'string', description: 'Optional loaded dataset identifier. Defaults to the selected dataset.' },
        valueField: { type: 'string', description: 'Numeric outcome field.' },
        groupField: { type: 'string', description: 'Categorical grouping field.' },
        group1Val: { type: 'string', description: 'Optional first group value.' },
        group2Val: { type: 'string', description: 'Optional second group value.' },
      },
      required: ['valueField', 'groupField'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        datasetId: { type: 'string' },
        method: { type: 'string' },
        valueField: { type: 'string' },
        groupField: { type: 'string' },
        groups: { type: 'array' },
        effect: { type: 'object' },
        test: { type: 'object' },
        interpretation: { type: 'string' },
      },
      required: ['datasetId', 'method', 'valueField', 'groupField', 'groups', 'effect', 'test', 'interpretation'],
    },
  },
  {
    name: 'propose_figure_revision',
    title: 'Propose a figure revision',
    description: 'Prepares a candidate figure specification from stated intent and field mappings, and runs deterministic scientific validation against it. Does not mutate canonical state; returns previewId for confirmation.',
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      untrustedContentHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {
        datasetId: { type: 'string', description: 'Optional loaded dataset identifier. Defaults to the selected dataset and binds a single-chart proposal to it.' },
        targetPanelId: {
          type: 'string',
          description: 'A panelId from the fresh targetPanelIds list returned by inspect_figure_workspace. Applying a proposal always requests native human confirmation.'
        },
        basedOnRevision: {
          type: 'integer',
          minimum: 0,
          description: 'Optional optimistic-concurrency guard. Use the revision returned by inspect_figure_workspace.'
        },
        panelKind: {
          type: 'string',
          enum: ['forest-plot', 'funnel-plot', 'grouped-bar', 'subgroup-analysis', 'volcano-plot', 'heatmap', 'text-caption', 'single-chart'],
          description: 'Optional panel renderer to create or replace. Use panelSpec for non-Vega scientific panels.'
        },
        panelSpec: {
          type: 'object',
          description: 'Optional complete panel specification for any supported scientific panel renderer.'
        },
        title: { type: 'string', description: 'Optional figure title.' },
        subtitle: { type: 'string', description: 'Optional figure subtitle.' },
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
            },
            size: {
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
        },
        errorBarMode: {
          type: 'string',
          enum: ['sd', 'sem', 'ci95', 'none'],
          description: 'Optional uncertainty layer for a chart. Use ci95, sem, or sd when comparing groups.'
        },
        trendline: {
          type: 'string',
          enum: ['linear', 'polynomial', 'loess', 'none'],
          description: 'Optional fitted trend overlay for relationship or trend charts.'
        },
        facetBy: {
          type: 'object',
          properties: {
            field: { type: 'string' },
            type: { type: 'string', enum: ['quantitative', 'categorical', 'temporal', 'ordinal'] }
          },
          required: ['field', 'type'],
          additionalProperties: false,
        },
        filters: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              field: { type: 'string' },
              operator: { type: 'string', enum: ['==', '!=', '>', '<', 'in'] },
              value: {}
            },
            required: ['field', 'operator', 'value'],
            additionalProperties: false,
          },
          description: 'Optional row filters evaluated before chart rendering.'
        },
        workspacePatch: {
          type: 'object',
          description: 'Optional atomic workspace change. Use panelChanges to update other panel specs and/or frames, and layerOrder to arrange existing panels. Every panelId must come from inspect_figure_workspace.',
          properties: {
            panelChanges: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  panelId: { type: 'string' },
                  panelSpec: { type: 'object', description: 'Complete replacement panel specification.' },
                  frame: {
                    type: 'object',
                    properties: {
                      x: { type: 'number', minimum: 0 },
                      y: { type: 'number', minimum: 0 },
                      width: { type: 'number', exclusiveMinimum: 0 },
                      height: { type: 'number', exclusiveMinimum: 0 },
                    },
                    required: ['x', 'y', 'width', 'height'],
                    additionalProperties: false,
                  },
                },
                required: ['panelId'],
                additionalProperties: false,
              },
            },
            layerOrder: { type: 'array', items: { type: 'string' }, description: 'Complete panel order from front/top to back/bottom.' },
          },
          additionalProperties: false,
        }
      },
      required: ['targetPanelId']
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
        nextAction: { type: 'string' },
        panelId: { type: 'string' },
        panelKind: { type: 'string' },
        workspacePatch: { type: ['object', 'null'] }
      },
      required: ['previewId', 'basedOnRevision', 'validation', 'nextAction']
    }
  },
  {
    name: 'apply_figure_revision',
    title: 'Apply an approved figure revision',
    description: 'Commits a previously proposed figure revision after native user confirmation. Enforces targetPanelId validation and optimistic concurrency checks.',
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      untrustedContentHint: false,
      requiresHumanApproval: true
    },
    inputSchema: {
      type: 'object',
      properties: {
        targetPanelId: {
          type: 'string',
          description: 'The same panelId used when staging the preview. Application requires native human confirmation.'
        },
        previewId: { type: 'string', description: 'Must match a previewId returned by propose_figure_revision.' },
        basedOnRevision: { type: 'integer', minimum: 0, description: 'Must equal the project current revision.' }
      },
      required: ['targetPanelId', 'previewId', 'basedOnRevision']
    },
    outputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['applied', 'rejected_stale', 'rejected_unapproved', 'rejected_invalid_target', 'rejected_unknown_preview', 'rejected_wrong_target', 'rejected_validation_failed'] },
        newRevision: { type: 'integer', minimum: 0 },
        appliedSpec: { type: ['object', 'null'] },
        provenanceEventId: { type: 'string' },
        message: { type: 'string' }
      },
      required: ['status', 'newRevision', 'appliedSpec', 'provenanceEventId', 'message']
    }
  }
];

export function getDatasetAwareTools(datasetId: string, currentRevision?: number, datasetIds: string[] = []): WebMcpToolDefinition[] {
  const profile = profileDataset(datasetId);
  const columnNames = profile.fields.map(f => f.name);

  return BASE_WEBMCP_TOOLS.map(tool => {
    const toolCopy = JSON.parse(JSON.stringify(tool)) as WebMcpToolDefinition;
    const bindFields = (schema: any, propertyName?: string) => {
      if (!schema || typeof schema !== 'object') return;
      if (propertyName && (propertyName === 'field' || propertyName === 'fields' || propertyName.endsWith('Field'))) {
        if (schema.items) schema.items.enum = columnNames;
        else schema.enum = columnNames;
      }
      if (propertyName === 'datasetId' && datasetIds.length) schema.enum = datasetIds;
      Object.entries(schema.properties || {}).forEach(([name, child]) => bindFields(child, name));
      if (schema.items) bindFields(schema.items);
    };
    bindFields(toolCopy.inputSchema);
    if (tool.name === 'propose_figure_revision') {
      return toolCopy;
    }

    if (tool.name === 'apply_figure_revision' && typeof currentRevision === 'number') {
      if (toolCopy.inputSchema.properties?.basedOnRevision) {
        toolCopy.inputSchema.properties.basedOnRevision.description = `Must equal current project revision: ${currentRevision}`;
      }
      return toolCopy;
    }

    return toolCopy;
  });
}

export function getPageAwareTools(page: string): WebMcpToolDefinition[] {
  const definitions: WebMcpToolDefinition[] = [];
  if (page === 'dashboard') {
    definitions.push({
      name: 'inspect_figures', title: 'Inspect figures',
      description: 'Lists figures in the active project so the agent can help the user choose a canvas.',
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      outputSchema: { type: 'object' }
    });
  }
  if (page === 'figures') {
    definitions.push({
      name: 'inspect_selected_panel', title: 'Inspect selected panel',
      description: 'Returns the selected panel kind, label, and specification before an agent proposes a change.',
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      outputSchema: { type: 'object' }
    });
  }
  return definitions;
}
