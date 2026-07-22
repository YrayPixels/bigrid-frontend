import { getStoreSubdomainHost } from "@/lib/store-host";
import { BUILDER_WELCOME_MESSAGE } from "@/lib/storefront-builder/copy";
import { fallbackSuggestedActions } from "@/lib/storefront-builder/suggested-actions";
import {
  applyBrandColorToStorefront,
  applyMediaToStorefront,
  applyStockImagesFromMessage,
  applyStorefrontEdit,
  extractColorFromMessage,
  isBuildIntent,
  isColorIntent,
  isDesignChangeIntent,
  isEditIntent,
  isProductIntent,
  isStockImageIntent,
  resolveTemplateFromMessage,
} from "@/lib/storefront-builder/local-ai";
import { colorPresetActions } from "@/lib/storefront-builder/suggested-actions";
import { describeStorefrontEdit } from "@/lib/storefront-builder/edit-summary";
import { ensureHomeBlocksOnStorefront } from "@/lib/storefront/blocks/sync-legacy";
import { STOREFRONT_TEMPLATE_OPTIONS } from "./types";
import type {
  AuthResponse,
  BuilderBusinessProfile,
  BuilderMessage,
  BuilderSession,
  BuilderSessionResponse,
  BuilderSessionStatus,
  CreateStoreOrderInput,
  CreateStoreInput,
  Industry,
  MerchantDashboardOverview,
  PublicStorefront,
  PublishedStorefrontIndexEntry,
  RecommendStorefrontTemplatesInput,
  Store,
  StoreCategory,
  CreateCategoryInput,
  UpdateCategoryInput,
  StoreOrder,
  StoreOrdersResponse,
  StoreOrderStatus,
  StoreProduct,
  StoreDomain,
  StoreDomainsResponse,
  StorefrontContent,
  StorefrontDraftResponse,
  StorefrontPublishState,
  PublishStorefrontResponse,
  ProductImportReport,
  StorefrontTemplateId,
  StorefrontTemplateOption,
  UpdateStoreInput,
  UpdateStorefrontInput,
  BillingCheckoutResponse,
  BillingPortalResponse,
  BillingSubscriptionResponse,
  BillingAddOnPack,
  BillingPlanOption,
  MerchantSubscription,
  MerchantSubscriptionUsage,
  SubscriptionPlanId,
  User,
} from "./types";

const STORAGE_KEY = "storehaus_mock_db_v1";

const mockStoreDomains: Record<string, StoreDomain[]> = {};

type MockDB = {
  users: Record<string, { user: User; password: string; verification_code?: string }>;
  stores: Record<string, Store>;
  storefronts: Record<string, StorefrontContent>;
  publishedStorefronts: Record<string, StorefrontContent>;
  products: Record<string, StoreProduct[]>;
  categories: Record<string, StoreCategory[]>;
  orders: Record<string, StoreOrder[]>;
  visits: Record<
    string,
    { session_id?: string; path?: string; referrer?: string; visited_at: string }[]
  >;
  contact_inquiries?: Record<
    string,
    { block_id?: string | null; fields: Record<string, string>; submitted_at: string }[]
  >;
  product_reviews?: Record<
    string,
    {
      id: string;
      product_id: string;
      author_name: string;
      author_email?: string | null;
      rating: number;
      body: string;
      status: string;
      created_at: string;
    }[]
  >;
  sessions: Record<string, string>;
  builderSessions: Record<string, BuilderSession>;
};

function emptyDb(): MockDB {
  return {
    users: {},
    stores: {},
    storefronts: {},
    publishedStorefronts: {},
    products: {},
    categories: {},
    orders: {},
    visits: {},
    sessions: {},
    builderSessions: {},
  };
}

function load(): MockDB {
  if (typeof window === "undefined") return emptyDb();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyDb();
  try {
    const db = JSON.parse(raw) as Partial<MockDB>;
    return {
      users: db.users ?? {},
      stores: db.stores ?? {},
      storefronts: db.storefronts ?? {},
      publishedStorefronts: db.publishedStorefronts ?? {},
      products: db.products ?? {},
      categories: db.categories ?? {},
      orders: db.orders ?? {},
      visits: db.visits ?? {},
      sessions: db.sessions ?? {},
      builderSessions: db.builderSessions ?? {},
    };
  } catch {
    return emptyDb();
  }
}

function save(db: MockDB) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function findStoreForToken(token: string): { db: MockDB; store: Store } {
  const db = load();
  const userId = db.sessions[token];
  if (!userId) throw { status: 401, message: "Unauthenticated" };
  const store = db.stores[userId];
  if (!store) throw { status: 404, message: "Store not found" };
  return { db, store };
}

function formatCategory(db: MockDB, storeId: string, category: StoreCategory): StoreCategory {
  const products = db.products[storeId] ?? [];
  const parent = category.parent_id
    ? (db.categories[storeId] ?? []).find((entry) => entry.id === category.parent_id)
    : null;

  return {
    ...category,
    parent_name: parent?.name ?? null,
    products_count: products.filter((product) => product.category_id === category.id).length,
  };
}

function resolveMockProductCategory(
  db: MockDB,
  storeId: string,
  body: Partial<StoreProduct>,
): Partial<StoreProduct> {
  if (body.category_id !== undefined) {
    if (!body.category_id) {
      return { category_id: null, category: undefined };
    }

    const category = (db.categories[storeId] ?? []).find((entry) => entry.id === body.category_id);
    return { category_id: body.category_id, category: category?.name };
  }

  if (body.category !== undefined) {
    const name = body.category.trim();
    if (!name) {
      return { category_id: null, category: undefined };
    }

    let category = (db.categories[storeId] ?? []).find(
      (entry) => entry.name.toLowerCase() === name.toLowerCase(),
    );

    if (!category) {
      category = {
        id: uid(),
        name,
        slug: slugify(name),
        parent_id: null,
        sort_order: db.categories[storeId]?.length ?? 0,
      };
      db.categories[storeId] = [...(db.categories[storeId] ?? []), category];
    }

    return { category_id: category.id, category: category.name };
  }

  return {};
}

function byLatestOrder(a: StoreOrder, b: StoreOrder) {
  return (
    new Date(b.placed_at ?? b.created_at ?? 0).getTime() -
    new Date(a.placed_at ?? a.created_at ?? 0).getTime()
  );
}

function mergeProductsIntoStorefront(
  storefront: StorefrontContent | null,
  products: StoreProduct[],
): StorefrontContent | null {
  if (!storefront) return null;
  const next: StorefrontContent = { ...storefront, products };
  if (products.length > 0) {
    next.data_plugs = {
      ...(next.data_plugs ?? {}),
      home_products_source: "merchant_products",
    };
  }
  return next;
}

function publishedStorefrontForStore(db: MockDB, storeId: string): StorefrontContent | null {
  const storefront = db.publishedStorefronts[storeId] ?? null;
  const products = db.products[storeId] ?? [];
  return mergeProductsIntoStorefront(storefront, products);
}

function publishMetaForStore(db: MockDB, store: Store): StorefrontPublishState {
  const draft = db.storefronts[store.id] ?? null;
  const published = db.publishedStorefronts[store.id] ?? null;
  const isPublished = store.status === "published" && published !== null;
  const hasUnpublishedChanges = !isPublished
    ? draft !== null
    : JSON.stringify(draft) !== JSON.stringify(published);

  return {
    status: store.status ?? "draft",
    published_at: store.published_at ?? null,
    is_published: isPublished,
    has_unpublished_changes: hasUnpublishedChanges,
  };
}

function withPublishFields(db: MockDB, store: Store): Store {
  const meta = publishMetaForStore(db, store);
  return { ...store, ...meta };
}

function storefrontForStore(db: MockDB, storeId: string): StorefrontContent | null {
  const storefront = db.storefronts[storeId] ?? null;
  const products = db.products[storeId] ?? [];
  return mergeProductsIntoStorefront(storefront, products);
}

function uid() {
  return crypto.randomUUID();
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function delay(ms = 600) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const mockApi = {
  async getStorefrontTemplates(): Promise<StorefrontTemplateOption[]> {
    await delay(100);
    return STOREFRONT_TEMPLATE_OPTIONS.filter((option) => option.value !== "ai_pick");
  },

  async recommendStorefrontTemplates(
    body: RecommendStorefrontTemplatesInput,
  ): Promise<{
    recommendations: { template_id: StorefrontTemplateId; score: number; reason: string }[];
  }> {
    await delay(180);
    return {
      recommendations: recommendTemplates(body).slice(0, body.limit ?? 4),
    };
  },

  async register(body: { name: string; email: string; password: string }): Promise<AuthResponse> {
    await delay(500);
    const db = load();
    const existing = Object.values(db.users).find((u) => u.user.email === body.email);
    if (existing) throw { status: 422, message: "Email already registered" };
    const user: User = {
      id: uid(),
      name: body.name,
      email: body.email,
      email_verified_at: null,
      has_store: false,
    };
    db.users[user.id] = {
      user,
      password: body.password,
      verification_code: "123456",
    };
    const token = `mock_${uid()}`;
    db.sessions[token] = user.id;
    save(db);
    return { token, user };
  },

  async login(body: { email: string; password: string; remember?: boolean }): Promise<AuthResponse> {
    await delay(400);
    const db = load();
    const match = Object.values(db.users).find(
      (u) => u.user.email === body.email && u.password === body.password,
    );
    if (!match) throw { status: 401, message: "Invalid credentials" };
    const token = `mock_${uid()}`;
    db.sessions[token] = match.user.id;
    match.user.has_store = !!db.stores[match.user.id];
    save(db);
    return { token, user: match.user };
  },

  async requestPasswordReset(body: { email: string }): Promise<{ message: string }> {
    await delay(250);
    // Always respond with same message to avoid leaking account existence.
    const db = load();
    const match = Object.values(db.users).find((u) => u.user.email === body.email);
    if (match) {
      // store the "code" on the user record in-memory for the reset step
      (match.user as unknown as { verification_code?: string }).verification_code = "123456";
      db.users[match.user.id] = { ...db.users[match.user.id], user: match.user };
      save(db);
    }
    return { message: "If that account exists, a reset code was sent." };
  },

  async resetPasswordWithCode(body: {
    email: string;
    code: string;
    password: string;
  }): Promise<{ message: string }> {
    await delay(300);
    const db = load();
    const matchEntry = Object.values(db.users).find((u) => u.user.email === body.email);
    if (!matchEntry) throw { status: 401, message: "Invalid reset code" };
    const expected = (matchEntry.user as unknown as { verification_code?: string }).verification_code;
    if (!expected || body.code !== expected) throw { status: 401, message: "Invalid reset code" };
    db.users[matchEntry.user.id] = { user: matchEntry.user, password: body.password };
    // revoke all sessions for that user
    for (const [token, userId] of Object.entries(db.sessions)) {
      if (userId === matchEntry.user.id) delete db.sessions[token];
    }
    save(db);
    return { message: "Password updated. You can sign in now." };
  },

  async logout(token: string) {
    await delay(150);
    const db = load();
    delete db.sessions[token];
    save(db);
  },

  async verifyEmail(
    token: string,
    body: { code: string },
  ): Promise<{ message: string; user: User }> {
    await delay(250);
    const db = load();
    const userId = db.sessions[token];
    if (!userId) throw { status: 401, message: "Unauthenticated" };
    const record = db.users[userId];
    if (!record) throw { status: 401, message: "Unauthenticated" };
    if (record.user.email_verified_at) {
      return { message: "Email already verified.", user: record.user };
    }
    const expected =
      (record as { verification_code?: string }).verification_code ??
      (record.user as unknown as { verification_code?: string }).verification_code ??
      "123456";
    if (body.code !== expected) {
      throw { status: 422, message: "Invalid or expired verification code." };
    }
    record.user.email_verified_at = new Date().toISOString();
    delete (record as { verification_code?: string }).verification_code;
    save(db);
    return { message: "Email verified.", user: record.user };
  },

  async resendEmailVerification(token: string): Promise<{ message: string; user?: User }> {
    await delay(200);
    const db = load();
    const userId = db.sessions[token];
    if (!userId) throw { status: 401, message: "Unauthenticated" };
    const record = db.users[userId];
    if (!record) throw { status: 401, message: "Unauthenticated" };
    if (record.user.email_verified_at) {
      return { message: "Email already verified.", user: record.user };
    }
    (record as { verification_code?: string }).verification_code = "123456";
    save(db);
    return { message: "Verification code sent." };
  },

  async me(token: string): Promise<{ user: User }> {
    await delay(150);
    const db = load();
    const userId = db.sessions[token];
    if (!userId) throw { status: 401, message: "Unauthenticated" };
    const record = db.users[userId];
    if (!record) throw { status: 401, message: "Unauthenticated" };
    record.user.has_store = !!db.stores[userId];
    return { user: record.user };
  },

  async createStore(token: string, body: CreateStoreInput): Promise<{ store: Store }> {
    await delay(700);
    const db = load();
    const userId = db.sessions[token];
    if (!userId) throw { status: 401, message: "Unauthenticated" };
    const slug = body.slug ? slugify(body.slug) : slugify(body.business_name);
    const store: Store = {
      id: uid(),
      slug,
      subdomain: slug,
      subdomain_host: getStoreSubdomainHost(slug),
      primary_domain: getStoreSubdomainHost(slug),
      storefront_template_id: body.storefront_template_id ?? "minimalistic",
      status: "draft",
      published_at: null,
      subscription_plan: "starter",
      subscription_status: "trialing",
      ...body,
    };
    db.stores[userId] = store;
    if (db.users[userId]) db.users[userId].user.has_store = true;
    save(db);
    return { store: withPublishFields(db, store) };
  },

  async getMyStore(token: string): Promise<{ store: Store | null }> {
    await delay(200);
    const db = load();
    const userId = db.sessions[token];
    if (!userId) throw { status: 401, message: "Unauthenticated" };
    const store = db.stores[userId] ?? null;
    return { store: store ? withPublishFields(db, store) : null };
  },

  async getDashboardOverview(token: string): Promise<MerchantDashboardOverview> {
    await delay(250);
    const { db, store } = findStoreForToken(token);
    const orders = db.orders[store.id] ?? [];
    const visits = db.visits[store.id] ?? [];
    const activeOrders = orders.filter(
      (order) => order.status !== "cancelled" && order.payment_status !== "refunded",
    );
    const totalSales = activeOrders.reduce((sum, order) => sum + order.total_amount, 0);
    const today = new Date().toISOString().slice(0, 10);
    const thirtyDaysAgoDate = new Date();
    thirtyDaysAgoDate.setDate(thirtyDaysAgoDate.getDate() - 29);
    const thirtyDaysAgo = thirtyDaysAgoDate.toISOString().slice(0, 10);
    const salesByDay = Array.from({ length: 30 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - index));
      const key = date.toISOString().slice(0, 10);
      const dayOrders = activeOrders.filter((order) => order.placed_at?.slice(0, 10) === key);
      return {
        date: key,
        orders: dayOrders.length,
        sales: dayOrders.reduce((sum, order) => sum + order.total_amount, 0),
      };
    });

    const productMap = new Map<
      string,
      {
        product_id: string;
        name: string;
        image_url?: string | null;
        unit_price: number;
        currency: string;
        quantity_sold: number;
        total_earning: number;
      }
    >();
    for (const order of activeOrders) {
      for (const item of order.items ?? []) {
        const key = item.product_id || item.name;
        const existing = productMap.get(key) ?? {
          product_id: item.product_id,
          name: item.name,
          image_url: item.image_url ?? null,
          unit_price: item.unit_price,
          currency: item.currency,
          quantity_sold: 0,
          total_earning: 0,
        };
        existing.quantity_sold += item.quantity;
        existing.total_earning += item.total;
        productMap.set(key, existing);
      }
    }
    const topProducts = [...productMap.values()]
      .sort((a, b) => b.total_earning - a.total_earning)
      .slice(0, 5);

    return {
      metrics: {
        total_orders: orders.length,
        pending_orders: orders.filter((order) => order.status === "pending").length,
        processing_orders: orders.filter((order) => order.status === "processing").length,
        shipped_orders: orders.filter((order) => order.status === "shipped").length,
        delivered_orders: orders.filter((order) => order.status === "delivered").length,
        fulfilled_orders: orders.filter((order) => order.status === "delivered").length,
        cancelled_orders: orders.filter((order) => order.status === "cancelled").length,
        total_sales: totalSales,
        average_order_value: orders.length ? totalSales / orders.length : 0,
        total_visits: visits.length,
        visits_today: visits.filter((visit) => visit.visited_at.slice(0, 10) === today).length,
        visits_last_30_days: visits.filter((visit) => visit.visited_at.slice(0, 10) >= thirtyDaysAgo).length,
        conversion_rate: visits.length
          ? Number(((orders.length / visits.length) * 100).toFixed(2))
          : 0,
        products_count: (db.products[store.id] ?? []).length,
      },
      sales_by_day: salesByDay,
      top_products: topProducts,
      traffic_sources: [
        { source: "Direct", count: Math.max(visits.length, 1), percentage: 100 },
      ],
      orders_by_status: [
        {
          status: "pending",
          label: "Pending",
          count: orders.filter((order) => order.status === "pending").length,
        },
        {
          status: "processing",
          label: "Processing",
          count: orders.filter((order) => order.status === "processing").length,
        },
        {
          status: "shipped",
          label: "Shipped",
          count: orders.filter((order) => order.status === "shipped").length,
        },
        {
          status: "delivered",
          label: "Delivered",
          count: orders.filter((order) => order.status === "delivered").length,
        },
      ],
      recent_orders: [...orders].sort(byLatestOrder).slice(0, 5),
    };
  },

  async getOrders(
    token: string,
    filters: {
      status?: string;
      payment_status?: string;
      search?: string;
      page?: number;
      per_page?: number;
    } = {},
  ): Promise<StoreOrdersResponse> {
    await delay(250);
    const { db, store } = findStoreForToken(token);
    const search = filters.search?.trim().toLowerCase();
    let orders = [...(db.orders[store.id] ?? [])].sort(byLatestOrder);
    if (filters.status && filters.status !== "all") {
      orders = orders.filter((order) => order.status === filters.status);
    }
    if (filters.payment_status && filters.payment_status !== "all") {
      orders = orders.filter((order) => order.payment_status === filters.payment_status);
    }
    if (search) {
      orders = orders.filter((order) =>
        [order.order_number, order.customer_name, order.customer_email, order.customer_phone]
          .join(" ")
          .toLowerCase()
          .includes(search),
      );
    }

    const perPage = filters.per_page ?? 20;
    const page = filters.page ?? 1;
    const start = (page - 1) * perPage;

    return {
      data: orders.slice(start, start + perPage),
      meta: {
        current_page: page,
        last_page: Math.max(1, Math.ceil(orders.length / perPage)),
        per_page: perPage,
        total: orders.length,
      },
    };
  },

  async getOrder(token: string, orderId: string): Promise<StoreOrder> {
    await delay(150);
    const { db, store } = findStoreForToken(token);
    const order = (db.orders[store.id] ?? []).find((entry) => entry.id === orderId);
    if (!order) throw { status: 404, message: "Order not found" };
    return order;
  },

  async updateOrderStatus(
    token: string,
    orderId: string,
    body: {
      status: StoreOrderStatus | "fulfilled" | "refunded";
      notes?: string;
      tracking_number?: string | null;
      refund?: boolean;
    },
  ): Promise<{ order: StoreOrder; message: string }> {
    await delay(200);
    const { db, store } = findStoreForToken(token);
    const orders = db.orders[store.id] ?? [];
    const order = orders.find((entry) => entry.id === orderId);
    if (!order) throw { status: 404, message: "Order not found" };

    let nextStatus = body.status as string;
    if (nextStatus === "fulfilled") nextStatus = "delivered";
    if (nextStatus === "refunded") nextStatus = "cancelled";

    order.status = nextStatus as StoreOrderStatus;
    if (body.notes !== undefined) order.notes = body.notes ?? order.notes;
    if (body.tracking_number !== undefined) {
      order.tracking_number = body.tracking_number;
    }
    if (nextStatus === "shipped") {
      order.shipped_at = order.shipped_at ?? new Date().toISOString();
    }
    if (nextStatus === "cancelled" && (body.refund || order.payment_status === "paid")) {
      order.payment_status = "refunded";
      order.settlement_status = "refunded";
    }
    order.updated_at = new Date().toISOString();
    save(db);
    return { order, message: "Order updated." };
  },

  async generateStorefront(
    token: string,
    body: { store_id: string; storefront_template_id?: StorefrontTemplateId },
  ): Promise<StorefrontDraftResponse & { generation_id: string }> {
    await delay(2200);
    const db = load();
    const userId = db.sessions[token];
    if (!userId) throw { status: 401, message: "Unauthenticated" };
    const store = db.stores[userId];
    if (!store || store.id !== body.store_id) throw { status: 404, message: "Store not found" };
    if (body.storefront_template_id) {
      store.storefront_template_id = body.storefront_template_id;
    }
    const storefront = synthesizeStorefront(store);
    db.storefronts[store.id] = storefront;
    save(db);
    return {
      generation_id: uid(),
      storefront: storefrontForStore(db, store.id)!,
      publish: publishMetaForStore(db, store),
    };
  },

  async getStorefront(token: string, storeId: string): Promise<StorefrontDraftResponse> {
    await delay(150);
    const db = load();
    const userId = db.sessions[token];
    if (!userId) throw { status: 401, message: "Unauthenticated" };
    const store = db.stores[userId];
    if (!store || store.id !== storeId) throw { status: 404, message: "Store not found" };
    return {
      storefront: storefrontForStore(db, storeId),
      publish: publishMetaForStore(db, store),
    };
  },

  async updateStorefront(
    token: string,
    storeId: string,
    body: UpdateStorefrontInput,
  ): Promise<StorefrontDraftResponse> {
    await delay(400);
    const db = load();
    const userId = db.sessions[token];
    if (!userId) throw { status: 401, message: "Unauthenticated" };
    const store = db.stores[userId];
    if (!store || store.id !== storeId) throw { status: 404, message: "Store not found" };

    if (body.storefront_template_id) {
      store.storefront_template_id = body.storefront_template_id;
    }

    const { products: _ignored, ...storefrontWithoutProducts } = body.storefront;
    db.storefronts[storeId] = storefrontWithoutProducts;
    save(db);
    return {
      storefront: storefrontForStore(db, storeId)!,
      publish: publishMetaForStore(db, store),
    };
  },

  async publishStorefront(token: string, storeId: string): Promise<PublishStorefrontResponse> {
    await delay(500);
    const db = load();
    const userId = db.sessions[token];
    if (!userId) throw { status: 401, message: "Unauthenticated" };
    const record = db.users[userId];
    if (record && !record.user.email_verified_at) {
      throw { status: 403, message: "Verify your email before publishing your storefront.", code: "email_unverified" };
    }
    const store = db.stores[userId];
    if (!store || store.id !== storeId) throw { status: 404, message: "Store not found" };
    const draft = db.storefronts[storeId];
    if (!draft) throw { status: 422, message: "Create a storefront draft before publishing." };

    db.publishedStorefronts[storeId] = draft;
    store.status = "published";
    store.published_at = new Date().toISOString();
    save(db);

    return {
      store: withPublishFields(db, store),
      storefront: publishedStorefrontForStore(db, storeId),
      publish: publishMetaForStore(db, store),
      message: "Your storefront is live.",
    };
  },

  async getProducts(token: string): Promise<StoreProduct[]> {
    await delay(150);
    const { db, store } = findStoreForToken(token);
    return db.products[store.id] ?? [];
  },

  async getCategories(token: string): Promise<StoreCategory[]> {
    await delay(150);
    const { db, store } = findStoreForToken(token);
    return (db.categories[store.id] ?? []).map((category) => formatCategory(db, store.id, category));
  },

  async createCategory(token: string, body: CreateCategoryInput): Promise<StoreCategory> {
    await delay(200);
    const { db, store } = findStoreForToken(token);
    const name = body.name.trim();
    if (!name) throw { status: 422, message: "Category name is required." };

    const category: StoreCategory = {
      id: uid(),
      name,
      slug: body.slug ? slugify(body.slug) : slugify(name),
      parent_id: body.parent_id ?? null,
      sort_order: body.sort_order ?? (db.categories[store.id]?.length ?? 0),
    };

    db.categories[store.id] = [...(db.categories[store.id] ?? []), category];
    save(db);
    return formatCategory(db, store.id, category);
  },

  async updateCategory(
    token: string,
    categoryId: string,
    body: UpdateCategoryInput,
  ): Promise<StoreCategory> {
    await delay(200);
    const { db, store } = findStoreForToken(token);
    const categories = db.categories[store.id] ?? [];
    const index = categories.findIndex((entry) => entry.id === categoryId);
    if (index === -1) throw { status: 404, message: "Category not found" };

    const current = categories[index];
    const updated: StoreCategory = {
      ...current,
      ...body,
      name: body.name !== undefined ? body.name.trim() : current.name,
      slug:
        body.slug !== undefined
          ? slugify(body.slug)
          : body.name !== undefined
            ? slugify(body.name)
            : current.slug,
    };

    categories[index] = updated;
    db.categories[store.id] = categories;

    (db.products[store.id] ?? [])
      .filter((product) => product.category_id === categoryId)
      .forEach((product) => {
        product.category = updated.name;
      });

    save(db);
    return formatCategory(db, store.id, updated);
  },

  async deleteCategory(token: string, categoryId: string): Promise<void> {
    await delay(200);
    const { db, store } = findStoreForToken(token);
    const categories = db.categories[store.id] ?? [];
    const category = categories.find((entry) => entry.id === categoryId);
    if (!category) throw { status: 404, message: "Category not found" };

    const hasProducts = (db.products[store.id] ?? []).some(
      (product) => product.category_id === categoryId,
    );
    if (hasProducts) {
      throw { status: 422, message: "Remove or reassign products before deleting this category." };
    }

    const hasChildren = categories.some((entry) => entry.parent_id === categoryId);
    if (hasChildren) {
      throw {
        status: 422,
        message: "Remove or reassign child categories before deleting this category.",
      };
    }

    db.categories[store.id] = categories.filter((entry) => entry.id !== categoryId);
    save(db);
  },

  async createProduct(
    token: string,
    body: Omit<StoreProduct, "id"> & { id?: string },
  ): Promise<StoreProduct> {
    await delay(250);
    const { db, store } = findStoreForToken(token);
    const product: StoreProduct = {
      ...body,
      ...resolveMockProductCategory(db, store.id, body),
      id: body.id ?? uid(),
      slug: body.slug || slugify(body.name),
      currency: body.currency || "NGN",
      image_url: body.images?.[0] ?? body.image_url ?? null,
      images: body.images?.length
        ? body.images
        : body.image_url
          ? [body.image_url]
          : null,
      brand: body.brand ?? null,
      status: body.status ?? "active",
    };
    db.products[store.id] = [product, ...(db.products[store.id] ?? [])];
    save(db);
    return product;
  },

  async updateProduct(
    token: string,
    productId: string,
    body: Partial<StoreProduct>,
  ): Promise<StoreProduct> {
    await delay(250);
    const { db, store } = findStoreForToken(token);
    const products = db.products[store.id] ?? [];
    const index = products.findIndex((item) => item.id === productId);
    if (index === -1) throw { status: 404, message: "Product not found" };
    const merged = {
      ...products[index],
      ...body,
      ...resolveMockProductCategory(db, store.id, body),
      id: productId,
    };
    const images =
      merged.images?.length
        ? merged.images
        : merged.image_url
          ? [merged.image_url]
          : null;
    const updated = {
      ...merged,
      images,
      image_url: images?.[0] ?? merged.image_url ?? null,
    };
    products[index] = updated;
    db.products[store.id] = products;
    save(db);
    return updated;
  },

  async duplicateProduct(token: string, productId: string): Promise<StoreProduct> {
    await delay(250);
    const { db, store } = findStoreForToken(token);
    const source = (db.products[store.id] ?? []).find((entry) => entry.id === productId);
    if (!source) throw { status: 404, message: "Product not found" };
    const product: StoreProduct = {
      ...source,
      id: uid(),
      name: `${source.name} (Copy)`,
      slug: slugify(`${source.slug}-copy-${Date.now().toString(36)}`),
      status: "draft",
    };
    db.products[store.id] = [product, ...(db.products[store.id] ?? [])];
    save(db);
    return product;
  },

  async deleteProduct(token: string, productId: string): Promise<void> {
    await delay(200);
    const { db, store } = findStoreForToken(token);
    db.products[store.id] = (db.products[store.id] ?? []).filter((item) => item.id !== productId);
    save(db);
  },

  async importProducts(token: string, products: StoreProduct[]): Promise<ProductImportReport> {
    await delay(350);
    const { db, store } = findStoreForToken(token);
    const errors: ProductImportReport["errors"] = [];
    let imported = 0;
    let failed = 0;

    products.forEach((product, index) => {
      const row = index + 1;
      if (!product.name?.trim()) {
        failed++;
        errors.push({ row, field: "name", message: "Product name is required." });
        return;
      }
      if (product.price < 0 || Number.isNaN(product.price)) {
        failed++;
        errors.push({ row, field: "price", message: "Price must be a number greater than or equal to 0." });
        return;
      }
      const resolved = resolveMockProductCategory(db, store.id, product);
      const importedProduct: StoreProduct = { ...product, ...resolved };
      db.products[store.id] = [importedProduct, ...(db.products[store.id] ?? [])];
      imported++;
    });

    save(db);
    return {
      imported,
      failed,
      errors,
      data: db.products[store.id] ?? [],
    };
  },

  async updateMyStore(token: string, body: UpdateStoreInput): Promise<{ store: Store }> {
    await delay(200);
    const db = load();
    const userId = db.sessions[token];
    if (!userId) throw { status: 401, message: "Unauthenticated" };
    const store = db.stores[userId];
    if (!store) throw { status: 404, message: "Store not found" };
    if (body.business_name !== undefined) store.business_name = body.business_name;
    if (body.description !== undefined) store.description = body.description;
    if (body.contact_email !== undefined) store.contact_email = body.contact_email;
    if (body.contact_phone !== undefined) store.contact_phone = body.contact_phone;
    if (body.brand_color) store.brand_color = body.brand_color;
    if (body.logo_url !== undefined) store.logo_url = body.logo_url;
    if (body.business_location !== undefined) store.business_location = body.business_location;
    if (body.weekly_orders !== undefined) store.weekly_orders = body.weekly_orders;
    if (body.payment_currencies !== undefined) store.payment_currencies = body.payment_currencies;
    if (body.staff_count !== undefined) store.staff_count = body.staff_count;
    if (body.physical_store_count !== undefined) {
      store.physical_store_count = body.physical_store_count;
    }
    save(db);
    return { store };
  },

  async getStoreDomains(token: string): Promise<StoreDomainsResponse> {
    await delay(150);
    const db = load();
    const userId = db.sessions[token];
    if (!userId) throw { status: 401, message: "Unauthenticated" };
    const store = db.stores[userId];
    if (!store) throw { status: 404, message: "Store not found" };

    return {
      domains: mockStoreDomains[store.id] ?? [],
      meta: {
        allowed: true,
        max_domains: 1,
        used: (mockStoreDomains[store.id] ?? []).length,
        subdomain_host: getStoreSubdomainHost(store.slug),
      },
    };
  },

  async addStoreDomain(token: string, hostname: string): Promise<{ domain: StoreDomain }> {
    await delay(200);
    const db = load();
    const userId = db.sessions[token];
    if (!userId) throw { status: 401, message: "Unauthenticated" };
    const store = db.stores[userId];
    if (!store) throw { status: 404, message: "Store not found" };

    const normalized = hostname.toLowerCase().replace(/^www\./, "").trim();
    const domain: StoreDomain = {
      id: `domain-${Date.now()}`,
      hostname: normalized,
      status: "pending",
      is_primary: (mockStoreDomains[store.id] ?? []).length === 0,
      verification: {
        txt_host: `_storehause-verify.${normalized}`,
        txt_value: "storehause-verify=mock-token",
        cname_host: normalized,
        cname_target: getStoreSubdomainHost(store.slug),
        txt_verified: false,
        cname_verified: false,
      },
    };
    mockStoreDomains[store.id] = [...(mockStoreDomains[store.id] ?? []), domain];
    return { domain };
  },

  async verifyStoreDomain(token: string, domainId: string): Promise<{ domain: StoreDomain }> {
    await delay(250);
    const db = load();
    const userId = db.sessions[token];
    if (!userId) throw { status: 401, message: "Unauthenticated" };
    const store = db.stores[userId];
    if (!store) throw { status: 404, message: "Store not found" };

    const domains = mockStoreDomains[store.id] ?? [];
    const index = domains.findIndex((entry) => entry.id === domainId);
    if (index === -1) throw { status: 404, message: "Domain not found" };

    const updated: StoreDomain = {
      ...domains[index],
      status: "verified",
      verified_at: new Date().toISOString(),
      verification: {
        ...domains[index].verification,
        txt_verified: true,
        cname_verified: true,
      },
    };
    domains[index] = updated;
    mockStoreDomains[store.id] = domains;
    return { domain: updated };
  },

  async setPrimaryStoreDomain(token: string, domainId: string): Promise<{ domain: StoreDomain }> {
    await delay(150);
    const db = load();
    const userId = db.sessions[token];
    if (!userId) throw { status: 401, message: "Unauthenticated" };
    const store = db.stores[userId];
    if (!store) throw { status: 404, message: "Store not found" };

    mockStoreDomains[store.id] = (mockStoreDomains[store.id] ?? []).map((entry) => ({
      ...entry,
      is_primary: entry.id === domainId,
    }));
    const domain = mockStoreDomains[store.id]?.find((entry) => entry.id === domainId);
    if (!domain) throw { status: 404, message: "Domain not found" };
    return { domain };
  },

  async deleteStoreDomain(token: string, domainId: string): Promise<{ message: string }> {
    await delay(150);
    const db = load();
    const userId = db.sessions[token];
    if (!userId) throw { status: 401, message: "Unauthenticated" };
    const store = db.stores[userId];
    if (!store) throw { status: 404, message: "Store not found" };

    mockStoreDomains[store.id] = (mockStoreDomains[store.id] ?? []).filter(
      (entry) => entry.id !== domainId,
    );
    return { message: "Domain removed." };
  },

  async uploadStorefrontImage(
    token: string,
    storeId: string,
    file: File,
  ): Promise<{ url: string }> {
    await delay(250);
    const db = load();
    const userId = db.sessions[token];
    if (!userId) throw { status: 401, message: "Unauthenticated" };
    const store = db.stores[userId];
    if (!store || store.id !== storeId) throw { status: 404, message: "Store not found" };

    const url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => reject(new Error("Could not read image"));
      reader.readAsDataURL(file);
    });

    return { url };
  },

  async listPublishedStorefronts(): Promise<PublishedStorefrontIndexEntry[]> {
    await delay(100);
    const db = load();

    return Object.values(db.stores)
      .filter((store) => publishMetaForStore(db, store).is_published)
      .map((store) => ({
        slug: store.slug,
        business_name: store.business_name,
        published_at: withPublishFields(db, store).published_at ?? null,
      }));
  },

  async getPublicStorefront(slug: string): Promise<PublicStorefront> {
    await delay(200);
    const db = load();
    const store = Object.values(db.stores).find((entry) => entry.slug === slug);
    if (!store) throw { status: 404, message: "Storefront not found" };
    const meta = publishMetaForStore(db, store);
    if (!meta.is_published) {
      throw { status: 404, message: "This storefront has not been published yet." };
    }
    const storefront = publishedStorefrontForStore(db, store.id) ?? synthesizeStorefront(store);
    const products = (db.products[store.id] ?? []).filter(
      (product) => (product.status ?? "active") === "active",
    );
    return {
      store: withPublishFields(db, store),
      storefront: { ...storefront, products },
      categories: (db.categories[store.id] ?? []).map((category) =>
        formatCategory(db, store.id, category),
      ),
      generation_id: null,
    };
  },

  async getPublicStorefrontByHost(host: string): Promise<PublicStorefront> {
    await delay(200);
    const db = load();
    const hostname = host.split(":")[0].toLowerCase();
    const store =
      Object.values(db.stores).find(
        (entry) =>
          entry.subdomain_host === hostname ||
          entry.primary_domain === hostname ||
          entry.slug === hostname.split(".")[0],
      ) ?? null;
    if (!store) throw { status: 404, message: "Storefront not found" };
    const meta = publishMetaForStore(db, store);
    if (!meta.is_published) {
      throw { status: 404, message: "This storefront has not been published yet." };
    }
    const storefront = publishedStorefrontForStore(db, store.id) ?? synthesizeStorefront(store);
    const products = (db.products[store.id] ?? []).filter(
      (product) => (product.status ?? "active") === "active",
    );
    return {
      store: withPublishFields(db, store),
      storefront: { ...storefront, products },
      categories: (db.categories[store.id] ?? []).map((category) =>
        formatCategory(db, store.id, category),
      ),
      generation_id: null,
    };
  },

  async placeOrder(slug: string, body: CreateStoreOrderInput): Promise<{ order: StoreOrder }> {
    await delay(500);
    const db = load();
    const store = Object.values(db.stores).find((entry) => entry.slug === slug);
    if (!store) throw { status: 404, message: "Storefront not found" };
    if (!publishMetaForStore(db, store).is_published) {
      throw { status: 404, message: "This storefront has not been published yet." };
    }
    const products = new Map((db.products[store.id] ?? []).map((product) => [product.id, product]));
    const items = body.items.map((line) => {
      const product = products.get(line.product_id);
      if (!product)
        throw { status: 422, message: `Product ${line.product_id} is no longer available.` };
      return {
        product_id: product.id,
        name: product.name,
        quantity: line.quantity,
        unit_price: product.price,
        total: product.price * line.quantity,
        currency: product.currency,
      };
    });
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const now = new Date().toISOString();
    const order: StoreOrder = {
      id: uid(),
      order_number: `SH-${Date.now().toString().slice(-8)}`,
      customer_name: `${body.customer.first_name} ${body.customer.last_name}`,
      customer_email: body.customer.email,
      customer_phone: body.customer.phone,
      delivery_address: body.delivery_address,
      status: "pending",
      payment_status: "pending",
      currency: items[0]?.currency ?? "NGN",
      subtotal,
      total_amount: subtotal,
      items,
      notes: body.notes ?? null,
      placed_at: now,
      created_at: now,
      updated_at: now,
    };
    db.orders[store.id] = [order, ...(db.orders[store.id] ?? [])];
    save(db);
    return { order };
  },

  async recordVisit(
    slug: string,
    body: { session_id?: string; path?: string; referrer?: string },
  ): Promise<{ message: string }> {
    const db = load();
    const store = Object.values(db.stores).find((entry) => entry.slug === slug);
    if (!store) throw { status: 404, message: "Storefront not found" };
    db.visits[store.id] = [
      ...(db.visits[store.id] ?? []),
      { ...body, visited_at: new Date().toISOString() },
    ];
    save(db);
    return { message: "Visit recorded." };
  },

  async submitContact(
    slug: string,
    body: { block_id?: string; fields: Record<string, string> },
  ): Promise<{ message: string }> {
    const db = load();
    const store = Object.values(db.stores).find((entry) => entry.slug === slug);
    if (!store) throw { status: 404, message: "Storefront not found" };
    if (!publishMetaForStore(db, store).is_published) {
      throw { status: 404, message: "This storefront has not been published yet." };
    }

    db.contact_inquiries = db.contact_inquiries ?? {};
    db.contact_inquiries[store.id] = [
      ...(db.contact_inquiries[store.id] ?? []),
      {
        block_id: body.block_id ?? null,
        fields: body.fields,
        submitted_at: new Date().toISOString(),
      },
    ];
    save(db);
    return { message: "Message sent." };
  },

  async listProductReviews(slug: string, productId: string) {
    const db = load();
    const store = Object.values(db.stores).find((entry) => entry.slug === slug);
    if (!store) throw { status: 404, message: "Storefront not found" };
    const reviews = (db.product_reviews?.[store.id] ?? []).filter(
      (review) => review.product_id === productId && review.status === "approved",
    );
    const average =
      reviews.length === 0
        ? 0
        : Math.round(
            (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10,
          ) / 10;
    return {
      average_rating: average,
      review_count: reviews.length,
      reviews: reviews
        .slice()
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map((review) => ({
          id: review.id,
          author_name: review.author_name,
          rating: review.rating,
          body: review.body,
          created_at: review.created_at,
        })),
    };
  },

  async submitProductReview(
    slug: string,
    productId: string,
    body: { author_name: string; author_email?: string; rating: number; body: string },
  ) {
    const db = load();
    const store = Object.values(db.stores).find((entry) => entry.slug === slug);
    if (!store) throw { status: 404, message: "Storefront not found" };
    const product = (db.products[store.id] ?? []).find((entry) => entry.id === productId);
    if (!product) throw { status: 404, message: "Product not found" };

    const review = {
      id: crypto.randomUUID(),
      product_id: productId,
      author_name: body.author_name.trim(),
      author_email: body.author_email?.trim() || null,
      rating: body.rating,
      body: body.body.trim(),
      status: "approved",
      created_at: new Date().toISOString(),
    };
    db.product_reviews = db.product_reviews ?? {};
    db.product_reviews[store.id] = [...(db.product_reviews[store.id] ?? []), review];
    save(db);
    return {
      message: "Review submitted.",
      review: {
        id: review.id,
        author_name: review.author_name,
        rating: review.rating,
        body: review.body,
        created_at: review.created_at,
      },
    };
  },

  async getCurrentBuilderSession(token: string): Promise<BuilderSessionResponse> {
    await delay(150);
    const db = load();
    const userId = db.sessions[token];
    if (!userId) throw { status: 401, message: "Unauthenticated" };
    const session = db.builderSessions[userId];
    return { session: session ? hydrateBuilderSession(db, session) : null };
  },

  async startBuilderSession(token: string, prompt?: string): Promise<BuilderSessionResponse> {
    await delay(250);
    const db = load();
    const userId = db.sessions[token];
    if (!userId) throw { status: 401, message: "Unauthenticated" };

    let session = db.builderSessions[userId];
    if (!session) {
      const store = db.stores[userId] ?? null;
      session = createEmptyBuilderSession(store);
      db.builderSessions[userId] = session;
    }

    if (prompt) {
      session = processBuilderMessage(db, userId, session, prompt);
      db.builderSessions[userId] = session;
    } else if (!session.messages.length) {
      session.messages.push({
        id: uid(),
        role: "assistant",
        content: BUILDER_WELCOME_MESSAGE,
        payload: { type: "welcome" },
        created_at: new Date().toISOString(),
      });
      db.builderSessions[userId] = session;
    }

    save(db);
    return { session: hydrateBuilderSession(db, session) };
  },

  async sendBuilderMessage(
    token: string,
    sessionId: string,
    message: string,
    state?: {
      business_profile?: BuilderBusinessProfile;
      status?: BuilderSessionStatus;
      assistant_message?: string;
      assistant_payload?: Record<string, unknown>;
      selected_template_id?: StorefrontTemplateId | null;
      storefront_snapshot?: StorefrontContent | null;
      brand_color?: string;
      color_label?: string;
      logo_url?: string | null;
      media_updates?: Partial<Record<"media.hero_image_url" | "media.about_image_url", string>>;
      apply_stock_images?: boolean;
    },
  ): Promise<BuilderSessionResponse> {
    await delay(300);
    const db = load();
    const userId = db.sessions[token];
    if (!userId) throw { status: 401, message: "Unauthenticated" };
    const session = db.builderSessions[userId];
    if (!session || session.id !== sessionId) throw { status: 404, message: "Builder session not found" };

    session.messages.push({
      id: uid(),
      role: "user",
      content: message,
      created_at: new Date().toISOString(),
    });

    if (state?.brand_color || state?.media_updates || state?.apply_stock_images || state?.logo_url !== undefined) {
      const store = session.store ?? ensureBuilderStore(db, userId, session);
      session.store = store;
      let storefront = session.storefront_snapshot ?? db.storefronts[store.id] ?? null;
      const changedPaths: string[] = [];
      let summary = "";
      let payloadType = "website_refined";

      if (state.brand_color) {
        if (storefront) {
          const result = applyBrandColorToStorefront(storefront, store, state.brand_color);
          storefront = result.storefront;
          store.brand_color = result.store.brand_color;
          changedPaths.push(...result.changed_paths);
        } else {
          store.brand_color = state.brand_color;
        }
        session.business_profile = {
          ...session.business_profile,
          brand_color: state.brand_color,
        };
        summary =
          typeof state.color_label === "string" && state.color_label.trim()
            ? `Done — I updated your brand color to ${state.color_label.trim()}. Check the preview on the right.`
            : "Done — I updated your brand color. Check the preview on the right.";
        payloadType = "brand_color_applied";
      }

      if (storefront && state.media_updates) {
        const mediaResult = applyMediaToStorefront(storefront, state.media_updates);
        storefront = mediaResult.storefront;
        changedPaths.push(...mediaResult.changed_paths);
        summary = summary || describeStorefrontEdit(mediaResult.changed_paths);
      }

      if (storefront && state.apply_stock_images) {
        const stockResult = applyStockImagesFromMessage(storefront, store);
        storefront = stockResult.storefront;
        changedPaths.push(...stockResult.changed_paths);
        summary = "Done — I added suitable photos to your website. Check the preview on the right.";
      }

      if (state.logo_url !== undefined) {
        store.logo_url = state.logo_url;
        summary = state.logo_url
          ? "Done — I updated your logo. Check the preview on the right."
          : "Done — I removed your logo. Your business name will show in the header instead.";
        payloadType = "logo_applied";
      }

      if (storefront) {
        session.storefront_snapshot = storefront;
        db.storefronts[store.id] = storefront;
        session.status = "review_ready";
      }

      db.stores[userId] = store;
      session.messages.push({
        id: uid(),
        role: "assistant",
        content: summary || describeStorefrontEdit(changedPaths),
        payload: enrichMockAssistantPayload(session, {
          type: payloadType,
          changed_paths: changedPaths,
          brand_color: state.brand_color ?? store.brand_color,
          ...(state.logo_url !== undefined ? { logo_url: store.logo_url } : {}),
        }),
        created_at: new Date().toISOString(),
      });
      session.updated_at = new Date().toISOString();
      db.builderSessions[userId] = session;
      save(db);
      return {
        session: hydrateBuilderSession(db, session),
        storefront: storefront ?? undefined,
      };
    }

    if (state?.assistant_message) {
      if (state.business_profile) session.business_profile = state.business_profile;
      if (state.status) session.status = state.status;
      if (state.selected_template_id) session.selected_template_id = state.selected_template_id;
      if (state.storefront_snapshot) {
        session.storefront_snapshot = state.storefront_snapshot;
        if (session.store) db.storefronts[session.store.id] = state.storefront_snapshot;
      }
      session.messages.push({
        id: uid(),
        role: "assistant",
        content: state.assistant_message,
        payload: state.assistant_payload,
        created_at: new Date().toISOString(),
      });
      session.updated_at = new Date().toISOString();
      db.builderSessions[userId] = session;
      save(db);
      return {
        session: hydrateBuilderSession(db, session),
        storefront: state.storefront_snapshot ?? undefined,
      };
    }

    if (state?.storefront_snapshot) {
      session.storefront_snapshot = state.storefront_snapshot;
      if (state.status) session.status = state.status;
      if (session.store) db.storefronts[session.store.id] = state.storefront_snapshot;
      session.updated_at = new Date().toISOString();
      db.builderSessions[userId] = session;
      save(db);
      return {
        session: hydrateBuilderSession(db, session),
        storefront: state.storefront_snapshot,
      };
    }

    const next = processBuilderMessage(db, userId, session, message);
    db.builderSessions[userId] = next;
    save(db);
    return { session: hydrateBuilderSession(db, next) };
  },

  async saveBuilderSnapshot(
    token: string,
    sessionId: string,
    storefrontSnapshot: StorefrontContent,
    status?: BuilderSessionStatus,
  ): Promise<BuilderSessionResponse> {
    await delay(150);
    const db = load();
    const userId = db.sessions[token];
    if (!userId) throw { status: 401, message: "Unauthenticated" };
    const session = db.builderSessions[userId];
    if (!session || session.id !== sessionId) throw { status: 404, message: "Builder session not found" };

    session.storefront_snapshot = storefrontSnapshot;
    if (status) session.status = status;
    if (session.store) db.storefronts[session.store.id] = storefrontSnapshot;
    session.updated_at = new Date().toISOString();
    db.builderSessions[userId] = session;
    save(db);

    return {
      session: hydrateBuilderSession(db, session),
      storefront: storefrontSnapshot,
    };
  },

  async saveBuilderProject(
    token: string,
    sessionId: string,
    payload: {
      custom_files: Array<{ path: string; content: string; encoding?: "base64" }>;
      edit_metadata?: { locked_paths?: string[] };
    },
  ): Promise<BuilderSessionResponse> {
    await delay(150);
    const db = load();
    const userId = db.sessions[token];
    if (!userId) throw { status: 401, message: "Unauthenticated" };
    const session = db.builderSessions[userId];
    if (!session || session.id !== sessionId) throw { status: 404, message: "Builder session not found" };

    const snapshot = {
      ...(session.storefront_snapshot ?? ({} as StorefrontContent)),
      custom_files: payload.custom_files as never,
      edit_metadata: {
        ...(((session.storefront_snapshot?.edit_metadata ?? {}) as Record<string, unknown>)),
        ...(payload.edit_metadata ?? {}),
      } as never,
    };
    delete (snapshot as Record<string, unknown>).custom_code;

    session.storefront_snapshot = snapshot;
    session.updated_at = new Date().toISOString();
    db.builderSessions[userId] = session;
    save(db);

    return {
      session: hydrateBuilderSession(db, session),
      storefront: snapshot,
    };
  },

  async getBuilderProject(
    token: string,
    sessionId: string,
  ): Promise<{
    custom_files: Array<{ path: string; content: string; encoding?: "base64" }>;
    edit_metadata: { locked_paths: string[] };
    custom_project: null;
  }> {
    await delay(50);
    const db = load();
    const userId = db.sessions[token];
    if (!userId) throw { status: 401, message: "Unauthenticated" };
    const session = db.builderSessions[userId];
    if (!session || session.id !== sessionId) throw { status: 404, message: "Builder session not found" };

    const snapshot = session.storefront_snapshot as Record<string, unknown> | null;
    const customFiles = Array.isArray(snapshot?.custom_files)
      ? (snapshot.custom_files as Array<{ path: string; content: string; encoding?: "base64" }>)
      : [];
    const editMetadata = snapshot?.edit_metadata as { locked_paths?: string[] } | undefined;

    return {
      custom_files: customFiles,
      edit_metadata: { locked_paths: editMetadata?.locked_paths ?? [] },
      custom_project: null,
    };
  },

  async clearBuilderChat(token: string, sessionId: string): Promise<BuilderSessionResponse> {
    await delay(150);
    const db = load();
    const userId = db.sessions[token];
    if (!userId) throw { status: 401, message: "Unauthenticated" };
    const session = db.builderSessions[userId];
    if (!session || session.id !== sessionId) throw { status: 404, message: "Builder session not found" };

    session.messages = [
      {
        id: uid(),
        role: "assistant",
        content: BUILDER_WELCOME_MESSAGE,
        payload: { type: "welcome" },
        created_at: new Date().toISOString(),
      },
    ];
    session.updated_at = new Date().toISOString();
    db.builderSessions[userId] = session;
    save(db);
    return { session: hydrateBuilderSession(db, session) };
  },

  async selectBuilderTemplate(
    token: string,
    sessionId: string,
    templateId: StorefrontTemplateId,
    source: "merchant_selected" | "ai_selected" = "merchant_selected",
  ): Promise<BuilderSessionResponse> {
    await delay(200);
    const db = load();
    const userId = db.sessions[token];
    if (!userId) throw { status: 401, message: "Unauthenticated" };
    const session = db.builderSessions[userId];
    if (!session || session.id !== sessionId) throw { status: 404, message: "Builder session not found" };

    session.selected_template_id = templateId;
    if (session.store) {
      const store = db.stores[userId];
      if (store) store.storefront_template_id = templateId;
    }

    const hasDraft = !!session.storefront_snapshot && !!session.store;
    if (hasDraft && session.store) {
      const store = db.stores[userId];
      if (store) {
        store.storefront_template_id = templateId;
        const storefront = synthesizeStorefront(store);
        session.storefront_snapshot = storefront;
        db.storefronts[store.id] = storefront;
        session.status = "content_generated";
        const templateLabel =
          STOREFRONT_TEMPLATE_OPTIONS.find((option) => option.value === templateId)?.label ?? templateId;
        session.messages.push({
          id: uid(),
          role: "assistant",
          content: `Done — I refreshed your website with a ${templateLabel.toLowerCase()} look. Check the preview on the right, then tell me what to refine.`,
          payload: { type: "website_generated", template_id: templateId, source },
          created_at: new Date().toISOString(),
        });
        db.builderSessions[userId] = session;
        save(db);
        return { session: hydrateBuilderSession(db, session), storefront };
      }
    }

    session.status = "template_recommendation";
    session.messages.push({
      id: uid(),
      role: "assistant",
      content:
        "Great choice. I can generate a first draft with hero copy, about section, FAQs, SEO, and sample products for this template.",
      payload: { type: "template_selected", template_id: templateId, source },
      created_at: new Date().toISOString(),
    });
    db.builderSessions[userId] = session;
    save(db);
    return { session: hydrateBuilderSession(db, session) };
  },

  async generateBuilderDraft(
    token: string,
    sessionId: string,
    draft?: { storefront?: StorefrontContent; selected_template_id?: StorefrontTemplateId | null },
  ): Promise<BuilderSessionResponse> {
    await delay(1800);
    const db = load();
    const userId = db.sessions[token];
    if (!userId) throw { status: 401, message: "Unauthenticated" };
    const session = db.builderSessions[userId];
    if (!session || session.id !== sessionId) throw { status: 404, message: "Builder session not found" };

    const store = ensureBuilderStore(db, userId, session);
    if (session.selected_template_id && session.selected_template_id !== "ai_pick") {
      store.storefront_template_id = session.selected_template_id;
    } else if (draft?.selected_template_id) {
      session.selected_template_id = draft.selected_template_id;
      store.storefront_template_id = draft.selected_template_id;
    }

    const storefront = draft?.storefront ?? synthesizeStorefront(store);
    storefront.edit_metadata = {
      ai_generated_paths: [
        "hero.headline",
        "hero.subheadline",
        "hero.cta_label",
        "about.title",
        "about.body",
        "value_props",
        "pages",
        "seo.title",
        "seo.description",
        "products",
      ],
      user_edited_paths: [],
      last_generation_prompt: null,
      last_generated_at: new Date().toISOString(),
    };

    db.storefronts[store.id] = storefront;
    session.store = store;
    session.storefront_snapshot = storefront;
    session.status = "content_generated";
    session.messages.push({
      id: uid(),
      role: "assistant",
      content:
        "Your storefront draft is ready. Preview it on the right, or ask me to refine the hero, about section, FAQ, or SEO.",
      payload: { type: "draft_generated" },
      created_at: new Date().toISOString(),
    });
    db.builderSessions[userId] = session;
    save(db);

    return {
      session: hydrateBuilderSession(db, session),
      generation_id: uid(),
      storefront,
    };
  },

  async applyBuilderChatEdit(
    token: string,
    sessionId: string,
    instruction: string,
  ): Promise<BuilderSessionResponse> {
    await delay(500);
    const db = load();
    const userId = db.sessions[token];
    if (!userId) throw { status: 401, message: "Unauthenticated" };
    const session = db.builderSessions[userId];
    if (!session || session.id !== sessionId) throw { status: 404, message: "Builder session not found" };
    if (!session.storefront_snapshot) throw { status: 422, message: "Generate a draft before applying chat edits." };

    const result = applyMockChatEdit(session.storefront_snapshot, instruction);
    session.storefront_snapshot = result.storefront;
    session.status = "review_ready";
    if (session.store) {
      db.storefronts[session.store.id] = result.storefront;
    }
    session.messages.push({
      id: uid(),
      role: "assistant",
      content: describeStorefrontEdit(result.changed_paths),
      payload: { type: "edit_applied", changed_paths: result.changed_paths },
      created_at: new Date().toISOString(),
    });
    db.builderSessions[userId] = session;
    save(db);

    return {
      session: hydrateBuilderSession(db, session),
      storefront: result.storefront,
      changed_paths: result.changed_paths,
    };
  },

  async getBillingSubscription(token: string): Promise<BillingSubscriptionResponse> {
    await delay(200);
    findStoreForToken(token);
    return mockBillingCatalog("growth");
  },

  async startBillingCheckout(
    token: string,
    plan: SubscriptionPlanId,
  ): Promise<BillingCheckoutResponse> {
    await delay(300);
    findStoreForToken(token);
    return {
      mode: "checkout",
      checkout_url: `https://checkout.dodopayments.com/mock/${plan}`,
      session_id: `mock_session_${plan}`,
    };
  },

  async openBillingPortal(token: string): Promise<BillingPortalResponse> {
    await delay(200);
    findStoreForToken(token);
    return { portal_url: "https://portal.dodopayments.com/mock" };
  },

  async startBillingTopup(
    token: string,
    pack: Pick<BillingAddOnPack, "type" | "id">,
  ): Promise<BillingCheckoutResponse> {
    await delay(300);
    findStoreForToken(token);
    return {
      mode: "checkout",
      checkout_url: `https://checkout.dodopayments.com/mock/${pack.type}/${pack.id}`,
      session_id: `mock_topup_${pack.id}`,
    };
  },
};

function mockBillingCatalog(activePlan: SubscriptionPlanId): BillingSubscriptionResponse {
  const plans: BillingPlanOption[] = [
    {
      id: "starter",
      name: "Starter",
      price_label: "NGN 5,000",
      description: "Launch your first store and start selling with essential limits.",
      features: [
        "Up to NGN 1M monthly processing",
        "1 storefront",
        "Up to 500 customers",
        "100 SMS + 50 WhatsApp units/month",
        "5 AI queries per day",
      ],
      limits: [
        { label: "Monthly processing", value: "NGN 1,000,000" },
        { label: "Storefronts", value: "1" },
        { label: "Customers", value: "500" },
        { label: "SMS units", value: "100/mo" },
        { label: "WhatsApp units", value: "50/mo" },
        { label: "AI queries", value: "5/day" },
      ],
      available: true,
    },
    {
      id: "growth",
      name: "Growth",
      price_label: "NGN 15,000",
      description: "For growing brands selling across channels with higher volume.",
      features: [
        "Up to NGN 10M monthly processing",
        "Up to 3 storefronts",
        "Up to 5,000 customers",
        "500 SMS + 300 WhatsApp units/month",
        "5 AI queries per day",
      ],
      limits: [
        { label: "Monthly processing", value: "NGN 10,000,000" },
        { label: "Storefronts", value: "3" },
        { label: "Customers", value: "5,000" },
        { label: "SMS units", value: "500/mo" },
        { label: "WhatsApp units", value: "300/mo" },
        { label: "AI queries", value: "5/day" },
      ],
      available: true,
    },
    {
      id: "scale",
      name: "Scale",
      price_label: "NGN 30,000",
      description: "For teams with high order volume and multi-store operations.",
      features: [
        "Up to NGN 50M monthly processing",
        "Up to 10 storefronts",
        "Unlimited customers",
        "2,000 SMS + 1,500 WhatsApp units/month",
        "5 AI queries per day",
      ],
      limits: [
        { label: "Monthly processing", value: "NGN 50,000,000" },
        { label: "Storefronts", value: "10" },
        { label: "Customers", value: "Unlimited" },
        { label: "SMS units", value: "2,000/mo" },
        { label: "WhatsApp units", value: "1,500/mo" },
        { label: "AI queries", value: "5/day" },
      ],
      available: true,
    },
  ];

  const active = plans.find((plan) => plan.id === activePlan) ?? plans[0];

  return {
    subscription: {
      plan: active.id,
      plan_name: active.name,
      price_label: active.price_label,
      status: "trialing",
      renews_at: null,
      limits: active.limits,
      usage: {
        processing: { used_ngn: 0, cap_ngn: 1_000_000, label: "NGN 0 / NGN 1,000,000" },
        stores: { used: 1, cap: 1, label: "1 / 1" },
        customers: { used: 0, cap: 500, label: "0 / 500" },
        sms: {
          remaining: 100,
          included_monthly: 100,
          included_remaining: 100,
          purchased_balance: 0,
        },
        whatsapp: {
          remaining: 50,
          included_monthly: 50,
          included_remaining: 50,
          purchased_balance: 0,
        },
        ai: {
          daily_limit: 5,
          used_today: 0,
          remaining_today: 5,
          purchased_remaining: 0,
        },
        limits: active.limits,
      },
      has_payment_method: false,
      billing_configured: true,
    },
    plans,
    add_ons: {
      sms: [
        { id: "sms_500", type: "sms", units: 500, credits: null, price_label: "NGN 3,000", available: true },
        { id: "sms_1000", type: "sms", units: 1000, credits: null, price_label: "NGN 5,500", available: true },
      ],
      whatsapp: [
        { id: "wa_200", type: "whatsapp", units: 200, credits: null, price_label: "NGN 4,000", available: true },
      ],
      ai_credits: [
        { id: "ai_50", type: "ai_credits", units: null, credits: 50, price_label: "NGN 2,000", available: true },
      ],
    },
  };
}

function createEmptyBuilderSession(store: Store | null): BuilderSession {
  const profile: BuilderBusinessProfile = store
    ? {
        business_name: store.business_name,
        description: store.description,
        industry: store.industry,
        brand_color: store.brand_color,
        tone: [],
      }
    : { business_name: null, description: null, industry: null, brand_color: null, tone: [] };

  return {
    id: uid(),
    status: store ? "template_recommendation" : "collecting_requirements",
    business_profile: profile,
    selected_template_id:
      store?.storefront_template_id && store.storefront_template_id !== "ai_pick"
        ? store.storefront_template_id
        : null,
    storefront_snapshot: null,
    store,
    messages: [],
    recommendations: [],
    updated_at: new Date().toISOString(),
  };
}

function hydrateBuilderSession(db: MockDB, session: BuilderSession): BuilderSession {
  const userId = Object.entries(db.sessions).find(([, id]) => db.stores[id]?.id === session.store?.id)?.[1];
  const storeFromDb = userId ? db.stores[userId] : session.store;
  const profile = session.business_profile ?? {};
  const recommendations =
    session.status !== "collecting_requirements"
      ? recommendTemplates({
          prompt: `${profile.business_name ?? ""} ${profile.description ?? ""}`.trim(),
          industry: profile.industry ?? undefined,
          tone: profile.tone,
          limit: 4,
        })
      : [];

  return {
    ...session,
    store: storeFromDb ?? session.store,
    recommendations,
    storefront_snapshot:
      session.storefront_snapshot ??
      (storeFromDb ? db.storefronts[storeFromDb.id] ?? null : null),
    updated_at: new Date().toISOString(),
  };
}

function extractBusinessProfile(message: string, profile: BuilderBusinessProfile): BuilderBusinessProfile {
  const next = { ...profile, tone: [...(profile.tone ?? [])] };
  const lower = message.toLowerCase();

  const namedMatch = message.match(/(?:called|named|name is|business is)\s+["']?([^"'.!?\n]+)["']?/i);
  const isMatch = message.match(/^([A-Z][\w\s&'-]{2,60}?)\s+is\s+(?:an?|the)\s+/i);
  if (namedMatch) next.business_name = namedMatch[1].trim();
  else if (isMatch) next.business_name = isMatch[1].trim();
  if (message.length > 20 && !next.description) next.description = message.trim();

  const industryMap: Record<string, Industry> = {
    skincare: "beauty_and_skincare",
    beauty: "beauty_and_skincare",
    cosmetic: "beauty_and_skincare",
    fashion: "fashion_and_apparel",
    clothing: "fashion_and_apparel",
    streetwear: "fashion_and_apparel",
    food: "food_and_beverage",
    coffee: "food_and_beverage",
    restaurant: "food_and_beverage",
    electronics: "electronics",
    furniture: "home_and_living",
    home: "home_and_living",
    service: "services",
  };
  for (const [keyword, industry] of Object.entries(industryMap)) {
    if (lower.includes(keyword)) {
      next.industry = industry;
      break;
    }
  }

  for (const tone of ["premium", "luxury", "minimal", "natural", "clean", "bold", "editorial"]) {
    if (lower.includes(tone) && !next.tone?.includes(tone)) next.tone?.push(tone);
  }

  const colorMatch = message.match(/#([0-9A-Fa-f]{6})/);
  if (colorMatch) next.brand_color = `#${colorMatch[1]}`;

  return next;
}

function enrichMockAssistantPayload(
  session: BuilderSession,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const industry = session.business_profile.industry ?? session.store?.industry ?? null;
  const colorOptions = colorPresetActions(industry, 3).map((action) => action.color);
  const applied =
    typeof payload.brand_color === "string"
      ? payload.brand_color
      : session.business_profile.brand_color ?? session.store?.brand_color ?? null;

  if (applied && /^#[0-9A-Fa-f]{6}$/.test(applied)) {
    const normalized = applied.toUpperCase();
    if (!colorOptions.some((color) => color.toUpperCase() === normalized)) {
      colorOptions.unshift(applied);
    }
  }

  return {
    suggested_actions: fallbackSuggestedActions(session),
    color_options: colorOptions,
    ...payload,
  };
}

function processBuilderMessage(
  db: MockDB,
  userId: string,
  session: BuilderSession,
  message: string,
): BuilderSession {
  session.business_profile = extractBusinessProfile(message, session.business_profile ?? {});
  const profile = session.business_profile;

  if (session.storefront_snapshot && session.store) {
    const store = session.store;
    let storefront = session.storefront_snapshot;
    let changedPaths: string[] = [];
    let summary = "";
    let payloadType = "conversation";

    if (isStockImageIntent(message)) {
      const stockResult = applyStockImagesFromMessage(storefront, store);
      storefront = stockResult.storefront;
      changedPaths = stockResult.changed_paths;
      summary = "Done — I added suitable photos to your website. Check the preview on the right.";
      payloadType = "website_refined";
    } else if (isProductIntent(message)) {
      session.messages.push({
        id: uid(),
        role: "assistant",
        content:
          "Products live on your Products page — add names, prices, photos, and inventory there. They appear on your storefront automatically.",
        payload: enrichMockAssistantPayload(session, {
          type: "product_guidance",
          suggested_actions: [
            { type: "link", label: "Go to Products", href: "/admin/products" },
            { type: "prompt", label: "Suggest stock photos", message: "Add suitable stock photos to my website" },
            ...colorPresetActions(profile.industry ?? store.industry, 2),
          ],
        }),
        created_at: new Date().toISOString(),
      });
      session.updated_at = new Date().toISOString();
      return session;
    } else if (isBuildIntent(message)) {
      const templateId = resolveTemplateFromMessage(message);
      if (templateId) {
        session.selected_template_id = templateId;
        store.storefront_template_id = templateId;
      }
      if (/\b(cosmetic|cosmetics|skincare|beauty)\b/i.test(message)) {
        profile.industry = "beauty_and_skincare";
      }
      storefront = synthesizeStorefront(store);
      session.storefront_snapshot = storefront;
      db.storefronts[store.id] = storefront;
      session.status = "content_generated";
      const templateLabel =
        STOREFRONT_TEMPLATE_OPTIONS.find((option) => option.value === (templateId ?? store.storefront_template_id))
          ?.label ?? "new";
      summary =
        isDesignChangeIntent(message) || /\bfor\b/i.test(message)
          ? `Done — I refreshed your website with a ${templateLabel.toLowerCase()} look. Check the preview on the right, then tell me what to refine.`
          : "Your website is ready. Preview it on the right, then tell me what to refine — headline, about section, CTA, or SEO.";
      payloadType = "website_generated";
    } else if (isColorIntent(message)) {
      const color = extractColorFromMessage(message);
      if (color) {
        const result = applyBrandColorToStorefront(storefront, store, color);
        storefront = result.storefront;
        store.brand_color = result.store.brand_color;
        session.business_profile = { ...profile, brand_color: color };
        changedPaths = result.changed_paths;
        summary = "Done — I updated your brand color. Check the preview on the right.";
        payloadType = "brand_color_applied";
      }
    } else if (isEditIntent(message)) {
      const editResult = applyStorefrontEdit(storefront, message);
      storefront = editResult.storefront;
      changedPaths = editResult.changed_paths;
      summary = editResult.assistant_message;
      payloadType = "website_refined";
    } else {
      summary =
        "Tell me what you'd like to change — for example \"Change the button to Shop Gifts\" or \"Make the homepage more premium\". I'll update the preview on the right.";
    }

    if (payloadType !== "conversation" && payloadType !== "website_generated") {
      session.storefront_snapshot = storefront;
      db.storefronts[store.id] = storefront;
      db.stores[userId] = store;
      session.status = "review_ready";
    }

    session.messages.push({
      id: uid(),
      role: "assistant",
      content: summary,
      payload: enrichMockAssistantPayload(session, {
        type: payloadType,
        ...(changedPaths.length ? { changed_paths: changedPaths } : {}),
        ...(payloadType === "brand_color_applied" ? { brand_color: store.brand_color } : {}),
      }),
      created_at: new Date().toISOString(),
    });
    session.updated_at = new Date().toISOString();
    return session;
  }

  const hasMinimum =
    !!profile.business_name &&
    !!profile.description &&
    profile.description.length >= 10;

  const wantsWebsite = isBuildIntent(message);

  if (wantsWebsite && hasMinimum && !session.storefront_snapshot) {
    const store = ensureBuilderStore(db, userId, session);
    session.store = store;
    const recommendations =
      session.recommendations.length > 0
        ? session.recommendations
        : recommendTemplates({
            prompt: `${profile.business_name} ${profile.description}`.trim(),
            industry: profile.industry ?? undefined,
            tone: profile.tone,
            limit: 4,
          });
    session.recommendations = recommendations;
    if (!session.selected_template_id || session.selected_template_id === "ai_pick") {
      session.selected_template_id = recommendations[0]?.template_id ?? "minimalistic";
    }
    store.storefront_template_id = session.selected_template_id ?? "minimalistic";
    const storefront = synthesizeStorefront(store);
    session.storefront_snapshot = storefront;
    db.storefronts[store.id] = storefront;
    session.status = "content_generated";
    session.messages.push({
      id: uid(),
      role: "assistant",
      content:
        "Your website is ready. Preview it on the right, then tell me what to refine — headline, about section, CTA, or SEO.",
      payload: { type: "website_generated" },
      created_at: new Date().toISOString(),
    });
    session.updated_at = new Date().toISOString();
    return session;
  }

  if (hasMinimum) {
    const store = ensureBuilderStore(db, userId, session);
    session.store = store;
    store.business_name = profile.business_name ?? store.business_name;
    store.description = profile.description ?? store.description;
    store.industry = profile.industry ?? store.industry;
    store.brand_color = profile.brand_color ?? store.brand_color;
    db.stores[userId] = store;
    const user = db.users[userId];
    if (user) {
      user.user.has_store = true;
    }
    session.status = "template_recommendation";
    const recommendations = recommendTemplates({
      prompt: `${profile.business_name} ${profile.description}`.trim(),
      industry: profile.industry ?? undefined,
      tone: profile.tone,
      limit: 4,
    });
    session.recommendations = recommendations;
    const top = recommendations[0];
    session.messages.push({
      id: uid(),
      role: "assistant",
      content: top
        ? `I found a strong fit with the ${top.template_id} template (${Math.round(top.score * 100)}% match). ${top.reason} Pick a template below, or ask for a different style.`
        : "I have enough to recommend templates. Pick one below, or tell me if you want a different style.",
      payload: { type: "template_recommendations", recommendations, profile },
      created_at: new Date().toISOString(),
    });
  } else {
    session.status = "collecting_requirements";
    const missing = [];
    if (!profile.business_name) missing.push("business name");
    if (!profile.description || profile.description.length < 10) missing.push("short description of what you sell");
    session.messages.push({
      id: uid(),
      role: "assistant",
      content: `Thanks — I still need your ${missing.join(" and ")}. For example: "Glow Rituals is an organic skincare brand for busy professionals."`,
      payload: { type: "requirements_request", profile },
      created_at: new Date().toISOString(),
    });
  }

  session.updated_at = new Date().toISOString();
  return session;
}

function ensureBuilderStore(db: MockDB, userId: string, session: BuilderSession): Store {
  const existing = db.stores[userId];
  if (existing) return existing;

  const profile = session.business_profile ?? {};
  const businessName = profile.business_name ?? "My Store";
  const slug = slugify(businessName) || "my-store";
  const store: Store = {
    id: uid(),
    slug,
    business_name: businessName,
    industry: profile.industry ?? "other",
    description: profile.description ?? "",
    brand_color: profile.brand_color ?? "#0E7C66",
    logo_url: null,
    storefront_template_id: "ai_pick",
    subdomain: slug,
    subdomain_host: getStoreSubdomainHost(slug),
    primary_domain: getStoreSubdomainHost(slug),
  };
  db.stores[userId] = store;
  const user = db.users[userId];
  if (user) user.user.has_store = true;
  return store;
}

function applyMockChatEdit(
  storefront: StorefrontContent,
  instruction: string,
): { storefront: StorefrontContent; changed_paths: string[] } {
  const lower = instruction.toLowerCase();
  const next = structuredClone(storefront);
  const changed: string[] = [];

  const setPath = (path: string, value: string) => {
    if (path === "hero.headline") next.hero.headline = value;
    if (path === "hero.subheadline") next.hero.subheadline = value;
    if (path === "hero.cta_label") next.hero.cta_label = value;
    if (path === "about.title") {
      next.about.title = value;
      if (next.pages?.about) next.pages.about.title = value;
    }
    if (path === "about.body") {
      next.about.body = value;
      if (next.pages?.about) next.pages.about.body = value;
    }
    if (path === "seo.description") next.seo.description = value.slice(0, 300);
    changed.push(path);
  };

  if (lower.includes("premium") || lower.includes("luxury")) {
    setPath("hero.headline", next.hero.headline.replace(/\b(shop|buy|online)\b/gi, "").trim() || next.hero.headline);
    setPath("hero.subheadline", `${next.hero.subheadline} Crafted with premium quality and a refined customer experience.`);
    setPath("hero.cta_label", "Shop the collection");
  } else if (lower.includes("cta") || lower.includes("button")) {
    setPath("hero.cta_label", lower.includes("collection") ? "Shop the collection" : "Discover more");
  } else if (lower.includes("hero") || lower.includes("headline")) {
    setPath("hero.subheadline", `${next.hero.subheadline} Updated to match your request.`);
  } else if (lower.includes("about")) {
    if (lower.includes("family")) {
      setPath("about.title", "Our family story");
    }
    setPath("about.body", `${next.about.body} Updated to match your request.`.trim());
  } else {
    setPath("hero.subheadline", `${next.hero.subheadline} Updated to match your request.`);
  }

  next.edit_metadata = {
    ...next.edit_metadata,
    user_edited_paths: [...new Set([...(next.edit_metadata?.user_edited_paths ?? []), ...changed])],
    last_generation_prompt: instruction,
    last_generated_at: new Date().toISOString(),
  };

  return { storefront: next, changed_paths: changed };
}

function synthesizeStorefront(store: Store): StorefrontContent {
  const name = store.business_name;
  const industry = store.industry.replace(/_/g, " ");
  const desc = store.description || `${name} delivers exceptional ${industry} experiences.`;
  const templateId = resolveTemplateId(store);

  const heroByIndustry: Record<string, { headline: string; sub: string; cta: string }> = {
    food_and_beverage: {
      headline: `Taste ${name}.`,
      sub: `${desc} Fresh, sourced with care, delivered to your door.`,
      cta: "Shop the menu",
    },
    fashion_and_apparel: {
      headline: `New season from ${name}.`,
      sub: `${desc} Modern layers, everyday staples, and pieces made to move with you.`,
      cta: "Shop the collection",
    },
    beauty_and_skincare: {
      headline: `Discover the nature with ${name}.`,
      sub: `${desc} Botanical skincare, clean formulas, and real glow rituals.`,
      cta: "Discover the line",
    },
    electronics: {
      headline: `${name} - built better.`,
      sub: `${desc} Pro-grade gear at honest prices.`,
      cta: "Browse products",
    },
    home_and_living: {
      headline: `Make it home, with ${name}.`,
      sub: `${desc} Considered objects for the spaces you live in.`,
      cta: "Shop the catalog",
    },
    services: {
      headline: `${name}, at your service.`,
      sub: `${desc} Book what you need, when you need it.`,
      cta: "Book now",
    },
    other: {
      headline: `Welcome to ${name}.`,
      sub: desc,
      cta: "Start shopping",
    },
  };
  const hero = heroByIndustry[store.industry] ?? heroByIndustry.other;

  const slugBase = slugify(name);

  return ensureHomeBlocksOnStorefront({
    template: {
      id: templateId,
      source: store.storefront_template_id === "ai_pick" ? "ai_selected" : "merchant_selected",
    },
    data_plugs: {
      home_products_source: "merchant_products",
    },
    hero: { headline: hero.headline, subheadline: hero.sub, cta_label: hero.cta },
    about: {
      title: "Our story",
      body: `${name} was founded with a simple idea: ${industry} should feel personal again. ${desc} Every order is handled by a small team that genuinely cares about what leaves our door.`,
    },
    value_props:
      store.industry === "fashion_and_apparel"
        ? [
            { title: "Curated drops", body: "Fresh seasonal edits built around complete looks." },
            {
              title: "Quality fabrics",
              body: "Comfortable, durable pieces checked before shipping.",
            },
            { title: "Easy styling", body: "Wardrobe staples designed to mix, layer, and repeat." },
          ]
        : store.industry === "beauty_and_skincare"
          ? [
              { title: "100% organic", body: "Botanical ingredients chosen for gentle daily care." },
              { title: "Clinical feel", body: "Simple formulas that support comfort, glow, and consistency." },
              { title: "Herbal products", body: "Clean textures made to layer easily in any routine." },
            ]
          : [
              { title: "Made with care", body: "Every item is checked by hand before it ships." },
              { title: "Fast local delivery", body: "Most orders arrive within 2-4 business days." },
              {
                title: "Talk to a human",
                body: "Real people, real answers - usually within an hour.",
              },
            ],
    pages: {
      about: {
        title: `About ${name}`,
        body: `${name} was founded with a simple idea: ${industry} should feel personal again. ${desc}`,
        source: "ai_generated",
      },
      contact: {
        title: "Contact us",
        body: "Have a question about an order or product? Reach out and our team will get back to you shortly.",
        email: null,
        phone: null,
        source: "ai_generated",
      },
      faq: {
        title: "Frequently asked questions",
        source: "ai_generated",
        items: [
          {
            question: "How do I place an order?",
            answer: "Browse products, add items to your cart, and complete checkout.",
          },
          {
            question: "What payment methods do you accept?",
            answer: "We accept card payments and bank transfers through secure checkout.",
          },
          {
            question: "How long does delivery take?",
            answer: "Most orders arrive within 2-4 business days.",
          },
        ],
      },
      privacy_policy: {
        title: "Privacy policy",
        source: "platform_default",
        body: `This privacy policy explains how ${name} and Bizgrid collect, use, and protect your personal information when you shop on this storefront.`,
      },
    },
    products:
      store.industry === "fashion_and_apparel"
        ? [
            {
              id: "1",
              slug: `${slugBase}-oversized-hoodie`,
              name: "Oversized Hoodie",
              description: `A relaxed everyday hoodie from ${name}, cut for comfort and layering.`,
              price: 28500,
              currency: "NGN",
              image_url: null,
            },
            {
              id: "2",
              slug: `${slugBase}-wide-leg-trouser`,
              name: "Wide Leg Trouser",
              description: "A clean staple trouser with an easy drape and polished finish.",
              price: 32500,
              currency: "NGN",
              image_url: null,
            },
            {
              id: "3",
              slug: `${slugBase}-zip-sweatshirt`,
              name: "Zip Sweatshirt",
              description: "A versatile midweight layer for weekday fits and weekend plans.",
              price: 24800,
              currency: "NGN",
              image_url: null,
            },
            {
              id: "4",
              slug: `${slugBase}-cotton-tee`,
              name: "Cotton Tee",
              description: "A soft essential tee with a neat shape and breathable feel.",
              price: 14500,
              currency: "NGN",
              image_url: null,
            },
          ]
        : store.industry === "beauty_and_skincare"
          ? [
              {
                id: "1",
                slug: `${slugBase}-botanical-gel-cleanser`,
                name: "Botanical Gel Cleanser",
                description: `A gentle daily cleanser curated by ${name}.`,
                price: 28500,
                currency: "NGN",
                image_url: null,
                category: "Cleansers",
              },
              {
                id: "2",
                slug: `${slugBase}-glow-repair-serum`,
                name: "Glow Repair Serum",
                description: "Lightweight botanical actives for visible radiance and hydration.",
                price: 18500,
                currency: "NGN",
                image_url: null,
                category: "Serums",
              },
              {
                id: "3",
                slug: `${slugBase}-daily-radiance-kit`,
                name: "Daily Radiance Kit",
                description: "Customer favourites packed for a full skincare routine.",
                price: 42000,
                currency: "NGN",
                image_url: null,
                category: "Routine kits",
              },
            ]
          : [
              {
                id: "1",
                slug: `${slugBase}-signature-item`,
                name: `${name} Signature Item`,
                description: `A customer favourite from ${name}.`,
                price: 8500,
                currency: "NGN",
                image_url: null,
              },
              {
                id: "2",
                slug: `${slugBase}-starter-pack`,
                name: `${name} Starter Pack`,
                description: `A great way to try ${name} for the first time.`,
                price: 12500,
                currency: "NGN",
                image_url: null,
              },
              {
                id: "3",
                slug: `${slugBase}-premium-bundle`,
                name: `${name} Premium Bundle`,
                description: "Our best-value bundle for repeat customers.",
                price: 19900,
                currency: "NGN",
                image_url: null,
              },
            ],
    seo: {
      title: `${name} - ${industry.replace(/\b\w/g, (c) => c.toUpperCase())}`,
      description: `${desc.slice(0, 150)}`.replace(/\s+\S*$/, "..."),
    },
  });
}

function recommendTemplates(body: RecommendStorefrontTemplatesInput) {
  const prompt = `${body.prompt ?? ""} ${(body.tone ?? []).join(" ")}`.toLowerCase();
  const concreteTemplates = STOREFRONT_TEMPLATE_OPTIONS.filter(
    (option): option is StorefrontTemplateOption & { value: StorefrontTemplateId } =>
      option.value !== "ai_pick",
  );

  return concreteTemplates
    .map((template) => {
      let score = 0.35;
      const reasons: string[] = [];

      if (body.industry && template.industries?.includes(body.industry)) {
        score += 0.35;
        reasons.push(`strong ${body.industry.replace(/_/g, " ")} fit`);
      }

      const matchedToneTags = (template.tone_tags ?? []).filter((tag) =>
        prompt.includes(tag.toLowerCase()),
      );
      if (matchedToneTags.length) {
        score += Math.min(0.18, matchedToneTags.length * 0.06);
        reasons.push(`matches ${matchedToneTags.slice(0, 2).join(" and ")} tone`);
      }

      const searchText = [
        template.label,
        template.description,
        template.bestFor,
        ...(template.best_for ?? []),
        ...(template.visual_tags ?? []),
      ]
        .join(" ")
        .toLowerCase();
      const keywordMatches = prompt
        .split(/\W+/)
        .filter((word) => word.length > 3 && searchText.includes(word));

      if (keywordMatches.length) {
        score += Math.min(0.12, keywordMatches.length * 0.03);
      }

      return {
        template_id: template.value,
        score: Number(Math.min(score, 0.98).toFixed(2)),
        reason: reasons.length
          ? `Recommended because it has ${reasons.join(" and ")}.`
          : `Recommended as a flexible starting point for ${template.bestFor.toLowerCase()}.`,
      };
    })
    .sort((a, b) => b.score - a.score);
}

function resolveTemplateId(store: Store): StorefrontTemplateId {
  if (store.storefront_template_id && store.storefront_template_id !== "ai_pick") {
    return store.storefront_template_id;
  }

  if (store.industry === "fashion_and_apparel") {
    return "fashion_lookbook";
  }

  if (store.industry === "beauty_and_skincare") {
    return "cosmetics";
  }

  if (store.industry === "home_and_living") {
    return "minimalistic";
  }

  if (store.industry === "electronics" || store.industry === "food_and_beverage") {
    return "minimalistic";
  }

  return "minimalistic";
}
