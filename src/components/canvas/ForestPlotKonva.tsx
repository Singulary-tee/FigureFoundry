import React from 'react';
import { Group, Rect, Text, Line } from 'react-konva';
import { ForestPlotSpec, PanelFrame, CanvasTheme } from '../../types/multipanel';

interface ForestPlotKonvaProps {
  spec: ForestPlotSpec;
  frame: PanelFrame;
  letter: string;
  theme: CanvasTheme;
}

export const ForestPlotKonva: React.FC<ForestPlotKonvaProps> = ({
  spec,
  frame,
  letter,
  theme,
}) => {
  const { width, height } = frame;
  const padding = 16;
  const colors = theme.colors;
  const requiresPositiveValues = !['Mean Difference (MD)', 'Risk Difference (RD)'].includes(spec.effectMeasure);
  const hasInvalidStudy = Array.isArray(spec.studies) && spec.studies.some((study) =>
    !Number.isFinite(study.effect) ||
    !Number.isFinite(study.ciLower) ||
    !Number.isFinite(study.ciUpper) ||
    (requiresPositiveValues && (study.effect <= 0 || study.ciLower <= 0)) ||
    study.ciLower > study.effect ||
    study.ciUpper < study.effect,
  );
  const hasBindingIssues = !spec.datasetId || Boolean(spec.bindingIssues?.length) || hasInvalidStudy;
  const hasPooledEstimate = spec.studies.length >= 2 &&
    Number.isFinite(spec.pooledEstimate?.effect) &&
    Number.isFinite(spec.pooledEstimate?.ciLower) &&
    Number.isFinite(spec.pooledEstimate?.ciUpper) &&
    spec.pooledEstimate.ciLower <= spec.pooledEstimate.effect &&
    spec.pooledEstimate.effect <= spec.pooledEstimate.ciUpper;
  const bindingMessage = spec.bindingIssues?.join(' ') || (!spec.datasetId
    ? 'no dataset is bound to this panel.'
    : 'the mapped study rows contain invalid or unordered values.');

  const isLogScale = spec?.xAxis?.scale === 'log' && requiresPositiveValues;
  const minVal = isLogScale
    ? (spec?.xAxis?.min && spec.xAxis.min > 0 ? spec.xAxis.min : 0.1)
    : (Number.isFinite(spec?.xAxis?.min) && spec.xAxis.min < 0 ? spec.xAxis.min : -1);
  const maxVal = Number.isFinite(spec?.xAxis?.max) && spec.xAxis.max > minVal
    ? spec.xAxis.max
    : (isLogScale ? 10 : 1);
  const logMin = Math.log10(minVal);
  const logMax = Math.log10(maxVal);
  const logDiff = logMax - logMin > 0 ? logMax - logMin : 1;

  const plotLeft = 140;
  const plotRight = Math.max(plotLeft + 50, width - 75);
  const plotWidth = Math.max(50, plotRight - plotLeft);

  const mapX = (val: number) => {
    if (val == null || !Number.isFinite(val) || (isLogScale && val <= 0)) return plotLeft;
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    const frac = isLogScale
      ? (Math.log10(clamped) - logMin) / logDiff
      : (clamped - minVal) / (maxVal - minVal);
    return plotLeft + frac * plotWidth;
  };

  const refLineX = mapX(spec?.xAxis?.referenceLine ?? 1.0);

  const topHeaderY = 16;
  const contentStartY = 45;
  const rowHeight = 28;
  const studiesList = hasBindingIssues ? [] : (Array.isArray(spec?.studies) ? spec.studies : []);
  // Keep the composited panel legible for arbitrary-size imported datasets.
  const visibleRowCount = Math.max(1, Math.floor((height - contentStartY - 105) / rowHeight));
  const visibleStudies = studiesList.slice(0, visibleRowCount);
  const hiddenStudyCount = Math.max(0, studiesList.length - visibleStudies.length);
  const totalY = contentStartY + visibleStudies.length * rowHeight + 10;
  const axisY = totalY + 28;

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

      {/* Letter badge "A" */}
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

      {/* Header labels */}
      {spec.showLabels && (
        <>
          <Text
            x={padding + 22}
            y={topHeaderY + 2}
            text="Study"
            fontSize={12}
            fontStyle="bold"
            fontFamily="system-ui, -apple-system, sans-serif"
            fill={colors.text}
          />
          <Text
            x={plotLeft + plotWidth / 2 - 45}
            y={topHeaderY - 2}
            text={spec.title || 'Odds Ratio'}
            fontSize={12}
            fontStyle="bold"
            fontFamily="system-ui, -apple-system, sans-serif"
            fill={colors.text}
            align="center"
          />
          {spec.showWeights && (
            <Text
              x={width - 65}
              y={topHeaderY + 2}
              text="Weight"
              fontSize={12}
              fontStyle="bold"
              fontFamily="system-ui, -apple-system, sans-serif"
              fill={colors.text}
            />
          )}
        </>
      )}

      {/* Reference Line */}
      {spec.showReferenceBars && (
        <Line
          points={[refLineX, contentStartY - 5, refLineX, axisY]}
          stroke={colors.gridline}
          strokeWidth={1.5}
          dash={[3, 3]}
        />
      )}

      {/* Studies Rows */}
      {visibleStudies.map((s, idx) => {
        const rowY = contentStartY + idx * rowHeight + 12;
        const ptX = mapX(s.effect);
        const ciLeftX = mapX(s.ciLower);
        const ciRightX = mapX(s.ciUpper);
        const weightVal = typeof s.weight === 'number' && Number.isFinite(s.weight) ? s.weight : null;

        return (
          <Group key={s?.id || idx}>
            {/* Study name */}
            {spec.showLabels && (
              <Text
                x={padding + 22}
                y={rowY - 6}
                width={plotLeft - padding - 30}
                ellipsis={true}
                wrap="none"
                text={s.study}
                fontSize={11.5}
                fontFamily="system-ui, -apple-system, sans-serif"
                fill={colors.text}
              />
            )}

            {/* Error bar CI line */}
            {spec.showCi95 && spec.showErrorBars && (
              <Line
                points={[ciLeftX, rowY, ciRightX, rowY]}
                stroke={colors.primary}
                strokeWidth={1.5}
              />
            )}

            {/* Data point square */}
            {spec.showDataPoints && (
              <Rect
                x={ptX - 4}
                y={rowY - 4}
                width={8}
                height={8}
                fill={colors.primary}
              />
            )}

            {/* Weight percentage */}
            {spec.showWeights && spec.showLabels && (
              <Text
                x={width - 65}
                y={rowY - 6}
                text={weightVal === null ? 'Not estimable' : `${weightVal.toFixed(1)}%`}
                fontSize={11.5}
                fontFamily="system-ui, -apple-system, sans-serif"
                fill={colors.text}
              />
            )}
          </Group>
        );
      })}

      {hiddenStudyCount > 0 && spec.showLabels && (
        <Text
          x={padding + 22}
          y={contentStartY + visibleStudies.length * rowHeight - 6}
          width={plotLeft - padding - 30}
          text={`+${hiddenStudyCount} more studies (see Data)`}
          fontSize={10.5}
          fontStyle="italic"
          fontFamily="system-ui, -apple-system, sans-serif"
          fill={colors.mutedText}
        />
      )}

      {/* Pooled Estimate Row */}
      {!hasBindingIssues && hasPooledEstimate && (
        <Group>
          {spec.showLabels && (
            <Text
              x={padding + 22}
              y={totalY}
              text={spec.pooledEstimate.label || 'Total (95% CI)'}
              fontSize={12}
              fontStyle="bold"
              fontFamily="system-ui, -apple-system, sans-serif"
              fill={colors.text}
            />
          )}

          {/* Diamond Glyph for Pooled Estimate */}
          {spec.showDataPoints && (
            (() => {
              const eff = spec.pooledEstimate.effect;
              const lower = spec.pooledEstimate.ciLower;
              const upper = spec.pooledEstimate.ciUpper;
              const dMidX = mapX(eff);
              const dLeftX = mapX(lower);
              const dRightX = mapX(upper);
              const dY = totalY + 6;
              const dH = 6;

              return (
                <Line
                  points={[
                    dLeftX, dY,
                    dMidX, dY - dH,
                    dRightX, dY,
                    dMidX, dY + dH,
                  ]}
                  closed={true}
                  fill={colors.pooledDiamond || colors.primary}
                  stroke={colors.pooledDiamond || colors.primary}
                  strokeWidth={1}
                />
              );
            })()
          )}

          {/* Numeric estimate readout */}
          {spec.showLabels && (
            <Text
              x={width - 130}
              y={totalY}
              width={120}
              align="right"
              text={hasPooledEstimate
                ? `${spec.pooledEstimate.effect.toFixed(2)} (${spec.pooledEstimate.ciLower.toFixed(2)}, ${spec.pooledEstimate.ciUpper.toFixed(2)})`
                : 'Not estimable'}
              fontSize={11.5}
              fontStyle="bold"
              fontFamily="system-ui, -apple-system, sans-serif"
              fill={colors.text}
            />
          )}
        </Group>
      )}

      {/* X Axis & Ticks */}
      {spec.showAxes && (
        <Group>
          <Line
            points={[plotLeft - 10, axisY, plotRight + 10, axisY]}
            stroke={colors.text}
            strokeWidth={1}
          />

          {/* Ratio measures use familiar log ticks; differences use a linear scale. */}
          {(isLogScale ? [0.1, 0.5, 1, 2, 5, 10] : Array.from({ length: 5 }, (_, index) => minVal + ((maxVal - minVal) * index) / 4)).map((tickVal) => {
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
                    y={axisY + 7}
                    width={24}
                    text={isLogScale ? String(tickVal) : tickVal.toFixed(2)}
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
