import React, { useState, useEffect } from 'react';
import { ProvenanceEvent } from '../types';
import { History, ChevronDown, ChevronRight, FileCode, Copy, Check } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from './ui/sheet';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface ProvenanceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  provenanceLedger: ProvenanceEvent[];
  currentRevision: number;
  onRestoreRevision?: (revision: number) => void;
  isInline?: boolean;
}

export const ProvenanceDrawer: React.FC<ProvenanceDrawerProps> = ({
  isOpen,
  onClose,
  provenanceLedger,
  currentRevision,
  onRestoreRevision,
  isInline
}) => {
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen && !isInline) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isInline]);

  const handleCopySnapshot = (event: ProvenanceEvent) => {
    navigator.clipboard.writeText(JSON.stringify(event.specSnapshot, null, 2));
    setCopiedId(event.eventId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderContent = () => (
    <div className={`flex flex-col gap-4 h-full bg-white dark:bg-[#171717] transition-colors ${isInline ? 'w-full p-4 sm:p-5 overflow-y-auto' : ''}`}>
      <div className="flex items-start justify-between pb-3.5 border-b border-border shrink-0">
        <div className="space-y-1 pr-2">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-primary shrink-0" />
            <h2 className="font-semibold text-sm tracking-tight text-foreground leading-normal">
              Figure Revision History
            </h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Immutable append-only audit ledger with reproducible Vega-Lite snapshots and one-click replay.
          </p>
        </div>
      </div>

      <div className="space-y-3 pb-4">
        {provenanceLedger.map((event) => {
          const isCurrent = event.revision === currentRevision;
          const isExpanded = expandedEventId === event.eventId;

          return (
            <div
              key={event.eventId}
              className={`relative rounded-md border p-3.5 transition-all ${
                isCurrent
                  ? 'border-primary/50 bg-muted/40'
                  : 'border-border bg-muted/20 hover:border-border'
              }`}
            >
              
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-mono font-medium leading-normal ${
                      isCurrent
                        ? 'bg-primary/10 text-primary border border-primary/30'
                        : 'bg-muted text-muted-foreground border border-border'
                    }`}
                  >
                    Revision {event.revision}
                  </span>

                  <span className="text-xs font-mono text-[#a1a1aa] dark:text-[#737373] leading-normal">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              <p className="text-xs font-medium text-[#18181b] dark:text-[#EDEDED] mb-1.5 leading-relaxed break-words">
                {event.summary}
              </p>

              {event.diffDescription && event.diffDescription.length > 0 && (
                <div className="space-y-1.5 my-2 bg-background p-2.5 rounded-md border border-border text-xs font-mono text-muted-foreground">
                  <span className="text-[10px] uppercase font-medium text-muted-foreground block mb-1 leading-normal">
                    Visual Spec Changes:
                  </span>
                  {event.diffDescription.map((d, dIdx) => (
                    <div key={dIdx} className="flex items-start gap-2 text-foreground leading-normal">
                      <span className="text-primary shrink-0">•</span>
                      <span className="break-words">{d}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t border-border mt-2 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setExpandedEventId(isExpanded ? null : event.eventId)}
                    className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer leading-normal min-h-[28px]"
                  >
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                    <FileCode className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span>{isExpanded ? 'Hide Spec JSON' : 'View Spec JSON'}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {!isCurrent && onRestoreRevision && (
                      <button
                        onClick={() => onRestoreRevision(event.revision)}
                        className="inline-flex items-center gap-1 text-xs font-mono text-primary hover:text-primary/80 cursor-pointer font-semibold leading-normal min-h-[28px]"
                      >
                        <History className="w-3 h-3 shrink-0" />
                        <span>Restore</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleCopySnapshot(event)}
                      className="inline-flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground cursor-pointer leading-normal min-h-[28px]"
                    >
                      {copiedId === event.eventId ? <Check className="w-3 h-3 text-primary shrink-0" /> : <Copy className="w-3 h-3 shrink-0" />}
                      <span>{copiedId === event.eventId ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <pre className="p-3 bg-white dark:bg-[#171717] rounded-md text-xs font-mono text-[#18181b] dark:text-[#EDEDED] overflow-x-auto max-h-56 border border-[#e4e4e7] dark:border-[#262626] leading-relaxed">
                    {JSON.stringify(event.specSnapshot, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (isInline) {
    return renderContent();
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col h-full bg-white dark:bg-[#171717] border-l border-[#e4e4e7] dark:border-[#262626]">
        <SheetHeader className="sr-only">
          <SheetTitle>Figure Revision History</SheetTitle>
          <SheetDescription>Immutable append-only audit ledger with reproducible Vega-Lite snapshots</SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 p-4 sm:p-5">
          {renderContent()}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
