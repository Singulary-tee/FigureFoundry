# FigureFoundry Architecture

## 1. System Overview

FigureFoundry is constructed around a clean unidirectional data architecture that decouples semantic tool transport (WebMCP), user interface controls (React), domain state machines, deterministic validation, and the chart renderer (Vega-Lite).

```
┌──────────────────────────────────────┐     ┌──────────────────────────────────────┐
│          Human UI (React)            │     │       WebMCP Tool Controller         │
└──────────────────┬───────────────────┘     └──────────────────┬───────────────────┘
                   │                                            │
                   │ Dispatches Canonical Commands              │ Dispatches Canonical Commands
                   ▼                                            ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           src/packages/domain (Core Engine)                       │
│  - State Store: datasetId, currentRevision, spec, activePreview, provenanceLedger │
│  - Reducers: proposeRevision, applyRevision, rejectPreview, loadDataset           │
└──────────────────┬────────────────────────────────────────────┬───────────────────┘
                   │ Validates Spec                             │ Appends Record
                   ▼                                            ▼
┌──────────────────────────────────────┐     ┌──────────────────────────────────────┐
│       src/packages/validation        │     │       src/packages/provenance        │
│  - Deterministic Scientific Guardrails│    │  - Immutable Audit Ledger            │
│  - Schema & Scale Boundary Checks    │     │  - Time-Travel Snapshot Replay       │
└──────────────────┬───────────────────┘     └──────────────────────────────────────┘
                   │ Produces Compiled Spec
                   ▼
┌──────────────────────────────────────┐
│     src/packages/renderer-vega       │
│  - Pure Declarative Spec Consumer    │
│  - High-DPI Canvas / SVG Exporter    │
└──────────────────────────────────────┘
```

---

## 2. The Five Invariants

### Invariant A: Human-Agent Command Parity
Both the human UI and the WebMCP tool execution harness are symmetrical clients of the domain layer. When an agent calls `apply_figure_revision(previewId)`, it executes the identical reducer branch that fires when a human clicks the "Approve Revision" button. There are no privileged agent backdoors or hidden state channels.

### Invariant B: Two-Phase Commit with Human Authorization
State transitions are strictly split into two phases:
1. **Proposal Phase (`propose_figure_revision`)**:
   - Compiles declarative figure grammar.
   - Evaluates all validation rules.
   - Assigns a cryptographic `previewId`.
   - Mounts the preview spec in the UI staging overlay without mutating canonical `FigureSpec`.
2. **Commit Phase (`apply_figure_revision`)**:
   - Verifies that UI human approval flag has been set for that exact `previewId`.
   - Commits the spec to the canonical store, advancing `currentRevision`.

### Invariant C: Optimistic Concurrency Control (OCC)
- Every proposal binds to a snapshot revision (`basedOnRevision`).
- If another actor (human or agent) modifies the figure before the preview is committed, `currentRevision` will have advanced.
- Attempting to apply a preview with an outdated `basedOnRevision` immediately fails with `status: "rejected_stale"`.

### Invariant D: Deterministic Validation
Scientific figure integrity cannot be delegated to unstructured LLM self-policing. The validation layer operates as a pure deterministic function:
$$\text{ValidationResult} = f(\text{FigureSpec}, \text{DatasetMetadata})$$
Issues are classified into `blocking` (prohibits commit) and `warning` (advisory alerts for scientific publication rigor).

### Invariant E: Complete Provenance & Zero-Backend Architecture
Every accepted figure revision writes an immutable audit record to the `ProvenanceLedger`:
- `eventId`: UUID
- `revision`: Integer index
- `actor`: `human` or `agent`
- `timestamp`: ISO-8601 string
- `intent`: Analytical purpose
- `commandPayload`: JSON payload of the revision request
- `specSnapshot`: Full Vega-Lite spec snapshot
- `validationReport`: Issues resolved or accepted

---

## 3. Package Structure

- `src/types/`: Shared TypeScript type definitions for datasets, figure specs, WebMCP schemas, validation issues, and provenance records.
- `src/packages/data-model/`: Real-world scientific datasets (Palmer Penguins, Gapminder, Seattle Weather, Iris), statistical profiling, type inference, and sample generation.
- `src/packages/figure-spec/`: Pure figure specification builder, mark definitions, Vega-Lite compiler, and visual diff computation.
- `src/packages/validation/`: Rule engine enforcing scientific visualization best practices (Midway guidelines).
- `src/packages/provenance/`: Audit ledger, time-travel history replay, and snapshot serialization.
- `src/packages/domain/`: Canonical store and command dispatcher implementing the two-phase commit protocol.
- `src/packages/renderer-vega/`: Stateless Vega-Lite rendering component with responsive resizing, dark/light theme styling, and SVG export.
- `src/packages/webmcp/`: In-browser WebMCP tool registry, schema definitions, parameter sanitization, and execution telemetry.
- `src/tokens/`: Centralized design system tokens (colors, typography, spacing, component variants) inspired by shadcn/ui and modern Next.js dark layouts.

---

## 4. Mobile-First Scientific UX & Design System Tokens

The user interface MUST be fully usable, legible, and touch-optimized on mobile devices (320px+) as well as desktop ultra-wides:
1. **Adaptive Workspace Layout**: On mobile viewports (<1024px), panels (Encodings, Dataset Info, Provenance) transition from rigid multi-column layouts into responsive tabbed views and slide-out sheets with minimum 44px touch targets.
2. **Centralized Token Architecture**: All UI visual styling, color palettes (Zinc/Next.js/shadcn dark tokens), typography scales, spacing, and component variants must originate from `src/tokens/` without ad-hoc conflicting style declarations.
3. **Responsive Visualization Engine**: Vega-Lite canvas automatically recalculates viewBox dimensions using `ResizeObserver` and stacks side-by-side diffs vertically on narrow viewports.

