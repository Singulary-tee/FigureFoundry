import React, { useEffect, useState } from 'react';
import { DatasetProfile } from '../types';
import { X, Database, Table2, Layers, Hash, Type, Calendar, Upload, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { parseCSV, parseJSON, buildDatasetProfile } from '../packages/data-model/parser';

interface DatasetDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  profile: DatasetProfile;
  onImportDataset?: (profile: DatasetProfile) => void;
  onClearDataset?: () => void;
}

export const DatasetDrawer: React.FC<DatasetDrawerProps> = ({
  isOpen,
  onClose,
  profile,
  onImportDataset,
  onClearDataset
}) => {
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const processFile = (file: File) => {
    const fileName = file.name;
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      try {
        let records: Record<string, any>[] = [];
        if (fileName.endsWith('.json')) {
          records = parseJSON(text);
        } else {
          records = parseCSV(text);
        }

        if (records.length === 0) {
          alert('Uploaded file contains no valid rows or fields.');
          return;
        }

        const cleanId = 'dataset_' + fileName.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
        const title = fileName.replace(/\.[^/.]+$/, '');
        const newProfile = buildDatasetProfile(
          cleanId,
          title,
          records,
          `Uploaded dataset (${records.length} records)`,
          `File: ${fileName}`
        );

        if (onImportDataset) {
          onImportDataset(newProfile);
        }
      } catch (err: any) {
        alert(`Error parsing file: ${err.message || err}`);
      }
    };

    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'quantitative':
        return <Hash className="w-3.5 h-3.5 text-[#3ecf8e] shrink-0" />;
      case 'categorical':
        return <Type className="w-3.5 h-3.5 text-[#60a5fa] shrink-0" />;
      case 'temporal':
        return <Calendar className="w-3.5 h-3.5 text-[#f59e0b] shrink-0" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-[#8C8C8C] shrink-0" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm cursor-pointer"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-xl h-full bg-white dark:bg-[#171717] border-l border-[#e4e4e7] dark:border-[#262626] p-4 sm:p-5 flex flex-col gap-4 shadow-xl overflow-y-auto z-10 transition-colors"
          >
            
            <div className="flex items-start justify-between pb-3.5 border-b border-[#e4e4e7] dark:border-[#262626] shrink-0">
              <div className="space-y-1 pr-2">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#24b47e] dark:text-[#3ecf8e] shrink-0" />
                  <h2 className="font-semibold text-sm tracking-tight text-[#18181b] dark:text-[#EDEDED] leading-normal">
                    {profile.title || 'No Dataset Active'}
                  </h2>
                </div>
                <p className="text-xs text-[#71717a] dark:text-[#8C8C8C] leading-relaxed">{profile.description}</p>
                {profile.citation && (
                  <p className="text-[11px] text-[#a1a1aa] dark:text-[#525252] font-mono italic leading-normal">{profile.citation}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {onClearDataset && profile.rowCount > 0 && (
                  <button
                    onClick={onClearDataset}
                    className="p-1.5 rounded-md bg-[#f4f4f5] dark:bg-[#1f1f1f] hover:bg-rose-100 dark:hover:bg-rose-950/40 border border-[#e4e4e7] dark:border-[#2e2e2e] hover:border-rose-300 dark:hover:border-rose-800/50 text-[#71717a] dark:text-[#8C8C8C] hover:text-rose-600 dark:hover:text-rose-400 min-h-[34px] min-w-[34px] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                    title="Clear current dataset"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-md bg-[#f4f4f5] dark:bg-[#1f1f1f] border border-[#e4e4e7] dark:border-[#2e2e2e] text-[#71717a] dark:text-[#8C8C8C] hover:text-[#18181b] dark:hover:text-[#EDEDED] min-h-[34px] min-w-[34px] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  aria-label="Close Drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`p-4 rounded-lg border-2 border-dashed transition-colors flex flex-col items-center justify-center text-center gap-2 shrink-0 ${
                isDragging
                  ? 'border-[#24b47e] dark:border-[#3ecf8e] bg-[#3ecf8e]/10'
                  : 'border-[#e4e4e7] dark:border-[#2e2e2e] hover:border-[#a1a1aa] dark:hover:border-[#383838] bg-[#f8f9fa] dark:bg-[#121212]'
              }`}
            >
              <Upload className="w-5 h-5 text-[#24b47e] dark:text-[#3ecf8e]" />
              <div>
                <p className="text-xs font-medium text-[#18181b] dark:text-[#EDEDED] leading-normal">
                  Drag and drop CSV or JSON dataset
                </p>
                <p className="text-[11px] text-[#71717a] dark:text-[#737373] leading-normal mt-0.5">
                  or select a file from your computer
                </p>
              </div>
              <label className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[#18181b] dark:text-[#EDEDED] bg-[#f4f4f5] dark:bg-[#1f1f1f] hover:bg-[#e4e4e7] dark:hover:bg-[#282828] border border-[#e4e4e7] dark:border-[#2e2e2e] transition-colors cursor-pointer min-h-[32px]">
                <span>Browse File</span>
                <input
                  type="file"
                  accept=".csv,.json,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {profile.rowCount > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 shrink-0">
                <div className="bg-[#f8f9fa] dark:bg-[#121212] p-3 rounded-md border border-[#e4e4e7] dark:border-[#262626]">
                  <span className="text-[10px] uppercase font-mono text-[#71717a] dark:text-[#737373] block leading-normal">Total Rows</span>
                  <p className="text-base font-semibold text-[#18181b] dark:text-[#EDEDED] font-mono mt-1 leading-normal">{profile.rowCount}</p>
                </div>
                <div className="bg-[#f8f9fa] dark:bg-[#121212] p-3 rounded-md border border-[#e4e4e7] dark:border-[#262626]">
                  <span className="text-[10px] uppercase font-mono text-[#71717a] dark:text-[#737373] block leading-normal">Columns</span>
                  <p className="text-base font-semibold text-[#24b47e] dark:text-[#3ecf8e] font-mono mt-1 leading-normal">{profile.fields.length}</p>
                </div>
                <div className="bg-[#f8f9fa] dark:bg-[#121212] p-3 rounded-md border border-[#e4e4e7] dark:border-[#262626]">
                  <span className="text-[10px] uppercase font-mono text-[#71717a] dark:text-[#737373] block leading-normal">Dataset ID</span>
                  <p className="text-xs font-semibold text-[#18181b] dark:text-[#EDEDED] font-mono break-all mt-1 leading-normal">{profile.datasetId}</p>
                </div>
              </div>
            )}

            {profile.fields.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#71717a] dark:text-[#A1A1A1] font-mono leading-normal">
                    Field Profiles & Types
                  </h3>
                  <span className="text-xs text-[#a1a1aa] dark:text-[#525252] font-mono leading-normal">{profile.fields.length} Fields</span>
                </div>

                <div className="space-y-2">
                  {profile.fields.map(f => {
                    const completenessPercent = profile.rowCount > 0
                      ? Math.round(((profile.rowCount - f.missingCount) / profile.rowCount) * 100)
                      : 0;
                    return (
                      <div key={f.name} className="p-3 bg-[#f8f9fa] dark:bg-[#121212] rounded-md border border-[#e4e4e7] dark:border-[#262626] space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                            {getFieldIcon(f.type)}
                            <span className="font-mono text-xs font-medium text-[#18181b] dark:text-[#EDEDED] leading-normal">{f.name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#e4e4e7] dark:bg-[#1f1f1f] text-[#71717a] dark:text-[#8C8C8C] border border-[#d4d4d8] dark:border-[#2e2e2e] leading-normal">
                              {f.type}
                            </span>
                            {f.unit && (
                              <span className="text-[10px] font-mono text-[#71717a] dark:text-[#737373] leading-normal">
                                unit: {f.unit}
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-mono text-[#24b47e] dark:text-[#3ecf8e] leading-normal">
                            {completenessPercent}% complete
                          </span>
                        </div>

                        <div className="w-full bg-[#e4e4e7] dark:bg-[#262626] rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-[#24b47e] dark:bg-[#3ecf8e] h-1.5 rounded-full"
                            style={{ width: `${completenessPercent}%` }}
                          />
                        </div>

                        <div className="flex flex-wrap items-center justify-between text-xs text-[#71717a] dark:text-[#8C8C8C] font-mono gap-2 leading-normal">
                          <span>Cardinality: <b className="text-[#18181b] dark:text-[#EDEDED]">{f.cardinality}</b> unique</span>
                          {f.min !== undefined && f.max !== undefined && (
                            <span>Range: [{f.min}, {f.max}]</span>
                          )}
                        </div>

                        <div className="text-xs text-[#71717a] dark:text-[#8C8C8C] font-mono break-words leading-normal">
                          <span className="text-[#a1a1aa] dark:text-[#737373]">Samples: </span>
                          <span className="text-[#18181b] dark:text-[#EDEDED]">
                            {f.exampleValues.map(v => (v === null ? 'null' : String(v))).join(', ')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {profile.records.length > 0 && (
              <div className="space-y-2 pb-4">
                <div className="flex items-center gap-1.5">
                  <Table2 className="w-3.5 h-3.5 text-[#24b47e] dark:text-[#3ecf8e] shrink-0" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#71717a] dark:text-[#A1A1A1] font-mono leading-normal">
                    Data Head (First 5 Rows)
                  </h3>
                </div>
                <div className="overflow-x-auto border border-[#e4e4e7] dark:border-[#262626] rounded-md bg-[#f8f9fa] dark:bg-[#121212]">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#f4f4f5] dark:bg-[#1a1a1a] text-[#71717a] dark:text-[#8C8C8C] border-b border-[#e4e4e7] dark:border-[#262626]">
                      <tr>
                        {profile.fields.map(f => (
                          <th key={f.name} className="px-3 py-2 whitespace-nowrap font-medium text-xs leading-normal">
                            {f.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e4e4e7] dark:divide-[#262626] text-[#18181b] dark:text-[#EDEDED]">
                      {profile.records.slice(0, 5).map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-[#e4e4e7]/50 dark:hover:bg-[#1f1f1f]/50">
                          {profile.fields.map(f => (
                            <td key={f.name} className="px-3 py-2 whitespace-nowrap text-xs leading-normal">
                              {row[f.name] === null || row[f.name] === undefined ? (
                                <span className="text-[#a1a1aa] dark:text-[#525252] italic">null</span>
                              ) : (
                                String(row[f.name])
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
