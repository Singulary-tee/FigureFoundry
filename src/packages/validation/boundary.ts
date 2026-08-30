import { FigureSpec, DatasetProfile } from '../../types';

export interface ValidationIssueBoundary {
  path: string;
  message: string;
  severity: 'blocking' | 'warning';
}

export function validateCommandBoundary(
  commandType: string,
  payload: Record<string, any>,
  profile?: DatasetProfile | null
): { valid: boolean; errors: ValidationIssueBoundary[] } {
  const errors: ValidationIssueBoundary[] = [];

  if (commandType === 'PROPOSE_REVISION') {
    if (payload.basedOnRevision === undefined || payload.basedOnRevision === null) {
      errors.push({ path: 'basedOnRevision', message: 'basedOnRevision is required', severity: 'blocking' });
    }
    if (!payload.proposedSpec) {
      errors.push({ path: 'proposedSpec', message: 'proposedSpec object is required', severity: 'blocking' });
    } else {
      const spec = payload.proposedSpec as FigureSpec;
      if (!spec.mark) {
        errors.push({ path: 'proposedSpec.mark', message: 'Figure mark type is required', severity: 'blocking' });
      }
      if (!spec.encoding?.x?.field || !spec.encoding?.y?.field) {
        errors.push({ path: 'proposedSpec.encoding', message: 'X and Y channel field mappings are required', severity: 'blocking' });
      }
      if (profile) {
        const availableFields = new Set(profile.fields.map(f => f.name));
        if (spec.encoding?.x?.field && !availableFields.has(spec.encoding.x.field)) {
          errors.push({
            path: 'proposedSpec.encoding.x.field',
            message: `Field '${spec.encoding.x.field}' does not exist in dataset '${profile.datasetId}'`,
            severity: 'blocking'
          });
        }
        if (spec.encoding?.y?.field && !availableFields.has(spec.encoding.y.field)) {
          errors.push({
            path: 'proposedSpec.encoding.y.field',
            message: `Field '${spec.encoding.y.field}' does not exist in dataset '${profile.datasetId}'`,
            severity: 'blocking'
          });
        }
      }
    }
  }

  if (commandType === 'APPLY_REVISION') {
    if (!payload.previewId) {
      errors.push({ path: 'previewId', message: 'previewId string is required', severity: 'blocking' });
    }
    if (payload.basedOnRevision === undefined || payload.basedOnRevision < 0) {
      errors.push({ path: 'basedOnRevision', message: 'Non-negative basedOnRevision is required', severity: 'blocking' });
    }
    if (!payload.humanApprovalConfirmed) {
      errors.push({ path: 'humanApprovalConfirmed', message: 'humanApprovalConfirmed must be true', severity: 'blocking' });
    }
  }

  return {
    valid: errors.filter(e => e.severity === 'blocking').length === 0,
    errors
  };
}
