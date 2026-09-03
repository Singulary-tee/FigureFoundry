import React from 'react';
import { GitPullRequest, CheckCircle2, AlertCircle, Layers, Database, Tag } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import type { FigurePreview } from '../types';

export interface PendingConfirmationDetails {
  previewId: string;
  targetPanelId: string;
  title: string;
  panelKind?: string;
  basedOnRevision: number;
  message?: string;
  preview: FigurePreview;
}

interface ProposalConfirmationModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  details: PendingConfirmationDetails | null;
  onConfirm: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export const ProposalConfirmationModal: React.FC<ProposalConfirmationModalProps> = ({
  isOpen,
  onOpenChange,
  details,
  onConfirm,
  onDiscard,
  onCancel,
}) => {
  if (!details) return null;

  const { preview, targetPanelId, basedOnRevision, title, panelKind } = details;
  const validation = preview.validation;
  const isValid = validation?.valid ?? false;
  const issues = validation?.issues || [];
  const proposedSpec: any = (preview.proposedSpec as any)?.spec || preview.proposedSpec;
  const datasetId = (preview as any).datasetId || proposedSpec?.datasetId || 'Panel-bound';
  const previewSummary = (preview as any).summary;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) onCancel();
    }}>
      <DialogContent
        id="proposal-confirmation-modal"
        className="sm:max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xl p-6"
      >
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <GitPullRequest className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                Confirm WebMCP Figure Revision
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Explicit human confirmation is required before committing agent-proposed changes into canonical state.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 my-2 text-xs">
          {/* Metadata badges row */}
          <div className="flex flex-wrap items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200/80 dark:border-zinc-700/60 font-mono">
            <span className="px-2 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-[11px] font-medium">
              ID: {preview.previewId}
            </span>
            <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px] font-medium flex items-center gap-1">
              <Layers className="w-3 h-3 inline" /> Target: {targetPanelId.toUpperCase()}
            </span>
            <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[11px] font-medium flex items-center gap-1">
              <Tag className="w-3 h-3 inline" /> Rev {basedOnRevision} → Rev {basedOnRevision + 1}
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[11px] font-medium flex items-center gap-1">
              <Database className="w-3 h-3 inline" /> {datasetId}
            </span>
          </div>

          {/* Proposal Spec Overview */}
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 dark:text-zinc-400 font-medium">Proposed Figure Title</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{title || 'Untitled'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 dark:text-zinc-400 font-medium">Panel Layout & Type</span>
              <span className="font-mono text-zinc-700 dark:text-zinc-300">{panelKind || proposedSpec?.mark || 'single-chart'}</span>
            </div>
            {previewSummary && (
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                <span className="text-zinc-500 dark:text-zinc-400 block mb-1">Agent Summary:</span>
                <p className="text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/40 p-2 rounded text-[11px] leading-relaxed">
                  {previewSummary}
                </p>
              </div>
            )}
          </div>

          {/* Validation Status */}
          <div
            className={`p-3 rounded-lg border flex items-start gap-2.5 ${
              isValid
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
            }`}
          >
            {isValid ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <div className="font-semibold">
                {isValid ? 'Deterministic Validation Passed' : 'Deterministic Validation Failed'}
              </div>
              <div className="text-[11px] opacity-90 mt-0.5">
                {isValid
                  ? 'All invariant rules satisfied: dataset binding, schema types, coordinates, and uncertainty bounds are valid.'
                  : `Cannot apply: ${issues.map((i) => i.message).join('; ')}`}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 flex flex-row items-center justify-between gap-2 sm:justify-between">
          <button
            type="button"
            id="modal-discard-proposal-btn"
            onClick={onDiscard}
            className="px-3 py-1.5 rounded text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-800 transition-colors"
          >
            Discard Proposal
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="modal-cancel-proposal-btn"
              onClick={onCancel}
              className="px-3 py-1.5 rounded text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              id="modal-confirm-apply-btn"
              disabled={!isValid}
              onClick={onConfirm}
              className={`px-4 py-1.5 rounded text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 ${
                isValid
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer active:scale-95'
                  : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Confirm &amp; Apply Revision
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
