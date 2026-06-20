# Website Builder — AI Acceptance Criteria

**Companion to:** [doc.md](./doc.md) (user story)  
**Last updated:** June 2026

Use this checklist to verify merchant-facing AI behavior in chat and preview. Each item should pass in manual QA and agent prompt reviews.

---

## 1. Voice and tone

| ID | Criterion | Pass when |
|----|-----------|-----------|
| V1 | Warm and practical | Replies feel like a shop consultant, not a developer |
| V2 | Short | Most replies are 1–3 sentences |
| V3 | Merchant words echoed | AI reflects their phrasing ("cozy candle shop," "bold streetwear") |
| V4 | One question max | Never asks two unrelated questions in one message |
| V5 | Clear next step | Merchant always knows what to do next |

---

## 2. Forbidden merchant-facing language

The AI must **not** say these in chat replies:

- template, theme, layout picker
- hero, CTA, conversion funnel
- JSON, agent, tool, orchestrator
- storefront snapshot, template ID
- DNS, hosting, page builder configuration

**Pass:** Grep assistant messages in a full build session — zero forbidden terms.

---

## 3. Session phase behavior

### 3a — Collecting requirements (`collecting_requirements`)

| ID | Criterion | Pass when |
|----|-----------|-----------|
| C1 | Welcome orients merchant | First message asks what they sell, who it's for, and vibe |
| C2 | Greeting handled | "Hi" gets a warm reply + reminder to describe the business |
| C3 | Missing details | AI asks for business name and/or what they sell — one question |
| C4 | No premature build | `generate_website` / `generate_draft` not called without name + description |
| C5 | Capture on describe | Substantive business message triggers profile capture |

### 3b — Ready to build (`template_recommendation`)

| ID | Criterion | Pass when |
|----|-----------|-----------|
| R1 | Build invitation | AI tells merchant to say **"build my website"** when ready |
| R2 | No template picker forced | Merchant is not asked to choose from a technical list |
| R3 | Design is silent | `design_website` / `select_template` happens without exposing template names |
| R4 | Confirmation | AI summarizes their business in plain language before build |

### 3c — Draft exists (`content_generated`, `review_ready`)

| ID | Criterion | Pass when |
|----|-----------|-----------|
| D1 | Preview callout | After generate, AI directs merchant to preview on the right |
| D2 | Refine by chat | Change requests use refine flow, not full rebuild |
| D3 | Confirm changes | After edit, AI states what changed in plain language |
| D4 | Example hints | AI may suggest phrases like "Change the button to Shop Gifts" |

---

## 4. Tool usage

| Tool | Must call when | Must not call when |
|------|----------------|-------------------|
| `capture_business_details` | Merchant shares name, products, industry, color, tone | Nothing new to capture |
| `ask_clarifying_question` | Name or offer still missing | Enough context to proceed |
| `design_website` | Before first generate, design not chosen | Draft already exists |
| `generate_website` | Merchant says build / go ahead / create | Missing name or description |
| `refine_website_copy` | Draft exists + copy change request | No draft yet |

**Pass:** Progress widget shows human labels ("Building your website"), never raw tool names.

---

## 5. Build intent triggers

These merchant phrases must trigger generate (when profile is complete):

- "build my website"
- "go ahead"
- "create my site"
- "generate it"
- "I'm ready"

**Pass:** Preview appears within one turn after build intent with complete profile.

---

## 6. Refine intent triggers

These must trigger copy refinement (when draft exists):

- "Change the headline to …"
- "Make the homepage more premium"
- "Update the button to Shop Gifts"
- "Rewrite the about section"

**Pass:** Preview updates; AI confirms the change without regenerating the whole site.

### 6b — Extended page edits (Phase 1 modular roadmap)

These must also refine copy when a draft exists:

- "Update the contact page intro to …"
- "Change the contact email to …"
- "Add a fourth FAQ about returns"
- "Update the first trust highlight title to …"

### 6c — Homepage block edits (Phase 2 modular roadmap)

These must refine homepage sections when a cosmetics draft exists:

- "Move FAQ above products on the homepage"
- "Make the trust section more premium"
- "Change the homepage headline to …"

**Pass:** Preview reorders or updates the correct homepage section; confirmation uses plain labels (e.g. "trust highlights", "homepage FAQ"), not `pages.home.blocks`.

These must also add or remove homepage sections when a cosmetics draft exists:

- "Add a promo banner above the FAQ"
- "Remove the stats section"

**Pass:** Preview shows the new section or hides the removed one; confirmation uses plain labels (e.g. "added a promo banner", "removed the homepage stats").

---

## 7. UI onboarding alignment

| ID | Criterion | Pass when |
|----|-----------|-----------|
| U1 | Phase-aware prompts | Suggested chips match session phase (describe → build → refine) |
| U2 | How-it-works visible | Onboarding steps shown early in session |
| U3 | Placeholder hints | Input placeholder matches phase |
| U4 | Progress bar | Matches: Your business → Designing → Building → Preview |
| U5 | Loading labels | "Building your website…" during generate; "Updating…" during refine |

---

## 8. End-to-end golden path (manual test)

**Scenario:** New merchant, candle shop

1. Open AI Website Builder → see welcome + onboarding steps + example prompts
2. Send: *"I sell handmade candles. Warm and simple. Mostly gifts."*
3. AI captures details; asks for business name if missing
4. Send: *"Glow & Wick"*
5. AI invites merchant to say "build my website"
6. Send: *"build my website"*
7. Preview appears with homepage, about, FAQs, starter products
8. Send: *"Change the button to Shop Gifts"*
9. Preview button updates; AI confirms in plain language

**Pass:** Complete in under 10 minutes without merchant seeing forbidden jargon.

---

## 9. Agent prompt compliance (engineering)

Prompt sources must include shared rules from `src/lib/storefront-builder/prompts.ts`:

| Agent | File |
|-------|------|
| Interpreter | `agentThinking.ts` |
| Planner | `agentThinking.ts` |
| Executor | `StorefrontBuilderManager.ts` |
| Critic | `agentThinking.ts` |
| Conversation (backend) | `StorefrontAiAgentService.php` |
| Fallback copy | `local-ai.ts`, `StorefrontBuilderService.php` |

**Pass:** Voice rules, forbidden terms, and tool decision rules present in each system prompt.

---

## 10. Failure and fallback

| ID | Criterion | Pass when |
|----|-----------|-----------|
| F1 | AI unavailable | Fallback replies still follow voice rules |
| F2 | Unclear edit | AI asks one short clarifying question |
| F3 | Clear chat | Resets to welcome message; preview unchanged |

---

## Sign-off template

```text
Date:
Tester:
Environment: [local / staging]
OpenAI: [enabled / fallback]

Golden path (§8): PASS / FAIL
Forbidden language (§2): PASS / FAIL
Tool routing (§4): PASS / FAIL
UI onboarding (§7): PASS / FAIL

Notes:
```
