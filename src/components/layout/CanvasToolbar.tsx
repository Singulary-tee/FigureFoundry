import React, { useRef } from 'react';
import {
  MousePointer2,
  Hand,
  Type,
  Square,
  Slash,
  ArrowUpRight,
  Image as ImageIcon,
  Table as TableIcon,
  Layers,
  Wand2,
} from 'lucide-react';
import { CanvasToolMode } from '../../types/multipanel';

interface CanvasToolbarProps {
  toolMode: CanvasToolMode;
  onSelectToolMode: (mode: CanvasToolMode) => void;
  onUploadImage: (file: File) => void;
  onArrange: (action: 'front' | 'back') => void;
  onTidyLayout: () => void;
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  toolMode,
  onSelectToolMode,
  onUploadImage,
  onArrange,
  onTidyLayout,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadImage(e.target.files[0]);
      e.target.value = '';
    }
  };

  return (
    <div className="h-10 bg-white dark:bg-[#121212] border-b border-[#e4e4e7] dark:border-[#27272a] px-3 flex items-center justify-start gap-1 select-none z-20 shrink-0 transition-colors overflow-x-auto no-scrollbar max-w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Select */}
      <button
        onClick={() => onSelectToolMode('select')}
        className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-all shrink-0 cursor-pointer ${
          toolMode === 'select'
            ? 'text-[#24b47e] bg-[#24b47e]/10 font-semibold'
            : 'text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#f4f4f5] dark:hover:bg-[#1f1f23] hover:text-[#0f172a] dark:hover:text-[#f4f4f5]'
        }`}
        title="Select & Move (V)"
      >
        <MousePointer2 className="w-3.5 h-3.5" />
        <span>Select</span>
      </button>

      {/* Pan */}
      <button
        onClick={() => onSelectToolMode('pan')}
        className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-all shrink-0 cursor-pointer ${
          toolMode === 'pan'
            ? 'text-[#24b47e] bg-[#24b47e]/10 font-semibold'
            : 'text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#f4f4f5] dark:hover:bg-[#1f1f23] hover:text-[#0f172a] dark:hover:text-[#f4f4f5]'
        }`}
        title="Pan Canvas (H)"
      >
        <Hand className="w-3.5 h-3.5" />
        <span>Pan</span>
      </button>

      <div className="h-4 w-px bg-[#e4e4e7] dark:bg-[#27272a] mx-1 shrink-0" />

      {/* Text */}
      <button
        onClick={() => onSelectToolMode('text')}
        className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-all shrink-0 cursor-pointer ${
          toolMode === 'text'
            ? 'text-[#24b47e] bg-[#24b47e]/10 font-semibold'
            : 'text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#f4f4f5] dark:hover:bg-[#1f1f23] hover:text-[#0f172a] dark:hover:text-[#f4f4f5]'
        }`}
        title="Insert Text"
      >
        <Type className="w-3.5 h-3.5" />
        <span>Text</span>
      </button>

      {/* Shape */}
      <button
        onClick={() => onSelectToolMode('shape')}
        className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-all shrink-0 cursor-pointer ${
          toolMode === 'shape'
            ? 'text-[#24b47e] bg-[#24b47e]/10 font-semibold'
            : 'text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#f4f4f5] dark:hover:bg-[#1f1f23] hover:text-[#0f172a] dark:hover:text-[#f4f4f5]'
        }`}
        title="Insert Shape"
      >
        <Square className="w-3.5 h-3.5" />
        <span>Shape</span>
      </button>

      {/* Line */}
      <button
        onClick={() => onSelectToolMode('line')}
        className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-all shrink-0 cursor-pointer ${
          toolMode === 'line'
            ? 'text-[#24b47e] bg-[#24b47e]/10 font-semibold'
            : 'text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#f4f4f5] dark:hover:bg-[#1f1f23] hover:text-[#0f172a] dark:hover:text-[#f4f4f5]'
        }`}
        title="Insert Line"
      >
        <Slash className="w-3.5 h-3.5" />
        <span>Line</span>
      </button>

      {/* Arrow */}
      <button
        onClick={() => onSelectToolMode('arrow')}
        className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-all shrink-0 cursor-pointer ${
          toolMode === 'arrow'
            ? 'text-[#24b47e] bg-[#24b47e]/10 font-semibold'
            : 'text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#f4f4f5] dark:hover:bg-[#1f1f23] hover:text-[#0f172a] dark:hover:text-[#f4f4f5]'
        }`}
        title="Insert Arrow"
      >
        <ArrowUpRight className="w-3.5 h-3.5" />
        <span>Arrow</span>
      </button>

      {/* Image */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#f4f4f5] dark:hover:bg-[#1f1f23] hover:text-[#0f172a] dark:hover:text-[#f4f4f5] transition-all shrink-0 cursor-pointer"
        title="Upload Image"
      >
        <ImageIcon className="w-3.5 h-3.5" />
        <span>Image</span>
      </button>

      {/* Table */}
      <button
        onClick={() => onSelectToolMode('table')}
        className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-all shrink-0 cursor-pointer ${
          toolMode === 'table'
            ? 'text-[#24b47e] bg-[#24b47e]/10 font-semibold'
            : 'text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#f4f4f5] dark:hover:bg-[#1f1f23] hover:text-[#0f172a] dark:hover:text-[#f4f4f5]'
        }`}
        title="Insert Table Grid"
      >
        <TableIcon className="w-3.5 h-3.5" />
        <span>Table</span>
      </button>

      {/* Arrange */}
      <button
        onClick={() => onArrange('front')}
        className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#f4f4f5] dark:hover:bg-[#1f1f23] hover:text-[#0f172a] dark:hover:text-[#f4f4f5] transition-all shrink-0 cursor-pointer"
        title="Bring to Front"
      >
        <Layers className="w-3.5 h-3.5" />
        <span>Arrange</span>
      </button>

      <button
        onClick={onTidyLayout}
        className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#24b47e]/10 hover:text-[#168a5b] dark:hover:text-[#52d69a] active:scale-95 transition-all shrink-0 cursor-pointer"
        title="Tidy panels into a publication-ready grid"
      >
        <Wand2 className="w-3.5 h-3.5" />
        <span>Tidy layout</span>
      </button>
    </div>
  );
};
