# Website Builder — File Inventory

**Purpose:** Manual review checklist of every file tied to the StoreHause AI Website Builder.  
**Last updated:** July 2026  
**Repos:** `storehause` (merchant UI), `storehausebackend` (API + AI), `storehouseadmin` (ops), `bolt.diy` (upstream fork)

> **Note:** There is no `wella` identifier in the codebase. The builder is implemented as **AI Website Builder** / **storefront-builder** / **workbench** (Bolt-style code editor).

---

## How the pieces connect

```text
Merchant UI (storehause)
  /admin/builder              → Chat + JSON template preview (classic builder)
  /admin/builder/workbench    → WebContainer + CodeMirror + live preview (Bolt workbench)
  /admin/builder/thinking     → Agent thinking log viewer
        │
        ├── Next.js API routes  /api/storefront-builder/ai/*
        ├── Next.js API routes  /api/chat, /api/chat/stream
        └── Laravel API         /api/storefront-builder/*
                                    │
                                    ├── StorefrontBuilderService
                                    ├── StorefrontAiAgentService
                                    └── PHP Agents (orchestrator, writer, design, color, code…)
        │
        ▼
Storefront runtime (JSON templates + Bolt code templates)
  → Preview in builder panel → Publish → Public storefront
```

**Two builder modes:**

| Mode | Entry page | Output | Key libs |
|------|------------|--------|----------|
| Classic AI builder | `/admin/builder` | Store JSON snapshot (headline, about, products, colors…) | `storefront-builder/`, backend agents |
| Workbench (Bolt) | `/admin/builder/workbench` | Live React/Vite project in WebContainer | `bolt/`, `StorefrontCodeAgent`, code templates |

---

## Documentation (read first)

| File | What it covers |
|------|----------------|
| [doc.md](./doc.md) | Merchant user story, AI tone, tool flow |
| [builder-ai-acceptance-criteria.md](./builder-ai-acceptance-criteria.md) | QA checklist for AI voice and golden path |
| [modular-storefront-roadmap.md](./modular-storefront-roadmap.md) | Block-based generation roadmap |
| [arch.md](./arch.md) | Full system architecture (§ AI Store Builder) |
| [build.md](./build.md) | Build / deploy notes |
| [builder.md](./builder.md) | Bolt-style agent engine blueprint (reference) |
| [bolt-style-generator-plan.md](./bolt-style-generator-plan.md) | Bolt generator planning |
| [technicalspec.md](./technicalspec.md) | Technical spec |
| [management.md](./management.md) | Ops / management notes |

---

## storehause — Pages & routes

### Admin pages

| File | Role |
|------|------|
| `src/app/admin/builder/page.tsx` | **Main builder** — chat panel + preview + progress |
| `src/app/admin/builder/workbench/page.tsx` | **Workbench** — file tree, CodeMirror, WebContainer preview, terminal |
| `src/app/admin/builder/thinking/page.tsx` | Full-page agent thinking log |
| `src/app/admin/builder/custom/page.tsx` | Redirect → workbench |
| `src/app/admin/page.tsx` | Dashboard (links to builder FAB) |

### Next.js API routes

| File | Role |
|------|------|
| `src/app/api/storefront-builder/ai/route.ts` | Builder AI turn (non-stream) |
| `src/app/api/storefront-builder/ai/stream/route.ts` | Builder AI streaming |
| `src/app/api/storefront-builder/ai/resolve-color/route.ts` | Color resolution AI |
| `src/app/api/storefront-builder/ai/resolve-design/route.ts` | Design direction AI |
| `src/app/api/chat/route.ts` | General chat (workbench edit agent) |
| `src/app/api/chat/stream/route.ts` | Streaming chat |
| `src/app/api/bolt/templates/[templateId]/route.ts` | Serve Bolt starter templates |

---

## storehause — UI components

### Builder shell (`src/components/admin/builder/`)

| File | Role |
|------|------|
| `builder-chat-panel.tsx` | Chat UI for builder / workbench |
| `builder-preview-panel.tsx` | Live storefront preview (JSON mode) |
| `builder-progress.tsx` | Step progress bar (business → design → build → preview) |
| `builder-message-widgets.tsx` | Rich chat widgets (progress cards, actions) |
| `builder-suggested-actions.tsx` | Quick-reply chips |
| `builder-template-recommendations.tsx` | Template picker cards |
| `builder-logo-manager.tsx` | Logo upload / remove |
| `builder-thinking-log.tsx` | Thinking log display |
| `builder-thinking-log-compact.tsx` | Compact thinking log |
| `builder-thinking-log-sheet.tsx` | Sheet/drawer for thinking log |
| `template-mini-preview.tsx` | Small template thumbnail preview |
| `custom-code-preview.tsx` | Code preview helper |

### Workbench / WebContainer (`src/components/admin/builder/`)

| File | Role |
|------|------|
| `workbench-code-editor.tsx` | Code editor panel wrapper |
| `workbench-codemirror.tsx` | CodeMirror instance |
| `workbench-file-tree.tsx` | Project file tree |
| `workbench-changes-panel.tsx` | Diff / pending changes |
| `workbench-live-actions.tsx` | Live action stream from agent |
| `workbench-chat-input.tsx` | Workbench-specific chat input |
| `workbench-panel-header.tsx` | Collapsible panel headers |
| `workbench-error-alert.tsx` | Workbench error banner |
| `webcontainer-preview.tsx` | iframe preview of running dev server |
| `webcontainer-terminal-panel.tsx` | Terminal output panel |

### Other admin / merchant UI

| File | Role |
|------|------|
| `src/components/admin/dashboard-ai-builder-fab.tsx` | Floating “AI Builder” entry button |
| `src/components/admin/publish-storefront-button.tsx` | Publish to live storefront |
| `src/components/merchant-shell.tsx` | Nav shell (builder links) |
| `src/components/storefront/editor/storefront-editor-canvas.tsx` | Visual editor canvas |
| `src/components/storefront/editor/visual-storefront-editor.tsx` | Visual block editor |
| `src/components/storefront/editor/block-editor-panel.tsx` | Block editor sidebar |
| `src/components/storefront/editor/block-editor-context.tsx` | Block editor state |
| `src/components/storefront/editor/editable-block-shell.tsx` | Editable block wrapper |
| `src/components/storefront/storefront-preview.tsx` | Storefront preview renderer |
| `src/components/storefront/storefront-gate.tsx` | Storefront access gate |
| `src/components/storefront/generating-skeleton.tsx` | Loading skeleton during generation |

---

## storehause — `storefront-builder` library

Core AI builder logic (classic JSON mode).

| File | Role |
|------|------|
| `src/lib/storefront-builder/client.ts` | **Orchestration hub** — session, message processing, synthesis |
| `src/lib/storefront-builder/local-ai.ts` | Local AI fallbacks, profile merge, store synthesis |
| `src/lib/storefront-builder/prompts.ts` | System prompts and tool rules |
| `src/lib/storefront-builder/copy.ts` | Merchant-facing UI copy |
| `src/lib/storefront-builder/suggested-actions.ts` | Suggested action generation |
| `src/lib/storefront-builder/builder-message-limits.ts` | Chat length limits |
| `src/lib/storefront-builder/chat-history.ts` | Chat history for AI context |
| `src/lib/storefront-builder/edit-summary.ts` | Summarize edits for merchant |
| `src/lib/storefront-builder/thinking-stream.ts` | Stream thinking log entries |
| `src/lib/storefront-builder/session-thinking-log.ts` | Session-scoped thinking log |
| `src/lib/storefront-builder/color-resolver.ts` | Brand color resolution |
| `src/lib/storefront-builder/design-resolver.ts` | Design direction resolution |
| `src/lib/storefront-builder/image-sourcing.ts` | Hero / section image sourcing |
| `src/lib/storefront-builder/unsplash-client.ts` | Unsplash API client |
| `src/lib/storefront-builder/stock-images.ts` | Stock image catalog |
| `src/lib/storefront-builder/image-catalog.ts` | Image catalog metadata |
| `src/lib/storefront-builder/editable-paths.ts` | JSON paths the AI can edit |
| `src/lib/storefront-builder/section-scope.ts` | Section scoping for edits |
| `src/lib/platform-ai-config.ts` | Platform AI provider config (recent) |

### Agents subfolder (`src/lib/storefront-builder/agents/`)

| File | Role |
|------|------|
| `StorefrontBuilderManager.ts` | **Agent manager** — interpreter → planner → executor → critic |
| `tools.ts` | Tool definitions (`capture_business_details`, `design_website`, etc.) |
| `types.ts` | Agent types, thinking log types |
| `agentThinking.ts` | Thinking log helpers |
| `openaiChat.ts` | OpenAI chat wrapper |
| `thinking-log.ts` | Thinking log utilities |

---

## storehause — `bolt` library (workbench)

WebContainer + code-editing agent stack.

| File | Role |
|------|------|
| `src/lib/bolt/workbench-edit-agent.ts` | **Workbench edit agent** — code changes via chat |
| `src/lib/bolt/workbench-edit-review.ts` | Review / validate agent edits |
| `src/lib/bolt/workbench-chat.ts` | Workbench chat session |
| `src/lib/bolt/workbench-context.ts` | Merge live code FS into session/storefront |
| `src/lib/bolt/workbench-persist.ts` | Persist workbench project to backend |
| `src/lib/bolt/workbench-agent-scratchpad.ts` | Agent scratchpad state |
| `src/lib/bolt/workbench-intent.ts` | Parse user intent in workbench |
| `src/lib/bolt/workbench-mentions.ts` | @-mention file paths in chat |
| `src/lib/bolt/workbench-diff.ts` | File diff utilities |
| `src/lib/bolt/workbench-editor-nav.ts` | Editor navigation |
| `src/lib/bolt/workbench-preview-inspect.ts` | Preview DOM inspection |
| `src/lib/bolt/workbench-preview-errors.ts` | Preview error capture |
| `src/lib/bolt/action-runner.ts` | Run agent file actions |
| `src/lib/bolt/bolt-stream.ts` | Stream Bolt agent output |
| `src/lib/bolt/webcontainer-runtime.ts` | WebContainer boot + dev server |
| `src/lib/bolt/webcontainer-terminal.ts` | Terminal integration |
| `src/lib/bolt/webcontainer-output.ts` | Parse terminal output |
| `src/lib/bolt/webcontainer-deps-cache.ts` | npm deps cache |
| `src/lib/bolt/wc-file-sync.ts` | Sync files to WebContainer FS |
| `src/lib/bolt/file-patch.ts` | Apply search/replace patches |
| `src/lib/bolt/enhanced-code-parser.ts` | Parse agent code blocks |
| `src/lib/bolt/code-search.ts` | Codebase search |
| `src/lib/bolt/select-context.ts` | Select relevant files for context |
| `src/lib/bolt/templates.ts` | Bolt template IDs and metadata |
| `src/lib/bolt/seed-template.ts` | Seed starter template into session |
| `src/lib/bolt/prebuilt-snapshot.ts` | Prebuilt project snapshots |
| `src/lib/bolt/project-utils.ts` | Project helpers |
| `src/lib/bolt/workdir-path.ts` | Working directory paths |
| `src/lib/bolt/deps-key.ts` | Dependency cache keys |
| `src/lib/bolt/constants.ts` | Shared constants |
| `src/lib/bolt/terminal-output.ts` | Terminal output formatting |
| `src/lib/bolt/codemirror-theme.ts` | CodeMirror theme |
| `src/lib/bolt/codemirror-languages.ts` | Language support |
| `src/lib/bolt/codemirror-lint.ts` | Lint integration |
| `src/lib/bolt/use-workbench-autosave.ts` | Autosave hook |
| `src/lib/bolt/use-workbench-editor-preview-sync.ts` | Editor ↔ preview sync hook |

---

## storehause — Storefront runtime (templates, blocks, preview)

These files render the merchant’s site in the builder preview and on the live storefront.

### Core lib (`src/lib/storefront/`)

| File | Role |
|------|------|
| `load-storefront.ts` | Load storefront data |
| `draft.ts` | Draft state |
| `template.ts` | Template alignment / selection |
| `template-registry.ts` | Template type registry |
| `bolt-template-storefront.ts` | Attach Bolt code template to storefront |
| `theme-context.tsx` | Theme provider |
| `store-context.tsx` | Store data provider |
| `cart-context.tsx` | Cart state |
| `checkout-session.ts` | Checkout session |
| `format.ts` | Formatting helpers |
| `palette-utils.ts` | Color palette utils |
| `product-plugs.ts` | Product placeholder data |
| `category-filters.ts` | Category filters |
| `use-abandoned-cart-tracking.ts` | Abandoned cart hook |

### Template defaults & presets

| File | Role |
|------|------|
| `beauty-defaults.ts` | Beauty template defaults |
| `cosmetics-defaults.ts` | Cosmetics defaults |
| `fashion-defaults.ts` | Fashion defaults |
| `hair-fashion-defaults.ts` | Hair & fashion defaults |
| `furniture-hardware-defaults.ts` | Furniture defaults |
| `minimalistic-defaults.ts` | Minimalistic defaults |
| `template-presets/hair-and-fashion.ts` | Hair & fashion preset |
| `template-presets/furniture-hardware.ts` | Furniture preset |
| `template-presets/seed-pages.ts` | Seed page content |

### Blocks system (`src/lib/storefront/blocks/`)

| File | Role |
|------|------|
| `schema.ts` | Block JSON schema |
| `types.ts` | Block types |
| `catalog.ts` | Block catalog |
| `recipes.ts` | Block composition recipes |
| `operations.ts` | Block CRUD operations |
| `block-draft.ts` | Block draft state |
| `page-block-operations.ts` | Page-level block ops |
| `category-showcase-operations.ts` | Category showcase ops |
| `category-showcase-utils.ts` | Category showcase helpers |
| `category-showcase-defaults.ts` | Category showcase defaults |
| `migrate-page-blocks.ts` | Migration helpers |
| `migrate-home.ts` | Home migration |
| `sync-page-legacy.ts` | Legacy sync |
| `sync-legacy.ts` | Legacy sync |

### Storefront components (`src/components/storefront/`)

**Shells:** `shell/default-shell.tsx`, `beauty-shell.tsx`, `cosmetics-shell.tsx`, `fashion-shell.tsx`, `furniture-shell.tsx`, `hair-fashion-shell.tsx`, `minimalistic-shell.tsx`, `furniture-header.tsx`

**Home pages:** `pages/home/classic-home.tsx`, `beauty-home.tsx`, `cosmetics-home.tsx`, `fashion-lookbook-home.tsx`, `furniture-hardware-home.tsx`, `hair-and-fashion-home.tsx`, `minimalistic-home.tsx`, `home-page.tsx`

**Other pages:** `pages/products-page-view.tsx`, `product-detail-page-view.tsx`, `cart-page-view.tsx`, `checkout-page-view.tsx`, `content-page-view.tsx`, `faq-page-view.tsx`, `storefront-faq-section.tsx`, `content-page.tsx`

**Blocks:** `blocks/registry.ts`, `page-renderer.tsx`, `category-showcase-block.tsx`, `cosmetics-blocks.tsx`, `shared/product-pack.tsx`

**Theme:** `theme/page-container.tsx`, `page-title.tsx`, `storefront-link.tsx`, `editable-text.tsx`, `editable-image.tsx`, `primary-button.tsx`, `product-card-themed.tsx`

**Misc:** `store-shell.tsx`, `product-card.tsx`

---

## storehause — API client, hooks, shared AI

| File | Role |
|------|------|
| `src/lib/api/client.ts` | HTTP client (builder session endpoints) |
| `src/lib/api/types.ts` | `BuilderSession`, `StorefrontContent`, template types |
| `src/lib/api/storefront.ts` | Storefront API helpers |
| `src/lib/api/mocks.ts` | Dev mocks (builder) |
| `src/lib/ai-sdk.ts` | Vercel AI SDK setup |
| `src/hooks/use-merchant-queries.ts` | `useBuilderSessionOrStart`, template queries |
| `src/lib/code-fs.ts` | In-memory code filesystem (workbench) |

---

## storehausebackend — API routes

From `routes/api.php`:

**Merchant (auth):**
- `POST /storefront-builder/sessions`
- `GET /storefront-builder/sessions/current`
- `POST /storefront-builder/sessions/{id}/messages`
- `PUT /storefront-builder/sessions/{id}/snapshot`
- `PUT /storefront-builder/sessions/{id}/project`
- `GET /storefront-builder/sessions/{id}/project`
- `POST /storefront-builder/sessions/{id}/clear`
- `POST /storefront-builder/sessions/{id}/select-template`
- `POST /storefront-builder/sessions/{id}/generate`
- `POST /storefront-builder/sessions/{id}/generate-stream`
- `POST /storefront-builder/sessions/{id}/edit`
- `POST /storefront-builder/recommend-templates`

**Admin:**
- `GET /admin/builder/sessions`
- `GET /admin/builder/sessions/stats`
- `GET /admin/builder/sessions/{id}`

Related storefront routes (publish, templates, code): see `StoreController`, `StorefrontTemplateController`, `StorefrontCodeController`, `PublicStorefrontController`.

---

## storehausebackend — Controllers

| File | Role |
|------|------|
| `app/Http/Controllers/StorefrontBuilderController.php` | **Main builder API** — sessions, messages, generate, edit |
| `app/Http/Controllers/AdminBuilderController.php` | Admin session monitoring |
| `app/Http/Controllers/StorefrontTemplateController.php` | Template list + recommend |
| `app/Http/Controllers/AdminStorefrontTemplateController.php` | Admin template CRUD |
| `app/Http/Controllers/StorefrontCodeController.php` | Bolt/code template endpoints |
| `app/Http/Controllers/PublicStorefrontController.php` | Public live storefront |
| `app/Http/Controllers/StoreController.php` | Store + storefront snapshot |
| `app/Http/Controllers/StorehauseController.php` | StoreHause-specific endpoints |
| `app/Http/Controllers/AdminAnalyticsController.php` | Builder analytics |
| `app/Http/Controllers/AiChatController.php` | AI chat (platform) |
| `app/Http/Controllers/AiConfigController.php` | AI config (platform) |
| `app/Http/Controllers/AdminAiSettingsController.php` | Admin AI settings |

---

## storehausebackend — Services

| File | Role |
|------|------|
| `app/Services/StorefrontBuilderService.php` | **Builder business logic** — sessions, generation pipeline |
| `app/Services/StorefrontAiAgentService.php` | AI agent orchestration for storefront |
| `app/Services/StorefrontPublishService.php` | Publish draft → live |
| `app/Services/StorefrontBlockService.php` | Block operations |
| `app/Services/StorefrontPageBlockService.php` | Page block operations |
| `app/Services/StorefrontPathEditor.php` | JSON path editing |
| `app/Services/PlatformAiConfigService.php` | Platform AI provider config |
| `app/Services/AiChatClient.php` | AI chat HTTP client |
| `app/Services/ApiCacheService.php` | API caching (storefront) |

---

## storehausebackend — Agents

| File | Role |
|------|------|
| `app/Agents/BaseAgent.php` | Base agent class |
| `app/Agents/AgentRegistry.php` | Agent registration |
| `app/Agents/Contracts/AgentInterface.php` | Agent contract |
| `app/Agents/BuilderOrchestratorAgent.php` | **Orchestrates builder pipeline** |
| `app/Agents/InterpreterAgent.php` | Parse merchant intent |
| `app/Agents/ConversationAgent.php` | Conversational replies |
| `app/Agents/DesignDirectorAgent.php` | Pick design direction / template |
| `app/Agents/ColorSpecialistAgent.php` | Brand color selection |
| `app/Agents/StorefrontWriterAgent.php` | Generate copy (headline, about, FAQ…) |
| `app/Agents/EditorAgent.php` | Refine existing copy |
| `app/Agents/StorefrontCodeAgent.php` | **Generate/edit Bolt code templates** |
| `app/Agents/VisionAgent.php` | Image / vision tasks |
| `app/Agents/MarketingAgent.php` | Marketing copy (adjacent) |
| `app/Agents/CustomerCommerceAgent.php` | Commerce assistant (adjacent) |
| `app/Providers/AgentServiceProvider.php` | Agent DI registration |

---

## storehausebackend — Models & database

### Models

| File | Role |
|------|------|
| `app/Models/StorefrontBuilderSession.php` | Builder session (profile, snapshot, template) |
| `app/Models/StorefrontBuilderMessage.php` | Chat messages per session |
| `app/Models/StorefrontTemplate.php` | Template definitions (JSON + Bolt) |
| `app/Models/PlatformSetting.php` | Platform AI settings |

### Migrations

| File | Role |
|------|------|
| `database/migrations/2026_06_07_000003_add_storefront_template_to_stores.php` | Store ↔ template link |
| `database/migrations/2026_06_07_000005_create_storefront_templates_table.php` | Templates table |
| `database/migrations/2026_06_12_000001_add_builder_metadata_to_storefront_templates_table.php` | Builder metadata on templates |
| `database/migrations/2026_06_12_000002_create_storefront_builder_tables.php` | **Sessions + messages tables** |
| `database/migrations/2026_06_21_000001_add_storefront_publish_columns.php` | Publish status columns |
| `database/migrations/2026_07_05_000001_add_type_to_storefront_templates_table.php` | Template type (json/bolt) |
| `database/migrations/2026_07_05_000002_mark_storefront_bolt_templates_as_json.php` | Bolt template migration |
| `database/migrations/2026_07_07_000002_create_platform_settings_table.php` | Platform AI settings |

### Seeders

| File | Role |
|------|------|
| `database/seeders/StorefrontTemplateSeeder.php` | Seed starter templates |

---

## storehausebackend — Prompts

| File | Agent |
|------|-------|
| `prompts/builder-orchestrator/v1.txt` | BuilderOrchestratorAgent |
| `prompts/interpreter/v1.txt` | InterpreterAgent |
| `prompts/conversation-agent/v1.txt` | ConversationAgent |
| `prompts/design-director/v1.txt` | DesignDirectorAgent |
| `prompts/color-specialist/v1.txt` | ColorSpecialistAgent |
| `prompts/storefront-writer/v1.txt` | StorefrontWriterAgent |
| `prompts/editor-agent/v1.txt` | EditorAgent |
| `prompts/storefront-code/v1.txt` | StorefrontCodeAgent |

---

## storehausebackend — Tests & config

| File | Role |
|------|------|
| `tests/Feature/StorefrontBuilderTest.php` | Builder API feature tests |
| `tests/Feature/StorefrontPublishTest.php` | Publish flow tests |
| `tests/Unit/StorefrontAiAgentServiceTest.php` | AI agent service unit tests |
| `tests/Feature/PlatformAiSettingsTest.php` | Platform AI settings tests |
| `tests/Pest.php` | Test bootstrap (storefront fixtures) |
| `config/ai.php` | AI provider config |
| `app/Exceptions/StorefrontAiUnavailableException.php` | AI unavailable error |
| `.env.example` | AI + builder env vars |

---

## storehouseadmin — Ops dashboard

| File | Role |
|------|------|
| `src/pages/BuilderMonitoring.tsx` | Monitor builder sessions |
| `src/pages/StorefrontTemplates.tsx` | Manage templates |
| `src/pages/AiSettings.tsx` | Platform AI provider settings |
| `src/services/api/builder.ts` | Builder monitoring API client |
| `src/services/api/templates.ts` | Template admin API |
| `src/services/api/analytics.ts` | Builder analytics |
| `src/hooks/use-admin-queries.ts` | Admin React Query hooks |
| `src/lib/query-keys.ts` | Query key constants |
| `src/App.tsx` | Routes (builder, templates, AI settings) |
| `src/layouts/DashboardLayout.tsx` | Nav (builder links) |

---

## bolt.diy — Upstream fork

Minimal StoreHause-specific changes today:

| File | Role |
|------|------|
| `app/components/@settings/tabs/providers/cloud/CloudProvidersTab.tsx` | Cloud provider settings UI |

The workbench in `storehause` is inspired by / forked from bolt.diy patterns but lives primarily in `storehause/src/lib/bolt/`.

---

## Suggested review order

1. **User intent:** `docs/doc.md`, `src/lib/storefront-builder/copy.ts`, `prompts/builder-orchestrator/v1.txt`
2. **Classic builder flow:** `page.tsx` → `client.ts` → `StorefrontBuilderManager.ts` → `StorefrontBuilderController.php` → `StorefrontBuilderService.php`
3. **Workbench flow:** `workbench/page.tsx` → `workbench-edit-agent.ts` → `webcontainer-runtime.ts` → `StorefrontCodeAgent.php`
4. **Preview rendering:** `builder-preview-panel.tsx` → `storefront-preview.tsx` → template shells + home pages
5. **Publish:** `publish-storefront-button.tsx` → `StorefrontPublishService.php`
6. **Ops:** `BuilderMonitoring.tsx`, `AdminBuilderController.php`

---

## File counts (approximate)

| Area | Files |
|------|-------|
| Builder UI components | 26 |
| `storefront-builder` lib | 28 |
| `bolt` lib | 37 |
| Storefront runtime | 83 |
| Backend (builder-specific) | ~35 |
| Admin ops | ~10 |
| Documentation | 11 |

**Total touchpoints:** ~230 files across 3 repos (excluding generated/build artifacts).
