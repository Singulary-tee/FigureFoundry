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
import { globalDomainStore } from '../../packages/domain/store';

interface NotesViewProps {
  figure: MultiPanelFigure;
  domainState: DomainState;
  onNavigate: (view: 'figures' | 'dashboard' | 'data' | 'analyses' | 'notes' | 'settings' | 'help') => void;
}

export const NotesView: React.FC<NotesViewProps> = ({ figure, domainState, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'legend' | 'methods' | 'markdown'>('legend');
  const [legendText, setLegendText] = useState('');
  const [methodsText, setMethodsText] = useState('');
  const [hasEdited, setHasEdited] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  
  const projectId = domainState.activeProjectId;
  const project = domainState.projects.find(p => p.id === projectId);
  const projectName = project ? project.name : 'Unknown Project';

  useEffect(() => {
    const saved = domainState.notesByFigureId[figure.id];
    const numbered = figure.panels.filter((panel) => panel.letter);
    const titles = numbered
      .map((panel) => {
        const spec = panel.spec as any;
        return `(${panel.letter}) ${spec.title || spec.spec?.title || panel.label || panel.spec.kind}`;
      })
      .join(', ');
    const caption = figure.panels.find((panel) => !panel.letter && panel.spec.kind === 'text-caption');
    const captionSpec = caption?.spec as any;

    setLegendText(saved?.legend || [
      captionSpec?.title || `Figure 1. ${figure.name}.`,
      captionSpec?.captionText,
      titles ? `Panels: ${titles}.` : '',
    ].filter(Boolean).join('\n\n'));
    setMethodsText(saved?.methods || '');
    setHasEdited(false);
  }, [domainState.notesByFigureId, figure.id, figure.name, figure.panels]);

  // Auto-save on change with debounce
  useEffect(() => {
    if (!hasEdited) return;
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      globalDomainStore.dispatch({
        type: 'SET_FIGURE_NOTES',
        payload: { figureId: figure.id, notes: { legend: legendText, methods: methodsText } },
      });
      setSaveStatus('saved');
    }, 500);
    return () => clearTimeout(timer);
  }, [figure.id, legendText, methodsText, hasEdited]);

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
                onChange={(e) => { setHasEdited(true); setLegendText(e.target.value); }}
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
                onChange={(e) => { setHasEdited(true); setMethodsText(e.target.value); }}
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
            <div className="flex items-center justify-between gap-3 not-italic whitespace-normal">
              <div className="text-sm font-bold text-[#24b47e]"># {figure.name}</div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={handleCopyMarkdown} className="px-2.5 py-1.5 rounded-md border border-[#e4e4e7] dark:border-[#27272a] text-[11px] font-sans font-semibold flex items-center gap-1.5 hover:bg-[#f4f4f5] dark:hover:bg-[#27272a]">
                  {copied ? <Check className="w-3.5 h-3.5 text-[#24b47e]" /> : <Copy className="w-3.5 h-3.5 text-[#71717a]" />}{copied ? 'Copied' : 'Copy MD'}
                </button>
                <button onClick={handleDownloadMarkdown} className="px-2.5 py-1.5 rounded-md border border-[#e4e4e7] dark:border-[#27272a] text-[11px] font-sans font-semibold flex items-center gap-1.5 hover:bg-[#f4f4f5] dark:hover:bg-[#27272a]">
                  <Download className="w-3.5 h-3.5 text-[#71717a]" /> Export .md
                </button>
              </div>
            </div>
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
