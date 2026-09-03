import React from 'react';
import { Group, Rect, Text, Line, Circle } from 'react-konva';
import { FunnelPlotSpec, PanelFrame, CanvasTheme } from '../../types/multipanel';

interface FunnelPlotKonvaProps {
  spec: FunnelPlotSpec;
  frame: PanelFrame;
  letter: string;
  theme: CanvasTheme;
}

export const FunnelPlotKonva: React.FC<FunnelPlotKonvaProps> = ({
  spec,
  frame,
  letter,
  theme,
}) => {
  const { width, height } = frame;
  const padding = 16;
  const colors = theme.colors;
  const hasInvalidPoint = Array.isArray(spec.points) && spec.points.some((point) =>
    !Number.isFinite(point.effect) || !Number.isFinite(point.standardError) || point.standardError <= 0 || (spec.xAxis.scale === 'log' && point.effect <= 0),
  );
  const hasBindingIssues = !spec.datasetId || Boolean(spec.bindingIssues?.length) || hasInvalidPoint;
  const bindingMessage = spec.bindingIssues?.join(' ') || (!spec.datasetId
    ? 'no dataset is bound to this panel.'
    : 'the mapped effect or standard-error values are invalid.');

  const plotLeft = 70;
  const plotRight = width - 40;
  const plotTop = 50;
  const plotBottom = height - 55;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;

  const configuredXMin = Number(spec?.xAxis?.min);
  const configuredXMax = Number(spec?.xAxis?.max);
  const configuredYMin = Number(spec?.yAxis?.min);
  const configuredYMax = Number(spec?.yAxis?.max);
  const xMin = Number.isFinite(configuredXMin) ? configuredXMin : -2;
  const xMax = Number.isFinite(configuredXMax) && configuredXMax > xMin ? configuredXMax : xMin + 1;
  const yMin = Number.isFinite(configuredYMin) ? configuredYMin : 0;
  const yMax = Number.isFinite(configuredYMax) && configuredYMax > yMin ? configuredYMax : yMin + 1;

  const xDiff = xMax - xMin !== 0 ? xMax - xMin : 1;
  const yDiff = yMax - yMin !== 0 ? yMax - yMin : 1;

  const mapX = (val: number) => {
    if (val == null || isNaN(val)) return plotLeft;
    const frac = (val - xMin) / xDiff;
    return plotLeft + frac * plotWidth;
  };

  // Funnel plots conventionally put the most precise studies at the top.
  const mapY = (val: number) => {
    if (val == null || isNaN(val)) return plotTop;
    const frac = (val - yMin) / yDiff;
    return spec.yAxis.inverted === false ? plotBottom - frac * plotHeight : plotTop + frac * plotHeight;
  };

  const nullEffectX = mapX(0);

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

      {/* Letter badge "B" */}
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

      {/* Title "Funnel Plot" */}
      {spec.showLabels && (
        <Text
          x={plotLeft + plotWidth / 2 - 50}
          y={padding}
          text={spec.title || 'Funnel Plot'}
          fontSize={13}
          fontStyle="bold"
          fontFamily="system-ui, -apple-system, sans-serif"
          fill={colors.text}
          align="center"
        />
      )}

      {hasBindingIssues && spec.showLabels && (
        <Text
          x={padding + 54}
          y={plotTop + 24}
          width={plotWidth - 24}
          text={`Data unavailable: ${bindingMessage}`}
          fontSize={11}
          fontStyle="bold"
          fontFamily="system-ui, -apple-system, sans-serif"
          fill={colors.mutedText}
          wrap="word"
        />
      )}

      {/* Null-effect reference line; confidence contours require a validated pooled estimate and are not inferred here. */}
      {!hasBindingIssues && spec.showFunnelGuides && (
        <Group>
          <Line
            points={[nullEffectX, plotTop, nullEffectX, plotBottom]}
            stroke={colors.gridline}
            strokeWidth={1.5}
            dash={[3, 3]}
          />
        </Group>
      )}

      {/* Y Axis (SE log OR) */}
      {spec.showAxes && (
        <Group>
          <Line
            points={[plotLeft, plotTop, plotLeft, plotBottom]}
            stroke={colors.text}
            strokeWidth={1}
          />
          {/* Y Ticks: 0.0, 0.5, 1.0, 1.5, 2.0 */}
          {Array.from({ length: 5 }, (_, index) => yMin + (yDiff * index) / 4).map((yVal) => {
            const yPos = mapY(yVal);
            return (
              <Group key={yVal}>
                <Line
                  points={[plotLeft - 4, yPos, plotLeft, yPos]}
                  stroke={colors.text}
                  strokeWidth={1}
                />
                {spec.showLabels && (
                  <Text
                    x={plotLeft - 32}
                    y={yPos - 6}
                    width={26}
                    text={yVal.toFixed(1)}
                    fontSize={10.5}
                    fontFamily="system-ui, -apple-system, sans-serif"
                    fill={colors.text}
                    align="right"
                  />
                )}
              </Group>
            );
          })}

          {/* Y Axis Title rotated or vertical */}
          {spec.showLabels && (
            <Text
              x={14}
              y={plotTop + plotHeight / 2 + 35}
              text={spec.yAxis.title || 'Standard error'}
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
        <Group>
          <Line
            points={[plotLeft, plotBottom, plotRight, plotBottom]}
            stroke={colors.text}
            strokeWidth={1}
          />
          {/* X Ticks: -2, -1, 0, 1, 2 */}
          {Array.from({ length: 5 }, (_, index) => xMin + ((xMax - xMin) * index) / 4).map((xVal) => {
            const xPos = mapX(xVal);
            return (
              <Group key={xVal}>
                <Line
                  points={[xPos, plotBottom, xPos, plotBottom + 4]}
                  stroke={colors.text}
                  strokeWidth={1}
                />
                {spec.showLabels && (
                  <Text
                    x={xPos - 12}
                    y={plotBottom + 6}
                    width={24}
                    text={xVal.toFixed(2).replace(/\.00$/, '')}
                    fontSize={10.5}
                    fontFamily="system-ui, -apple-system, sans-serif"
                    fill={colors.text}
                    align="center"
                  />
                )}
              </Group>
            );
          })}

          {/* X Axis Title */}
          {spec.showLabels && (
            <Text
              x={plotLeft + plotWidth / 2 - 60}
              y={plotBottom + 22}
              text={spec.xAxis.title || (spec.xAxis.scale === 'log' ? 'Effect (log scale)' : 'Effect')}
              fontSize={10.5}
              fontFamily="system-ui, -apple-system, sans-serif"
              fill={colors.text}
              align="center"
            />
          )}
        </Group>
      )}

      {/* Data Points */}
      {!hasBindingIssues && spec.showDataPoints &&
        (Array.isArray(spec.points) ? spec.points : []).map((pt, idx) => {
          const ptX = mapX(spec.xAxis.scale === 'log' ? Math.log(pt?.effect) : pt?.effect);
          const ptY = mapY(pt?.standardError);
          return (
            <Circle
              key={pt?.id || idx}
              x={ptX}
              y={ptY}
              radius={4}
              fill={colors.primary}
              stroke={colors.cardBackground}
              strokeWidth={1}
            />
          );
        })}
    </Group>
  );
};
