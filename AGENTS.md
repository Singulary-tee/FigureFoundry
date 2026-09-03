# FigureFoundry engineering notes

FigureFoundry is a React/TypeScript scientific figure workbench. Keep changes grounded in the domain model and existing panel-local dataset binding abstractions.

## Scientific and product invariants

- Preserve raw distributions, explicit uncertainty, field/type validation, transformations, panel geometry, ordering, layer separation, provenance, and dataset-linked analysis history.
- Never infer or fabricate effect estimates, intervals, standard errors, p-values, significance, pooled results, or group values from missing or incompatible data.
- Invalid, unavailable, or out-of-scope sources must block apply and export and show a concise slot-specific message.
- Dataset selection is global for workspace context but a panel’s explicit dataset binding is authoritative for that panel. Changing a binding must rematerialize compatible mappings and remove stale values or validation state.
- Analysis controls must distinguish the analysis method from a visualization such as a forest plot.
- Agent proposals require explicit human approval before canonical state changes. Keep provenance entries and revision links intact.

## Verification

Use the repository checks that match the change: `npm run lint`, `npm run test:data-analysis`, `npm run build`, and `git diff --check`. For UI work, use the managed Preview and harness browser tools for fresh screenshots or recordings; do not use Playwright for verification. Inspect visual evidence before sharing it and remove temporary captures from the repository.

## Documentation claims

Describe behavior precisely: deterministic validation, explicit approval, fail-closed apply/export, multi-panel fidelity, persisted provenance, revision-linked analysis history, and session-visible Preview state. Do not claim absolute foolproofness, replacement of scientific judgment, or native WebMCP when describing local harness checks.

## Preferred prompts

- Compare these two groups and show the effect size with uncertainty.
- Turn these three related plots into a coherent multi-panel figure.
- Highlight statistically significant results without destroying the underlying distribution.
- Make this publication-ready while preserving the data representation.
