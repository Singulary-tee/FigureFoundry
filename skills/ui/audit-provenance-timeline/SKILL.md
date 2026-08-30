---
name: audit-provenance-timeline
description: >
  Visual audit trails, append-only event ledgers, git-style version diffing, and state replay for scientific workflows.
---

# Audit & Provenance Timeline UI Design

Guidelines for implementing transparent, reproducible audit ledgers and spec diff viewers.

## 1. Event Ledger Timeline UI

- **Chronological Nodes**:
  - Vertical connecting hairline (`border-l border-zinc-800`).
  - Actor badge: `Human` (User icon, emerald pill) vs. `Agent` (Bot icon, indigo pill).
  - Revision badge: `Rev {number}` in bold monospace.
  - Formatted timestamp in local time.
- **Replay / Time-Travel Action**:
  - Direct "Replay Revision" button restoring previous state snapshots with clear user confirmation.

## 2. Specification Diff Visualizer

- **Additions**: Green tint `bg-emerald-500/10 text-emerald-400 border border-emerald-500/20`
- **Deletions / Overwrites**: Amber/Red tint `bg-rose-500/10 text-rose-400 border border-rose-500/20`
- **Collapsible Snapshot JSON**: Expandable formatted JSON block with instant one-click copy button.
