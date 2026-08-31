import React from 'react';
import { ZoomIn, ZoomOut, Maximize2, Palette, ChevronDown } from 'lucide-react';
import { CanvasTheme } from '../../types/multipanel';
import { BUILT_IN_THEMES } from '../../packages/multipanel/themes';

interface FooterBarProps {
  activeTheme: CanvasTheme;
  customThemes: CanvasTheme[];
  onSelectTheme: (themeId: string) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitCanvas: () => void;
  canvasWidth: number;
  canvasHeight: number;
}

export const FooterBar: React.FC<FooterBarProps> = ({
  activeTheme,
  customThemes,
  onSelectTheme,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitCanvas,
  canvasWidth,
  canvasHeight,
}) => {
  const allThemes = [...BUILT_IN_THEMES, ...customThemes];

  return (
    <footer className="h-10 bg-white dark:bg-[#121212] border-t border-[#e4e4e7] dark:border-[#27272a] px-2 sm:px-4 flex items-center justify-between select-none shrink-0 z-30 text-xs transition-colors overflow-x-auto no-scrollbar max-w-full">
      {/* Left: Theme Dropdown & Zoom Controls */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Theme dropdown */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Palette className="w-3.5 h-3.5 text-[#71717a] dark:text-[#a1a1aa]" />
          <div className="relative flex items-center">
            <select
              value={activeTheme.id}
              onChange={(e) => onSelectTheme(e.target.value)}
              className="appearance-none bg-transparent pr-5 py-0.5 text-xs font-semibold text-[#0f172a] dark:text-[#f4f4f5] outline-none cursor-pointer hover:text-[#24b47e] transition-colors"
            >
              {allThemes.map((t) => (
                <option key={t.id} value={t.id} className="bg-white dark:bg-[#18181b] text-[#0f172a] dark:text-[#f4f4f5]">
                  Theme: {t.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-[#71717a] pointer-events-none absolute right-0" />
          </div>
        </div>

        <div className="h-4 w-px bg-[#e4e4e7] dark:bg-[#27272a] shrink-0" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          <button
            onClick={onZoomOut}
            title="Zoom Out (-)"
            className="p-1 rounded text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] hover:text-[#0f172a] dark:hover:text-[#f4f4f5] transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onResetZoom}
            title="Reset Zoom to 100%"
            className="px-1.5 py-0.5 rounded font-mono font-medium text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] hover:text-[#0f172a] dark:hover:text-[#f4f4f5] transition-colors cursor-pointer"
          >
            {Math.round(zoom * 100)}%
          </button>

          <button
            onClick={onZoomIn}
            title="Zoom In (+)"
            className="p-1 rounded text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] hover:text-[#0f172a] dark:hover:text-[#f4f4f5] transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onFitCanvas}
            title="Fit canvas to view"
            className="flex items-center gap-1 px-1.5 py-0.5 text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] hover:text-[#0f172a] dark:hover:text-[#f4f4f5] rounded transition-colors ml-0.5 cursor-pointer"
          >
            <Maximize2 className="w-3 h-3" />
            <span className="hidden sm:inline">Fit</span>
          </button>
        </div>
      </div>

      {/* Right: Dimensions */}
      <div className="hidden sm:flex items-center gap-3 text-[11px] text-[#71717a] dark:text-[#a1a1aa] shrink-0">
        <div className="font-mono">
          {canvasWidth} × {canvasHeight} px
        </div>
      </div>
    </footer>
  );
};
