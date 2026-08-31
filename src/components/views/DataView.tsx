import React, { useState, useMemo } from 'react';
import {
  Database,
  Upload,
  Download,
  Table2,
  Layers,
  Search,
  Hash,
  Type,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  FolderKanban,
  Building2,
} from 'lucide-react';
import { profileDataset, getRegisteredDatasets } from '../../packages/data-model/profiler';
import { useDomainStore } from '../../packages/domain/store';
import { ImportModal } from '../modals/ImportModal';

interface DataViewProps {
  currentDatasetId?: string;
  domainState?: any;
  onNavigate: (view: 'figures' | 'dashboard' | 'data' | 'analyses' | 'notes' | 'settings' | 'help') => void;
  onSelectDataset?: (id: string) => void;
}

export const DataView: React.FC<DataViewProps> = ({
  currentDatasetId = 'palmer-penguins',
  onNavigate,
  onSelectDataset,
}) => {
  const { state, dispatch } = useDomainStore();

  const selectedDatasetId = state.selectedDatasetId || currentDatasetId;
  const [activeTab, setActiveTab] = useState<'table' | 'fields'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const pageSize = 15;

  const activeProject = state.projects.find((p) => p.id === state.activeProjectId);
  const activeWorkspace = state.workspaces.find((w) => w.id === state.activeWorkspaceId);

  const profile = useMemo(() => {
    return profileDataset(selectedDatasetId);
  }, [selectedDatasetId]);

  // Determine if dataset is Project Scoped or Workspace Shared
  const isProjectScoped = activeProject?.datasetIds.includes(selectedDatasetId);
  const isWorkspaceShared = activeWorkspace?.sharedDatasetIds.includes(selectedDatasetId);

  const handleToggleScope = (scope: 'project' | 'workspace') => {
    dispatch({
      type: 'TOGGLE_DATASET_SCOPE',
      payload: {
        datasetId: selectedDatasetId,
        scope,
      },
    });
  };

  // Filter & sort records
  const filteredRecords = useMemo(() => {
    let recs = [...profile.records];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      recs = recs.filter((r) =>
        Object.values(r).some((val) => String(val).toLowerCase().includes(q))
      );
    }
    if (sortField) {
      recs.sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        if (valA === valB) return 0;
        if (valA == null) return 1;
        if (valB == null) return -1;
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortAsc ? valA - valB : valB - valA;
        }
        return sortAsc
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }
    return recs;
  }, [profile.records, searchQuery, sortField, sortAsc]);

  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage]);

  const handleExportCSV = () => {
    if (!profile.records.length) return;
    const headers = profile.fields.map((f) => f.name);
    const csvRows = [headers.join(',')];
    for (const row of profile.records) {
      const values = headers.map((h) => {
        const val = row[h] ?? '';
        return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
      });
      csvRows.push(values.join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${profile.datasetId}_export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#fafafa] dark:bg-[#0f0f11] text-[#0f172a] dark:text-[#f4f4f5] p-3 sm:p-6 lg:p-8 select-text min-w-0">
      <div className="max-w-6xl mx-auto space-y-6 min-w-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e4e4e7] dark:border-[#27272a] min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-[#71717a] dark:text-[#a1a1aa] font-mono truncate">
                {profile.rowCount} Observations • {profile.fields.length} Columns
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0f172a] dark:text-[#f4f4f5] tracking-tight flex items-center gap-2 truncate">
              <Database className="w-5 h-5 sm:w-6 sm:h-6 text-[#24b47e] shrink-0" />
              <span className="truncate">{profile.title}</span>
            </h1>
            <p className="text-xs text-[#71717a] dark:text-[#a1a1aa] mt-0.5 line-clamp-2">
              {profile.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 max-w-full">
            {/* Scope Badges */}
            <div className="flex items-center gap-1 bg-[#f4f4f5] dark:bg-[#18181b] p-1 rounded-lg border border-[#e4e4e7] dark:border-[#27272a] text-xs shrink-0">
              <button
                onClick={() => handleToggleScope('project')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                  isProjectScoped
                    ? 'bg-[#24b47e] text-black shadow-xs'
                    : 'text-[#71717a] hover:text-[#0f172a] dark:hover:text-[#f4f4f5]'
                }`}
                title="Toggle Project Scoped Dataset"
              >
                <FolderKanban className="w-3 h-3" />
                <span>Project</span>
              </button>
              <button
                onClick={() => handleToggleScope('workspace')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                  isWorkspaceShared
                    ? 'bg-[#24b47e] text-black shadow-xs'
                    : 'text-[#71717a] hover:text-[#0f172a] dark:hover:text-[#f4f4f5]'
                }`}
                title="Toggle Workspace Shared Dataset"
              >
                <Building2 className="w-3 h-3" />
                <span>Workspace</span>
              </button>
            </div>

            {/* Select Dataset Dropdown */}
            <select
              value={selectedDatasetId}
              onChange={(e) => {
                dispatch({ type: 'SELECT_DATASET', payload: e.target.value });
                if (onSelectDataset) onSelectDataset(e.target.value);
              }}
              className="px-3 py-2 rounded-lg bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] text-xs font-semibold text-[#0f172a] dark:text-[#f4f4f5] outline-none focus:border-[#24b47e] shrink-0"
            >
              {state.datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-[#24b47e] hover:bg-[#1f9d6e] text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5 shrink-0" />
              <span>Import Dataset</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-lg bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] text-xs font-semibold text-[#0f172a] dark:text-[#f4f4f5] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-[#71717a] shrink-0" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e4e4e7] dark:border-[#27272a]">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('table')}
              className={`px-3 sm:px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'table'
                  ? 'border-[#24b47e] text-[#24b47e]'
                  : 'border-transparent text-[#71717a] hover:text-[#0f172a] dark:hover:text-[#f4f4f5]'
              }`}
            >
              <Table2 className="w-4 h-4" />
              <span>Observations Table</span>
            </button>
            <button
              onClick={() => setActiveTab('fields')}
              className={`px-3 sm:px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'fields'
                  ? 'border-[#24b47e] text-[#24b47e]'
                  : 'border-transparent text-[#71717a] hover:text-[#0f172a] dark:hover:text-[#f4f4f5]'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Column Profiler & Stats</span>
            </button>
          </div>

          {activeTab === 'table' && (
            <div className="flex items-center gap-2 pb-2 sm:pb-0">
              <div className="relative w-full sm:w-auto">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#71717a]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search observations..."
                  className="pl-8 pr-3 py-1.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs outline-none focus:border-[#24b47e] w-full sm:w-64"
                />
              </div>
            </div>
          )}
        </div>

        {/* Tab 1: Observations Table */}
        {activeTab === 'table' && (
          <div className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto max-h-[550px] w-full">
              <table className="w-full min-w-[640px] text-xs text-left">
                <thead className="bg-[#f8f9fa] dark:bg-[#121212] border-b border-[#e4e4e7] dark:border-[#27272a] sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2.5 text-[11px] font-bold text-[#71717a] uppercase tracking-wider w-14 text-center">
                      #
                    </th>
                    {profile.fields.map((f) => (
                      <th
                        key={f.name}
                        onClick={() => {
                          if (sortField === f.name) {
                            setSortAsc(!sortAsc);
                          } else {
                            setSortField(f.name);
                            setSortAsc(true);
                          }
                        }}
                        className="px-4 py-2.5 text-[11px] font-bold text-[#0f172a] dark:text-[#f4f4f5] tracking-wider cursor-pointer hover:bg-[#eaeaea] dark:hover:bg-[#1f1f23] transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          {f.type === 'quantitative' ? (
                            <Hash className="w-3.5 h-3.5 text-sky-500" />
                          ) : (
                            <Type className="w-3.5 h-3.5 text-emerald-500" />
                          )}
                          <span>{f.name}</span>
                          {sortField === f.name && (
                            <span className="text-[10px] text-[#24b47e]">
                              {sortAsc ? '▲' : '▼'}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e4e4e7] dark:divide-[#27272a]">
                  {paginatedRecords.map((row, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-[#f8f9fa] dark:hover:bg-[#141416] transition-colors"
                    >
                      <td className="px-4 py-2 font-mono text-[10px] text-[#71717a] text-center">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                      {profile.fields.map((f) => (
                        <td
                          key={f.name}
                          className="px-4 py-2 font-mono text-[11px] text-[#0f172a] dark:text-[#f4f4f5] whitespace-nowrap"
                        >
                          {row[f.name] !== undefined && row[f.name] !== null ? (
                            String(row[f.name])
                          ) : (
                            <span className="text-[#a1a1aa] italic">NA</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="px-4 py-3 bg-[#f8f9fa] dark:bg-[#121212] border-t border-[#e4e4e7] dark:border-[#27272a] flex items-center justify-between text-xs text-[#71717a]">
              <span>
                Showing {Math.min(filteredRecords.length, (currentPage - 1) * pageSize + 1)} to{' '}
                {Math.min(filteredRecords.length, currentPage * pageSize)} of {filteredRecords.length} records
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded border border-[#e4e4e7] dark:border-[#27272a] disabled:opacity-40 hover:bg-white dark:hover:bg-[#27272a] font-medium"
                >
                  Previous
                </button>
                <span className="font-mono">
                  Page {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded border border-[#e4e4e7] dark:border-[#27272a] disabled:opacity-40 hover:bg-white dark:hover:bg-[#27272a] font-medium"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Column Profiler & Stats */}
        {activeTab === 'fields' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profile.fields.map((field) => (
              <div
                key={field.name}
                className="p-4 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between border-b border-[#e4e4e7] dark:border-[#27272a] pb-2">
                  <div className="flex items-center gap-2">
                    {field.type === 'quantitative' ? (
                      <Hash className="w-4 h-4 text-sky-500" />
                    ) : (
                      <Type className="w-4 h-4 text-emerald-500" />
                    )}
                    <h3 className="font-bold text-xs text-[#0f172a] dark:text-[#f4f4f5]">
                      {field.name}
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#24b47e]/15 text-[#24b47e]">
                    {field.type}
                  </span>
                </div>

                <div className="p-3 bg-[#f8f9fa] dark:bg-[#121212] rounded-lg border border-[#e4e4e7] dark:border-[#27272a] space-y-1.5 text-[11px]">
                  {field.type === 'quantitative' ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-[#71717a]">Min / Max:</span>
                        <span className="font-mono">
                          {field.min ?? '—'} – {field.max ?? '—'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#71717a]">Missing Values:</span>
                        <span className="font-mono">{field.missingCount}</span>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-1">
                      <span className="text-[#71717a] block">Example Values:</span>
                      <div className="flex flex-wrap gap-1">
                        {(field.exampleValues || []).slice(0, 5).map((v, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 rounded bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] text-[10px] font-mono text-[#0f172a] dark:text-[#f4f4f5]"
                          >
                            {String(v)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between pt-1 border-t border-[#e4e4e7] dark:border-[#27272a]">
                    <span className="text-[#71717a]">Missing Values:</span>
                    <span
                      className={`font-mono ${
                        field.missingCount && field.missingCount > 0
                          ? 'text-rose-500 font-bold'
                          : 'text-emerald-500'
                      }`}
                    >
                      {field.missingCount || 0}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Import Modal */}
        <ImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          defaultScope="project"
        />
      </div>
    </div>
  );
};
