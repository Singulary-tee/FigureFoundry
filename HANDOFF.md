# HANDOFF.md — FigureFoundry (WebMCP Hackathon)

> For Gemini / future-Cline pickup. Do NOT work on this in the same VM
> (1GB RAM is choking; previous sessions crashed). Work in a Codespace:
> `gh cs start -c turbo-broccoli-7v4xqw7vg4v2x7w6` (already provisioned, deps installed).

## Branch
`cline/figfoundry-cleanup` (5 commits ahead of `main`).
PR: https://github.com/Singulary-tee/FigureFoundry/pull/new/cline/figfoundry-cleanup

## What is fixed (verified live in browser via Playwright)

| Area | Status | Evidence |
| --- | --- | --- |
| Fake account chrome (Account Identity / Guest User / guest@example.com / "Guest Researcher" / +Invite Member / Team Directory / "Authorized via automatic Guest Session tokens") | REMOVED | `git log` of round-1 commit `15b1210` |
| Dead files: `TopNav.tsx`, `TwoPhaseApprovalBanner.tsx`, `EncodingPanel.tsx` | DELETED | same commit |
| Hardcoded 11-row Palmer Penguins sample | REPLACED with full 344-row Gorman et al. 2014 dataset | `src/packages/data-model/datasets.ts` |
| Double-rendered Panel-D title (Konva header + Vega title) | FIXED (`SingleChartKonva` strips Vega's title) | round-1 commit |
| Stale notes caption generator | REWRITTEN to derive from real panel titles | round-1 commit |
| `WebMcpProvider` rebuilt its server on every state change | STABILIZED via refs | round-1 commit |
| **Stubbed `proposeFigureRevision` / `applyFigureRevision`** (propose used to fake-apply, apply returned hardcoded success) | REPLACED with real two-phase: validate + stage preview → native `requestUserInteraction` gate → atomic commit | commit `eece533` |
| **`globalFigureStore.dispatch` ignored `SWITCH_FIGURE` / `CREATE_FIGURE` / `SELECT_DATASET`** → sidebar clicks did nothing | ROUTED through `globalDomainStore.dispatch` | commit `bd707e9` |
| `ADD_DATASET` stored data in `state.datasets` but never registered it in `profileDataset()` registry → `DataView` empty | `registerRuntimeDataset({ rows: dataset.rows })` added in reducer | commit `bd707e9` |
| `RightSidebar` Data tab hardcoded `'palmer-penguins'` everywhere | Now reads `activeDatasetId = selectedDatasetId \|\| spec.datasetId \|\| 'palmer-penguins'`, all three record handlers dynamic; Inspector Data tab now has a dataset picker (`<select>`) | commit `bd707e9` |
| Toolbar floated off-screen over Panel A; three dead no-op toolbar buttons | Clamped via `Math.max(4, …)`; dead buttons removed | round-1 commit |
| E2E suite: full agent flow (ping, list, inspect, propose, apply with native-gate accept + decline, single-target rejection, unknown-preview rejection) | 5 invariants pass, `tsc --noEmit` clean, `vite build` clean | commit `69b9564` |
