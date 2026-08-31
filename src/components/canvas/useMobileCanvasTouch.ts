import { useState, useRef, useCallback, useEffect } from 'react';
import Konva from 'konva';

interface TouchPoint {
  x: number;
  y: number;
}

interface UseMobileCanvasTouchOptions {
  zoom: number;
  panOffset: { x: number; y: number };
  onZoomChange: (newZoom: number) => void;
  onPanChange: (newOffset: { x: number; y: number }) => void;
  canvasWidth: number;
  canvasHeight: number;
  containerWidth: number;
  containerHeight: number;
}

export function useMobileCanvasTouch({
  zoom,
  panOffset,
  onZoomChange,
  onPanChange,
  canvasWidth,
  canvasHeight,
  containerWidth,
  containerHeight,
}: UseMobileCanvasTouchOptions) {
  const [isTouchPanning, setIsTouchPanning] = useState(false);
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartZoomRef = useRef<number>(zoom);
  const touchStartPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTouchCenterRef = useRef<TouchPoint | null>(null);

  // Helper: Distance between 2 touches
  const getDistance = (t1: { clientX: number; clientY: number }, t2: { clientX: number; clientY: number }): number => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.hypot(dx, dy);
  };

  // Helper: Midpoint between 2 touches
  const getCenter = (t1: { clientX: number; clientY: number }, t2: { clientX: number; clientY: number }): TouchPoint => {
    return {
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2,
    };
  };

  // Auto-Calculate Fit Zoom for screen width
  const calculateFitZoom = useCallback(() => {
    if (!containerWidth || containerWidth <= 0 || !canvasWidth) return 0.85;
    const padding = containerWidth < 640 ? 16 : 40;
    const availableWidth = containerWidth - padding;
    const fitRatio = availableWidth / canvasWidth;
    // Clamp fit zoom between 0.25 and 1.0
    return Math.max(0.25, Math.min(1.0, Math.round(fitRatio * 100) / 100));
  }, [containerWidth, canvasWidth]);

  // Handle Touch Start
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      const touches = e.touches;
      if (touches.length === 2) {
        // Pinch-to-zoom start
        const dist = getDistance(touches[0], touches[1]);
        touchStartDistRef.current = dist;
        touchStartZoomRef.current = zoom;
        touchStartPanRef.current = { ...panOffset };
        lastTouchCenterRef.current = getCenter(touches[0], touches[1]);
        setIsTouchPanning(true);
      } else if (touches.length === 1) {
        // Single finger touch drag start
        lastTouchCenterRef.current = {
          x: touches[0].clientX,
          y: touches[0].clientY,
        };
      }
    },
    [zoom, panOffset]
  );

  // Handle Touch Move
  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      const touches = e.touches;

      // Pinch Zoom & Two-Finger Pan
      if (touches.length === 2 && touchStartDistRef.current) {
        e.preventDefault();
        const newDist = getDistance(touches[0], touches[1]);
        const scale = newDist / touchStartDistRef.current;
        const targetZoom = Math.max(0.2, Math.min(3.0, touchStartZoomRef.current * scale));
        onZoomChange(Math.round(targetZoom * 100) / 100);

        const currentCenter = getCenter(touches[0], touches[1]);
        if (lastTouchCenterRef.current) {
          const dx = currentCenter.x - lastTouchCenterRef.current.x;
          const dy = currentCenter.y - lastTouchCenterRef.current.y;
          onPanChange({
            x: panOffset.x + dx,
            y: panOffset.y + dy,
          });
        }
        lastTouchCenterRef.current = currentCenter;
      }
    },
    [onZoomChange, onPanChange, panOffset]
  );

  // Handle Touch End
  const handleTouchEnd = useCallback(() => {
    touchStartDistRef.current = null;
    lastTouchCenterRef.current = null;
    setIsTouchPanning(false);
  }, []);

  return {
    isTouchPanning,
    calculateFitZoom,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
