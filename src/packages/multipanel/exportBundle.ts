import Konva from 'konva';
import { MultiPanelFigure } from '../../types/multipanel';

export function exportFigureToPng(stage: Konva.Stage, filename = 'figure-publication.png') {
  const dataUrl = stage.toDataURL({ pixelRatio: 2 });
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportFigureToSvg(stage: Konva.Stage, filename = 'figure-publication.svg') {
  // Convert stage raster to SVG wrapper data URI
  const dataUrl = stage.toDataURL({ pixelRatio: 2 });
  const width = stage.width();
  const height = stage.height();
  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <image width="${width}" height="${height}" xlink:href="${dataUrl}" />
</svg>`;

  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportFigureToJson(figure: MultiPanelFigure, filename = 'figure-spec.json') {
  const jsonStr = JSON.stringify(figure, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportPanelToPng(stage: Konva.Stage, panelId: string, filename = 'panel.png') {
  const node = stage.findOne(`#group-${panelId}`);
  if (!node) {
    exportFigureToPng(stage, filename);
    return;
  }
  const dataUrl = node.toDataURL({ pixelRatio: 2 });
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportPanelToSvg(stage: Konva.Stage, panelId: string, filename = 'panel.svg') {
  const node = stage.findOne(`#group-${panelId}`);
  if (!node) {
    exportFigureToSvg(stage, filename);
    return;
  }
  const dataUrl = node.toDataURL({ pixelRatio: 2 });
  const clientRect = node.getClientRect();
  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${clientRect.width}" height="${clientRect.height}" viewBox="0 0 ${clientRect.width} ${clientRect.height}">
  <image width="${clientRect.width}" height="${clientRect.height}" xlink:href="${dataUrl}" />
</svg>`;

  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
