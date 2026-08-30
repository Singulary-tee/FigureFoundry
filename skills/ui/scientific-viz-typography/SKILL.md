---
name: scientific-viz-typography
description: >
  Journal-grade scientific figure presentation, publication aesthetics, statistical metadata cards, and accessible color palettes (Nature, Science, Observable Plot).
---

# Scientific Visualization & Publication Typography

Guidelines for academic, laboratory, and scientific figure workbench interfaces.

## 1. Visual Hierarchy & Typographic Separation

- **Figure Chrome vs. UI Chrome**:
  - The figure visualization canvas must be distinct from workbench controls (clear framing with `border border-zinc-800 bg-zinc-950/80 rounded-xl p-4`).
- **Figure Title**: `font-sans font-bold text-sm tracking-tight text-zinc-100`
- **Axis & Legend Titles**: `font-sans text-xs font-semibold text-zinc-300`
- **Statistical Summaries & Units**: `font-mono text-[11px] text-zinc-400`

## 2. Color-Safe Categorical Palettes

For scientific accuracy and color-blind accessibility:
- **Primary Discrete**: `#6366f1` (Indigo), `#06b6d4` (Cyan), `#10b981` (Emerald), `#f59e0b` (Amber), `#ec4899` (Pink)
- **Warning / Non-blocking**: `#f59e0b` (Amber-500)
- **Blocking Violation**: `#ef4444` (Rose-500)
- **Verification Status**: `#10b981` (Emerald-500)

## 3. Data Tables & Sample Inspection

- Tables displaying raw scientific observations must use tabular figures (`font-mono font-variant-numeric: tabular-nums`).
- Cell padding: compact `px-3 py-1.5` with zebra hover states `hover:bg-zinc-800/40`.
