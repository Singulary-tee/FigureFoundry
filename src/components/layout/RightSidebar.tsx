import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Sliders,
  Table as TableIcon,
  Download,
  Check,
  AlertCircle,
  FileCode,
  Plus,
  Trash2,
  Calculator,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { SidebarSeparator } from './SidebarSeparator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Button } from '../ui/button';
import {
  MultiPanelFigure,
  Panel,
  PanelKind,
  ForestPlotSpec,
  FunnelPlotSpec,
  SubgroupSpec,
  GroupedBarSpec,
  TextCaptionSpec,
  CanvasTheme,
} from '../../types/multipanel';
import { runMetaAnalysis } from '../../packages/stats/metaAnalysis';
import { profileDataset, registerRuntimeDataset } from '../../packages/data-model/profiler';
import { bindPanelToDataset, getPanelBindingDefinitions, isDatasetBoundPanel } from '../../packages/multipanel/datasetBinding';

interface RightSidebarProps {
  figure: MultiPanelFigure;
  selectedPanelId: string | null;
  activeTheme: CanvasTheme;
  onUpdatePanelSpec: (panelId: string, spec: any) => void;
  onConvertPanelKind: (panelId: string, newKind: PanelKind) => void;
  onOpenSaveThemeModal: () => void;
  onExportPanelPng: (panelId: string) => void;
  onExportPanelSvg: (panelId: string) => void;
  onExportFullPng: () => void;
  onExportFullSvg: () => void;
  onExportJson: () => void;
  isPendingApproval?: boolean;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  selectedDatasetId?: string | null;
  availableDatasets?: any[];
  onSelectDataset?: (datasetId: string) => void;
  onUpdateDataset?: (datasetId: string, rows: Record<string, any>[]) => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  figure,
  selectedPanelId,
  activeTheme,
  onUpdatePanelSpec,
  onConvertPanelKind,
  onOpenSaveThemeModal,
  onExportPanelPng,
  onExportPanelSvg,
  onExportFullPng,
  onExportFullSvg,
  onExportJson,
  isPendingApproval = false,
  isOpenMobile = false,
  onCloseMobile,
    isCollapsed = false,
  onToggleCollapse,
  selectedDatasetId,
  availableDatasets,
  onSelectDataset,
  onUpdateDataset,
}) => {
  const [activeTab, setActiveTab] = useState<'design' | 'data' | 'export'>('design');

  // Collapsible accordion states
  const [isPlotExpanded, setIsPlotExpanded] = useState(true);
  const [isAxisXExpanded, setIsAxisXExpanded] = useState(true);
  const [isAxisYExpanded, setIsAxisYExpanded] = useState(false);
  const [isAnnotationsExpanded, setIsAnnotationsExpanded] = useState(false);
  const [isStylingExpanded, setIsStylingExpanded] = useState(false);

  const selectedPanel = figure.panels.find((p) => p.id === selectedPanelId) || figure.panels[0];
  const spec = selectedPanel?.spec;
  const parseNumericInput = (value: string) => value.trim() === '' ? Number.NaN : Number(value);
  const formatNumeric = (value: number, digits = 2) => Number.isFinite(value) ? value.toFixed(digits) : 'Not estimable';
  const hasInvalidForestMapping = spec?.kind === 'forest-plot' && Boolean(spec.datasetId) && spec.studies.some((study) => {
    const requiresPositiveValues = !['Mean Difference (MD)', 'Risk Difference (RD)'].includes(spec.effectMeasure);
    return !Number.isFinite(study.effect) || !Number.isFinite(study.ciLower) || !Number.isFinite(study.ciUpper) ||
      (requiresPositiveValues && (study.effect <= 0 || study.ciLower <= 0)) ||
      study.ciLower > study.effect || study.ciUpper < study.effect;
  });

  // Compute live meta-analysis stats for Forest Plot
  const currentMetaStats = useMemo(() => {
    if (spec?.kind === 'forest-plot' && spec.datasetId && !spec.bindingIssues?.length && !hasInvalidForestMapping && spec.studies.length >= 2) {
      try {
        return runMetaAnalysis(
          (spec as ForestPlotSpec).studies,
          (spec as ForestPlotSpec).model as any,
          (spec as ForestPlotSpec).effectMeasure as any
        );
      } catch {
        return null;
      }
    }
    return null;
  }, [spec]);

  const panelUsesDataset = Boolean(spec && isDatasetBoundPanel(spec));
  const isPanelBoundToDataset = panelUsesDataset && Boolean((spec as any).datasetId);
  const activeDatasetId =
    (panelUsesDataset && (spec as any).datasetId) ||
    selectedDatasetId ||
    '';
  const [datasetRecordVersion, setDatasetRecordVersion] = useState(0);

  const currentDatasetProfile = useMemo(() => {
    if (isPanelBoundToDataset) {
      return profileDataset(activeDatasetId);
    }
    return null;
  }, [spec, activeDatasetId, datasetRecordVersion]);

  const chartFields = currentDatasetProfile?.fields || [];
  const updatePanelDataset = (datasetId: string) => {
    if (!spec || !isDatasetBoundPanel(spec)) return;
    onUpdatePanelSpec(selectedPanel.id, bindPanelToDataset(spec, datasetId, profileDataset(datasetId)));
  };
  const updatePanelFieldMapping = (key: string, field: string) => {
    if (!spec || !isDatasetBoundPanel(spec)) return;
    onUpdatePanelSpec(
      selectedPanel.id,
      bindPanelToDataset(spec, activeDatasetId, profileDataset(activeDatasetId), { [key]: field }),
    );
  };
  const updateChartEncoding = (channel: 'x' | 'y' | 'color' | 'shape', field: string) => {
    if (spec?.kind !== 'single-chart') return;
    updatePanelFieldMapping(channel, field);
  };
  const updateScientificChart = (field: string, value: any) => {
    if (spec?.kind !== 'volcano-plot' && spec?.kind !== 'heatmap') return;
    onUpdatePanelSpec(selectedPanel.id, {
      ...spec,
      [field]: value,
      spec: field === 'title' ? { ...spec.spec, title: value } : spec.spec,
    });
  };

  if (isCollapsed) {
    return (
      <div className="flex shrink-0 z-30 h-full">
        {onToggleCollapse && (
          <SidebarSeparator side="right" isCollapsed={true} onToggle={onToggleCollapse} />
        )}
        <aside className="w-14 bg-white dark:bg-[#121212] flex flex-col justify-between items-center py-3 select-none shrink-0 transition-all border-l border-[#e4e4e7] dark:border-[#27272a] h-full">
          <div className="flex flex-col items-center">
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="p-2 text-[#71717a] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] rounded-md mb-4 cursor-pointer"
                title="Expand sidebar"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
            )}
          </div>
        </aside>
      </div>
    );
  }

  if (!selectedPanel || !spec) {
    return (
      <aside className="w-80 bg-white dark:bg-[#121212] border-l border-[#e4e4e7] dark:border-[#27272a] p-4 text-xs text-[#71717a]">
        Select a panel to inspect its design parameters.
      </aside>
    );
  }

  const handleSpecChange = (field: string, value: any) => {
    if (spec.kind === 'forest-plot' && (field === 'model' || field === 'effectMeasure')) {
      const updatedSpec = {
        ...spec,
        [field]: value,
      } as ForestPlotSpec;
      const nextEffectMeasure = updatedSpec.effectMeasure;
      const normalizedSpec = {
        ...updatedSpec,
        xAxis: field === 'effectMeasure' && ['Mean Difference (MD)', 'Risk Difference (RD)'].includes(nextEffectMeasure)
          ? { ...spec.xAxis, scale: 'linear' }
          : spec.xAxis,
      } as ForestPlotSpec;
      // Re-run statistical meta-analysis with the updated model
      let meta = null;
      try {
        meta = runMetaAnalysis(normalizedSpec.studies, normalizedSpec.model as any, normalizedSpec.effectMeasure as any);
      } catch {
        // Keep unsupported combinations visibly unavailable rather than preserving stale pooling.
      }
      onUpdatePanelSpec(selectedPanel.id, {
        ...normalizedSpec,
        pooledEstimate: meta?.pooledEstimate || { ...normalizedSpec.pooledEstimate, effect: Number.NaN, ciLower: Number.NaN, ciUpper: Number.NaN, weightTotal: 0, label: 'Unavailable' },
      });
      return;
    }

    onUpdatePanelSpec(selectedPanel.id, {
      ...spec,
      [field]: value,
    });
  };

  const handleNestedChange = (parent: string, field: string, value: any) => {
    onUpdatePanelSpec(selectedPanel.id, {
      ...spec,
      [parent]: {
        ...(spec as any)[parent],
        [field]: value,
      },
    });
  };

  // Handle live study updates in Data tab
  const handleUpdateStudy = (index: number, field: string, value: any) => {
    if (spec.kind !== 'forest-plot') return;
    const currentStudies = [...(spec as ForestPlotSpec).studies];
    currentStudies[index] = {
      ...currentStudies[index],
      [field]: value,
    };

    // Calculate statistical meta-analysis dynamically
    let meta = null;
    try {
      meta = runMetaAnalysis(currentStudies, (spec as ForestPlotSpec).model as any, (spec as ForestPlotSpec).effectMeasure as any);
    } catch {
      // Keep unsupported combinations visibly unavailable rather than preserving stale pooling.
    }
    onUpdatePanelSpec(selectedPanel.id, {
      ...spec,
      studies: currentStudies,
      pooledEstimate: meta?.pooledEstimate || { ...spec.pooledEstimate, effect: Number.NaN, ciLower: Number.NaN, ciUpper: Number.NaN, weightTotal: 0, label: 'Unavailable' },
    });
  };

  const handleAddStudy = () => {
    if (spec.kind !== 'forest-plot') return;
    const nextNum = (spec as ForestPlotSpec).studies.length + 1;
    const newStudies = [
      ...(spec as ForestPlotSpec).studies,
      {
        id: `study-${Date.now()}`,
        study: `New Study ${nextNum}`,
        effect: Number.NaN,
        ciLower: Number.NaN,
        ciUpper: Number.NaN,
        weight: Number.NaN,
      },
    ];
    onUpdatePanelSpec(selectedPanel.id, {
      ...spec,
      studies: newStudies,
      pooledEstimate: {
        ...(spec as ForestPlotSpec).pooledEstimate,
        effect: Number.NaN,
        ciLower: Number.NaN,
        ciUpper: Number.NaN,
        weightTotal: 0,
        label: 'Awaiting valid studies',
      },
    });
  };

  const handleRemoveStudy = (index: number) => {
    if (spec.kind !== 'forest-plot') return;
    const newStudies = (spec as ForestPlotSpec).studies.filter((_, idx) => idx !== index);
    let meta = null;
    try {
      meta = runMetaAnalysis(newStudies, (spec as ForestPlotSpec).model as any, (spec as ForestPlotSpec).effectMeasure as any);
    } catch {
      // Keep unsupported combinations visibly unavailable rather than preserving stale pooling.
    }
    onUpdatePanelSpec(selectedPanel.id, {
      ...spec,
      studies: newStudies,
      pooledEstimate: meta?.pooledEstimate || { ...spec.pooledEstimate, effect: Number.NaN, ciLower: Number.NaN, ciUpper: Number.NaN, weightTotal: 0, label: 'Unavailable' },
    });
  };

  // Funnel plot data editing handlers
  const handleUpdateFunnelPoint = (index: number, field: string, value: any) => {
    if (spec.kind !== 'funnel-plot') return;
    const nextPoints = [...spec.points];
    nextPoints[index] = {
      ...nextPoints[index],
      [field]: value,
    };
    onUpdatePanelSpec(selectedPanel.id, {
      ...spec,
      points: nextPoints,
    });
  };

  const handleAddFunnelPoint = () => {
    if (spec.kind !== 'funnel-plot') return;
    const nextPoints = [
      ...spec.points,
      {
        id: `pt-${Date.now()}`,
        study: `Study ${spec.points.length + 1}`,
        effect: Number.NaN,
        standardError: Number.NaN,
      },
    ];
    onUpdatePanelSpec(selectedPanel.id, {
      ...spec,
      points: nextPoints,
    });
  };

  const handleRemoveFunnelPoint = (index: number) => {
    if (spec.kind !== 'funnel-plot') return;
    const nextPoints = spec.points.filter((_, idx) => idx !== index);
    onUpdatePanelSpec(selectedPanel.id, {
      ...spec,
      points: nextPoints,
    });
  };

  // Grouped Bar data editing handlers
  const handleUpdateGroupedBar = (index: number, field: string, value: any) => {
    if (spec.kind !== 'grouped-bar') return;
    const nextGroups = [...spec.groups];
    nextGroups[index] = {
      ...nextGroups[index],
      [field]: value,
    };
    onUpdatePanelSpec(selectedPanel.id, {
      ...spec,
      groups: nextGroups,
    });
  };

  const handleAddGroupedBar = () => {
    if (spec.kind !== 'grouped-bar') return;
    const nextGroups = [
      ...spec.groups,
      {
        id: `gb-${Date.now()}`,
        category: `Outcome ${spec.groups.length + 1}`,
        treatmentVal: Number.NaN,
        controlVal: Number.NaN,
      },
    ];
    onUpdatePanelSpec(selectedPanel.id, {
      ...spec,
      groups: nextGroups,
    });
  };

  const handleRemoveGroupedBar = (index: number) => {
    if (spec.kind !== 'grouped-bar') return;
    const nextGroups = spec.groups.filter((_, idx) => idx !== index);
    onUpdatePanelSpec(selectedPanel.id, {
      ...spec,
      groups: nextGroups,
    });
  };

  // Subgroup Analysis data editing handlers
  const handleUpdateSubgroup = (index: number, field: string, value: any) => {
    if (spec.kind !== 'subgroup-analysis') return;
    const nextSubgroups = [...spec.subgroups];
    nextSubgroups[index] = {
      ...nextSubgroups[index],
      [field]: value,
    };
    onUpdatePanelSpec(selectedPanel.id, {
      ...spec,
      subgroups: nextSubgroups,
    });
  };

  const handleAddSubgroup = () => {
    if (spec.kind !== 'subgroup-analysis') return;
    const nextSubgroups = [
      ...spec.subgroups,
      {
        id: `sg-${Date.now()}`,
        groupName: `Subgroup ${spec.subgroups.length + 1}`,
        effect: Number.NaN,
        ciLower: Number.NaN,
        ciUpper: Number.NaN,
        iSquared: Number.NaN,
      },
    ];
    onUpdatePanelSpec(selectedPanel.id, {
      ...spec,
      subgroups: nextSubgroups,
    });
  };

  const handleRemoveSubgroup = (index: number) => {
    if (spec.kind !== 'subgroup-analysis') return;
    const nextSubgroups = spec.subgroups.filter((_, idx) => idx !== index);
    onUpdatePanelSpec(selectedPanel.id, {
      ...spec,
      subgroups: nextSubgroups,
    });
  };

    const handleUpdateDatasetRecord = (rowIndex: number, column: string, val: any) => {
    const profile = profileDataset(activeDatasetId);
    const records = [...profile.records];
    if (records[rowIndex]) {
      records[rowIndex] = {
        ...records[rowIndex],
        [column]: isNaN(Number(val)) || val === '' ? val : Number(val),
      };
      registerRuntimeDataset({
        id: activeDatasetId,
        title: profile.title,
        description: profile.description,
        citation: profile.citation,
        records,
      });
      onUpdateDataset?.(activeDatasetId, records);
      setDatasetRecordVersion((v) => v + 1);
    }
  };

  const handleAddDatasetRecord = () => {
        const profile = profileDataset(activeDatasetId);
    const fieldKeys = profile.fields.map((f) => f.name);
    const sample: Record<string, unknown> = {};
    fieldKeys.forEach((k) => {
      sample[k] = profile.fields.find((f) => f.name === k)!.type === 'quantitative' ? 0 : '';
    });
    const records = [sample, ...profile.records];
    registerRuntimeDataset({
      id: activeDatasetId,
      title: profile.title,
      description: profile.description,
      citation: profile.citation,
      records,
    });
    onUpdateDataset?.(activeDatasetId, records);
    setDatasetRecordVersion((v) => v + 1);
  };

  const handleRemoveDatasetRecord = (rowIndex: number) => {
    const profile = profileDataset(activeDatasetId);
    const records = profile.records.filter((_, idx) => idx !== rowIndex);
    registerRuntimeDataset({
      id: activeDatasetId,
      title: profile.title,
      description: profile.description,
      citation: profile.citation,
      records,
    });
    onUpdateDataset?.(activeDatasetId, records);
    setDatasetRecordVersion((v) => v + 1);
  };

  const sidebarContent = (
    <aside className="bg-white dark:bg-[#121212] flex flex-col justify-between select-none shrink-0 overflow-hidden w-full h-full">
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'design' | 'data' | 'export')} className="w-full flex-1 flex flex-col">
          {/* Top Navigation Tabs */}
          <div className="border-b border-[#e4e4e7] dark:border-[#27272a] px-3 py-2 shrink-0">
            <TabsList className="w-full grid grid-cols-3 bg-[#f4f4f5] dark:bg-[#18181b] p-0.5 h-8">
              <TabsTrigger value="design" className="text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-[#27272a] data-[state=active]:text-[#24b47e]">
                Design
              </TabsTrigger>
              <TabsTrigger value="data" className="text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-[#27272a] data-[state=active]:text-[#24b47e]">
                Data
              </TabsTrigger>
              <TabsTrigger value="export" className="text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-[#27272a] data-[state=active]:text-[#24b47e]">
                Export
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab 1: Design Inspector */}
          <TabsContent value="design" className="mt-0 flex-1">
            <div className="p-4 space-y-4">
            {/* Plot section */}
            <div className="border-b border-[#e4e4e7] dark:border-[#27272a] pb-4">
              <button
                onClick={() => setIsPlotExpanded(!isPlotExpanded)}
                className="w-full flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa] mb-3"
              >
                <span>Plot</span>
                {isPlotExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {isPlotExpanded && (
                <div className="space-y-3">
                  {/* Plot Type conversion */}
                  <div>
                    <label className="block text-xs text-[#71717a] dark:text-[#a1a1aa] mb-1">Type</label>
                    <select
                      value={spec.kind}
                      disabled={isPendingApproval}
                      onChange={(e) => onConvertPanelKind(selectedPanel.id, e.target.value as PanelKind)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs font-medium text-[#0f172a] dark:text-[#f4f4f5] outline-none focus:border-[#24b47e]"
                    >
                      <option value="forest-plot">Forest Plot</option>
                      <option value="funnel-plot">Funnel Plot</option>
                      <option value="grouped-bar">Grouped Bar</option>
                      <option value="subgroup-analysis">Subgroup Analysis</option>
                      <option value="volcano-plot">Volcano Plot</option>
                      <option value="heatmap">Heatmap</option>
                      <option value="single-chart">Single Chart (Vega)</option>
                      <option value="text-caption">Text Caption</option>
                    </select>
                  </div>

                  {panelUsesDataset && (
                    <div className="space-y-3 rounded-lg border border-[#e4e4e7] dark:border-[#27272a] bg-[#fafafa] dark:bg-[#18181b] p-3">
                      <div>
                        <span className="block text-xs font-semibold text-[#0f172a] dark:text-[#f4f4f5]">Field mapping</span>
                        <p className="mt-0.5 text-[10px] text-[#71717a]">Choose which fields from this panel’s source drive the view. Select the source in Data.</p>
                      </div>
                      {!isPanelBoundToDataset ? (
                        <p className="text-[10px] text-[#71717a]">Select a panel dataset in Data to map fields.</p>
                      ) : chartFields.length > 0 ? getPanelBindingDefinitions(spec).map((binding) => (
                        <div key={binding.key}>
                          <label className="block text-xs text-[#71717a] dark:text-[#a1a1aa] mb-1">{binding.label}</label>
                          <select
                            value={(spec as any).fieldMapping?.[binding.key] || (spec as any).spec?.encoding?.[binding.key]?.field || ''}
                            onChange={(e) => updatePanelFieldMapping(binding.key, e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-[#121212] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs text-[#0f172a] dark:text-[#f4f4f5] outline-none"
                          >
                            {binding.optional ? <option value="">None</option> : null}
                            {chartFields.filter((field) => binding.type === 'any' || field.type === binding.type || (binding.type === 'categorical' && field.type === 'ordinal')).map((field) => <option key={field.name} value={field.name}>{field.name} ({field.type})</option>)}
                          </select>
                        </div>
                      )) : (
                        <p className="text-[10px] text-amber-700 dark:text-amber-300">This dataset has no fields available for binding.</p>
                      )}
                      {hasInvalidForestMapping && (
                        <p className="text-[10px] text-amber-700 dark:text-amber-300">Select valid estimate and interval fields with lower ≤ estimate ≤ upper.</p>
                      )}
                      {(spec as any).bindingIssues?.length > 0 && (
                        <div className="rounded-md border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 p-2 text-[10px] text-rose-700 dark:text-rose-300">
                          <strong>Binding incomplete:</strong> {(spec as any).bindingIssues.join(' ')}
                        </div>
                      )}
                      {(spec as any).bindingWarnings?.length > 0 && (
                        <div className="rounded-md border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 p-2 text-[10px] text-amber-700 dark:text-amber-300">
                          <strong>Data quality:</strong> {(spec as any).bindingWarnings.join(' ')}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Vega chart controls */}
                  {spec.kind === 'single-chart' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-[#71717a] dark:text-[#a1a1aa] mb-1">Chart Title</label>
                        <input
                          type="text"
                          value={(spec as any).spec?.title || (spec as any).title || ''}
                          onChange={(e) => {
                            const current = (spec as any).spec || {};
                            onUpdatePanelSpec(selectedPanel.id, {
                              ...spec,
                              title: e.target.value,
                              spec: { ...current, title: e.target.value },
                            });
                          }}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs font-medium text-[#0f172a] dark:text-[#f4f4f5] outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-[#71717a] dark:text-[#a1a1aa] mb-1">Mark Type</label>
                        <select
                          value={(spec as any).spec?.mark || 'bar'}
                          onChange={(e) => {
                            const current = (spec as any).spec || {};
                            onUpdatePanelSpec(selectedPanel.id, {
                              ...spec,
                              spec: { ...current, mark: e.target.value },
                            });
                          }}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs font-medium text-[#0f172a] dark:text-[#f4f4f5] outline-none"
                        >
                          <option value="point">Point / Scatter</option>
                          <option value="bar">Bar Chart</option>
                          <option value="boxplot">Box Plot</option>
                          <option value="line">Line Plot</option>
                          <option value="area">Area Chart</option>
                          <option value="tick">Tick Plot</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-[#71717a] dark:text-[#a1a1aa] mb-1">X-Axis Variable</label>
                        <select
                          value={(spec as any).spec?.encoding?.x?.field || chartFields.find((field) => field.type !== 'quantitative')?.name || ''}
                          onChange={(e) => updateChartEncoding('x', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs font-medium text-[#0f172a] dark:text-[#f4f4f5] outline-none"
                        >
                          {chartFields.map((field) => <option key={field.name} value={field.name}>{field.name}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-[#71717a] dark:text-[#a1a1aa] mb-1">Y-Axis Variable</label>
                        <select
                          value={(spec as any).spec?.encoding?.y?.field || chartFields.find((field) => field.type === 'quantitative')?.name || ''}
                          onChange={(e) => updateChartEncoding('y', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs font-medium text-[#0f172a] dark:text-[#f4f4f5] outline-none"
                        >
                          {chartFields.filter((field) => field.type === 'quantitative').map((field) => <option key={field.name} value={field.name}>{field.name}</option>)}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {(['color', 'shape'] as const).map((channel) => (
                          <div key={channel}>
                            <label className="block text-xs text-[#71717a] dark:text-[#a1a1aa] mb-1 capitalize">{channel} (optional)</label>
                            <select
                              value={(spec as any).spec?.encoding?.[channel]?.field || ''}
                              onChange={(e) => updateChartEncoding(channel, e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs font-medium text-[#0f172a] dark:text-[#f4f4f5] outline-none"
                            >
                              <option value="">None</option>
                              {chartFields.filter((field) => field.type === 'categorical' || field.type === 'ordinal').map((field) => <option key={field.name} value={field.name}>{field.name}</option>)}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(spec.kind === 'volcano-plot' || spec.kind === 'heatmap') && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-[#71717a] dark:text-[#a1a1aa] mb-1">Chart Title</label>
                        <input
                          type="text"
                          value={spec.title || spec.spec.title || ''}
                          onChange={(e) => updateScientificChart('title', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs text-[#0f172a] dark:text-[#f4f4f5] outline-none"
                        />
                      </div>
                      {spec.kind === 'volcano-plot' && (
                        <div>
                          <label className="block text-xs text-[#71717a] dark:text-[#a1a1aa] mb-1">Significance Threshold</label>
                          <input
                            type="number"
                            min="0"
                            max="1"
                            step="0.001"
                            value={spec.significanceThreshold ?? 0.05}
                            onChange={(e) => updateScientificChart('significanceThreshold', Number(e.target.value))}
                            className="w-28 px-2.5 py-1.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs text-[#0f172a] dark:text-[#f4f4f5] outline-none"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Forest Plot Specific Controls */}
                  {spec.kind === 'forest-plot' && (
                    <>
                      <div>
                        <label className="block text-xs text-[#71717a] dark:text-[#a1a1aa] mb-1">Model</label>
                        <select
                          value={(spec as ForestPlotSpec).model}
                          onChange={(e) => handleSpecChange('model', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs font-medium text-[#0f172a] dark:text-[#f4f4f5] outline-none focus:border-[#24b47e]"
                        >
                          <option value="IV, Random Effects">IV, Random Effects</option>
                          <option value="IV, Fixed Effect">IV, Fixed Effect</option>
                          <option value="DerSimonian-Laird">DerSimonian-Laird</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-[#71717a] dark:text-[#a1a1aa] mb-1">Effect Measure</label>
                        <select
                          value={(spec as ForestPlotSpec).effectMeasure}
                          onChange={(e) => handleSpecChange('effectMeasure', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs font-medium text-[#0f172a] dark:text-[#f4f4f5] outline-none focus:border-[#24b47e]"
                        >
                          <option value="Odds Ratio (OR)">Odds Ratio (OR)</option>
                          <option value="Risk Ratio (RR)">Risk Ratio (RR)</option>
                          <option value="Risk Difference (RD)">Risk Difference (RD)</option>
                          <option value="Hazard Ratio (HR)">Hazard Ratio (HR)</option>
                          <option value="Mean Difference (MD)">Mean Difference (MD)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-[#71717a] dark:text-[#a1a1aa] mb-1">Title</label>
                        <input
                          type="text"
                          value={spec.title || ''}
                          onChange={(e) => handleSpecChange('title', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs font-medium text-[#0f172a] dark:text-[#f4f4f5] outline-none focus:border-[#24b47e]"
                        />
                      </div>

                      {/* Show 95% CI Toggle */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#0f172a] dark:text-[#f4f4f5] font-medium">Show 95% CI</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(spec as ForestPlotSpec).showCi95}
                            onChange={(e) => handleSpecChange('showCi95', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-[#e4e4e7] peer-focus:outline-none rounded-full peer dark:bg-[#27272a] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#e4e4e7] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#24b47e]"></div>
                        </label>
                      </div>

                      {/* Show Weights Toggle */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#0f172a] dark:text-[#f4f4f5] font-medium">Show Weights</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(spec as ForestPlotSpec).showWeights}
                            onChange={(e) => handleSpecChange('showWeights', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-[#e4e4e7] peer-focus:outline-none rounded-full peer dark:bg-[#27272a] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#e4e4e7] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#24b47e]"></div>
                        </label>
                      </div>
                    </>
                  )}

                  {/* Funnel Plot Specific Controls */}
                  {spec.kind === 'funnel-plot' && (
                    <>
                      <div>
                        <label className="block text-xs text-[#71717a] dark:text-[#a1a1aa] mb-1">Title</label>
                        <input
                          type="text"
                          value={spec.title || ''}
                          onChange={(e) => handleSpecChange('title', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs font-medium text-[#0f172a] dark:text-[#f4f4f5] outline-none"
                        />
                      </div>
                    </>
                  )}

                  {/* Grouped Bar Specific Controls */}
                  {spec.kind === 'grouped-bar' && (
                    <>
                      <div>
                        <label className="block text-xs text-[#71717a] dark:text-[#a1a1aa] mb-1">Title</label>
                        <input
                          type="text"
                          value={spec.title || ''}
                          onChange={(e) => handleSpecChange('title', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs font-medium text-[#0f172a] dark:text-[#f4f4f5] outline-none"
                        />
                      </div>
                    </>
                  )}

                  {/* Text Caption Specific Controls */}
                  {spec.kind === 'text-caption' && (
                    <>
                      <div>
                        <label className="block text-xs text-[#71717a] dark:text-[#a1a1aa] mb-1">Figure Caption Title</label>
                        <input
                          type="text"
                          value={spec.title || ''}
                          onChange={(e) => handleSpecChange('title', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs font-medium text-[#0f172a] dark:text-[#f4f4f5] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#71717a] dark:text-[#a1a1aa] mb-1">Description</label>
                        <textarea
                          rows={3}
                          value={(spec as TextCaptionSpec).captionText || ''}
                          onChange={(e) => handleSpecChange('captionText', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs font-medium text-[#0f172a] dark:text-[#f4f4f5] outline-none"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Axis (X) Section */}
            {'xAxis' in spec && (
              <div className="border-b border-[#e4e4e7] dark:border-[#27272a] pb-4">
                <button
                  onClick={() => setIsAxisXExpanded(!isAxisXExpanded)}
                  className="w-full flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa] mb-3"
                >
                  <span>Axis (X)</span>
                  {isAxisXExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {isAxisXExpanded && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-[#71717a] dark:text-[#a1a1aa] mb-1">Scale</label>
                      <select
                        value={(spec as any).xAxis?.scale || 'log'}
                        onChange={(e) => handleNestedChange('xAxis', 'scale', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs font-medium text-[#0f172a] dark:text-[#f4f4f5] outline-none"
                      >
                        <option value="log">Log</option>
                        <option value="linear">Linear</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-[#71717a] dark:text-[#a1a1aa] mb-1">Min</label>
                        <input
                          type="number"
                          step="0.1"
                          value={(spec as any).xAxis?.min ?? 0.1}
                          onChange={(e) => handleNestedChange('xAxis', 'min', parseFloat(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs font-medium text-[#0f172a] dark:text-[#f4f4f5] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#71717a] dark:text-[#a1a1aa] mb-1">Max</label>
                        <input
                          type="number"
                          step="1"
                          value={(spec as any).xAxis?.max ?? 10}
                          onChange={(e) => handleNestedChange('xAxis', 'max', parseFloat(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs font-medium text-[#0f172a] dark:text-[#f4f4f5] outline-none"
                        />
                      </div>
                    </div>

                    {'referenceLine' in ((spec as any).xAxis || {}) && (
                      <div>
                        <label className="block text-xs text-[#71717a] dark:text-[#a1a1aa] mb-1">Reference Line</label>
                        <input
                          type="number"
                          step="0.1"
                          value={(spec as any).xAxis?.referenceLine ?? 1}
                          onChange={(e) => handleNestedChange('xAxis', 'referenceLine', parseFloat(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs font-medium text-[#0f172a] dark:text-[#f4f4f5] outline-none"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Axis (Y) collapsible */}
            <div className="border-b border-[#e4e4e7] dark:border-[#27272a] pb-4">
              <button
                onClick={() => setIsAxisYExpanded(!isAxisYExpanded)}
                className="w-full flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa]"
              >
                <span>Axis (Y)</span>
                {isAxisYExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {isAxisYExpanded && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-xs text-[#71717a] dark:text-[#a1a1aa] mb-1">Scale Type</label>
                    <select
                      value={(spec as any).yAxis?.scale || 'linear'}
                      onChange={(e) => handleNestedChange('yAxis', 'scale', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs font-medium text-[#0f172a] dark:text-[#f4f4f5] outline-none focus:border-[#24b47e]"
                    >
                      <option value="linear">Linear</option>
                      <option value="log">Logarithmic</option>
                      <option value="sqrt">Square Root</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-[#71717a] dark:text-[#a1a1aa] mb-1">Min</label>
                      <input
                        type="number"
                        value={(spec as any).yAxis?.min ?? 0}
                        onChange={(e) => handleNestedChange('yAxis', 'min', parseFloat(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs font-medium text-[#0f172a] dark:text-[#f4f4f5] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#71717a] dark:text-[#a1a1aa] mb-1">Max</label>
                      <input
                        type="number"
                        value={(spec as any).yAxis?.max ?? 40}
                        onChange={(e) => handleNestedChange('yAxis', 'max', parseFloat(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs font-medium text-[#0f172a] dark:text-[#f4f4f5] outline-none"
                      />
                    </div>
                  </div>

                  {spec.kind === 'grouped-bar' && (
                    <label className="flex items-center gap-2 text-xs font-medium text-[#0f172a] dark:text-[#f4f4f5]">
                      <input
                        type="checkbox"
                        checked={(spec as GroupedBarSpec).yAxis.autoMax !== false}
                        onChange={(e) => handleNestedChange('yAxis', 'autoMax', e.target.checked)}
                        className="h-3.5 w-3.5 accent-[#24b47e]"
                      />
                      <span>Auto adjust maximum</span>
                    </label>
                  )}

                  <div>
                    <label className="block text-xs text-[#71717a] dark:text-[#a1a1aa] mb-1">Y-Axis Title</label>
                    <input
                      type="text"
                      value={(spec as any).yAxis?.title || ''}
                      onChange={(e) => handleNestedChange('yAxis', 'title', e.target.value)}
                      placeholder="e.g. Event Rate (%) or Log SE"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs font-medium text-[#0f172a] dark:text-[#f4f4f5] outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-[#0f172a] dark:text-[#f4f4f5] font-medium">Show Y Gridlines</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(spec as any).showGrid !== false}
                        onChange={(e) => handleSpecChange('showGrid', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-[#e4e4e7] peer-focus:outline-none rounded-full peer dark:bg-[#27272a] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#e4e4e7] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#24b47e]"></div>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Annotations collapsible */}
            <div className="border-b border-[#e4e4e7] dark:border-[#27272a] pb-4">
              <button
                onClick={() => setIsAnnotationsExpanded(!isAnnotationsExpanded)}
                className="w-full flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa]"
              >
                <span>Annotations</span>
                {isAnnotationsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {isAnnotationsExpanded && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-xs text-[#71717a] dark:text-[#a1a1aa] mb-1">Subtitle / Note</label>
                    <input
                      type="text"
                      value={(spec as any).subtitle || ''}
                      onChange={(e) => handleSpecChange('subtitle', e.target.value)}
                      placeholder="e.g. p < 0.05 vs Control group"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs font-medium text-[#0f172a] dark:text-[#f4f4f5] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-[#71717a] dark:text-[#a1a1aa] mb-1">Significance / P-Value Marker</label>
                    <input
                      type="text"
                      value={(spec as any).pValAnnotation || ''}
                      onChange={(e) => handleSpecChange('pValAnnotation', e.target.value)}
                      placeholder="e.g. * p = 0.012, ** p < 0.001"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs font-medium text-[#0f172a] dark:text-[#f4f4f5] outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-[#0f172a] dark:text-[#f4f4f5] font-medium">Show Value Labels</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(spec as any).showLabels !== false}
                        onChange={(e) => handleSpecChange('showLabels', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-[#e4e4e7] peer-focus:outline-none rounded-full peer dark:bg-[#27272a] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#e4e4e7] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#24b47e]"></div>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Styling collapsible */}
            <div className="border-b border-[#e4e4e7] dark:border-[#27272a] pb-4">
              <button
                onClick={() => setIsStylingExpanded(!isStylingExpanded)}
                className="w-full flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa]"
              >
                <span>Styling</span>
                {isStylingExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {isStylingExpanded && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-xs text-[#71717a] dark:text-[#a1a1aa] mb-1.5">Accent Color</label>
                    <div className="flex items-center gap-2">
                      {['#24b47e', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#64748b'].map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => handleSpecChange('accentColor', hex)}
                          style={{ backgroundColor: hex }}
                          className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                            (spec as any).accentColor === hex ? 'scale-115 border-black dark:border-white shadow-xs' : 'border-transparent hover:scale-105'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-[#71717a] dark:text-[#a1a1aa] mb-1">Font Family</label>
                    <select
                      value={(spec as any).fontFamily || (activeTheme as any).typography?.fontFamily || (activeTheme as any).fontFamily || 'Inter, sans-serif'}
                      onChange={(e) => handleSpecChange('fontFamily', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs font-medium text-[#0f172a] dark:text-[#f4f4f5] outline-none"
                    >
                      <option value="Inter, sans-serif">Inter (Sans-Serif)</option>
                      <option value="Roboto, sans-serif">Roboto</option>
                      <option value="Georgia, serif">Georgia (Serif)</option>
                      <option value="monospace">Roboto Mono (Monospace)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-[#71717a] dark:text-[#a1a1aa] mb-1">Stroke Width (px)</label>
                    <input
                      type="range"
                      min="1"
                      max="4"
                      step="0.5"
                      value={(spec as any).strokeWidth || 1.5}
                      onChange={(e) => handleSpecChange('strokeWidth', parseFloat(e.target.value))}
                      className="w-full accent-[#24b47e]"
                    />
                    <div className="flex justify-between text-[10px] text-[#71717a]">
                      <span>1px (Fine)</span>
                      <span>{(spec as any).strokeWidth || 1.5}px</span>
                      <span>4px (Heavy)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Interactive Data Grid with Real Meta-Analysis Computation */}
        <TabsContent value="data" className="mt-0 flex-1">
          <div className="p-4 space-y-4">
            {panelUsesDataset && (
              <div className="rounded-lg border border-dashed border-[#d4d4d8] dark:border-[#3f3f46] p-3 text-xs text-[#71717a]">
                <label className="block text-xs font-semibold text-[#0f172a] dark:text-[#f4f4f5] mb-1">Panel dataset</label>
                <select
                  value={isPanelBoundToDataset ? activeDatasetId : ''}
                  onChange={(e) => e.target.value && updatePanelDataset(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-[#121212] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs text-[#0f172a] dark:text-[#f4f4f5] outline-none"
                >
                  <option value="" disabled>Select a dataset for this panel</option>
                  {(availableDatasets || []).map((dataset) => (
                    <option key={dataset.id} value={dataset.id}>{dataset.title || dataset.name || dataset.id}</option>
                  ))}
                </select>
                <p className="mt-1.5 text-[10px]">This binding is local to the selected panel. Field mapping is in Design.</p>
              </div>
            )}
            {spec.kind === 'forest-plot' && !isPanelBoundToDataset && (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Calculator className="w-4 h-4 text-[#24b47e]" />
                    <span className="text-xs font-bold text-[#0f172a] dark:text-[#f4f4f5]">Study Dataset ({spec.studies.length})</span>
                  </div>
                  <button
                    onClick={handleAddStudy}
                    className="flex items-center gap-1 px-2 py-1 bg-[#24b47e]/15 text-[#24b47e] hover:bg-[#24b47e]/25 text-[11px] font-semibold rounded-md transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Study</span>
                  </button>
                </div>

                {/* Real Heterogeneity & Statistical Summary Card */}
                {currentMetaStats && (
                  <div className="p-2.5 rounded-lg bg-[#f4f4f5] dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between font-semibold text-[#0f172a] dark:text-[#f4f4f5]">
                      <span>Heterogeneity Statistics</span>
                      <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                        {currentMetaStats.model}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[10.5px]">
                      <div>
                        <span className="text-[#71717a] block text-[9.5px]">Cochran's Q</span>
                        <span className="font-bold text-[#0f172a] dark:text-[#f4f4f5]">{formatNumeric(currentMetaStats.heterogeneity.qStatistic)}</span>
                        <span className="text-[9px] text-[#71717a] block">(df={currentMetaStats.heterogeneity.df}, p={formatNumeric(currentMetaStats.heterogeneity.pValue, 3)})</span>
                      </div>
                      <div>
                        <span className="text-[#71717a] block text-[9.5px]">Inconsistency I²</span>
                        <span className="font-bold text-[#24b47e]">{formatNumeric(currentMetaStats.heterogeneity.iSquared, 1)}{Number.isFinite(currentMetaStats.heterogeneity.iSquared) ? '%' : ''}</span>
                        <span className="text-[9px] text-[#71717a] block">{Number.isFinite(currentMetaStats.heterogeneity.iSquared) ? currentMetaStats.heterogeneity.iSquared > 50 ? 'Substantial' : 'Moderate' : 'Not estimable'}</span>
                      </div>
                      <div>
                        <span className="text-[#71717a] block text-[9.5px]">Variance τ²</span>
                        <span className="font-bold text-[#0f172a] dark:text-[#f4f4f5]">{formatNumeric(currentMetaStats.heterogeneity.tauSquared, 3)}</span>
                        <span className="text-[9px] text-[#71717a] block">τ = {formatNumeric(currentMetaStats.heterogeneity.tau, 3)}</span>
                      </div>
                    </div>
                    <div className="pt-1.5 border-t border-[#e4e4e7] dark:border-[#27272a] flex items-center justify-between">
                      <span className="text-[#71717a]">Pooled Effect:</span>
                      <span className="font-bold font-mono text-[#0f172a] dark:text-[#f4f4f5]">
                        {formatNumeric(currentMetaStats.pooledEstimate.effect)} [{formatNumeric(currentMetaStats.pooledEstimate.ciLower)}, {formatNumeric(currentMetaStats.pooledEstimate.ciUpper)}] (p={formatNumeric(currentMetaStats.pooledEstimate.pValue, 3)})
                      </span>
                    </div>
                  </div>
                )}

                {/* Editable Studies Table */}
                <div className="border border-[#e4e4e7] dark:border-[#27272a] rounded-lg overflow-x-auto text-[11px]">
                  <table className="w-full text-left">
                    <thead className="bg-[#f4f4f5] dark:bg-[#18181b] border-b border-[#e4e4e7] dark:border-[#27272a]">
                      <tr>
                        <th className="p-1.5 font-semibold">Study</th>
                        <th className="p-1.5 font-semibold w-14">OR</th>
                        <th className="p-1.5 font-semibold w-14">Lower</th>
                        <th className="p-1.5 font-semibold w-14">Upper</th>
                        <th className="p-1.5 font-semibold w-12">Wt %</th>
                        <th className="p-1.5 w-6"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e4e4e7] dark:divide-[#27272a]">
                      {spec.studies.map((s, idx) => (
                        <tr key={s.id || idx}>
                          <td className="p-1">
                            <input
                              type="text"
                              value={s.study}
                              onChange={(e) => handleUpdateStudy(idx, 'study', e.target.value)}
                              className="w-full px-1 py-0.5 bg-transparent rounded border border-transparent hover:border-[#e4e4e7] focus:border-[#24b47e] outline-none"
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              step="0.01"
                              value={Number.isFinite(s.effect) ? s.effect : ''}
                              onChange={(e) => handleUpdateStudy(idx, 'effect', parseNumericInput(e.target.value))}
                              className="w-13 px-1 py-0.5 font-mono bg-transparent rounded border border-transparent hover:border-[#e4e4e7] focus:border-[#24b47e] outline-none"
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              step="0.01"
                              value={Number.isFinite(s.ciLower) ? s.ciLower : ''}
                              onChange={(e) => handleUpdateStudy(idx, 'ciLower', parseNumericInput(e.target.value))}
                              className="w-13 px-1 py-0.5 font-mono bg-transparent rounded border border-transparent hover:border-[#e4e4e7] focus:border-[#24b47e] outline-none"
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              step="0.01"
                              value={Number.isFinite(s.ciUpper) ? s.ciUpper : ''}
                              onChange={(e) => handleUpdateStudy(idx, 'ciUpper', parseNumericInput(e.target.value))}
                              className="w-13 px-1 py-0.5 font-mono bg-transparent rounded border border-transparent hover:border-[#e4e4e7] focus:border-[#24b47e] outline-none"
                            />
                          </td>
                          <td className="p-1 font-mono text-[#71717a]">
                            {s.weight.toFixed(1)}%
                          </td>
                          <td className="p-1 text-center">
                            <button
                              onClick={() => handleRemoveStudy(idx)}
                              className="text-[#71717a] hover:text-red-500 transition-colors cursor-pointer"
                              title="Delete Study"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </>
            )}

            {spec.kind === 'funnel-plot' && !isPanelBoundToDataset && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0f172a] dark:text-[#f4f4f5]">
                    Funnel Points ({spec.points.length})
                  </span>
                  <button
                    onClick={handleAddFunnelPoint}
                    className="flex items-center gap-1 px-2 py-1 bg-[#24b47e]/15 text-[#24b47e] hover:bg-[#24b47e]/25 text-[11px] font-semibold rounded-md transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Point</span>
                  </button>
                </div>
                <div className="border border-[#e4e4e7] dark:border-[#27272a] rounded-lg overflow-x-auto text-[11px]">
                  <table className="w-full text-left">
                    <thead className="bg-[#f4f4f5] dark:bg-[#18181b] border-b border-[#e4e4e7] dark:border-[#27272a]">
                      <tr>
                        <th className="p-1.5 font-semibold">Study</th>
                        <th className="p-1.5 font-semibold w-16">
                          {spec.xAxis.scale === 'log' ? 'Effect (log)' : 'Effect'}
                        </th>
                        <th className="p-1.5 font-semibold w-16">SE</th>
                        <th className="p-1.5 w-6"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e4e4e7] dark:divide-[#27272a]">
                      {spec.points.map((p, idx) => (
                        <tr key={p.id || idx}>
                          <td className="p-1">
                            <input
                              type="text"
                              value={p.study}
                              onChange={(e) => handleUpdateFunnelPoint(idx, 'study', e.target.value)}
                              className="w-full px-1 py-0.5 bg-transparent rounded border border-transparent hover:border-[#e4e4e7] focus:border-[#24b47e] outline-none"
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              step="0.05"
                              value={Number.isFinite(p.effect) ? p.effect : ''}
                              onChange={(e) =>
                                handleUpdateFunnelPoint(idx, 'effect', parseNumericInput(e.target.value))
                              }
                              className="w-14 px-1 py-0.5 font-mono bg-transparent rounded border border-transparent hover:border-[#e4e4e7] focus:border-[#24b47e] outline-none"
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              step="0.05"
                              value={Number.isFinite(p.standardError) ? p.standardError : ''}
                              onChange={(e) =>
                                handleUpdateFunnelPoint(
                                  idx,
                                  'standardError',
                                  parseNumericInput(e.target.value)
                                )
                              }
                              className="w-14 px-1 py-0.5 font-mono bg-transparent rounded border border-transparent hover:border-[#e4e4e7] focus:border-[#24b47e] outline-none"
                            />
                          </td>
                          <td className="p-1 text-center">
                            <button
                              onClick={() => handleRemoveFunnelPoint(idx)}
                              className="text-[#71717a] hover:text-red-500 transition-colors cursor-pointer"
                              title="Delete Point"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {spec.kind === 'subgroup-analysis' && !isPanelBoundToDataset && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0f172a] dark:text-[#f4f4f5]">
                    Subgroup Stratifications ({spec.subgroups.length})
                  </span>
                  <button
                    onClick={handleAddSubgroup}
                    className="flex items-center gap-1 px-2 py-1 bg-[#24b47e]/15 text-[#24b47e] hover:bg-[#24b47e]/25 text-[11px] font-semibold rounded-md transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Subgroup</span>
                  </button>
                </div>
                <div className="border border-[#e4e4e7] dark:border-[#27272a] rounded-lg overflow-x-auto text-[11px]">
                  <table className="w-full text-left">
                    <thead className="bg-[#f4f4f5] dark:bg-[#18181b] border-b border-[#e4e4e7] dark:border-[#27272a]">
                      <tr>
                        <th className="p-1.5 font-semibold">Group</th>
                        <th className="p-1.5 font-semibold w-14">OR</th>
                        <th className="p-1.5 font-semibold w-14">Lower</th>
                        <th className="p-1.5 font-semibold w-14">Upper</th>
                        <th className="p-1.5 font-semibold w-12">I² %</th>
                        <th className="p-1.5 w-6"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e4e4e7] dark:divide-[#27272a]">
                      {spec.subgroups.map((sg, idx) => (
                        <tr key={sg.id || idx}>
                          <td className="p-1">
                            <input
                              type="text"
                              value={sg.groupName || sg.name}
                              onChange={(e) => handleUpdateSubgroup(idx, 'groupName', e.target.value)}
                              className="w-full px-1 py-0.5 bg-transparent rounded border border-transparent hover:border-[#e4e4e7] focus:border-[#24b47e] outline-none font-medium"
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              step="0.05"
                              value={Number.isFinite(sg.effect) ? sg.effect : ''}
                              onChange={(e) =>
                                handleUpdateSubgroup(idx, 'effect', parseNumericInput(e.target.value))
                              }
                              className="w-13 px-1 py-0.5 font-mono bg-transparent rounded border border-transparent hover:border-[#e4e4e7] focus:border-[#24b47e] outline-none"
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              step="0.05"
                              value={Number.isFinite(sg.ciLower) ? sg.ciLower : ''}
                              onChange={(e) =>
                                handleUpdateSubgroup(idx, 'ciLower', parseNumericInput(e.target.value))
                              }
                              className="w-13 px-1 py-0.5 font-mono bg-transparent rounded border border-transparent hover:border-[#e4e4e7] focus:border-[#24b47e] outline-none"
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              step="0.05"
                              value={Number.isFinite(sg.ciUpper) ? sg.ciUpper : ''}
                              onChange={(e) =>
                                handleUpdateSubgroup(idx, 'ciUpper', parseNumericInput(e.target.value))
                              }
                              className="w-13 px-1 py-0.5 font-mono bg-transparent rounded border border-transparent hover:border-[#e4e4e7] focus:border-[#24b47e] outline-none"
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              value={Number.isFinite(sg.iSquared) ? sg.iSquared : ''}
                              onChange={(e) =>
                                handleUpdateSubgroup(idx, 'iSquared', parseNumericInput(e.target.value))
                              }
                              className="w-11 px-1 py-0.5 font-mono text-[#24b47e] font-semibold bg-transparent rounded border border-transparent hover:border-[#e4e4e7] focus:border-[#24b47e] outline-none"
                            />
                          </td>
                          <td className="p-1 text-center">
                            <button
                              onClick={() => handleRemoveSubgroup(idx)}
                              className="text-[#71717a] hover:text-red-500 transition-colors cursor-pointer"
                              title="Delete Subgroup"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {spec.kind === 'grouped-bar' && !isPanelBoundToDataset && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0f172a] dark:text-[#f4f4f5]">
                    Outcome Event Rates ({spec.groups.length})
                  </span>
                  <button
                    onClick={handleAddGroupedBar}
                    className="flex items-center gap-1 px-2 py-1 bg-[#24b47e]/15 text-[#24b47e] hover:bg-[#24b47e]/25 text-[11px] font-semibold rounded-md transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Outcome</span>
                  </button>
                </div>
                <div className="border border-[#e4e4e7] dark:border-[#27272a] rounded-lg overflow-x-auto text-[11px]">
                  <table className="w-full text-left">
                    <thead className="bg-[#f4f4f5] dark:bg-[#18181b] border-b border-[#e4e4e7] dark:border-[#27272a]">
                      <tr>
                        <th className="p-1.5 font-semibold">Outcome</th>
                        <th className="p-1.5 font-semibold w-20">Treatment %</th>
                        <th className="p-1.5 font-semibold w-20">Control %</th>
                        <th className="p-1.5 w-6"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e4e4e7] dark:divide-[#27272a]">
                      {spec.groups.map((g, idx) => (
                        <tr key={g.id || idx}>
                          <td className="p-1">
                            <input
                              type="text"
                              value={g.category}
                              onChange={(e) => handleUpdateGroupedBar(idx, 'category', e.target.value)}
                              className="w-full px-1 py-0.5 bg-transparent rounded border border-transparent hover:border-[#e4e4e7] focus:border-[#24b47e] outline-none font-medium"
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              step="1"
                              value={Number.isFinite(g.treatmentVal) ? g.treatmentVal : ''}
                              onChange={(e) =>
                                handleUpdateGroupedBar(
                                  idx,
                                  'treatmentVal',
                                  parseNumericInput(e.target.value)
                                )
                              }
                              className="w-18 px-1 py-0.5 font-mono text-emerald-600 font-semibold bg-transparent rounded border border-transparent hover:border-[#e4e4e7] focus:border-[#24b47e] outline-none"
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              step="1"
                              value={Number.isFinite(g.controlVal) ? g.controlVal : ''}
                              onChange={(e) =>
                                handleUpdateGroupedBar(
                                  idx,
                                  'controlVal',
                                  parseNumericInput(e.target.value)
                                )
                              }
                              className="w-18 px-1 py-0.5 font-mono text-[#71717a] bg-transparent rounded border border-transparent hover:border-[#e4e4e7] focus:border-[#24b47e] outline-none"
                            />
                          </td>
                          <td className="p-1 text-center">
                            <button
                              onClick={() => handleRemoveGroupedBar(idx)}
                              className="text-[#71717a] hover:text-red-500 transition-colors cursor-pointer"
                              title="Delete Outcome"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {isPanelBoundToDataset && currentDatasetProfile && (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div>
          <span className="text-xs font-bold text-[#0f172a] dark:text-[#f4f4f5] block">
            Dataset Records ({currentDatasetProfile.title})
          </span>
          <span className="text-[10px] text-[#71717a] block">
            {currentDatasetProfile.records.length} total observations (editable table)
          </span>
        </div>
      </div>
      <button
        onClick={handleAddDatasetRecord}
        className="flex items-center gap-1 px-2 py-1 bg-[#24b47e]/15 text-[#24b47e] hover:bg-[#24b47e]/25 text-[11px] font-semibold rounded-md transition-colors"
      >
        <Plus className="w-3 h-3" />
        <span>Add Row</span>
      </button>
    </div>
    {currentDatasetProfile.fields.length > 0 ? (
      <div className="border border-[#e4e4e7] dark:border-[#27272a] rounded-lg overflow-x-auto max-h-72 text-[11px]">
        <table className="w-full text-left">
          <thead className="bg-[#f4f4f5] dark:bg-[#18181b] border-b border-[#e4e4e7] dark:border-[#27272a] sticky top-0">
            <tr>
                          {currentDatasetProfile.fields.map((f) => (
                <th key={f.name} className="p-1.5 font-semibold">
                  {f.name}
                </th>
              ))}
              <th className="p-1.5 w-6"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e4e4e7] dark:divide-[#27272a]">
            {currentDatasetProfile.records.map((r, idx) => (
              <tr key={idx}>
                                {currentDatasetProfile.fields.map((f) => (
                  <td key={f.name} className="p-1">
                    <input
                      type={f.type === 'quantitative' ? 'number' : 'text'}
                      step={f.type === 'quantitative' ? 'any' : undefined}
                      value={r[f.name] === undefined || r[f.name] === null ? '' : String(r[f.name])}
                      onChange={(e) => handleUpdateDatasetRecord(idx, f.name, e.target.value)}
                      className="w-full px-1 py-0.5 bg-transparent rounded border border-transparent hover:border-[#e4e4e7] focus:border-[#24b47e] outline-none font-mono"
                    />
                  </td>
                ))}
                <td className="p-1 text-center">
                  <button
                    onClick={() => handleRemoveDatasetRecord(idx)}
                    className="text-[#71717a] hover:text-red-500 transition-colors cursor-pointer"
                    title="Delete Observation"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="text-[11px] text-[#71717a]">No fields detected in this dataset.</div>
    )}
  </div>
)}

            {spec.kind === 'text-caption' && (
              <div className="space-y-3 text-xs">
                <span className="font-bold text-[#0f172a] dark:text-[#f4f4f5] block">
                  Caption Data & Typography
                </span>
                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] text-[#71717a] dark:text-[#a1a1aa] mb-1">
                      Figure Title / Header
                    </label>
                    <input
                      type="text"
                      value={spec.title || ''}
                      onChange={(e) => handleSpecChange('title', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs outline-none focus:border-[#24b47e]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#71717a] dark:text-[#a1a1aa] mb-1">
                      Caption Description Text
                    </label>
                    <textarea
                      rows={4}
                      value={spec.captionText || ''}
                      onChange={(e) => handleSpecChange('captionText', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs outline-none focus:border-[#24b47e]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#71717a] dark:text-[#a1a1aa] mb-1">
                      Font Size (px)
                    </label>
                    <input
                      type="number"
                      min={8}
                      max={24}
                      value={spec.fontSize || 12}
                      onChange={(e) => handleSpecChange('fontSize', parseNumericInput(e.target.value))}
                      className="w-24 px-2.5 py-1.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs outline-none focus:border-[#24b47e]"
                    />
                  </div>
                </div>
              </div>
            )}

          </div>
        </TabsContent>

        {/* Tab 3: Export Tab */}
        <TabsContent value="export" className="mt-0 flex-1">
          <div className="p-4 space-y-4">
            <div>
              <div className="text-xs font-bold text-[#0f172a] dark:text-[#f4f4f5] mb-2">
                Selected Panel ({selectedPanel.label})
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => onExportPanelPng(selectedPanel.id)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-[#24b47e] hover:bg-[#1f9d6e] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Panel as PNG</span>
                </button>
                <button
                  onClick={() => onExportPanelSvg(selectedPanel.id)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-[#f4f4f5] dark:bg-[#1f1f23] hover:bg-[#e4e4e7] dark:hover:bg-[#27272a] text-xs font-medium rounded-lg transition-colors text-[#0f172a] dark:text-[#f4f4f5] cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Panel as SVG</span>
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-[#e4e4e7] dark:border-[#27272a]">
              <div className="text-xs font-bold text-[#0f172a] dark:text-[#f4f4f5] mb-2">
                Complete Figure ({figure.name})
              </div>
              <div className="space-y-2">
                <button
                  onClick={onExportFullPng}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-[#24b47e] hover:bg-[#1f9d6e] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Figure (High-Res PNG)</span>
                </button>
                <button
                  onClick={onExportFullSvg}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-[#f4f4f5] dark:bg-[#1f1f23] hover:bg-[#e4e4e7] dark:hover:bg-[#27272a] text-xs font-medium rounded-lg transition-colors text-[#0f172a] dark:text-[#f4f4f5] cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Figure (Vector SVG)</span>
                </button>
                <button
                  onClick={onExportJson}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-[#f4f4f5] dark:bg-[#1f1f23] hover:bg-[#e4e4e7] dark:hover:bg-[#27272a] text-xs font-medium rounded-lg transition-colors text-[#0f172a] dark:text-[#f4f4f5] cursor-pointer"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Export Figure Spec (JSON)</span>
                </button>
              </div>
            </div>
          </div>
        </TabsContent>
        </Tabs>
      </div>

      {/* Save As Theme Big Button at Bottom of Sidebar */}
      <div className="p-4 border-t border-[#e4e4e7] dark:border-[#27272a] shrink-0">
        <button
          onClick={onOpenSaveThemeModal}
          className="w-full py-2.5 px-4 bg-[#24b47e] hover:bg-[#1f9d6e] text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center cursor-pointer"
        >
          <span>Save as Theme</span>
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Right Sidebar */}
      <div className="hidden md:flex shrink-0 z-30 h-full">
        {onToggleCollapse && (
          <SidebarSeparator side="right" isCollapsed={isCollapsed} onToggle={onToggleCollapse} />
        )}
        {!isCollapsed && (
          <div className="w-80 h-full border-l border-[#e4e4e7] dark:border-[#27272a]">
            {sidebarContent}
          </div>
        )}
      </div>

      {/* Mobile Right Sidebar Sheet */}
      {isOpenMobile && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col bg-white dark:bg-[#121212]">
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#f8f9fa] dark:bg-[#18181b] border-b border-[#e4e4e7] dark:border-[#27272a] shrink-0">
            <span className="font-bold text-xs text-[#0f172a] dark:text-[#f4f4f5]">
              Inspector: {selectedPanel?.label || 'Panel Properties'}
            </span>
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="px-3 py-1 bg-[#24b47e] text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <span>Done</span>
              </button>
            )}
          </div>
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
