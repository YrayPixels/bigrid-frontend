## Bolt-style Website + Code Generator Plan (StoreHause)

Status: Draft (north-star spec)

Last updated: 2026-07-02

### Goal

Evolve StoreHause from “template JSON storefront generator” and “custom HTML generator” into a **bolt-style code generator + runtime**:

- **Generate** a multi-file project (not just one HTML string)
- **Edit** it iteratively via chat (deterministic file updates)
- **Preview** it live (static iframe first, then full runtime)
- **Publish** it safely (versioned, auditable, reversible)

### Non-goals (for early phases)

- Becoming a general-purpose IDE
- Running native binaries on the server
- Replacing the existing template-based storefront engine immediately

---

## Product ownership + segregation (Next.js vs Laravel)

Even if StoreHause “owns” all capabilities, implementation should be split by runtime constraints.

### Next.js (`storehause/`) owns interactive generation + runtime UX

- Chat UI, sessions, streaming UX
- **Bolt protocol** parsing (streaming `<boltArtifact>/<boltAction>` parser)
- **Action runner** (apply file actions; later shell/start/build)
- File tree UI + code editor UI + diff UI
- Preview
  - Static mode: iframe for HTML/CSS/JS-only sites
  - Full mode: WebContainer for `shell/start/build` actions
- Zip export (client-side)

### Laravel (`storehausebackend/`) owns durable persistence + publish

- Store/merchant authz, ownership checks, quotas/rate limits
- Persist file trees + versions + audit logs
- Publish pipeline (static deploy or build-then-deploy)
- Background jobs / queues for long operations
- Security scanning / validation gates before publish (later)

Rule of thumb:

- **Anything that must run `npm install` / a dev server live belongs in Next.js + WebContainer.**
- **Anything that must be durable, permissioned, versioned, and publishable belongs in Laravel.**

---

## Current state vs bolt.diy (capability table)

| Capability | StoreHause now | bolt.diy |
|---|---:|---:|
| Bolt artifact prompt | ✅ (`storefront-code/v1.txt`, `generate_custom_site`) | ✅ |
| Streaming parser | ⚠️ basic (`code-parser.ts`, not streaming) | ✅ (`message-parser.ts`) |
| Multi-file persistence | ✅ `custom_files` | ✅ `FileMap` |
| Action types | ⚠️ `file` only | ✅ `file`, `shell`, `start`, `build`, `supabase` |
| Run dev server / npm | ❌ | ✅ WebContainer |
| Context file selection | ❌ | ✅ `select-context.ts` |
| Chat summarization | ❌ | ✅ `create-summary.ts` |
| Code editor + file tree UI | ❌ | ✅ workbench |
| Publish built site | ⚠️ template JSON path | ✅ zip + deploy |

---

## Target architecture (bolt-style)

```text
Merchant instruction (chat)
  -> LLM streams <boltArtifact>/<boltAction>
  -> Streaming parser emits action events
  -> Action runner applies actions to file tree
  -> Preview updates continuously
  -> Persist file tree + metadata (versioned)
  -> Publish pipeline (static or build->deploy)
```

### Canonical artifact contract

- Model output format (required):

  - `<boltArtifact id="..." title="...">`
  - `<boltAction type="file" filePath="...">FULL FILE CONTENT</boltAction>`
  - (later) `<boltAction type="shell|start|build">...</boltAction>`

- Determinism rules:
  - For edits: output **only changed files**
  - For any updated file: output **complete file contents** (no diffs)
  - Keep actions replayable (log actions per turn)

---

## Phased plan (increasing “bolt-ness”)

### Phase 0 — Foundations (DONE / in progress)

- Persist multi-file custom sites (`custom_files`) alongside preview HTML (`custom_code`)
- Enable custom generation in fresh sessions
- Support “edit custom code” tool that returns bolt file actions

Deliverable: custom code survives refresh and can be edited by the AI.

### Phase 1 — True bolt protocol (streaming parser + deterministic action runner)

Objective: move from “parse at end” to “stream and apply actions”.

- Port/implement a streaming parser (bolt-like `message-parser.ts` behavior)
- Build `ActionRunner` (start with `file` actions only)
- Log actions + results per turn (for replay/debug)
- Persist final `FileMap` + optional action log

Deliverable: generation/edit feels live; preview updates while streaming.

### Phase 2 — Workbench UI (file tree + code editor + diff)

Objective: make it a tool, not just a chat.

- File tree
- Code editor
- Diff view for AI edits (optional but recommended for trust)
- Locked/read-only files support (bolt concept)

Deliverable: bolt-like workbench experience inside StoreHause.

### Phase 3 — Context file selection (scale to larger projects)

Objective: don’t send the entire project every time.

- Implement file selection step (bolt `select-context.ts` pattern)
- Build context buffer from selected files only
- Respect ignore patterns (node_modules, dist, etc.)

Deliverable: cheaper, smarter edits on large projects.

### Phase 4 — Summarization + resilience for long sessions

Objective: maintain quality over long chat sessions.

- Session summarization (bolt `create-summary.ts` concept)
- Stream recovery/retry logic
- Persist summaries per session (resume reliably)

Deliverable: long-lived “build sessions” without degradation.

### Phase 5 — Full runtime: WebContainer (`shell/start/build`)

Objective: become a true “code generator” that can run projects.

- Integrate WebContainer in Next.js (browser-only)
- Support action types: `shell`, `start`, `build`
- Dev server preview + error forwarding

Deliverable: generate Vite/React/etc., run it live, iterate.

### Phase 6 — Publishing & export (StoreHause-safe)

Objective: “generate → preview → publish” with governance.

- Zip export (client-side)
- Laravel publish pipeline (static deploy or build->deploy)
- Versioning + rollback
- Audit logs + usage tracking

Deliverable: merchants can ship generated sites safely.

---

## Implementation backlog (high level)

### Next.js (`storehause/`)

- **Protocol**
  - Add streaming parser (artifact/action events)
  - Add action runner with action log
  - Standardize internal types: `BoltArtifact`, `BoltAction`, `FileMap`
- **UX**
  - Workbench: file tree, editor, preview
  - Diff/review mode for AI edits
- **Runtime**
  - Static preview (iframe) baseline
  - WebContainer integration for full bolt runtime
- **Optimization**
  - Context file selection
  - Summaries + retry logic

### Laravel (`storehausebackend/`)

- **Persistence**
  - Store file trees per store + version
  - Store builder action logs / metadata
- **Publishing**
  - Publish static artifacts
  - (Later) build artifacts then publish
- **Governance**
  - Quotas / rate limiting
  - Validation gates before publish

---

## Acceptance criteria (bolt-like MVP)

A merchant can:

- Generate a multi-file storefront project from a prompt
- See preview update live as code is generated
- Ask for changes and have files updated deterministically
- Open a workbench view to inspect/edit files directly
- Export zip OR publish a versioned release

