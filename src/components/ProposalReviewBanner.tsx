import React from 'react';
import { AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react';
import { FigurePreview } from '../types';

interface ProposalReviewBannerProps {
  preview: FigurePreview | null;
  onReviewAndConfirm?: () => void;
  onDiscard?: () => void;
}

export const ProposalReviewBanner: React.FC<ProposalReviewBannerProps> = ({
  preview,
  onReviewAndConfirm,
  onDiscard,
}) => {
  if (!preview) return null;

  const blockingIssues = preview.validation.issues.filter((issue) => issue.severity === 'blocking');
  const warningIssues = preview.validation.issues.filter((issue) => issue.severity === 'warning');
  const valid = preview.validation.valid;

  return (
    <section
      aria-label="WebMCP proposal review"
      className={`mx-3 mt-3 rounded-lg border px-3.5 py-3 shadow-sm ${
        valid
          ? 'border-amber-300 bg-amber-50 dark:border-amber-700/70 dark:bg-amber-950/30'
          : 'border-red-300 bg-red-50 dark:border-red-700/70 dark:bg-red-950/30'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          {valid ? (
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-700 dark:text-red-300" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                {valid ? 'WebMCP proposal staged for review' : 'WebMCP proposal blocked by validation'}
              </h2>
              <span className="font-mono text-[10px] text-zinc-600 dark:text-zinc-400">{preview.previewId}</span>
            </div>
            <p className="mt-1 text-xs text-zinc-700 dark:text-zinc-300">
              {String(preview.proposedSpec?.title || 'Untitled revision')} · {preview.panelId || 'target panel'} · based on Rev {preview.basedOnRevision}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-semibold">
              <span className={valid ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}>
                {valid ? <CheckCircle2 className="mr-1 inline h-3 w-3" /> : null}
                {valid ? 'Ready for confirmation' : `${blockingIssues.length} blocking issue${blockingIssues.length === 1 ? '' : 's'}`}
              </span>
              {warningIssues.length > 0 && <span className="text-amber-800 dark:text-amber-300">{warningIssues.length} warning{warningIssues.length === 1 ? '' : 's'}</span>}
              <span className="text-zinc-600 dark:text-zinc-400">In-app confirmation required before commit.</span>
            </div>
            {!valid && blockingIssues.length > 0 && (
              <p className="mt-1 text-[10px] text-red-700 dark:text-red-300">{blockingIssues[0].message}</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0 self-center">
          {onDiscard && (
            <button
              type="button"
              id="banner-discard-proposal-btn"
              onClick={onDiscard}
              className="px-2.5 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 rounded transition-colors"
            >
              Discard
            </button>
          )}
          {valid && onReviewAndConfirm && (
            <button
              type="button"
              id="banner-review-confirm-btn"
              onClick={onReviewAndConfirm}
              className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded shadow-sm flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Review &amp; Confirm
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
