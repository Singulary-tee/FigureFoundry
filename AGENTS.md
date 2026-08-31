# AGENTS.md — FigureFoundry

This file is read by both the coding agent (Gemini/AI Studio) and, at
runtime, informs how the WebMCP-calling agent should reason about this app.
If anything here conflicts with a comment inside a specific source file,
this file wins — it is the canonical, most-recently-corrected source.

## What this app is

A multi-panel scientific figure canvas. A human composes and manually edits
a layout of panels (forest plot, funnel plot, grouped bar, text caption, and
one data-comparison chart). Exactly ONE panel — the one flagged
`isAgentEditable: true` — can be modified by an AI agent through four WebMCP
tools. Every other panel, and every piece of chrome around the canvas
(Layers, Design/Data/Export tabs, Theme system, Select/Pan/Shape/Text/Line/
Arrow/Image/Table/Arrange tools), is human-manual only. No tool touches them.

## Five non-negotiable invariants

1. **No hardcoded data, anywhere.** Every panel's underlying data (study
   rows, funnel points, bar series, chart dataset) is a real, editable table
   the human can modify in the Data tab — seeded with demo values, never
   baked in as an immutable constant. This applies even to panels the agent
   cannot touch.
2. **No IndexedDB, no backend, no required API key.** The WebMCP-relevant
   state (`FigureProject`: revision, provenance, currentSpec) lives in
   memory only, for the session, per `domain-types.ts`. Reproducibility is
   satisfied by explicit export/import of a JSON bundle, not persistence.
   The manual-UI layer (panel positions, layers, theme) uses `localStorage`
   only — a different, separate persistence story, never merged with the
   WebMCP state.
3. **Confirmation is native, not page-authored.** `apply_figure_revision`'s
   gate is the browser's `requestUserInteraction()`, called inside its
   `execute()` function. Do not build a custom approval modal, an
   "ApprovalGate" state store, or any UI element whose sole job is to
   confirm this one tool call. If you find one in the existing codebase
   (e.g., a component resembling `TwoPhaseApprovalBanner.tsx`), it is a
   known defect — remove the custom gate logic and replace it with the
   native call; the component may keep rendering the *result* of a
   confirmed/declined action, it just cannot BE the confirmation.
4. **Exactly one tool surface, four tools, one target.** `inspect_dataset_fields`,
   `inspect_figure_workspace`, `propose_figure_revision`, `apply_figure_revision`.
   The latter two require `targetPanelId`, which must match the current
   `isAgentEditable` panel — reject anything else. Do not add a fifth tool,
   do not widen any tool's scope, do not let any tool touch a second panel.
5. **No decorative agent-chrome.** No "Agent is thinking..." banners, no
   "🤖 Connected" badges, no activity-log sidebar duplicating what the
   WebMCP host already shows. The one exception: the Design tab, when the
   agent-editable panel is selected, may show a plain-text state label
   (e.g., "Awaiting agent proposal") because it explains why that panel's
   manual controls are temporarily read-only — that's functional
   disclosure, not decoration. No other panel gets an equivalent badge.

## Stack

Vite + React + TypeScript, react-konva for the canvas, vega/vega-lite/vega-embed
for the single-chart panel only, Tailwind for chrome, `localStorage` for the
manual-UI layer. No Redux. No Recharts — if present, it is leftover cruft
from an earlier build pass and should be removed along with its dependency
entry.

## Where to look before assuming something is missing

`domain-types.ts` (original single-chart model, still authoritative),
`domain-types-v2-multipanel.ts` (Figure/Panel/Layer/Theme composition, states
the WebMCP scope boundary explicitly in its header), the four
`tool-schemas/*.schema.json` files (use `apply_figure_revision.v2`, the
original is superseded), `GEMINI_BUILD_PROMPT_FULL.md` and its
`GEMINI_BUILD_PROMPT_ADDENDUM.md`.

## Build report discipline

Any change to this codebase — by a human or an agent — should be reportable
as `CHANGED / DELETED / UNCHANGED BUT SUSPECT / NO-OP` against a named
defect or feature, not as free-form prose claiming something is "done."
