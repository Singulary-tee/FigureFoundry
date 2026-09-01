import React from 'react';
import { FigurePreview } from '../types';
import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface TwoPhaseApprovalBannerProps {
  activePreview: FigurePreview;
  onApproveUI: (previewId: string) => void;
  onApplyRevision: (previewId: string, basedOnRevision: number) => void;
  onRejectPreview: () => void;
}

export const TwoPhaseApprovalBanner: React.FC<TwoPhaseApprovalBannerProps> = ({
  activePreview,
  onApproveUI,
  onApplyRevision,
  onRejectPreview
}) => {
  const { previewId, basedOnRevision, proposedSpec, validation, approvedInUI } = activePreview;

  return (
    <motion.div
      id="two-phase-approval-banner"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}
      className={`mb-4 rounded-lg border p-3.5 sm:p-4 bg-background shrink-0 transition-colors ${
        approvedInUI ? 'border-primary' : 'border-border'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-foreground leading-normal break-words">
              Proposed Changes: {proposedSpec.title}
            </span>
            <span className="text-xs text-muted-foreground font-mono leading-normal">
              ({proposedSpec.figureIntent}, {proposedSpec.mark})
            </span>
          </div>

          {validation.issues.length > 0 && (
            <div className="mt-2 space-y-1.5 bg-muted/40 p-3 rounded-md border border-border text-xs">
              {validation.issues.map((issue, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className={`font-mono font-medium text-xs shrink-0 leading-normal ${issue.severity === 'blocking' ? 'text-destructive' : 'text-amber-500'}`}>
                    [{issue.severity.toUpperCase()}]
                  </span>
                  <div className="space-y-0.5 text-foreground flex-1 leading-normal">
                    <p className="break-words">{issue.message}</p>
                    {issue.nextAction && (
                      <p className="text-[11px] text-muted-foreground break-words">{issue.nextAction}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {!approvedInUI ? (
            <>
              <button
                id="btn-approve-preview-changes"
                onClick={() => onApproveUI(previewId)}
                disabled={!validation.valid}
                className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors min-h-[34px] leading-normal ${
                  validation.valid
                    ? 'bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-xs'
                    : 'bg-muted text-muted-foreground cursor-not-allowed border border-border'
                }`}
              >
                Accept Changes
              </button>

              <button
                id="btn-discard-preview"
                onClick={onRejectPreview}
                className="px-3.5 py-1.5 rounded-md text-xs font-medium text-foreground hover:text-foreground bg-muted hover:bg-muted/80 border border-border transition-colors cursor-pointer min-h-[34px] leading-normal"
              >
                Discard
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                id="btn-commit-revision"
                onClick={() => onApplyRevision(previewId, basedOnRevision)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium text-primary-foreground bg-primary hover:bg-primary/90 transition-colors cursor-pointer min-h-[34px] leading-normal shadow-xs"
              >
                <span>Commit</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </button>

              <button
                id="btn-cancel-approved-preview"
                onClick={onRejectPreview}
                className="text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 transition-colors cursor-pointer min-h-[34px] leading-normal"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
