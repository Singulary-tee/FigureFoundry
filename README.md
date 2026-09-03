# FigureFoundry

> **Decision-Aware Scientific Figure Workbench with WebMCP Semantic Tool Contracts**

FigureFoundry bridges the gap between AI generation and scientific rigor. Instead of fragile pixel actuation or raw DOM automation, FigureFoundry exposes structured **WebMCP semantic tools** directly into the browser runtime, enforcing deterministic scientific validation, two-phase review, and complete provenance tracking.

---

## Key Features

1. **WebMCP Semantic Tools in the Browser**
   - `inspect_dataset_fields`: High-signal, token-efficient summary of schema types, missingness, cardinality, and bounded sample values.
   - `propose_figure_revision`: Prepares declarative Vega-Lite candidate specs, executes scientific validation rules, and yields non-destructive visual diffs.
   - `apply_figure_revision`: Authorizes state commits with optimistic concurrency control and mandatory human consent verification.

2. **Deterministic Scientific Validation (Midway Guidelines)**
   - Enforces raw observation display (jittered points / beeswarm / boxplots) when distributions are compared.
   - Rejects illegal transformations (e.g., zero/negative values on log scales).
   - Flags perceptual hazards (color overload with $>12$ categories, deceptive bar charts).

3. **Two-Phase Human-in-the-Loop Commit**
   - Agent proposals are staged as transient `previewId` overlays with visible validation evidence before canonical state changes.
   - The external browser agent requests native user interaction before the targeted panel is committed; the researcher keeps the final editorial veto.

4. **Audit-Grade Provenance Ledger**
   - Full history graph tracking every modification, actor tag (`agent` vs. `human`), timestamp, target panel, preview/base revision, validation report, command payload, and exact panel snapshots with one-click time-travel replay.

5. **External-Agent-First Integration**
   - Production uses the browser-native `modelContext` surface, so Chrome or the ChatGPT desktop browser agent discovers and invokes FigureFoundry tools in the live page.
   - A WebMCP inspector remains available only in local development builds for contract testing; it is not exposed as a production agent simulator.

## Try It

Open the public live URL in a WebMCP-capable Chrome build (with the experiment enabled when required) or the ChatGPT desktop app's built-in browser.

Ask the agent: **"Look at the comparison panel's dataset, then propose a figure that compares [field A] and [field B] grouped by [category field], showing individual data points rather than just an average."**

Expected tools, in order:
1. `inspect_figure_workspace` — agent learns every panel, panel kind, and the current workspace state.
2. `inspect_dataset_fields` — agent learns the real column names/types (do not hardcode field names into the prompt above; the agent must discover them).
3. `propose_figure_revision` — agent submits a candidate spec; a validation report and `previewId` come back.
4. `apply_figure_revision` — agent calls this with the `previewId`; the WebMCP execution context requests native user interaction before commit.

Expected visible result: before confirmation, the editor shows a proposal-review strip with the target, preview ID, and validation state while the canonical figure remains unchanged. After confirmation, the targeted panel re-renders in place, no unrelated panel changes, the revision advances, and the History drawer contains the exact audit event. No custom in-app agent console is needed.

Expected confirmation point: `agent.requestUserInteraction()` inside `apply_figure_revision`'s native WebMCP execution — not a fake page-level agent prompt. If that execution context is unavailable, the apply tool fails closed.

Fallback behavior: if WebMCP is unavailable, every control used above is also reachable manually via the Design tab on the same panel — the app is fully functional without an agent.

Reset: Refresh the page; WebMCP session state is in-memory only.

---

## Documentation Directory

- [`docs/architecture.md`](docs/architecture.md) — System architecture, 5 invariants, and state flow.
- [`docs/tool-contracts.md`](docs/tool-contracts.md) — Full WebMCP JSON schemas, payload budgets, and AX patterns.
- [`docs/scientific-method.md`](docs/scientific-method.md) — Scientific visualization principles and validation rule catalog.
- [`docs/judge-quickstart.md`](docs/judge-quickstart.md) — 2-minute evaluation walkthrough for reviewers.

---

## Tech Stack
- **Core**: React 19, TypeScript 5.8, Tailwind CSS v4, Motion
- **Visualization**: Vega 6, Vega-Lite 6, Vega-Embed
- **Tool Protocol**: WebMCP in-browser semantic contract architecture
