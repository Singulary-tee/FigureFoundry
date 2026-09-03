import React, { useState, useEffect } from 'react';
import { FileText, Download, Copy, Check } from 'lucide-react';
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
import { useDomainStore } from '../../packages/domain/store';

interface NotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  figure: MultiPanelFigure;
}

export const NotesModal: React.FC<NotesModalProps> = ({ isOpen, onClose, figure }) => {
  const [notes, setNotes] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const { state, dispatch } = useDomainStore();

  useEffect(() => {
    if (isOpen) {
      const saved = state.notesByFigureId[figure.id]?.research;
      if (saved) {
        setNotes(saved);
      } else {
        const draft = `# ${figure.name} — Research Notes & Methods

## 1. Study Design & Panel Layout
- Total Panels: ${figure.panels.length}
${figure.panels
  .map(
    (p) =>
      `  - **Panel ${p.letter}**: ${(p.spec as any).title || p.label} (${p.spec.kind})`
  )
  .join('\n')}

## 2. Statistical Methodology
- Record the analysis method, transformations, assumptions, uncertainty estimates, and validation checks actually used.

## 3. Data Provenance & Ethics
- Record source datasets, preparation steps, and any privacy or ethical considerations.

## 4. Manuscript Caption Draft
Describe the figure using the panels and analysis actually present.
`;
        setNotes(draft);
      }
    }
  }, [isOpen, figure, state.notesByFigureId]);

  const handleSave = (val: string) => {
    setNotes(val);
    dispatch({ type: 'SET_FIGURE_NOTES', payload: { figureId: figure.id, notes: { research: val } } });
  };

  const handleExportMarkdown = () => {
    const blob = new Blob([notes], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${figure.name.toLowerCase().replace(/\s+/g, '-')}-notes.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(notes);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Research Notes & Methods</DialogTitle>
              <DialogDescription className="text-xs">Documentation, manuscript captions, and statistical descriptions</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 space-y-2 py-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Markdown Methodological Notes</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleCopy} className="text-xs h-8">
                {copied ? <Check className="w-3.5 h-3.5 text-primary mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button size="sm" variant="outline" onClick={handleExportMarkdown} className="text-xs h-8">
                <Download className="w-3.5 h-3.5 mr-1.5" /> Export .md
              </Button>
            </div>
          </div>
          <textarea
            value={notes}
            onChange={(e) => handleSave(e.target.value)}
            className="w-full h-72 p-3 font-mono text-xs bg-muted/30 border rounded-xl focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            placeholder="Type your research notes and methodology..."
          />
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
