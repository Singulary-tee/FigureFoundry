import React from 'react';
import {
  HelpCircle,
  Command,
  Shield,
  Layers,
  ArrowRight,
  Sparkles,
  BookOpen,
  Keyboard,
} from 'lucide-react';

interface HelpViewProps {
  onNavigate: (view: 'figures' | 'dashboard' | 'data' | 'analyses' | 'notes' | 'settings' | 'help') => void;
}

const SHORTCUTS = [
  { key: 'V / S', desc: 'Select Tool — click & drag panels' },
  { key: 'H', desc: 'Pan Canvas Tool' },
  { key: 'T', desc: 'Add Text Annotation' },
  { key: 'R / O', desc: 'Shape Tool (Rectangle / Circle)' },
  { key: 'L / A', desc: 'Line & Arrow Tools' },
  { key: 'Ctrl + Z', desc: 'Undo last figure modification' },
  { key: 'Ctrl + Shift + Z', desc: 'Redo modification' },
  { key: 'Delete / Backspace', desc: 'Delete selected panel / annotation' },
  { key: 'Scroll Wheel', desc: 'Pan canvas vertically' },
  { key: 'Ctrl + Wheel', desc: 'Zoom canvas in / out' },
];

export const HelpView: React.FC<HelpViewProps> = ({ onNavigate }) => {
  return (
    <div className="flex-1 overflow-y-auto bg-[#fafafa] dark:bg-[#0f0f11] text-[#0f172a] dark:text-[#f4f4f5] p-3 sm:p-6 lg:p-8 select-text min-w-0">
      <div className="max-w-4xl mx-auto space-y-6 min-w-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e4e4e7] dark:border-[#27272a] min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-[#71717a] dark:text-[#a1a1aa] font-mono truncate">
                FigureFoundry Reference Guide
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0f172a] dark:text-[#f4f4f5] tracking-tight truncate">
              Help, Shortcuts & Guides
            </h1>
            <p className="text-xs text-[#71717a] dark:text-[#a1a1aa] mt-0.5 line-clamp-2">
              Comprehensive guidelines for multi-panel composition and WebMCP integration
            </p>
          </div>

          <button
            onClick={() => onNavigate('figures')}
            className="px-4 py-2 bg-[#24b47e] hover:bg-[#1f9d6e] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-xs whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            <span>Back to Canvas</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>

        {/* Keyboard Shortcuts Grid */}
        <div className="p-5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-[#24b47e]" />
            <h2 className="text-sm font-bold text-[#0f172a] dark:text-[#f4f4f5]">
              Keyboard Shortcuts
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SHORTCUTS.map((s) => (
              <div
                key={s.key}
                className="p-3 bg-[#f8f9fa] dark:bg-[#121212] rounded-lg border border-[#e4e4e7] dark:border-[#27272a] flex items-center justify-between"
              >
                <span className="text-xs text-[#71717a] dark:text-[#a1a1aa]">{s.desc}</span>
                <kbd className="px-2 py-0.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded font-mono text-[11px] font-bold text-[#0f172a] dark:text-[#f4f4f5] shadow-2xs">
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        {/* Scientific Panel Guidelines */}
        <div className="p-5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-sky-500" />
            <h2 className="text-sm font-bold text-[#0f172a] dark:text-[#f4f4f5]">
              Scientific Panel Guidelines
            </h2>
          </div>

          <div className="space-y-3 text-xs text-[#71717a] leading-relaxed">
            <div className="p-3 bg-[#f8f9fa] dark:bg-[#121212] rounded-lg border border-[#e4e4e7] dark:border-[#27272a]">
              <strong className="text-[#0f172a] dark:text-[#f4f4f5] block mb-0.5">
                Forest Plot Panels:
              </strong>
              Presents comparative effect sizes, 95% confidence intervals, and pooled summary diamonds with Cochran's Q and I² heterogeneity metrics.
            </div>

            <div className="p-3 bg-[#f8f9fa] dark:bg-[#121212] rounded-lg border border-[#e4e4e7] dark:border-[#27272a]">
              <strong className="text-[#0f172a] dark:text-[#f4f4f5] block mb-0.5">
                Funnel Plot Panels:
              </strong>
              Visualizes effect sizes against standard error with 95% and 99% pseudo-confidence limits for evaluating publication bias and study asymmetry.
            </div>

            <div className="p-3 bg-[#f8f9fa] dark:bg-[#121212] rounded-lg border border-[#e4e4e7] dark:border-[#27272a]">
              <strong className="text-[#0f172a] dark:text-[#f4f4f5] block mb-0.5">
                Grouped Bar Panels:
              </strong>
              Displays grouped comparative series with error bars and mean values across treatment arms or cohorts.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
