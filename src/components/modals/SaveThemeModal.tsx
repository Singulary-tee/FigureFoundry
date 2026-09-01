import React, { useState } from 'react';
import { Palette } from 'lucide-react';
import { CanvasTheme } from '../../types/multipanel';
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

interface SaveThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTheme: (theme: CanvasTheme) => void;
  currentTheme: CanvasTheme;
}

export const SaveThemeModal: React.FC<SaveThemeModalProps> = ({
  isOpen,
  onClose,
  onSaveTheme,
  currentTheme,
}) => {
  const [name, setName] = useState('Custom Scientific Preset');
  const [journal, setJournal] = useState('General Scientific');
  const [primary] = useState(currentTheme.colors.primary);
  const [secondary] = useState(currentTheme.colors.secondary);
  const [accent] = useState(currentTheme.colors.accent);
  const [background] = useState(currentTheme.colors.background);
  const [cardBackground] = useState(currentTheme.colors.cardBackground);
  const [text] = useState(currentTheme.colors.text);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newTheme: CanvasTheme = {
      id: `theme-custom-${Date.now()}`,
      name: name.trim(),
      journalTarget: journal,
      colors: {
        background,
        cardBackground,
        text,
        mutedText: text + '99',
        border: '#e4e4e7',
        gridline: '#e4e4e7',
        primary,
        secondary,
        accent,
        pooledDiamond: primary,
        controlBar: secondary,
      },
    };

    onSaveTheme(newTheme);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Save as Theme</DialogTitle>
              <DialogDescription className="text-xs">Create a reusable styling palette</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-foreground">
              Theme Name
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-foreground">
              Journal Target
            </label>
            <select
              value={journal}
              onChange={(e) => setJournal(e.target.value)}
              className="w-full h-9 px-3 bg-background border border-input rounded-md text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="General Scientific">General Scientific</option>
              <option value="Nature / Science">Nature / Science</option>
              <option value="Lancet / NEJM">Lancet / NEJM</option>
              <option value="IEEE / ACM">IEEE / ACM</option>
            </select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save Theme
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
