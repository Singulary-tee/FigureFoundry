import type { GroupedBarItem } from '../../types/multipanel';

export interface GroupedBarYAxis {
  min?: number;
  max?: number;
  autoMax?: boolean;
}

export interface GroupedBarYAxisRange {
  min: number;
  max: number;
}

export function getGroupedBarYAxisRange(
  groups: GroupedBarItem[] = [],
  axis: GroupedBarYAxis = {},
): GroupedBarYAxisRange {
  const min = Number.isFinite(axis.min) ? Number(axis.min) : 0;
  const configuredMax = Number.isFinite(axis.max) && Number(axis.max) > min ? Number(axis.max) : min + 1;

  if (axis.autoMax === false) return { min, max: configuredMax };

  const values = groups.flatMap((group) => [group.treatmentVal, group.controlVal])
    .filter((value): value is number => Number.isFinite(value));
  if (values.length === 0) return { min, max: configuredMax };

  const dataMax = Math.max(min, ...values);
  const dataRange = Math.max(dataMax - min, 1);
  return { min, max: dataMax + dataRange * 0.1 };
}
