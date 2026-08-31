# FigureFoundry — Comprehensive Production shadcn/ui Migration Blueprint

This document defines the rigorous, end-to-end engineering plan for migrating FigureFoundry's UI component layer to **shadcn/ui** (powered by Radix UI primitives and Tailwind CSS). 

---

## 1. Executive Summary & Non-Negotiable Invariants

Transitioning to shadcn/ui must strictly respect FigureFoundry's core architectural pillars (as defined in `AGENTS.md` and `docs/architecture.md`):
1. **Zero Domain & WebMCP Regression**: The domain state machine (`src/packages/domain/`), WebMCP server & tool contracts (`src/packages/webmcp/`), deterministic scientific validation (`src/packages/validation/`), and rendering engines (`react-konva` and `vega-embed`) remain completely decoupled and untouched by the UI component refactor.
2. **Native Authorization Integrity**: The native browser prompt / two-phase commit contract in `apply_figure_revision` remains untouched.
3. **Token & Theme Harmonization**: All shadcn CSS variables (`--background`, `--foreground`, `--primary`, `--muted`, `--border`, `--radius`, etc.) map directly to FigureFoundry's centralized design tokens in `src/tokens/`.
4. **Mobile Ergonomics**: All interactive elements retain minimum 44px touch targets and responsive behavior across viewports (320px to ultra-wide).

---

## 2. Foundation & Infrastructure Setup

### 2.1 Utility Setup (`src/lib/utils.ts`)
Create the standard `cn` helper for merging Tailwind classes with `tailwind-merge` and `clsx`:
```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 2.2 shadcn Configuration (`components.json`)
Configure project paths for shadcn/ui component generation:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/index.css",
    "baseColor": "zinc",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

### 2.3 Global CSS Variables (`src/index.css`)
Incorporate CSS variables for light and dark themes matching FigureFoundry tokens:
```css
@import "tailwindcss";

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 240 5.9% 10%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 240 5.9% 10%;
    --radius: 0.75rem;
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 240 10% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 240 5.9% 10%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 240 4.9% 83.9%;
  }
}
```

---

## 3. Primitives Inventory (`src/components/ui/`)

The following core Radix UI-backed components will be created in `src/components/ui/`:

1. **`button.tsx`**: CVA-powered button variants (`default`, `secondary`, `outline`, `ghost`, `destructive`, `link`) with size scales (`sm`, `md`, `lg`, `icon`).
2. **`dialog.tsx`**: Radix Dialog primitive for all analytical modals, settings, and import workflows.
3. **`sheet.tsx`**: Radix Dialog-based sliding drawer primitive for `ProvenanceDrawer`, `LeftSidebar`, and `RightSidebar`.
4. **`tabs.tsx`**: Radix Tabs primitive for switching between Design, Data, and Export views, as well as sidebar encoding panels.
5. **`dropdown-menu.tsx`**: Radix Dropdown Menu for context actions, export format selection, and theme options.
6. **`tooltip.tsx`**: Radix Tooltip for canvas button helpers and truncated field descriptions.
7. **`input.tsx` & `textarea.tsx`**: Styled form inputs for dataset filtering and encoding parameter edits.
8. **`select.tsx`**: Radix Select primitive for dropdown selections (dataset switcher, chart mark type, color encoding field).
9. **`badge.tsx`**: Status badges for validation warnings (`blocking`, `warning`) and agent state indicators.
10. **`card.tsx`**: Structural card container for figure panels and metric blocks.
11. **`separator.tsx`**: Radix Separator for clean visual grouping in toolbars and sidebars.
12. **`scroll-area.tsx`**: Radix ScrollArea for dataset tables and audit logs.

---

## 4. Component Refactoring Roadmap

### 4.1 Modals (`src/components/modals/`)
- **`AnalysesModal.tsx`**: Wrap content in shadcn `Dialog`, `DialogHeader`, `DialogTitle`, `DialogDescription`, and `DialogFooter`.
- **`DashboardModal.tsx`**: Replace custom modal container with shadcn `Dialog`.
- **`HelpModal.tsx`**: Utilize shadcn `Dialog` with tabbed section navigation.
- **`ImportModal.tsx`**: Integrate shadcn `Dialog` and `Button` for file loading / CSV parsing.
- **`NotesModal.tsx`**: Use shadcn `Dialog` and `ScrollArea` for research notes.
- **`ProjectsModal.tsx`**: Use shadcn `Dialog` for project loading and template selection.
- **`SaveThemeModal.tsx`**: Use shadcn `Dialog` and `Input` for saving theme presets.
- **`SettingsModal.tsx`**: Use shadcn `Dialog` and `Tabs` for application configuration.

### 4.2 Drawers & Sidebars (`src/components/`, `src/components/layout/`)
- **`ProvenanceDrawer.tsx`**: Refactor slide-out audit trail drawer using shadcn `Sheet`.
- **`LeftSidebar.tsx` & `RightSidebar.tsx`**: Integrate shadcn `Tabs`, `ScrollArea`, and `Separator` for collapsible tool panels.
- **`EncodingPanel.tsx`**: Refactor encoding controls to use shadcn `Select`, `Input`, and `Button`.

### 4.3 Navigation & Top Bar (`src/components/TopNav.tsx`, `src/components/layout/TopBar.tsx`)
- Refactor navigation tabs to use shadcn `Tabs` and `DropdownMenu`.
- Refactor action buttons to use shadcn `Button` with `Tooltip`.

---

## 5. Verification & Quality Assurance Gate

1. **Type Safety**: Execute `npm run lint` (`tsc --noEmit`) to verify zero TypeScript compilation errors.
2. **Production Bundle**: Execute `npm run build` (`vite build`) to confirm successful bundling.
3. **Behavioral Smoke Tests**:
   - Verify WebMCP tools (`inspect_dataset_fields`, `inspect_figure_workspace`, `propose_figure_revision`, `apply_figure_revision`) respond correctly.
   - Confirm React-Konva and Vega-Lite render correctly without layout thrashing.
   - Confirm all modals open and close smoothly via Radix primitives with correct focus trapping.
