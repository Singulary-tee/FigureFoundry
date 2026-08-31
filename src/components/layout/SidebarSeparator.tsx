import React from 'react';
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';

interface SidebarSeparatorProps {
  side: 'left' | 'right';
  isCollapsed: boolean;
  onToggle: () => void;
  title?: string;
}

export const SidebarSeparator: React.FC<SidebarSeparatorProps> = ({
  side,
  isCollapsed,
  onToggle,
  title,
}) => {
  return (
    <div
      className={`relative flex items-center justify-center shrink-0 select-none z-30 transition-all ${
        side === 'left'
          ? 'border-r border-[#e4e4e7] dark:border-[#27272a] bg-[#fafafa] dark:bg-[#18181b]'
          : 'border-l border-[#e4e4e7] dark:border-[#27272a] bg-[#fafafa] dark:bg-[#18181b]'
      }`}
      style={{ width: '8px' }}
    >
      {/* Decorative center grip line */}
      <div className="h-12 flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity">
        <GripVertical className="w-3 h-3 text-[#71717a] dark:text-[#a1a1aa]" />
      </div>

      {/* Collapse / Expand Handle Button */}
      <button
        onClick={onToggle}
        title={title || (isCollapsed ? 'Expand panel' : 'Collapse panel')}
        className={`absolute top-1/2 -translate-y-1/2 w-5 h-8 bg-white dark:bg-[#27272a] border border-[#e4e4e7] dark:border-[#3f3f46] shadow-xs rounded-md flex items-center justify-center text-[#71717a] dark:text-[#a1a1aa] hover:text-[#0f172a] dark:hover:text-[#f4f4f5] hover:bg-[#f4f4f5] dark:hover:bg-[#3f3f46] transition-all cursor-pointer ${
          side === 'left' ? '-right-2.5' : '-left-2.5'
        }`}
      >
        {side === 'left' ? (
          isCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )
        ) : isCollapsed ? (
          <ChevronLeft className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
      </button>
    </div>
  );
};
