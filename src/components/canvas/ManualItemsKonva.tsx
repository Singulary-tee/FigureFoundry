import React, { useEffect, useState } from 'react';
import { Group, Rect, Ellipse, Text, Line, Arrow, Image as KonvaImage } from 'react-konva';
import { CanvasItem, CanvasTheme } from '../../types/multipanel';

interface ManualItemsKonvaProps {
  items: CanvasItem[];
  selectedId: string | null;
  onSelectItem: (id: string | null) => void;
  onUpdateItem: (item: CanvasItem) => void;
  theme: CanvasTheme;
}

const KonvaImageItem: React.FC<{
  item: CanvasItem;
  theme: CanvasTheme;
}> = ({ item }) => {
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!item.src) return;
    const img = new window.Image();
    img.src = item.src;
    img.onload = () => setImageObj(img);
  }, [item.src]);

  if (!imageObj) return null;

  return (
    <KonvaImage
      image={imageObj}
      x={item.x}
      y={item.y}
      width={item.width || 120}
      height={item.height || 120}
    />
  );
};

export const ManualItemsKonva: React.FC<ManualItemsKonvaProps> = ({
  items,
  selectedId,
  onSelectItem,
  onUpdateItem,
  theme,
}) => {
  const colors = theme.colors;

  return (
    <Group>
      {items.map((item) => {
        if (item.type === 'rect') {
          return (
            <Rect
              key={item.id}
              id={item.id}
              x={item.x}
              y={item.y}
              width={item.width || 100}
              height={item.height || 70}
              fill={item.fill || 'transparent'}
              stroke={item.stroke || colors.primary}
              strokeWidth={item.strokeWidth || 2}
              cornerRadius={4}
              draggable={!item.locked}
              onClick={() => onSelectItem(item.id)}
              onTap={() => onSelectItem(item.id)}
              onDragEnd={(e) => {
                onUpdateItem({
                  ...item,
                  x: e.target.x(),
                  y: e.target.y(),
                });
              }}
            />
          );
        }

        if (item.type === 'ellipse') {
          const w = item.width || 80;
          const h = item.height || 50;
          return (
            <Ellipse
              key={item.id}
              id={item.id}
              x={item.x + w / 2}
              y={item.y + h / 2}
              radiusX={w / 2}
              radiusY={h / 2}
              fill={item.fill || 'transparent'}
              stroke={item.stroke || colors.primary}
              strokeWidth={item.strokeWidth || 2}
              draggable={!item.locked}
              onClick={() => onSelectItem(item.id)}
              onTap={() => onSelectItem(item.id)}
              onDragEnd={(e) => {
                onUpdateItem({
                  ...item,
                  x: e.target.x() - w / 2,
                  y: e.target.y() - h / 2,
                });
              }}
            />
          );
        }

        if (item.type === 'text') {
          return (
            <Text
              key={item.id}
              id={item.id}
              x={item.x}
              y={item.y}
              text={item.text || 'Double click to edit text'}
              fontSize={item.fontSize || 14}
              fontFamily="system-ui, -apple-system, sans-serif"
              fill={item.fill || colors.text}
              draggable={!item.locked}
              onClick={() => onSelectItem(item.id)}
              onTap={() => onSelectItem(item.id)}
              onDragEnd={(e) => {
                onUpdateItem({
                  ...item,
                  x: e.target.x(),
                  y: e.target.y(),
                });
              }}
            />
          );
        }

        if (item.type === 'line') {
          return (
            <Line
              key={item.id}
              id={item.id}
              points={item.points || [item.x, item.y, item.x + 100, item.y + 60]}
              stroke={item.stroke || colors.text}
              strokeWidth={item.strokeWidth || 2}
              draggable={!item.locked}
              onClick={() => onSelectItem(item.id)}
              onTap={() => onSelectItem(item.id)}
              onDragEnd={(e) => {
                const dx = e.target.x();
                const dy = e.target.y();
                e.target.position({ x: 0, y: 0 });
                const pts = (item.points || [item.x, item.y, item.x + 100, item.y + 60]).map((p, idx) =>
                  idx % 2 === 0 ? p + dx : p + dy
                );
                onUpdateItem({
                  ...item,
                  x: item.x + dx,
                  y: item.y + dy,
                  points: pts,
                });
              }}
            />
          );
        }

        if (item.type === 'arrow') {
          return (
            <Arrow
              key={item.id}
              id={item.id}
              points={item.points || [item.x, item.y, item.x + 100, item.y + 60]}
              stroke={item.stroke || colors.primary}
              fill={item.stroke || colors.primary}
              strokeWidth={item.strokeWidth || 2}
              pointerLength={8}
              pointerWidth={8}
              draggable={!item.locked}
              onClick={() => onSelectItem(item.id)}
              onTap={() => onSelectItem(item.id)}
              onDragEnd={(e) => {
                const dx = e.target.x();
                const dy = e.target.y();
                e.target.position({ x: 0, y: 0 });
                const pts = (item.points || [item.x, item.y, item.x + 100, item.y + 60]).map((p, idx) =>
                  idx % 2 === 0 ? p + dx : p + dy
                );
                onUpdateItem({
                  ...item,
                  x: item.x + dx,
                  y: item.y + dy,
                  points: pts,
                });
              }}
            />
          );
        }

        if (item.type === 'image') {
          return (
            <Group
              key={item.id}
              id={item.id}
              draggable={!item.locked}
              onClick={() => onSelectItem(item.id)}
              onTap={() => onSelectItem(item.id)}
              onDragEnd={(e) => {
                onUpdateItem({
                  ...item,
                  x: e.target.x(),
                  y: e.target.y(),
                });
              }}
            >
              <KonvaImageItem item={item} theme={theme} />
            </Group>
          );
        }

        if (item.type === 'table') {
          const rows = item.tableData || [
            ['Header 1', 'Header 2', 'Header 3'],
            ['Row 1, Col 1', 'Row 1, Col 2', 'Row 1, Col 3'],
            ['Row 2, Col 1', 'Row 2, Col 2', 'Row 2, Col 3'],
          ];
          const colWidth = 90;
          const rowHeight = 24;
          const totalW = colWidth * rows[0].length;
          const totalH = rowHeight * rows.length;

          return (
            <Group
              key={item.id}
              id={item.id}
              x={item.x}
              y={item.y}
              draggable={!item.locked}
              onClick={() => onSelectItem(item.id)}
              onTap={() => onSelectItem(item.id)}
              onDragEnd={(e) => {
                onUpdateItem({
                  ...item,
                  x: e.target.x(),
                  y: e.target.y(),
                });
              }}
            >
              <Rect
                x={0}
                y={0}
                width={totalW}
                height={totalH}
                fill={colors.cardBackground}
                stroke={colors.border}
                strokeWidth={1}
              />
              {rows.map((row, rIdx) =>
                row.map((cellText, cIdx) => (
                  <Group key={`${rIdx}-${cIdx}`} x={cIdx * colWidth} y={rIdx * rowHeight}>
                    <Rect
                      x={0}
                      y={0}
                      width={colWidth}
                      height={rowHeight}
                      stroke={colors.gridline}
                      strokeWidth={0.5}
                      fill={rIdx === 0 ? colors.gridline + '44' : 'transparent'}
                    />
                    <Text
                      x={6}
                      y={5}
                      width={colWidth - 12}
                      text={cellText}
                      fontSize={11}
                      fontStyle={rIdx === 0 ? 'bold' : 'normal'}
                      fontFamily="system-ui, -apple-system, sans-serif"
                      fill={colors.text}
                      ellipsis={true}
                    />
                  </Group>
                ))
              )}
            </Group>
          );
        }

        return null;
      })}
    </Group>
  );
};
