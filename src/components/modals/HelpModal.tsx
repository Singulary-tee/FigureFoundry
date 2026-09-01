import React from 'react';
import { HelpCircle, Keyboard } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Keyboard Shortcuts</DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 max-h-[60vh]">
          <div className="space-y-4 text-xs">
            {/* Keyboard Shortcuts */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <Keyboard className="w-4 h-4 text-primary" />
                <span>Canvas Controls</span>
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

        <DialogFooter className="flex items-center justify-end w-full">
          <Button onClick={onClose} size="sm">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
