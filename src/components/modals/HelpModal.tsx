import React from 'react';
import { HelpCircle, ShieldCheck, Terminal, Keyboard } from 'lucide-react';
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
import { ScrollArea } from '../ui/scroll-area';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">FigureFoundry Guide & Shortcuts</DialogTitle>
              <DialogDescription className="text-xs">Scientific figure authoring & WebMCP agent protocol</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 max-h-[60vh] space-y-4">
          <div className="space-y-4 text-xs">
            {/* WebMCP Invariants */}
            <Card className="bg-muted/50">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Core Architectural Invariants</span>
                </div>
                <ul className="space-y-1.5 text-xs text-muted-foreground list-disc list-inside">
                  <li><strong className="text-foreground">Single Agent-Editable Panel:</strong> Exactly one panel (flagged <code className="bg-muted px-1 rounded">isAgentEditable: true</code>) can be mutated by AI tools. All other panels are strictly human-authored.</li>
                  <li><strong className="text-foreground">No Hardcoded Data:</strong> Every plot data table is live, reactive, and editable in the Data tab.</li>
                  <li><strong className="text-foreground">Native Browser Confirmation:</strong> Revisions require native browser approval before committing to canonical state.</li>
                  <li><strong className="text-foreground">Optimistic Concurrency Control:</strong> Prevents stale tool execution across multi-turn revisions.</li>
                </ul>
              </CardContent>
            </Card>

            {/* WebMCP 4 Tools */}
            <Card className="bg-muted/50">
              <CardContent className="p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-foreground font-bold">
                  <Terminal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>WebMCP Tool Surface</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 border rounded-lg bg-background">
                    <code className="font-bold text-emerald-600 dark:text-emerald-400">inspect_dataset_fields</code>
                    <p className="text-muted-foreground mt-0.5 text-[11px]">Returns columns, data types, units, and missing value counts.</p>
                  </div>
                  <div className="p-2.5 border rounded-lg bg-background">
                    <code className="font-bold text-emerald-600 dark:text-emerald-400">inspect_figure_workspace</code>
                    <p className="text-muted-foreground mt-0.5 text-[11px]">Returns agentEditablePanelId, current intent, revision, and validation report.</p>
                  </div>
                  <div className="p-2.5 border rounded-lg bg-background">
                    <code className="font-bold text-emerald-600 dark:text-emerald-400">propose_figure_revision</code>
                    <p className="text-muted-foreground mt-0.5 text-[11px]">Submits candidate spec for validation and creates preview snapshot.</p>
                  </div>
                  <div className="p-2.5 border rounded-lg bg-background">
                    <code className="font-bold text-emerald-600 dark:text-emerald-400">apply_figure_revision</code>
                    <p className="text-muted-foreground mt-0.5 text-[11px]">Executes two-phase commit after browser user confirmation.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Keyboard Shortcuts */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <Keyboard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Canvas Keyboard Shortcuts</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="flex items-center justify-between p-2.5 bg-muted/50 border rounded-lg">
                  <span className="text-muted-foreground">Select Mode</span>
                  <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px] font-mono">V</kbd>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-muted/50 border rounded-lg">
                  <span className="text-muted-foreground">Pan Hand</span>
                  <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px] font-mono">H</kbd>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-muted/50 border rounded-lg">
                  <span className="text-muted-foreground">Text Label</span>
                  <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px] font-mono">T</kbd>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-muted/50 border rounded-lg">
                  <span className="text-muted-foreground">Rectangle</span>
                  <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px] font-mono">R</kbd>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-muted/50 border rounded-lg">
                  <span className="text-muted-foreground">Undo</span>
                  <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px] font-mono">Ctrl+Z</kbd>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-muted/50 border rounded-lg">
                  <span className="text-muted-foreground">Redo</span>
                  <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px] font-mono">Ctrl+Y</kbd>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button onClick={onClose} size="sm">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
