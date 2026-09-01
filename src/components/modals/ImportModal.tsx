import React, { useState, useRef } from 'react';
import { useDomainStore } from '../../packages/domain/store';
import { processImportedFile } from '../../packages/validation/boundary';
import { validateFile } from '../../packages/validation/validator';
import { Upload, FileText, CheckCircle2, AlertTriangle, Layers, FolderKanban } from 'lucide-react';
import { DatasetRecord } from '../../packages/data-model/datasets';
import { FigureProject } from '../../types/multipanel';
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

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultScope?: 'project' | 'workspace';
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, defaultScope = 'project' }) => {
  const { dispatch } = useDomainStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [filename, setFilename] = useState<string>('');
  const [scope, setScope] = useState<'project' | 'workspace'>(defaultScope);
  const [parsedDataset, setParsedDataset] = useState<DatasetRecord | null>(null);
  const [parsedFigure, setParsedFigure] = useState<FigureProject | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationSuccess, setValidationSuccess] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (file: File) => {
    setFilename(file.name);
    setValidationError(null);
    setValidationSuccess(null);
    setParsedDataset(null);
    setParsedFigure(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;

      const val = validateFile(content, file.name);
      if (!val.valid) {
        setValidationError(val.errors.join(' '));
        return;
      }

      const res = processImportedFile(content, file.name);
      if (!res.valid) {
        setValidationError(res.errors.join(' ') || 'Failed to parse imported file.');
        return;
      }

      if (res.dataset) {
        setParsedDataset(res.dataset);
        setValidationSuccess(`Valid Dataset (${res.dataset.rows.length} rows)`);
      } else {
        setValidationError('Unrecognized file content.');
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmImport = () => {
    if (parsedDataset) {
      dispatch({
        type: 'ADD_DATASET',
        payload: {
          dataset: parsedDataset,
          scope,
        },
      });
      onClose();
    } else if (parsedFigure) {
      dispatch({
        type: 'IMPORT_FIGURE_BUNDLE',
        payload: parsedFigure,
      });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Import Dataset or Bundle</DialogTitle>
              <DialogDescription className="text-xs">Upload CSV, JSON, or TSV data for meta-analysis or charting</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Scope Selector */}
          <div className="space-y-1.5">
            <span className="font-semibold text-foreground block">Import Scope Isolation</span>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={scope === 'project' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setScope('project')}
                className="justify-start gap-2 h-9"
              >
                <FolderKanban className="w-4 h-4" />
                <span>Project Scope</span>
              </Button>
              <Button
                variant={scope === 'workspace' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setScope('workspace')}
                className="justify-start gap-2 h-9"
              >
                <Layers className="w-4 h-4" />
                <span>Workspace Scope</span>
              </Button>
            </div>
          </div>

          {/* Drag & Drop Box */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50 bg-muted/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json,.tsv,.txt"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            />
            <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
              <Upload className="w-5 h-5" />
            </div>
            <p className="font-medium text-foreground">Click to browse or drop file here</p>
            <p className="text-muted-foreground text-[11px] mt-1">Supports CSV, TSV, JSON tabular study records</p>
          </div>

          {filename && (
            <Card className="bg-muted/50">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="font-mono text-xs">{filename}</span>
                </div>
                {validationSuccess && (
                  <span className="flex items-center gap-1 text-primary font-semibold text-[11px]">
                    <CheckCircle2 className="w-4 h-4" /> {validationSuccess}
                  </span>
                )}
                {validationError && (
                  <span className="flex items-center gap-1 text-destructive font-semibold text-[11px]">
                    <AlertTriangle className="w-4 h-4" /> {validationError}
                  </span>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!parsedDataset && !parsedFigure}
            onClick={handleConfirmImport}
          >
            Confirm Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
