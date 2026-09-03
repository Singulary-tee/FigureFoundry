import { FigureSpec, DatasetProfile } from '../../types';
import { ExportBundle } from '../../types';
import { parseCSV, parseJSON, MAX_IMPORT_RECORDS, MAX_IMPORT_TEXT_LENGTH } from '../data-model/parser';

export interface ValidationIssueBoundary {
  path: string;
  message: string;
  severity: 'blocking' | 'warning';
}

const PANEL_KINDS = new Set(['forest-plot', 'funnel-plot', 'grouped-bar', 'subgroup-analysis', 'volcano-plot', 'heatmap', 'text-caption', 'single-chart']);

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function validateImportedFigure(candidate: any): string[] {
  const errors: string[] = [];
  if (!candidate || typeof candidate !== 'object') return ['Figure project must be an object.'];
  if (typeof candidate.id !== 'string' || !candidate.id.trim()) errors.push('Figure id is required.');
  if (typeof candidate.name !== 'string' || !candidate.name.trim()) errors.push('Figure name is required.');
  const canvas = candidate.canvasSize;
  if (!canvas || !finite(canvas.width) || !finite(canvas.height) || canvas.width <= 0 || canvas.height <= 0) {
    errors.push('Figure canvasSize must contain positive finite width and height.');
  }
  if (!Array.isArray(candidate.panels) || candidate.panels.length === 0) errors.push('Figure must contain at least one panel.');
  if (!Array.isArray(candidate.layers)) errors.push('Figure layers must be an array.');
  const panelIds = new Set<string>();
  (candidate.panels || []).forEach((panel: any, index: number) => {
    if (!panel || typeof panel !== 'object') {
      errors.push(`Panel ${index + 1} must be an object.`);
      return;
    }
    if (typeof panel.id !== 'string' || !panel.id.trim() || panelIds.has(panel.id)) errors.push(`Panel ${index + 1} has a missing or duplicate id.`);
    panelIds.add(panel.id);
    const frame = panel.frame;
    if (!frame || !['x', 'y', 'width', 'height'].every((key) => finite(frame[key])) || frame.width <= 0 || frame.height <= 0) {
      errors.push(`Panel ${index + 1} frame must contain finite coordinates and positive dimensions.`);
    }
    const spec = panel.spec;
    if (!spec || typeof spec !== 'object' || !PANEL_KINDS.has(spec.kind)) {
      errors.push(`Panel ${index + 1} has an unsupported specification kind.`);
      return;
    }
    const title = spec.kind === 'single-chart' || spec.kind === 'volcano-plot' || spec.kind === 'heatmap' ? spec.spec?.title : spec.title;
    if (typeof title !== 'string' || !title.trim()) errors.push(`Panel ${index + 1} requires a non-empty title.`);
    if (spec.datasetId !== undefined && typeof spec.datasetId !== 'string') errors.push(`Panel ${index + 1} datasetId must be a string.`);
    if (spec.kind === 'single-chart' || spec.kind === 'volcano-plot' || spec.kind === 'heatmap') {
      if (!spec.spec || typeof spec.spec !== 'object' || !spec.spec.encoding || !spec.spec.mark) errors.push(`Panel ${index + 1} has an incomplete chart specification.`);
    } else if (spec.kind === 'text-caption') {
      if (typeof spec.captionText !== 'string') errors.push(`Panel ${index + 1} captionText must be a string.`);
    } else {
      const rowsKey = spec.kind === 'forest-plot' ? 'studies' : spec.kind === 'funnel-plot' ? 'points' : spec.kind === 'grouped-bar' ? 'groups' : 'subgroups';
      if (!Array.isArray(spec[rowsKey])) errors.push(`Panel ${index + 1} ${rowsKey} must be an array.`);
    }
  });
  (candidate.layers || []).forEach((layer: any, index: number) => {
    if (!layer || typeof layer !== 'object' || !panelIds.has(layer.panelId) || !finite(layer.order)) errors.push(`Layer ${index + 1} references an invalid panel or order.`);
  });
  (candidate.manualItems || []).forEach((item: any, index: number) => {
    if (!item || typeof item !== 'object' || !finite(item.x) || !finite(item.y) || (item.width !== undefined && !finite(item.width)) || (item.height !== undefined && !finite(item.height))) {
      errors.push(`Manual item ${index + 1} contains invalid coordinates.`);
    }
  });
  return errors;
}

function looksLikeFigureProject(candidate: any): boolean {
  return Boolean(candidate && typeof candidate === 'object' && !Array.isArray(candidate)
    && ['panels', 'canvasSize', 'layers'].some((key) => Object.prototype.hasOwnProperty.call(candidate, key)));
}

function validateImportedBundleMetadata(bundle: any): string[] {
  const errors: string[] = [];
  if (!Array.isArray(bundle.datasets)) {
    errors.push('Figure bundle datasets must be an array of records with stable ids.');
  } else {
    const datasetIds = new Set<string>();
    bundle.datasets.forEach((dataset: any, index: number) => {
      if (!dataset || typeof dataset !== 'object' || typeof dataset.id !== 'string' || !dataset.id.trim() || datasetIds.has(dataset.id)) {
        errors.push(`Bundle dataset ${index + 1} must have a unique non-empty id.`);
        return;
      }
      datasetIds.add(dataset.id);
      if (!Array.isArray(dataset.rows) || dataset.rows.length > MAX_IMPORT_RECORDS) {
        errors.push(`Bundle dataset ${dataset.id} must contain at most ${MAX_IMPORT_RECORDS} rows.`);
        return;
      }
      if (dataset.rows.some((row: any) => !row || typeof row !== 'object' || Array.isArray(row))) {
        errors.push(`Bundle dataset ${dataset.id} rows must be record objects.`);
      }
    });
  }

  if (bundle.notes !== undefined && (!bundle.notes || typeof bundle.notes !== 'object'
    || ['legend', 'methods', 'research'].some((key) => bundle.notes[key] !== undefined && typeof bundle.notes[key] !== 'string')
    || (bundle.notes.updatedAt !== undefined && typeof bundle.notes.updatedAt !== 'string'))) {
    errors.push('Figure bundle notes must contain text fields and an optional updatedAt string.');
  }
  if (bundle.provenance !== undefined && (!bundle.provenance || !Array.isArray(bundle.provenance.events))) {
    errors.push('Figure bundle provenance must contain an events array.');
  }
  if (bundle.analysisRuns !== undefined) {
    if (!Array.isArray(bundle.analysisRuns)) {
      errors.push('Figure bundle analysisRuns must be an array.');
    } else {
      const runIds = new Set<string>();
      bundle.analysisRuns.forEach((run: any, index: number) => {
        if (!run || typeof run !== 'object' || typeof run.id !== 'string' || !run.id.trim()
          || typeof run.datasetId !== 'string' || typeof run.operation !== 'string'
          || !Array.isArray(run.fields) || !run.fields.every((field: unknown) => typeof field === 'string')
          || !run.inputs || typeof run.inputs !== 'object' || Array.isArray(run.inputs)
          || !run.result || typeof run.result !== 'object' || Array.isArray(run.result)
          || (run.status !== undefined && !['complete', 'unavailable'].includes(run.status))
          || (run.unavailableReason !== undefined && typeof run.unavailableReason !== 'string')
          || !['agent', 'human'].includes(run.actor) || typeof run.createdAt !== 'string') {
          errors.push(`Bundle analysis run ${index + 1} has an invalid immutable record shape.`);
        }
        if (typeof run.id === 'string' && runIds.has(run.id)) errors.push(`Bundle analysis run ${index + 1} duplicates an earlier run id.`);
        if (typeof run.id === 'string') runIds.add(run.id);
      });
    }
  }
  return errors;
}

export function processImportedFile(content: string, filename: string) {
  if (filename.toLowerCase().endsWith('.json')) {
    if (content.replace(/^\uFEFF/, '').length > MAX_IMPORT_TEXT_LENGTH) {
      return { valid: false, errors: [`File is too large. JSON text exceeds the ${MAX_IMPORT_TEXT_LENGTH} character safety limit.`], dataset: null, figure: null };
    }
    try {
      const parsed = JSON.parse(content);
      const isBundle = parsed?.bundleVersion === '1.0';
      if (isBundle || looksLikeFigureProject(parsed)) {
        const candidate = isBundle ? parsed.project : parsed;
        const errors = validateImportedFigure(candidate);
        const bundleErrors = isBundle ? validateImportedBundleMetadata(parsed) : [];
        if (errors.length === 0 && bundleErrors.length === 0) {
          return {
            valid: true,
            errors: [],
            dataset: null,
            figure: candidate,
            bundle: isBundle ? parsed as ExportBundle : undefined,
          };
        }
        return { valid: false, errors: [...errors, ...bundleErrors], dataset: null, figure: null };
      }
    } catch {
      // validateFile reports malformed JSON before this boundary is reached.
    }
  }

  let records: Record<string, any>[] = [];
  try {
    if (filename.toLowerCase().endsWith('.json')) {
      records = parseJSON(content);
    } else {
      records = parseCSV(content);
    }
  } catch (err: any) {
    return {
      valid: false,
      errors: [err.message || 'Failed to parse file'],
      dataset: null,
      figure: null,
    };
  }

  const datasetId = `dataset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const name = filename.replace(/\.[^/.]+$/, '');

  return {
    valid: records.length > 0,
      errors: records.length === 0 ? ['No valid records parsed from file'] : [],
      dataset: {
      id: datasetId,
      name,
      title: name,
      description: `Imported dataset from ${filename}`,
      citation: `User-provided file: ${filename}`,
        rows: records,
      },
      figure: null,
  };
}


export function validateCommandBoundary(
  commandType: string,
  payload: Record<string, any>,
  profile?: DatasetProfile | null
): { valid: boolean; errors: ValidationIssueBoundary[] } {
  const errors: ValidationIssueBoundary[] = [];

  if (commandType === 'PROPOSE_REVISION') {
    if (payload.basedOnRevision === undefined || payload.basedOnRevision === null) {
      errors.push({ path: 'basedOnRevision', message: 'basedOnRevision is required', severity: 'blocking' });
    }
    if (!payload.proposedSpec) {
      errors.push({ path: 'proposedSpec', message: 'proposedSpec object is required', severity: 'blocking' });
    } else {
      const spec = payload.proposedSpec as FigureSpec;
      if (!spec.mark) {
        errors.push({ path: 'proposedSpec.mark', message: 'Figure mark type is required', severity: 'blocking' });
      }
      if (!spec.encoding?.x?.field || !spec.encoding?.y?.field) {
        errors.push({ path: 'proposedSpec.encoding', message: 'X and Y channel field mappings are required', severity: 'blocking' });
      }
      if (profile) {
        const availableFields = new Set(profile.fields.map(f => f.name));
        if (spec.encoding?.x?.field && !availableFields.has(spec.encoding.x.field)) {
          errors.push({
            path: 'proposedSpec.encoding.x.field',
            message: `Field '${spec.encoding.x.field}' does not exist in dataset '${profile.datasetId}'`,
            severity: 'blocking'
          });
        }
        if (spec.encoding?.y?.field && !availableFields.has(spec.encoding.y.field)) {
          errors.push({
            path: 'proposedSpec.encoding.y.field',
            message: `Field '${spec.encoding.y.field}' does not exist in dataset '${profile.datasetId}'`,
            severity: 'blocking'
          });
        }
      }
    }
  }

  if (commandType === 'APPLY_REVISION') {
    if (!payload.previewId) {
      errors.push({ path: 'previewId', message: 'previewId string is required', severity: 'blocking' });
    }
    if (payload.basedOnRevision === undefined || payload.basedOnRevision < 0) {
      errors.push({ path: 'basedOnRevision', message: 'Non-negative basedOnRevision is required', severity: 'blocking' });
    }
    if (!payload.humanApprovalConfirmed) {
      errors.push({ path: 'humanApprovalConfirmed', message: 'humanApprovalConfirmed must be true', severity: 'blocking' });
    }
  }

  return {
    valid: errors.filter(e => e.severity === 'blocking').length === 0,
    errors
  };
}
