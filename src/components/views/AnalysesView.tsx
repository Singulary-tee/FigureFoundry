import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Calculator,
  RefreshCw,
  Layers,
  Check,
  ArrowRight,
  Sparkles,
  Sliders,
  HelpCircle,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';
import { MultiPanelFigure, ForestPlotSpec, FunnelPlotSpec } from '../../types/multipanel';
import { runMetaAnalysis, generateFunnelPlotData, studentTwoSidedPValue } from '../../packages/stats/metaAnalysis';
import { profileDataset } from '../../packages/data-model/profiler';

interface AnalysesViewProps {
  figure: MultiPanelFigure;
  selectedDatasetId?: string | null;
  availableDatasets?: Array<{ id: string; title?: string }>;
  onSelectDataset?: (datasetId: string) => void;
  onUpdatePanelSpec: (panelId: string, spec: any) => void;
  onNavigate: (view: 'figures' | 'dashboard' | 'data' | 'analyses' | 'notes' | 'settings' | 'help') => void;
}

export const AnalysesView: React.FC<AnalysesViewProps> = ({
  figure,
  selectedDatasetId,
  availableDatasets = [],
  onSelectDataset,
  onUpdatePanelSpec,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'meta' | 'bias' | 'correlations'>('meta');
  const [selectedModel, setSelectedModel] = useState<'IV, Random Effects' | 'IV, Fixed Effect' | 'Mantel-Haenszel' | 'DerSimonian-Laird'>('IV, Random Effects');
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  // Find forest plot and funnel plot panels
  const forestPanel = figure.panels.find((p) => p.spec.kind === 'forest-plot');
  const funnelPanel = figure.panels.find((p) => p.spec.kind === 'funnel-plot');

  const metaResult = useMemo(() => {
    if (forestPanel && forestPanel.spec.kind === 'forest-plot') {
      const spec = forestPanel.spec as ForestPlotSpec;
      return runMetaAnalysis(spec.studies, selectedModel, spec.effectMeasure as any);
    }
    return null;
  }, [forestPanel, selectedModel]);

  // Publication bias metrics (Egger's linear regression)
  const biasStats = useMemo(() => {
    if (!metaResult || metaResult.studies.length < 3) return null;
    const n = metaResult.studies.length;
    const effects = metaResult.studies.map((s) => Math.log(Math.max(s.effect, 0.001)));
    const ses = metaResult.studies.map((s) => (Math.log(Math.max(s.ciUpper, 0.002)) - Math.log(Math.max(s.ciLower, 0.001))) / (2 * 1.96));
    const precisions = ses.map((se) => 1 / Math.max(se, 0.001));
    const snds = effects.map((eff, i) => eff / Math.max(ses[i], 0.001));

    const meanPrec = precisions.reduce((a, b) => a + b, 0) / n;
    const meanSnd = snds.reduce((a, b) => a + b, 0) / n;

    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (precisions[i] - meanPrec) * (snds[i] - meanSnd);
      den += (precisions[i] - meanPrec) ** 2;
    }
    const slope = den === 0 ? 0 : num / den;
    const intercept = meanSnd - slope * meanPrec;
    // Egger's intercept is tested with its regression standard error, not a threshold lookup.
    const residuals = snds.map((snd, i) => snd - (intercept + slope * precisions[i]));
    const residualVariance = residuals.reduce((sum, residual) => sum + residual ** 2, 0) / Math.max(1, n - 2);
    const interceptSE = den === 0 ? Infinity : Math.sqrt(residualVariance * (1 / n + meanPrec ** 2 / den));
    const tStatistic = interceptSE === 0 || !Number.isFinite(interceptSE) ? 0 : intercept / interceptSE;
    const eggerPVal = studentTwoSidedPValue(tStatistic, Math.max(1, n - 2));

    return {
      intercept: intercept.toFixed(3),
      slope: slope.toFixed(3),
      eggerPVal,
      hasBiasRisk: eggerPVal < 0.05,
      studyCount: n,
    };
  }, [metaResult]);

  // Dataset correlation matrix
  const activeDatasetId = selectedDatasetId || 'palmer-penguins';
  const datasetProfile = useMemo(() => profileDataset(activeDatasetId), [activeDatasetId]);
  const quantFields = datasetProfile.fields.filter((f) => f.type === 'quantitative');

  const correlationMatrix = useMemo(() => {
    const records = datasetProfile.records;
    const names = quantFields.map((f) => f.name);
    const matrix: Record<string, Record<string, number>> = {};

    names.forEach((rowName) => {
      matrix[rowName] = {};
      const rowVals = records.map((r) => Number(r[rowName])).filter((v) => !isNaN(v));
      const rowMean = rowVals.reduce((a, b) => a + b, 0) / (rowVals.length || 1);

      names.forEach((colName) => {
        if (rowName === colName) {
          matrix[rowName][colName] = 1.0;
          return;
        }
        const colVals = records.map((r) => Number(r[colName])).filter((v) => !isNaN(v));
        const colMean = colVals.reduce((a, b) => a + b, 0) / (colVals.length || 1);

        let num = 0;
        let denA = 0;
        let denB = 0;
        const count = Math.min(rowVals.length, colVals.length);
        for (let i = 0; i < count; i++) {
          const diffA = rowVals[i] - rowMean;
          const diffB = colVals[i] - colMean;
          num += diffA * diffB;
          denA += diffA ** 2;
          denB += diffB ** 2;
        }
        const denom = Math.sqrt(denA * denB);
        matrix[rowName][colName] = denom === 0 ? 0 : Number((num / denom).toFixed(3));
      });
    });

    return matrix;
  }, [datasetProfile, quantFields]);

  // Apply computed meta-analysis results to Forest Plot Panel
  const handleApplyToFigure = () => {
    if (!forestPanel || !metaResult) return;
    const currentSpec = forestPanel.spec as ForestPlotSpec;
    const updatedSpec: ForestPlotSpec = {
      ...currentSpec,
      model: selectedModel as any,
      pooledEstimate: {
        effect: Number(metaResult.pooledEstimate.effect.toFixed(2)),
        ciLower: Number(metaResult.pooledEstimate.ciLower.toFixed(2)),
        ciUpper: Number(metaResult.pooledEstimate.ciUpper.toFixed(2)),
        weightTotal: 100,
        label: `${selectedModel} (${metaResult.pooledEstimate.ciLower.toFixed(2)}–${metaResult.pooledEstimate.ciUpper.toFixed(2)})`,
      },
    };
    onUpdatePanelSpec(forestPanel.id, updatedSpec);

    // Sync Funnel Plot if present
    if (funnelPanel && funnelPanel.spec.kind === 'funnel-plot') {
      const funnelData = generateFunnelPlotData(metaResult);
      const updatedFunnel: FunnelPlotSpec = {
        ...(funnelPanel.spec as FunnelPlotSpec),
        points: funnelData.points,
      };
      onUpdatePanelSpec(funnelPanel.id, updatedFunnel);
    }

    setAppliedSuccess(true);
    setTimeout(() => setAppliedSuccess(false), 3000);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#fafafa] dark:bg-[#0f0f11] text-[#0f172a] dark:text-[#f4f4f5] p-3 sm:p-6 lg:p-8 select-text min-w-0">
      <div className="max-w-6xl mx-auto space-y-6 min-w-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e4e4e7] dark:border-[#27272a] min-w-0">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-[#0f172a] dark:text-[#f4f4f5] tracking-tight truncate">
              Meta-Analytic Modeling & Diagnostics
            </h1>
            <p className="text-xs text-[#71717a] mt-1">Analyze studies and numeric relationships from the selected dataset.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {appliedSuccess && (
              <span className="text-xs font-semibold text-[#24b47e] flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Applied to Figure!
              </span>
            )}
            <button
              onClick={handleApplyToFigure}
              disabled={!forestPanel || !metaResult}
              className="px-3.5 py-2 bg-[#24b47e] hover:bg-[#1f9d6e] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-40 whitespace-nowrap shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5 shrink-0" />
              <span>Apply to Figure</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl">
          <FileSpreadsheet className="w-4 h-4 text-[#24b47e] shrink-0" />
          <label htmlFor="analysis-dataset" className="text-xs font-semibold">Analysis dataset</label>
          <select
            id="analysis-dataset"
            value={activeDatasetId}
            onChange={(event) => onSelectDataset?.(event.target.value)}
            className="ml-auto max-w-[min(60%,18rem)] px-2.5 py-1.5 bg-[#f8f9fa] dark:bg-[#121212] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs outline-none"
          >
            {(availableDatasets.length ? availableDatasets : [{ id: activeDatasetId, title: activeDatasetId }]).map((dataset) => (
              <option key={dataset.id} value={dataset.id}>{dataset.title || dataset.id}</option>
            ))}
          </select>
        </div>

        {/* View Tabs */}
        <div className="flex items-center justify-between border-b border-[#e4e4e7] dark:border-[#27272a]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('meta')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === 'meta'
                  ? 'border-[#24b47e] text-[#24b47e]'
                  : 'border-transparent text-[#71717a] hover:text-[#0f172a] dark:hover:text-[#f4f4f5]'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>Heterogeneity & Summary</span>
            </button>
            <button
              onClick={() => setActiveTab('bias')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === 'bias'
                  ? 'border-[#24b47e] text-[#24b47e]'
                  : 'border-transparent text-[#71717a] hover:text-[#0f172a] dark:hover:text-[#f4f4f5]'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Publication Bias (Egger Test)</span>
            </button>
            <button
              onClick={() => setActiveTab('correlations')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === 'correlations'
                  ? 'border-[#24b47e] text-[#24b47e]'
                  : 'border-transparent text-[#71717a] hover:text-[#0f172a] dark:hover:text-[#f4f4f5]'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Correlation Matrix</span>
            </button>
          </div>

          {activeTab === 'meta' && (
            <div className="flex items-center gap-2 pb-2">
              <span className="text-xs text-[#71717a]">Model:</span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value as any)}
                className="px-2.5 py-1 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs font-semibold outline-none cursor-pointer"
              >
                <option value="IV, Random Effects">IV, Random Effects (DerSimonian-Laird)</option>
                <option value="IV, Fixed Effect">IV, Fixed Effect (Inverse Variance)</option>
                <option value="Mantel-Haenszel">Mantel-Haenszel</option>
              </select>
            </div>
          )}
        </div>

        {/* Tab 1: Meta-Analysis Summary & Heterogeneity */}
        {activeTab === 'meta' && metaResult && (
          <div className="space-y-6">
            {/* Key Statistical Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl shadow-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717a]">
                  Pooled Effect (95% CI)
                </span>
                <div className="font-mono text-xl font-bold text-[#24b47e]">
                  {metaResult.pooledEstimate.effect.toFixed(2)}{' '}
                  <span className="text-xs text-[#71717a] font-normal">
                    [{metaResult.pooledEstimate.ciLower.toFixed(2)}, {metaResult.pooledEstimate.ciUpper.toFixed(2)}]
                  </span>
                </div>
                <span className="text-[10px] text-[#71717a]">Z = {metaResult.pooledEstimate.zScore}, p = {metaResult.pooledEstimate.pValue}</span>
              </div>

              <div className="p-4 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl shadow-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717a]">
                  Inconsistency (I²)
                </span>
                <div className="font-mono text-xl font-bold text-[#0f172a] dark:text-[#f4f4f5]">
                  {metaResult.heterogeneity.iSquared.toFixed(1)}%
                </div>
                <span className="text-[10px] text-[#71717a]">
                  {metaResult.heterogeneity.iSquared > 50 ? 'Substantial heterogeneity' : 'Low to moderate'}
                </span>
              </div>

              <div className="p-4 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl shadow-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717a]">
                  Cochran's Q Test
                </span>
                <div className="font-mono text-xl font-bold text-[#0f172a] dark:text-[#f4f4f5]">
                  Q = {metaResult.heterogeneity.qStatistic.toFixed(1)}
                </div>
                <span className="text-[10px] text-[#71717a]">
                  df = {metaResult.heterogeneity.df}, p = {metaResult.heterogeneity.pValue.toFixed(3)}
                </span>
              </div>

              <div className="p-4 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl shadow-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717a]">
                  Between-Study Variance (τ²)
                </span>
                <div className="font-mono text-xl font-bold text-[#0f172a] dark:text-[#f4f4f5]">
                  {metaResult.heterogeneity.tauSquared.toFixed(3)}
                </div>
                <span className="text-[10px] text-[#71717a]">DerSimonian-Laird estimate</span>
              </div>
            </div>

            {/* Study Weights Table */}
            <div className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl shadow-xs overflow-hidden">
              <div className="px-5 py-3 border-b border-[#e4e4e7] dark:border-[#27272a] flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#0f172a] dark:text-[#f4f4f5]">
                  Individual Study Effect Weights
                </h3>
                <span className="text-[11px] text-[#71717a]">
                  {metaResult.studies.length} studies included in synthesis
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#f8f9fa] dark:bg-[#121212] border-b border-[#e4e4e7] dark:border-[#27272a]">
                    <tr>
                      <th className="px-4 py-2.5 font-bold text-[#71717a]">Study Label</th>
                      <th className="px-4 py-2.5 font-bold text-[#71717a]">Effect Size</th>
                      <th className="px-4 py-2.5 font-bold text-[#71717a]">95% CI</th>
                      <th className="px-4 py-2.5 font-bold text-[#71717a]">Model Weight</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e4e4e7] dark:divide-[#27272a]">
                    {metaResult.studies.map((s, idx) => (
                      <tr key={idx} className="hover:bg-[#f8f9fa] dark:hover:bg-[#141416]">
                        <td className="px-4 py-2.5 font-medium text-[#0f172a] dark:text-[#f4f4f5]">
                          {s.study}
                        </td>
                        <td className="px-4 py-2.5 font-mono font-bold text-sky-600 dark:text-sky-400">
                          {s.effect.toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[#71717a]">
                          [{s.ciLower.toFixed(2)}, {s.ciUpper.toFixed(2)}]
                        </td>
                        <td className="px-4 py-2.5 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          {s.weight.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Publication Bias (Egger Test) */}
        {activeTab === 'bias' && biasStats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-[#0f172a] dark:text-[#f4f4f5]">
                Egger's Linear Regression Test for Asymmetry
              </h3>
              <p className="text-xs text-[#71717a]">
                Tests for linear relationship between Standard Normal Deviates (SND) and Precision (1/SE)
              </p>

              <div className="p-4 bg-[#f8f9fa] dark:bg-[#121212] rounded-xl border border-[#e4e4e7] dark:border-[#27272a] space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#71717a]">Regression Intercept (α):</span>
                  <span className="font-mono font-bold text-[#0f172a] dark:text-[#f4f4f5]">
                    {biasStats.intercept}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#71717a]">Regression Slope (β):</span>
                  <span className="font-mono">{biasStats.slope}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#71717a]">P-Value (Two-Tailed):</span>
                  <span className="font-mono font-bold text-[#24b47e]">
                    p = {biasStats.eggerPVal}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#e4e4e7] dark:border-[#27272a]">
                  <span className="text-[#71717a]">Bias Risk Assessment:</span>
                  <span
                    className={`font-semibold ${
                      biasStats.hasBiasRisk ? 'text-amber-500' : 'text-emerald-500'
                    }`}
                  >
                    {biasStats.hasBiasRisk ? 'Potential Funnel Asymmetry' : 'No Significant Bias Detected'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-[#0f172a] dark:text-[#f4f4f5]">
                Methodological Guidance
              </h3>
              <div className="text-xs text-[#71717a] space-y-2.5 leading-relaxed">
                <p>
                  • <strong>Funnel Plot Funnel Bounds:</strong> Funnel plot symmetry implies absence of small-study reporting bias. Check Panel B in the figure canvas for visual pseudo-confidence contours (95% and 99%).
                </p>
                <p>
                  • <strong>Trim and Fill:</strong> When Egger's test indicates p &lt; 0.05, consider performing Duval and Tweedie's trim and fill sensitivity test to estimate missing studies.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Correlation Matrix */}
        {activeTab === 'correlations' && (
          <div className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl shadow-xs overflow-hidden">
            <div className="px-5 py-3 border-b border-[#e4e4e7] dark:border-[#27272a]">
              <h3 className="text-xs font-bold text-[#0f172a] dark:text-[#f4f4f5]">
                Pairwise Pearson Correlation Coefficients (r)
              </h3>
            </div>
            <div className="overflow-x-auto p-4">
              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 text-left text-[#71717a]">Field</th>
                    {quantFields.map((f) => (
                      <th key={f.name} className="p-2 font-bold text-[#0f172a] dark:text-[#f4f4f5]">
                        {f.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {quantFields.map((row) => (
                    <tr key={row.name}>
                      <td className="p-2 font-semibold text-left text-[#0f172a] dark:text-[#f4f4f5]">
                        {row.name}
                      </td>
                      {quantFields.map((col) => {
                        const r = correlationMatrix[row.name]?.[col.name] ?? 0;
                        const isPos = r > 0.5;
                        const isNeg = r < -0.5;
                        return (
                          <td
                            key={col.name}
                            className={`p-2 font-mono ${
                              r === 1
                                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 font-bold'
                                : isPos
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 font-bold'
                                : isNeg
                                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 font-bold'
                                : 'text-[#71717a]'
                            }`}
                          >
                            {r.toFixed(3)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
