import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import { TextCaptionSpec, PanelFrame, CanvasTheme } from '../../types/multipanel';

interface CaptionKonvaProps {
  spec: TextCaptionSpec;
  frame: PanelFrame;
  theme: CanvasTheme;
}

export const CaptionKonva: React.FC<CaptionKonvaProps> = ({
  spec,
  frame,
  theme,
}) => {
  const { width, height } = frame;
  const padding = 14;
  const colors = theme.colors;

  return (
    <Group>
      {/* Background card */}
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

      {/* Bold figure caption title */}
      <Text
        x={padding}
        y={padding}
        width={Math.max(50, width - padding * 2)}
        text={spec?.title || 'Figure 1.'}
        fontSize={spec?.fontSize ? spec.fontSize + 0.5 : 12.5}
        fontStyle="bold"
        fontFamily="system-ui, -apple-system, sans-serif"
        fill={colors.text}
      />

      {/* Caption body paragraph */}
      <Text
        x={padding}
        y={padding + 22}
        width={Math.max(50, width - padding * 2)}
        text={spec?.captionText || ''}
        fontSize={spec?.fontSize || 12}
        fontFamily="system-ui, -apple-system, sans-serif"
        fill={colors.text}
        lineHeight={1.4}
      />
    </Group>
  );
};
