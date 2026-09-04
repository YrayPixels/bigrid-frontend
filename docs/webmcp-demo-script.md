# Bizgrid WebMCP — Demo script (< 3 min)

**Live URL:** https://www.bizgrid.shop  
**Browser:** ChatGPT desktop in-app browser (recommended) or Chrome with `chrome://flags/#enable-webmcp-testing`  
**Deadline note:** Submission closes **Sep 3, 2026, 1:00 pm PT**

---

## One-line pitch (say this in the first 10 seconds)

> “Bizgrid is an AI commerce platform for African sellers. With WebMCP, any agent can search products across every live store on Bizgrid and add to the correct merchant’s cart — without scraping the UI.”

---

## Story you’re telling judges

| Before WebMCP | With Bizgrid + WebMCP |
|---------------|------------------------|
| Agent guesses through HTML, misses Paystack/cart rules | Agent calls structured tools: `search_products`, `add_to_cart` |
| One store at a time | **Platform-wide** search; purchase routes to **that store’s checkout** |
| Human and agent use different paths | Same cart in the browser — human finishes checkout on the store |

**Human + agent together:** Agent finds and carts; human reviews on the storefront and pays.

---

## ChatGPT browser: Site tools vs `getTools()`

If the **Site tools** menu in the address bar lists your 7 tools but `await document.modelContext.getTools()` returns `[]` in the console, **that is normal in ChatGPT’s built-in browser**. The console often runs in the app shell, not the page frame where tools are registered.

**Trust the Site tools menu.** Ask ChatGPT:

```
The Site tools menu shows list_stores and search_products for this page.
Use those site tools directly — do not scrape the HTML and do not rely on getTools() in the console.
First call list_stores, then search_products with query "serum".
```

Or tap a tool in **Available site tools** and ask ChatGPT to run it.

---

## Pre-demo checklist (15 min before recording)

- [ ] Open https://www.bizgrid.shop in WebMCP-enabled browser
- [ ] Console: `await document.modelContext.getTools()` → **7 tools**
- [ ] At least **2 published stores** with **active products** (check `/stores`)
- [ ] Pick a search term you know returns results (test in console):

```javascript
const t = (await document.modelContext.getTools()).find(x => x.name === "search_products");
await document.modelContext.executeTool(t, JSON.stringify({ query: "serum", limit: 5 }));
```

- [ ] Clear test carts: DevTools → Application → Local Storage → delete `storehaus_cart_*` keys (optional)
- [ ] Close extra tabs; Do Not Disturb on; **no copyrighted music**
- [ ] Screen record **whole desktop** or browser window + mic for voiceover

---

## Timeline (2 min 45 sec — leaves buffer under 3:00)

| Time | Visual | Audio / action |
|------|--------|----------------|
| **0:00–0:15** | Bizgrid homepage | Pitch (one-liner above). “I’m on bizgrid.shop — hundreds of African merchants publish here.” |
| **0:15–0:35** | DevTools console | “WebMCP exposes seven tools.” Run `getTools()`, briefly scroll the 7 names. |
| **0:35–1:05** | ChatGPT browser chat **beside** or **over** the site | **Prompt 1** (below). Show agent calling `list_stores` then `search_products`. |
| **1:05–1:35** | Agent result + product cards in chat | **Prompt 2**. Agent calls `get_product` or picks from search. Read aloud store name + price. |
| **1:35–2:05** | Same | **Prompt 3**. Agent calls `add_to_cart`. Highlight `store_slug` and `checkout_url` in response. |
| **2:05–2:35** | Navigate to `/s/{store-slug}/cart` | “Same browser, same cart.” Show item human can checkout with Paystack. |
| **2:35–2:55** | Split: human on cart, agent in chat | **Prompt 4** optional — `get_cart` shows per-store carts. |
| **2:55–3:00** | Homepage or `/stores` | “WebMCP turns Bizgrid into an agent-native marketplace. Open source, live today.” |

---

## Exact agent prompts (copy-paste)

Use **ChatGPT in-app browser** with **www.bizgrid.shop** as the active tab.

### Prompt 1 — Discover the marketplace (~30 sec)

```
You are on Bizgrid, an African commerce platform. Use the website's WebMCP tools only — do not guess from the page HTML.

1. Call list_stores and summarize how many live stores there are.
2. Call search_products with query "[YOUR SEARCH TERM]" and limit 5.
3. For each result, tell me the product name, price, store name, and store_slug.
```

**Replace `[YOUR SEARCH TERM]`** with something that works in your catalog, e.g. `serum`, `dress`, `lip gloss`, `phone`.

### Prompt 2 — Deep dive one product (~20 sec)

```
From the search results, pick the best match. Use get_product with the correct store_slug and product_id. Summarize description, price, variants if any, and the product_url.
```

### Prompt 3 — Agent adds to cart (~25 sec)

```
Add 1 unit of that product to cart using add_to_cart with the correct store_slug and product_id. Then call get_cart and confirm which store's cart it landed in and the checkout_url.
```

### Prompt 4 — Human takes over (~15 sec, optional)

```
I'm going to checkout as a human. What URL should I open to see the cart and pay? Remind me that each Bizgrid store has its own checkout.
```

Then **you** click the cart URL and show Paystack checkout button (don’t need to complete payment on video).

---

## Console-only backup (if agent is slow on camera)

Record this **after** the agent section, or cut in as B-roll:

```javascript
// 1. List stores
let t = (await document.modelContext.getTools()).find(x => x.name === "list_stores");
await document.modelContext.executeTool(t, "{}");

// 2. Search
t = (await document.modelContext.getTools()).find(x => x.name === "search_products");
const search = await document.modelContext.executeTool(
  t,
  JSON.stringify({ query: "serum", limit: 3 })
);
console.log(search);

// 3. Add to cart (replace store_slug + product_id from search JSON)
t = (await document.modelContext.getTools()).find(x => x.name === "add_to_cart");
await document.modelContext.executeTool(
  t,
  JSON.stringify({
    store_slug: "YOUR-STORE-SLUG",
    product_id: "YOUR-PRODUCT-ID",
    quantity: 1,
  })
);
```

---

## Voiceover script (full narration ~2:40)

Read naturally; cut pauses in edit.

---

**[0:00] Hook**  
“This is Bizgrid — AI-powered shops for African sellers. Today we added WebMCP so AI agents can shop the whole platform, not just one website.”

**[0:15] Problem**  
“Normally an agent has to click through every store. On Bizgrid there are many merchants, each with their own catalog and Paystack checkout. Scraping doesn’t scale and it breaks when the UI changes.”

**[0:30] WebMCP**  
“We register tools on the live site with `document.modelContext.registerTool`. The browser exposes search, product details, and add-to-cart — scoped per store.”

**[0:45] Demo start**  
“I’ll ask ChatGPT to use those tools on bizgrid.shop.”

**[0:50–1:30] Agent search** *(while prompts run)*  
“It listed live stores, searched across the marketplace, and returned real products with store names and prices — structured JSON, not screenshots.”

**[1:30–2:05] Add to cart**  
“Now it adds the item to that merchant’s cart. Notice the store_slug — checkout stays with the right seller. That’s important for payouts and delivery.”

**[2:05–2:35] Human handoff**  
“I open the store cart in the same browser. The product is already here. I review and pay — agent discovered, human confirms. That’s the collaboration WebMCP enables.”

**[2:35] Close**  
“Seven tools: list stores, full catalog, store info, search, product, cart read, cart write. Platform-wide commerce, merchant-scoped checkout. Bizgrid is live at bizgrid.shop, open source on GitHub.”

---

## What judges must see (checklist in video)

- [ ] URL bar shows **https://www.bizgrid.shop**
- [ ] **`document.modelContext.getTools()`** → 7 tools (names visible)
- [ ] Agent or console calls **`search_products`** with cross-store results
- [ ] Response includes **`store_slug`** per product
- [ ] **`add_to_cart`** succeeds with **`checkout_url`**
- [ ] **Store cart page** shows the item (`/s/.../cart`)
- [ ] Brief mention of **WebMCP** / **`registerTool`**

---

## Submission text (paste into Devpost)

### Why your use case is a strong fit for WebMCP

Bizgrid is an AI commerce platform hosting many independent African merchant storefronts, each with its own catalog and Paystack checkout. Commerce is inherently structured — stores, products, prices, carts — which maps perfectly onto WebMCP's tool model. Instead of an agent guessing through fragile HTML scraping (which breaks on every UI change and can't know Paystack/cart rules), WebMCP gives agents stable, typed tools to query the **entire marketplace** at once. Crucially, every tool response carries a `store_slug`, so a purchase is always routed to the **correct merchant's** cart and checkout — which matters for real money, payouts, and delivery.

### How it creates a better user experience

A shopper just says what they want in ChatGPT: "find me a serum under $20." The agent searches across every published store, compares real prices and stock, and returns structured results with store names — no tab-hopping between storefronts. When the shopper picks one, the agent adds it to that merchant's cart. The human then opens a single checkout link and pays normally with Paystack — the same cart the agent filled. Discovery becomes conversational, and checkout stays the familiar, trusted storefront flow the human already knows.

### What people and agents can do together that was difficult or impossible before

Platform-wide shopping was impossible before: agents could only operate inside one website at a time, scraping each storefront's HTML, and any cart action required custom per-merchant integrations. With WebMCP, a **single tool layer on the platform homepage exposes every published store**, so one agent can search across merchants, compare options, and fill the correct seller's cart — then hand the same browser cart to a human to review and pay. Agent discovers and carts; human reviews and pays. That division of labor — machine-speed search, human-trusted checkout — didn't exist before WebMCP.

### How we implemented WebMCP

The Bizgrid frontend (Next.js) registers seven tools via `document.modelContext.registerTool` on page load, through an app-wide provider and an early client bootstrap so tools are discoverable before hydration. Tool handlers call the existing Laravel catalog APIs (`/public/catalog/products`, `/public/catalog/search`, etc.):

- `list_stores` — all published stores
- `list_catalog` — a store's full product catalog
- `get_store_info` — store details
- `search_products` — platform-wide product search
- `get_product` — product details by `store_slug` + `product_id`
- `add_to_cart` — add items to the correct merchant's cart
- `get_cart` — read per-store carts

`add_to_cart` writes to the same `localStorage` cart keys each storefront already uses, so agents and humans share one cart and one checkout. Code: `src/lib/webmcp/` (tool definitions, bootstrap, cart helpers, types) plus `src/components/webmcp/platform-webmcp-provider.tsx`.

---

## If something breaks on recording day

| Issue | Fix |
|-------|-----|
| Empty search | Change query; or add `store_slug` filter via Prompt 1 |
| No published stores | Publish demo store; use `/demo` merchant |
| Agent ignores tools | Start prompt with “Use the website's WebMCP tools **only**” |
| **Agent says tools “aren’t callable” / “not available in this chat session”** | Ask: *“Open https://www.bizgrid.shop in your browser, wait for the page to fully load, then check the **Available site tools** menu. The page publishes `list_stores`, `search_products`, `get_product`, `add_to_cart`, `get_cart`, `list_catalog`, `get_store_info` — call them directly. Do not rely on `getTools()` in the console and do not scrape HTML.”* If still empty, hard-refresh the tab and retry once. |
| Cart empty on store page | Wrong `store_slug`; re-run `add_to_cart` |
| `getTools()` empty | Hard refresh; check `[bizgrid/webmcp] Registered 7 tool(s)` in console |

---

## Suggested video title & description (YouTube)

**Title:** Bizgrid + WebMCP — Agent-native marketplace for African commerce

**Description:**
Demo of WebMCP on https://www.bizgrid.shop — platform-wide product catalog/search and per-store cart/checkout. Built for the OpenAI WebMCP Challenge. Tools: list_stores, list_catalog, search_products, get_product, add_to_cart, get_cart, get_store_info.

---

## Optional second angle (15 sec B-roll)

Show **WhatsApp merchant agent** (existing) vs **WebMCP shopper agent** (new):

> “Merchants already manage shops via WhatsApp AI. WebMCP extends that to **buyers** — agents shop; merchants sell; Bizgrid connects both.”

Only include if you have 5 seconds spare; don’t exceed 3:00 total.
