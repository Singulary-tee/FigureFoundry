import React from 'react';
import { Group, Rect, Text, Line } from 'react-konva';
import { GroupedBarSpec, PanelFrame, CanvasTheme } from '../../types/multipanel';
import { getGroupedBarYAxisRange } from '../../packages/multipanel/groupedBar';

interface GroupedBarKonvaProps {
  spec: GroupedBarSpec;
  frame: PanelFrame;
  letter: string;
  theme: CanvasTheme;
}

export const GroupedBarKonva: React.FC<GroupedBarKonvaProps> = ({
  spec,
  frame,
  letter,
  theme,
}) => {
  const { width, height } = frame;
  const padding = 16;
  const colors = theme.colors;
  const hasInvalidGroup = Array.isArray(spec.groups) && spec.groups.some((group) =>
    !Number.isFinite(group.treatmentVal) || !Number.isFinite(group.controlVal),
  );
  const hasBindingIssues = !spec.datasetId || Boolean(spec.bindingIssues?.length) || hasInvalidGroup;
  const bindingMessage = spec.bindingIssues?.join(' ') || (!spec.datasetId
    ? 'no dataset is bound to this panel.'
    : 'the mapped bar measures contain invalid values.');

  const plotLeft = 60;
  const plotRight = width - 40;
  const plotTop = 55;
  const plotBottom = height - 55;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;

  const { min: yMin, max: yMax } = getGroupedBarYAxisRange(spec.groups, spec.yAxis);
  const yDiff = yMax - yMin;

  const mapY = (val: number) => {
    if (!Number.isFinite(val)) return plotBottom;
    const frac = (val - yMin) / yDiff;
    return Math.max(plotTop, Math.min(plotBottom, plotBottom - frac * plotHeight));
  };

  const groupsList = hasBindingIssues ? [] : (Array.isArray(spec?.groups) ? spec.groups : []);
  const groupCount = groupsList.length || 1;
  const groupSlotWidth = plotWidth / groupCount;
  const barWidth = Math.max(4, Math.min(22, (groupSlotWidth - 12) / 2));

  return (
    <Group>
      {/* Background card fill */}
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill={colors.cardBackground}
        stroke={colors.border}
        strokeWidth={1}
        cornerRadius={2}
      />

      {hasBindingIssues && spec.showLabels && (
        <Text
          x={padding + 12}
          y={plotTop + 24}
          width={width - padding * 2 - 24}
          text={`Data unavailable: ${bindingMessage}`}
          fontSize={11}
          fontStyle="bold"
          fontFamily="system-ui, -apple-system, sans-serif"
          fill={colors.mutedText}
          wrap="word"
        />
      )}

      {/* Letter badge "D" */}
      {spec.showLabels && letter && (
        <Text
          x={padding}
          y={padding}
          text={letter}
          fontSize={16}
          fontStyle="bold"
          fontFamily="system-ui, -apple-system, sans-serif"
          fill={colors.text}
        />
      )}

      {/* Title */}
      {spec.showLabels && (
        <Text
          x={plotLeft + plotWidth / 2 - 50}
          y={padding}
          text={spec.title || 'Outcome Rates'}
          fontSize={13}
          fontStyle="bold"
          fontFamily="system-ui, -apple-system, sans-serif"
          fill={colors.text}
          align="center"
        />
      )}

      {/* Legend Top-Right */}
      {spec.showLabels && (
        <Group x={width - 150} y={padding}>
          {/* Treatment legend item */}
          <Rect x={0} y={2} width={12} height={12} fill={colors.primary} />
          <Text
            x={16}
            y={1}
            text={spec.legend.treatmentLabel || 'Treatment'}
            fontSize={11}
            fontFamily="system-ui, -apple-system, sans-serif"
            fill={colors.text}
          />

          {/* Control legend item */}
          <Rect x={0} y={18} width={12} height={12} fill={colors.secondary} />
          <Text
            x={16}
            y={17}
            text={spec.legend.controlLabel || 'Control'}
            fontSize={11}
            fontFamily="system-ui, -apple-system, sans-serif"
            fill={colors.text}
          />
        </Group>
      )}

      {/* Y Axis Grid Lines & Ticks */}
      {spec.showAxes && (
        <Group>
          {/* Y Axis Line */}
          <Line
            points={[plotLeft, plotTop, plotLeft, plotBottom]}
            stroke={colors.text}
            strokeWidth={1}
          />

          {/* Ticks follow the configured axis range rather than demo values. */}
          {Array.from({ length: 5 }, (_, index) => yMin + (yDiff * index) / 4).map((yVal) => {
            const yPos = mapY(yVal);
            return (
              <Group key={yVal}>
                {spec.showGrid && yVal > 0 && (
                  <Line
                    points={[plotLeft, yPos, plotRight, yPos]}
                    stroke={colors.gridline}
                    strokeWidth={1}
                    dash={[2, 2]}
                  />
                )}
                <Line
                  points={[plotLeft - 4, yPos, plotLeft, yPos]}
                  stroke={colors.text}
                  strokeWidth={1}
                />
                {spec.showLabels && (
                  <Text
                    x={plotLeft - 28}
                    y={yPos - 6}
                    width={22}
                    text={Number.isInteger(yVal) ? String(yVal) : yVal.toFixed(2)}
                    fontSize={10.5}
                    fontFamily="system-ui, -apple-system, sans-serif"
                    fill={colors.text}
                    align="right"
                  />
                )}
              </Group>
            );
          })}

          {/* Y Axis Title rotated */}
          {spec.showLabels && (
            <Text
              x={14}
              y={plotTop + plotHeight / 2 + 40}
              text={spec.yAxis.title || 'Event Rate (%)'}
              fontSize={10.5}
              fontFamily="system-ui, -apple-system, sans-serif"
              fill={colors.text}
              rotation={-90}
            />
          )}
        </Group>
      )}

      {/* X Axis */}
      {spec.showAxes && (
        <Line
          points={[plotLeft, plotBottom, plotRight, plotBottom]}
          stroke={colors.text}
          strokeWidth={1}
        />
      )}

      {/* Grouped Bars */}
      {groupsList.map((grp, idx) => {
        const groupCenterX = plotLeft + idx * groupSlotWidth + groupSlotWidth / 2;
        const treatY = mapY(grp.treatmentVal);
        const treatHeight = Math.max(0, plotBottom - treatY);

        const ctrlY = mapY(grp.controlVal);
        const ctrlHeight = Math.max(0, plotBottom - ctrlY);

        const treatX = groupCenterX - barWidth - 1;
        const ctrlX = groupCenterX + 1;

        return (
          <Group key={grp.id || idx}>
            {/* Treatment bar */}
            {spec.showDataPoints && (
              <Rect
                x={treatX}
                y={treatY}
                width={barWidth}
                height={treatHeight}
                fill={colors.primary}
                cornerRadius={[1, 1, 0, 0]}
              />
            )}

            {/* Control bar */}
            {spec.showDataPoints && (
              <Rect
                x={ctrlX}
                y={ctrlY}
                width={barWidth}
                height={ctrlHeight}
                fill={colors.secondary}
                cornerRadius={[1, 1, 0, 0]}
              />
            )}

            {/* Category label */}
            {spec.showLabels && (
              <Text
                x={groupCenterX - groupSlotWidth / 2}
                y={plotBottom + 8}
                width={groupSlotWidth}
                ellipsis={true}
                wrap="none"
                text={grp.category}
                fontSize={11}
                fontFamily="system-ui, -apple-system, sans-serif"
                fill={colors.text}
                align="center"
              />
            )}
          </Group>
        );
      })}
    </Group>
  );
};
