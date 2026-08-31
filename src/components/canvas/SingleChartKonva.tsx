import React, { useEffect, useState, useRef } from 'react';
import { Group, Rect, Text, Image as KonvaImage } from 'react-konva';
import vegaEmbed from 'vega-embed';
import { SingleChartSpec, PanelFrame, CanvasTheme } from '../../types/multipanel';
import { compileToVegaLiteSpec } from '../../packages/figure-spec/compiler';
import { profileDataset } from '../../packages/data-model/profiler';

interface SingleChartKonvaProps {
  spec: SingleChartSpec;
  frame: PanelFrame;
  letter: string;
  theme: CanvasTheme;
  datasetId?: string;
  isPendingApproval?: boolean;
}

export const SingleChartKonva: React.FC<SingleChartKonvaProps> = ({
  spec,
  frame,
  letter,
  theme,
  datasetId = 'palmer-penguins',
  isPendingApproval = false,
}) => {
  const { width, height } = frame;
  const colors = theme.colors;
  const [renderedImage, setRenderedImage] = useState<HTMLCanvasElement | HTMLImageElement | null>(null);
  const [renderError, setRenderError] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isCancelled = false;
    setRenderError(false);
    try {
      const profile = profileDataset(datasetId);
      const vegaSpec = compileToVegaLiteSpec((spec?.spec || {}) as any, profile, false);

      // Adjust width & height for the panel
      const finalSpec: any = {
        ...vegaSpec,
        width: Math.max(100, width - 60),
        height: Math.max(80, height - 70),
        background: 'transparent',
        autosize: { type: 'fit', contains: 'padding' },
      };

      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      document.body.appendChild(tempDiv);

      vegaEmbed(tempDiv, finalSpec, { renderer: 'canvas', actions: false })
        .then((res) => {
          if (isCancelled) return;
          const canvasEl = tempDiv.querySelector('canvas');
          if (canvasEl) {
            const offscreen = document.createElement('canvas');
            offscreen.width = canvasEl.width;
            offscreen.height = canvasEl.height;
            const ctx = offscreen.getContext('2d');
            if (ctx) {
              ctx.drawImage(canvasEl, 0, 0);
              setRenderedImage(offscreen);
            }
          }
          res.finalize();
          if (tempDiv.parentNode) {
            tempDiv.parentNode.removeChild(tempDiv);
          }
        })
        .catch((err) => {
          console.warn('Vega embed render failed:', err);
          if (!isCancelled) setRenderError(true);
          if (tempDiv.parentNode) {
            tempDiv.parentNode.removeChild(tempDiv);
          }
        });

      return () => {
        isCancelled = true;
        if (tempDiv.parentNode) {
          tempDiv.parentNode.removeChild(tempDiv);
        }
      };
    } catch (err) {
      console.warn('Vega spec compilation failed:', err);
      setRenderError(true);
    }
  }, [spec?.spec, width, height, theme?.id, datasetId]);

  return (
    <Group>
      {/* Background card fill */}
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill={colors.cardBackground}
        stroke={isPendingApproval ? '#eab308' : colors.border}
        strokeWidth={isPendingApproval ? 2 : 1}
        cornerRadius={2}
      />

      {/* Letter badge */}
      {letter && (
        <Text
          x={16}
          y={16}
          text={letter}
          fontSize={16}
          fontStyle="bold"
          fontFamily="system-ui, -apple-system, sans-serif"
          fill={colors.text}
        />
      )}

      {/* Title */}
      <Text
        x={45}
        y={16}
        text={spec?.spec?.title || 'Scientific Chart'}
        fontSize={13}
        fontStyle="bold"
        fontFamily="system-ui, -apple-system, sans-serif"
        fill={colors.text}
      />

      {/* Rendered Vega Chart Image or Error Fallback */}
      {renderError ? (
        <Group x={20} y={42}>
          <Rect
            x={0}
            y={0}
            width={width - 40}
            height={height - 50}
            fill="#fef2f2"
            stroke="#fca5a5"
            strokeWidth={1}
            cornerRadius={4}
          />
          <Text
            x={16}
            y={Math.max(10, (height - 50) / 2 - 10)}
            width={width - 72}
            text="Chart compilation error — invalid spec parameters"
            fontSize={11}
            fontFamily="system-ui, -apple-system, sans-serif"
            fill="#991b1b"
            align="center"
          />
        </Group>
      ) : (
        renderedImage && (
          <KonvaImage
            image={renderedImage}
            x={20}
            y={42}
            width={width - 40}
            height={height - 50}
          />
        )
      )}
    </Group>
  );
};
