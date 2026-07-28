import { api } from "@/lib/api/client";
import type { MerchantDashboardTopProduct, StoreOrderStatus } from "@/lib/api/types";
import type { WebsiteBuilderToolDef } from "../types";
import { asString, requireConfirm, NO_ARG_TOOL_PARAMETERS } from "./toolHelpers";

const ORDER_STATUSES: StoreOrderStatus[] = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

function isOrderStatus(value: string): value is StoreOrderStatus {
  return (ORDER_STATUSES as string[]).includes(value);
}

function formatMoney(amount: number, currency = "NGN"): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

function formatTopProducts(products: MerchantDashboardTopProduct[]): string {
  if (!products.length) return "No paid sales yet — top sellers will appear once orders come in.";
  return products
    .slice(0, 10)
    .map(
      (product, index) =>
        `${index + 1}. **${product.name}** — ${product.quantity_sold} sold · ${formatMoney(
          product.total_earning,
          product.currency,
        )}`,
    )
    .join("\n");
}

/** Sales metrics, orders, top sellers, and improvement suggestions. */
export class InsightsTools {
  static definitions(): WebsiteBuilderToolDef[] {
    return [
      {
        name: "get_store_metrics",
        description:
          "Fetch store performance: total sales, orders, AOV, visits, conversion, products count, sales-by-day trend, top selling products, traffic sources, and orders by status. Use for 'how is my store doing', sales, revenue, visits, conversion, or a business analytics overview.",
        parameters: NO_ARG_TOOL_PARAMETERS,
        handler: async (_args, ctx) => {
          try {
            const overview = await api.getDashboardOverview();
            const m = overview.metrics;
            const topProducts = overview.top_products ?? [];
            const traffic = overview.traffic_sources ?? [];
            const byStatus = overview.orders_by_status ?? [];

            ctx.payload = {
              type: "store_metrics",
              metrics: m,
              sales_by_day: overview.sales_by_day,
              top_products: topProducts,
              traffic_sources: traffic,
              orders_by_status: byStatus,
              recent_orders: overview.recent_orders,
            };

            const topLines =
              topProducts.length > 0
                ? [
                    ``,
                    `Top sellers:`,
                    ...topProducts.slice(0, 5).map(
                      (product, index) =>
                        `${index + 1}. ${product.name} (${product.quantity_sold} sold, ${formatMoney(
                          product.total_earning,
                          product.currency,
                        )})`,
                    ),
                  ]
                : ["", "Top sellers: none yet (no paid sales recorded)."];

            const statusLine =
              byStatus.length > 0
                ? `Orders by status: ${byStatus.map((row) => `${row.label} ${row.count}`).join(" · ")}`
                : `Pending: ${m.pending_orders} · Delivered: ${m.delivered_orders ?? m.fulfilled_orders}`;

            ctx.assistantMessage = [
              `Here's a snapshot of your store:`,
              `- Sales: ${formatMoney(m.total_sales)} across ${m.total_orders} order(s)`,
              `- Average order: ${formatMoney(m.average_order_value)}`,
              `- ${statusLine}`,
              `- Visits: ${m.total_visits} (today ${m.visits_today}) · Conversion ${m.conversion_rate}%`,
              `- Products: ${m.products_count}`,
              ...topLines,
            ].join("\n");

            return {
              ok: true,
              metrics: m,
              sales_by_day: overview.sales_by_day,
              top_products: topProducts,
              traffic_sources: traffic,
              orders_by_status: byStatus,
              recent_orders: overview.recent_orders,
            };
          } catch (err) {
            return {
              ok: false,
              error: err instanceof Error ? err.message : "get_store_metrics_failed",
            };
          }
        },
      },
      {
        name: "get_top_selling_products",
        description:
          "List top selling products by revenue and units sold. Use when the merchant asks for best sellers, top products, what's selling, or which items earn the most.",
        parameters: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "How many products to return (default 5, max 10).",
            },
          },
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          try {
            const overview = await api.getDashboardOverview();
            const limit =
              typeof args.limit === "number" && Number.isFinite(args.limit)
                ? Math.min(Math.max(Math.round(args.limit), 1), 10)
                : 5;
            const topProducts = (overview.top_products ?? []).slice(0, limit);

            ctx.payload = {
              type: "top_selling_products",
              top_products: topProducts,
              metrics: {
                total_sales: overview.metrics.total_sales,
                total_orders: overview.metrics.total_orders,
              },
            };
            ctx.assistantMessage =
              topProducts.length === 0
                ? "You don't have top sellers yet — once paid orders come in, I'll rank products by revenue here."
                : `Here are your top selling products:\n${formatTopProducts(topProducts)}`;

            return { ok: true, top_products: topProducts, count: topProducts.length };
          } catch (err) {
            return {
              ok: false,
              error: err instanceof Error ? err.message : "get_top_selling_products_failed",
            };
          }
        },
      },
      {
        name: "list_orders",
        description:
          "List recent store orders with optional status or search filters. Use for 'show my orders', pending orders, recent sales, or before discussing a specific order.",
        parameters: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["all", "pending", "processing", "shipped", "delivered", "cancelled"],
            },
            search: { type: "string", description: "Customer name, email, or order number" },
            page: { type: "number" },
            per_page: { type: "number" },
          },
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          try {
            const status = asString(args.status) || "all";
            const response = await api.getOrders({
              status: status === "all" ? undefined : status,
              search: asString(args.search) || undefined,
              page: typeof args.page === "number" ? args.page : 1,
              per_page: typeof args.per_page === "number" ? Math.min(args.per_page, 50) : 10,
            });

            const rows = response.data.map((order) => ({
              id: order.id,
              order_number: order.order_number,
              customer_name: order.customer_name,
              status: order.status,
              payment_status: order.payment_status,
              total_amount: order.total_amount,
              currency: order.currency,
              placed_at: order.placed_at,
              item_count: order.items?.length ?? 0,
            }));

            ctx.payload = {
              type: "orders_listed",
              orders: rows,
              meta: response.meta,
            };

            if (rows.length === 0) {
              ctx.assistantMessage = "No orders matched that filter.";
            } else {
              const preview = rows
                .slice(0, 8)
                .map(
                  (order) =>
                    `- **${order.order_number}** · ${order.customer_name} · ${order.status} · ${formatMoney(
                      order.total_amount,
                      order.currency,
                    )}`,
                )
                .join("\n");
              ctx.assistantMessage =
                `Showing ${rows.length} order(s)${response.meta.total ? ` of ${response.meta.total}` : ""}:\n${preview}` +
                (rows.length > 8 ? `\n…and ${rows.length - 8} more.` : "");
            }

            return { ok: true, orders: rows, meta: response.meta };
          } catch (err) {
            return {
              ok: false,
              error: err instanceof Error ? err.message : "list_orders_failed",
            };
          }
        },
      },
      {
        name: "get_order",
        description:
          "Get full details for one order by order_id (preferred) or order_number. Includes line items, customer, and delivery address.",
        parameters: {
          type: "object",
          properties: {
            order_id: { type: "string", description: "Order id from list_orders." },
            order_number: {
              type: "string",
              description: "Human-facing order number if id is unknown (e.g. ORD-1042).",
            },
          },
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          let orderId = asString(args.order_id);
          const orderNumber = asString(args.order_number);

          try {
            if (!orderId && orderNumber) {
              const found = await api.getOrders({ search: orderNumber, per_page: 10, page: 1 });
              const exact = found.data.find(
                (order) => order.order_number.toLowerCase() === orderNumber.toLowerCase(),
              );
              const match = exact ?? (found.data.length === 1 ? found.data[0] : null);
              if (!match) {
                return {
                  ok: false,
                  error: "order_not_found",
                  message: `I couldn't find an order matching "${orderNumber}". Try list_orders first.`,
                };
              }
              orderId = match.id;
            }

            if (!orderId) return { ok: false, error: "missing_order_id" };

            const order = await api.getOrder(orderId);
            ctx.payload = { type: "order_detail", order };
            ctx.assistantMessage = [
              `Order **${order.order_number}** — ${order.status}`,
              `Customer: ${order.customer_name} (${order.customer_email || order.customer_phone || "no contact"})`,
              `Total: ${formatMoney(order.total_amount, order.currency)}`,
              `Items: ${(order.items ?? []).map((i) => `${i.name} ×${i.quantity}`).join(", ") || "none"}`,
            ].join("\n");
            return { ok: true, order };
          } catch (err) {
            return {
              ok: false,
              error: err instanceof Error ? err.message : "get_order_failed",
            };
          }
        },
      },
      {
        name: "update_order_status",
        description:
          "Update an order status. Safe transitions: pending→processing→shipped→delivered. cancelled on a paid order refunds via Paystack and requires confirm=true.",
        parameters: {
          type: "object",
          properties: {
            order_id: { type: "string" },
            status: {
              type: "string",
              enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
            },
            notes: { type: "string" },
            tracking_number: { type: "string" },
            confirm: {
              type: "boolean",
              description: "Required when status is cancelled.",
            },
          },
          required: ["order_id", "status"],
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          const orderId = asString(args.order_id);
          const status = asString(args.status);
          if (!orderId) return { ok: false, error: "missing_order_id" };
          if (!isOrderStatus(status)) return { ok: false, error: "invalid_status" };

          if (status === "cancelled" && !requireConfirm(args)) {
            return {
              ok: false,
              error: "confirm_required",
              message: `Confirm with the merchant before cancelling an order, then call with confirm=true.`,
            };
          }

          try {
            const result = await api.updateOrderStatus(orderId, {
              status,
              notes: asString(args.notes) || undefined,
              tracking_number: asString(args.tracking_number) || undefined,
              refund: status === "cancelled",
            });
            ctx.payload = { type: "order_status_updated", order: result.order };
            ctx.assistantMessage =
              result.message ||
              `Order **${result.order.order_number}** is now **${result.order.status}**.`;
            return { ok: true, order: result.order };
          } catch (err) {
            return {
              ok: false,
              error: err instanceof Error ? err.message : "update_order_status_failed",
            };
          }
        },
      },
      {
        name: "suggest_site_improvements",
        description:
          "Analyze metrics + catalog gaps and suggest the next best builder actions (does not mutate anything).",
        parameters: NO_ARG_TOOL_PARAMETERS,
        handler: async (_args, ctx) => {
          try {
            const [overview, products, categories] = await Promise.all([
              api.getDashboardOverview().catch(() => null),
              api.getProducts().catch(() => []),
              api.getCategories().catch(() => []),
            ]);

            const suggestions: Array<{ priority: "high" | "medium" | "low"; action: string; reason: string }> =
              [];
            const active = products.filter((p) => (p.status ?? "active") === "active");
            const missingDescriptions = active.filter(
              (p) => !p.description || p.description.trim().length < 20,
            );
            const missingImages = active.filter((p) => !p.image_url);
            const lowStock = active.filter(
              (p) => typeof p.stock_quantity === "number" && p.stock_quantity <= 2,
            );

            if (!ctx.storefront) {
              suggestions.push({
                priority: "high",
                action: "Generate your website draft",
                reason: "No storefront draft exists yet.",
              });
            }
            if (active.length === 0) {
              suggestions.push({
                priority: "high",
                action: "Add your first products",
                reason: "You need active products before customers can buy.",
              });
            }
            if (missingDescriptions.length > 0) {
              suggestions.push({
                priority: "medium",
                action: "Write better product descriptions",
                reason: `${missingDescriptions.length} product(s) have weak or empty descriptions.`,
              });
            }
            if (missingImages.length > 0) {
              suggestions.push({
                priority: "medium",
                action: "Add product photos",
                reason: `${missingImages.length} product(s) are missing images.`,
              });
            }
            if (categories.length === 0 && active.length > 3) {
              suggestions.push({
                priority: "medium",
                action: "Create categories and link Essentials",
                reason: "Categories help shoppers browse as your catalog grows.",
              });
            }
            if (lowStock.length > 0) {
              suggestions.push({
                priority: "medium",
                action: "Restock low-inventory items",
                reason: `${lowStock.length} product(s) have 2 or fewer in stock.`,
              });
            }
            if (overview && overview.metrics.pending_orders > 0) {
              suggestions.push({
                priority: "high",
                action: "Review pending orders",
                reason: `${overview.metrics.pending_orders} order(s) still pending.`,
              });
            }
            if (overview && overview.metrics.conversion_rate < 1 && overview.metrics.total_visits > 20) {
              suggestions.push({
                priority: "low",
                action: "Improve homepage hero and product clarity",
                reason: "Visits are coming in but conversion is low.",
              });
            }
            if (!ctx.session.store?.contact_email && !ctx.session.store?.contact_phone) {
              suggestions.push({
                priority: "medium",
                action: "Add contact email or phone",
                reason: "Customers need a way to reach you.",
              });
            }
            if (suggestions.length === 0) {
              suggestions.push({
                priority: "low",
                action: "Publish or polish SEO",
                reason: "Basics look solid — refine copy/SEO or publish if you haven't already.",
              });
            }

            suggestions.sort((a, b) => {
              const rank = { high: 0, medium: 1, low: 2 };
              return rank[a.priority] - rank[b.priority];
            });

            ctx.payload = {
              type: "site_improvements_suggested",
              suggestions,
              metrics: overview?.metrics ?? null,
            };
            ctx.assistantMessage = [
              "Suggested next steps:",
              ...suggestions
                .slice(0, 5)
                .map((s, i) => `${i + 1}. (${s.priority}) ${s.action} — ${s.reason}`),
            ].join("\n");
            return { ok: true, suggestions };
          } catch (err) {
            return {
              ok: false,
              error: err instanceof Error ? err.message : "suggest_site_improvements_failed",
            };
          }
        },
      },
    ];
  }
}
