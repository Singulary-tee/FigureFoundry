import { MultiPanelFigure, PanelFrame } from '../../types/multipanel';

export const CANVAS_GRID_SIZE = 10;

export function snapToGrid(value: number, gridSize = CANVAS_GRID_SIZE): number {
  return Math.round(value / gridSize) * gridSize;
}

export function snapPanelFrame(
  frame: PanelFrame,
  canvasSize: MultiPanelFigure['canvasSize'],
  gridSize = CANVAS_GRID_SIZE,
): PanelFrame {
  const width = Math.min(canvasSize.width, Math.max(120, snapToGrid(frame.width, gridSize)));
  const height = Math.min(canvasSize.height, Math.max(80, snapToGrid(frame.height, gridSize)));

  return {
    x: Math.max(0, Math.min(canvasSize.width - width, snapToGrid(frame.x, gridSize))),
    y: Math.max(0, Math.min(canvasSize.height - height, snapToGrid(frame.y, gridSize))),
    width,
    height,
  };
}

export function createTidyPanelLayout(figure: MultiPanelFigure): MultiPanelFigure {
  const margin = 30;
  const gap = 20;
  const caption = figure.panels.find((panel) => panel.spec.kind === 'text-caption');
  const plotPanels = figure.panels.filter((panel) => panel.id !== caption?.id);
  const columns = figure.canvasSize.width < 760 ? 1 : 2;
  const rows = Math.max(1, Math.ceil(plotPanels.length / columns));
  const captionHeight = caption?.frame.height || 0;
  const availableHeight = figure.canvasSize.height - margin * 2 - (caption ? captionHeight + gap : 0) - gap * (rows - 1);
  const rowHeight = Math.max(80, snapToGrid(availableHeight / rows));
  const columnWidth = snapToGrid((figure.canvasSize.width - margin * 2 - gap * (columns - 1)) / columns);

  return {
    ...figure,
    panels: figure.panels.map((panel) => {
      if (panel.id === caption?.id) {
        return {
          ...panel,
          frame: snapPanelFrame({
            x: margin,
            y: margin + rows * (rowHeight + gap),
            width: figure.canvasSize.width - margin * 2,
            height: captionHeight,
          }, figure.canvasSize),
        };
      }

      const index = plotPanels.findIndex((plotPanel) => plotPanel.id === panel.id);
      return {
        ...panel,
        frame: snapPanelFrame({
          x: margin + (index % columns) * (columnWidth + gap),
          y: margin + Math.floor(index / columns) * (rowHeight + gap),
          width: columnWidth,
          height: rowHeight,
        }, figure.canvasSize),
      };
    }),
  };
}
