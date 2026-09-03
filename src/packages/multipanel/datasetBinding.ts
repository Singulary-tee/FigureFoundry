import { DatasetProfile, FigureSpec } from '../../types';
import { PanelSpec, SubgroupSpec } from '../../types/multipanel';
import { runMetaAnalysis } from '../stats/metaAnalysis';

type BindingDefinition = { key: string; label: string; type: 'quantitative' | 'categorical' | 'any'; optional?: boolean };

const BINDINGS: Record<Exclude<PanelSpec['kind'], 'text-caption'>, BindingDefinition[]> = {
  'single-chart': [
    { key: 'x', label: 'X axis', type: 'any' },
    { key: 'y', label: 'Y axis', type: 'quantitative' },
    { key: 'color', label: 'Color', type: 'categorical', optional: true },
    { key: 'shape', label: 'Shape', type: 'categorical', optional: true },
  ],
  'volcano-plot': [
    { key: 'x', label: 'Effect / fold change', type: 'quantitative' },
    { key: 'y', label: 'Significance', type: 'quantitative' },
    { key: 'color', label: 'Color (optional)', type: 'categorical', optional: true },
  ],
  heatmap: [
    { key: 'x', label: 'Column', type: 'any' },
    { key: 'y', label: 'Row', type: 'any' },
    { key: 'color', label: 'Value / color', type: 'quantitative' },
  ],
  'forest-plot': [
    { key: 'study', label: 'Study label', type: 'categorical' },
    { key: 'effect', label: 'Effect estimate', type: 'quantitative' },
    { key: 'ciLower', label: 'CI lower bound', type: 'quantitative' },
    { key: 'ciUpper', label: 'CI upper bound', type: 'quantitative' },
    { key: 'weight', label: 'Weight (optional)', type: 'quantitative', optional: true },
  ],
  'funnel-plot': [
    { key: 'study', label: 'Study label', type: 'categorical' },
    { key: 'effect', label: 'Effect estimate', type: 'quantitative' },
    { key: 'standardError', label: 'Standard error', type: 'quantitative' },
  ],
  'grouped-bar': [
    { key: 'category', label: 'Category', type: 'categorical' },
    { key: 'treatmentVal', label: 'Treatment value', type: 'quantitative' },
    { key: 'controlVal', label: 'Control value', type: 'quantitative' },
  ],
  'subgroup-analysis': [
    { key: 'groupName', label: 'Subgroup label', type: 'categorical' },
    { key: 'effect', label: 'Effect estimate', type: 'quantitative' },
    { key: 'ciLower', label: 'CI lower bound', type: 'quantitative' },
    { key: 'ciUpper', label: 'CI upper bound', type: 'quantitative' },
    { key: 'iSquared', label: 'I² (optional)', type: 'quantitative', optional: true },
  ],
};

export function isDatasetBoundPanel(spec: PanelSpec): spec is Exclude<PanelSpec, { kind: 'text-caption' }> {
  return spec.kind !== 'text-caption';
}

export function getPanelBindingDefinitions(spec: PanelSpec): BindingDefinition[] {
  return spec.kind === 'text-caption' ? [] : BINDINGS[spec.kind];
}

function defaultField(
  profile: DatasetProfile,
  definition: BindingDefinition,
  usedFields: Set<string>,
  allowPositionalFallback: boolean,
): string {
  const matching = profile.fields.filter((field) => definition.type === 'any' || isCompatible(definition.type, field.type));
  const semanticTokens: Record<string, string[]> = {
    study: ['study', 'label', 'name'],
    category: ['category', 'group'],
    groupName: ['subgroup', 'group', 'stratum', 'category'],
    effect: ['effect', 'estimate', 'oddsratio', 'riskratio', 'hazardratio', 'foldchange'],
    ciLower: ['cilower', 'lower', 'lcl', 'low'],
    ciUpper: ['ciupper', 'upper', 'ucl', 'high'],
    standardError: ['standarderror', 'stderr', 'se'],
    y: ['pvalue', 'pval', 'padj', 'fdr', 'significance', 'neglog10p'],
    color: ['significance', 'pvalue', 'padj', 'fdr'],
    weight: ['weight', 'weights'],
    treatmentVal: ['treatment', 'intervention', 'experimental'],
    controlVal: ['control', 'comparator', 'comparison'],
  };
  const tokens = semanticTokens[definition.key] || [];
  const semanticMatch = matching.find((field) => {
    const normalizedName = field.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return !usedFields.has(field.name) && tokens.some((token) => normalizedName.includes(token));
  });
  if (semanticMatch) return semanticMatch.name;
  if (definition.optional || !allowPositionalFallback) return '';
  return matching.find((field) => !usedFields.has(field.name))?.name || matching[0]?.name || '';
}

function isCompatible(type: BindingDefinition['type'], fieldType?: string): boolean {
  return type === 'any' || fieldType === type || (type === 'categorical' && fieldType === 'ordinal');
}

function numeric(value: unknown): number | null {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasUsableValue(value: unknown, type: BindingDefinition['type']): boolean {
  if (type === 'quantitative') return numeric(value) !== null;
  return value !== null && value !== undefined && String(value).trim() !== '';
}

/** Materialize a panel's editable analysis rows from its explicitly selected dataset fields. */
export function bindPanelToDataset(
  spec: PanelSpec,
  datasetId: string,
  profile: DatasetProfile,
  requestedMapping: Record<string, string> = {},
): PanelSpec {
  if (!isDatasetBoundPanel(spec)) return spec;

  const definitions = getPanelBindingDefinitions(spec);
  const allowPositionalFallback = spec.kind === 'single-chart';
  const currentMapping = { ...(spec.fieldMapping || {}), ...requestedMapping };
  const fieldMapping = definitions.reduce<Record<string, string>>((mapping, definition) => {
    const existing = currentMapping[definition.key];
    mapping[definition.key] = definition.optional && existing === ''
      ? ''
      : profile.fields.some((field) => field.name === existing && isCompatible(definition.type, field.type))
      ? existing
      : defaultField(profile, definition, new Set(Object.values(mapping).filter(Boolean)), allowPositionalFallback);
    return mapping;
  }, {});
  const bindingIssues = definitions
    .filter((definition) => !definition.optional && !fieldMapping[definition.key])
    .map((definition) => `${definition.label} requires a compatible ${definition.type} field.`);
  const semanticIssues = spec.kind === 'volcano-plot' && !spec.significanceMetric
    ? ['Select the significance field format: p-value, adjusted p-value, or -log10(p).']
    : [];
  const withBinding = { ...spec, datasetId, fieldMapping, bindingIssues: [...bindingIssues, ...semanticIssues], bindingWarnings: [] } as any;

  if (spec.kind === 'single-chart' || spec.kind === 'volcano-plot' || spec.kind === 'heatmap') {
    const chart = spec.spec as FigureSpec;
    const encoding = { ...(chart.encoding || {}) } as any;
    const chartIssues = [...withBinding.bindingIssues];
    const chartWarnings: string[] = [];
    for (const definition of definitions) {
      if (!fieldMapping[definition.key]) {
        delete encoding[definition.key];
        continue;
      }
      const sourceField = profile.fields.find((field) => field.name === fieldMapping[definition.key]);
      encoding[definition.key] = {
        ...(encoding[definition.key] || {}),
        field: fieldMapping[definition.key],
        type: sourceField?.type || definition.type,
      };
    }

    if (chartIssues.length === 0) {
      const requiredDefinitions = definitions.filter((definition) => !definition.optional);
      const usableRows = profile.records.filter((record) => requiredDefinitions.every((definition) =>
        hasUsableValue(record[fieldMapping[definition.key]], definition.type),
      ));
      if (profile.records.length === 0) {
        chartIssues.push('The selected dataset contains no rows to render.');
      } else if (usableRows.length === 0) {
        chartIssues.push('No rows contain usable values for the selected field mapping.');
      } else if (usableRows.length < profile.records.length) {
        const omitted = profile.records.length - usableRows.length;
        chartWarnings.push(`${omitted} row${omitted === 1 ? '' : 's'} omitted because a required mapped value was invalid or missing.`);
      }
    }
    if (spec.kind === 'volcano-plot' && fieldMapping.y && spec.significanceMetric) {
      const values = profile.records.map((record) => numeric(record[fieldMapping.y]));
      const validSignificance = values.filter((value) => value !== null && (spec.significanceMetric === 'neg-log10-p'
        ? value >= 0
        : value > 0 && value <= 1));
      if (values.length > 0 && validSignificance.length === 0) {
        chartIssues.push(spec.significanceMetric === 'neg-log10-p'
          ? 'The mapped significance field must contain finite non-negative -log10(p) values.'
          : 'The mapped significance field must contain p-values in the open interval (0, 1].');
      } else if (validSignificance.length < values.length) {
        const omitted = values.length - validSignificance.length;
        chartWarnings.push(`${omitted} row${omitted === 1 ? '' : 's'} omitted because the mapped significance value was invalid.`);
      }
    }
    return {
      ...withBinding,
      bindingIssues: chartIssues,
      bindingWarnings: chartWarnings,
      spec: { ...chart, encoding },
    } as PanelSpec;
  }

  if (spec.kind === 'forest-plot') {
    const requiresPositiveValues = !['Mean Difference (MD)', 'Risk Difference (RD)'].includes(spec.effectMeasure);
    const studies = bindingIssues.length > 0 ? [] : profile.records.flatMap((row, index) => {
      const effect = numeric(row[fieldMapping.effect]);
      const ciLower = numeric(row[fieldMapping.ciLower]);
      const ciUpper = numeric(row[fieldMapping.ciUpper]);
      if (
        effect === null ||
        ciLower === null ||
        ciUpper === null ||
        (requiresPositiveValues && (effect <= 0 || ciLower <= 0)) ||
        ciLower > effect ||
        ciUpper < effect
      ) return [];
      return [{
        id: `dataset-${index}`,
        study: String(row[fieldMapping.study] ?? `Study ${index + 1}`),
        effect,
        ciLower,
        ciUpper,
        weight: numeric(row[fieldMapping.weight]) ?? Number.NaN,
      }];
    });
    const omittedRowCount = bindingIssues.length > 0 ? 0 : profile.records.length - studies.length;
    const warnings = omittedRowCount > 0
      ? [`${omittedRowCount} row${omittedRowCount === 1 ? '' : 's'} omitted because the mapped estimate and confidence interval values were not finite and ordered.`]
      : [];
    const issues = studies.length === 0 && profile.records.length > 0 && bindingIssues.length === 0
      ? [`No rows contain a finite, ${requiresPositiveValues ? 'positive ' : ''}effect estimate with an ordered confidence interval.`]
      : bindingIssues;
    const hasValidConfidenceIntervals = studies.length > 0 && studies.every((study) =>
      (!requiresPositiveValues || (study.effect > 0 && study.ciLower > 0)) &&
      study.ciUpper > study.ciLower && study.ciUpper >= study.effect && study.effect >= study.ciLower,
    );
    let meta = null;
    if (hasValidConfidenceIntervals) {
      try {
        meta = runMetaAnalysis(studies, spec.model, spec.effectMeasure);
      } catch {
        // Unsupported model/effect combinations remain visibly unavailable.
      }
    }
    return {
      ...withBinding,
      bindingIssues: issues,
      bindingWarnings: warnings,
      studies: meta ? meta.studies.map(({ rawWeight: _rawWeight, logEffect: _logEffect, standardError: _standardError, ...study }) => study) : studies,
      pooledEstimate: meta ? meta.pooledEstimate : spec.pooledEstimate,
    } as PanelSpec;
  }
  if (spec.kind === 'funnel-plot') {
    const requiresPositiveEffects = spec.xAxis.scale === 'log';
    const points = bindingIssues.length > 0 ? [] : profile.records.flatMap((row, index) => {
      const effect = numeric(row[fieldMapping.effect]);
      const standardError = numeric(row[fieldMapping.standardError]);
      if (effect === null || standardError === null || standardError <= 0 || (requiresPositiveEffects && effect <= 0)) return [];
      return [{
        id: `dataset-${index}`,
        study: String(row[fieldMapping.study] ?? `Study ${index + 1}`),
        effect,
        standardError,
      }];
    });
    const omittedRowCount = bindingIssues.length > 0 ? 0 : profile.records.length - points.length;
    return {
      ...withBinding,
      bindingIssues: points.length === 0 && profile.records.length > 0 && bindingIssues.length === 0
        ? ['No rows contain finite effect and positive standard-error values.']
        : bindingIssues,
      bindingWarnings: omittedRowCount > 0
        ? [`${omittedRowCount} row${omittedRowCount === 1 ? '' : 's'} omitted because the mapped effect or standard error was invalid.`]
        : [],
      points,
    } as PanelSpec;
  }
  if (spec.kind === 'grouped-bar') {
    const groups = bindingIssues.length > 0 ? [] : profile.records.flatMap((row, index) => {
      const treatmentVal = numeric(row[fieldMapping.treatmentVal]);
      const controlVal = numeric(row[fieldMapping.controlVal]);
      if (treatmentVal === null || controlVal === null) return [];
      return [{
        id: `dataset-${index}`,
        category: String(row[fieldMapping.category] ?? `Category ${index + 1}`),
        treatmentVal,
        controlVal,
      }];
    });
    const omittedRowCount = bindingIssues.length > 0 ? 0 : profile.records.length - groups.length;
    return {
      ...withBinding,
      bindingIssues: groups.length === 0 && profile.records.length > 0 && bindingIssues.length === 0
        ? ['No rows contain finite values for both grouped-bar measures.']
        : bindingIssues,
      bindingWarnings: omittedRowCount > 0
        ? [`${omittedRowCount} row${omittedRowCount === 1 ? '' : 's'} omitted because a grouped-bar measure was invalid.`]
        : [],
      groups,
    } as PanelSpec;
  }
  const requiresPositiveValues = (spec as SubgroupSpec).xAxis.scale === 'log';
  const subgroups = bindingIssues.length > 0 ? [] : profile.records.flatMap((row, index) => {
    const effect = numeric(row[fieldMapping.effect]);
    const ciLower = numeric(row[fieldMapping.ciLower]);
    const ciUpper = numeric(row[fieldMapping.ciUpper]);
    if (
      effect === null ||
      ciLower === null ||
      ciUpper === null ||
      (requiresPositiveValues && (effect <= 0 || ciLower <= 0)) ||
      ciLower > effect ||
      ciUpper < effect
    ) return [];
    return [{
      id: `dataset-${index}`,
      groupName: String(row[fieldMapping.groupName] ?? `Subgroup ${index + 1}`),
      effect,
      ciLower,
      ciUpper,
      iSquared: numeric(row[fieldMapping.iSquared]) ?? Number.NaN,
    }];
  });
  const omittedRowCount = bindingIssues.length > 0 ? 0 : profile.records.length - subgroups.length;
  return {
    ...withBinding,
    bindingIssues: subgroups.length === 0 && profile.records.length > 0 && bindingIssues.length === 0
      ? [`No rows contain a finite, ${requiresPositiveValues ? 'positive ' : ''}effect with an ordered confidence interval.`]
      : bindingIssues,
    bindingWarnings: omittedRowCount > 0
      ? [`${omittedRowCount} row${omittedRowCount === 1 ? '' : 's'} omitted because a subgroup estimate or confidence interval was invalid.`]
      : [],
    subgroups,
  } as PanelSpec;
}
