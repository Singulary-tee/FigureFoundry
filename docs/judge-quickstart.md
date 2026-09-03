# FigureFoundry Judge Quickstart

This is the intended two-minute evaluation path for the public FigureFoundry submission. FigureFoundry exposes browser-native WebMCP tools to an external browser agent; it does **not** embed a pretend agent in the production UI.

## 1. Open the live app

Open the submitted Cloudflare URL in a WebMCP-capable Chrome build (enable the WebMCP experiment if your build requires it) or in the ChatGPT desktop browser agent. The agent and the page share the same live tab and session.

Ask the external agent:

> Inspect the current figure and dataset. Propose a scientifically valid revision for the most relevant panel, preserving individual observations when comparing distributions. Show me the proposal before applying it.

The agent should discover and call:

1. `inspect_figure_workspace` — identifies every panel, panel kind, dataset, revision, and the panels available to transform.
2. `inspect_dataset_fields` — returns real field names, types, missingness, cardinality, and bounded examples.
3. `propose_figure_revision` — stages a non-destructive candidate for a selected panel and returns a `previewId` plus validation evidence.
4. `apply_figure_revision` — requests browser-native user interaction before committing the staged change.

All existing panel kinds remain addressable. A proposal may replace a chart or structured scientific panel, and the resulting figure remains a normal human-editable multipanel workspace.

## 2. Verify the visible proof

After the proposal, the editor shows a **WebMCP proposal staged for review** strip above the canvas. It names the target panel and preview, reports blocking issues and warnings, and states that native confirmation is required. The canonical figure remains unchanged until approval.

When the external agent invokes `apply_figure_revision`, review the browser's native confirmation interaction. Accepting commits only the requested panel, advances the revision, and records the validation report, preview ID, base revision, target panel, and command payload in the audit ledger. Declining or running without native interaction fails closed.

Use the **History** button in the editor header to inspect the immutable revision entry and expand its exact panel specification. Restore a prior revision from that drawer to demonstrate time-travel provenance.

## 3. Useful judge checks

- Ask the agent to target a different panel kind and verify that the workspace changes in place without touching unrelated panels.
- Ask for a distribution comparison without raw observations; the deterministic validator should return a blocking issue rather than commit it.
- Invoke an old `previewId` or stale `basedOnRevision`; the tool should return `rejected_unknown_preview` or `rejected_stale`.
- Refresh the page to reset the in-memory WebMCP preview state. The optional WebMCP inspector in a local development build is test-only and is not part of the production judging path.

For architecture and the complete schemas, see [`architecture.md`](architecture.md) and [`tool-contracts.md`](tool-contracts.md).

## Submission checklist

- Public repository with the tracked MIT [`LICENSE`](../LICENSE).
- Public live URL.
- Short demo or screen recording showing the external browser agent discovering tools, staging a proposal, native approval, and provenance history.
- No secret or API key is required for the browser-native workflow.
