import { FigureSpec } from '../../types';

export function diffFigureSpecs(current: FigureSpec, candidate: FigureSpec): string[] {
  const diffs: string[] = [];

  if (current.title !== candidate.title) {
    diffs.push(`Title changed from "${current.title}" → "${candidate.title}"`);
  }

  if (current.figureIntent !== candidate.figureIntent) {
    diffs.push(`Analytical intent changed from [${current.figureIntent}] → [${candidate.figureIntent}]`);
  }

  if (current.mark !== candidate.mark) {
    diffs.push(`Primary mark changed from [${current.mark}] → [${candidate.mark}]`);
  }

  if (current.encoding.x.field !== candidate.encoding.x.field || current.encoding.x.type !== candidate.encoding.x.type) {
    diffs.push(`X-axis mapped to "${candidate.encoding.x.field}" (${candidate.encoding.x.type}) [was "${current.encoding.x.field}"]`);
  }

  if (current.encoding.y.field !== candidate.encoding.y.field || current.encoding.y.type !== candidate.encoding.y.type) {
    diffs.push(`Y-axis mapped to "${candidate.encoding.y.field}" (${candidate.encoding.y.type}) [was "${current.encoding.y.field}"]`);
  }

  const currColor = current.encoding.color?.field;
  const candColor = candidate.encoding.color?.field;
  if (currColor !== candColor) {
    if (candColor) {
      diffs.push(`Color encoding set to "${candColor}" (${candidate.encoding.color?.type})`);
    } else {
      diffs.push('Color encoding removed');
    }
  }

  const currShape = current.encoding.shape?.field;
  const candShape = candidate.encoding.shape?.field;
  if (currShape !== candShape) {
    if (candShape) {
      diffs.push(`Shape encoding set to "${candShape}"`);
    } else {
      diffs.push('Shape encoding removed');
    }
  }

  if (current.showsRawObservations !== candidate.showsRawObservations) {
    diffs.push(candidate.showsRawObservations 
      ? 'Enabled raw observation layer (individual jittered points)' 
      : 'Disabled raw observation points');
  }

  if (current.uncertaintyEncoding !== candidate.uncertaintyEncoding) {
    diffs.push(`Uncertainty treatment changed to "${candidate.uncertaintyEncoding || 'none'}"`);
  }

  if (diffs.length === 0) {
    diffs.push('No functional encoding changes detected.');
  }

  return diffs;
}
