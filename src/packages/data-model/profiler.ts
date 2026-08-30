import { DatasetProfile } from '../../types';
import { DEMO_DATASETS, DatasetEntry } from './datasets';
import { buildDatasetProfile } from './parser';

const runtimeDatasetRegistry = new Map<string, DatasetEntry>();

export function registerRuntimeDataset(entry: DatasetEntry): void {
  runtimeDatasetRegistry.set(entry.id, entry);
}

export function unregisterRuntimeDataset(id: string): void {
  runtimeDatasetRegistry.delete(id);
}

export function getRegisteredDatasets(): Record<string, DatasetEntry> {
  const all: Record<string, DatasetEntry> = { ...DEMO_DATASETS };
  runtimeDatasetRegistry.forEach((val, key) => {
    all[key] = val;
  });
  return all;
}

export function profileDataset(
  target: string | DatasetProfile | { records: Record<string, any>[]; id?: string; title?: string; description?: string; citation?: string } | null
): DatasetProfile {
  if (!target) {
    return {
      datasetId: '',
      title: 'No Dataset Loaded',
      description: 'Upload a CSV or JSON file to begin constructing scientific figures.',
      citation: '',
      rowCount: 0,
      fields: [],
      records: []
    };
  }

  if (typeof target === 'object' && 'fields' in target && Array.isArray(target.fields)) {
    return target as DatasetProfile;
  }

  if (typeof target === 'object' && 'records' in target && Array.isArray((target as any).records)) {
    const rawObj = target as any;
    const id = rawObj.id || rawObj.datasetId || 'custom_dataset_' + Date.now();
    const title = rawObj.title || 'Imported Dataset';
    return buildDatasetProfile(id, title, rawObj.records, rawObj.description, rawObj.citation);
  }

  const datasetId = String(target);
  if (runtimeDatasetRegistry.has(datasetId)) {
    const entry = runtimeDatasetRegistry.get(datasetId)!;
    return buildDatasetProfile(entry.id, entry.title, entry.records, entry.description, entry.citation);
  }

  if (DEMO_DATASETS[datasetId]) {
    const demo = DEMO_DATASETS[datasetId];
    return buildDatasetProfile(demo.id, demo.title, demo.records, demo.description, demo.citation);
  }

  return {
    datasetId: datasetId || '',
    title: datasetId ? `Dataset (${datasetId})` : 'No Dataset Loaded',
    description: 'Empty or uninitialized dataset',
    citation: '',
    rowCount: 0,
    fields: [],
    records: []
  };
}
