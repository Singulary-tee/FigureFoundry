import { FigureSpec, DatasetProfile, ValidationReport, ValidationIssue } from '../../types';

export function validateFigureSpec(spec: FigureSpec, profile: DatasetProfile): ValidationReport {
  const issues: ValidationIssue[] = [];
  const fieldMap = new Map(profile.fields.map(f => [f.name, f]));

  const channels = [
    { name: 'x', mapping: spec.encoding.x },
    { name: 'y', mapping: spec.encoding.y },
    { name: 'color', mapping: spec.encoding.color },
    { name: 'shape', mapping: spec.encoding.shape },
    { name: 'size', mapping: spec.encoding.size }
  ];

  for (const ch of channels) {
    if (!ch.mapping) continue;
    const fieldName = ch.mapping.field;
    if (!fieldName) {
      issues.push({
        ruleId: 'RULE-FIELD-EXIST',
        severity: 'blocking',
        path: `encoding.${ch.name}.field`,
        message: `Channel '${ch.name}' must specify a non-empty field name.`,
        rationale: 'Vega-Lite requires valid dataset column references.'
      });
      continue;
    }

    const fieldMeta = fieldMap.get(fieldName);
    if (!fieldMeta) {
      const available = profile.fields.map(f => f.name).join(', ');
      issues.push({
        ruleId: 'RULE-FIELD-EXIST',
        severity: 'blocking',
        path: `encoding.${ch.name}.field`,
        message: `Field '${fieldName}' does not exist in dataset '${profile.datasetId}'. Available fields: [${available}]`,
        rationale: 'Unrecognized column names cause runtime rendering failure.'
      });
    } else {
      
      if (ch.mapping.type === 'quantitative' && fieldMeta.type === 'categorical') {
        issues.push({
          ruleId: 'RULE-TYPE-MISMATCH',
          severity: 'warning',
          path: `encoding.${ch.name}.type`,
          message: `Field '${fieldName}' is categorical in dataset metadata, but encoded as quantitative.`,
          rationale: 'Mapping nominal strings to continuous quantitative scales can corrupt axis ticks.'
        });
      }
    }
  }

  if (spec.mark === 'bar') {
    if (spec.encoding.y && spec.encoding.y.scaleType !== 'log' && spec.encoding.y.zero === false) {
      issues.push({
        ruleId: 'RULE-BAR-ZERO-BASELINE',
        severity: 'blocking',
        path: 'encoding.y.zero',
        message: "Bar charts must always include zero in the baseline scale. Truncating bar chart origin distorts visual length perception.",
        rationale: 'GraphPad Prism / Nature guidelines: Bar lengths visually encode quantities relative to zero. Non-zero baselines create misleading ratios.'
      });
    }
  }

  if (spec.figureIntent === 'comparison' && spec.mark === 'bar' && (!spec.errorBarMode || spec.errorBarMode === 'none')) {
    issues.push({
      ruleId: 'RULE-MISSING-ERRORBARS',
      severity: 'warning',
      path: 'errorBarMode',
      message: "Group comparisons with bar charts should display error bars (SD, SEM, or 95% CI) to convey statistical uncertainty.",
      rationale: 'Nature / Science publication standard: Plotting group means without error bars obscures variance and statistical significance.'
    });
  }
  if (spec.figureIntent === 'distribution') {
    if (!spec.showsRawObservations) {
      issues.push({
        ruleId: 'RULE-DIST-RAW',
        severity: 'blocking',
        path: 'showsRawObservations',
        message: "When figureIntent is 'distribution', raw observations (jittered points/strip/beeswarm) must be visible alongside summary statistics.",
        rationale: 'Midway scientific visualization guidelines: Summary statistics alone (mean/bars) conceal bimodal clusters, skewness, and sample sparsity.'
      });
    }

    if (spec.mark === 'bar') {
      issues.push({
        ruleId: 'RULE-BAR-DYNAMITE',
        severity: 'warning',
        path: 'mark',
        message: "Using bar charts for distributions ('dynamite plot') conveys false zero baselines and conceals sample distribution shape.",
        rationale: 'Prefer boxplots, violin plots, or jittered point clouds over plain bar charts.'
      });
    }
  }

  for (const ch of channels) {
    if (!ch.mapping) continue;
    if (ch.mapping.scaleType === 'log') {
      const fieldMeta = fieldMap.get(ch.mapping.field);
      if (fieldMeta && fieldMeta.min !== undefined && fieldMeta.min <= 0) {
        issues.push({
          ruleId: 'RULE-LOG-NONPOS',
          severity: 'blocking',
          path: `encoding.${ch.name}.scaleType`,
          message: `Logarithmic scale requested on channel '${ch.name}' for field '${ch.mapping.field}', but minimum value is ${fieldMeta.min} (<= 0).`,
          rationale: 'Logarithms of zero or negative numbers are mathematically undefined and cause point omission.'
        });
      }
    }
  }

  if (spec.encoding.color) {
    const colorField = fieldMap.get(spec.encoding.color.field);
    if (colorField && colorField.type === 'categorical' && colorField.cardinality && colorField.cardinality > 12) {
      issues.push({
        ruleId: 'RULE-COLOR-CARD',
        severity: 'warning',
        path: 'encoding.color.field',
        message: `Color channel maps categorical field '${colorField.name}' with cardinality ${colorField.cardinality} (> 12).`,
        rationale: 'Human visual perception cannot reliably discriminate more than 10-12 discrete hues in a single view without perceptual confusion.'
      });
    }
  }

  if (spec.encoding.shape) {
    const shapeField = fieldMap.get(spec.encoding.shape.field);
    if (shapeField && shapeField.type === 'categorical' && shapeField.cardinality && shapeField.cardinality > 6) {
      issues.push({
        ruleId: 'RULE-COLOR-CARD',
        severity: 'warning',
        path: 'encoding.shape.field',
        message: `Shape channel maps field '${shapeField.name}' with ${shapeField.cardinality} distinct categories (> 6 recommended).`,
        rationale: 'More than 6 distinct geometric shapes in scatter plots lead to high visual clutter.'
      });
    }
  }

  const hasBlocking = issues.some(i => i.severity === 'blocking');

  return {
    valid: !hasBlocking,
    issues
  };
}

export function validateFile(content: string, filename: string): { valid: boolean; errors: string[] } {
  if (!content || !content.trim()) {
    return { valid: false, errors: ['File content is empty.'] };
  }
  if (filename.toLowerCase().endsWith('.json')) {
    try {
      JSON.parse(content);
    } catch (e: any) {
      return { valid: false, errors: ['Invalid JSON syntax: ' + e.message] };
    }
  }
  return { valid: true, errors: [] };
}

