import React, { useState } from 'react';
import {
  Settings,
  Sliders,
  Check,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Monitor,
  FileCheck,
  Shield,
  Layers,
  Info,
} from 'lucide-react';
import { MultiPanelFigure } from '../../types/multipanel';

interface SettingsViewProps {
  figure: MultiPanelFigure;
  onUpdateCanvasSize: (width: number, height: number) => void;
  onNavigate: (view: 'figures' | 'dashboard' | 'data' | 'analyses' | 'notes' | 'settings' | 'help') => void;
}

const JOURNAL_PRESETS = [
  { name: 'Nature (Single Column, 89mm)', width: 680, height: 600, desc: 'Single-column standard layout' },
  { name: 'Nature (1.5 Column, 120mm)', width: 900, height: 750, desc: 'Intermediate width for combined plots' },
  { name: 'Nature (Double Column, 183mm)', width: 1380, height: 860, desc: 'Full-width multi-panel grid' },
  { name: 'Cell / PNAS (Full Page)', width: 1350, height: 950, desc: 'Comprehensive manuscript figure' },
  { name: 'The Lancet (2-Column)', width: 1280, height: 800, desc: 'Two-column standard layout' },
  { name: 'Presentation (16:9 Full HD)', width: 1920, height: 1080, desc: 'Conference slides & widescreen' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  figure,
  onUpdateCanvasSize,
  onNavigate,
}) => {
  const [width, setWidth] = useState(figure.canvasSize.width);
  const [height, setHeight] = useState(figure.canvasSize.height);
  const [dpi, setDpi] = useState<number>(300);
  const [applied, setApplied] = useState(false);

  const handleApplySize = (w: number, h: number) => {
    setWidth(w);
    setHeight(h);
    onUpdateCanvasSize(w, h);
    setApplied(true);
    setTimeout(() => setApplied(false), 2500);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#fafafa] dark:bg-[#0f0f11] text-[#0f172a] dark:text-[#f4f4f5] p-3 sm:p-6 lg:p-8 select-text min-w-0">
      <div className="max-w-4xl mx-auto space-y-6 min-w-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e4e4e7] dark:border-[#27272a] min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-[#71717a] dark:text-[#a1a1aa] font-mono truncate">
                {figure.canvasSize.width} × {figure.canvasSize.height} px
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0f172a] dark:text-[#f4f4f5] tracking-tight truncate">
              Canvas & Layout Settings
            </h1>
            <p className="text-xs text-[#71717a] dark:text-[#a1a1aa] mt-0.5 line-clamp-2">
              Journal dimension standards, export resolution, and layout guidance
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {applied && (
              <span className="text-xs font-semibold text-[#24b47e] flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Dimensions Updated!
              </span>
            )}
            <button
              onClick={() => handleApplySize(width, height)}
              className="px-4 py-2 bg-[#24b47e] hover:bg-[#1f9d6e] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-xs whitespace-nowrap shrink-0"
            >
              <span>Save & Apply</span>
            </button>
          </div>
        </div>

        {/* Section 1: Academic Journal Presets */}
        <div className="p-5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#0f172a] dark:text-[#f4f4f5]">
                Academic Journal Dimension Presets
              </h2>
              <p className="text-xs text-[#71717a]">
                Standard print geometry calibrated to journal column guidelines
              </p>
            </div>
            <FileCheck className="w-4 h-4 text-[#24b47e]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {JOURNAL_PRESETS.map((preset) => {
              const isSelected = width === preset.width && height === preset.height;
              return (
                <button
                  key={preset.name}
                  onClick={() => handleApplySize(preset.width, preset.height)}
                  className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#24b47e] bg-[#24b47e]/5 dark:bg-[#24b47e]/10'
                      : 'border-[#e4e4e7] dark:border-[#27272a] hover:border-[#a1a1aa]'
                  }`}
                >
                  <div className="text-xs font-bold text-[#0f172a] dark:text-[#f4f4f5] mb-1">
                    {preset.name}
                  </div>
                  <div className="font-mono text-[11px] text-[#24b47e] font-semibold">
                    {preset.width} × {preset.height} px
                  </div>
                  <div className="text-[10px] text-[#71717a] mt-1">{preset.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Custom Dimensions & Resolution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-[#0f172a] dark:text-[#f4f4f5]">
              Custom Canvas Dimensions
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#71717a] mb-1">
                  Width (px)
                </label>
                <input
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                  step={10}
                  min={400}
                  max={4000}
                  className="w-full px-3 py-2 bg-[#f8f9fa] dark:bg-[#121212] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs font-mono font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#71717a] mb-1">
                  Height (px)
                </label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  step={10}
                  min={300}
                  max={4000}
                  className="w-full px-3 py-2 bg-[#f8f9fa] dark:bg-[#121212] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs font-mono font-bold outline-none"
                />
              </div>
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-[#0f172a] dark:text-[#f4f4f5]">
              Export DPI & Raster Quality
            </h2>

            <div>
              <label className="block text-xs font-bold text-[#71717a] mb-1">
                Print Resolution
              </label>
              <select
                value={dpi}
                onChange={(e) => setDpi(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#f8f9fa] dark:bg-[#121212] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs font-semibold outline-none cursor-pointer"
              >
                <option value={72}>72 DPI (Standard Web Preview)</option>
                <option value={150}>150 DPI (Draft Proofing)</option>
                <option value={300}>300 DPI (Journal Print Standard)</option>
                <option value={600}>600 DPI (High-Resolution Vector Graphics)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-4 bg-[#24b47e]/5 dark:bg-[#24b47e]/10 border border-[#24b47e]/20 rounded-xl flex items-start gap-3">
          <Layers className="w-4 h-4 text-[#168a5b] dark:text-[#52d69a] mt-0.5 shrink-0" />
          <div>
            <h2 className="text-xs font-bold text-[#0f172a] dark:text-[#f4f4f5]">Layout assistance</h2>
            <p className="text-xs text-[#71717a] dark:text-[#a1a1aa] mt-1 leading-relaxed">
              Panels snap to a 10 px grid when moved or resized. In the canvas toolbar, use <strong>Tidy layout</strong> to return every plot and caption to a balanced publication-ready grid.
            </p>
          </div>
        </div>

        {/* Section 3: WebMCP Protocol & Architectural Invariants */}
        <div className="p-5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#24b47e]" />
            <h2 className="text-sm font-bold text-[#0f172a] dark:text-[#f4f4f5]">
              WebMCP Protocol & Agent Invariants
            </h2>
          </div>
          <div className="text-xs text-[#71717a] space-y-2 leading-relaxed">
            <p>
              • <strong>Agent Scope:</strong> WebMCP tools are exposed progressively for the page you are viewing. On a figure page, the agent can propose changes to any panel type; applying any proposal always requires native human confirmation.
            </p>
            <p>
              • <strong>Optimistic Concurrency Control (OCC):</strong> Revisions require matching base revision numbers to prevent race conditions during figure editing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
