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
  RefreshCw,
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
  SingleChartSpec,
  CanvasTheme,
} from '../../types/multipanel';
import { runMetaAnalysis, generateFunnelPlotData } from '../../packages/stats/metaAnalysis';
import { profileDataset, registerRuntimeDataset, getRegisteredDatasets } from '../../packages/data-model/profiler';

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

  // Compute live meta-analysis stats for Forest Plot
  const currentMetaStats = useMemo(() => {
    if (spec?.kind === 'forest-plot') {
      return runMetaAnalysis(
        (spec as ForestPlotSpec).studies,
        (spec as ForestPlotSpec).model as any,
        (spec as ForestPlotSpec).effectMeasure as any
      );
    }
    return null;
  }, [spec]);

    // Single chart runtime dataset records editing handlers
  const activeDatasetId =
    selectedDatasetId ||
    (spec?.kind === 'single-chart' && spec.datasetId) ||
    'palmer-penguins';
  const [datasetRecordVersion, setDatasetRecordVersion] = useState(0);

  const currentDatasetProfile = useMemo(() => {
    if (spec?.kind === 'single-chart') {
      return profileDataset(activeDatasetId);
    }
    return null;
  }, [spec, activeDatasetId, datasetRecordVersion]);

  const chartFields = currentDatasetProfile?.fields || [];
  const updateChartDataset = (datasetId: string) => {
    if (spec?.kind !== 'single-chart') return;
    onSelectDataset?.(datasetId);
    onUpdatePanelSpec(selectedPanel.id, { ...spec, datasetId });
  };
  const updateChartEncoding = (channel: 'x' | 'y' | 'color' | 'shape', field: string) => {
    if (spec?.kind !== 'single-chart') return;
    const current = ((spec as SingleChartSpec).spec || {}) as any;
    const existing = current.encoding?.[channel] || {};
    onUpdatePanelSpec(selectedPanel.id, {
      ...spec,
      datasetId: activeDatasetId,
      spec: {
        ...current,
        encoding: {
          ...(current.encoding || {}),
          [channel]: { ...existing, field, type: chartFields.find((item) => item.name === field)?.type || existing.type || 'nominal' },
        },
      },
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
      // Re-run statistical meta-analysis with the updated model
      const meta = runMetaAnalysis(updatedSpec.studies, updatedSpec.model as any, updatedSpec.effectMeasure as any);
      onUpdatePanelSpec(selectedPanel.id, {
        ...updatedSpec,
        studies: meta.studies.map((s) => ({
          id: s.id,
          study: s.study,
          effect: s.effect,
          ciLower: s.ciLower,
          ciUpper: s.ciUpper,
          weight: s.weight,
        })),
        pooledEstimate: meta.pooledEstimate,
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
    const meta = runMetaAnalysis(currentStudies, (spec as ForestPlotSpec).model as any, (spec as ForestPlotSpec).effectMeasure as any);
    onUpdatePanelSpec(selectedPanel.id, {
      ...spec,
      studies: meta.studies.map((s) => ({
        id: s.id,
        study: s.study,
        effect: s.effect,
        ciLower: s.ciLower,
        ciUpper: s.ciUpper,
        weight: s.weight,
      })),
      pooledEstimate: meta.pooledEstimate,
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
        effect: 0.8,
        ciLower: 0.55,
        ciUpper: 1.15,
        weight: 10,
      },
    ];

    const meta = runMetaAnalysis(newStudies, (spec as ForestPlotSpec).model as any, (spec as ForestPlotSpec).effectMeasure as any);
    onUpdatePanelSpec(selectedPanel.id, {
      ...spec,
      studies: meta.studies.map((s) => ({
        id: s.id,
        study: s.study,
        effect: s.effect,
        ciLower: s.ciLower,
        ciUpper: s.ciUpper,
        weight: s.weight,
      })),
      pooledEstimate: meta.pooledEstimate,
    });
  };

  const handleRemoveStudy = (index: number) => {
    if (spec.kind !== 'forest-plot') return;
    const newStudies = (spec as ForestPlotSpec).studies.filter((_, idx) => idx !== index);
    const meta = runMetaAnalysis(newStudies, (spec as ForestPlotSpec).model as any, (spec as ForestPlotSpec).effectMeasure as any);
    onUpdatePanelSpec(selectedPanel.id, {
      ...spec,
      studies: meta.studies.map((s) => ({
        id: s.id,
        study: s.study,
        effect: s.effect,
        ciLower: s.ciLower,
        ciUpper: s.ciUpper,
        weight: s.weight,
      })),
      pooledEstimate: meta.pooledEstimate,
    });
  };

  const handleSyncFunnelPlot = () => {
    if (spec.kind !== 'forest-plot' || !currentMetaStats) return;
    const funnelData = generateFunnelPlotData(currentMetaStats);
    const funnelPanel = figure.panels.find((p) => p.spec.kind === 'funnel-plot');
    if (funnelPanel) {
      onUpdatePanelSpec(funnelPanel.id, {
        ...funnelPanel.spec,
        points: funnelData.points,
      });
    }
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
        effect: 0.1,
        standardError: 0.4,
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
        treatmentVal: 25,
        controlVal: 20,
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
        effect: 0.7,
        ciLower: 0.5,
        ciUpper: 0.95,
        iSquared: 30,
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
      setDatasetRecordVersion((v) => v + 1);
      // Force update panel spec to trigger Vega chart redraw
      onUpdatePanelSpec(selectedPanel.id, { ...spec });
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
    setDatasetRecordVersion((v) => v + 1);
    onUpdatePanelSpec(selectedPanel.id, { ...spec });
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
    setDatasetRecordVersion((v) => v + 1);
    onUpdatePanelSpec(selectedPanel.id, { ...spec });
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
                      disabled={selectedPanel.isAgentEditable && isPendingApproval}
                      onChange={(e) => onConvertPanelKind(selectedPanel.id, e.target.value as PanelKind)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs font-medium text-[#0f172a] dark:text-[#f4f4f5] outline-none focus:border-[#24b47e]"
                    >
                      <option value="forest-plot">Forest Plot</option>
                      <option value="funnel-plot">Funnel Plot</option>
                      <option value="grouped-bar">Grouped Bar</option>
                      <option value="subgroup-analysis">Subgroup Analysis</option>
                      <option value="single-chart">Single Chart (Vega)</option>
                      <option value="text-caption">Text Caption</option>
                    </select>
                  </div>

                  {/* Single Chart specific Agent Badge and Controls */}
                  {spec.kind === 'single-chart' && (
                    <div className="space-y-3">
                      <div className="p-2.5 rounded-lg bg-[#f4f4f5] dark:bg-[#1f1f23] border border-[#e4e4e7] dark:border-[#27272a]">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#0f172a] dark:text-[#f4f4f5]">Agent Status</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isPendingApproval
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                            }`}
                          >
                            {isPendingApproval ? 'Awaiting agent proposal' : 'Agent-editable'}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-[#71717a] dark:text-[#a1a1aa] mb-1">Source Dataset</label>
                        <select
                          value={activeDatasetId}
                          onChange={(e) => updateChartDataset(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs font-medium text-[#0f172a] dark:text-[#f4f4f5] outline-none"
                        >
                          {(availableDatasets || []).map((dataset) => (
                            <option key={dataset.id} value={dataset.id}>{dataset.title || dataset.id}</option>
                          ))}
                        </select>
                        <p className="mt-1 text-[10px] text-[#71717a]">Choose fields from the active dataset for each channel.</p>
                      </div>

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
                          value={(spec as any).spec?.encoding?.x?.field || 'species'}
                          onChange={(e) => updateChartEncoding('x', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs font-medium text-[#0f172a] dark:text-[#f4f4f5] outline-none"
                        >
                          {chartFields.map((field) => <option key={field.name} value={field.name}>{field.name}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-[#71717a] dark:text-[#a1a1aa] mb-1">Y-Axis Variable</label>
                        <select
                          value={(spec as any).spec?.encoding?.y?.field || 'body_mass_g'}
                          onChange={(e) => updateChartEncoding('y', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs font-medium text-[#0f172a] dark:text-[#f4f4f5] outline-none"
                        >
                          {chartFields.map((field) => <option key={field.name} value={field.name}>{field.name}</option>)}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {(['color', 'shape'] as const).map((channel) => (
                          <div key={channel}>
                            <label className="block text-xs text-[#71717a] dark:text-[#a1a1aa] mb-1 capitalize">{channel} (optional)</label>
                            <select
                              value={(spec as any).spec?.encoding?.[channel]?.field || ''}
                              onChange={(e) => e.target.value && updateChartEncoding(channel, e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs font-medium text-[#0f172a] dark:text-[#f4f4f5] outline-none"
                            >
                              <option value="">None</option>
                              {chartFields.map((field) => <option key={field.name} value={field.name}>{field.name}</option>)}
                            </select>
                          </div>
                        ))}
                      </div>
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
                          <option value="Mantel-Haenszel">Mantel-Haenszel</option>
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
            {spec.kind === 'forest-plot' && (
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
                        <span className="font-bold text-[#0f172a] dark:text-[#f4f4f5]">{currentMetaStats.heterogeneity.qStatistic}</span>
                        <span className="text-[9px] text-[#71717a] block">(df={currentMetaStats.heterogeneity.df}, p={currentMetaStats.heterogeneity.pValue})</span>
                      </div>
                      <div>
                        <span className="text-[#71717a] block text-[9.5px]">Inconsistency I²</span>
                        <span className="font-bold text-[#24b47e]">{currentMetaStats.heterogeneity.iSquared}%</span>
                        <span className="text-[9px] text-[#71717a] block">{currentMetaStats.heterogeneity.iSquared > 50 ? 'Substantial' : 'Moderate'}</span>
                      </div>
                      <div>
                        <span className="text-[#71717a] block text-[9.5px]">Variance τ²</span>
                        <span className="font-bold text-[#0f172a] dark:text-[#f4f4f5]">{currentMetaStats.heterogeneity.tauSquared}</span>
                        <span className="text-[9px] text-[#71717a] block">τ = {currentMetaStats.heterogeneity.tau}</span>
                      </div>
                    </div>
                    <div className="pt-1.5 border-t border-[#e4e4e7] dark:border-[#27272a] flex items-center justify-between">
                      <span className="text-[#71717a]">Pooled Effect:</span>
                      <span className="font-bold font-mono text-[#0f172a] dark:text-[#f4f4f5]">
                        {currentMetaStats.pooledEstimate.effect} [{currentMetaStats.pooledEstimate.ciLower}, {currentMetaStats.pooledEstimate.ciUpper}] (p={currentMetaStats.pooledEstimate.pValue})
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
                              value={s.effect}
                              onChange={(e) => handleUpdateStudy(idx, 'effect', parseFloat(e.target.value) || 0.01)}
                              className="w-13 px-1 py-0.5 font-mono bg-transparent rounded border border-transparent hover:border-[#e4e4e7] focus:border-[#24b47e] outline-none"
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              step="0.01"
                              value={s.ciLower}
                              onChange={(e) => handleUpdateStudy(idx, 'ciLower', parseFloat(e.target.value) || 0.01)}
                              className="w-13 px-1 py-0.5 font-mono bg-transparent rounded border border-transparent hover:border-[#e4e4e7] focus:border-[#24b47e] outline-none"
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              step="0.01"
                              value={s.ciUpper}
                              onChange={(e) => handleUpdateStudy(idx, 'ciUpper', parseFloat(e.target.value) || 0.01)}
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

                {/* Funnel Plot Synchronization Action */}
                <button
                  onClick={handleSyncFunnelPlot}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-[#f4f4f5] dark:bg-[#1f1f23] hover:bg-[#e4e4e7] dark:hover:bg-[#27272a] text-xs font-medium rounded-lg transition-colors text-[#0f172a] dark:text-[#f4f4f5] cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#24b47e]" />
                  <span>Sync Data with Funnel Plot (Panel B)</span>
                </button>
              </>
            )}

            {spec.kind === 'funnel-plot' && (
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
                        <th className="p-1.5 font-semibold w-16">Log OR</th>
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
                              value={p.effect}
                              onChange={(e) =>
                                handleUpdateFunnelPoint(idx, 'effect', parseFloat(e.target.value) || 0)
                              }
                              className="w-14 px-1 py-0.5 font-mono bg-transparent rounded border border-transparent hover:border-[#e4e4e7] focus:border-[#24b47e] outline-none"
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              step="0.05"
                              value={p.standardError}
                              onChange={(e) =>
                                handleUpdateFunnelPoint(
                                  idx,
                                  'standardError',
                                  parseFloat(e.target.value) || 0.01
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

            {spec.kind === 'subgroup-analysis' && (
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
                              value={sg.effect}
                              onChange={(e) =>
                                handleUpdateSubgroup(idx, 'effect', parseFloat(e.target.value) || 0.01)
                              }
                              className="w-13 px-1 py-0.5 font-mono bg-transparent rounded border border-transparent hover:border-[#e4e4e7] focus:border-[#24b47e] outline-none"
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              step="0.05"
                              value={sg.ciLower}
                              onChange={(e) =>
                                handleUpdateSubgroup(idx, 'ciLower', parseFloat(e.target.value) || 0.01)
                              }
                              className="w-13 px-1 py-0.5 font-mono bg-transparent rounded border border-transparent hover:border-[#e4e4e7] focus:border-[#24b47e] outline-none"
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              step="0.05"
                              value={sg.ciUpper}
                              onChange={(e) =>
                                handleUpdateSubgroup(idx, 'ciUpper', parseFloat(e.target.value) || 0.01)
                              }
                              className="w-13 px-1 py-0.5 font-mono bg-transparent rounded border border-transparent hover:border-[#e4e4e7] focus:border-[#24b47e] outline-none"
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              value={sg.iSquared}
                              onChange={(e) =>
                                handleUpdateSubgroup(idx, 'iSquared', parseInt(e.target.value, 10) || 0)
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

            {spec.kind === 'grouped-bar' && (
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
                              value={g.treatmentVal}
                              onChange={(e) =>
                                handleUpdateGroupedBar(
                                  idx,
                                  'treatmentVal',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-18 px-1 py-0.5 font-mono text-emerald-600 font-semibold bg-transparent rounded border border-transparent hover:border-[#e4e4e7] focus:border-[#24b47e] outline-none"
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              step="1"
                              value={g.controlVal}
                              onChange={(e) =>
                                handleUpdateGroupedBar(
                                  idx,
                                  'controlVal',
                                  parseFloat(e.target.value) || 0
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

            {spec.kind === 'single-chart' && currentDatasetProfile && (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {onSelectDataset && availableDatasets && availableDatasets.length > 0 && (
          <select
            value={activeDatasetId}
            onChange={(e) => updateChartDataset(e.target.value)}
            className="text-[11px] font-semibold px-2 py-1 rounded-md border border-[#e4e4e7] dark:border-[#27272a] bg-[#f4f4f5] dark:bg-[#18181b] text-[#0f172a] dark:text-[#f4f4f5]"
          >
            {availableDatasets.map((ds) => (
              <option key={ds.id} value={ds.id}>
                {ds.title || ds.name || ds.id}
              </option>
            ))}
            <option value="palmer-penguins">Palmer Penguins (demo)</option>
          </select>
        )}
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
                      onChange={(e) => handleSpecChange('fontSize', parseInt(e.target.value, 10) || 12)}
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
