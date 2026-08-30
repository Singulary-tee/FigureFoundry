# Judge & Evaluator Quickstart (2-Minute Runbook)

Welcome to **FigureFoundry**. This guide walks you through the core workflow demonstrating WebMCP tool execution, deterministic scientific validation, and two-phase human review.

---

## 1. The 3-Step Interactive Walkthrough

### Step 1: Inspect Dataset via WebMCP
1. In the **WebMCP Inspector Panel** (bottom/right dock), click the **`inspect_dataset_fields`** trigger or click **Run Step 1**.
2. Notice the response: a compact JSON summary ($<1.5\text{ KB}$) showing field types, missing values, and cardinality for Palmer Penguins.

### Step 2: Propose Figure Revision
1. In the WebMCP Console, select the preset prompt: *"Compare bill length across species with raw distribution points"*.
2. Click **Execute `propose_figure_revision`**.
3. Notice that the visible canonical figure **does not change immediately**. Instead, a **Staging Preview Overlay** appears in yellow/purple diff mode with an assigned `previewId` (e.g. `prev_...`).
4. Look at the **Scientific Validation Badge**: it shows that all blocking rules passed, verifying `showsRawObservations: true`.

### Step 3: Human Review & Two-Phase Commit
1. Examine the visual diff in the central canvas.
2. In the top **Two-Phase Approval Banner**, click **Approve Revision**.
3. Click **Execute `apply_figure_revision`** in the WebMCP Console (or watch it automatically apply).
4. The canvas updates to the canonical figure, the revision counter increments from `Rev 0` to `Rev 1`, and a new immutable entry appears in the **Provenance Ledger**.

---

## 2. Testing Edge Cases & Invariants

- **Test Rule Violation**: Propose a distribution chart with `showsRawObservations: false`. Observe the **Blocking Scientific Issue** (`RULE-DIST-RAW`) preventing commitment.
- **Test Optimistic Concurrency**: Attempt to apply a stale `previewId` after modifying the figure manually. Observe the `status: "rejected_stale"` response.
- **Test Time-Travel**: Open the **Provenance Ledger** drawer and click any prior revision to instantly restore the figure snapshot.
