import React, { useState, useRef, useEffect } from 'react';
import {
  Undo2,
  Redo2,
  Sun,
  Moon,
  ChevronDown,
  Download,
  FileCode,
  Image as ImageIcon,
  CheckCircle2,
  MoreVertical,
  Edit2,
} from 'lucide-react';

interface TopBarProps {
  figureTitle: string;
  onRenameFigure: (newTitle: string) => void;
  saveStatus: 'saved' | 'saving' | 'unsaved';
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onExportPng: () => void;
  onExportSvg: () => void;
  onExportJson: () => void;
  onOpenWebMcpDev: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  figureTitle,
  onRenameFigure,
  saveStatus,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  theme,
  onToggleTheme,
  onExportPng,
  onExportSvg,
  onExportJson,
  onOpenWebMcpDev,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(figureTitle);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const overflowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTempTitle(figureTitle);
  }, [figureTitle]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
      if (overflowRef.current && !overflowRef.current.contains(event.target as Node)) {
        setIsOverflowOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTitleSubmit = () => {
    if (tempTitle.trim()) {
      onRenameFigure(tempTitle.trim());
    }
    setIsEditingTitle(false);
  };

  return (
    <header className="h-14 w-full bg-white dark:bg-[#121212] border-b border-[#e4e4e7] dark:border-[#27272a] px-2 sm:px-4 flex items-center justify-between select-none shrink-0 z-40 transition-colors">
      {/* Left: Logo & Figure Title */}
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
        {/* Brand logo */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#24b47e]/15 flex items-center justify-center text-[#24b47e] font-bold text-sm sm:text-lg tracking-tighter shrink-0">
            Ff
          </div>
          <span className="font-bold text-sm sm:text-base tracking-tight text-[#0f172a] dark:text-[#f4f4f5] hidden sm:inline-block">
            FigureFoundry
          </span>
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-[#e4e4e7] dark:bg-[#27272a] hidden sm:block shrink-0" />

        {/* Editable Figure Title */}
        <div className="flex items-center gap-1.5 min-w-0 max-w-[130px] xs:max-w-[160px] sm:max-w-[220px] md:max-w-xs">
          {isEditingTitle ? (
            <input
              type="text"
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSubmit();
                if (e.key === 'Escape') {
                  setTempTitle(figureTitle);
                  setIsEditingTitle(false);
                }
              }}
              autoFocus
              className="text-xs sm:text-sm font-semibold px-2 py-1 bg-white dark:bg-[#18181b] border border-[#24b47e] rounded outline-none text-[#0f172a] dark:text-[#f4f4f5] w-full"
            />
          ) : (
            <button
              onClick={() => setIsEditingTitle(true)}
              className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-[#0f172a] dark:text-[#f4f4f5] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] px-1.5 py-1 rounded transition-colors group truncate min-w-0"
              title="Click to rename figure"
            >
              <span className="truncate">{figureTitle}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#71717a] group-hover:text-[#0f172a] dark:group-hover:text-[#f4f4f5] shrink-0" />
            </button>
          )}

          {/* Real Save status badge: hidden on mobile screens to prevent overlap, visible on md+ */}
          {saveStatus === 'saved' && (
            <>
              <div className="hidden md:flex items-center gap-1 text-xs text-[#24b47e] font-medium bg-[#24b47e]/10 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                <CheckCircle2 className="w-3 h-3" />
                <span>Saved just now</span>
              </div>
              <span className="md:hidden w-2 h-2 rounded-full bg-[#24b47e] shrink-0" title="Saved just now" />
            </>
          )}
          {saveStatus === 'saving' && (
            <span className="text-[11px] text-[#71717a] dark:text-[#a1a1aa] italic whitespace-nowrap shrink-0">
              Saving...
            </span>
          )}
        </div>
      </div>

      {/* Right: History, Light/Dark, Export Button */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Undo / Redo */}
        <div className="flex items-center bg-[#f4f4f5] dark:bg-[#1f1f23] rounded-lg p-0.5 border border-[#e4e4e7] dark:border-[#27272a] shrink-0">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo"
            className="p-1.5 rounded text-[#71717a] dark:text-[#a1a1aa] hover:text-[#0f172a] dark:hover:text-[#f4f4f5] disabled:opacity-40 disabled:hover:text-[#71717a] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo"
            className="p-1.5 rounded text-[#71717a] dark:text-[#a1a1aa] hover:text-[#0f172a] dark:hover:text-[#f4f4f5] disabled:opacity-40 disabled:hover:text-[#71717a] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Light / Dark Mode Toggle */}
        <div className="flex items-center bg-[#f4f4f5] dark:bg-[#1f1f23] rounded-lg p-0.5 border border-[#e4e4e7] dark:border-[#27272a] shrink-0">
          <button
            onClick={onToggleTheme}
            className={`p-1.5 rounded transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer ${
              theme === 'light'
                ? 'bg-white dark:bg-[#27272a] text-[#0f172a] dark:text-[#f4f4f5] shadow-xs'
                : 'text-[#71717a] dark:text-[#a1a1aa]'
            }`}
            title="Toggle theme"
          >
            {theme === 'light' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>
        </div>

        {/* Export Dropdown */}
        <div className="relative shrink-0" ref={exportRef}>
          <button
            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
            className="flex items-center gap-1 bg-[#24b47e] hover:bg-[#1f9d6e] text-white px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold shadow-xs transition-colors whitespace-nowrap min-h-[36px] cursor-pointer"
          >
            <span>Export</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {isExportMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-52 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-1">
              <button
                onClick={() => {
                  onExportPng();
                  setIsExportMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-xs font-medium text-[#18181b] dark:text-[#f4f4f5] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] flex items-center gap-2 cursor-pointer"
              >
                <ImageIcon className="w-4 h-4 text-[#24b47e]" />
                <div>
                  <div className="font-semibold">Export PNG</div>
                  <div className="text-[11px] text-[#71717a]">High-resolution raster (2x)</div>
                </div>
              </button>
              <button
                onClick={() => {
                  onExportSvg();
                  setIsExportMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-xs font-medium text-[#18181b] dark:text-[#f4f4f5] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#24b47e]" />
                <div>
                  <div className="font-semibold">Export SVG</div>
                  <div className="text-[11px] text-[#71717a]">Vector graphic for publication</div>
                </div>
              </button>
              <div className="my-1 border-t border-[#e4e4e7] dark:border-[#27272a]" />
              <button
                onClick={() => {
                  onExportJson();
                  setIsExportMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-xs font-medium text-[#18181b] dark:text-[#f4f4f5] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] flex items-center gap-2 cursor-pointer"
              >
                <FileCode className="w-4 h-4 text-[#24b47e]" />
                <div>
                  <div className="font-semibold">Export figure spec (JSON)</div>
                  <div className="text-[11px] text-[#71717a]">Complete WebMCP project bundle</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Overflow Menu */}
        <div className="relative shrink-0" ref={overflowRef}>
          <button
            onClick={() => setIsOverflowOpen(!isOverflowOpen)}
            className="p-1.5 rounded-lg text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] hover:text-[#0f172a] dark:hover:text-[#f4f4f5] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {isOverflowOpen && (
            <div className="absolute right-0 mt-1.5 w-48 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg shadow-xl py-1.5 z-50">
              <button
                onClick={() => {
                  onOpenWebMcpDev();
                  setIsOverflowOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-xs font-medium text-[#18181b] dark:text-[#f4f4f5] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] cursor-pointer"
              >
                WebMCP Tool Inspector
              </button>
              <button
                onClick={() => {
                  setIsEditingTitle(true);
                  setIsOverflowOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-xs font-medium text-[#18181b] dark:text-[#f4f4f5] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] cursor-pointer"
              >
                Rename Figure
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
