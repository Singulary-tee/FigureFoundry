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

  const plotLeft = 70;
  const plotRight = width - 40;
  const plotTop = 50;
  const plotBottom = height - 55;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;

  const xMin = spec?.xAxis?.min ?? -2;
  const xMax = spec?.xAxis?.max ?? 2;
  const yMin = spec?.yAxis?.min ?? 0.0;
  const yMax = spec?.yAxis?.max ?? 2.0;

  const xDiff = xMax - xMin !== 0 ? xMax - xMin : 1;
  const yDiff = yMax - yMin !== 0 ? yMax - yMin : 1;

  const mapX = (val: number) => {
    if (val == null || isNaN(val)) return plotLeft;
    const frac = (val - xMin) / xDiff;
    return plotLeft + frac * plotWidth;
  };

  // SE is inverted: 0.0 is top, 2.0 is bottom
  const mapY = (val: number) => {
    if (val == null || isNaN(val)) return plotTop;
    const frac = (val - yMin) / yDiff;
    return plotTop + frac * plotHeight;
  };

  const centerPeakX = mapX(0);
  const peakY = mapY(0);
  const leftFunnelBottomX = mapX(xMin);
  const rightFunnelBottomX = mapX(xMax);
  const funnelBottomY = mapY(yMax);

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

      {/* Funnel Guide Triangle */}
      {spec.showFunnelGuides && (
        <Group>
          {/* Vertical center axis */}
          <Line
            points={[centerPeakX, peakY, centerPeakX, funnelBottomY]}
            stroke={colors.gridline}
            strokeWidth={1.5}
            dash={[3, 3]}
          />
          {/* Left funnel diagonal guide */}
          <Line
            points={[centerPeakX, peakY, leftFunnelBottomX + 20, funnelBottomY]}
            stroke={colors.mutedText}
            strokeWidth={1}
            dash={[2, 2]}
          />
          {/* Right funnel diagonal guide */}
          <Line
            points={[centerPeakX, peakY, rightFunnelBottomX - 20, funnelBottomY]}
            stroke={colors.mutedText}
            strokeWidth={1}
            dash={[2, 2]}
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
          {[0.0, 0.5, 1.0, 1.5, 2.0].map((yVal) => {
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
              text={spec.yAxis.title || 'SE (log OR)'}
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
          {[-2, -1, 0, 1, 2].map((xVal) => {
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
                    text={String(xVal)}
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
              text={spec.xAxis.title || 'Odds Ratio (log scale)'}
              fontSize={10.5}
              fontFamily="system-ui, -apple-system, sans-serif"
              fill={colors.text}
              align="center"
            />
          )}
        </Group>
      )}

      {/* Data Points */}
      {spec.showDataPoints &&
        (Array.isArray(spec.points) ? spec.points : []).map((pt, idx) => {
          const ptX = mapX(pt?.effect);
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
