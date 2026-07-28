import { api } from "@/lib/api/client";
import type {
  AbandonedRecoveryItem,
  AbandonedRecoverySourceType,
  CreateStoreDiscountInput,
  StoreDiscountStatus,
  StoreDiscountType,
  StoreDiscountValueType,
  UpdateStorePaymentSettingsInput,
} from "@/lib/api/types";
import type { WebsiteBuilderToolDef } from "../types";
import { asNumber, asString, NO_ARG_TOOL_PARAMETERS } from "./toolHelpers";

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

function maskAccount(value: string | null | undefined): string {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length < 4) return value ? "••••" : "not set";
  return `••••${digits.slice(-4)}`;
}

function isDiscountType(value: string): value is StoreDiscountType {
  return value === "product" || value === "cart_threshold" || value === "seasonal";
}

function isDiscountValueType(value: string): value is StoreDiscountValueType {
  return value === "percent" || value === "fixed";
}

function isDiscountStatus(value: string): value is StoreDiscountStatus {
  return value === "active" || value === "draft" || value === "archived";
}

function isRecoverySourceType(value: string): value is AbandonedRecoverySourceType {
  return value === "checkout" || value === "cart";
}

function isRecoveryChannel(value: string): value is "email" | "whatsapp" {
  return value === "email" || value === "whatsapp";
}

async function resolveAbandonedRecoveryItem(args: {
  source_type?: string;
  source_id?: string;
  customer?: string;
}): Promise<
  | { ok: true; item: AbandonedRecoveryItem }
  | { ok: false; error: string; message: string }
> {
  const listed = await api.getAbandonedRecoveries({ page: 1, per_page: 50 });
  const items = listed.items;

  if (!items.length) {
    return {
      ok: false,
      error: "no_abandoned_carts",
      message: "No abandoned carts right now to recover.",
    };
  }

  const sourceType = asString(args.source_type);
  const sourceId = asString(args.source_id);
  if (sourceType && sourceId && isRecoverySourceType(sourceType)) {
    const match = items.find(
      (item) => item.source_type === sourceType && String(item.source_id) === sourceId,
    );
    if (match) return { ok: true, item: match };
    return {
      ok: false,
      error: "abandoned_not_found",
      message: `I couldn't find abandoned ${sourceType} #${sourceId}. Use list_abandoned_carts first.`,
    };
  }

  const customer = asString(args.customer)?.trim();
  if (customer) {
    const lower = customer.toLowerCase();
    const matches = items.filter((item) => {
      const email = item.customer_email?.toLowerCase() ?? "";
      const name = item.customer_name?.toLowerCase() ?? "";
      const phone = item.customer_phone?.replace(/\D/g, "") ?? "";
      const needlePhone = customer.replace(/\D/g, "");
      return (
        email === lower ||
        email.includes(lower) ||
        name.includes(lower) ||
        (needlePhone.length >= 7 && phone.includes(needlePhone))
      );
    });

    if (matches.length === 1) return { ok: true, item: matches[0]! };
    if (matches.length > 1) {
      return {
        ok: false,
        error: "ambiguous_customer",
        message: `I found ${matches.length} abandoned carts matching "${customer}". Tell me which email or use list_abandoned_carts and pass source_type + source_id.`,
      };
    }
    return {
      ok: false,
      error: "abandoned_not_found",
      message: `No abandoned cart matched "${customer}". Use list_abandoned_carts first.`,
    };
  }

  if (items.length === 1) return { ok: true, item: items[0]! };

  return {
    ok: false,
    error: "missing_target",
    message:
      "Tell me which customer (email/name) or pass source_type + source_id from list_abandoned_carts.",
  };
}

function defaultRecoveryChannel(item: AbandonedRecoveryItem): "email" | "whatsapp" | null {
  if (item.customer_email) return "email";
  if (item.customer_phone) return "whatsapp";
  return null;
}

/** Customers, discounts, payments, domains, abandoned carts, traffic. */
export class CommerceTools {
  static definitions(): WebsiteBuilderToolDef[] {
    return [
      {
        name: "list_customers",
        description:
          "List store customers (buyers). Use for who bought from me, find customer by name/email/phone, or browse your customer list.",
        parameters: {
          type: "object",
          properties: {
            search: {
              type: "string",
              description: "Name, email, or phone to search for.",
            },
            page: { type: "number" },
            per_page: { type: "number" },
          },
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          try {
            const response = await api.getCustomers({
              search: asString(args.search) || undefined,
              page: typeof args.page === "number" ? args.page : 1,
              per_page: typeof args.per_page === "number" ? Math.min(args.per_page, 50) : 10,
            });
            const rows = response.data.map((customer) => ({
              id: customer.id,
              name: customer.name,
              email: customer.email,
              phone: customer.phone,
              orders_count: customer.orders_count,
              total_spent: customer.total_spent,
              last_order_at: customer.last_order_at,
            }));

            ctx.payload = { type: "customers_listed", customers: rows, meta: response.meta };
            if (rows.length === 0) {
              ctx.assistantMessage = "No customers matched that search.";
            } else {
              const preview = rows
                .slice(0, 8)
                .map(
                  (customer) =>
                    `- **${customer.name}** · ${customer.email || "no email"} · ${customer.orders_count} order(s) · ${formatMoney(
                      customer.total_spent,
                    )}`,
                )
                .join("\n");
              ctx.assistantMessage =
                `Showing ${rows.length} customer(s)${response.meta.total ? ` of ${response.meta.total}` : ""}:\n${preview}`;
            }
            return { ok: true, customers: rows, meta: response.meta };
          } catch (err) {
            return {
              ok: false,
              error: err instanceof Error ? err.message : "list_customers_failed",
            };
          }
        },
      },
      {
        name: "get_customer",
        description:
          "Get one customer by id (from list_customers) or by email/name search. Includes order history summary.",
        parameters: {
          type: "object",
          properties: {
            customer_id: { type: "string" },
            search: {
              type: "string",
              description: "Email, name, or phone when id is unknown.",
            },
          },
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          try {
            let customerId = asString(args.customer_id);
            const search = asString(args.search);

            if (!customerId && search) {
              const found = await api.getCustomers({ search, per_page: 10, page: 1 });
              const lower = search.toLowerCase();
              const exactEmail = found.data.find((c) => c.email?.toLowerCase() === lower);
              const match =
                exactEmail ??
                (found.data.length === 1
                  ? found.data[0]
                  : found.data.find((c) => c.name.toLowerCase() === lower) ?? null);
              if (!match) {
                return {
                  ok: false,
                  error: "customer_not_found",
                  message:
                    found.data.length > 1
                      ? `I found a few customers matching "${search}". Tell me which email or use list_customers.`
                      : `I couldn't find a customer matching "${search}".`,
                };
              }
              customerId = match.id;
            }

            if (!customerId) return { ok: false, error: "missing_customer_id" };

            const customer = await api.getCustomer(customerId);
            const recent = (customer.orders ?? [])
              .slice(0, 5)
              .map(
                (order) =>
                  `${order.order_number} · ${order.status} · ${formatMoney(order.total_amount, order.currency)}`,
              )
              .join("\n");

            ctx.payload = { type: "customer_detail", customer };
            ctx.assistantMessage = [
              `**${customer.name}**`,
              `Email: ${customer.email || "—"} · Phone: ${customer.phone || "—"}`,
              `Orders: ${customer.orders_count} · Spent: ${formatMoney(customer.total_spent)}`,
              customer.last_order_at ? `Last order: ${customer.last_order_at}` : null,
              recent ? `Recent orders:\n${recent}` : "No order history attached.",
              customer.notes ? `Notes: ${customer.notes}` : null,
            ]
              .filter(Boolean)
              .join("\n");

            return { ok: true, customer };
          } catch (err) {
            return {
              ok: false,
              error: err instanceof Error ? err.message : "get_customer_failed",
            };
          }
        },
      },
      {
        name: "list_discounts",
        description:
          "List store discounts and promos. Use for show my discounts, promo codes, or active offers.",
        parameters: NO_ARG_TOOL_PARAMETERS,
        handler: async (_args, ctx) => {
          try {
            const discounts = await api.listDiscounts();
            ctx.payload = { type: "discounts_listed", discounts };
            if (!discounts.length) {
              ctx.assistantMessage =
                "You don't have any discounts yet. Tell me a percent or fixed amount and I'll create one.";
            } else {
              ctx.assistantMessage = [
                `You have ${discounts.length} discount(s):`,
                ...discounts.slice(0, 12).map((discount) => {
                  const value =
                    discount.discount_type === "percent"
                      ? `${discount.discount_value}% off`
                      : formatMoney(discount.discount_value);
                  return `- **${discount.name}** · ${value} · ${discount.type} · ${discount.status}`;
                }),
              ].join("\n");
            }
            return { ok: true, discounts, count: discounts.length };
          } catch (err) {
            return {
              ok: false,
              error: err instanceof Error ? err.message : "list_discounts_failed",
            };
          }
        },
      },
      {
        name: "create_discount",
        description:
          "Create a discount/promo. Use for make a 10% off code, seasonal sale, cart threshold discount, or product discount. Prefer seasonal + percent for simple sitewide promos.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Promo name, e.g. Summer 10% or WELCOME10" },
            type: {
              type: "string",
              enum: ["product", "cart_threshold", "seasonal"],
              description: "seasonal = sitewide promo; cart_threshold needs min_subtotal; product needs product_ids",
            },
            discount_type: {
              type: "string",
              enum: ["percent", "fixed"],
            },
            discount_value: {
              type: "number",
              description: "Percent (e.g. 10) or fixed currency amount",
            },
            min_subtotal: {
              type: "number",
              description: "Minimum cart total for cart_threshold discounts",
            },
            product_ids: {
              type: "array",
              items: { type: "string" },
              description: "Product ids for product-type discounts",
            },
            status: {
              type: "string",
              enum: ["active", "draft", "archived"],
            },
          },
          required: ["name", "discount_type", "discount_value"],
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          const name = asString(args.name);
          const discountTypeRaw = asString(args.discount_type) || "percent";
          const typeRaw = asString(args.type) || "seasonal";
          const value = asNumber(args.discount_value);
          if (!name) return { ok: false, error: "missing_name" };
          if (!isDiscountValueType(discountTypeRaw)) return { ok: false, error: "invalid_discount_type" };
          if (!isDiscountType(typeRaw)) return { ok: false, error: "invalid_type" };
          if (value === null || value <= 0) return { ok: false, error: "invalid_discount_value" };
          if (discountTypeRaw === "percent" && value > 100) {
            return { ok: false, error: "percent_too_high", message: "Percent discounts must be 100 or less." };
          }

          const statusRaw = asString(args.status) || "active";
          const status = isDiscountStatus(statusRaw) ? statusRaw : "active";
          const productIds = Array.isArray(args.product_ids)
            ? args.product_ids.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
            : [];

          if (typeRaw === "product" && productIds.length === 0) {
            return {
              ok: false,
              error: "product_ids_required",
              message: "Product discounts need at least one product_id. List products first if needed.",
            };
          }

          const body: CreateStoreDiscountInput = {
            name,
            type: typeRaw,
            discount_type: discountTypeRaw,
            discount_value: value,
            status,
            ...(typeRaw === "cart_threshold"
              ? { min_subtotal: asNumber(args.min_subtotal) ?? 0 }
              : {}),
            ...(typeRaw === "product" ? { product_ids: productIds } : {}),
          };

          try {
            const discount = await api.createDiscount(body);
            const label =
              discount.discount_type === "percent"
                ? `${discount.discount_value}% off`
                : formatMoney(discount.discount_value);
            ctx.payload = { type: "discount_created", discount };
            ctx.assistantMessage = `Created **${discount.name}** — ${label} (${discount.type}, ${discount.status}).`;
            return { ok: true, discount };
          } catch (err) {
            return {
              ok: false,
              error: err instanceof Error ? err.message : "create_discount_failed",
            };
          }
        },
      },
      {
        name: "update_discount",
        description:
          "Update an existing discount by id (from list_discounts). Change value, status, name, or schedule.",
        parameters: {
          type: "object",
          properties: {
            discount_id: { type: "string" },
            name: { type: "string" },
            type: { type: "string", enum: ["product", "cart_threshold", "seasonal"] },
            discount_type: { type: "string", enum: ["percent", "fixed"] },
            discount_value: { type: "number" },
            min_subtotal: { type: "number" },
            product_ids: { type: "array", items: { type: "string" } },
            status: { type: "string", enum: ["active", "draft", "archived"] },
          },
          required: ["discount_id"],
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          const discountId = asString(args.discount_id);
          if (!discountId) return { ok: false, error: "missing_discount_id" };

          const body: Record<string, unknown> = {};
          if (asString(args.name)) body.name = asString(args.name);
          const typeRaw = asString(args.type);
          if (typeRaw && isDiscountType(typeRaw)) body.type = typeRaw;
          const discountTypeRaw = asString(args.discount_type);
          if (discountTypeRaw && isDiscountValueType(discountTypeRaw)) body.discount_type = discountTypeRaw;
          const value = asNumber(args.discount_value);
          if (value !== null) body.discount_value = value;
          const minSubtotal = asNumber(args.min_subtotal);
          if (minSubtotal !== null) body.min_subtotal = minSubtotal;
          if (Array.isArray(args.product_ids)) {
            body.product_ids = args.product_ids.filter(
              (id): id is string => typeof id === "string" && id.trim().length > 0,
            );
          }
          const statusRaw = asString(args.status);
          if (statusRaw && isDiscountStatus(statusRaw)) body.status = statusRaw;

          if (Object.keys(body).length === 0) {
            return { ok: false, error: "no_updates", message: "Pass at least one field to update." };
          }

          try {
            const discount = await api.updateDiscount(discountId, body);
            ctx.payload = { type: "discount_updated", discount };
            ctx.assistantMessage = `Updated discount **${discount.name}** (${discount.status}).`;
            return { ok: true, discount };
          } catch (err) {
            return {
              ok: false,
              error: err instanceof Error ? err.message : "update_discount_failed",
            };
          }
        },
      },
      {
        name: "get_payment_settings",
        description:
          "Check Paystack/checkout and payout setup. Use for is Paystack connected, payouts configured, or payment settings status.",
        parameters: NO_ARG_TOOL_PARAMETERS,
        handler: async (_args, ctx) => {
          try {
            const payments = await api.getPaymentSettings();
            ctx.payload = { type: "payment_settings", payments };
            ctx.assistantMessage = [
              `Checkout: ${payments.checkout_enabled ? "enabled" : "disabled"}`,
              `Payouts: ${payments.payouts_configured ? "configured" : "not configured yet"}`,
              payments.payouts_configured
                ? `Bank: ${payments.payout_bank_name || "—"} · Account: ${maskAccount(
                    payments.payout_account_number,
                  )} · Name: ${payments.payout_account_name || "—"}`
                : "Add payout bank details when you're ready to receive settlements.",
            ].join("\n");
            return { ok: true, payments };
          } catch (err) {
            return {
              ok: false,
              error: err instanceof Error ? err.message : "get_payment_settings_failed",
            };
          }
        },
      },
      {
        name: "update_payment_settings",
        description:
          "Update payout bank details (account name, bank name, account number). Use when the merchant wants to set or change payouts. Requires confirm=true.",
        parameters: {
          type: "object",
          properties: {
            payout_account_name: { type: "string" },
            payout_bank_name: { type: "string" },
            payout_account_number: { type: "string" },
            confirm: {
              type: "boolean",
              description: "Required true before saving payout details.",
            },
          },
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          if (args.confirm !== true) {
            return {
              ok: false,
              error: "confirm_required",
              message:
                "Confirm the payout bank name, account name, and account number with the merchant, then call again with confirm=true.",
            };
          }

          const body: UpdateStorePaymentSettingsInput = {};
          if (asString(args.payout_account_name)) body.payout_account_name = asString(args.payout_account_name);
          if (asString(args.payout_bank_name)) body.payout_bank_name = asString(args.payout_bank_name);
          if (asString(args.payout_account_number)) {
            body.payout_account_number = asString(args.payout_account_number);
          }

          if (!body.payout_account_name && !body.payout_bank_name && !body.payout_account_number) {
            return {
              ok: false,
              error: "missing_payout_fields",
              message: "Provide payout_account_name, payout_bank_name, and/or payout_account_number.",
            };
          }

          try {
            const payments = await api.updatePaymentSettings(body);
            ctx.payload = { type: "payment_settings_updated", payments };
            ctx.assistantMessage = payments.payouts_configured
              ? `Payout details saved for **${payments.payout_account_name || "your account"}** at ${
                  payments.payout_bank_name || "your bank"
                } (${maskAccount(payments.payout_account_number)}).`
              : "Payment settings updated.";
            return { ok: true, payments };
          } catch (err) {
            return {
              ok: false,
              error: err instanceof Error ? err.message : "update_payment_settings_failed",
            };
          }
        },
      },
      {
        name: "list_domains",
        description:
          "List custom domains for the store, including verification status and DNS instructions. Use for show my domains or domain status.",
        parameters: NO_ARG_TOOL_PARAMETERS,
        handler: async (_args, ctx) => {
          try {
            const response = await api.getStoreDomains();
            ctx.payload = { type: "domains_listed", ...response };
            if (!response.domains.length) {
              ctx.assistantMessage = [
                `No custom domains yet.`,
                response.meta.subdomain_host
                  ? `Your store subdomain: **${response.meta.subdomain_host}**`
                  : null,
                response.meta.allowed
                  ? `You can add up to ${response.meta.max_domains} custom domain(s).`
                  : "Custom domains may require a plan upgrade.",
              ]
                .filter(Boolean)
                .join("\n");
            } else {
              ctx.assistantMessage = [
                `Domains (${response.meta.used}/${response.meta.max_domains}):`,
                ...response.domains.map((domain) => {
                  const dns = domain.verification;
                  return [
                    `- **${domain.hostname}** · ${domain.status}${domain.is_primary ? " · primary" : ""}`,
                    `  TXT ${dns.txt_host} → ${dns.txt_value} (${dns.txt_verified ? "ok" : "pending"})`,
                    `  CNAME ${dns.cname_host} → ${dns.cname_target} (${dns.cname_verified ? "ok" : "pending"})`,
                  ].join("\n");
                }),
              ].join("\n");
            }
            return { ok: true, domains: response.domains, meta: response.meta };
          } catch (err) {
            return {
              ok: false,
              error: err instanceof Error ? err.message : "list_domains_failed",
            };
          }
        },
      },
      {
        name: "add_domain",
        description:
          "Add a custom domain hostname (e.g. shop.example.com). Returns DNS records the merchant must set. Then use verify_domain after DNS propagates.",
        parameters: {
          type: "object",
          properties: {
            hostname: {
              type: "string",
              description: "Domain or subdomain, e.g. shop.example.com",
            },
          },
          required: ["hostname"],
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          const hostname = asString(args.hostname).toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
          if (!hostname || !hostname.includes(".")) {
            return { ok: false, error: "invalid_hostname", message: "Provide a full hostname like shop.example.com." };
          }

          try {
            const domain = await api.addStoreDomain(hostname);
            const dns = domain.verification;
            ctx.payload = { type: "domain_added", domain };
            ctx.assistantMessage = [
              `Added **${domain.hostname}**. Set these DNS records, then ask me to verify:`,
              `1. TXT host \`${dns.txt_host}\` value \`${dns.txt_value}\``,
              `2. CNAME host \`${dns.cname_host}\` target \`${dns.cname_target}\``,
            ].join("\n");
            return { ok: true, domain };
          } catch (err) {
            return {
              ok: false,
              error: err instanceof Error ? err.message : "add_domain_failed",
            };
          }
        },
      },
      {
        name: "verify_domain",
        description:
          "Check/verify DNS for a custom domain by domain_id (from list_domains) or hostname. Use after the merchant set TXT/CNAME records.",
        parameters: {
          type: "object",
          properties: {
            domain_id: { type: "string" },
            hostname: { type: "string", description: "Hostname if id is unknown" },
          },
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          try {
            let domainId = asString(args.domain_id);
            const hostname = asString(args.hostname).toLowerCase();

            if (!domainId && hostname) {
              const listed = await api.getStoreDomains();
              const match = listed.domains.find((d) => d.hostname.toLowerCase() === hostname);
              if (!match) {
                return {
                  ok: false,
                  error: "domain_not_found",
                  message: `No domain matching "${hostname}". Use list_domains or add_domain first.`,
                };
              }
              domainId = match.id;
            }

            if (!domainId) return { ok: false, error: "missing_domain_id" };

            const domain = await api.verifyStoreDomain(domainId);
            const dns = domain.verification;
            ctx.payload = { type: "domain_verified", domain };
            ctx.assistantMessage =
              domain.status === "verified"
                ? `**${domain.hostname}** is verified${domain.is_primary ? " and primary" : ""}.`
                : [
                    `**${domain.hostname}** is still pending verification.`,
                    `TXT: ${dns.txt_verified ? "ok" : "not verified yet"} · CNAME: ${
                      dns.cname_verified ? "ok" : "not verified yet"
                    }`,
                    "DNS can take a few minutes to hours to propagate — try verify again shortly.",
                  ].join("\n");
            return { ok: true, domain };
          } catch (err) {
            return {
              ok: false,
              error: err instanceof Error ? err.message : "verify_domain_failed",
            };
          }
        },
      },
      {
        name: "list_abandoned_carts",
        description:
          "List abandoned checkouts/carts with recoverable value. Use for who left items in cart, abandoned carts, or recovery opportunities.",
        parameters: {
          type: "object",
          properties: {
            page: { type: "number" },
            per_page: { type: "number" },
          },
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          try {
            const response = await api.getAbandonedRecoveries({
              page: typeof args.page === "number" ? args.page : 1,
              per_page: typeof args.per_page === "number" ? Math.min(args.per_page, 50) : 10,
            });
            const rows = response.items.map((item) => ({
              id: item.id,
              source_type: item.source_type,
              source_id: item.source_id,
              kind: item.kind,
              customer_name: item.customer_name,
              customer_email: item.customer_email,
              customer_phone: item.customer_phone,
              total_amount: item.total_amount,
              currency: item.currency,
              abandoned_at: item.abandoned_at,
              item_count: item.items?.length ?? 0,
              recovery_url: item.recovery_url,
              can_email: Boolean(item.customer_email),
              can_whatsapp: Boolean(item.customer_phone),
            }));

            ctx.payload = {
              type: "abandoned_carts_listed",
              summary: response.summary,
              items: rows,
              meta: response.meta,
            };

            if (!rows.length) {
              ctx.assistantMessage = "No abandoned carts right now.";
            } else {
              const preview = rows
                .slice(0, 8)
                .map(
                  (item) =>
                    `- **${item.customer_name || item.customer_email || "Guest"}** · ${item.kind} · ${formatMoney(
                      item.total_amount,
                      item.currency,
                    )} · ${item.item_count} item(s)${item.can_email ? " · email" : ""}${
                      item.can_whatsapp ? " · WhatsApp" : ""
                    }`,
                )
                .join("\n");
              ctx.assistantMessage = [
                `Abandoned: ${response.summary.total} · Recoverable ~${formatMoney(
                  response.summary.recoverable_value,
                )}`,
                `Checkout ${response.summary.checkout_count} · Cart ${response.summary.cart_count}`,
                preview,
                "I can draft or send a recovery email/WhatsApp — tell me who to reach out to.",
              ].join("\n");
            }

            return { ok: true, summary: response.summary, items: rows, meta: response.meta };
          } catch (err) {
            return {
              ok: false,
              error: err instanceof Error ? err.message : "list_abandoned_carts_failed",
            };
          }
        },
      },
      {
        name: "draft_abandoned_recovery",
        description:
          "Draft an abandoned-cart recovery message (email or WhatsApp). Use when the merchant wants a recovery email/message written, or before send_abandoned_recovery. Identify the cart with source_type+source_id from list_abandoned_carts, or customer email/name.",
        parameters: {
          type: "object",
          properties: {
            source_type: { type: "string", enum: ["checkout", "cart"] },
            source_id: { type: "string", description: "Numeric source id from list_abandoned_carts." },
            customer: {
              type: "string",
              description: "Customer email, name, or phone when source ids are unknown.",
            },
            channel: {
              type: "string",
              enum: ["email", "whatsapp"],
              description: "Defaults to email when the customer has an email, otherwise WhatsApp.",
            },
          },
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          try {
            const resolved = await resolveAbandonedRecoveryItem({
              source_type: asString(args.source_type),
              source_id: asString(args.source_id),
              customer: asString(args.customer),
            });
            if (!resolved.ok) {
              ctx.assistantMessage = resolved.message;
              return { ok: false, error: resolved.error, message: resolved.message };
            }

            const item = resolved.item;
            const requested = asString(args.channel);
            const channel =
              requested && isRecoveryChannel(requested)
                ? requested
                : defaultRecoveryChannel(item);

            if (!channel) {
              const message =
                "This abandoned cart has no email or phone on file, so I can't send a recovery message.";
              ctx.assistantMessage = message;
              return { ok: false, error: "no_contact", message };
            }

            if (channel === "email" && !item.customer_email) {
              const message =
                "No email on file for this customer. Try WhatsApp, or pick another abandoned cart.";
              ctx.assistantMessage = message;
              return { ok: false, error: "no_email", message };
            }

            if (channel === "whatsapp" && !item.customer_phone) {
              const message =
                "No phone on file for this customer. Try email, or pick another abandoned cart.";
              ctx.assistantMessage = message;
              return { ok: false, error: "no_phone", message };
            }

            const { draft } = await api.draftAbandonedRecoveryMessage({
              source_type: item.source_type,
              source_id: String(item.source_id),
              channel,
            });

            const who = item.customer_name || item.customer_email || item.customer_phone || "the customer";
            ctx.payload = {
              type: "abandoned_recovery_draft",
              source_type: item.source_type,
              source_id: item.source_id,
              channel,
              draft,
              customer_name: item.customer_name,
              customer_email: item.customer_email,
              customer_phone: item.customer_phone,
            };
            ctx.assistantMessage = [
              `Draft ${channel} recovery for **${who}** (${formatMoney(item.total_amount, item.currency)}):`,
              channel === "email" && draft.subject ? `**Subject:** ${draft.subject}` : null,
              "",
              draft.message,
              "",
              "Say the word and I'll send it (or tell me what to change first).",
            ]
              .filter((line) => line !== null)
              .join("\n");

            return {
              ok: true,
              source_type: item.source_type,
              source_id: item.source_id,
              channel,
              draft,
            };
          } catch (err) {
            return {
              ok: false,
              error: err instanceof Error ? err.message : "draft_abandoned_recovery_failed",
            };
          }
        },
      },
      {
        name: "send_abandoned_recovery",
        description:
          "Send an abandoned-cart recovery email or WhatsApp message to the customer. Requires confirm=true. Prefer drafting first with draft_abandoned_recovery so the merchant can review. If message is omitted, drafts automatically then sends. Identify with source_type+source_id or customer email/name.",
        parameters: {
          type: "object",
          properties: {
            source_type: { type: "string", enum: ["checkout", "cart"] },
            source_id: { type: "string", description: "Numeric source id from list_abandoned_carts." },
            customer: {
              type: "string",
              description: "Customer email, name, or phone when source ids are unknown.",
            },
            channel: {
              type: "string",
              enum: ["email", "whatsapp"],
              description: "Defaults to email when available.",
            },
            message: {
              type: "string",
              description: "Optional custom body. If omitted, an AI draft is generated and sent.",
            },
            subject: {
              type: "string",
              description: "Optional email subject (email channel only).",
            },
            confirm: {
              type: "boolean",
              description: "Must be true to actually send. Without it, a draft is shown for review.",
            },
          },
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          try {
            const resolved = await resolveAbandonedRecoveryItem({
              source_type: asString(args.source_type),
              source_id: asString(args.source_id),
              customer: asString(args.customer),
            });
            if (!resolved.ok) {
              ctx.assistantMessage = resolved.message;
              return { ok: false, error: resolved.error, message: resolved.message };
            }

            const item = resolved.item;
            const requested = asString(args.channel);
            const channel =
              requested && isRecoveryChannel(requested)
                ? requested
                : defaultRecoveryChannel(item);

            if (!channel) {
              const message =
                "This abandoned cart has no email or phone on file, so I can't send a recovery message.";
              ctx.assistantMessage = message;
              return { ok: false, error: "no_contact", message };
            }

            if (channel === "email" && !item.customer_email) {
              const message =
                "No email on file for this customer. Try WhatsApp, or pick another abandoned cart.";
              ctx.assistantMessage = message;
              return { ok: false, error: "no_email", message };
            }

            if (channel === "whatsapp" && !item.customer_phone) {
              const message =
                "No phone on file for this customer. Try email, or pick another abandoned cart.";
              ctx.assistantMessage = message;
              return { ok: false, error: "no_phone", message };
            }

            let message = asString(args.message)?.trim() || "";
            let subject = asString(args.subject)?.trim() || undefined;

            if (!message || (channel === "email" && !subject)) {
              const { draft } = await api.draftAbandonedRecoveryMessage({
                source_type: item.source_type,
                source_id: String(item.source_id),
                channel,
              });
              if (!message) message = draft.message;
              if (channel === "email" && !subject) subject = draft.subject ?? undefined;
            }

            const who = item.customer_name || item.customer_email || item.customer_phone || "the customer";

            if (args.confirm !== true) {
              ctx.payload = {
                type: "abandoned_recovery_draft",
                source_type: item.source_type,
                source_id: item.source_id,
                channel,
                draft: { subject: subject ?? null, message, recovery_url: item.recovery_url },
                awaiting_confirm: true,
              };
              ctx.assistantMessage = [
                `Ready to send this ${channel} recovery to **${who}**:`,
                channel === "email" && subject ? `**Subject:** ${subject}` : null,
                "",
                message,
                "",
                "Confirm and I'll send it now.",
              ]
                .filter((line) => line !== null)
                .join("\n");
              return {
                ok: false,
                error: "confirmation_required",
                message: "Ask the merchant to confirm sending, then call with confirm=true.",
                source_type: item.source_type,
                source_id: item.source_id,
                channel,
                draft: { subject: subject ?? null, message },
              };
            }

            const result = await api.sendAbandonedRecoveryMessage({
              source_type: item.source_type,
              source_id: String(item.source_id),
              channel,
              message,
              subject: channel === "email" ? subject : undefined,
            });

            ctx.payload = {
              type: "abandoned_recovery_sent",
              source_type: item.source_type,
              source_id: item.source_id,
              channel,
              mode: result.mode,
              whatsapp_url: result.whatsapp_url ?? null,
              outreach: result.outreach ?? null,
            };

            if (result.mode === "link_ready" && result.whatsapp_url) {
              ctx.assistantMessage = [
                `WhatsApp link is ready for **${who}** — open it to finish sending:`,
                result.whatsapp_url,
              ].join("\n");
            } else {
              ctx.assistantMessage =
                channel === "email"
                  ? `Recovery email sent to **${item.customer_email || who}**.`
                  : `WhatsApp recovery message sent to **${who}**.`;
            }

            return {
              ok: true,
              mode: result.mode,
              channel,
              source_type: item.source_type,
              source_id: item.source_id,
              whatsapp_url: result.whatsapp_url ?? null,
            };
          } catch (err) {
            return {
              ok: false,
              error: err instanceof Error ? err.message : "send_abandoned_recovery_failed",
            };
          }
        },
      },
      {
        name: "get_traffic_sources",
        description:
          "Show where store visits come from (Direct, Google, Social, Other). Use for traffic breakdown, where is traffic coming from, or visit sources.",
        parameters: NO_ARG_TOOL_PARAMETERS,
        handler: async (_args, ctx) => {
          try {
            const overview = await api.getDashboardOverview();
            const sources = overview.traffic_sources ?? [];
            const visits = overview.metrics.visits_last_30_days ?? overview.metrics.total_visits;

            ctx.payload = {
              type: "traffic_sources",
              traffic_sources: sources,
              visits_last_30_days: overview.metrics.visits_last_30_days,
              total_visits: overview.metrics.total_visits,
            };

            if (!sources.length) {
              ctx.assistantMessage = `No traffic source breakdown yet (${visits} visit(s) recorded).`;
            } else {
              ctx.assistantMessage = [
                `Traffic sources (last 30 days · ${visits} visit(s)):`,
                ...sources.map((row) => `- **${row.source}**: ${row.count} (${row.percentage}%)`),
              ].join("\n");
            }

            return { ok: true, traffic_sources: sources, visits_last_30_days: visits };
          } catch (err) {
            return {
              ok: false,
              error: err instanceof Error ? err.message : "get_traffic_sources_failed",
            };
          }
        },
      },
    ];
  }
}
