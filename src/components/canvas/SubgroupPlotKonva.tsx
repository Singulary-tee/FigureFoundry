import React from 'react';
import { Group, Rect, Text, Line } from 'react-konva';
import { SubgroupSpec, PanelFrame, CanvasTheme } from '../../types/multipanel';

interface SubgroupPlotKonvaProps {
  spec: SubgroupSpec;
  frame: PanelFrame;
  letter: string;
  theme: CanvasTheme;
}

export const SubgroupPlotKonva: React.FC<SubgroupPlotKonvaProps> = ({
  spec,
  frame,
  letter,
  theme,
}) => {
  const { width, height } = frame;
  const padding = 16;
  const colors = theme.colors;
  const isLinearScale = spec?.xAxis?.scale === 'linear';
  const hasInvalidSubgroup = Array.isArray(spec.subgroups) && spec.subgroups.some((subgroup) =>
    !Number.isFinite(subgroup.effect) ||
    !Number.isFinite(subgroup.ciLower) ||
    !Number.isFinite(subgroup.ciUpper) ||
    (!isLinearScale && (subgroup.effect <= 0 || subgroup.ciLower <= 0)) ||
    subgroup.ciLower > subgroup.effect ||
    subgroup.ciUpper < subgroup.effect,
  );
  const hasBindingIssues = !spec.datasetId || Boolean(spec.bindingIssues?.length) || hasInvalidSubgroup;
  const bindingMessage = spec.bindingIssues?.join(' ') || (!spec.datasetId
    ? 'no dataset is bound to this panel.'
    : 'the mapped subgroup rows contain invalid or unordered values.');

  const minVal = isLinearScale
    ? (Number.isFinite(spec?.xAxis?.min) && spec.xAxis.min < 0 ? spec.xAxis.min : -1)
    : (spec?.xAxis?.min && spec.xAxis.min > 0 ? spec.xAxis.min : 0.1);
  const maxVal = Number.isFinite(spec?.xAxis?.max) && spec.xAxis.max > minVal ? spec.xAxis.max : (isLinearScale ? 1 : 10);
  const logMin = Math.log10(minVal);
  const logMax = Math.log10(maxVal);
  const logDiff = logMax - logMin > 0 ? logMax - logMin : 1;

  const plotLeft = 140;
  const plotRight = Math.max(plotLeft + 50, width - 85);
  const plotWidth = Math.max(50, plotRight - plotLeft);

  const mapX = (val: number) => {
    if (val == null || !Number.isFinite(val) || (!isLinearScale && val <= 0)) return plotLeft;
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    const frac = isLinearScale
      ? (clamped - minVal) / (maxVal - minVal)
      : (Math.log10(clamped) - logMin) / logDiff;
    return plotLeft + frac * plotWidth;
  };

  const refLineX = mapX(spec?.xAxis?.referenceLine ?? 1.0);

  const topHeaderY = 16;
  const contentStartY = 50;
  const rowHeight = 44;
  const subgroupsList = hasBindingIssues ? [] : (Array.isArray(spec?.subgroups) ? spec.subgroups : []);
  const visibleRowCount = Math.max(1, Math.floor((height - contentStartY - 65) / rowHeight));
  const visibleSubgroups = subgroupsList.slice(0, visibleRowCount);
  const hiddenSubgroupCount = Math.max(0, subgroupsList.length - visibleSubgroups.length);
  const axisY = contentStartY + visibleSubgroups.length * rowHeight + 20;

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
          x={padding + 22}
          y={contentStartY + 24}
          width={width - padding * 2 - 30}
          text={`Data unavailable: ${bindingMessage}`}
          fontSize={11}
          fontStyle="bold"
          fontFamily="system-ui, -apple-system, sans-serif"
          fill={colors.mutedText}
          wrap="word"
        />
      )}

      {/* Letter badge "C" */}
      {spec.showLabels && letter && (
        <Text
          x={padding}
          y={topHeaderY}
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
          x={plotLeft + plotWidth / 2 - 80}
          y={topHeaderY}
          text={spec.title || 'Subgroup Analysis (Age)'}
          fontSize={13}
          fontStyle="bold"
          fontFamily="system-ui, -apple-system, sans-serif"
          fill={colors.text}
          align="center"
        />
      )}

      {/* Column Headers */}
      {spec.showLabels && (
        <>
          <Text
            x={padding + 22}
            y={topHeaderY + 24}
            text="Age Group"
            fontSize={11.5}
            fontStyle="bold"
            fontFamily="system-ui, -apple-system, sans-serif"
            fill={colors.text}
          />
          <Text
            x={plotLeft + plotWidth / 2 - 50}
            y={topHeaderY + 24}
            text={isLinearScale ? 'Difference (95% CI)' : 'Odds Ratio (95% CI)'}
            fontSize={11.5}
            fontStyle="bold"
            fontFamily="system-ui, -apple-system, sans-serif"
            fill={colors.text}
            align="center"
          />
          <Text
            x={width - 55}
            y={topHeaderY + 24}
            text="I²"
            fontSize={11.5}
            fontStyle="bold"
            fontFamily="system-ui, -apple-system, sans-serif"
            fill={colors.text}
          />
        </>
      )}

      {/* Reference Line */}
      {spec.showReferenceBars && (
        <Line
          points={[refLineX, contentStartY + 10, refLineX, axisY]}
          stroke={colors.gridline}
          strokeWidth={1.5}
          dash={[3, 3]}
        />
      )}

      {/* Subgroups */}
      {visibleSubgroups.map((sg, idx) => {
        const rowY = contentStartY + 30 + idx * rowHeight;
        const eff = sg.effect;
        const ciLower = sg.ciLower;
        const ciUpper = sg.ciUpper;
        const iSq = sg.iSquared;

        const ptX = mapX(eff);
        const ciLeftX = mapX(ciLower);
        const ciRightX = mapX(ciUpper);

        return (
          <Group key={sg?.id || idx}>
            {/* Group Name */}
            {spec.showLabels && (
              <Text
                x={padding + 22}
                y={rowY - 6}
                width={plotLeft - padding - 30}
                ellipsis={true}
                wrap="none"
                text={sg?.groupName || `Subgroup ${idx + 1}`}
                fontSize={11.5}
                fontFamily="system-ui, -apple-system, sans-serif"
                fill={colors.text}
              />
            )}

            {/* Error bar CI line */}
            {spec.showErrorBars && (
              <Line
                points={[ciLeftX, rowY, ciRightX, rowY]}
                stroke={colors.primary}
                strokeWidth={1.5}
              />
            )}

            {/* Point square */}
            {spec.showDataPoints && (
              <Rect
                x={ptX - 4}
                y={rowY - 4}
                width={8}
                height={8}
                fill={colors.primary}
              />
            )}

            {/* Odds ratio text */}
            {spec.showLabels && (
              <Text
                x={width - 165}
                y={rowY - 6}
                text={`${eff.toFixed(2)} [${ciLower.toFixed(2)}, ${ciUpper.toFixed(2)}]`}
                fontSize={11}
                fontFamily="system-ui, -apple-system, sans-serif"
                fill={colors.text}
              />
            )}

            {/* I-squared % */}
            {spec.showLabels && (
              <Text
                x={width - 55}
                y={rowY - 6}
                text={Number.isFinite(iSq) ? `${iSq}%` : 'Not estimable'}
                fontSize={11.5}
                fontFamily="system-ui, -apple-system, sans-serif"
                fill={colors.text}
              />
            )}
          </Group>
        );
      })}

      {hiddenSubgroupCount > 0 && spec.showLabels && (
        <Text
          x={padding + 22}
          y={contentStartY + visibleSubgroups.length * rowHeight - 4}
          width={plotLeft - padding - 30}
          text={`+${hiddenSubgroupCount} more subgroups (see Data)`}
          fontSize={10.5}
          fontStyle="italic"
          fontFamily="system-ui, -apple-system, sans-serif"
          fill={colors.mutedText}
        />
      )}

      {/* X Axis & Ticks */}
      {spec.showAxes && (
        <Group>
          <Line
            points={[plotLeft - 10, axisY, plotRight + 10, axisY]}
            stroke={colors.text}
            strokeWidth={1}
          />

          {(isLinearScale
            ? Array.from({ length: 5 }, (_, index) => minVal + ((maxVal - minVal) * index) / 4)
            : [0.1, 0.5, 1, 2, 5, 10]
          ).map((tickVal) => {
            const tickX = mapX(tickVal);
            return (
              <Group key={tickVal}>
                <Line
                  points={[tickX, axisY, tickX, axisY + 4]}
                  stroke={colors.text}
                  strokeWidth={1}
                />
                {spec.showLabels && (
                  <Text
                    x={tickX - 12}
                    y={axisY + 6}
                    width={24}
                    text={String(tickVal)}
                    fontSize={10.5}
                    fontFamily="system-ui, -apple-system, sans-serif"
                    fill={colors.text}
                    align="center"
                  />
                )}
              </Group>
            );
          })}

          {/* Subtitle labels: "Favors Treatment" / "Favors Control" */}
          {spec.showLabels && (
            <>
              <Text
                x={plotLeft - 5}
                y={axisY + 22}
                text={spec.favorsLeftText || 'Favors Treatment'}
                fontSize={10}
                fontFamily="system-ui, -apple-system, sans-serif"
                fill={colors.mutedText}
              />
              <Text
                x={plotRight - 70}
                y={axisY + 22}
                text={spec.favorsRightText || 'Favors Control'}
                fontSize={10}
                fontFamily="system-ui, -apple-system, sans-serif"
                fill={colors.mutedText}
                align="right"
              />
            </>
          )}
        </Group>
      )}
    </Group>
  );
};
