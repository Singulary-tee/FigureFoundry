# WebMCP Architectural Gap Analysis & Actionable Findings

## 1. Executive Summary
This document consolidates comparative findings and actionable insights for **FigureFoundry** based on two industry reference implementations:
1. **Official WebMCP Browser Standard** ([learn.chatgpt.com/docs/webmcp](https://learn.chatgpt.com/docs/webmcp)) — The browser-native Model Context Protocol incubated under the W3C Web Machine Learning Community Group and supported in modern agent-enabled browser runtimes (Chrome 146+, ChatGPT Work Browser).
2. **Cloudflare Agents React WebMCP Model** ([github.com/cloudflare/agents/tree/main/examples/webmcp-react](https://github.com/cloudflare/agents/tree/main/examples/webmcp-react)) — The idiomatic React provider and hook-based integration pattern for WebMCP (`<WebMcpProvider>`, `useTool`, `useModelContext`).

---

## 2. Product Landscape & Competitive Positioning

| Product | How close to FigureFoundry | Main lesson |
| :--- | :--- | :--- |
| **BioRender Graphing** | Closest overall product workflow | The category already exists commercially; we cannot claim to invent “raw data to publication-ready graph” |
| **SimpleViz** | Closest narrow scientific web-tool workflow | A focused scientific domain can beat a generic chart builder |
| **GraphPad Prism / Prism Cloud** | Closest established scientific incumbent | Statistical guidance, assumptions, and publication trust matter more than visual polish alone |
| **Observable** | Closest exploratory authoring environment | Useful reference for interaction, but not specifically scientific analysis or publication workflow |
| **Vega-Lite** | Closest underlying representation | A renderer/grammar, not the user-facing product category |

---

## 3. Comparative Gap Matrix

| Architectural Layer | Current FigureFoundry (`src/packages/webmcp/`) | W3C WebMCP Standard (`learn.chatgpt.com`) | Cloudflare `webmcp-react` | Priority |
| :--- | :--- | :--- | :--- | :--- |
| **Runtime Registration Surface** | Isolated TS class (`WebMcpServer`) called only by internal UI dev inspector. | Native `navigator.modelContext.registerTool()` & `document.modelContext.registerTool()`. | Polyfilled / synchronized global context provider. | **P0 (Critical)** |
| **Agent Discovery Transport** | Closed in-memory instance; external agents cannot discover or invoke tools. | Browser-mediated tool discovery & invocation by AI agent runtime. | Standardized `window.postMessage` / JSON-RPC 2.0 bridge for parent/iframe embedding. | **P0 (Critical)** |
| **React Integration Idiom** | Monolithic server instance instantiated via `useMemo` in root `App.tsx`. | Imperative JS API + Declarative HTML forms. | Modular `<WebMcpProvider>` with decentralized `useTool()` hooks bound to component lifecycles. | **P1 (High)** |
| **Context Lifecycle Management** | Static tool definitions fixed at initialization. | `provideContext()`, `clearContext()`, and `unregisterTool()` as page state changes. | Automatic tool registration on component mount and unregistration on unmount. | **P1 (High)** |
| **Execution State & Telemetry** | Local dev inspector log history only. | Standardized Tool Result format (`{ content: [{ type: 'text', text: ... }] }`). | Reactive state hooks (`isExecuting`, `lastInvoked`, `error`) driving live UI agent indicators. | **P1 (High)** |
| **Declarative Tool Fallbacks** | None (pure programmatic dispatch). | Semantic HTML form annotations (`<form toolname="..." tooldescription="...">`). | Optional declarative form sync. | **P2 (Medium)** |

---

## 3. Detailed Findings & Root Deficiencies

### Finding 1: Lack of Standard Browser-Native Registration
* **Current State:** `WebMcpServer` is an isolated domain wrapper. External browser-level AI agents (e.g., ChatGPT Agent mode, Chrome Built-in AI) check `navigator.modelContext` or `document.modelContext` and see zero registered tools.
* **Impact:** The application is invisible to real browser-native agents unless simulated inside the dev panel.
* **Target Solution:** Implement a dual-mode registration layer that hooks into `navigator.modelContext.registerTool` and `document.modelContext.registerTool` when present, falling back to a standards-compliant polyfill.

### Finding 2: Monolithic Server vs. Declarative `useTool` Hook Architecture
* **Current State:** All 4 tools (`inspect_dataset_fields`, `inspect_figure_state`, `propose_figure_revision`, `apply_figure_revision`) are hardcoded into a 328-line switch statement in `server.ts`.
* **Impact:** Tight coupling between the WebMCP wrapper and specific UI actions; inability for newly added components (e.g., export dialogs, dataset filters) to self-register localized tools.
* **Target Solution:** Adopt the `webmcp-react` pattern:
  - Create `<WebMcpProvider>` at the application root.
  - Implement a `useTool({ name, description, parameters, execute })` hook that registers on mount and cleans up on unmount.

### Finding 3: Missing Inter-Frame Transport Bridge (JSON-RPC 2.0 / postMessage)
* **Current State:** No message port or `postMessage` listener.
* **Impact:** When FigureFoundry runs inside an iframe (such as an evaluation container, AI Studio preview, or multi-agent harness), parent agents cannot send `tools/list` or `tools/call` JSON-RPC messages.
* **Target Solution:** Mount a bi-directional `window.postMessage` listener adhering to the standard MCP/WebMCP JSON-RPC 2.0 message envelope:
  - Request: `{ jsonrpc: "2.0", id: string|number, method: "tools/list" | "tools/call", params: ... }`
  - Response: `{ jsonrpc: "2.0", id, result: ... }` or `{ jsonrpc: "2.0", id, error: ... }`

### Finding 4: Static Tool Schemas vs. Dataset-Aware Context Refinement
* **Current State:** Input schemas use static string types for field names.
* **Impact:** The agent can pass invalid field names that do not exist in the active dataset, failing only downstream during execution.
* **Target Solution:** When the active dataset changes, update tool schemas dynamically using `provideContext()` so field parameter enums match the active dataset's actual schema (`["bill_length_mm", "flipper_length_mm", ...]`).

### Finding 5: Lack of Reactive In-UI Agent Execution State
* **Current State:** When a tool executes, the UI has no visual indication that an AI agent is actively proposing or applying changes.
* **Impact:** Degraded human-agent collaboration and lack of visual feedback during long-running statistical analysis or candidate generation.
* **Target Solution:** Expose reactive execution telemetry (`isExecuting`, `activeToolName`, `invokingActor`) to render live agent presence badges and subtle encoding highlight rings on affected visual channels.

---

## 4. Actionable Implementation Plan

### Phase 1: Core WebMCP Protocol & Polyfill Layer
- [x] Create `src/packages/webmcp/polyfill.ts` establishing `navigator.modelContext` / `document.modelContext` conformance if not natively provided by the browser.
- [x] Create `src/packages/webmcp/transport.ts` implementing a bi-directional JSON-RPC 2.0 `postMessage` bridge for cross-window / iframe host agents.

### Phase 2: React-Native WebMCP Provider & Hooks
- [x] Create `src/packages/webmcp/WebMcpProvider.tsx` exposing `WebMcpContext` with dynamic registry and state publisher.
- [x] Implement `src/packages/webmcp/useTool.ts` allowing any component to declaratively expose callable actions with auto-cleanup on unmount.
- [x] Implement `src/packages/webmcp/useModelContext.ts` for consuming active tools, execution logs, and live agent status.

### Phase 3: Domain & Two-Phase Invariant Alignment
- [x] Connect `useTool` definitions directly to domain reducers (`proposeFigureRevision`, `applyFigureRevision`, `rejectFigurePreview`), preserving all Non-Negotiable Invariants:
  - Invariant A: Human-Agent Command Parity
  - Invariant B: Two-Phase Commit with Human Authorization
  - Invariant C: Optimistic Concurrency & Stale State Rejection (`basedOnRevision`)
  - Invariant D: Deterministic Validation
  - Invariant E: Complete Provenance Ledger
- [x] Implement dynamic schema refinement on dataset switch (`provideContext`).

### Phase 4: UI Telemetry & WebMCP Inspector Modernization
- [x] Upgrade `WebMcpInspectorPanel.tsx` to inspect live browser `modelContext` registrations, active JSON-RPC channels, and execution logs.
- [x] Add reactive Agent Activity indicators (pulse banner and status badges) when tools are invoked.

---

## 5. Recommended FigureFoundry Architectural Stack & Boundary Matrix

| Responsibility | Recommended Technology | Important Boundary |
| :--- | :--- | :--- |
| **Application** | React + TypeScript + Vite | Components display state and dispatch intent; they do not own figure logic |
| **Canonical state** | Redux Toolkit or a strict custom reducer/store | One store instance owns the active project, dataset reference, draft, revision, and validation state |
| **Domain operations** | Typed command functions | Both UI and WebMCP call these; no duplicated tool-specific logic |
| **Input validation** | Zod internally; JSON Schema for WebMCP contracts | Validate at the boundary before commands execute |
| **Figure representation** | Vega-Lite JSON specification | Serializable, inspectable, diffable, and exportable |
| **Rendering** | A dedicated Vega-Lite adapter | Renderer reads state; it never changes domain state |
| **Provenance** | Append-only typed event log | Records actor, command, revision, inputs, result, approval, and failure |
| **Local persistence** | IndexedDB through a repository adapter | Store snapshots and event history without coupling the domain to browser storage |
| **WebMCP** | Dedicated adapter module | Registers tools and translates tool calls into domain commands |
| **Testing** | Vitest, React Testing Library, Playwright, schema tests | Test commands once, then test that both adapters reach them |

### Key Architectural Rationale: State Management
* **State Decision:** Redux Toolkit / Strict Custom Reducer Store over a loose Zustand store.
* **Why:** A strict custom reducer store (`FigureStore`) or Redux Toolkit enforces predictable, single-source-of-truth state mutations with strict action types, immutable state snapshots, and full provenance recording. Loose Zustand stores encourage unconstrained inline state setters across components, breaking the Two-Phase Commit protocol and human-agent command parity.

---

## 6. Status
* **Document Created:** Complete.
* **Implementation Status:** Fully Implemented and Verified.
