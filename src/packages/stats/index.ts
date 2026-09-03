import { studentTwoSidedPValue } from './metaAnalysis';

export interface ColumnStats {
  fieldName: string;
  count: number;
  mean: number;
  median: number;
  stdDev: number;
  sem: number;
  ci95Lower: number;
  ci95Upper: number;
  min: number;
  max: number;
  skewness: number;
  isNormal: boolean;
  outlierCount: number;
}
export interface GroupStats {
  groupName: string;
  count: number;
  mean: number;
  median: number;
  stdDev: number;
  sem: number;
  ci95Lower: number;
  ci95Upper: number;
  values: number[];
}

export interface StatisticalTestResult {
  testName: string;
  statisticName: string;
  statisticValue: number;
  degreesOfFreedom?: number;
  pValue: number;
  significanceStars: string; // '****' | '***' | '**' | '*' | 'ns'
  groupStats: GroupStats[];
  summary: string;
  recommendedAnnotation: {
    group1: string;
    group2: string;
    pValue: number;
    stars: string;
  };
}

export interface FrequencyResult {
  value: string;
  count: number;
  proportion: number;
}

export interface LinearRegressionResult {
  slope: number;
  intercept: number;
  r: number;
  r2: number;
  pValue: number;
  stars: string;
  n: number;
  summary: string;
}

/** Treat blank and null cells as missing rather than numeric zero. */
export function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function calculateColumnStats(values: number[], fieldName: string): ColumnStats {
  const validValues = values.filter(v => Number.isFinite(v));
  const n = validValues.length;

  if (n === 0) {
    return {
      fieldName,
      count: 0,
      mean: Number.NaN,
      median: Number.NaN,
      stdDev: Number.NaN,
      sem: Number.NaN,
      ci95Lower: Number.NaN,
      ci95Upper: Number.NaN,
      min: Number.NaN,
      max: Number.NaN,
      skewness: Number.NaN,
      isNormal: false,
      outlierCount: 0
    };
  }

  const sorted = [...validValues].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;

  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];

  const variance = n > 1
    ? sorted.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (n - 1)
    : Number.NaN;
  const stdDev = Math.sqrt(variance);
  const sem = stdDev / Math.sqrt(n);
  const ci95Margin = 1.96 * sem;

  // Skewness calculation
  const m3 = sorted.reduce((acc, v) => acc + Math.pow(v - mean, 3), 0) / n;
  const m2 = variance;
  const skewness = m2 > 0 ? m3 / Math.pow(m2, 1.5) : Number.NaN;
  const isNormal = Number.isFinite(skewness) && Math.abs(skewness) < 0.8;

  // Outliers via 1.5 * IQR
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  const outlierCount = sorted.filter(v => v < lowerBound || v > upperBound).length;

  return {
    fieldName,
    count: n,
    mean: Number(mean.toFixed(4)),
    median: Number(median.toFixed(4)),
    stdDev: Number(stdDev.toFixed(4)),
    sem: Number(sem.toFixed(4)),
    ci95Lower: Number((mean - ci95Margin).toFixed(4)),
    ci95Upper: Number((mean + ci95Margin).toFixed(4)),
    min: sorted[0],
    max: sorted[n - 1],
    skewness: Number(skewness.toFixed(4)),
    isNormal,
    outlierCount
  };
}

export function summarizeNumericFields(records: Record<string, unknown>[], fields: string[]): ColumnStats[] {
  return fields.map((field) => calculateColumnStats(
    records.map((record) => toFiniteNumber(record[field])).filter((value): value is number => value !== null),
    field,
  ));
}

export function calculateFrequencyDistribution(
  records: Record<string, unknown>[],
  field: string,
  maxCategories = 50,
): { field: string; observedCount: number; missingCount: number; categories: FrequencyResult[] } {
  const counts = new Map<string, number>();
  let missingCount = 0;
  records.forEach((record) => {
    const value = record[field];
    if (value === null || value === undefined || value === '') {
      missingCount += 1;
      return;
    }
    const key = String(value);
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  const observedCount = records.length - missingCount;
  return {
    field,
    observedCount,
    missingCount,
    categories: Array.from(counts, ([value, count]) => ({
      value,
      count,
      proportion: observedCount ? Number((count / observedCount).toFixed(4)) : 0,
    })).sort((left, right) => right.count - left.count || left.value.localeCompare(right.value)).slice(0, maxCategories),
  };
}

export function formatSignificanceStars(pValue: number): string {
  if (!Number.isFinite(pValue)) return 'unavailable';
  if (pValue < 0.0001) return '****';
  if (pValue < 0.001) return '***';
  if (pValue < 0.01) return '**';
  if (pValue < 0.05) return '*';
  return 'ns';
}

export function runTwoGroupTtest(
  records: Record<string, any>[],
  valueField: string,
  groupField: string,
  group1Val?: string,
  group2Val?: string
): StatisticalTestResult {
  const groupsMap = new Map<string, number[]>();

  for (const r of records) {
    const rawGroup = r[groupField];
    const val = toFiniteNumber(r[valueField]);
    if (rawGroup !== null && rawGroup !== undefined && String(rawGroup).trim() && val !== null) {
      const grp = String(rawGroup);
      if (!groupsMap.has(grp)) groupsMap.set(grp, []);
      groupsMap.get(grp)!.push(val);
    }
  }

  const keys = Array.from(groupsMap.keys());
  if (keys.length < 2) {
    throw new Error(`At least two groups with finite observations are required; found ${keys.length}.`);
  }

  const requestedGroup1 = group1Val === undefined ? undefined : String(group1Val);
  const requestedGroup2 = group2Val === undefined ? undefined : String(group2Val);
  if (requestedGroup1 !== undefined && !groupsMap.has(requestedGroup1)) {
    throw new Error(`Requested group '${requestedGroup1}' was not found in ${groupField}.`);
  }
  if (requestedGroup2 !== undefined && !groupsMap.has(requestedGroup2)) {
    throw new Error(`Requested group '${requestedGroup2}' was not found in ${groupField}.`);
  }

  const g1Key = requestedGroup1 || keys[0];
  const g2Key = requestedGroup2 || keys.find((key) => key !== g1Key) || keys[1];
  if (g1Key === g2Key) {
    throw new Error('The two comparison groups must be different.');
  }

  const g1Vals = groupsMap.get(g1Key) || [];
  const g2Vals = groupsMap.get(g2Key) || [];

  const s1 = calculateColumnStats(g1Vals, g1Key);
  const s2 = calculateColumnStats(g2Vals, g2Key);

  const n1 = s1.count;
  const n2 = s2.count;

  if (n1 < 2 || n2 < 2) {
    return {
      testName: "Welch's Two-Sample t-test",
      statisticName: 't',
      statisticValue: Number.NaN,
      degreesOfFreedom: Math.max(0, n1 + n2 - 2),
      pValue: Number.NaN,
      significanceStars: 'unavailable',
      groupStats: [
        { groupName: g1Key, values: g1Vals, ...s1 },
        { groupName: g2Key, values: g2Vals, ...s2 }
      ],
      summary: `Insufficient sample size to compute t-test (${g1Key}: n=${n1}, ${g2Key}: n=${n2}).`,
      recommendedAnnotation: {
        group1: g1Key,
        group2: g2Key,
        pValue: Number.NaN,
        stars: 'unavailable'
      }
    };
  }

  // Welch's t-test calculation
  const v1 = Math.pow(s1.stdDev, 2) / n1;
  const v2 = Math.pow(s2.stdDev, 2) / n2;
  const seDiff = Math.sqrt(v1 + v2);
  if (!(seDiff > 0)) {
    return {
      testName: "Welch's Two-Sample t-test",
      statisticName: 't',
      statisticValue: Number.NaN,
      degreesOfFreedom: 0,
      pValue: Number.NaN,
      significanceStars: 'unavailable',
      groupStats: [
        { groupName: g1Key, values: g1Vals, ...s1 },
        { groupName: g2Key, values: g2Vals, ...s2 }
      ],
      summary: `Insufficient variation to compute t-test (${g1Key}: n=${n1}, ${g2Key}: n=${n2}).`,
      recommendedAnnotation: {
        group1: g1Key,
        group2: g2Key,
        pValue: Number.NaN,
        stars: 'unavailable'
      }
    };
  }
  const tStat = (s1.mean - s2.mean) / seDiff;

  // Welch-Satterthwaite degrees of freedom
  const dfNumerator = Math.pow(v1 + v2, 2);
  const dfDenominator = (Math.pow(v1, 2) / (n1 - 1)) + (Math.pow(v2, 2) / (n2 - 1));
  const df = dfDenominator > 0 ? dfNumerator / dfDenominator : n1 + n2 - 2;

  const absT = Math.abs(tStat);
  const pValue = studentTwoSidedPValue(absT, df);
  const stars = formatSignificanceStars(pValue);

  return {
    testName: "Welch's Two-Sample t-test",
    statisticName: 't',
    statisticValue: Number(tStat.toFixed(3)),
    degreesOfFreedom: Number(df.toFixed(1)),
    pValue: Number(pValue.toFixed(5)),
    significanceStars: stars,
    groupStats: [
      { groupName: g1Key, values: g1Vals, ...s1 },
      { groupName: g2Key, values: g2Vals, ...s2 }
    ],
    summary: `${g1Key} (M=${s1.mean}, SD=${s1.stdDev}, n=${n1}) vs ${g2Key} (M=${s2.mean}, SD=${s2.stdDev}, n=${n2}): Welch t(${df.toFixed(1)}) = ${tStat.toFixed(2)}, p ${pValue < 0.001 ? '< 0.001' : '= ' + pValue.toFixed(3)} (${stars}).`,
    recommendedAnnotation: {
      group1: g1Key,
      group2: g2Key,
      pValue: Number(pValue.toFixed(5)),
      stars
    }
  };
}

export function runPearsonCorrelation(
  records: Record<string, any>[],
  xField: string,
  yField: string
): { r: number; r2: number; pValue: number; stars: string; n: number; summary: string } {
  const xVals: number[] = [];
  const yVals: number[] = [];

  for (const r of records) {
    const x = toFiniteNumber(r[xField]);
    const y = toFiniteNumber(r[yField]);
    if (x !== null && y !== null) {
      xVals.push(x);
      yVals.push(y);
    }
  }

  const n = xVals.length;
  if (n < 3) {
    return { r: Number.NaN, r2: Number.NaN, pValue: Number.NaN, stars: 'unavailable', n, summary: 'Insufficient points for correlation' };
  }

  const meanX = xVals.reduce((a, b) => a + b, 0) / n;
  const meanY = yVals.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const dx = xVals[i] - meanX;
    const dy = yVals[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  if (!(denX > 0 && denY > 0)) {
    return { r: Number.NaN, r2: Number.NaN, pValue: Number.NaN, stars: 'unavailable', n, summary: 'Correlation is unavailable because at least one selected field has no variation.' };
  }
  const r = num / Math.sqrt(denX * denY);
  const r2 = r * r;

  const t = Math.abs(r) < 1 ? Math.abs(r) * Math.sqrt((n - 2) / Math.max(Number.EPSILON, 1 - r2)) : Infinity;
  const pValue = studentTwoSidedPValue(t, n - 2);
  const stars = formatSignificanceStars(pValue);

  return {
    r: Number(r.toFixed(3)),
    r2: Number(r2.toFixed(3)),
    pValue: Number(pValue.toFixed(5)),
    stars,
    n,
    summary: `Pearson correlation between ${xField} and ${yField}: r = ${r.toFixed(3)}, R² = ${r2.toFixed(3)}, p ${pValue < 0.001 ? '< 0.001' : '= ' + pValue.toFixed(3)} (${stars}, n=${n}).`
  };
}

function toRegressionNumber(value: unknown): number | null {
  const numeric = toFiniteNumber(value);
  if (numeric !== null) return numeric;
  if (typeof value === 'string') {
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : null;
  }
  return null;
}

/** Fits an ordinary least-squares line; temporal x-values are treated as timestamps. */
export function runLinearRegression(
  records: Record<string, unknown>[],
  xField: string,
  yField: string,
): LinearRegressionResult {
  const points = records.map((record) => ({ x: toRegressionNumber(record[xField]), y: toFiniteNumber(record[yField]) }))
    .filter((point): point is { x: number; y: number } => point.x !== null && point.y !== null);
  const n = points.length;
  if (n < 3) throw new Error(`Linear regression requires at least 3 complete observations; found ${n}.`);

  const meanX = points.reduce((sum, point) => sum + point.x, 0) / n;
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / n;
  const sumXX = points.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0);
  const sumYY = points.reduce((sum, point) => sum + (point.y - meanY) ** 2, 0);
  if (sumXX === 0 || sumYY === 0) throw new Error('Linear regression requires variation in both selected fields.');
  const sumXY = points.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0);
  const slope = sumXY / sumXX;
  const intercept = meanY - slope * meanX;
  const r = sumXY / Math.sqrt(sumXX * sumYY);
  const r2 = r ** 2;
  const t = Math.abs(r) < 1 ? Math.abs(r) * Math.sqrt((n - 2) / Math.max(Number.EPSILON, 1 - r2)) : Infinity;
  const pValue = studentTwoSidedPValue(t, n - 2);
  return {
    slope: Number(slope.toPrecision(8)),
    intercept: Number(intercept.toPrecision(8)),
    r: Number(r.toFixed(4)),
    r2: Number(r2.toFixed(4)),
    pValue: Number(pValue.toFixed(6)),
    stars: formatSignificanceStars(pValue),
    n,
    summary: `Linear regression of ${yField} on ${xField}: slope = ${slope.toPrecision(5)}, intercept = ${intercept.toPrecision(5)}, R² = ${r2.toFixed(3)}, p ${pValue < 0.001 ? '< 0.001' : '= ' + pValue.toFixed(3)} (n=${n}).`,
  };
}
