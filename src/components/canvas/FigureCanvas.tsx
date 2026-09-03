import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer as KonvaLayer, Group, Rect, Transformer } from 'react-konva';
import Konva from 'konva';
import {
  MultiPanelFigure,
  Panel,
  CanvasItem,
  CanvasToolMode,
  CanvasTheme,
} from '../../types/multipanel';
import { ForestPlotKonva } from './ForestPlotKonva';
import { FunnelPlotKonva } from './FunnelPlotKonva';
import { SubgroupPlotKonva } from './SubgroupPlotKonva';
import { GroupedBarKonva } from './GroupedBarKonva';
import { CaptionKonva } from './CaptionKonva';
import { SingleChartKonva } from './SingleChartKonva';
import { ManualItemsKonva } from './ManualItemsKonva';
import { useMobileCanvasTouch } from './useMobileCanvasTouch';
import { snapPanelFrame } from '../../packages/multipanel/layout';
import { Copy, Trash2, Lock, Maximize2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface FigureCanvasProps {
  figure: MultiPanelFigure;
  selectedPanelId: string | null;
  selectedItemId: string | null;
  activeTheme: CanvasTheme;
  toolMode: CanvasToolMode;
  zoom: number;
  onZoomChange?: (newZoom: number) => void;
  panOffset: { x: number; y: number };
  onPanChange: (offset: { x: number; y: number }) => void;
  onSelectPanel: (id: string | null) => void;
  onSelectItem: (id: string | null) => void;
  onUpdatePanelFrame: (panelId: string, frame: { x: number; y: number; width: number; height: number }) => void;
  onUpdateManualItem: (item: CanvasItem) => void;
  onAddManualItem: (item: CanvasItem) => void;
  onDeleteSelected: () => void;
  onDuplicateSelected: () => void;
  onToggleLockSelected: () => void;
  stageRef: React.RefObject<Konva.Stage | null>;
  datasetId?: string;
  isPendingApproval?: boolean;
  pendingPanelId?: string | null;
  layoutTransitionKey?: number;
}

export const FigureCanvas: React.FC<FigureCanvasProps> = ({
  figure,
  selectedPanelId,
  selectedItemId,
  activeTheme,
  toolMode,
  zoom,
  onZoomChange,
  panOffset,
  onPanChange,
  onSelectPanel,
  onSelectItem,
  onUpdatePanelFrame,
  onUpdateManualItem,
  onAddManualItem,
  onDeleteSelected,
  onDuplicateSelected,
  onToggleLockSelected,
  stageRef,
  datasetId,
  isPendingApproval,
  pendingPanelId,
  layoutTransitionKey = 0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [containerSize, setContainerSize] = useState({ width: 1200, height: 900 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPos, setLastPanPos] = useState({ x: 0, y: 0 });
  const hasAutoFittedRef = useRef(false);
  const lastLayoutTransitionKey = useRef(layoutTransitionKey);
  const displayedFramesRef = useRef<Record<string, { x: number; y: number; width: number; height: number }>>(
    Object.fromEntries(figure.panels.map((panel) => [panel.id, panel.frame])),
  );
  const [displayedFrames, setDisplayedFrames] = useState(displayedFramesRef.current);

  const updateDisplayedFrames = useCallback((frames: Record<string, { x: number; y: number; width: number; height: number }>) => {
    displayedFramesRef.current = frames;
    setDisplayedFrames(frames);
  }, []);

  useEffect(() => {
    const targetFrames = Object.fromEntries(figure.panels.map((panel) => [panel.id, panel.frame]));
    if (layoutTransitionKey === lastLayoutTransitionKey.current) {
      updateDisplayedFrames(targetFrames);
      return;
    }

    lastLayoutTransitionKey.current = layoutTransitionKey;
    const startFrames = displayedFramesRef.current;
    const startedAt = performance.now();
    let animationFrame = 0;

    const animate = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / 260);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextFrames = Object.fromEntries(figure.panels.map((panel) => {
        const start = startFrames[panel.id] || panel.frame;
        const target = targetFrames[panel.id];
        return [panel.id, {
          x: start.x + (target.x - start.x) * eased,
          y: start.y + (target.y - start.y) * eased,
          width: start.width + (target.width - start.width) * eased,
          height: start.height + (target.height - start.height) * eased,
        }];
      }));
      updateDisplayedFrames(nextFrames);
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [figure, layoutTransitionKey, updateDisplayedFrames]);

  // Mobile Touch Module hook
  const touchModule = useMobileCanvasTouch({
    zoom,
    panOffset,
    onZoomChange: (z) => onZoomChange && onZoomChange(z),
    onPanChange,
    canvasWidth: figure.canvasSize.width,
    canvasHeight: figure.canvasSize.height,
    containerWidth: containerSize.width,
    containerHeight: containerSize.height,
  });

  // Update container size dynamically via ResizeObserver and auto-fit zoom on small screens
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.round(entry.contentRect.width);
        const h = Math.round(entry.contentRect.height);

        if (w > 0 && h > 0) {
          setContainerSize((prev) => {
            if (prev.width === w && prev.height === h) return prev;
            return { width: w, height: h };
          });

          // Auto fit zoom on small mobile screens on initial load
          if (w < 768 && !hasAutoFittedRef.current && onZoomChange && figure.canvasSize.width > 0) {
            hasAutoFittedRef.current = true;
            const padding = w < 640 ? 16 : 40;
            const availableWidth = w - padding;
            const fitRatio = availableWidth / figure.canvasSize.width;
            const fitZ = Math.max(0.25, Math.min(1.0, Math.round(fitRatio * 100) / 100));
            onZoomChange(fitZ);
          }
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [onZoomChange, figure.canvasSize.width]);

  // Safely compute originX and originY to prevent negative offset clipping on small screens
  const scaledWidth = figure.canvasSize.width * zoom;
  const scaledHeight = figure.canvasSize.height * zoom;

  const rawOriginX = (containerSize.width - scaledWidth) / 2;
  const originX = scaledWidth > containerSize.width
    ? (panOffset.x === 0 ? Math.max(12, rawOriginX) : rawOriginX) + panOffset.x
    : rawOriginX + panOffset.x;

  const rawOriginY = (containerSize.height - scaledHeight) / 2;
  const originY = scaledHeight > containerSize.height
    ? (panOffset.y === 0 ? Math.max(12, rawOriginY) : rawOriginY) + panOffset.y
    : rawOriginY + panOffset.y;

  // Update Transformer node
  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;
    const tr = transformerRef.current;
    const stage = stageRef.current;

    if (selectedPanelId) {
      const selectedNode = stage.findOne(`#group-${selectedPanelId}`);
      if (selectedNode) {
        tr.nodes([selectedNode]);
        tr.getLayer()?.batchDraw();
        return;
      }
    } else if (selectedItemId) {
      const selectedNode = stage.findOne(`#${selectedItemId}`);
      if (selectedNode) {
        tr.nodes([selectedNode]);
        tr.getLayer()?.batchDraw();
        return;
      }
    }
    tr.nodes([]);
    tr.getLayer()?.batchDraw();
  }, [selectedPanelId, selectedItemId, figure]);

  // Handle stage clicks for placing items or deselecting
  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    // If clicked on empty stage area
    if (e.target === e.target.getStage() || e.target.name() === 'canvas-paper-bg') {
      const stage = stageRef.current;
      if (!stage) return;
      const pointerPos = stage.getPointerPosition();
      if (!pointerPos) return;

      // Transform pointer position to canvas coordinates
      const canvasX = (pointerPos.x - originX) / zoom;
      const canvasY = (pointerPos.y - originY) / zoom;

      if (toolMode === 'text') {
        const newItem: CanvasItem = {
          id: `text-${Date.now()}`,
          type: 'text',
          x: Math.round(canvasX),
          y: Math.round(canvasY),
          text: 'Custom Annotation',
          fontSize: 14,
          fill: activeTheme.colors.text,
          order: figure.manualItems.length,
        };
        onAddManualItem(newItem);
        onSelectItem(newItem.id);
        onSelectPanel(null);
        return;
      }

      if (toolMode === 'shape') {
        const newItem: CanvasItem = {
          id: `rect-${Date.now()}`,
          type: 'rect',
          x: Math.round(canvasX),
          y: Math.round(canvasY),
          width: 120,
          height: 80,
          fill: 'transparent',
          stroke: activeTheme.colors.primary,
          strokeWidth: 2,
          order: figure.manualItems.length,
        };
        onAddManualItem(newItem);
        onSelectItem(newItem.id);
        onSelectPanel(null);
        return;
      }

      if (toolMode === 'line') {
        const newItem: CanvasItem = {
          id: `line-${Date.now()}`,
          type: 'line',
          x: Math.round(canvasX),
          y: Math.round(canvasY),
          points: [Math.round(canvasX), Math.round(canvasY), Math.round(canvasX + 120), Math.round(canvasY + 60)],
          stroke: activeTheme.colors.text,
          strokeWidth: 2,
          order: figure.manualItems.length,
        };
        onAddManualItem(newItem);
        onSelectItem(newItem.id);
        onSelectPanel(null);
        return;
      }

      if (toolMode === 'arrow') {
        const newItem: CanvasItem = {
          id: `arrow-${Date.now()}`,
          type: 'arrow',
          x: Math.round(canvasX),
          y: Math.round(canvasY),
          points: [Math.round(canvasX), Math.round(canvasY), Math.round(canvasX + 120), Math.round(canvasY + 60)],
          stroke: activeTheme.colors.primary,
          strokeWidth: 2,
          order: figure.manualItems.length,
        };
        onAddManualItem(newItem);
        onSelectItem(newItem.id);
        onSelectPanel(null);
        return;
      }

      if (toolMode === 'table') {
        const newItem: CanvasItem = {
          id: `table-${Date.now()}`,
          type: 'table',
          x: Math.round(canvasX),
          y: Math.round(canvasY),
          tableData: [
            ['Variable', 'OR', 'p-value'],
            ['Age ≥ 65', '1.24', '0.032'],
            ['Prior Stroke', '1.45', '0.008'],
          ],
          order: figure.manualItems.length,
        };
        onAddManualItem(newItem);
        onSelectItem(newItem.id);
        onSelectPanel(null);
        return;
      }

      // If in select mode, deselect
      if (toolMode === 'select') {
        onSelectPanel(null);
        onSelectItem(null);
      }
    }
  };

  // Find selected panel details for floating contextual toolbar
  const selectedPanel = figure.panels.find((p) => p.id === selectedPanelId);
  const selectedLayer = figure.layers.find((l) => l.panelId === selectedPanelId);

  // Position floating toolbar above selected panel
  const floatingToolbarStyle = selectedPanel
    ? {
        left: `${originX + selectedPanel.frame.x * zoom + (selectedPanel.frame.width * zoom) / 2}px`,
        // Place above the panel, clamped so it never clips out of the viewport.
        top: `${Math.max(4, originY + selectedPanel.frame.y * zoom - 44)}px`,
        transform: 'translateX(-50%)',
      }
    : null;

  const isMobile = containerSize.width < 768;

  return (
    <div
      ref={containerRef}
      className="relative flex-1 w-full h-full overflow-hidden bg-[#f4f4f5] dark:bg-[#09090b] select-none touch-none"
      style={{
        backgroundImage: 'radial-gradient(#d4d4d8 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
      onTouchStart={touchModule.handleTouchStart}
      onTouchMove={touchModule.handleTouchMove}
      onTouchEnd={touchModule.handleTouchEnd}
      onMouseDown={(e) => {
        if (toolMode === 'pan' || e.button === 1) {
          setIsPanning(true);
          setLastPanPos({ x: e.clientX, y: e.clientY });
        }
      }}
      onMouseMove={(e) => {
        if (isPanning) {
          const dx = e.clientX - lastPanPos.x;
          const dy = e.clientY - lastPanPos.y;
          setLastPanPos({ x: e.clientX, y: e.clientY });
          onPanChange({ x: panOffset.x + dx, y: panOffset.y + dy });
        }
      }}
      onMouseUp={() => setIsPanning(false)}
      onMouseLeave={() => setIsPanning(false)}
    >
      {/* Canvas view area */}

      {/* Floating mini contextual toolbar when panel is selected */}
      {selectedPanel && floatingToolbarStyle && (
        <div
          id="canvas-contextual-toolbar"
          className="absolute z-30 flex items-center gap-0.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] shadow-lg rounded-lg p-1 transition-all"
          style={floatingToolbarStyle}
        >
          <button
            title="Duplicate panel"
            onClick={onDuplicateSelected}
            className="p-1.5 rounded text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] hover:text-[#18181b] dark:hover:text-[#f4f4f5] transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            title="Delete panel"
            onClick={onDeleteSelected}
            className="p-1.5 rounded text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#fee2e2] dark:hover:bg-[#7f1d1d] hover:text-[#dc2626] dark:hover:text-[#f87171] transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            title={selectedLayer?.locked ? 'Unlock' : 'Lock'}
            onClick={onToggleLockSelected}
            className={`p-1.5 rounded transition-colors ${
              selectedLayer?.locked
                ? 'bg-[#fef3c7] text-[#d97706] dark:bg-[#78350f] dark:text-[#fcd34d]'
                : 'text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a]'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Konva Stage */}
      <Stage
        ref={stageRef}
        width={containerSize.width}
        height={containerSize.height}
        onClick={handleStageClick}
        onTap={handleStageClick}
        style={{ cursor: toolMode === 'pan' || isPanning ? 'grab' : 'default' }}
      >
        <KonvaLayer>
          {/* Canvas paper group */}
          <Group x={originX} y={originY} scaleX={zoom} scaleY={zoom}>
            {/* White Paper Canvas Background with subtle shadow */}
            <Rect
              name="canvas-paper-bg"
              x={0}
              y={0}
              width={figure.canvasSize.width}
              height={figure.canvasSize.height}
              fill={activeTheme.colors.background}
              shadowColor="black"
              shadowBlur={16}
              shadowOpacity={0.08}
              shadowOffset={{ x: 0, y: 4 }}
              cornerRadius={4}
            />

            {/* Render Panels in Layer Order */}
            {figure.layers
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((layer) => {
                const panel = figure.panels.find((p) => p.id === layer.panelId);
                if (!panel || !layer.visible) return null;

                const isSelected = selectedPanelId === panel.id;
                const panelFrame = displayedFrames[panel.id] || panel.frame;

                return (
                  <Group
                    key={panel.id}
                    id={`group-${panel.id}`}
                    x={panelFrame.x}
                    y={panelFrame.y}
                    draggable={!layer.locked && toolMode === 'select'}
                    onClick={(e) => {
                      e.cancelBubble = true;
                      if (toolMode === 'select') {
                        onSelectPanel(panel.id);
                        onSelectItem(null);
                      }
                    }}
                    onTap={(e) => {
                      e.cancelBubble = true;
                      if (toolMode === 'select') {
                        onSelectPanel(panel.id);
                        onSelectItem(null);
                      }
                    }}
                    onDragEnd={(e) => {
                      const snappedFrame = snapPanelFrame({
                        ...panel.frame,
                        x: e.target.x(),
                        y: e.target.y(),
                      }, figure.canvasSize);
                      e.target.position({ x: snappedFrame.x, y: snappedFrame.y });
                      onUpdatePanelFrame(panel.id, snappedFrame);
                    }}
                    onTransformEnd={(e) => {
                      const node = e.target;
                      const scaleX = node.scaleX();
                      const scaleY = node.scaleY();
                      node.scaleX(1);
                      node.scaleY(1);

                      const snappedFrame = snapPanelFrame({
                        x: Math.round(node.x()),
                        y: Math.round(node.y()),
                        width: Math.max(120, Math.round(panel.frame.width * scaleX)),
                        height: Math.max(80, Math.round(panel.frame.height * scaleY)),
                      }, figure.canvasSize);
                      node.position({ x: snappedFrame.x, y: snappedFrame.y });
                      onUpdatePanelFrame(panel.id, snappedFrame);
                    }}
                  >
                    {/* Active selection border */}
                    {isSelected && (
                      <Rect
                        x={-2}
                        y={-2}
                        width={panelFrame.width + 4}
                        height={panelFrame.height + 4}
                        stroke="#24b47e"
                        strokeWidth={1.5}
                        cornerRadius={2}
                      />
                    )}

                    {/* Specific Panel Type Renderers */}
                    {panel.spec.kind === 'forest-plot' && (
                      <ForestPlotKonva
                        spec={panel.spec}
                        frame={panelFrame}
                        letter={panel.letter}
                        theme={activeTheme}
                      />
                    )}

                    {panel.spec.kind === 'funnel-plot' && (
                      <FunnelPlotKonva
                        spec={panel.spec}
                        frame={panelFrame}
                        letter={panel.letter}
                        theme={activeTheme}
                      />
                    )}

                    {panel.spec.kind === 'subgroup-analysis' && (
                      <SubgroupPlotKonva
                        spec={panel.spec}
                        frame={panelFrame}
                        letter={panel.letter}
                        theme={activeTheme}
                      />
                    )}

                    {panel.spec.kind === 'grouped-bar' && (
                      <GroupedBarKonva
                        spec={panel.spec}
                        frame={panelFrame}
                        letter={panel.letter}
                        theme={activeTheme}
                      />
                    )}

                    {panel.spec.kind === 'text-caption' && (
                      <CaptionKonva
                        spec={panel.spec}
                        frame={panelFrame}
                        theme={activeTheme}
                      />
                    )}

                    {panel.spec.kind === 'single-chart' && (
                      <SingleChartKonva
                        spec={panel.spec}
                        frame={panelFrame}
                        letter={panel.letter}
                        theme={activeTheme}
                        datasetId={datasetId}
                        isPendingApproval={isPendingApproval && pendingPanelId === panel.id}
                      />
                    )}

                    {(panel.spec.kind === 'volcano-plot' || panel.spec.kind === 'heatmap') && (
                      <SingleChartKonva
                        spec={{ kind: 'single-chart', spec: panel.spec.spec }}
                        frame={panelFrame}
                        letter={panel.letter}
                        theme={activeTheme}
                        datasetId={datasetId}
                        isPendingApproval={isPendingApproval && pendingPanelId === panel.id}
                      />
                    )}
                  </Group>
                );
              })}

            {/* Render Manual Canvas Items */}
            <ManualItemsKonva
              items={figure.manualItems}
              selectedId={selectedItemId}
              onSelectItem={(id) => {
                onSelectItem(id);
                onSelectPanel(null);
              }}
              onUpdateItem={onUpdateManualItem}
              theme={activeTheme}
            />

            {/* Konva Transformer for Touch Handles & Resizing */}
            <Transformer
              ref={transformerRef}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 100 || newBox.height < 60) {
                  return oldBox;
                }
                return newBox;
              }}
              anchorStroke="#24b47e"
              anchorFill="#ffffff"
              anchorSize={isMobile ? 14 : 8}
              hitStrokeWidth={isMobile ? 24 : 10}
              anchorCornerRadius={isMobile ? 3 : 2}
              borderStroke="#24b47e"
              borderStrokeWidth={1.5}
            />
          </Group>
        </KonvaLayer>
      </Stage>
    </div>
  );
};

