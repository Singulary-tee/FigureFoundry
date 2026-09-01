import React, { useState, useEffect } from 'react';
import {
  FileText,
  Save,
  Download,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  RefreshCw,
  BookOpen,
  FileCode,
} from 'lucide-react';
import { MultiPanelFigure } from '../../types/multipanel';
import { DomainState } from '../../packages/domain/state';

interface NotesViewProps {
  figure: MultiPanelFigure;
  domainState: DomainState;
  onNavigate: (view: 'figures' | 'dashboard' | 'data' | 'analyses' | 'notes' | 'settings' | 'help') => void;
}

const STORAGE_KEY_PREFIX = 'figurefoundry_notes_';

export const NotesView: React.FC<NotesViewProps> = ({ figure, domainState, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'legend' | 'methods' | 'markdown'>('legend');
  const [legendText, setLegendText] = useState('');
  const [methodsText, setMethodsText] = useState('');
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  
  const projectId = domainState.activeProjectId;
  const project = domainState.projects.find(p => p.id === projectId);
  const projectName = project ? project.name : 'Unknown Project';

  // Load existing notes or auto-generate initial draft
  useEffect(() => {
    try {
      const storedLegend = localStorage.getItem(`${STORAGE_KEY_PREFIX}legend_${projectId}`);
      const storedMethods = localStorage.getItem(`${STORAGE_KEY_PREFIX}methods_${projectId}`);

      if (storedLegend) {
        setLegendText(storedLegend);
      } else {
        // Auto-generate a starting draft from the actual panel specs
        const lines: string[] = [];
        const numbered = figure.panels.filter((p) => p.letter);
        const caption = figure.panels.find((p) => !p.letter && p.spec.kind === 'text-caption');
        const titles = numbered
          .map((p) => {
            const s = p.spec as any;
            const t = s.title || s.spec?.title || p.label || p.spec.kind;
            return `(${p.letter}) ${t}`;
          })
          .join(', ');
        if (caption) {
          const c = caption.spec as any;
          lines.push(`${c.title || 'Figure caption'}`);
          lines.push(c.captionText || '');
        } else {
          lines.push(`Figure 1. ${figure.name}.`);
        }
        lines.push(`Panels: ${titles}.`);
        lines.push('Edit this draft freely — it is saved per project in this browser.');
        setLegendText(lines.filter(Boolean).join('\n\n'));
      }

      if (storedMethods) {
        setMethodsText(storedMethods);
      } else {
        const defaultMethods = `Statistical Methodology:\nMeta-analytic synthesis was performed using random-effects modeling (DerSimonian-Laird estimator) with inverse-variance study weighting. Heterogeneity was quantified via Cochran's Q test and Higgins' I² inconsistency metric. Potential publication bias and small-study effects were audited using Egger's linear regression of standard normal deviates on precision.`;
        setMethodsText(defaultMethods);
      }
    } catch {
      // Ignore localStorage read errors
    }
  }, [projectId, figure.id, figure.name, figure.panels, projectName]);

  // Auto-save on change with debounce
  useEffect(() => {
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}legend_${projectId}`, legendText);
        localStorage.setItem(`${STORAGE_KEY_PREFIX}methods_${projectId}`, methodsText);
        setSaveStatus('saved');
      } catch {}
    }, 500);
    return () => clearTimeout(timer);
  }, [legendText, methodsText, projectId]);

  const handleCopyMarkdown = () => {
    const fullDoc = `# ${projectName}\n\n## Figure Legend\n${legendText}\n\n## Methods Section\n${methodsText}`;
    navigator.clipboard.writeText(fullDoc);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadMarkdown = () => {
    const fullDoc = `# ${projectName}\n\n## Figure Legend\n${legendText}\n\n## Methods Section\n${methodsText}`;
    const blob = new Blob([fullDoc], { type: 'text/markdown;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${projectName.toLowerCase().replace(/\s+/g, '_')}_manuscript_draft.md`;
    link.click();
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#fafafa] dark:bg-[#0f0f11] text-[#0f172a] dark:text-[#f4f4f5] p-3 sm:p-6 lg:p-8 select-text min-w-0">
      <div className="max-w-4xl mx-auto space-y-6 min-w-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e4e4e7] dark:border-[#27272a] min-w-0">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-[#0f172a] dark:text-[#f4f4f5] tracking-tight truncate">
              Legends & Manuscript Notes
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleCopyMarkdown}
              className="px-3 py-2 rounded-lg bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] text-xs font-semibold text-[#0f172a] dark:text-[#f4f4f5] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#24b47e] shrink-0" /> : <Copy className="w-3.5 h-3.5 text-[#71717a] shrink-0" />}
              <span>{copied ? 'Copied' : 'Copy MD'}</span>
            </button>
            <button
              onClick={handleDownloadMarkdown}
              className="px-3 py-2 rounded-lg bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] text-xs font-semibold text-[#0f172a] dark:text-[#f4f4f5] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-[#71717a] shrink-0" />
              <span>Export .md</span>
            </button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-2 border-b border-[#e4e4e7] dark:border-[#27272a]">
          <button
            onClick={() => setActiveTab('legend')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'legend'
                ? 'border-[#24b47e] text-[#24b47e]'
                : 'border-transparent text-[#71717a] hover:text-[#0f172a] dark:hover:text-[#f4f4f5]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Figure Legend & Captions</span>
          </button>
          <button
            onClick={() => setActiveTab('methods')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'methods'
                ? 'border-[#24b47e] text-[#24b47e]'
                : 'border-transparent text-[#71717a] hover:text-[#0f172a] dark:hover:text-[#f4f4f5]'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Statistical Methods Paragraph</span>
          </button>
          <button
            onClick={() => setActiveTab('markdown')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'markdown'
                ? 'border-[#24b47e] text-[#24b47e]'
                : 'border-transparent text-[#71717a] hover:text-[#0f172a] dark:hover:text-[#f4f4f5]'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>Markdown Preview</span>
          </button>
        </div>

        {/* Tab 1: Figure Legend Editor */}
        {activeTab === 'legend' && (
          <div className="space-y-4">
            <div className="p-4 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl shadow-xs space-y-3">
              <label className="block text-xs font-bold text-[#0f172a] dark:text-[#f4f4f5]">
                Figure Caption (Panel Breakdown)
              </label>
              <textarea
                value={legendText}
                onChange={(e) => setLegendText(e.target.value)}
                rows={12}
                className="w-full p-4 bg-[#f8f9fa] dark:bg-[#121212] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs leading-relaxed font-sans outline-none focus:border-[#24b47e]"
                placeholder="Draft figure legend here..."
              />
            </div>
          </div>
        )}

        {/* Tab 2: Methods Section Editor */}
        {activeTab === 'methods' && (
          <div className="space-y-4">
            <div className="p-4 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl shadow-xs space-y-3">
              <label className="block text-xs font-bold text-[#0f172a] dark:text-[#f4f4f5]">
                Methodology & Statistical Protocol
              </label>
              <textarea
                value={methodsText}
                onChange={(e) => setMethodsText(e.target.value)}
                rows={12}
                className="w-full p-4 bg-[#f8f9fa] dark:bg-[#121212] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs leading-relaxed font-sans outline-none focus:border-[#24b47e]"
                placeholder="Describe your data preparation and analytical modeling..."
              />
            </div>
          </div>
        )}

        {/* Tab 3: Markdown Preview */}
        {activeTab === 'markdown' && (
          <div className="p-6 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl shadow-xs space-y-4 font-mono text-xs text-[#0f172a] dark:text-[#f4f4f5] whitespace-pre-wrap leading-relaxed">
            <div className="text-sm font-bold text-[#24b47e]"># {figure.name}</div>
            <div className="text-xs font-bold text-sky-600 dark:text-sky-400">## Figure Legend</div>
            <div>{legendText}</div>
            <div className="text-xs font-bold text-sky-600 dark:text-sky-400">## Methods Section</div>
            <div>{methodsText}</div>
          </div>
        )}
      </div>
    </div>
  );
};
