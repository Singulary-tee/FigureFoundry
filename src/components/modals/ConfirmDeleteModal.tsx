import React from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';

export interface ConfirmDeleteState {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
}

interface ConfirmDeleteModalProps {
  state: ConfirmDeleteState | null;
  onClose: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  state,
  onClose,
}) => {
  if (!state || !state.isOpen) return null;

  return (
    <Dialog open={state.isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-destructive/15 flex items-center justify-center shrink-0 text-destructive">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-semibold">
              {state.title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            {state.description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex items-center justify-end gap-2 mt-4 pt-3 border-t">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => {
              state.onConfirm();
              onClose();
            }}
          >
            {state.confirmLabel || 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

