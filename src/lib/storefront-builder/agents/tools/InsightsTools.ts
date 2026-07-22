import { api } from "@/lib/api/client";
import type { StoreOrderStatus } from "@/lib/api/types";
import type { WebsiteBuilderToolDef } from "../types";
import { asString, requireConfirm } from "./toolHelpers";

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

/** Sales metrics, orders, and improvement suggestions. */
export class InsightsTools {
  static definitions(): WebsiteBuilderToolDef[] {
    return [
      {
        name: "get_store_metrics",
        description:
          "Fetch store performance metrics: total sales, orders, AOV, visits, conversion, products count, and the recent sales-by-day trend. Use when the merchant asks how the store is doing.",
        parameters: { type: "object", properties: {}, additionalProperties: false },
        handler: async (_args, ctx) => {
          try {
            const overview = await api.getDashboardOverview();
            const m = overview.metrics;
            ctx.payload = {
              type: "store_metrics",
              metrics: m,
              sales_by_day: overview.sales_by_day,
              recent_orders: overview.recent_orders,
            };
            ctx.assistantMessage = [
              `Here's a snapshot of your store:`,
              `- Sales: ${m.total_sales.toLocaleString()} across ${m.total_orders} order(s)`,
              `- Average order: ${m.average_order_value.toLocaleString()}`,
              `- Pending: ${m.pending_orders} · Delivered: ${m.delivered_orders ?? m.fulfilled_orders}`,
              `- Visits: ${m.total_visits} (today ${m.visits_today}) · Conversion ${m.conversion_rate}%`,
              `- Products: ${m.products_count}`,
            ].join("\n");
            return { ok: true, metrics: m, sales_by_day: overview.sales_by_day };
          } catch (err) {
            return {
              ok: false,
              error: err instanceof Error ? err.message : "get_store_metrics_failed",
            };
          }
        },
      },
      {
        name: "list_orders",
        description:
          "List recent orders with optional status or search filters. Use before discussing a specific order.",
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
            ctx.assistantMessage =
              rows.length === 0
                ? "No orders matched that filter."
                : `Showing ${rows.length} order(s)${response.meta.total ? ` of ${response.meta.total}` : ""}.`;
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
          "Get full details for one order by order id (from list_orders). Includes line items, customer, and delivery address.",
        parameters: {
          type: "object",
          properties: {
            order_id: { type: "string" },
          },
          required: ["order_id"],
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          const orderId = asString(args.order_id);
          if (!orderId) return { ok: false, error: "missing_order_id" };
          try {
            const order = await api.getOrder(orderId);
            ctx.payload = { type: "order_detail", order };
            ctx.assistantMessage = [
              `Order **${order.order_number}** — ${order.status}`,
              `Customer: ${order.customer_name} (${order.customer_email || order.customer_phone || "no contact"})`,
              `Total: ${order.total_amount.toLocaleString()} ${order.currency}`,
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
        parameters: { type: "object", properties: {}, additionalProperties: false },
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
