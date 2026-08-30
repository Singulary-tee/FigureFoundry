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
      className={`mb-4 rounded-lg border p-3.5 sm:p-4 bg-white dark:bg-[#171717] shrink-0 transition-colors ${
        approvedInUI ? 'border-[#24b47e] dark:border-[#3ecf8e]' : 'border-[#e4e4e7] dark:border-[#2e2e2e]'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[#18181b] dark:text-[#EDEDED] leading-normal break-words">
              Proposed Changes: {proposedSpec.title}
            </span>
            <span className="text-xs text-[#71717a] dark:text-[#8C8C8C] font-mono leading-normal">
              ({proposedSpec.figureIntent}, {proposedSpec.mark})
            </span>
          </div>

          {validation.issues.length > 0 && (
            <div className="mt-2 space-y-1.5 bg-[#f8f9fa] dark:bg-[#121212] p-3 rounded-md border border-[#e4e4e7] dark:border-[#262626] text-xs">
              {validation.issues.map((issue, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className={`font-mono font-medium text-xs shrink-0 leading-normal ${issue.severity === 'blocking' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    [{issue.severity.toUpperCase()}]
                  </span>
                  <div className="space-y-0.5 text-[#18181b] dark:text-[#EDEDED] flex-1 leading-normal">
                    <p className="break-words">{issue.message}</p>
                    {issue.nextAction && (
                      <p className="text-[11px] text-[#71717a] dark:text-[#8C8C8C] break-words">{issue.nextAction}</p>
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
                    ? 'bg-[#3ecf8e] hover:bg-[#34b27b] text-black cursor-pointer shadow-xs'
                    : 'bg-[#f4f4f5] dark:bg-[#1f1f1f] text-[#a1a1aa] dark:text-[#525252] cursor-not-allowed border border-[#e4e4e7] dark:border-[#2e2e2e]'
                }`}
              >
                Accept Changes
              </button>

              <button
                id="btn-discard-preview"
                onClick={onRejectPreview}
                className="px-3.5 py-1.5 rounded-md text-xs font-medium text-[#18181b] dark:text-[#EDEDED] hover:text-black dark:hover:text-white bg-[#f4f4f5] dark:bg-[#1f1f1f] hover:bg-[#e4e4e7] dark:hover:bg-[#282828] border border-[#e4e4e7] dark:border-[#2e2e2e] transition-colors cursor-pointer min-h-[34px] leading-normal"
              >
                Discard
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                id="btn-commit-revision"
                onClick={() => onApplyRevision(previewId, basedOnRevision)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium text-black bg-[#3ecf8e] hover:bg-[#34b27b] transition-colors cursor-pointer min-h-[34px] leading-normal shadow-xs"
              >
                <span>Commit</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </button>

              <button
                id="btn-cancel-approved-preview"
                onClick={onRejectPreview}
                className="text-xs text-[#71717a] dark:text-[#8C8C8C] hover:text-[#18181b] dark:hover:text-[#EDEDED] px-2.5 py-1.5 transition-colors cursor-pointer min-h-[34px] leading-normal"
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
