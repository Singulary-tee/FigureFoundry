# FigureFoundry Codebase Catalogue

This document serves as a comprehensive index and reference guide for the FigureFoundry codebase, detailing the files, packages, and design components that power this local-first, WebMCP-integrated scientific visualization workbench.

---

## 📂 Directory Structure Overview

```text
/
├── docs/                             # Engineering documentation and guidelines
├── src/
│   ├── components/                   # React UI modules and ergonomic layout views
│   ├── packages/                     # Core domain, specifications, and engines
│   │   ├── data-model/               # Parsers, profilers, and dataset declarations
│   │   ├── domain/                   # Central state machine, commands, and repository
│   │   ├── figure-spec/              # Specification compilers and diff calculations
│   │   ├── stats/                    # Mathematical statistics and calculations
│   │   ├── validation/               # Deterministic statistical/visual validators
│   │   ├── provenance/               # Ledger log management for audit trails
│   │   ├── renderer-vega/            # Vega-Lite renderer view
│   │   └── webmcp/                   # WebMCP runtime, tools, and servers
│   ├── tokens/                       # Design tokens, typography, and theme definitions
│   ├── types/                        # Core TypeScript contracts and schemas
│   ├── App.tsx                       # Root application component
│   ├── main.tsx                      # App bootstrap entry point
│   └── index.css                     # Global styles & Tailwind imports
└── package.json                      # Build & dependency declarations
```

---

## 📄 File-by-File Index

### Root Configuration Files
* **`index.html`**
  * *Purpose:* Main entry point for the browser. Sets up the viewport configuration and mounts the application.
* **`package.json`**
  * *Purpose:* Configures dependencies (including React 18, Vite, Recharts, Lucide React, and Vega), build scripts, and metadata.
* **`tsconfig.json`**
  * *Purpose:* Sets compiler configurations for TypeScript, establishing strict type checks and path resolutions.
* **`vite.config.ts`**
  * *Purpose:* Vite bundler setup, defining plugins and local proxy development configurations.
* **`AGENTS.md`**
  * *Purpose:* Holds developer guidelines, design constraints, and non-negotiable invariants for AI agents working on the codebase.
* **`README.md`**
  * *Purpose:* High-level overview and onboarding instructions for the project workspace.

---

### Engineering & Domain Docs (`/docs/`)
* **`docs/architecture.md`**
  * *Purpose:* Complete design document detailing the unidirectional flow, the optimistic concurrency protocol, and the five architectural invariants.
* **`docs/judge-quickstart.md`**
  * *Purpose:* Outlines functional validation parameters and evaluation steps.
* **`docs/scientific-method.md`**
  * *Purpose:* Explains the visualization principles applied to scientific representations.
* **`docs/tool-contracts.md`**
  * *Purpose:* Outlines parameters and schemas for WebMCP tool communication pipelines.
* **`docs/webmcp-findings.md`**
  * *Purpose:* Reports benchmarks, payload analysis, and findings from running WebMCP-driven editing experiments.

---

### Core Packages (`/src/packages/`)

#### 📊 Data Model (`/src/packages/data-model/`)
* **`datasets.ts`**
  * *Purpose:* Exposes embedded scientific datasets including Gapminder, Palmer Penguins, Seattle Weather, and Iris.
* **`generator.ts`**
  * *Purpose:* Helper utilities to generate simulated datasets for evaluation.
* **`parser.ts`**
  * *Purpose:* Handles parsing of external string inputs (CSV, JSON, TSV) into typed tabular structures.
* **`profiler.ts`**
  * *Purpose:* Inspects fields, infers variable types (quantitative, nominal, temporal, ordinal), measures cardinality, and draws sample values under strict payload budget parameters.

#### ⚙️ Figure Domain State (`/src/packages/domain/`)
* **`state.ts`**
  * *Purpose:* Defines the central state hierarchy including active datasets, compiled specifications, and staging revisions.
* **`commands.ts`**
  * *Purpose:* Encapsulates dispatchable domain actions (e.g., proposing revision, applying revision, discarding preview).
* **`reducer.ts`**
  * *Purpose:* Core pure reducer implementing state changes, Optimistic Concurrency Control (OCC) validations, and status flag transitions.
* **`store.ts`**
  * *Purpose:* Central state store instance, delivering subscribers their states and saving updates to IndexedDB.
* **`repository.ts`**
  * *Purpose:* Implements IndexedDB storage adaptors for zero-server data persistence.

#### 📐 Figure Specification (`/src/packages/figure-spec/`)
* **`compiler.ts`**
  * *Purpose:* Converts abstract logical channel maps (X, Y, Color, Size, Facet) into fully declared, execution-compliant Vega-Lite specs.
* **`diff.ts`**
  * *Purpose:* Analyzes differences between the active figure specification and a staged preview specification to highlight changes in the UI.

#### 🔬 Scientific Validation (`/src/packages/validation/`)
* **`boundary.ts`**
  * *Purpose:* Validates structural limits and coordinate ranges.
* **`validator.ts`**
  * *Purpose:* Runs deterministic checks mapping visualization issues (e.g., displaying individual points in continuous distribution representations, using logarithmic scale on non-positive domains, using discrete channels for highly cardinal nominal variables) to warnings or blockings.

#### 📜 Audit Provenance Ledger (`/src/packages/provenance/`)
* **`ledger.ts`**
  * *Purpose:* Represents the append-only ledger tracking all changes, identifying whether modifications were made by a `human` or `agent`, storing hash signatures, and enabling full time-travel replay.

#### 🎨 Visualization Renderer (`/src/packages/renderer-vega/`)
* **`VegaFigureView.tsx`**
  * *Purpose:* Stateless React wrapper driving rendering and layout observation for Vega-Lite visualization containers.

#### 📈 Statistical Utilities (`/src/packages/stats/`)
* **`index.ts`**
  * *Purpose:* Houses mathematical calculation routines, including mean, standard deviation, quartiles, and distribution metrics.

#### 🔌 WebMCP Integration (`/src/packages/webmcp/`)
* **`types.ts`**
  * *Purpose:* Exposes model-context schema interfaces.
* **`polyfill.ts`**
  * *Purpose:* Implements execution runtime requirements.
* **`transport.ts`**
  * *Purpose:* Manages incoming/outgoing tool execution packages.
* **`tools.ts`**
  * *Purpose:* Defines the catalog of WebMCP agent-callable tools and their required arguments.
* **`server.ts`**
  * *Purpose:* Coordinates tool dispatching, maps incoming parameters, executes operations in the domain context, and returns outputs.
* **`WebMcpProvider.tsx`**
  * *Purpose:* React Context provider hosting runtime state and managing connections.
* **`useModelContext.ts`**
  * *Purpose:* Helper Hook giving downstream modules access to WebMCP channels.
* **`useTool.ts`**
  * *Purpose:* High-level wrapper facilitating local client-side tool execution dispatches.

---

### User Interface Components (`/src/components/`)
* **`TopNav.tsx`**
  * *Purpose:* Main header housing the application name, active dataset selector, and toggles for audit ledger and profiling tools.
* **`DatasetDrawer.tsx`**
  * *Purpose:* A clean, informative panel displaying dataset fields, inferred types, distributions, and cardinalities.
* **`EncodingPanel.tsx`**
  * *Purpose:* Displays the mapping of data fields to visual channels, detailing statistical mappings and mark options.
* **`ProvenanceDrawer.tsx`**
  * *Purpose:* Provides a visual audit log timeline of human and agent actions, facilitating point-in-time exploration and rollbacks.
* **`TwoPhaseApprovalBanner.tsx`**
  * *Purpose:* Workflow-driven floating panel showing the staged revision proposals, validation alerts, and comparison triggers.
* **`WebMcpDevPanel.tsx`**
  * *Purpose:* A development-only inspector for tracing active WebMCP packets, tool actions, and runtime logging streams; it is not part of the production judging surface.

---

### Styling & Tokens (`/src/tokens/` & `/src/`)
* **`src/tokens/colors.ts`**
  * *Purpose:* Zinc-themed monochromatic color schemes for clean, dark visual states.
* **`src/tokens/typography.ts`**
  * *Purpose:* Typographic definitions using crisp modular type scales.
* **`src/tokens/spacing.ts`**
  * *Purpose:* Defines vertical and horizontal rhythm grid measurements.
* **`src/tokens/components.ts`**
  * *Purpose:* Standard component boundaries, shadow styles, and rounded border rules.
* **`src/tokens/index.ts`**
  * *Purpose:* Re-exports spacing, layout, typography, and color tokens under a unified visual system namespace.
* **`src/index.css`**
  * *Purpose:* Integrates Tailwind CSS utilities and configures basic document colors.
