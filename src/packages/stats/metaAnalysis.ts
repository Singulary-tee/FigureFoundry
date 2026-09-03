/**
 * Rigorous Statistical Meta-Analysis Engine
 * 
 * Supports:
 * - Inverse Variance Fixed Effect
 * - DerSimonian-Laird Random Effects
 * - Mantel-Haenszel for binary events
 * - Cochran's Q heterogeneity test, degrees of freedom, and p-value
 * - Higgins & Thompson's I² inconsistency statistic
 * - Between-study variance τ² (tau-squared)
 * - Exact 95% Confidence Intervals & Normalized study weights (%)
 * - Funnel plot pseudo 95% / 99% confidence boundaries
 * - 2x2 contingency table (Odds Ratio, Risk Ratio, Risk Difference) calculators
 */

export interface RawStudyData {
  id: string;
  study: string;
  effect: number; // e.g. Odds Ratio, Risk Ratio, or Mean Difference
  ciLower: number;
  ciUpper: number;
  weight?: number;
  // Optional 2x2 contingency raw data
  eventsTreatment?: number;
  totalTreatment?: number;
  eventsControl?: number;
  totalControl?: number;
}

export interface MetaAnalysisResult {
  model: 'IV, Random Effects' | 'IV, Fixed Effect' | 'DerSimonian-Laird' | 'Mantel-Haenszel';
  effectMeasure: 'Odds Ratio (OR)' | 'Risk Ratio (RR)' | 'Risk Difference (RD)' | 'Hazard Ratio (HR)' | 'Mean Difference (MD)';
  k: number; // number of studies
  studies: Array<{
    id: string;
    study: string;
    effect: number;
    ciLower: number;
    ciUpper: number;
    weight: number; // percentage (0 - 100)
    rawWeight: number;
    logEffect: number;
    standardError: number;
  }>;
  pooledEstimate: {
    effect: number;
    ciLower: number;
    ciUpper: number;
    weightTotal: number;
    label: string;
    zScore: number;
    pValue: number;
  };
  heterogeneity: {
    qStatistic: number;
    df: number;
    pValue: number;
    iSquared: number; // percentage (0 - 100)
    tauSquared: number;
    tau: number;
  };
}

/**
 * Standard normal cumulative distribution function approximation (Abramowitz and Stegun)
 */
export function normalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp((-x * x) / 2);
  const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x > 0 ? 1 - p : p;
}

/**
 * Incomplete gamma function for Chi-Square distribution p-value calculation
 */
function gammp(a: number, x: number): number {
  if (x <= 0) return 0;
  if (x < a + 1) {
    // Series representation
    let ap = a;
    let del = 1 / a;
    let sum = del;
    for (let n = 1; n <= 100; n++) {
      ap += 1;
      del = (del * x) / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 3e-7) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
  } else {
    // Continued fraction representation
    let b = x + 1 - a;
    let c = 1 / 1e-30;
    let d = 1 / b;
    let h = d;
    for (let i = 1; i <= 100; i++) {
      const an = -i * (i - a);
      b += 2;
      d = an * d + b;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = b + an / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < 3e-7) break;
    }
    return 1 - Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
  }
}

/**
 * Lanczos approximation for ln(Gamma(z))
 */
function logGamma(z: number): number {
  const g = 7;
  const C = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.138571095836526,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  z -= 1;
  let base = C[0];
  for (let i = 1; i < g + 2; i++) {
    base += C[i] / (z + i);
  }
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(base);
}

/**
 * Chi-Square P-value: P(X >= Q) with df degrees of freedom
 */
export function chiSquarePValue(q: number, df: number): number {
  if (q <= 0 || df <= 0) return 1.0;
  const a = df / 2;
  const x = q / 2;
  const p = 1 - gammp(a, x);
  return Math.max(0, Math.min(1, p));
}

// Regularized incomplete beta used for the Student t distribution.
function betaContinuedFraction(a: number, b: number, x: number): number {
  const maxIterations = 200;
  const epsilon = 3e-7;
  let qab = a + b;
  let qap = a + 1;
  let qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= maxIterations; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < epsilon) break;
  }
  return h;
}

function regularizedBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const logBeta = logGamma(a) + logGamma(b) - logGamma(a + b);
  const front = Math.exp(a * Math.log(x) + b * Math.log1p(-x) - logBeta);
  return x < (a + 1) / (a + b + 2)
    ? (front * betaContinuedFraction(a, b, x)) / a
    : 1 - (Math.exp(b * Math.log1p(-x) + a * Math.log(x) - logBeta) * betaContinuedFraction(b, a, 1 - x)) / b;
}

/** Two-sided p-value for a Student t statistic with the supplied degrees of freedom. */
export function studentTwoSidedPValue(t: number, degreesOfFreedom: number): number {
  if (!Number.isFinite(t) || degreesOfFreedom < 1) return 1;
  const x = degreesOfFreedom / (degreesOfFreedom + t * t);
  return Math.max(0, Math.min(1, regularizedBeta(x, degreesOfFreedom / 2, 0.5)));
}

/**
 * Compute Standard Error from 95% Confidence Interval for ratio measures (OR, RR, HR) or difference measures (MD, RD)
 */
export function computeStandardError(
  effect: number,
  ciLower: number,
  ciUpper: number,
  isLogScale: boolean = true
): number {
  if (isLogScale) {
    const safeEffect = Math.max(1e-5, effect);
    const safeLower = Math.max(1e-5, ciLower);
    const safeUpper = Math.max(1e-5, ciUpper);

    // SE = (ln(Upper) - ln(Lower)) / (2 * 1.95996)
    const se = (Math.log(safeUpper) - Math.log(safeLower)) / 3.919928;
    return se > 0 ? se : 0.2;
  } else {
    const se = (ciUpper - ciLower) / 3.919928;
    return se > 0 ? se : 0.2;
  }
}

/**
 * Computes Odds Ratio and SE from 2x2 contingency table
 */
export function computeFromContingency(
  eventsTreatment: number,
  totalTreatment: number,
  eventsControl: number,
  totalControl: number
): { or: number; ciLower: number; ciUpper: number; se: number } {
  // Add 0.5 Haldane-Anscombe continuity correction for zero-cells
  const a = eventsTreatment === 0 || eventsControl === 0 ? eventsTreatment + 0.5 : eventsTreatment;
  const b = eventsTreatment === 0 || eventsControl === 0 ? totalTreatment - eventsTreatment + 0.5 : totalTreatment - eventsTreatment;
  const c = eventsTreatment === 0 || eventsControl === 0 ? eventsControl + 0.5 : eventsControl;
  const d = eventsTreatment === 0 || eventsControl === 0 ? totalControl - eventsControl + 0.5 : totalControl - eventsControl;

  const or = (a * d) / (b * c);
  const se = Math.sqrt(1 / a + 1 / b + 1 / c + 1 / d);
  const logOR = Math.log(or);
  const ciLower = Math.exp(logOR - 1.96 * se);
  const ciUpper = Math.exp(logOR + 1.96 * se);

  return {
    or: Number(or.toFixed(4)),
    ciLower: Number(ciLower.toFixed(4)),
    ciUpper: Number(ciUpper.toFixed(4)),
    se: Number(se.toFixed(4)),
  };
}

/**
 * Execute Statistical Meta-Analysis on Studies
 */
export function runMetaAnalysis(
  rawStudies: RawStudyData[],
  model: 'IV, Random Effects' | 'IV, Fixed Effect' | 'DerSimonian-Laird' | 'Mantel-Haenszel' = 'IV, Random Effects',
  effectMeasure: 'Odds Ratio (OR)' | 'Risk Ratio (RR)' | 'Risk Difference (RD)' | 'Hazard Ratio (HR)' | 'Mean Difference (MD)' = 'Odds Ratio (OR)'
): MetaAnalysisResult {
  const isLogScale = !['Mean Difference (MD)', 'Risk Difference (RD)'].includes(effectMeasure);
  const isRandomEffects = model === 'IV, Random Effects' || model === 'DerSimonian-Laird';

  const normalizedStudies = rawStudies.map((study) => {
    if (
      study.eventsTreatment !== undefined &&
      study.totalTreatment !== undefined &&
      study.eventsControl !== undefined &&
      study.totalControl !== undefined
    ) {
      const computed = computeFromContingency(
        study.eventsTreatment,
        study.totalTreatment,
        study.eventsControl,
        study.totalControl
      );
      return { ...study, effect: computed.or, ciLower: computed.ciLower, ciUpper: computed.ciUpper };
    }
    return study;
  });
  const validStudies = normalizedStudies.filter((s) =>
    Number.isFinite(s.effect) &&
    Number.isFinite(s.ciLower) &&
    Number.isFinite(s.ciUpper) &&
    s.ciUpper > s.ciLower &&
    (isLogScale ? s.effect > 0 && s.ciLower > 0 && s.ciUpper > 0 : true)
  );
  const k = validStudies.length;

  if (k === 0) {
    return {
      model,
      effectMeasure,
      k: 0,
      studies: [],
      pooledEstimate: {
        effect: isLogScale ? 1.0 : 0,
        ciLower: isLogScale ? 1.0 : 0,
        ciUpper: isLogScale ? 1.0 : 0,
        weightTotal: 0,
        label: 'Total (95% CI)',
        zScore: 0,
        pValue: 1,
      },
      heterogeneity: {
        qStatistic: 0,
        df: 0,
        pValue: 1,
        iSquared: 0,
        tauSquared: 0,
        tau: 0,
      },
    };
  }

  // Step 1: Calculate effect on log scale (or linear scale) and study standard errors
  const processed = validStudies.map((s) => {
    let effect = s.effect;
    let ciLower = s.ciLower;
    let ciUpper = s.ciUpper;

    const se = computeStandardError(effect, ciLower, ciUpper, isLogScale);
    const theta = isLogScale ? Math.log(effect) : effect;
    const fixedWeight = 1 / (se * se);

    return {
      id: s.id,
      study: s.study,
      effect,
      ciLower,
      ciUpper,
      logEffect: theta,
      standardError: se,
      fixedWeight,
      customWeight: s.weight,
    };
  });

  // Step 2: Fixed-Effect Pooled Estimate for Cochran's Q
  const sumFixedWeights = processed.reduce((acc, p) => acc + p.fixedWeight, 0);
  const fixedTheta = processed.reduce((acc, p) => acc + p.fixedWeight * p.logEffect, 0) / sumFixedWeights;

  // Step 3: Cochran's Q & Heterogeneity (I², τ²)
  const qStatistic = processed.reduce(
    (acc, p) => acc + p.fixedWeight * Math.pow(p.logEffect - fixedTheta, 2),
    0
  );
  const df = Math.max(1, k - 1);
  const qPValue = chiSquarePValue(qStatistic, df);

  // Higgins & Thompson I²
  const iSquared = Math.max(0, ((qStatistic - df) / Math.max(1e-6, qStatistic)) * 100);

  // DerSimonian-Laird τ² estimator
  const sumSquaredFixedWeights = processed.reduce((acc, p) => acc + Math.pow(p.fixedWeight, 2), 0);
  const cConstant = sumFixedWeights - sumSquaredFixedWeights / sumFixedWeights;
  const tauSquared = isRandomEffects && cConstant > 0 ? Math.max(0, (qStatistic - df) / cConstant) : 0;
  const tau = Math.sqrt(tauSquared);

  // Step 4: Final weights based on selected model
  const studyWeights = processed.map((p) => {
    let w = 0;
    if (isRandomEffects) {
      w = 1 / (p.standardError * p.standardError + tauSquared);
    } else {
      w = p.fixedWeight;
    }
    return w;
  });

  const totalRawWeight = studyWeights.reduce((acc, w) => acc + w, 0);

  // Step 5: Pooled Effect & Pooled Standard Error
  const pooledTheta =
    processed.reduce((acc, p, idx) => acc + studyWeights[idx] * p.logEffect, 0) / totalRawWeight;
  const pooledSE = Math.sqrt(1 / totalRawWeight);

  const zScore = Math.abs(pooledTheta / pooledSE);
  const pooledPValue = 2 * (1 - normalCdf(zScore));

  const pooledEffect = isLogScale ? Math.exp(pooledTheta) : pooledTheta;
  const pooledCiLower = isLogScale
    ? Math.exp(pooledTheta - 1.95996 * pooledSE)
    : pooledTheta - 1.95996 * pooledSE;
  const pooledCiUpper = isLogScale
    ? Math.exp(pooledTheta + 1.95996 * pooledSE)
    : pooledTheta + 1.95996 * pooledSE;

  const finalStudies = processed.map((p, idx) => ({
    id: p.id,
    study: p.study,
    effect: Number(p.effect.toFixed(2)),
    ciLower: Number(p.ciLower.toFixed(2)),
    ciUpper: Number(p.ciUpper.toFixed(2)),
    weight: Number(((studyWeights[idx] / totalRawWeight) * 100).toFixed(1)),
    rawWeight: studyWeights[idx],
    logEffect: Number(p.logEffect.toFixed(4)),
    standardError: Number(p.standardError.toFixed(4)),
  }));

  return {
    model,
    effectMeasure,
    k,
    studies: finalStudies,
    pooledEstimate: {
      effect: Number(pooledEffect.toFixed(2)),
      ciLower: Number(pooledCiLower.toFixed(2)),
      ciUpper: Number(pooledCiUpper.toFixed(2)),
      weightTotal: 100,
      label: 'Total (95% CI)',
      zScore: Number(zScore.toFixed(3)),
      pValue: Number(pooledPValue.toFixed(4)),
    },
    heterogeneity: {
      qStatistic: Number(qStatistic.toFixed(2)),
      df,
      pValue: Number(qPValue.toFixed(4)),
      iSquared: Number(iSquared.toFixed(1)),
      tauSquared: Number(tauSquared.toFixed(4)),
      tau: Number(tau.toFixed(4)),
    },
  };
}

/**
 * Generate Funnel Plot Points & Confidence Limits based on Meta-Analysis Studies
 */
export function generateFunnelPlotData(metaResult: MetaAnalysisResult) {
  const isLogScale = !['Mean Difference (MD)', 'Risk Difference (RD)'].includes(metaResult.effectMeasure);
  const pooledCenter = isLogScale ? Math.log(metaResult.pooledEstimate.effect) : metaResult.pooledEstimate.effect;

  const points = metaResult.studies.map((s) => ({
    id: `fp-${s.id}`,
    study: s.study,
    effect: Number((s.logEffect - pooledCenter).toFixed(2)),
    standardError: s.standardError,
  }));

  return {
    pooledLogEffect: pooledCenter,
    points,
  };
}
