# Prior work vs WebMCP hackathon work

Bizgrid (this merchant app / storefront) is a **pre-existing project**. It existed before the OpenAI WebMCP Challenge Submission Period (**August 25, 2026 – September 3, 2026**).

Per hackathon rules, judges should evaluate **only the WebMCP extension** added during the Submission Period. This document separates prior product work from that new work.

## Prior work (before Aug 25, 2026)

Already in the product before the hackathon (not the judging focus):

- Merchant signup, dashboard, products, orders, billing
- AI storefront / website builder
- Public storefronts (browse, cart, Paystack checkout)
- Platform marketing pages, demo merchant (`/demo`)
- Related backend and admin apps in sibling repositories

Repository history for this frontend begins around **2026-06-07** (pre-Submission Period).

## New work for this hackathon (during Submission Period)

Meaningful WebMCP extension landed **2026-08-28** through **2026-08-30** (within the Submission Period).

### What agents can do (new)

On any page of the live app, a WebMCP-capable browser (ChatGPT in-app browser or Chrome with WebMCP) can call structured tools to:

- List published stores and catalog products across merchants
- Search products platform-wide (`search_products`)
- Inspect a store or product
- Add items to the correct merchant cart and read carts
- Hand off to the human for checkout on that store’s storefront

Human + agent share the same browser cart; the agent does not scrape HTML to shop.

### Code paths to review

| Path | Role |
|------|------|
| `src/lib/webmcp/platform-tools.ts` | Tool definitions (`list_stores`, `list_catalog`, `get_store_info`, `search_products`, `get_product`, `add_to_cart`, `get_cart`) |
| `src/lib/webmcp/bootstrap.ts` | Registers tools via `document.modelContext.registerTool` / `navigator.modelContext` |
| `src/lib/webmcp/model-context.ts` | WebMCP context helpers |
| `src/lib/webmcp/platform-cart.ts` | Per-store cart read/write used by tools |
| `src/lib/webmcp/shared.ts` | Shared product/cart validation helpers |
| `src/lib/webmcp/types.ts` | WebMCP TypeScript types |
| `src/components/webmcp/platform-webmcp-provider.tsx` | App-wide registration provider |
| `src/instrumentation-client.ts` | Early client bootstrap so tools are discoverable before hydration |
| `src/lib/api/platform-catalog.ts` | Public catalog API client used by tools |
| `docs/webmcp-demo-script.md` | Demo script for judges / video |

### Evidence (dated commits)

| Date | Commit | Summary |
|------|--------|---------|
| 2026-08-28 | `4cf16ba` | Integrate `PlatformWebMcpProvider` into app providers |
| 2026-08-28 | `5a4066c` | Streamline WebMCP tool registration and types |
| 2026-08-28 | `bc13c35` | Enhance tool registration and context handling |
| 2026-08-30 | `6103ec4` | Update WebMCP demo script for the full tool set |

Live URL for judging the WebMCP surface: **https://www.bizgrid.shop**
