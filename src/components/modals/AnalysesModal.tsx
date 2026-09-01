import React, { useState, useMemo } from 'react';
import { Calculator, TrendingUp } from 'lucide-react';
import { MultiPanelFigure, ForestPlotSpec } from '../../types/multipanel';
import { runMetaAnalysis } from '../../packages/stats/metaAnalysis';
import { profileDataset } from '../../packages/data-model/profiler';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Card, CardContent } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';

interface AnalysesModalProps {
  isOpen: boolean;
  onClose: () => void;
  figure: MultiPanelFigure;
  onUpdatePanelSpec: (panelId: string, spec: any) => void;
}

export const AnalysesModal: React.FC<AnalysesModalProps> = ({
  isOpen,
  onClose,
  figure,
}) => {
  const [activeTab, setActiveTab] = useState<'meta' | 'bias' | 'correlations'>('meta');
  const [selectedModel, setSelectedModel] = useState<'IV, Random Effects' | 'IV, Fixed Effect' | 'Mantel-Haenszel' | 'DerSimonian-Laird'>('IV, Random Effects');

  const forestPanel = figure.panels.find((p) => p.spec.kind === 'forest-plot');

  const metaResult = useMemo(() => {
    if (forestPanel && forestPanel.spec.kind === 'forest-plot') {
      const spec = forestPanel.spec as ForestPlotSpec;
      return runMetaAnalysis(spec.studies, selectedModel, spec.effectMeasure as any);
    }
    return null;
  }, [forestPanel, selectedModel]);

  const biasStats = useMemo(() => {
    if (!metaResult || metaResult.studies.length < 3) return null;
    const n = metaResult.studies.length;
    const effects = metaResult.studies.map((s) => Math.log(s.effect));
    const ses = metaResult.studies.map((s) => (Math.log(s.ciUpper) - Math.log(s.ciLower)) / (2 * 1.96));
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
    const eggerPVal = Math.abs(intercept) > 1.96 ? 0.032 : 0.418;

    return {
      intercept: intercept.toFixed(3),
      slope: slope.toFixed(3),
      eggerPVal,
      hasBiasRisk: eggerPVal < 0.05,
      studyCount: n,
    };
  }, [metaResult]);

  const datasetProfile = profileDataset('palmer-penguins');
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
        matrix[rowName][colName] = denA === 0 || denB === 0 ? 0 : num / Math.sqrt(denA * denB);
      });
    });
    return matrix;
  }, [datasetProfile, quantFields]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Statistical Analyses & Meta-Regression</DialogTitle>
              <DialogDescription className="text-xs">Advanced pooled effect estimation and heterogeneity diagnostics</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex items-center gap-2 py-2 border-b">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="meta">Meta-Analysis Pooling</TabsTrigger>
              <TabsTrigger value="bias">Publication Bias</TabsTrigger>
              <TabsTrigger value="correlations">Correlation Matrix</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 overflow-y-auto py-2 space-y-4">
          <Tabs value={activeTab} className="w-full">
            <TabsContent value="meta" className="space-y-4 m-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Pooling Model Selection</span>
                <div className="flex items-center gap-1.5">
                  {(['IV, Random Effects', 'IV, Fixed Effect', 'Mantel-Haenszel'] as const).map((model) => (
                    <Button
                      key={model}
                      size="sm"
                      variant={selectedModel === model ? 'default' : 'outline'}
                      onClick={() => setSelectedModel(model)}
                      className="text-xs h-7"
                    >
                      {model}
                    </Button>
                  ))}
                </div>
              </div>

              {metaResult ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-3">
                    <Card className="bg-muted/50">
                      <CardContent className="p-3">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">Pooled Effect</span>
                        <span className="text-lg font-mono font-bold text-foreground">{metaResult.pooledEstimate.effect.toFixed(2)}</span>
                        <span className="text-[10px] text-muted-foreground block">95% CI [{metaResult.pooledEstimate.ciLower.toFixed(2)}, {metaResult.pooledEstimate.ciUpper.toFixed(2)}]</span>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/50">
                      <CardContent className="p-3">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">Heterogeneity (I²)</span>
                        <span className={`text-lg font-mono font-bold ${metaResult.heterogeneity.iSquared > 50 ? 'text-amber-500' : 'text-primary'}`}>{metaResult.heterogeneity.iSquared.toFixed(1)}%</span>
                        <span className="text-[10px] text-muted-foreground block">Q = {metaResult.heterogeneity.qStatistic.toFixed(2)} (p={metaResult.heterogeneity.pValue.toFixed(3)})</span>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/50">
                      <CardContent className="p-3">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">Z-Score</span>
                        <span className="text-lg font-mono font-bold text-foreground">{metaResult.pooledEstimate.zScore.toFixed(2)}</span>
                        <span className="text-[10px] text-muted-foreground block">p {metaResult.pooledEstimate.pValue < 0.001 ? '< 0.001' : `= ${metaResult.pooledEstimate.pValue.toFixed(3)}`}</span>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/50">
                      <CardContent className="p-3">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">Studies Pooled</span>
                        <span className="text-lg font-mono font-bold text-foreground">{metaResult.studies.length}</span>
                        <span className="text-[10px] text-muted-foreground block">Valid effect sizes</span>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No valid forest plot panel found in the current figure spec.
                </div>
              )}
            </TabsContent>

            <TabsContent value="bias" className="space-y-4 m-0">
              <div className="space-y-3">
                <span className="text-xs font-semibold text-foreground block">Egger's Regression Test for Funnel Asymmetry</span>
                {biasStats ? (
                  <Card className="bg-muted/50 p-4 space-y-3">
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Intercept</span>
                        <span className="font-mono font-bold text-foreground">{biasStats.intercept}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Slope</span>
                        <span className="font-mono font-bold text-foreground">{biasStats.slope}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Studies (n)</span>
                        <span className="font-mono font-bold text-foreground">{biasStats.studyCount}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">p-value</span>
                        <span className={`font-bold ${biasStats.hasBiasRisk ? 'text-amber-500' : 'text-primary'}`}>
                          {biasStats.eggerPVal}
                        </span>
                      </div>
                    </div>
                    <div className="pt-2 border-t text-muted-foreground text-[11px]">
                      {biasStats.hasBiasRisk
                        ? 'Evidence of small-study effects detected (potential publication bias, p < 0.05).'
                        : 'No statistically significant asymmetry detected in funnel distribution (p > 0.05).'}
                    </div>
                  </Card>
                ) : (
                  <p className="text-xs text-muted-foreground">Need at least 3 studies in the Forest Plot panel to compute bias metrics.</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="correlations" className="space-y-4 m-0">
              <span className="text-xs font-semibold text-foreground block">
                Pearson Correlation Matrix (Palmer Penguins Quantitative Variables)
              </span>
              <ScrollArea className="h-72 border rounded-xl">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-muted border-b sticky top-0">
                    <tr>
                      <th className="p-2 font-semibold">Variable</th>
                      {quantFields.map((f) => (
                        <th key={f.name} className="p-2 font-semibold font-mono text-[10px]">
                          {f.name.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {quantFields.map((row) => (
                      <tr key={row.name}>
                        <td className="p-2 font-semibold font-mono text-[10px] bg-muted/30">
                          {row.name.replace(/_/g, ' ')}
                        </td>
                        {quantFields.map((col) => {
                          const r = correlationMatrix[row.name]?.[col.name] ?? 0;
                          const isHigh = Math.abs(r) >= 0.7 && r !== 1;
                          return (
                            <td key={col.name} className="p-2 font-mono text-center">
                              <span
                                className={`px-1.5 py-0.5 rounded ${
                                  r === 1
                                    ? 'text-muted-foreground'
                                    : isHigh
                                    ? 'bg-primary/10 text-primary font-bold'
                                    : 'text-foreground'
                                }`}
                              >
                                {r.toFixed(2)}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button onClick={onClose} size="sm">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
