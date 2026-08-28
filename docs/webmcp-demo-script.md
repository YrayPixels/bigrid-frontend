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

If the **Site tools** menu in the address bar lists your 6 tools but `await document.modelContext.getTools()` returns `[]` in the console, **that is normal in ChatGPT’s built-in browser**. The console often runs in the app shell, not the page frame where tools are registered.

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
- [ ] Console: `await document.modelContext.getTools()` → **6 tools**
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
| **0:15–0:35** | DevTools console | “WebMCP exposes six tools.” Run `getTools()`, briefly scroll the 6 names. |
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
“Six tools: list stores, store info, search, product, cart read, cart write. Platform-wide commerce, merchant-scoped checkout. Bizgrid is live at bizgrid.shop, open source on GitHub.”

---

## What judges must see (checklist in video)

- [ ] URL bar shows **https://www.bizgrid.shop**
- [ ] **`document.modelContext.getTools()`** → 6 tools (names visible)
- [ ] Agent or console calls **`search_products`** with cross-store results
- [ ] Response includes **`store_slug`** per product
- [ ] **`add_to_cart`** succeeds with **`checkout_url`**
- [ ] **Store cart page** shows the item (`/s/.../cart`)
- [ ] Brief mention of **WebMCP** / **`registerTool`**

---

## Submission text (paste into Devpost)

### Why WebMCP is a strong fit

Bizgrid hosts many independent storefronts. WebMCP lets agents query the **entire marketplace** through stable tools instead of fragile UI automation. Each purchase remains tied to the **correct merchant** via `store_slug` and per-store carts.

### Better UX

Shoppers use natural language in ChatGPT; the agent finds products across stores; the human opens one checkout link and pays with Paystack. Faster discovery, less tab-hopping, no copy-pasting bank details in chat.

### What was hard before

Cross-store product search and cart actions required custom integrations per merchant. WebMCP provides a browser-native tool layer on the platform homepage — one implementation, every published store.

### Implementation (brief)

Next.js registers six tools via `document.modelContext.registerTool` on load. Tool handlers call Laravel APIs (`/public/catalog/search`, etc.). `add_to_cart` writes to the same `localStorage` cart keys each storefront already uses, so humans and agents share state.

---

## If something breaks on recording day

| Issue | Fix |
|-------|-----|
| Empty search | Change query; or add `store_slug` filter via Prompt 1 |
| No published stores | Publish demo store; use `/demo` merchant |
| Agent ignores tools | Start prompt with “Use the website's WebMCP tools **only**” |
| Cart empty on store page | Wrong `store_slug`; re-run `add_to_cart` |
| `getTools()` empty | Hard refresh; check `[bizgrid/webmcp] Registered 6 tool(s)` in console |

---

## Suggested video title & description (YouTube)

**Title:** Bizgrid + WebMCP — Agent-native marketplace for African commerce

**Description:**
Demo of WebMCP on https://www.bizgrid.shop — platform-wide product search and per-store cart/checkout. Built for the OpenAI WebMCP Challenge. Tools: list_stores, search_products, get_product, add_to_cart, get_cart, get_store_info.

---

## Optional second angle (15 sec B-roll)

Show **WhatsApp merchant agent** (existing) vs **WebMCP shopper agent** (new):

> “Merchants already manage shops via WhatsApp AI. WebMCP extends that to **buyers** — agents shop; merchants sell; Bizgrid connects both.”

Only include if you have 5 seconds spare; don’t exceed 3:00 total.
