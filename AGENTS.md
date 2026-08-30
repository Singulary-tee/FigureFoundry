# FigureFoundry — Agent Guidelines & Invariants

## 1. System Identity & Mission
FigureFoundry is a local-first, browser-hosted scientific figure workbench powered by **WebMCP** (Web Model Context Protocol) and **Vega-Lite**. Its goal is to eliminate misleading scientific figures by giving AI agents a compact, deterministic semantic tool surface while keeping the human researcher in full authorial control.

## 2. Non-Negotiable Invariants

### Invariant A: Human-Agent Command Parity
The Human UI and the WebMCP tool executors are equal consumers of the domain layer (`src/packages/domain`).
- Dispatches must go through canonical domain action creators (`proposeFigureRevision`, `applyFigureRevision`, `rejectFigurePreview`).
- Never introduce agent-only shadow reducers, direct DOM manipulation, or bypass state mechanisms.

### Invariant B: Two-Phase Commit with Human Authorization
- Phase 1 (`propose_figure_revision`): Computes candidate Vega-Lite specification, runs deterministic scientific validation, and generates a transient `previewId`.
- Human Gate: The researcher inspects the proposed figure diff and validation warnings directly in the UI.
- Phase 2 (`apply_figure_revision`): Commits the revision only if `previewId` exists, `basedOnRevision` matches the current state, and human UI approval is confirmed.

### Invariant C: Optimistic Concurrency & Stale State Rejection
- Every mutation must specify `basedOnRevision`.
- If `basedOnRevision !== currentRevision`, the commit fails with status `rejected_stale`.
- Previews are single-use. Once applied or discarded, they are invalidated immediately.

### Invariant D: Deterministic Validation over Model Self-Policing
- Never rely solely on LLM prompts for statistical correctness.
- Hard deterministic rules in `src/packages/validation` check for:
  1. Distribution intent without raw individual data points (blocking).
  2. Non-positive values on logarithmic axes (blocking).
  3. High-cardinality nominal variables mapped to discrete color/shape channels (warning).
  4. Truncated or bar-only representations of uncertain data (warning).

### Invariant E: Complete Provenance & Zero-Backend Reproducibility
- Append-only event ledger records every action: actor (`human` | `agent`), timestamp, command hash, previous revision, resulting revision, and Vega-Lite spec snapshot.
- Full local reproducibility in the browser with zero external server dependencies.

## 3. Agent Experience (AX) Principles
- **Context Budget Protection**: Read tools (such as `inspect_dataset_fields`) must strictly cap returned columns (max 12) and sample values (max 5) to stay within `<1.5 KB` payload budgets (~400 tokens).
- **Structured Error Diagnostics**: Never return vague text strings. Return typed validation issues containing `path`, `severity`, and an actionable `nextAction` message.
- **Strict Typed Schemas**: Use standard JSON Schema Draft 2020-12 / Draft-07 compatible types with enum constraints for channel types and marks.
