# Prior Product Work vs. WebMCP Hackathon Contribution

## Context

Bizgrid is a pre-existing merchant commerce platform that was developed and operational before the OpenAI WebMCP Challenge Submission Period of **August 25, 2026 – September 3, 2026**.

We are therefore explicitly separating the existing Bizgrid product from the **new WebMCP functionality developed during the challenge period**.

The purpose of this separation is to make the scope of our hackathon contribution clear: **judges should evaluate the WebMCP extension and how it transforms Bizgrid into an agent-accessible commerce platform, rather than treating the underlying merchant application as new hackathon work.**

---

# 1. Pre-existing Bizgrid Product

The following functionality existed before the WebMCP Challenge Submission Period and is part of the underlying Bizgrid commerce platform:

* Merchant registration and onboarding
* Merchant dashboards
* Product management
* Order management
* Billing and subscription functionality
* AI-powered storefront / website builder
* Public merchant storefronts
* Product browsing and catalog functionality
* Shopping carts
* Paystack-powered checkout
* Bizgrid marketing pages
* Demo merchant/storefront
* Supporting backend and administration applications

The frontend repository also has development history dating back to approximately **June 7, 2026**, demonstrating that the underlying commerce platform predates the challenge.

This existing functionality provides the commerce infrastructure on which the WebMCP layer was subsequently built.

---

# 2. New WebMCP Work Developed During the Submission Period

Between **August 28 and August 30, 2026**, we added a dedicated WebMCP integration to Bizgrid.

This extension exposes Bizgrid's commerce capabilities as **structured tools that AI agents can discover and invoke through WebMCP**, rather than requiring an agent to scrape webpages or infer functionality from the visual interface.

The result is a new interaction layer between AI agents and the existing Bizgrid commerce infrastructure.

### Agents can now:

* **Discover merchants** by listing published stores.
* **Discover products** across participating merchants.
* **Search the platform catalog** using `search_products`.
* **Inspect individual stores** and retrieve store information.
* **Inspect individual products** and retrieve product information.
* **Add products to the appropriate merchant cart.**
* **Read the current cart for a merchant.**
* **Continue the transaction through the merchant's existing storefront checkout.**

This allows an AI agent to move from **product discovery → product selection → cart creation → human checkout** using structured tools exposed directly by the website.

Importantly, the agent does not need to scrape Bizgrid's HTML to perform these actions.

---

# 3. The WebMCP Architecture

The WebMCP implementation was built as a dedicated application layer within Bizgrid.

| Code Path                                            | Purpose                                                                                                                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/webmcp/platform-tools.ts`                   | Defines the WebMCP commerce tools, including `list_stores`, `list_catalog`, `get_store_info`, `search_products`, `get_product`, `add_to_cart`, and `get_cart` |
| `src/lib/webmcp/bootstrap.ts`                        | Registers the tools through `document.modelContext.registerTool` / `navigator.modelContext`                                                                   |
| `src/lib/webmcp/model-context.ts`                    | WebMCP model-context helpers                                                                                                                                  |
| `src/lib/webmcp/platform-cart.ts`                    | Reads and writes the per-store shopping cart used by WebMCP tools                                                                                             |
| `src/lib/webmcp/shared.ts`                           | Shared product and cart validation logic                                                                                                                      |
| `src/lib/webmcp/types.ts`                            | TypeScript types used by the WebMCP layer                                                                                                                     |
| `src/components/webmcp/platform-webmcp-provider.tsx` | Application-wide WebMCP registration provider                                                                                                                 |
| `src/instrumentation-client.ts`                      | Performs early client-side bootstrap so tools can become discoverable before normal application hydration                                                     |
| `src/lib/api/platform-catalog.ts`                    | Public catalog API client consumed by the WebMCP tools                                                                                                        |
| `docs/webmcp-demo-script.md`                         | Reproducible demonstration script covering the WebMCP tool set                                                                                                |

The implementation therefore goes beyond simply adding a demonstration button or chatbot interface. It creates a **structured agent interface to Bizgrid's existing commerce primitives**.

---

# 4. Evidence That the WebMCP Work Was Created During the Challenge

The WebMCP implementation is supported by dated repository commits made during the official Submission Period:

| Date                | Commit    | Contribution                                                       |
| ------------------- | --------- | ------------------------------------------------------------------ |
| **August 28, 2026** | `4cf16ba` | Integrated `PlatformWebMcpProvider` into the application providers |
| **August 28, 2026** | `5a4066c` | Streamlined WebMCP tool registration and types                     |
| **August 28, 2026** | `bc13c35` | Enhanced tool registration and model-context handling              |
| **August 29, 2026** | `48f11b9` | Corrected WebMCP rules document formatting                         |
| **August 30, 2026** | `6103ec4` | Updated the WebMCP demonstration script for the complete tool set  |

These commits provide a chronological record showing that the WebMCP functionality was implemented and refined **within the August 25 – September 3, 2026 Submission Period**.

### Post-submission reliability hardening (September 4, 2026)

After the submission deadline, we continued hardening the WebMCP layer based on real-world testing in ChatGPT's in-app browser (`a1300b2`, September 4, 2026):

* **Robust registration** — polling for `document.modelContext` extended to 20 seconds (animation-frame + 250 ms interval) so tools register even when the browser injects the WebMCP API long after page load.
* **Repeated tool discovery signals** — the `toolchange` event is now re-broadcast at 0.5 s / 2 s / 5 s / 15 s after registration and on `visibilitychange`, `focus`, and `pageshow`, so browsers that snapshot site tools early still discover them.
* **Self-healing registration** — any tool missing from `getTools()` is automatically re-registered.
* **Compatibility fallback** — `registerTool` is retried without the options object when a browser rejects it.
* **Agent-readable manifest** — the page head now includes a `webmcp-tools` meta tag and a JSON manifest telling agents to prefer the site tools over HTML scraping and explaining the ChatGPT browser's empty-`getTools()` quirk.
* **Expanded demo script troubleshooting** — documented recovery prompts for "tools not callable" failures.

This hardening does not change the tool surface; it makes the existing seven tools discoverable and reliable across WebMCP-enabled clients.

---

# 5. What the Hackathon Contribution Changes

The underlying Bizgrid platform was already capable of supporting conventional human commerce.

The WebMCP extension changes **how that commerce infrastructure can be accessed**.

Before WebMCP, a customer generally interacts with Bizgrid through the traditional website experience:

**Human → Website UI → Store → Product → Cart → Checkout**

With the new WebMCP layer, an AI agent can interact with Bizgrid through structured capabilities:

**AI Agent → WebMCP Tools → Bizgrid Commerce Infrastructure → Merchant Cart → Human Checkout**

This effectively gives Bizgrid an **agent-accessible commerce interface** without replacing its existing merchant storefronts.

---

# 6. Human + Agent Commerce

A key design principle of the implementation is that the AI agent does not replace the merchant's existing storefront or checkout system.

Instead, the agent assists with the discovery and shopping workflow and can hand the transaction back to the human at checkout.

For example:

> "Find me a laptop under $1,000 on Bizgrid."

The agent can use the exposed tools to:

1. Discover available stores.
2. Search the Bizgrid catalog.
3. Inspect matching products.
4. Identify the appropriate merchant.
5. Add the selected product to that merchant's cart.
6. Read and confirm the cart.
7. Direct the user to the merchant's existing storefront checkout.

The result is a **human-in-the-loop agentic commerce workflow** rather than an isolated AI demo.

---

# 7. Why This Is the Hackathon Contribution

The significance of the submission is not that Bizgrid is a new ecommerce application.

The contribution is that an existing multi-merchant commerce platform has been extended with a **machine-readable, agent-accessible interaction layer**.

The WebMCP implementation turns existing commerce capabilities into discoverable tools that an AI agent can use directly.

This creates a path toward:

* Agent-assisted product discovery
* Conversational shopping
* Cross-merchant product search
* Agent-assisted cart building
* AI-driven commerce workflows
* Human-in-the-loop checkout
* Future autonomous commerce capabilities

In other words, **WebMCP becomes the interface through which AI agents can interact with Bizgrid's commerce ecosystem.**

---

# 8. Live Demonstration

The WebMCP-enabled Bizgrid application is available for evaluation at:

**https://www.bizgrid.shop**

Judges using a WebMCP-capable environment can inspect the site's exposed model-context tools and test the commerce workflow directly.

The repository also contains:

`docs/webmcp-demo-script.md`

which provides a structured demonstration of the implemented WebMCP tool set.

---

# 9. Submission Scope

For clarity, the scope of this submission can be summarized as follows:

### Existing work

**Bizgrid commerce platform**

Merchant onboarding, storefronts, products, orders, carts, payments, AI website building, and the underlying commerce infrastructure.

### Hackathon work

**Bizgrid WebMCP Agent Commerce Layer**

Structured WebMCP tools that allow AI agents to discover stores and products, search the catalog, inspect products, manipulate merchant-specific carts, and transition users toward existing storefront checkout.

### Core innovation

**Making a multi-merchant commerce platform directly accessible to AI agents through WebMCP while preserving the existing human storefront and checkout experience.**
