import React, { useState, useEffect } from 'react';
import { FigureSpec, DatasetProfile, FigureIntent, MarkType } from '../types';
import { Check, X, SlidersHorizontal, Axis3D, Palette, Sparkles, Layers } from 'lucide-react';

interface EncodingPanelProps {
  currentSpec: FigureSpec;
  profile: DatasetProfile;
  onProposeDirectEdit: (newSpec: FigureSpec) => void;
  onDirectApply: (newSpec: FigureSpec) => void;
  isMobileModal?: boolean;
  onCloseMobileModal?: () => void;
}

type TabCategory = 'all' | 'general' | 'axes' | 'grouping' | 'style';

export const EncodingPanel: React.FC<EncodingPanelProps> = ({
  currentSpec,
  profile,
  onProposeDirectEdit,
  onDirectApply,
  isMobileModal,
  onCloseMobileModal,
}) => {
  const [draftSpec, setDraftSpec] = useState<FigureSpec | null>(currentSpec ? JSON.parse(JSON.stringify(currentSpec)) : null);
  const [activeCategory, setActiveCategory] = useState<TabCategory>('general');

  useEffect(() => {
    setDraftSpec(currentSpec ? JSON.parse(JSON.stringify(currentSpec)) : null);
  }, [currentSpec]);

  if (!draftSpec || profile.rowCount === 0) {
    return (
      <aside
        id="encoding-sidebar"
        className="w-full md:w-80 lg:w-88 xl:w-96 border-r border-[#e4e4e7] dark:border-[#262626] bg-white dark:bg-[#171717] p-4 flex flex-col items-center justify-center text-center gap-3 shrink-0 h-full transition-colors"
      >
        <p className="text-xs font-medium text-[#18181b] dark:text-[#EDEDED]">No Dataset Active</p>
        <p className="text-xs text-[#71717a] dark:text-[#737373] max-w-xs">
          Upload a dataset to unlock figure controls and encoding channels.
        </p>
      </aside>
    );
  }

  const categoricalFields = profile.fields.filter(f => f.type === 'categorical');
  const quantitativeFields = profile.fields.filter(f => f.type === 'quantitative');
  const allFields = profile.fields;

  const handleChannelFieldChange = (channelName: 'x' | 'y' | 'color' | 'shape' | 'size', fieldName: string) => {
    if (!fieldName) {
      const nextEncoding = { ...draftSpec.encoding };
      delete nextEncoding[channelName];
      setDraftSpec({ ...draftSpec, encoding: nextEncoding });
      return;
    }

    const fieldMeta = profile.fields.find(f => f.name === fieldName);
    const fieldType = fieldMeta ? fieldMeta.type : 'quantitative';
    const existing = draftSpec.encoding[channelName];

    const nextEncoding = {
      ...draftSpec.encoding,
      [channelName]: {
        ...existing,
        field: fieldName,
        type: fieldType,
        axisTitle: existing?.axisTitle || fieldName.replace(/_/g, ' '),
        legendTitle: existing?.legendTitle || fieldName.replace(/_/g, ' ')
      }
    };

    setDraftSpec({
      ...draftSpec,
      encoding: nextEncoding
    });
  };

  const handleScaleTypeChange = (channelName: 'x' | 'y', scaleType: 'linear' | 'log') => {
    const existing = draftSpec.encoding[channelName];
    if (!existing) return;

    setDraftSpec({
      ...draftSpec,
      encoding: {
        ...draftSpec.encoding,
        [channelName]: {
          ...existing,
          scaleType
        }
      }
    });
  };

  const handleZeroBaselineChange = (channelName: 'x' | 'y', zero: boolean) => {
    const existing = draftSpec.encoding[channelName];
    if (!existing) return;

    setDraftSpec({
      ...draftSpec,
      encoding: {
        ...draftSpec.encoding,
        [channelName]: {
          ...existing,
          zero
        }
      }
    });
  };

  const handleIntentChange = (intent: FigureIntent) => {
    let mark: MarkType = draftSpec.mark;
    let showsRaw = draftSpec.showsRawObservations;

    if (intent === 'distribution') {
      mark = 'boxplot';
      showsRaw = true;
    } else if (intent === 'trend') {
      mark = 'line';
    } else if (intent === 'relationship') {
      mark = 'point';
    }

    setDraftSpec({
      ...draftSpec,
      figureIntent: intent,
      mark,
      showsRawObservations: showsRaw
    });
  };

  return (
    <aside
      id="encoding-sidebar"
      className="w-full md:w-80 lg:w-88 xl:w-96 border-r border-[#e4e4e7] dark:border-[#262626] bg-white dark:bg-[#171717] flex flex-col shrink-0 min-h-0 h-full transition-colors relative overflow-hidden"
    >
      
      <div className="p-3 sm:p-4 border-b border-[#e4e4e7] dark:border-[#262626] shrink-0 bg-white dark:bg-[#171717] z-10 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-xs text-[#18181b] dark:text-[#EDEDED] leading-normal uppercase tracking-wider font-mono">
            Figure Controls
          </h2>

          {isMobileModal && (
            <button
              onClick={onCloseMobileModal}
              className="p-1.5 rounded-md bg-[#f4f4f5] dark:bg-[#1f1f1f] border border-[#e4e4e7] dark:border-[#2e2e2e] text-[#71717a] dark:text-[#8C8C8C] hover:text-[#18181b] dark:hover:text-[#EDEDED] flex items-center justify-center transition-colors min-h-[36px] min-w-[36px]"
              aria-label="Close Settings"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto p-1 bg-[#f4f4f5] dark:bg-[#121212] rounded-lg border border-[#e4e4e7] dark:border-[#262626] scrollbar-none">
          <button
            onClick={() => setActiveCategory('general')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap min-h-[32px] cursor-pointer ${
              activeCategory === 'general'
                ? 'bg-white dark:bg-[#1f1f1f] text-[#18181b] dark:text-[#EDEDED] shadow-xs'
                : 'text-[#71717a] dark:text-[#8C8C8C] hover:text-[#18181b] dark:hover:text-[#EDEDED]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>General</span>
          </button>

          <button
            onClick={() => setActiveCategory('axes')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap min-h-[32px] cursor-pointer ${
              activeCategory === 'axes'
                ? 'bg-white dark:bg-[#1f1f1f] text-[#18181b] dark:text-[#EDEDED] shadow-xs'
                : 'text-[#71717a] dark:text-[#8C8C8C] hover:text-[#18181b] dark:hover:text-[#EDEDED]'
            }`}
          >
            <Axis3D className="w-3.5 h-3.5" />
            <span>Axes</span>
          </button>

          <button
            onClick={() => setActiveCategory('grouping')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap min-h-[32px] cursor-pointer ${
              activeCategory === 'grouping'
                ? 'bg-white dark:bg-[#1f1f1f] text-[#18181b] dark:text-[#EDEDED] shadow-xs'
                : 'text-[#71717a] dark:text-[#8C8C8C] hover:text-[#18181b] dark:hover:text-[#EDEDED]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Groups</span>
          </button>

          <button
            onClick={() => setActiveCategory('style')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap min-h-[32px] cursor-pointer ${
              activeCategory === 'style'
                ? 'bg-white dark:bg-[#1f1f1f] text-[#18181b] dark:text-[#EDEDED] shadow-xs'
                : 'text-[#71717a] dark:text-[#8C8C8C] hover:text-[#18181b] dark:hover:text-[#EDEDED]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Style & Stats</span>
          </button>

          <button
            onClick={() => setActiveCategory('all')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap min-h-[32px] cursor-pointer ${
              activeCategory === 'all'
                ? 'bg-white dark:bg-[#1f1f1f] text-[#18181b] dark:text-[#EDEDED] shadow-xs'
                : 'text-[#71717a] dark:text-[#8C8C8C] hover:text-[#18181b] dark:hover:text-[#EDEDED]'
            }`}
          >
            <span>All</span>
          </button>
        </div>
      </div>

      <div className="flex-1 p-3 sm:p-4 space-y-4 overflow-y-auto min-h-0">
        
        {(activeCategory === 'general' || activeCategory === 'all') && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="input-figure-title" className="text-xs font-semibold text-[#18181b] dark:text-[#EDEDED] block leading-normal">
                Figure Title & Subtitle
              </label>
              <input
                id="input-figure-title"
                type="text"
                value={draftSpec.title}
                onChange={(e) => setDraftSpec({ ...draftSpec, title: e.target.value })}
                placeholder="Figure Title"
                className="w-full bg-[#f4f4f5] dark:bg-[#121212] border border-[#e4e4e7] dark:border-[#2e2e2e] hover:border-[#a1a1aa] dark:hover:border-[#383838] rounded-md px-3 py-2.5 text-xs text-[#18181b] dark:text-[#EDEDED] leading-normal min-h-[44px] focus:outline-none focus:border-[#3ecf8e] transition-colors"
              />
              <input
                id="input-figure-subtitle"
                type="text"
                value={draftSpec.subtitle || ''}
                onChange={(e) => setDraftSpec({ ...draftSpec, subtitle: e.target.value })}
                placeholder="Subtitle or description"
                className="w-full bg-[#f4f4f5] dark:bg-[#121212] border border-[#e4e4e7] dark:border-[#2e2e2e] hover:border-[#a1a1aa] dark:hover:border-[#383838] rounded-md px-3 py-2.5 text-xs text-[#71717a] dark:text-[#8C8C8C] leading-normal min-h-[44px] focus:outline-none focus:border-[#3ecf8e] transition-colors"
              />
            </div>

            <div className="space-y-2 pt-3 border-t border-[#e4e4e7] dark:border-[#262626]">
              <label className="text-xs font-semibold text-[#18181b] dark:text-[#EDEDED] block leading-normal">
                Analytical Intent
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['distribution', 'relationship', 'comparison', 'trend'] as FigureIntent[]).map(intent => {
                  const isSelected = draftSpec.figureIntent === intent;
                  return (
                    <button
                      key={intent}
                      id={`btn-intent-${intent}`}
                      type="button"
                      onClick={() => handleIntentChange(intent)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-medium border transition-colors cursor-pointer min-h-[44px] leading-normal ${
                        isSelected
                          ? 'bg-[#f4f4f5] dark:bg-[#1f1f1f] text-[#18181b] dark:text-[#EDEDED] border-[#3ecf8e]'
                          : 'bg-white dark:bg-[#121212] text-[#71717a] dark:text-[#8C8C8C] hover:text-[#18181b] dark:hover:text-[#EDEDED] border-[#e4e4e7] dark:border-[#262626] hover:border-[#a1a1aa] dark:hover:border-[#383838]'
                      }`}
                    >
                      <span className="capitalize">{intent}</span>
                      {isSelected && <Check className="w-4 h-4 text-[#24b47e] dark:text-[#3ecf8e] shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-[#e4e4e7] dark:border-[#262626]">
              <label htmlFor="select-mark-type" className="text-xs font-semibold text-[#18181b] dark:text-[#EDEDED] block leading-normal">
                Mark Geometry
              </label>
              <select
                id="select-mark-type"
                value={draftSpec.mark}
                onChange={(e) => setDraftSpec({ ...draftSpec, mark: e.target.value as MarkType })}
                className="w-full bg-[#f4f4f5] dark:bg-[#121212] border border-[#e4e4e7] dark:border-[#2e2e2e] hover:border-[#a1a1aa] dark:hover:border-[#383838] rounded-md px-3 py-2.5 text-xs text-[#18181b] dark:text-[#EDEDED] leading-normal min-h-[44px] focus:outline-none focus:border-[#3ecf8e] transition-colors cursor-pointer"
              >
                <option value="point" className="py-1">Points (Scatter / Jitter Cloud)</option>
                <option value="boxplot" className="py-1">Boxplot (Tukey Distribution)</option>
                <option value="bar" className="py-1">Bar (Discrete Aggregate)</option>
                <option value="line" className="py-1">Line (Continuous Trend)</option>
                <option value="area" className="py-1">Area (Cumulative Range)</option>
                <option value="tick" className="py-1">Tick (Strip Plot)</option>
              </select>
            </div>
          </div>
        )}

        {(activeCategory === 'axes' || activeCategory === 'all') && (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-[#18181b] dark:text-[#EDEDED] leading-normal uppercase tracking-wider font-mono">
              Spatial Axes Mapping
            </h3>

            <div className="space-y-2 bg-[#f8f9fa] dark:bg-[#121212] p-3 rounded-lg border border-[#e4e4e7] dark:border-[#262626]">
              <div className="flex items-center justify-between">
                <label htmlFor="select-channel-x" className="text-xs font-semibold text-[#18181b] dark:text-[#EDEDED] leading-normal">
                  X-Axis Field
                </label>
                <span className="text-[11px] text-[#71717a] dark:text-[#8C8C8C] font-mono leading-normal">
                  {draftSpec.encoding.x?.type || 'none'}
                </span>
              </div>
              <select
                id="select-channel-x"
                value={draftSpec.encoding.x?.field || ''}
                onChange={(e) => handleChannelFieldChange('x', e.target.value)}
                className="w-full bg-white dark:bg-[#171717] border border-[#e4e4e7] dark:border-[#2e2e2e] hover:border-[#a1a1aa] dark:hover:border-[#383838] rounded-md px-3 py-2.5 text-xs text-[#18181b] dark:text-[#EDEDED] leading-normal min-h-[44px] focus:outline-none focus:border-[#3ecf8e] transition-colors cursor-pointer"
              >
                {allFields.map(f => (
                  <option key={f.name} value={f.name} className="py-1">
                    {f.name} ({f.type})
                  </option>
                ))}
              </select>

              {draftSpec.encoding.x?.type === 'quantitative' && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-[#71717a] dark:text-[#8C8C8C]">
                  <label className="flex items-center gap-2 cursor-pointer leading-normal min-h-[36px] px-2 py-1 bg-white dark:bg-[#171717] rounded border border-[#e4e4e7] dark:border-[#2e2e2e]">
                    <input
                      type="checkbox"
                      checked={draftSpec.encoding.x?.scaleType === 'log'}
                      onChange={(e) => handleScaleTypeChange('x', e.target.checked ? 'log' : 'linear')}
                      className="rounded bg-white dark:bg-[#171717] border-[#e4e4e7] dark:border-[#2e2e2e] text-[#24b47e] dark:text-[#3ecf8e] focus:ring-0 w-4 h-4"
                    />
                    <span>Log Scale</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer leading-normal min-h-[36px] px-2 py-1 bg-white dark:bg-[#171717] rounded border border-[#e4e4e7] dark:border-[#2e2e2e]">
                    <input
                      type="checkbox"
                      checked={draftSpec.encoding.x?.zero ?? false}
                      onChange={(e) => handleZeroBaselineChange('x', e.target.checked)}
                      className="rounded bg-white dark:bg-[#171717] border-[#e4e4e7] dark:border-[#2e2e2e] text-[#24b47e] dark:text-[#3ecf8e] focus:ring-0 w-4 h-4"
                    />
                    <span>Include Zero</span>
                  </label>
                </div>
              )}
            </div>

            <div className="space-y-2 bg-[#f8f9fa] dark:bg-[#121212] p-3 rounded-lg border border-[#e4e4e7] dark:border-[#262626]">
              <div className="flex items-center justify-between">
                <label htmlFor="select-channel-y" className="text-xs font-semibold text-[#18181b] dark:text-[#EDEDED] leading-normal">
                  Y-Axis Field
                </label>
                <span className="text-[11px] text-[#71717a] dark:text-[#8C8C8C] font-mono leading-normal">
                  {draftSpec.encoding.y?.type || 'none'}
                </span>
              </div>
              <select
                id="select-channel-y"
                value={draftSpec.encoding.y?.field || ''}
                onChange={(e) => handleChannelFieldChange('y', e.target.value)}
                className="w-full bg-white dark:bg-[#171717] border border-[#e4e4e7] dark:border-[#2e2e2e] hover:border-[#a1a1aa] dark:hover:border-[#383838] rounded-md px-3 py-2.5 text-xs text-[#18181b] dark:text-[#EDEDED] leading-normal min-h-[44px] focus:outline-none focus:border-[#3ecf8e] transition-colors cursor-pointer"
              >
                {allFields.map(f => (
                  <option key={f.name} value={f.name} className="py-1">
                    {f.name} ({f.type})
                  </option>
                ))}
              </select>

              {draftSpec.encoding.y?.type === 'quantitative' && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-[#71717a] dark:text-[#8C8C8C]">
                  <label className="flex items-center gap-2 cursor-pointer leading-normal min-h-[36px] px-2 py-1 bg-white dark:bg-[#171717] rounded border border-[#e4e4e7] dark:border-[#2e2e2e]">
                    <input
                      type="checkbox"
                      checked={draftSpec.encoding.y?.scaleType === 'log'}
                      onChange={(e) => handleScaleTypeChange('y', e.target.checked ? 'log' : 'linear')}
                      className="rounded bg-white dark:bg-[#171717] border-[#e4e4e7] dark:border-[#2e2e2e] text-[#24b47e] dark:text-[#3ecf8e] focus:ring-0 w-4 h-4"
                    />
                    <span>Log Scale</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer leading-normal min-h-[36px] px-2 py-1 bg-white dark:bg-[#171717] rounded border border-[#e4e4e7] dark:border-[#2e2e2e]">
                    <input
                      type="checkbox"
                      checked={draftSpec.encoding.y?.zero ?? false}
                      onChange={(e) => handleZeroBaselineChange('y', e.target.checked)}
                      className="rounded bg-white dark:bg-[#171717] border-[#e4e4e7] dark:border-[#2e2e2e] text-[#24b47e] dark:text-[#3ecf8e] focus:ring-0 w-4 h-4"
                    />
                    <span>Include Zero</span>
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

        {(activeCategory === 'grouping' || activeCategory === 'all') && (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-[#18181b] dark:text-[#EDEDED] leading-normal uppercase tracking-wider font-mono">
              Data Grouping Channels
            </h3>

            <div className="space-y-1.5">
              <label htmlFor="select-channel-color" className="text-xs font-medium text-[#71717a] dark:text-[#A1A1A1] block leading-normal">
                Color Grouping Field
              </label>
              <select
                id="select-channel-color"
                value={draftSpec.encoding.color?.field || ''}
                onChange={(e) => handleChannelFieldChange('color', e.target.value)}
                className="w-full bg-[#f4f4f5] dark:bg-[#121212] border border-[#e4e4e7] dark:border-[#2e2e2e] hover:border-[#a1a1aa] dark:hover:border-[#383838] rounded-md px-3 py-2.5 text-xs text-[#18181b] dark:text-[#EDEDED] leading-normal min-h-[44px] focus:outline-none focus:border-[#3ecf8e] transition-colors cursor-pointer"
              >
                <option value="" className="py-1">(None)</option>
                {allFields.map(f => (
                  <option key={f.name} value={f.name} className="py-1">
                    {f.name} ({f.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="select-channel-shape" className="text-xs font-medium text-[#71717a] dark:text-[#A1A1A1] block leading-normal">
                Shape Grouping Field
              </label>
              <select
                id="select-channel-shape"
                value={draftSpec.encoding.shape?.field || ''}
                onChange={(e) => handleChannelFieldChange('shape', e.target.value)}
                className="w-full bg-[#f4f4f5] dark:bg-[#121212] border border-[#e4e4e7] dark:border-[#2e2e2e] hover:border-[#a1a1aa] dark:hover:border-[#383838] rounded-md px-3 py-2.5 text-xs text-[#18181b] dark:text-[#EDEDED] leading-normal min-h-[44px] focus:outline-none focus:border-[#3ecf8e] transition-colors cursor-pointer"
              >
                <option value="" className="py-1">(None)</option>
                {categoricalFields.map(f => (
                  <option key={f.name} value={f.name} className="py-1">
                    {f.name} ({f.cardinality} categories)
                  </option>
                ))}
              </select>
            </div>

            {quantitativeFields.length > 0 && (
              <div className="space-y-1.5">
                <label htmlFor="select-channel-size" className="text-xs font-medium text-[#71717a] dark:text-[#A1A1A1] block leading-normal">
                  Size Grouping Field
                </label>
                <select
                  id="select-channel-size"
                  value={draftSpec.encoding.size?.field || ''}
                  onChange={(e) => handleChannelFieldChange('size', e.target.value)}
                  className="w-full bg-[#f4f4f5] dark:bg-[#121212] border border-[#e4e4e7] dark:border-[#2e2e2e] hover:border-[#a1a1aa] dark:hover:border-[#383838] rounded-md px-3 py-2.5 text-xs text-[#18181b] dark:text-[#EDEDED] leading-normal min-h-[44px] focus:outline-none focus:border-[#3ecf8e] transition-colors cursor-pointer"
                >
                  <option value="" className="py-1">(None)</option>
                  {quantitativeFields.map(f => (
                    <option key={f.name} value={f.name} className="py-1">
                      {f.name} ({f.type})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {(activeCategory === 'style' || activeCategory === 'all') && (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-[#18181b] dark:text-[#EDEDED] leading-normal uppercase tracking-wider font-mono">
              Journal Style & Statistical Precision
            </h3>

            <div className="space-y-1.5">
              <label htmlFor="select-journal-preset" className="text-xs font-medium text-[#71717a] dark:text-[#A1A1A1] block leading-normal">
                Journal Style Preset
              </label>
              <select
                id="select-journal-preset"
                value={draftSpec.themePreset || 'light'}
                onChange={(e) => setDraftSpec({ ...draftSpec, themePreset: e.target.value as any })}
                className="w-full bg-[#f4f4f5] dark:bg-[#121212] border border-[#e4e4e7] dark:border-[#2e2e2e] hover:border-[#a1a1aa] dark:hover:border-[#383838] rounded-md px-3 py-2.5 text-xs text-[#18181b] dark:text-[#EDEDED] leading-normal min-h-[44px] focus:outline-none focus:border-[#3ecf8e] transition-colors cursor-pointer"
              >
                <option value="nature" className="py-1">Nature (Arial, 89mm width, Emerald)</option>
                <option value="science" className="py-1">Science (Serif, Science Red)</option>
                <option value="cell" className="py-1">Cell Press (Bold Cyan & Pink)</option>
                <option value="ieee" className="py-1">IEEE Transactions (Monochrome / Times)</option>
                <option value="prism" className="py-1">GraphPad Prism (Classic Blue)</option>
                <option value="light" className="py-1">Standard Light Scientific</option>
                <option value="dark" className="py-1">Presentation Dark Mode</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="select-trendline" className="text-xs font-medium text-[#71717a] dark:text-[#A1A1A1] block leading-normal">
                Regression Trendline
              </label>
              <select
                id="select-trendline"
                value={draftSpec.trendline || 'none'}
                onChange={(e) => setDraftSpec({ ...draftSpec, trendline: e.target.value as any })}
                className="w-full bg-[#f4f4f5] dark:bg-[#121212] border border-[#e4e4e7] dark:border-[#2e2e2e] hover:border-[#a1a1aa] dark:hover:border-[#383838] rounded-md px-3 py-2.5 text-xs text-[#18181b] dark:text-[#EDEDED] leading-normal min-h-[44px] focus:outline-none focus:border-[#3ecf8e] transition-colors cursor-pointer"
              >
                <option value="none" className="py-1">None</option>
                <option value="linear" className="py-1">Linear Fit (Ordinary Least Squares)</option>
                <option value="polynomial" className="py-1">Polynomial Curve</option>
                <option value="loess" className="py-1">LOESS Smooth Trend</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="select-errorbar-mode" className="text-xs font-medium text-[#71717a] dark:text-[#A1A1A1] block leading-normal">
                Error Bar Precision
              </label>
              <select
                id="select-errorbar-mode"
                value={draftSpec.errorBarMode || 'none'}
                onChange={(e) => setDraftSpec({ ...draftSpec, errorBarMode: e.target.value as any })}
                className="w-full bg-[#f4f4f5] dark:bg-[#121212] border border-[#e4e4e7] dark:border-[#2e2e2e] hover:border-[#a1a1aa] dark:hover:border-[#383838] rounded-md px-3 py-2.5 text-xs text-[#18181b] dark:text-[#EDEDED] leading-normal min-h-[44px] focus:outline-none focus:border-[#3ecf8e] transition-colors cursor-pointer"
              >
                <option value="none" className="py-1">None</option>
                <option value="sem" className="py-1">Mean ± SEM (Standard Error)</option>
                <option value="sd" className="py-1">Mean ± SD (Standard Deviation)</option>
                <option value="ci95" className="py-1">Mean ± 95% Confidence Interval</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="select-facet-by" className="text-xs font-medium text-[#71717a] dark:text-[#A1A1A1] block leading-normal">
                Subgroup Faceting Column
              </label>
              <select
                id="select-facet-by"
                value={draftSpec.facetBy?.field || ''}
                onChange={(e) => {
                  const fieldName = e.target.value;
                  if (!fieldName) {
                    setDraftSpec({ ...draftSpec, facetBy: undefined });
                  } else {
                    const fMeta = profile.fields.find(f => f.name === fieldName);
                    setDraftSpec({ ...draftSpec, facetBy: { field: fieldName, type: fMeta?.type || 'categorical' } });
                  }
                }}
                className="w-full bg-[#f4f4f5] dark:bg-[#121212] border border-[#e4e4e7] dark:border-[#2e2e2e] hover:border-[#a1a1aa] dark:hover:border-[#383838] rounded-md px-3 py-2.5 text-xs text-[#18181b] dark:text-[#EDEDED] leading-normal min-h-[44px] focus:outline-none focus:border-[#3ecf8e] transition-colors cursor-pointer"
              >
                <option value="" className="py-1">(None)</option>
                {categoricalFields.map(f => (
                  <option key={f.name} value={f.name} className="py-1">
                    {f.name} ({f.cardinality} categories)
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 sm:p-4 border-t border-[#e4e4e7] dark:border-[#262626] bg-white dark:bg-[#171717] flex flex-col gap-2 shrink-0 z-10 shadow-lg">
        <button
          id="btn-apply-figure-direct"
          type="button"
          onClick={() => {
            onDirectApply(draftSpec);
            if (onCloseMobileModal) onCloseMobileModal();
          }}
          className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-md text-xs font-semibold bg-[#3ecf8e] hover:bg-[#34b27b] text-black transition-colors cursor-pointer min-h-[44px] leading-normal shadow-xs"
        >
          Update Figure
        </button>

        <button
          id="btn-stage-figure-preview"
          type="button"
          onClick={() => {
            onProposeDirectEdit(draftSpec);
            if (onCloseMobileModal) onCloseMobileModal();
          }}
          className="w-full inline-flex items-center justify-center px-4 py-2 rounded-md text-xs font-medium text-[#18181b] dark:text-[#EDEDED] hover:text-[#000] dark:hover:text-white bg-[#f4f4f5] dark:bg-[#1f1f1f] hover:bg-[#e4e4e7] dark:hover:bg-[#282828] border border-[#e4e4e7] dark:border-[#2e2e2e] hover:border-[#a1a1aa] dark:hover:border-[#383838] transition-colors cursor-pointer min-h-[44px] leading-normal"
        >
          Preview Changes (2-Phase)
        </button>
      </div>
    </aside>
  );
};

