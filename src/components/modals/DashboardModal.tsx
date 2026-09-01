import React from 'react';
import { LayoutDashboard } from 'lucide-react';
import { MultiPanelFigure, CanvasTheme } from '../../types/multipanel';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

interface DashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  figure: MultiPanelFigure;
  activeTheme: CanvasTheme;
  datasetId?: string;
  revision?: number;
  onOpenProjects?: () => void;
  onOpenData?: () => void;
  onOpenAnalyses?: () => void;
}

export const DashboardModal: React.FC<DashboardModalProps> = ({
  isOpen,
  onClose,
  figure,
  activeTheme,
  datasetId = 'penguins',
  revision = 1,
}) => {
  const totalPanels = figure.panels.length;
  const agentPanel = figure.panels.find((p) => p.isAgentEditable || (p.spec as any).isAgentEditable);
  const totalStudies = figure.panels.reduce((sum, p) => {
    if (p.spec.kind === 'forest-plot') return sum + (p.spec.studies?.length || 0);
    if (p.spec.kind === 'funnel-plot') return sum + (p.spec.points?.length || 0);
    if (p.spec.kind === 'grouped-bar') return sum + (p.spec.groups?.length || 0);
    if (p.spec.kind === 'subgroup-analysis') return sum + (p.spec.subgroups?.length || 0);
    return sum;
  }, 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <LayoutDashboard className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Workspace Health & Metrics</DialogTitle>
              <DialogDescription className="text-xs">Comprehensive state overview for {figure.name}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 text-xs py-2">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-muted/50">
              <CardContent className="p-3 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Total Panels</span>
                <div className="font-mono text-xl font-bold text-foreground">
                  {totalPanels}
                </div>
                <span className="text-[10px] text-muted-foreground">{figure.layers.length} layers active</span>
              </CardContent>
            </Card>

            <Card className="bg-muted/50">
              <CardContent className="p-3 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Revision Number</span>
                <div className="font-mono text-xl font-bold text-primary">
                  Rev {revision}
                </div>
                <span className="text-[10px] text-muted-foreground">Optimistic OCC synced</span>
              </CardContent>
            </Card>

            <Card className="bg-muted/50">
              <CardContent className="p-3 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Data Elements</span>
                <div className="font-mono text-xl font-bold text-foreground">
                  {totalStudies}
                </div>
                <span className="text-[10px] text-muted-foreground">Across active tables</span>
              </CardContent>
            </Card>
          </div>

          {/* Configuration Summary */}
          <Card className="bg-muted/50">
            <CardContent className="p-4 space-y-2.5">
              <span className="font-bold text-foreground block">
                Figure Configuration & Invariants
              </span>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Active Visual Theme:</span>
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeTheme.colors.accent }} />
                    {activeTheme.name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Agent-Editable Panel:</span>
                  <span className="font-mono font-semibold text-primary">
                    {agentPanel ? `Panel ${agentPanel.letter} (${agentPanel.id})` : 'None'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Active Dataset Source:</span>
                  <span className="font-mono text-foreground">{datasetId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Canvas Size:</span>
                  <span className="font-mono text-foreground">
                    {figure.canvasSize.width} × {figure.canvasSize.height} px
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button onClick={onClose} size="sm">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
