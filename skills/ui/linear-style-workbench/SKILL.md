---
name: linear-style-workbench
description: >
  Guidelines for designing high-density dark mode interfaces, precision SaaS toolbars, sub-pixel borders, and keyboard-first productivity workbenches (Linear, Raycast, Supabase style).
---

# Linear-Style Workbench Design System

This skill outlines guidelines for high-density, keyboard-first, precision developer and data workbenches.

## 1. Color System & Surface Hierarchy

Linear-style surfaces use pure cool-zinc or obsidian neutrals with subtle tonal elevation:

- **Canvas Background (Level 0)**: `#09090b` (`bg-zinc-950`)
- **Container / Sidebar (Level 1)**: `#121215` (`bg-zinc-900/90`)
- **Card / Surface (Level 2)**: `#18181b` (`bg-zinc-900`)
- **Interactive / Active (Level 3)**: `#27272a` (`bg-zinc-800`)
- **Hover Surface**: `hover:bg-zinc-800/60`

### Sub-Pixel Borders & Divider Rules
- Never use heavy solid borders. Use sub-pixel borders: `border border-zinc-800/80` or `border-white/[0.08]`.
- Active focus rings: `ring-1 ring-indigo-500/60 ring-offset-1 ring-offset-zinc-950`.

## 2. Typographic Scale & Density

- **Header Display**: `font-sans font-semibold tracking-tight text-zinc-100 text-sm`
- **Body & Data**: `font-sans text-xs text-zinc-300`
- **Metadata / Stats / Code**: `font-mono text-[11px] text-zinc-400 font-medium`
- **Labels / Badges**: `font-mono uppercase text-[10px] tracking-wider text-zinc-500 font-bold`

## 3. High-Density Layout Rules

1. **4px / 8px Grid Alignment**:
   - Inner padding: `p-2` (8px) to `p-3` (12px)
   - Gap between controls: `gap-1.5` (6px) or `gap-2` (8px)
2. **Mathematical Corner Radius**:
   - Outer container: `rounded-xl` (12px)
   - Inner element: `rounded-lg` (8px)
   - Badges & pills: `rounded-md` (6px)
3. **No Unnecessary White Space**:
   - Controls must be compact and dense while maintaining clear touch/click boundaries.
