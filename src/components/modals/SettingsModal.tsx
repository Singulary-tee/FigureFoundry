import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { MultiPanelFigure } from '../../types/multipanel';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  figure: MultiPanelFigure;
  onUpdateCanvasSize: (width: number, height: number) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  figure,
  onUpdateCanvasSize,
}) => {
  const [width, setWidth] = useState(figure.canvasSize?.width || 1200);
  const [height, setHeight] = useState(figure.canvasSize?.height || 800);
  const [gridSnap, setGridSnap] = useState(true);
  const [exportDpi, setExportDpi] = useState('300');

  const handleApply = () => {
    onUpdateCanvasSize(Number(width), Number(height));
    onClose();
  };

  const handlePreset = (w: number, h: number) => {
    setWidth(w);
    setHeight(h);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Workspace & Canvas Settings</DialogTitle>
              <DialogDescription className="text-xs">Canvas dimensions, publication presets, and rendering options</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Dimension Presets */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Journal Layout Presets
            </label>
            <div className="grid grid-cols-3 gap-2">
              <Card
                onClick={() => handlePreset(1200, 800)}
                className="p-2.5 cursor-pointer hover:border-emerald-500/50 bg-muted/40 transition-colors"
              >
                <span className="font-bold block text-foreground">Nature 2-Col</span>
                <span className="text-[10px] text-muted-foreground">1200 × 800 px</span>
              </Card>
              <Card
                onClick={() => handlePreset(800, 600)}
                className="p-2.5 cursor-pointer hover:border-emerald-500/50 bg-muted/40 transition-colors"
              >
                <span className="font-bold block text-foreground">Cell 1.5-Col</span>
                <span className="text-[10px] text-muted-foreground">800 × 600 px</span>
              </Card>
              <Card
                onClick={() => handlePreset(1400, 900)}
                className="p-2.5 cursor-pointer hover:border-emerald-500/50 bg-muted/40 transition-colors"
              >
                <span className="font-bold block text-foreground">Lancet Full</span>
                <span className="text-[10px] text-muted-foreground">1400 × 900 px</span>
              </Card>
            </div>
          </div>

          {/* Custom Width & Height */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-muted-foreground">Canvas Width (px)</label>
              <Input
                type="number"
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-muted-foreground">Canvas Height (px)</label>
              <Input
                type="number"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="font-mono text-xs"
              />
            </div>
          </div>

          {/* Export DPI & Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-muted-foreground">Export Resolution (DPI)</label>
              <select
                value={exportDpi}
                onChange={(e) => setExportDpi(e.target.value)}
                className="w-full h-9 px-3 bg-background border border-input rounded-md text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="150">150 DPI (Draft)</option>
                <option value="300">300 DPI (Standard Journal)</option>
                <option value="600">600 DPI (High-Res Print)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-muted-foreground">Canvas Snapping</label>
              <Button
                type="button"
                variant={gridSnap ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGridSnap(!gridSnap)}
                className="w-full justify-center h-9 text-xs"
              >
                {gridSnap ? 'Grid Snapping Enabled' : 'Snapping Disabled'}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleApply}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
