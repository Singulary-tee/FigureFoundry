import React, { useState, useEffect } from 'react';
import { FolderPlus, Download, Upload, Trash2, Copy, Check } from 'lucide-react';
import { MultiPanelFigure } from '../../types/multipanel';
import { DEFAULT_MULTIPANEL_FIGURE } from '../../packages/multipanel/defaultFigure';
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
import { ConfirmDeleteModal, ConfirmDeleteState } from './ConfirmDeleteModal';

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFigure: MultiPanelFigure;
  onLoadFigure: (figure: MultiPanelFigure) => void;
  onNewFigure?: () => void;
}

interface SavedProject {
  id: string;
  name: string;
  updatedAt: string;
  panelCount: number;
  figure: MultiPanelFigure;
}

const STORAGE_KEY = 'figurefoundry_saved_projects';

export const ProjectsModal: React.FC<ProjectsModalProps> = ({
  isOpen,
  onClose,
  currentFigure,
  onLoadFigure,
}) => {
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteState | null>(null);

  useEffect(() => {
    if (isOpen) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          setProjects(JSON.parse(raw));
        } else {
          const initial: SavedProject[] = [
            {
              id: 'proj-default',
              name: currentFigure.name || 'Example Scientific Figure',
              updatedAt: new Date().toISOString(),
              panelCount: currentFigure.panels.length,
              figure: currentFigure,
            },
          ];
          setProjects(initial);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
        }
      } catch (e) {
        console.error('Failed to load projects', e);
      }
    }
  }, [isOpen, currentFigure]);

  const saveProjectsToStorage = (updated: SavedProject[]) => {
    setProjects(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save projects to storage', e);
    }
  };

  const handleSaveCurrentAsNew = () => {
    const newProj: SavedProject = {
      id: `proj-${Date.now()}`,
      name: `${currentFigure.name} (Copy)`,
      updatedAt: new Date().toISOString(),
      panelCount: currentFigure.panels.length,
      figure: {
        ...currentFigure,
        id: `fig-${Date.now()}`,
        name: `${currentFigure.name} (Copy)`,
      },
    };
    const updated = [newProj, ...projects];
    saveProjectsToStorage(updated);
  };

  const handleCreateBlank = () => {
    const blank: MultiPanelFigure = {
      ...DEFAULT_MULTIPANEL_FIGURE,
      id: `fig-${Date.now()}`,
      name: 'New Scientific Figure',
      panels: [
        {
          id: 'panel-a',
          letter: 'A',
          label: 'Panel A',
          frame: { x: 50, y: 50, width: 520, height: 320 },
          spec: {
            kind: 'forest-plot',
            title: 'Study Results',
            model: 'IV, Random Effects',
            effectMeasure: 'Odds Ratio (OR)',
            studies: [],
          } as any,
          isAgentEditable: true,
        },
      ],
    };
    onLoadFigure(blank);
    onClose();
  };

  const handleDelete = (proj: SavedProject, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDelete({
      isOpen: true,
      title: `Delete Saved Project "${proj.name}"`,
      description: `Are you sure you want to delete "${proj.name}" from your local browser storage?`,
      confirmLabel: 'Delete Project',
      onConfirm: () => {
        const updated = projects.filter((p) => p.id !== proj.id);
        saveProjectsToStorage(updated);
      },
    });
  };

  const handleExportJson = (proj: SavedProject, e: React.MouseEvent) => {
    e.stopPropagation();
    const blob = new Blob([JSON.stringify(proj.figure, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${proj.name.toLowerCase().replace(/\s+/g, '-')}-project.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Project Manager & Templates</DialogTitle>
              <DialogDescription className="text-xs">Save, load, clone, and export scientific figure project files</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex items-center justify-between py-2 border-b">
          <Button size="sm" onClick={handleCreateBlank} className="text-xs">
            + New Blank Figure
          </Button>
          <Button size="sm" variant="outline" onClick={handleSaveCurrentAsNew} className="text-xs">
            Save Current as Copy
          </Button>
        </div>

        <ScrollArea className="flex-1 pr-2 max-h-[50vh] space-y-2 py-2">
          {projects.map((proj) => {
            const isCurrent = currentFigure.id === proj.figure.id;
            return (
              <Card
                key={proj.id}
                onClick={() => {
                  onLoadFigure(proj.figure);
                  onClose();
                }}
                className={`cursor-pointer transition-colors p-3.5 bg-muted/40 hover:border-primary/50 ${
                  isCurrent ? 'border-primary bg-primary/5' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-xs text-foreground block">{proj.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {proj.panelCount} panels • Updated {new Date(proj.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      title="Export JSON"
                      onClick={(e) => handleExportJson(proj, e)}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                    {projects.length > 1 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        title="Delete Project"
                        onClick={(e) => handleDelete(proj, e)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </ScrollArea>

        <DialogFooter>
          <Button onClick={onClose} size="sm">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>

      <ConfirmDeleteModal
        state={confirmDelete}
        onClose={() => setConfirmDelete(null)}
      />
    </Dialog>
  );
};
