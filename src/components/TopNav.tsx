import React from 'react';
import { Database, History, ChevronDown, Sun, Moon, Cpu } from 'lucide-react';
import { DEMO_DATASETS } from '../packages/data-model/datasets';
import { getRegisteredDatasets } from '../packages/data-model/profiler';
import { DatasetProfile, ExportBundle } from '../types';
import { Button } from './ui/button';

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
  onExportProject?: () => void;
  onImportProject?: (bundle: ExportBundle) => void;
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
  onExportProject,
  onImportProject,
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
        <div className="flex items-center gap-1 sm:gap-2.5 min-w-0 flex-1 sm:flex-none">
          <span className="font-semibold text-xs sm:text-sm tracking-tight text-[#18181b] dark:text-[#EDEDED] shrink-0 leading-normal">
            FigureFoundry
          </span>

          <span className="text-[#d4d4d8] dark:text-[#3e3e3e] text-xs select-none shrink-0">/</span>

          <div className="relative flex items-center w-[110px] max-w-[110px] sm:w-[180px] sm:min-w-[180px] sm:max-w-sm shrink-0 sm:flex-none">
            <label htmlFor="select-dataset" className="sr-only">Active Dataset</label>
            <select
              id="select-dataset"
              value={activeDatasetId}
              onChange={(e) => onSelectDataset(e.target.value)}
              className="w-full appearance-none bg-[#f4f4f5] dark:bg-[#121212] hover:bg-[#e4e4e7] dark:hover:bg-[#1a1a1a] border border-[#e4e4e7] dark:border-[#2e2e2e] hover:border-[#a1a1aa] dark:hover:border-[#383838] rounded-md text-xs text-[#18181b] dark:text-[#EDEDED] font-mono pl-2 sm:pl-3 pr-6 sm:pr-8 py-1.5 min-h-[36px] leading-normal focus:outline-none focus:border-[#3ecf8e] focus:ring-1 focus:ring-[#3ecf8e] cursor-pointer transition-colors truncate"
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
          <div className="px-2 sm:px-3 py-1.5 rounded-md bg-[#f4f4f5] dark:bg-[#121212] border border-[#e4e4e7] dark:border-[#262626] text-xs font-mono text-[#71717a] dark:text-[#8C8C8C] min-h-[36px] flex items-center leading-normal shrink-0">
            <span className="sm:hidden">r{currentRevision}</span>
            <span className="hidden sm:inline">Revision <span className="text-[#18181b] dark:text-[#EDEDED] font-medium ml-1.5">{currentRevision}</span></span>
          </div>

          <Button
            id="btn-open-provenance"
            variant="outline"
            size="sm"
            onClick={onOpenProvenanceDrawer}
            className="hidden sm:inline-flex items-center gap-1.5 min-h-[36px] text-xs font-medium"
            title="View revision history and restore snapshots"
          >
            <History className="w-3.5 h-3.5 text-[#71717a] dark:text-[#8C8C8C] shrink-0" />
            <span>History</span>
          </Button>

          <Button
            id="btn-export-bundle"
            variant="outline"
            size="sm"
            onClick={onExportProject}
            className="hidden sm:inline-flex items-center gap-1.5 min-h-[36px] text-xs font-medium"
            title="Export full figure project bundle"
          >
            <span>Export Bundle</span>
          </Button>

          <Button
            id="btn-import-bundle"
            variant="outline"
            size="sm"
            asChild
            className="hidden sm:inline-flex items-center gap-1.5 min-h-[36px] text-xs font-medium cursor-pointer"
          >
            <label className="cursor-pointer">
              <span>Import Bundle</span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      try {
                        const bundle = JSON.parse(event.target?.result as string);
                        if (onImportProject) onImportProject(bundle);
                      } catch (err) {
                        console.error('Invalid JSON file format');
                      }
                    };
                    reader.readAsText(file);
                  }
                }}
              />
            </label>
          </Button>

          {/* WebMCP Dev Bench button (always visible top right) */}
          <Button
            id="btn-open-webmcp-dev"
            variant="outline"
            size="sm"
            onClick={onOpenWebMcpDevPanel}
            className="inline-flex items-center justify-center px-2 sm:px-3 text-xs font-semibold text-[#3ecf8e] bg-[#3ecf8e]/10 hover:bg-[#3ecf8e]/20 border-[#3ecf8e]/30 min-h-[36px]"
            title="Open WebMCP Dev Testing Workbench & Agent Simulator"
          >
            <Cpu className="w-3.5 h-3.5 text-[#3ecf8e] shrink-0" />
            <span className="hidden sm:inline md:hidden ml-1.5">Dev Bench</span>
            <span className="hidden md:inline ml-1.5">WebMCP Dev Bench</span>
          </Button>

          {/* Theme toggle button (always visible top right) */}
          <Button
            id="btn-toggle-theme"
            variant="outline"
            size="sm"
            onClick={onToggleTheme}
            className="inline-flex items-center justify-center px-2 sm:px-3 min-h-[36px]"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? (
              <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            )}
            <span className="hidden sm:inline ml-1.5">{theme === 'light' ? 'Light' : 'Dark'}</span>
          </Button>
        </div>

      </div>
    </header>
  );
};
