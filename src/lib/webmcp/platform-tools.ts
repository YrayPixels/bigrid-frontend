import { platformCatalogApi } from "@/lib/api/platform-catalog";
import {
  addToStoreCart,
  cartPathForStore,
  checkoutPathForStore,
  readAllPlatformCarts,
  summarizePlatformCartLines,
} from "@/lib/webmcp/platform-cart";
import {
  parseSelectedOptions,
  summarizePlatformProduct,
  validateAddToCart,
} from "@/lib/webmcp/shared";
import { webMcpJson } from "./model-context";
import type { WebMcpToolDefinition } from "./types";

export function createPlatformWebMcpTools(): WebMcpToolDefinition[] {
  return [
    {
      name: "list_stores",
      description:
        "List published Bizgrid merchant stores. Use before searching when the shopper names a specific shop or industry.",
      inputSchema: {
        type: "object",
        properties: {},
      },
      annotations: { readOnlyHint: true },
      execute: async () => {
        const stores = await platformCatalogApi.listStores();
        return webMcpJson({
          count: stores.length,
          stores: stores.map((store) => ({
            slug: store.slug,
            name: store.business_name,
            industry: store.industry,
            description: store.description,
            storefront_url: store.storefront_url,
          })),
        });
      },
    },
    {
      name: "get_store_info",
      description:
        "Get one Bizgrid store by slug: name, industry, description, storefront URL, and product count.",
      inputSchema: {
        type: "object",
        properties: {
          store_slug: {
            type: "string",
            description: "Store slug from list_stores or search_products.",
          },
        },
        required: ["store_slug"],
      },
      annotations: { readOnlyHint: true },
      execute: async (input) => {
        const storeSlug = String(input.store_slug ?? "").trim();
        if (!storeSlug) {
          return webMcpJson({ error: "store_slug is required." });
        }

        try {
          const store = await platformCatalogApi.getStore(storeSlug);
          return webMcpJson({ store });
        } catch {
          return webMcpJson({ error: `Store not found: "${storeSlug}".` });
        }
      },
    },
    {
      name: "search_products",
      description:
        "Search products across all published Bizgrid stores. Each result includes the store it belongs to so purchases route to the correct shop.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: 'Search phrase, e.g. "vitamin serum" or "ankara dress".',
          },
          store_slug: {
            type: "string",
            description: "Optional store slug to limit search to one merchant.",
          },
          budget_max: {
            type: "number",
            description: "Optional maximum price in store currency. Example: 80000 for ₦80k.",
          },
          limit: {
            type: "number",
            description: "Maximum number of products to return (default 12, max 30).",
          },
        },
        required: ["query"],
      },
      annotations: { readOnlyHint: true },
      execute: async (input) => {
        const query = String(input.query ?? "").trim();
        if (!query) {
          return webMcpJson({ error: "query is required." });
        }

        const hits = await platformCatalogApi.search({
          query,
          store_slug: String(input.store_slug ?? "").trim() || undefined,
          budget_max: Number.isFinite(Number(input.budget_max)) ? Number(input.budget_max) : undefined,
          limit: Number.isFinite(Number(input.limit)) ? Number(input.limit) : undefined,
        });

        return webMcpJson({
          query,
          count: hits.length,
          products: hits.map((hit) => summarizePlatformProduct(hit.store, hit.product)),
        });
      },
    },
    {
      name: "get_product",
      description:
        "Get one product from a specific Bizgrid store. Requires store_slug and product_id from search results.",
      inputSchema: {
        type: "object",
        properties: {
          store_slug: {
            type: "string",
            description: "Store slug that owns the product.",
          },
          product_id: {
            type: "string",
            description: "Product id, slug, or SKU.",
          },
        },
        required: ["store_slug", "product_id"],
      },
      annotations: { readOnlyHint: true },
      execute: async (input) => {
        const storeSlug = String(input.store_slug ?? "").trim();
        const productId = String(input.product_id ?? "").trim();
        if (!storeSlug || !productId) {
          return webMcpJson({ error: "store_slug and product_id are required." });
        }

        try {
          const result = await platformCatalogApi.getProduct(storeSlug, productId);
          return webMcpJson({
            product: summarizePlatformProduct(result.store, result.product),
          });
        } catch {
          return webMcpJson({
            error: `Product not found in store "${storeSlug}": "${productId}".`,
          });
        }
      },
    },
    {
      name: "add_to_cart",
      description:
        "Add a product to the cart for its owning store. Purchases stay scoped to that merchant checkout.",
      inputSchema: {
        type: "object",
        properties: {
          store_slug: {
            type: "string",
            description: "Store slug from search_products / get_product.",
          },
          product_id: {
            type: "string",
            description: "Product id, slug, or SKU from search_products / get_product.",
          },
          quantity: {
            type: "number",
            description: "Units to add (default 1).",
          },
          selected_options: {
            type: "object",
            description: 'Variant choices, e.g. {"Size":"M","Color":"Black"}.',
            additionalProperties: { type: "string" },
          },
        },
        required: ["store_slug", "product_id"],
      },
      annotations: { readOnlyHint: false },
      execute: async (input) => {
        const storeSlug = String(input.store_slug ?? "").trim();
        const productId = String(input.product_id ?? "").trim();
        if (!storeSlug || !productId) {
          return webMcpJson({ error: "store_slug and product_id are required." });
        }

        let result;
        try {
          result = await platformCatalogApi.getProduct(storeSlug, productId);
        } catch {
          return webMcpJson({ error: `Product not found in store "${storeSlug}": "${productId}".` });
        }

        const quantity = Math.max(1, Math.floor(Number(input.quantity) || 1));
        const validation = validateAddToCart(result.product, quantity);
        if (!validation.ok) {
          return webMcpJson({
            error: validation.error,
            product_id: validation.product_id,
          });
        }

        const { options, error } = parseSelectedOptions(result.product, input.selected_options);
        if (error) {
          return webMcpJson({
            error,
            product: summarizePlatformProduct(result.store, result.product),
          });
        }

        const lines = addToStoreCart(result.store.id, result.product, quantity, options);

        return webMcpJson({
          ok: true,
          message: `Added ${quantity} × ${result.product.name} to ${result.store.business_name}'s cart.`,
          store_slug: result.store.slug,
          store_name: result.store.business_name,
          product: summarizePlatformProduct(result.store, result.product, options),
          cart: {
            store_slug: result.store.slug,
            ...summarizePlatformCartLines(lines),
            cart_url: cartPathForStore(result.store.slug),
            checkout_url: checkoutPathForStore(result.store.slug),
          },
        });
      },
    },
    {
      name: "get_cart",
      description:
        "Read all Bizgrid store carts in this browser. Each store has its own cart and checkout.",
      inputSchema: {
        type: "object",
        properties: {
          store_slug: {
            type: "string",
            description: "Optional store slug to read one merchant cart.",
          },
        },
      },
      annotations: { readOnlyHint: true },
      execute: async (input) => {
        const storeSlugFilter = String(input.store_slug ?? "").trim();
        const carts = readAllPlatformCarts();

        if (carts.length === 0) {
          return webMcpJson({ store_count: 0, carts: [] });
        }

        const storeMeta = await platformCatalogApi.listStores().catch(() => []);
        const storeById = new Map(storeMeta.map((store) => [store.id, store]));

        const payload = carts
          .map((cart) => {
            const store = storeById.get(cart.store_id);
            if (!store) {
              return {
                store_id: cart.store_id,
                ...summarizePlatformCartLines(cart.lines),
              };
            }
            if (storeSlugFilter && store.slug !== storeSlugFilter) {
              return null;
            }
            return {
              store_slug: store.slug,
              store_name: store.business_name,
              storefront_url: store.storefront_url,
              cart_url: cartPathForStore(store.slug),
              checkout_url: checkoutPathForStore(store.slug),
              ...summarizePlatformCartLines(cart.lines),
            };
          })
          .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

        return webMcpJson({
          store_count: payload.length,
          carts: payload,
        });
      },
    },
  ];
}
