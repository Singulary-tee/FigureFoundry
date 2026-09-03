import { DatasetField, DatasetProfile, StatisticalType } from '../../types';

export const MAX_IMPORT_TEXT_LENGTH = 2 * 1024 * 1024;
export const MAX_IMPORT_RECORDS = 5000;

function assertSafeText(text: string, format: 'CSV' | 'JSON'): string {
  const cleanText = text.replace(/^\uFEFF/, '').trim();
  if (!cleanText) return '';
  if (cleanText.length > MAX_IMPORT_TEXT_LENGTH) {
    throw new Error(`File is too large. ${format} text exceeds the ${MAX_IMPORT_TEXT_LENGTH} character safety limit.`);
  }
  if (cleanText.includes('\x00')) {
    throw new Error('Unsupported binary file format detected. Upload a UTF-8 plain-text CSV, TSV, or JSON file.');
  }
  return cleanText;
}

function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  return [',', '\t', ';'].reduce((best, candidate) =>
    firstLine.split(candidate).length > firstLine.split(best).length ? candidate : best
  , ',');
}

function uniqueHeaders(headers: string[]): string[] {
  const seen = new Map<string, number>();
  return headers.map((header, index) => {
    const base = header.trim() || `column_${index + 1}`;
    const count = seen.get(base) || 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}_${count + 1}`;
  });
}

function coerceCell(value: string): string | number | boolean | null {
  const clean = value.trim();
  if (!clean || /^(na|null|none)$/i.test(clean)) return null;
  if (/^true$/i.test(clean)) return true;
  if (/^false$/i.test(clean)) return false;
  const numeric = Number(clean);
  return Number.isFinite(numeric) ? numeric : clean;
}

/** Parse a quoted CSV, TSV, or semicolon-delimited table into typed records. */
export function parseCSV(csvText: string): Record<string, unknown>[] {
  const cleanText = assertSafeText(csvText, 'CSV');
  if (!cleanText) return [];

  const delimiter = detectDelimiter(cleanText);
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let index = 0; index < cleanText.length; index += 1) {
    const char = cleanText[index];
    const nextChar = cleanText[index + 1];
    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') index += 1;
      currentRow.push(currentField);
      if (currentRow.some((cell) => cell.trim().length > 0)) rows.push(currentRow);
      currentRow = [];
      currentField = '';
      if (rows.length > MAX_IMPORT_RECORDS + 1) {
        throw new Error(`File contains more than ${MAX_IMPORT_RECORDS} data records. Reduce the file before importing so no rows are silently discarded.`);
      }
    } else {
      currentField += char;
    }
  }

  if (insideQuotes) throw new Error('CSV contains an unterminated quoted value.');
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((cell) => cell.trim().length > 0)) rows.push(currentRow);
  }
  if (rows.length < 2) throw new Error('CSV file must have a header row and at least one data row.');

  const headers = uniqueHeaders(rows[0]);
  return rows.slice(1).map((row) => {
    const record: Record<string, unknown> = {};
    headers.forEach((header, columnIndex) => { record[header] = coerceCell(row[columnIndex] || ''); });
    return record;
  });
}

function flattenRecord(value: Record<string, unknown>, prefix = '', output: Record<string, unknown> = {}): Record<string, unknown> {
  Object.entries(value).forEach(([key, item]) => {
    const fieldName = prefix ? `${prefix}.${key}` : key;
    if (item === null || item === undefined || typeof item !== 'object' || item instanceof Date || Array.isArray(item)) {
      output[fieldName] = Array.isArray(item) ? JSON.stringify(item) : item ?? null;
    } else {
      flattenRecord(item as Record<string, unknown>, fieldName, output);
    }
  });
  return output;
}

function extractJsonRecords(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') {
    const container = parsed as Record<string, unknown>;
    for (const key of ['records', 'rows', 'data', 'items']) {
      if (Array.isArray(container[key])) return container[key] as unknown[];
    }
  }
  throw new Error('JSON data must be an array of record objects, or an object containing records, rows, data, or items.');
}

export function parseJSON(jsonText: string): Record<string, unknown>[] {
  const cleanText = assertSafeText(jsonText, 'JSON');
  if (!cleanText) return [];
  const sourceRecords = extractJsonRecords(JSON.parse(cleanText));
  if (sourceRecords.length > MAX_IMPORT_RECORDS) {
    throw new Error(`File contains more than ${MAX_IMPORT_RECORDS} data records. Reduce the file before importing so no rows are silently discarded.`);
  }
  const records = sourceRecords
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item))
    .map((record) => flattenRecord(record));
  if (records.length === 0) throw new Error('JSON contains no record objects to import.');
  return records;
}

export function inferFieldType(values: unknown[]): StatisticalType {
  const nonNulls = values.filter((value) => value !== null && value !== undefined && value !== '');
  if (nonNulls.length === 0) return 'categorical';
  if (nonNulls.every((value) => typeof value === 'number' && Number.isFinite(value))) return 'quantitative';
  if (nonNulls.every((value) => typeof value === 'string' && !Number.isFinite(Number(value)) && !Number.isNaN(Date.parse(value)))) return 'temporal';
  return 'categorical';
}

export function buildDatasetProfile(
  datasetId: string,
  title: string,
  records: Record<string, unknown>[],
  description = 'User-imported dataset',
  citation = 'Uploaded local data'
): DatasetProfile {
  if (records.length === 0) return { datasetId, title, description, citation, rowCount: 0, fields: [], records: [] };

  const fieldKeys = Array.from(new Set(records.flatMap((record) => Object.keys(record))));
  const fields: DatasetField[] = fieldKeys.map((key) => {
    const columnValues = records.map((record) => record[key]);
    const nonNullValues = columnValues.filter((value) => value !== null && value !== undefined && value !== '');
    const type = inferFieldType(columnValues);
    const uniqueValues = Array.from(new Set(nonNullValues));
    const numericValues = type === 'quantitative'
      ? nonNullValues.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
      : [];
    return {
      name: key,
      type,
      unit: null,
      missingCount: columnValues.length - nonNullValues.length,
      cardinality: uniqueValues.length,
      exampleValues: uniqueValues.slice(0, 5).filter((value): value is string | number | boolean => ['string', 'number', 'boolean'].includes(typeof value)),
      min: numericValues.length ? Math.min(...numericValues) : undefined,
      max: numericValues.length ? Math.max(...numericValues) : undefined,
      uniqueValues: type === 'categorical'
        ? uniqueValues.slice(0, 50).filter((value): value is string | number | boolean => ['string', 'number', 'boolean'].includes(typeof value))
        : undefined,
    };
  });
  return { datasetId, title, description, citation, rowCount: records.length, fields, records };
}
