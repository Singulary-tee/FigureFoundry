import React from 'react';
import { Database, History, ChevronDown, Sun, Moon, Cpu } from 'lucide-react';
import { DEMO_DATASETS } from '../packages/data-model/datasets';
import { getRegisteredDatasets } from '../packages/data-model/profiler';
import { DatasetProfile } from '../types';

interface TopNavProps {
  activeDatasetId: string;
  currentRevision: number;
  userDatasets: DatasetProfile[];
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onSelectDataset: (datasetId: string) => void;
  onImportDataset?: (profile: DatasetProfile) => void;
  onOpenDatasetDrawer: () => void;
  onOpenProvenanceDrawer: () => void;
  onOpenWebMcpDevPanel: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeDatasetId,
  currentRevision,
  userDatasets,
  theme,
  onToggleTheme,
  onSelectDataset,
  onOpenDatasetDrawer,
  onOpenProvenanceDrawer,
  onOpenWebMcpDevPanel,
}) => {
  const registered = getRegisteredDatasets();

  const datasetOptions: { id: string; title: string; isDemo?: boolean }[] = [];

  userDatasets.forEach(d => {
    datasetOptions.push({ id: d.datasetId, title: d.title });
  });

  Object.values(registered).forEach(d => {
    if (!datasetOptions.some(o => o.id === d.id)) {
      datasetOptions.push({ id: d.id, title: d.title });
    }
  });

  Object.values(DEMO_DATASETS).forEach(d => {
    if (!datasetOptions.some(o => o.id === d.id)) {
      datasetOptions.push({ id: d.id, title: `${d.title} (Demo)`, isDemo: true });
    }
  });

  return (
    <header className="bg-white dark:bg-[#171717] border-b border-[#e4e4e7] dark:border-[#262626] z-30 shrink-0 sticky top-0 transition-colors">
      <div className="flex items-center justify-between px-3 sm:px-4 md:px-5 min-h-[50px] py-2 w-full gap-2">
        
        {/* Left section: Brand, Dataset dropdown */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1 sm:flex-initial">
          <span className="font-semibold text-sm tracking-tight text-[#18181b] dark:text-[#EDEDED] shrink-0 leading-normal">
            FigureFoundry
          </span>

          <span className="text-[#d4d4d8] dark:text-[#3e3e3e] text-xs select-none shrink-0 hidden xs:inline">/</span>

          <div className="relative flex items-center min-w-[140px] sm:min-w-[180px] max-w-[220px] sm:max-w-sm flex-1 sm:flex-none">
            <label htmlFor="select-dataset" className="sr-only">Active Dataset</label>
            <select
              id="select-dataset"
              value={activeDatasetId}
              onChange={(e) => onSelectDataset(e.target.value)}
              className="w-full appearance-none bg-[#f4f4f5] dark:bg-[#121212] hover:bg-[#e4e4e7] dark:hover:bg-[#1a1a1a] border border-[#e4e4e7] dark:border-[#2e2e2e] hover:border-[#a1a1aa] dark:hover:border-[#383838] rounded-md text-xs text-[#18181b] dark:text-[#EDEDED] font-mono pl-2.5 sm:pl-3 pr-7 sm:pr-8 py-1.5 min-h-[36px] leading-normal focus:outline-none focus:border-[#3ecf8e] focus:ring-1 focus:ring-[#3ecf8e] cursor-pointer transition-colors truncate"
            >
              <option value="" className="bg-white dark:bg-[#171717] text-[#71717a] dark:text-[#8C8C8C] font-mono py-1">
                -- No Dataset --
              </option>
              {datasetOptions.map((opt) => (
                <option key={opt.id} value={opt.id} className="bg-white dark:bg-[#171717] text-[#18181b] dark:text-[#EDEDED] font-mono py-1">
                  {opt.title}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#71717a] dark:text-[#737373] absolute right-2 pointer-events-none" />
          </div>
        </div>

        {/* Right section: Revision, Dataset/History (desktop), WebMCP Dev Bench, Theme toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="px-2 sm:px-3 py-1.5 rounded-md bg-[#f4f4f5] dark:bg-[#121212] border border-[#e4e4e7] dark:border-[#262626] text-xs font-mono text-[#71717a] dark:text-[#8C8C8C] min-h-[36px] flex items-center leading-normal">
            <span className="sm:hidden">r{currentRevision}</span>
            <span className="hidden sm:inline">Revision <span className="text-[#18181b] dark:text-[#EDEDED] font-medium ml-1.5">{currentRevision}</span></span>
          </div>

          {/* Dataset & History buttons (desktop only - mobile uses bottom navigation bar) */}
          <button
            id="btn-open-dataset"
            onClick={onOpenDatasetDrawer}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[#18181b] dark:text-[#EDEDED] hover:text-[#000] dark:hover:text-white bg-[#f4f4f5] dark:bg-[#1f1f1f] hover:bg-[#e4e4e7] dark:hover:bg-[#282828] border border-[#e4e4e7] dark:border-[#2e2e2e] hover:border-[#a1a1aa] dark:hover:border-[#383838] min-h-[36px] leading-normal transition-colors cursor-pointer"
            title="Inspect dataset schema, columns, and raw rows"
          >
            <Database className="w-3.5 h-3.5 text-[#71717a] dark:text-[#8C8C8C] shrink-0" />
            <span>Dataset</span>
          </button>

          <button
            id="btn-open-provenance"
            onClick={onOpenProvenanceDrawer}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[#18181b] dark:text-[#EDEDED] hover:text-[#000] dark:hover:text-white bg-[#f4f4f5] dark:bg-[#1f1f1f] hover:bg-[#e4e4e7] dark:hover:bg-[#282828] border border-[#e4e4e7] dark:border-[#2e2e2e] hover:border-[#a1a1aa] dark:hover:border-[#383838] min-h-[36px] leading-normal transition-colors cursor-pointer"
            title="View revision history and restore snapshots"
          >
            <History className="w-3.5 h-3.5 text-[#71717a] dark:text-[#8C8C8C] shrink-0" />
            <span>History</span>
          </button>

          {/* WebMCP Dev Bench button (always visible top right) */}
          <button
            id="btn-open-webmcp-dev"
            onClick={onOpenWebMcpDevPanel}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold text-[#3ecf8e] bg-[#3ecf8e]/10 hover:bg-[#3ecf8e]/20 border border-[#3ecf8e]/30 min-h-[36px] leading-normal transition-colors cursor-pointer"
            title="Open WebMCP Dev Testing Workbench & Agent Simulator"
          >
            <Cpu className="w-3.5 h-3.5 text-[#3ecf8e] shrink-0" />
            <span className="hidden md:inline">WebMCP Dev Bench</span>
            <span className="md:hidden">Dev Bench</span>
          </button>

          {/* Theme toggle button (always visible top right) */}
          <button
            id="btn-toggle-theme"
            onClick={onToggleTheme}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium text-[#18181b] dark:text-[#EDEDED] hover:text-[#000] dark:hover:text-white bg-[#f4f4f5] dark:bg-[#1f1f1f] hover:bg-[#e4e4e7] dark:hover:bg-[#282828] border border-[#e4e4e7] dark:border-[#2e2e2e] hover:border-[#a1a1aa] dark:hover:border-[#383838] min-h-[36px] leading-normal transition-colors cursor-pointer"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="hidden sm:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="hidden sm:inline">Dark</span>
              </>
            )}
          </button>
        </div>

      </div>
    </header>
  );
};
