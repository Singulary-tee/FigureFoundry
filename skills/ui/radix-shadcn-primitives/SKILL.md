---
name: radix-shadcn-primitives
description: >
  Accessible headless UI primitives, composable component patterns, and tokenized design systems inspired by Radix UI and shadcn/ui.
---

# Radix UI & shadcn/ui Component Primitives

Guidelines for building accessible, composable headless UI components with Tailwind CSS.

## 1. Core Component Primitives

### Buttons & Trigger Variants
```tsx
// Primary Brand Action
<button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-indigo-400">
  Action
</button>

// Secondary Ghost
<button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 transition-all">
  Secondary
</button>
```

### Modals, Drawers & Sheets
- **Backdrop**: `fixed inset-0 z-50 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150`
- **Drawer Panel**: `w-full max-w-xl h-full bg-zinc-900 border-l border-zinc-800 shadow-2xl p-6`
- **Modal Dialog**: `w-full max-w-2xl max-h-[85vh] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden`

## 2. Accessibility & Interaction Invariants

- **Focus Visibility**: Always include `focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500`.
- **Labels on Single Line**: Pill labels and badges must never wrap (`whitespace-nowrap`).
- **Keyboard Navigation**: Modals and drawers must close on `Escape` and trap focus properly.
