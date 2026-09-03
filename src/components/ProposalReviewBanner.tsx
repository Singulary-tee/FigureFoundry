import React from 'react';
import { AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react';
import { FigurePreview } from '../types';

interface ProposalReviewBannerProps {
  preview: FigurePreview | null;
}

export const ProposalReviewBanner: React.FC<ProposalReviewBannerProps> = ({ preview }) => {
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
      <div className="flex items-start gap-2.5">
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
            <span className="text-zinc-600 dark:text-zinc-400">Native browser confirmation is required before commit.</span>
          </div>
          {!valid && blockingIssues.length > 0 && (
            <p className="mt-1 text-[10px] text-red-700 dark:text-red-300">{blockingIssues[0].message}</p>
          )}
        </div>
      </div>
    </section>
  );
};
