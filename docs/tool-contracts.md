# WebMCP Tool Contracts

FigureFoundry implements three primary WebMCP tools tailored for LLM consumption, bounded context budgets, and deterministic verification.

---

## 1. `inspect_dataset_fields`

**Description:** Returns metadata for the currently active scientific dataset (field names, inferred statistical types, units, missing value counts, cardinality, and up to 5 representative values).

### Context Budget Optimization (AX)
- Total payload constrained to $<1.5\text{ KB}$ (~350–400 tokens).
- Column count capped to 12.
- Sample values capped to 5 per field.

### Schema Definition
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "name": "inspect_dataset_fields",
  "title": "Inspect dataset fields",
  "annotations": {
    "readOnlyHint": true,
    "untrustedContentHint": false
  },
  "inputSchema": {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "datasetId": { "type": "string" },
      "rowCount": { "type": "integer", "minimum": 0 },
      "fields": {
        "type": "array",
        "maxItems": 12,
        "items": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "type": { "type": "string", "enum": ["quantitative", "categorical", "temporal", "ordinal"] },
            "unit": { "type": ["string", "null"] },
            "missingCount": { "type": "integer", "minimum": 0 },
            "cardinality": { "type": ["integer", "null"], "minimum": 0 },
            "exampleValues": {
              "type": "array",
              "maxItems": 5,
              "items": { "type": ["string", "number", "boolean"] }
            }
          },
          "required": ["name", "type", "unit", "missingCount", "cardinality", "exampleValues"],
          "additionalProperties": false
        }
      }
    },
    "required": ["datasetId", "rowCount", "fields"],
    "additionalProperties": false
  }
}
```

---

## 2. `propose_figure_revision`

**Description:** Proposes a candidate figure revision based on visual intent, marks, channel encodings, and uncertainty parameters. Returns a transient `previewId`, validation issues, and next-action instructions.

### Schema Definition
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "name": "propose_figure_revision",
  "title": "Propose a figure revision",
  "annotations": {
    "readOnlyHint": false,
    "destructiveHint": false,
    "untrustedContentHint": false
  },
  "inputSchema": {
    "type": "object",
    "properties": {
      "figureIntent": {
        "type": "string",
        "enum": ["comparison", "distribution", "relationship", "trend"]
      },
      "mark": {
        "type": "string",
        "enum": ["point", "bar", "boxplot", "tick", "line", "area"]
      },
      "encoding": {
        "type": "object",
        "properties": {
          "x": { "$ref": "#/$defs/channel" },
          "y": { "$ref": "#/$defs/channel" },
          "color": { "$ref": "#/$defs/channel" },
          "shape": { "$ref": "#/$defs/channel" }
        },
        "required": ["x", "y"],
        "additionalProperties": false
      },
      "showsRawObservations": { "type": "boolean" },
      "uncertaintyEncoding": {
        "type": ["string", "null"],
        "enum": ["errorbar", "band", "raw-points-only", null]
      }
    },
    "required": ["figureIntent", "mark", "encoding", "showsRawObservations", "uncertaintyEncoding"],
    "additionalProperties": false,
    "$defs": {
      "channel": {
        "type": "object",
        "properties": {
          "field": { "type": "string" },
          "type": { "type": "string", "enum": ["quantitative", "categorical", "temporal", "ordinal"] },
          "legendTitle": { "type": "string" }
        },
        "required": ["field", "type"],
        "additionalProperties": false
      }
    }
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "previewId": { "type": "string" },
      "basedOnRevision": { "type": "integer", "minimum": 0 },
      "validation": {
        "type": "object",
        "properties": {
          "valid": { "type": "boolean" },
          "issues": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "severity": { "type": "string", "enum": ["blocking", "warning"] },
                "path": { "type": "string" },
                "message": { "type": "string" }
              },
              "required": ["severity", "path", "message"],
              "additionalProperties": false
            }
          }
        },
        "required": ["valid", "issues"],
        "additionalProperties": false
      },
      "nextAction": { "type": "string" }
    },
    "required": ["previewId", "basedOnRevision", "validation", "nextAction"],
    "additionalProperties": false
  }
}
```

---

## 3. `apply_figure_revision`

**Description:** Commits a previously proposed figure revision after human UI review and approval. Enforces optimistic concurrency and UI approval checks.

### Schema Definition
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "name": "apply_figure_revision",
  "title": "Apply an approved figure revision",
  "annotations": {
    "readOnlyHint": false,
    "destructiveHint": false,
    "untrustedContentHint": false,
    "requiresHumanApproval": true
  },
  "inputSchema": {
    "type": "object",
    "properties": {
      "previewId": { "type": "string" },
      "basedOnRevision": { "type": "integer", "minimum": 0 },
      "humanApprovalConfirmed": { "type": "boolean", "enum": [true] }
    },
    "required": ["previewId", "basedOnRevision", "humanApprovalConfirmed"],
    "additionalProperties": false
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "status": {
        "type": "string",
        "enum": ["applied", "rejected_stale", "rejected_unapproved", "rejected_unknown_preview"]
      },
      "newRevision": { "type": "integer", "minimum": 0 },
      "appliedSpec": { "type": ["object", "null"] },
      "provenanceEventId": { "type": "string" },
      "message": { "type": "string" }
    },
    "required": ["status", "newRevision", "appliedSpec", "provenanceEventId", "message"],
    "additionalProperties": false
  }
}
```
