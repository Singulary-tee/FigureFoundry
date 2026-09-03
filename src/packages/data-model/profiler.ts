import { DatasetProfile } from '../../types';
import { DEMO_DATASETS, DatasetEntry, DatasetRecord } from './datasets';
import { buildDatasetProfile } from './parser';

const runtimeDatasetRegistry = new Map<string, DatasetEntry>();

export function datasetRecordToEntry(dataset: DatasetRecord): DatasetEntry {
  return {
    id: dataset.id,
    title: dataset.title || dataset.name || dataset.id,
    description: dataset.description || 'User-imported dataset',
    citation: dataset.citation || 'Uploaded local data',
    records: dataset.rows || [],
  };
}

export function registerRuntimeDataset(entry: DatasetEntry): void {
  runtimeDatasetRegistry.set(entry.id, entry);
}

export function registerDatasetRecord(dataset: DatasetRecord): void {
  registerRuntimeDataset(datasetRecordToEntry(dataset));
}

/** Rebuild the runtime lookup from persisted domain state after a reload. */
export function hydrateRuntimeDatasets(datasets: DatasetRecord[]): void {
  runtimeDatasetRegistry.clear();
  datasets.forEach(registerDatasetRecord);
}

export function unregisterRuntimeDataset(id: string): void {
  runtimeDatasetRegistry.delete(id);
}

export function getRegisteredDatasets(): Record<string, DatasetEntry> {
  const all: Record<string, DatasetEntry> = { ...DEMO_DATASETS };
  runtimeDatasetRegistry.forEach((value, key) => { all[key] = value; });
  return all;
}

type ProfileTarget = string | DatasetProfile | DatasetEntry | DatasetRecord | {
  records?: Record<string, unknown>[];
  rows?: Record<string, unknown>[];
  id?: string;
  datasetId?: string;
  name?: string;
  title?: string;
  description?: string;
  citation?: string;
} | null;

export function profileDataset(target: ProfileTarget): DatasetProfile {
  if (!target) {
    return { datasetId: '', title: 'No Dataset Loaded', description: 'Import a CSV or JSON file in the Dataset panel to begin constructing figures.', citation: '', rowCount: 0, fields: [], records: [] };
  }
  if (typeof target === 'object' && 'fields' in target && Array.isArray(target.fields)) return target as DatasetProfile;
  if (typeof target === 'object') {
    const raw = target as {
      records?: Record<string, unknown>[];
      rows?: Record<string, unknown>[];
      id?: string;
      datasetId?: string;
      name?: string;
      title?: string;
      description?: string;
      citation?: string;
    };
    const records = raw.records || raw.rows;
    if (Array.isArray(records)) {
      return buildDatasetProfile(raw.id || raw.datasetId || `custom_dataset_${Date.now()}`, raw.title || raw.name || 'Imported Dataset', records, raw.description, raw.citation);
    }
  }
  const datasetId = String(target);
  const entry = runtimeDatasetRegistry.get(datasetId) || DEMO_DATASETS[datasetId];
  if (entry) return buildDatasetProfile(entry.id, entry.title, entry.records, entry.description, entry.citation);
  return { datasetId: datasetId || '', title: datasetId ? `Dataset (${datasetId})` : 'No Dataset Loaded', description: 'Empty or uninitialized dataset', citation: '', rowCount: 0, fields: [], records: [] };
}
