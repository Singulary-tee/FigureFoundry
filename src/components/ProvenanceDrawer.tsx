import React, { useState, useEffect } from 'react';
import { ProvenanceEvent } from '../types';
import { X, History, ChevronDown, ChevronRight, FileCode, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
      <div className="flex items-start justify-between pb-3.5 border-b border-[#e4e4e7] dark:border-[#262626] shrink-0">
        <div className="space-y-1 pr-2">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#24b47e] dark:text-[#3ecf8e] shrink-0" />
            <h2 className="font-semibold text-sm tracking-tight text-[#18181b] dark:text-[#EDEDED] leading-normal">
              Figure Revision History
            </h2>
          </div>
          <p className="text-xs text-[#71717a] dark:text-[#8C8C8C] leading-relaxed">
            Immutable append-only audit ledger with reproducible Vega-Lite snapshots and one-click replay.
          </p>
        </div>
        {!isInline && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-md bg-[#f4f4f5] dark:bg-[#1f1f1f] border border-[#e4e4e7] dark:border-[#2e2e2e] text-[#71717a] dark:text-[#8C8C8C] hover:text-[#18181b] dark:hover:text-[#EDEDED] min-h-[34px] min-w-[34px] flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Close Ledger"
          >
            <X className="w-4 h-4" />
          </button>
        )}
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
                  ? 'border-[#24b47e]/50 dark:border-[#3ecf8e]/50 bg-[#f8f9fa] dark:bg-[#121212]'
                  : 'border-[#e4e4e7] dark:border-[#262626] bg-[#f8f9fa] dark:bg-[#121212] hover:border-[#a1a1aa] dark:hover:border-[#383838]'
              }`}
            >
              
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-mono font-medium leading-normal ${
                      isCurrent
                        ? 'bg-[#3ecf8e]/10 text-[#24b47e] dark:text-[#3ecf8e] border border-[#24b47e]/30 dark:border-[#3ecf8e]/30'
                        : 'bg-[#e4e4e7] dark:bg-[#1f1f1f] text-[#71717a] dark:text-[#8C8C8C] border border-[#d4d4d8] dark:border-[#2e2e2e]'
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
                <div className="space-y-1.5 my-2 bg-white dark:bg-[#171717] p-2.5 rounded-md border border-[#e4e4e7] dark:border-[#262626] text-xs font-mono text-[#71717a] dark:text-[#8C8C8C]">
                  <span className="text-[10px] uppercase font-medium text-[#a1a1aa] dark:text-[#737373] block mb-1 leading-normal">
                    Visual Spec Changes:
                  </span>
                  {event.diffDescription.map((d, dIdx) => (
                    <div key={dIdx} className="flex items-start gap-2 text-[#18181b] dark:text-[#EDEDED] leading-normal">
                      <span className="text-[#24b47e] dark:text-[#3ecf8e] shrink-0">•</span>
                      <span className="break-words">{d}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t border-[#e4e4e7] dark:border-[#262626] mt-2 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setExpandedEventId(isExpanded ? null : event.eventId)}
                    className="inline-flex items-center gap-1.5 text-xs font-mono text-[#71717a] dark:text-[#8C8C8C] hover:text-[#18181b] dark:hover:text-[#EDEDED] transition-colors cursor-pointer leading-normal min-h-[28px]"
                  >
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-[#71717a] dark:text-[#8C8C8C] shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-[#71717a] dark:text-[#8C8C8C] shrink-0" />}
                    <FileCode className="w-3.5 h-3.5 text-[#71717a] dark:text-[#8C8C8C] shrink-0" />
                    <span>{isExpanded ? 'Hide Spec JSON' : 'View Spec JSON'}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {!isCurrent && onRestoreRevision && (
                      <button
                        onClick={() => onRestoreRevision(event.revision)}
                        className="inline-flex items-center gap-1 text-xs font-mono text-[#24b47e] dark:text-[#3ecf8e] hover:text-[#1f9366] dark:hover:text-[#34b27b] cursor-pointer font-semibold leading-normal min-h-[28px]"
                      >
                        <History className="w-3 h-3 shrink-0" />
                        <span>Restore</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleCopySnapshot(event)}
                      className="inline-flex items-center gap-1 text-xs font-mono text-[#71717a] dark:text-[#8C8C8C] hover:text-[#18181b] dark:hover:text-[#EDEDED] cursor-pointer leading-normal min-h-[28px]"
                    >
                      {copiedId === event.eventId ? <Check className="w-3 h-3 text-[#24b47e] dark:text-[#3ecf8e] shrink-0" /> : <Copy className="w-3 h-3 shrink-0" />}
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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm cursor-pointer"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-xl h-full bg-white dark:bg-[#171717] border-l border-[#e4e4e7] dark:border-[#262626] shadow-xl z-10 transition-colors flex flex-col overflow-hidden"
          >
            <div className="p-4 sm:p-5 flex flex-col h-full overflow-y-auto">
              {renderContent()}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
