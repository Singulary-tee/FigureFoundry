# FigureFoundry

FigureFoundry is a scientific figure publishing canvas for turning dataset-linked analyses into clear, publication-ready figures. It supports multi-panel composition, panel-local data bindings, uncertainty-aware visualizations, reversible editing, and persisted provenance.

## Supported figure components

- Forest plots and subgroup analyses for study estimates with explicit confidence intervals.
- Funnel plots for study effects and standard errors.
- Grouped bar charts, single charts, volcano plots, and heatmaps.
- Text captions, legends, annotations, and multi-panel layout with ordered layers.

## Core workflow

1. Open the example project or create a project and figure from the dashboard.
2. Import a CSV, TSV, or JSON dataset, or use a configured dataset.
3. Select a panel and choose its panel-local dataset in **Data**. The panel binding is authoritative even when the workspace selection changes.
4. Use **Design** to map fields, choose an analysis-aware visualization, and tune axes, labels, and layout.
5. Use **Analyses** for effect synthesis, heterogeneity, publication-bias diagnostics, and correlations. A forest plot is a visualization of study effects, not an analysis method.
6. Review validation, provenance, and the figure preview before applying a proposed revision or exporting.

## Scientific safeguards

FigureFoundry preserves raw observations, explicit uncertainty, field and type validation, transformations, panel geometry, layer ordering, dataset bindings, and analysis history. It fails closed when a source is missing, incompatible, invalid, or outside the active project/workspace scope. Agent proposals are staged for review and require explicit human approval before canonical figure state changes. Provenance snapshots and revision links remain available for reproducible review.

These safeguards support scientific publishing; they do not replace scientific judgment.

## Agent integration

The app exposes structured browser-facing semantic tools for inspecting datasets, proposing declarative revisions, validating candidates, and applying approved revisions. The local development inspector and harness are verification surfaces, not a claim of native WebMCP support. The editor controls remain available when the semantic surface is unavailable.

## Development

Requirements: Node.js with npm.

```bash
npm install
npm run dev
```

The managed Preview runs the Vite development server and exposes the current session separately from persisted project data. Refreshing the app restores saved workspaces, projects, figures, datasets, notes, provenance, and analysis history from local storage; pending proposals remain session-scoped.

Run the repository checks before publishing changes:

```bash
npm run lint
npm run test:data-analysis
npm run build
git diff --check
```

For UI verification, use the managed Preview and harness browser. Capture fresh screenshots or focused recordings for material interface changes, inspect them for non-public data, and do not use Playwright.

## License

See [LICENSE](LICENSE).
