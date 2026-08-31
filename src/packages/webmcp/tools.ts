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
    name: 'inspect_figure_workspace',
    title: 'Inspect current figure workspace state',
    description: 'Returns the current session state: which panel is agent-editable (agentEditablePanelId), scientific question, declared figure intent, revision number, the currently applied figure spec (if any), the most recent validation result, and a count of provenance events. Read-only. Does NOT return dataset field metadata — call inspect_dataset_fields separately for that. Call this first in a session, or after apply_figure_revision, to know what is currently on screen and which panel target to use before proposing a change.',
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
        agentEditablePanelId: {
          type: 'string',
          description: 'The panelId of the panel currently flagged isAgentEditable: true. Use this as targetPanelId in propose_figure_revision and apply_figure_revision.'
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
          description: 'The FigureSpec currently applied to the agent-editable panel, or null if no revision has been applied yet this session.'
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
      required: ['agentEditablePanelId', 'datasetId', 'scientificQuestion', 'figureIntent', 'revision', 'currentSpec', 'lastValidation', 'provenanceEventCount'],
      additionalProperties: false
    }
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
        targetPanelId: {
          type: 'string',
          description: 'Must equal the panelId of the panel currently flagged isAgentEditable: true. Calls targeting any other panelId are rejected — the agent may only ever operate the one designated agent-editable panel.'
        },
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
      required: ['targetPanelId', 'figureIntent', 'mark', 'encoding', 'showsRawObservations', 'uncertaintyEncoding']
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
          description: 'Must equal the panelId of the panel currently flagged isAgentEditable: true. Calls targeting any other panelId are rejected — the agent may only ever operate the one designated agent-editable panel.'
        },
        previewId: { type: 'string', description: 'Must match a previewId returned by propose_figure_revision.' },
        basedOnRevision: { type: 'integer', minimum: 0, description: 'Must equal the project current revision.' }
      },
      required: ['targetPanelId', 'previewId', 'basedOnRevision']
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
