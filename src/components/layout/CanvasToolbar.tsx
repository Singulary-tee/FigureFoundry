import React, { useRef } from 'react';
import {
  MousePointer2,
  Hand,
  ZoomIn,
  Type,
  Square,
  Slash,
  ArrowUpRight,
  Image as ImageIcon,
  Table as TableIcon,
  Layers,
} from 'lucide-react';
import { CanvasToolMode } from '../../types/multipanel';

interface CanvasToolbarProps {
  toolMode: CanvasToolMode;
  onSelectToolMode: (mode: CanvasToolMode) => void;
  onUploadImage: (file: File) => void;
  onArrange: (action: 'front' | 'back') => void;
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  toolMode,
  onSelectToolMode,
  onUploadImage,
  onArrange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadImage(e.target.files[0]);
      e.target.value = '';
    }
  };

  return (
    <div className="h-12 bg-white dark:bg-[#121212] border-b border-[#e4e4e7] dark:border-[#27272a] px-2 sm:px-4 flex items-center justify-start gap-1 select-none z-20 shrink-0 shadow-xs transition-colors overflow-x-auto no-scrollbar max-w-full">
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
        className={`flex flex-col items-center justify-center px-2.5 sm:px-3 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0 min-h-[38px] cursor-pointer ${
          toolMode === 'select'
            ? 'text-[#24b47e] bg-[#24b47e]/10 font-semibold'
            : 'text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#f4f4f5] dark:hover:bg-[#1f1f23]'
        }`}
        title="Select & Move (V)"
      >
        <MousePointer2 className="w-4 h-4 mb-0.5" />
        <span>Select</span>
      </button>

      {/* Pan */}
      <button
        onClick={() => onSelectToolMode('pan')}
        className={`flex flex-col items-center justify-center px-2.5 sm:px-3 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0 min-h-[38px] cursor-pointer ${
          toolMode === 'pan'
            ? 'text-[#24b47e] bg-[#24b47e]/10 font-semibold'
            : 'text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#f4f4f5] dark:hover:bg-[#1f1f23]'
        }`}
        title="Pan Canvas (H)"
      >
        <Hand className="w-4 h-4 mb-0.5" />
        <span>Pan</span>
      </button>

      <div className="h-5 w-px bg-[#e4e4e7] dark:bg-[#27272a] mx-1 shrink-0" />

      {/* Text */}
      <button
        onClick={() => onSelectToolMode('text')}
        className={`flex flex-col items-center justify-center px-2.5 sm:px-3 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0 min-h-[38px] cursor-pointer ${
          toolMode === 'text'
            ? 'text-[#24b47e] bg-[#24b47e]/10 font-semibold'
            : 'text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#f4f4f5] dark:hover:bg-[#1f1f23]'
        }`}
        title="Insert Text"
      >
        <Type className="w-4 h-4 mb-0.5" />
        <span>Text</span>
      </button>

      {/* Shape */}
      <button
        onClick={() => onSelectToolMode('shape')}
        className={`flex flex-col items-center justify-center px-2.5 sm:px-3 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0 min-h-[38px] cursor-pointer ${
          toolMode === 'shape'
            ? 'text-[#24b47e] bg-[#24b47e]/10 font-semibold'
            : 'text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#f4f4f5] dark:hover:bg-[#1f1f23]'
        }`}
        title="Insert Shape"
      >
        <Square className="w-4 h-4 mb-0.5" />
        <span>Shape</span>
      </button>

      {/* Line */}
      <button
        onClick={() => onSelectToolMode('line')}
        className={`flex flex-col items-center justify-center px-2.5 sm:px-3 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0 min-h-[38px] cursor-pointer ${
          toolMode === 'line'
            ? 'text-[#24b47e] bg-[#24b47e]/10 font-semibold'
            : 'text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#f4f4f5] dark:hover:bg-[#1f1f23]'
        }`}
        title="Insert Line"
      >
        <Slash className="w-4 h-4 mb-0.5" />
        <span>Line</span>
      </button>

      {/* Arrow */}
      <button
        onClick={() => onSelectToolMode('arrow')}
        className={`flex flex-col items-center justify-center px-2.5 sm:px-3 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0 min-h-[38px] cursor-pointer ${
          toolMode === 'arrow'
            ? 'text-[#24b47e] bg-[#24b47e]/10 font-semibold'
            : 'text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#f4f4f5] dark:hover:bg-[#1f1f23]'
        }`}
        title="Insert Arrow"
      >
        <ArrowUpRight className="w-4 h-4 mb-0.5" />
        <span>Arrow</span>
      </button>

      {/* Image */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="flex flex-col items-center justify-center px-2.5 sm:px-3 py-1 rounded-lg text-[11px] font-medium text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#f4f4f5] dark:hover:bg-[#1f1f23] transition-all shrink-0 min-h-[38px] cursor-pointer"
        title="Upload Image"
      >
        <ImageIcon className="w-4 h-4 mb-0.5" />
        <span>Image</span>
      </button>

      {/* Table */}
      <button
        onClick={() => onSelectToolMode('table')}
        className={`flex flex-col items-center justify-center px-2.5 sm:px-3 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0 min-h-[38px] cursor-pointer ${
          toolMode === 'table'
            ? 'text-[#24b47e] bg-[#24b47e]/10 font-semibold'
            : 'text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#f4f4f5] dark:hover:bg-[#1f1f23]'
        }`}
        title="Insert Table Grid"
      >
        <TableIcon className="w-4 h-4 mb-0.5" />
        <span>Table</span>
      </button>

      {/* Arrange */}
      <div className="relative group shrink-0">
        <button
          onClick={() => onArrange('front')}
          className="flex flex-col items-center justify-center px-2.5 sm:px-3 py-1 rounded-lg text-[11px] font-medium text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#f4f4f5] dark:hover:bg-[#1f1f23] transition-all min-h-[38px] cursor-pointer"
          title="Bring to Front"
        >
          <Layers className="w-4 h-4 mb-0.5" />
          <span>Arrange</span>
        </button>
      </div>
    </div>
  );
};
