import { DatasetField, DatasetProfile, StatisticalType } from '../../types';

export function parseCSV(csvText: string): Record<string, any>[] {
  const cleanText = csvText.trim();
  if (!cleanText) return [];

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; 
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; 
      }
      currentRow.push(currentField.trim());
      if (currentRow.some(cell => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(cell => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map((h, idx) => h.trim() || `col_${idx + 1}`);
  const records: Record<string, any>[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const record: Record<string, any> = {};

    headers.forEach((header, colIdx) => {
      const rawVal = row[colIdx] !== undefined ? row[colIdx].trim() : '';

      if (rawVal === '' || rawVal.toLowerCase() === 'na' || rawVal.toLowerCase() === 'null' || rawVal.toLowerCase() === 'none') {
        record[header] = null;
      } else if (rawVal.toLowerCase() === 'true') {
        record[header] = true;
      } else if (rawVal.toLowerCase() === 'false') {
        record[header] = false;
      } else if (!isNaN(Number(rawVal)) && rawVal !== '') {
        record[header] = Number(rawVal);
      } else {
        record[header] = rawVal;
      }
    });

    records.push(record);
  }

  return records;
}

export function parseJSON(jsonText: string): Record<string, any>[] {
  const parsed = JSON.parse(jsonText);
  if (!Array.isArray(parsed)) {
    throw new Error('JSON data must be an array of record objects (e.g. [{ "a": 1, "b": "x" }, ...]).');
  }
  return parsed.filter(item => typeof item === 'object' && item !== null);
}

export function inferFieldType(values: any[]): StatisticalType {
  const nonNulls = values.filter(v => v !== null && v !== undefined && v !== '');
  if (nonNulls.length === 0) return 'categorical';

  const dateRegex = /^\d{4}-\d{2}-\d{2}/;
  if (nonNulls.every(v => typeof v === 'string' && (dateRegex.test(v) || !isNaN(Date.parse(v)) && isNaN(Number(v))))) {
    return 'temporal';
  }

  if (nonNulls.every(v => typeof v === 'number' && !isNaN(v))) {
    return 'quantitative';
  }

  return 'categorical';
}

export function buildDatasetProfile(
  datasetId: string,
  title: string,
  records: Record<string, any>[],
  description: string = 'User-imported dataset',
  citation: string = 'Uploaded local scientific data'
): DatasetProfile {
  const rowCount = records.length;
  if (rowCount === 0) {
    return {
      datasetId,
      title,
      description,
      citation,
      rowCount: 0,
      fields: [],
      records: []
    };
  }

  const keySet = new Set<string>();
  records.slice(0, 100).forEach(r => Object.keys(r).forEach(k => keySet.add(k)));
  const fieldKeys = Array.from(keySet).slice(0, 16);

  const fields: DatasetField[] = fieldKeys.map(key => {
    const columnValues = records.map(r => r[key]);
    const missingCount = columnValues.filter(v => v === null || v === undefined || v === '').length;
    const nonNullValues = columnValues.filter(v => v !== null && v !== undefined && v !== '');
    const type = inferFieldType(columnValues);

    const uniqueSet = new Set(nonNullValues);
    const cardinality = uniqueSet.size;
    const uniqueArray = Array.from(uniqueSet);
    const exampleValues = uniqueArray.slice(0, 5);

    let min: number | undefined = undefined;
    let max: number | undefined = undefined;

    if (type === 'quantitative' && nonNullValues.length > 0) {
      const numericVals = nonNullValues.map(v => Number(v)).filter(v => !isNaN(v));
      if (numericVals.length > 0) {
        min = Math.min(...numericVals);
        max = Math.max(...numericVals);
      }
    }

    return {
      name: key,
      type,
      unit: null,
      missingCount,
      cardinality,
      exampleValues,
      min,
      max,
      uniqueValues: type === 'categorical' ? uniqueArray.slice(0, 12) : undefined
    };
  });

  return {
    datasetId,
    title,
    description,
    citation,
    rowCount,
    fields,
    records
  };
}
