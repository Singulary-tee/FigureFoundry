import React, { useEffect, useRef, useState } from 'react';
import vegaEmbed from 'vega-embed';
import { FigureSpec, DatasetProfile, FigurePreview } from '../../types';
import { compileToVegaLiteSpec } from '../figure-spec/compiler';
import { Download, GitCompare, Copy, Check } from 'lucide-react';

interface VegaFigureViewProps {
  spec: FigureSpec;
  activePreview: FigurePreview | null;
  profile: DatasetProfile;
  theme: 'light' | 'dark';
  isDiffMode: boolean;
  onToggleDiffMode: () => void;
}

export const VegaFigureView: React.FC<VegaFigureViewProps> = ({
  spec,
  activePreview,
  profile,
  theme,
  isDiffMode,
  onToggleDiffMode
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [vegaViewInstance, setVegaViewInstance] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [copiedSpec, setCopiedSpec] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [previewDimensions, setPreviewDimensions] = useState({ width: 0, height: 0 });

  // Debounced ResizeObserver for main visual canvas to prevent squashing during mobile scrolling
  useEffect(() => {
    if (!containerRef.current) return;

    let debounceTimer: any = null;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const { width, height } = entry.contentRect;

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        setDimensions((prev) => {
          const widthChanged = Math.abs(prev.width - width) > 2;
          // Ignore small dynamic height shifts (e.g. from mobile address bars collapsing/expanding)
          const heightChanged = Math.abs(prev.height - height) > 40;
          if (widthChanged || heightChanged) {
            return { width, height };
          }
          return prev;
        });
      }, 100);
    });

    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      clearTimeout(debounceTimer);
    };
  }, [spec, profile]);

  // Debounced ResizeObserver for the preview/diff visual canvas
  useEffect(() => {
    if (!previewContainerRef.current) return;

    let debounceTimer: any = null;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const { width, height } = entry.contentRect;

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        setPreviewDimensions((prev) => {
          const widthChanged = Math.abs(prev.width - width) > 2;
          const heightChanged = Math.abs(prev.height - height) > 40;
          if (widthChanged || heightChanged) {
            return { width, height };
          }
          return prev;
        });
      }, 100);
    });

    observer.observe(previewContainerRef.current);
    return () => {
      observer.disconnect();
      clearTimeout(debounceTimer);
    };
  }, [isDiffMode, activePreview, profile]);

  useEffect(() => {
    if (!containerRef.current) return;
    setRenderError(null);

    const specWithTheme = { ...spec, theme };
    const vlSpec = compileToVegaLiteSpec(specWithTheme, profile, false);

    let isMounted = true;

    vegaEmbed(containerRef.current, vlSpec as any, {
      actions: false,
      renderer: 'svg',
      theme: theme === 'dark' ? 'dark' : undefined,
      hover: true
    })
      .then(res => {
        if (isMounted) {
          setVegaViewInstance(res.view);
        }
      })
      .catch(err => {
        console.error('Vega render error:', err);
        if (isMounted) {
          setRenderError(err.message || 'Failed to compile Vega-Lite specification.');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [spec, profile, theme, dimensions.width, dimensions.height]);

  useEffect(() => {
    if (!isDiffMode || !activePreview || !previewContainerRef.current) return;

    const previewSpecWithTheme = { ...(activePreview.proposedSpec as FigureSpec), theme };
    const previewVlSpec = compileToVegaLiteSpec(previewSpecWithTheme, profile, true);

    let isMounted = true;

    vegaEmbed(previewContainerRef.current, previewVlSpec as any, {
      actions: false,
      renderer: 'svg',
      theme: theme === 'dark' ? 'dark' : undefined,
      hover: true
    }).catch(err => {
      console.error('Preview Vega render error:', err);
    });

    return () => {
      isMounted = false;
    };
  }, [isDiffMode, activePreview, profile, theme, previewDimensions.width, previewDimensions.height]);

  const handleCopySpec = () => {
    const specWithTheme = { ...spec, theme };
    const vlSpec = compileToVegaLiteSpec(specWithTheme, profile, false);
    navigator.clipboard.writeText(JSON.stringify(vlSpec, null, 2));
    setCopiedSpec(true);
    setTimeout(() => setCopiedSpec(false), 2000);
  };

  const handleExport = async (format: 'svg' | 'png') => {
    if (!vegaViewInstance) return;
    setIsExporting(true);
    try {
      if (format === 'svg') {
        const svgString = await vegaViewInstance.toSVG();
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${spec.title.toLowerCase().replace(/\s+/g, '_')}.svg`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const url = await vegaViewInstance.toImageURL('png');
        const a = document.createElement('a');
        a.href = url;
        a.download = `${spec.title.toLowerCase().replace(/\s+/g, '_')}.png`;
        a.click();
      }
    } catch (e) {
      console.error('Export failed', e);
    } finally {
      setIsExporting(false);
    }
  };

  if (!spec || profile.rowCount === 0) {
    return (
      <div
        id="figure-canvas-container"
        className="flex-1 flex flex-col items-center justify-center p-8 bg-white dark:bg-[#171717] border border-[#e4e4e7] dark:border-[#262626] rounded-lg text-center min-h-[420px] w-full transition-colors"
      >
        <div className="max-w-md space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#f4f4f5] dark:bg-[#1f1f1f] border border-[#e4e4e7] dark:border-[#2e2e2e] flex items-center justify-center mx-auto text-[#24b47e] dark:text-[#3ecf8e]">
            <Download className="w-6 h-6 rotate-180" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#18181b] dark:text-[#EDEDED] leading-normal">Workspace Ready</h3>
            <p className="text-xs text-[#71717a] dark:text-[#8C8C8C] leading-relaxed mt-1">
              Import your CSV or JSON dataset using the Dataset panel, or select a sample dataset from the menu in the top bar above.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      id="figure-canvas-container"
      className="flex-1 flex flex-col bg-white dark:bg-[#171717] border border-[#e4e4e7] dark:border-[#262626] rounded-lg overflow-hidden min-h-0 w-full transition-colors"
    >
      
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 border-b border-[#e4e4e7] dark:border-[#262626] bg-[#f8f9fa] dark:bg-[#121212] gap-2.5 shrink-0 min-h-[46px] transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#71717a] dark:text-[#8C8C8C] font-mono leading-normal">
            {profile.records.length} observations • <span className="text-[#18181b] dark:text-[#EDEDED] font-medium">{spec.figureIntent.toUpperCase()}</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activePreview && (
            <button
              id="btn-toggle-diff"
              onClick={onToggleDiffMode}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer min-h-[34px] leading-normal ${
                isDiffMode
                  ? 'bg-[#f4f4f5] dark:bg-[#1f1f1f] text-[#18181b] dark:text-[#EDEDED] border-[#3ecf8e]'
                  : 'bg-white dark:bg-[#121212] text-[#71717a] dark:text-[#8C8C8C] border-[#e4e4e7] dark:border-[#262626] hover:border-[#a1a1aa] dark:hover:border-[#383838]'
              }`}
            >
              <GitCompare className="w-3.5 h-3.5 shrink-0" />
              <span>{isDiffMode ? 'Side-by-Side Diff' : 'Compare Diff'}</span>
            </button>
          )}

          <button
            id="btn-copy-spec-json"
            onClick={handleCopySpec}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[#18181b] dark:text-[#EDEDED] hover:text-[#000] dark:hover:text-white bg-[#f4f4f5] dark:bg-[#1f1f1f] hover:bg-[#e4e4e7] dark:hover:bg-[#282828] border border-[#e4e4e7] dark:border-[#2e2e2e] hover:border-[#a1a1aa] dark:hover:border-[#383838] transition-colors cursor-pointer min-h-[34px] leading-normal"
            title="Copy Vega-Lite JSON Spec"
          >
            {copiedSpec ? <Check className="w-3.5 h-3.5 text-[#24b47e] dark:text-[#3ecf8e] shrink-0" /> : <Copy className="w-3.5 h-3.5 text-[#71717a] dark:text-[#8C8C8C] shrink-0" />}
            <span>{copiedSpec ? 'Copied' : 'Copy Spec'}</span>
          </button>

          <div className="flex items-center bg-[#f4f4f5] dark:bg-[#1f1f1f] border border-[#e4e4e7] dark:border-[#2e2e2e] rounded-md p-0.5 min-h-[34px]">
            <button
              id="btn-export-svg"
              onClick={() => handleExport('svg')}
              disabled={isExporting}
              title="Export Publication SVG Vector"
              className="px-3 py-1.5 text-xs font-medium text-[#18181b] dark:text-[#EDEDED] hover:text-[#000] dark:hover:text-white hover:bg-[#e4e4e7] dark:hover:bg-[#282828] rounded transition-colors flex items-center gap-1 cursor-pointer leading-normal"
            >
              <Download className="w-3.5 h-3.5 text-[#71717a] dark:text-[#8C8C8C] shrink-0" />
              <span>SVG</span>
            </button>
            <button
              id="btn-export-png"
              onClick={() => handleExport('png')}
              disabled={isExporting}
              title="Export High-Res PNG Bitmap"
              className="px-3 py-1.5 text-xs font-medium text-[#18181b] dark:text-[#EDEDED] hover:text-[#000] dark:hover:text-white hover:bg-[#e4e4e7] dark:hover:bg-[#282828] rounded transition-colors cursor-pointer leading-normal"
            >
              PNG
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-3 sm:p-5 flex items-center justify-center overflow-x-auto overflow-y-visible min-h-[340px] w-full max-w-full bg-[#f8f9fa] dark:bg-[#121212] transition-colors">
        {renderError ? (
          <div className="p-4 max-w-md bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-800 dark:text-rose-200 text-center">
            <p className="text-xs font-semibold mb-1 leading-normal">Rendering Diagnostics</p>
            <p className="text-xs text-rose-600 dark:text-rose-300 font-mono leading-normal">{renderError}</p>
          </div>
        ) : isDiffMode && activePreview ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full h-full max-w-full">
            
            <div className="flex flex-col bg-white dark:bg-[#171717] border border-[#e4e4e7] dark:border-[#262626] rounded-lg p-3 sm:p-4 w-full max-w-full overflow-visible">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#e4e4e7] dark:border-[#262626] text-xs font-mono">
                <span className="text-[#18181b] dark:text-[#EDEDED] font-medium leading-normal">Current Active Figure</span>
                <span className="text-[#71717a] dark:text-[#8C8C8C] text-xs leading-normal">Rev {activePreview.basedOnRevision}</span>
              </div>
              <div ref={containerRef} className="w-full flex-1 flex items-center justify-center min-h-[300px] max-w-full overflow-visible p-2" />
            </div>

            <div className="flex flex-col bg-white dark:bg-[#171717] border border-[#3ecf8e]/50 dark:border-[#3ecf8e]/40 rounded-lg p-3 sm:p-4 w-full max-w-full overflow-visible">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#e4e4e7] dark:border-[#262626] text-xs font-mono">
                <span className="text-[#24b47e] dark:text-[#3ecf8e] font-medium leading-normal">Proposed Changes</span>
                <span className="text-[#71717a] dark:text-[#8C8C8C] text-xs leading-normal">Draft</span>
              </div>
              <div ref={previewContainerRef} className="w-full flex-1 flex items-center justify-center min-h-[300px] max-w-full overflow-visible p-2" />
            </div>
          </div>
        ) : (
          <div className="w-full flex items-center justify-center max-w-full overflow-visible">
            <div ref={containerRef} className="w-full max-w-4xl flex items-center justify-center py-2 min-h-[340px] max-w-full overflow-visible p-2" />
          </div>
        )}
      </div>

      <div className="px-4 py-2.5 bg-[#f8f9fa] dark:bg-[#121212] border-t border-[#e4e4e7] dark:border-[#262626] flex flex-wrap items-center justify-between text-xs text-[#71717a] dark:text-[#8C8C8C] font-mono gap-3 shrink-0 transition-colors">
        <div className="flex flex-wrap items-center gap-4 text-xs leading-normal">
          <span>Mark: <span className="text-[#18181b] dark:text-[#EDEDED]">{spec.mark}</span></span>
          <span>Data: <span className="text-[#18181b] dark:text-[#EDEDED]">{spec.showsRawObservations ? 'Raw points' : 'Aggregated'}</span></span>
          {spec.uncertaintyEncoding && (
            <span>Uncertainty: <span className="text-[#18181b] dark:text-[#EDEDED]">{spec.uncertaintyEncoding}</span></span>
          )}
        </div>
      </div>
    </div>
  );
};
