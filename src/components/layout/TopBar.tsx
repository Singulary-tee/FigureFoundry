import React, { useState, useEffect } from 'react';
import logo from '../../assets/logo.webp';
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
  SlidersHorizontal,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';

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
  onOpenMobileInspector?: () => void;
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
  onOpenMobileInspector,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(figureTitle);

  useEffect(() => {
    setTempTitle(figureTitle);
  }, [figureTitle]);

  const handleTitleSubmit = () => {
    if (tempTitle.trim()) {
      onRenameFigure(tempTitle.trim());
    }
    setIsEditingTitle(false);
  };

  return (
    <header className="h-12 w-full bg-white dark:bg-[#121212] border-b border-[#e4e4e7] dark:border-[#27272a] px-3 flex items-center justify-between select-none shrink-0 z-40 transition-colors">
      {/* Left: Logo & Figure Title */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* Brand logo */}
        <div className="flex items-center justify-center gap-2 shrink-0">
          <img src={logo} alt="FigureFoundry Logo" className="w-6 h-6 shrink-0 object-contain block" referrerPolicy="no-referrer" />
          <span className="font-bold text-sm tracking-tight text-[#0f172a] dark:text-[#f4f4f5] hidden md:inline-block">
            FigureFoundry
          </span>
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-[#e4e4e7] dark:bg-[#27272a] hidden md:block shrink-0" />

        {/* Editable Figure Title */}
        <div className="flex items-center gap-1.5 min-w-0 max-w-[140px] xs:max-w-[180px] sm:max-w-[240px] md:max-w-xs">
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
              className="text-xs font-semibold px-2 py-0.5 bg-white dark:bg-[#18181b] border border-[#24b47e] rounded outline-none text-[#0f172a] dark:text-[#f4f4f5] w-full h-7"
            />
          ) : (
            <button
              onClick={() => setIsEditingTitle(true)}
              className="flex items-center gap-1 text-xs font-semibold text-[#0f172a] dark:text-[#f4f4f5] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] px-1.5 py-1 rounded transition-colors group truncate min-w-0"
              title="Click to rename figure"
            >
              <span className="truncate">{figureTitle}</span>
              <ChevronDown className="w-3 h-3 text-[#71717a] group-hover:text-[#0f172a] dark:group-hover:text-[#f4f4f5] shrink-0" />
            </button>
          )}

          {/* Real Save status */}
          {saveStatus === 'saved' && (
            <span className="w-2 h-2 rounded-full bg-[#24b47e] shrink-0" title="Saved just now" />
          )}
          {saveStatus === 'saving' && (
            <span className="text-[10px] text-[#71717a] dark:text-[#a1a1aa] italic whitespace-nowrap shrink-0">
              Saving...
            </span>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Undo / Redo */}
        <div className="flex items-center bg-[#f4f4f5] dark:bg-[#18181b] rounded-md p-0.5 border border-[#e4e4e7] dark:border-[#27272a] shrink-0">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo"
            className="w-7 h-7 rounded text-[#71717a] dark:text-[#a1a1aa] hover:text-[#0f172a] dark:hover:text-[#f4f4f5] hover:bg-white dark:hover:bg-[#27272a] disabled:opacity-30 transition-colors flex items-center justify-center cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo"
            className="w-7 h-7 rounded text-[#71717a] dark:text-[#a1a1aa] hover:text-[#0f172a] dark:hover:text-[#f4f4f5] hover:bg-white dark:hover:bg-[#27272a] disabled:opacity-30 transition-colors flex items-center justify-center cursor-pointer"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Light / Dark Mode Toggle */}
        <button
          onClick={onToggleTheme}
          className="w-8 h-8 rounded-md border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#18181b] text-[#71717a] dark:text-[#a1a1aa] hover:text-[#0f172a] dark:hover:text-[#f4f4f5] transition-colors flex items-center justify-center cursor-pointer shrink-0"
          title="Toggle theme"
        >
          {theme === 'light' ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
        </button>

        {/* Mobile Inspector Toggle */}
        {onOpenMobileInspector && (
          <button
            onClick={onOpenMobileInspector}
            className="md:hidden flex items-center gap-1 h-8 px-2 rounded-md border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#18181b] text-xs font-medium text-[#0f172a] dark:text-[#f4f4f5] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] transition-colors cursor-pointer shrink-0"
            title="Open Panel Inspector"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#24b47e]" />
            <span className="hidden xs:inline">Inspector</span>
          </button>
        )}

        {/* Export Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-1 bg-[#24b47e] hover:bg-[#1f9d6e] text-white px-2.5 h-8 rounded-md text-xs font-medium shadow-xs transition-colors whitespace-nowrap cursor-pointer shrink-0"
            >
              <span>Export</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-1">
            <DropdownMenuItem
              onClick={onExportPng}
              className="px-3 py-2 cursor-pointer flex items-center gap-2"
            >
              <ImageIcon className="w-4 h-4 text-[#24b47e]" />
              <div>
                <div className="font-semibold text-xs text-[#18181b] dark:text-[#f4f4f5]">Export PNG</div>
                <div className="text-[11px] text-[#71717a]">High-resolution raster (2x)</div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onExportSvg}
              className="px-3 py-2 cursor-pointer flex items-center gap-2"
            >
              <Download className="w-4 h-4 text-[#24b47e]" />
              <div>
                <div className="font-semibold text-xs text-[#18181b] dark:text-[#f4f4f5]">Export SVG</div>
                <div className="text-[11px] text-[#71717a]">Vector graphic for publication</div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onExportJson}
              className="px-3 py-2 cursor-pointer flex items-center gap-2"
            >
              <FileCode className="w-4 h-4 text-[#24b47e]" />
              <div>
                <div className="font-semibold text-xs text-[#18181b] dark:text-[#f4f4f5]">Export figure spec (JSON)</div>
                <div className="text-[11px] text-[#71717a]">Complete WebMCP project bundle</div>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Overflow Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="w-8 h-8 rounded-md text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] hover:text-[#0f172a] dark:hover:text-[#f4f4f5] transition-colors flex items-center justify-center cursor-pointer shrink-0"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 p-1">
            {import.meta.env.DEV && (
              <DropdownMenuItem
                onClick={onOpenWebMcpDev}
                className="px-3 py-2 text-xs font-medium cursor-pointer"
              >
                WebMCP Tool Inspector
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => setIsEditingTitle(true)}
              className="px-3 py-2 text-xs font-medium cursor-pointer"
            >
              Rename Figure
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
