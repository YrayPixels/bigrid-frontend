import { getStoreSubdomainHost } from "@/lib/store-host";
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
  RecommendStorefrontTemplatesInput,
  Store,
  StoreOrder,
  StoreOrdersResponse,
  StoreOrderStatus,
  StoreProduct,
  StorefrontContent,
  StorefrontTemplateId,
  StorefrontTemplateOption,
  UpdateStorefrontInput,
  User,
} from "./types";

const STORAGE_KEY = "storehaus_mock_db_v1";

type MockDB = {
  users: Record<string, { user: User; password: string }>;
  stores: Record<string, Store>;
  storefronts: Record<string, StorefrontContent>;
  products: Record<string, StoreProduct[]>;
  orders: Record<string, StoreOrder[]>;
  visits: Record<
    string,
    { session_id?: string; path?: string; referrer?: string; visited_at: string }[]
  >;
  sessions: Record<string, string>;
  builderSessions: Record<string, BuilderSession>;
};

function emptyDb(): MockDB {
  return {
    users: {},
    stores: {},
    storefronts: {},
    products: {},
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
      products: db.products ?? {},
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
    const user: User = { id: uid(), name: body.name, email: body.email, has_store: false };
    db.users[user.id] = { user, password: body.password };
    const token = `mock_${uid()}`;
    db.sessions[token] = user.id;
    save(db);
    return { token, user };
  },

  async login(body: { email: string; password: string }): Promise<AuthResponse> {
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

  async logout(token: string) {
    await delay(150);
    const db = load();
    delete db.sessions[token];
    save(db);
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
    const slug = slugify(body.business_name);
    const store: Store = {
      id: uid(),
      slug,
      subdomain: slug,
      subdomain_host: getStoreSubdomainHost(slug),
      primary_domain: getStoreSubdomainHost(slug),
      storefront_template_id: body.storefront_template_id ?? "classic",
      ...body,
    };
    db.stores[userId] = store;
    if (db.users[userId]) db.users[userId].user.has_store = true;
    save(db);
    return { store };
  },

  async getMyStore(token: string): Promise<{ store: Store | null }> {
    await delay(200);
    const db = load();
    const userId = db.sessions[token];
    if (!userId) throw { status: 401, message: "Unauthenticated" };
    return { store: db.stores[userId] ?? null };
  },

  async getDashboardOverview(token: string): Promise<MerchantDashboardOverview> {
    await delay(250);
    const { db, store } = findStoreForToken(token);
    const orders = db.orders[store.id] ?? [];
    const visits = db.visits[store.id] ?? [];
    const activeOrders = orders.filter(
      (order) => !["cancelled", "refunded"].includes(order.status),
    );
    const totalSales = activeOrders.reduce((sum, order) => sum + order.total_amount, 0);
    const today = new Date().toISOString().slice(0, 10);
    const salesByDay = Array.from({ length: 14 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (13 - index));
      const key = date.toISOString().slice(0, 10);
      const dayOrders = activeOrders.filter((order) => order.placed_at?.slice(0, 10) === key);
      return {
        date: key,
        orders: dayOrders.length,
        sales: dayOrders.reduce((sum, order) => sum + order.total_amount, 0),
      };
    });

    return {
      metrics: {
        total_orders: orders.length,
        pending_orders: orders.filter((order) => order.status === "pending").length,
        fulfilled_orders: orders.filter((order) => order.status === "fulfilled").length,
        total_sales: totalSales,
        average_order_value: orders.length ? totalSales / orders.length : 0,
        total_visits: visits.length,
        visits_today: visits.filter((visit) => visit.visited_at.slice(0, 10) === today).length,
        conversion_rate: visits.length
          ? Number(((orders.length / visits.length) * 100).toFixed(2))
          : 0,
        products_count: (db.products[store.id] ?? []).length,
      },
      sales_by_day: salesByDay,
      recent_orders: [...orders].sort(byLatestOrder).slice(0, 5),
    };
  },

  async getOrders(
    token: string,
    filters: { status?: string; search?: string; page?: number; per_page?: number } = {},
  ): Promise<StoreOrdersResponse> {
    await delay(250);
    const { db, store } = findStoreForToken(token);
    const search = filters.search?.trim().toLowerCase();
    let orders = [...(db.orders[store.id] ?? [])].sort(byLatestOrder);
    if (filters.status && filters.status !== "all") {
      orders = orders.filter((order) => order.status === filters.status);
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

  async updateOrderStatus(
    token: string,
    orderId: string,
    body: { status: StoreOrderStatus; notes?: string },
  ): Promise<{ order: StoreOrder; message: string }> {
    await delay(200);
    const { db, store } = findStoreForToken(token);
    const orders = db.orders[store.id] ?? [];
    const order = orders.find((entry) => entry.id === orderId);
    if (!order) throw { status: 404, message: "Order not found" };
    order.status = body.status;
    order.notes = body.notes ?? order.notes;
    order.updated_at = new Date().toISOString();
    save(db);
    return { order, message: "Order updated." };
  },

  async generateStorefront(
    token: string,
    body: { store_id: string; storefront_template_id?: StorefrontTemplateId },
  ): Promise<{ generation_id: string; storefront: StorefrontContent }> {
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
    return { generation_id: uid(), storefront };
  },

  async getStorefront(
    token: string,
    storeId: string,
  ): Promise<{ storefront: StorefrontContent | null }> {
    await delay(150);
    const db = load();
    const userId = db.sessions[token];
    if (!userId) throw { status: 401, message: "Unauthenticated" };
    return { storefront: storefrontForStore(db, storeId) };
  },

  async updateStorefront(
    token: string,
    storeId: string,
    body: UpdateStorefrontInput,
  ): Promise<{ storefront: StorefrontContent }> {
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
    return { storefront: storefrontForStore(db, storeId)! };
  },

  async getProducts(token: string): Promise<StoreProduct[]> {
    await delay(150);
    const { db, store } = findStoreForToken(token);
    return db.products[store.id] ?? [];
  },

  async createProduct(
    token: string,
    body: Omit<StoreProduct, "id"> & { id?: string },
  ): Promise<StoreProduct> {
    await delay(250);
    const { db, store } = findStoreForToken(token);
    const product: StoreProduct = {
      ...body,
      id: body.id ?? uid(),
      slug: body.slug || slugify(body.name),
      currency: body.currency || "NGN",
      image_url: body.image_url ?? null,
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
    const updated = { ...products[index], ...body, id: productId };
    products[index] = updated;
    db.products[store.id] = products;
    save(db);
    return updated;
  },

  async deleteProduct(token: string, productId: string): Promise<void> {
    await delay(200);
    const { db, store } = findStoreForToken(token);
    db.products[store.id] = (db.products[store.id] ?? []).filter((item) => item.id !== productId);
    save(db);
  },

  async importProducts(token: string, products: StoreProduct[]): Promise<StoreProduct[]> {
    await delay(350);
    const { db, store } = findStoreForToken(token);
    db.products[store.id] = [...products, ...(db.products[store.id] ?? [])];
    save(db);
    return db.products[store.id] ?? [];
  },

  async updateMyStore(token: string, body: { brand_color?: string }): Promise<{ store: Store }> {
    await delay(200);
    const db = load();
    const userId = db.sessions[token];
    if (!userId) throw { status: 401, message: "Unauthenticated" };
    const store = db.stores[userId];
    if (!store) throw { status: 404, message: "Store not found" };
    if (body.brand_color) store.brand_color = body.brand_color;
    save(db);
    return { store };
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

  async getPublicStorefront(slug: string): Promise<PublicStorefront> {
    await delay(200);
    const db = load();
    const store = Object.values(db.stores).find((entry) => entry.slug === slug);
    if (!store) throw { status: 404, message: "Storefront not found" };
    const storefront = storefrontForStore(db, store.id) ?? synthesizeStorefront(store);
    return { store, storefront, generation_id: null };
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
    const storefront = storefrontForStore(db, store.id) ?? synthesizeStorefront(store);
    return { store, storefront, generation_id: null };
  },

  async placeOrder(slug: string, body: CreateStoreOrderInput): Promise<{ order: StoreOrder }> {
    await delay(500);
    const db = load();
    const store = Object.values(db.stores).find((entry) => entry.slug === slug);
    if (!store) throw { status: 404, message: "Storefront not found" };
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
        content:
          "Hi! I'm your storefront builder. Tell me about your business — what you sell, who it's for, and the vibe you want — and I'll recommend templates and draft your site.",
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

    const next = processBuilderMessage(db, userId, session, message);
    db.builderSessions[userId] = next;
    save(db);
    return { session: hydrateBuilderSession(db, next) };
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
    session.status = "template_recommendation";
    if (session.store) {
      const store = db.stores[userId];
      if (store) store.storefront_template_id = templateId;
    }
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
      content: result.changed_paths.length
        ? `Updated: ${result.changed_paths.join(", ")}.`
        : "I reviewed your request but did not change any protected fields.",
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
};

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

function processBuilderMessage(
  db: MockDB,
  userId: string,
  session: BuilderSession,
  message: string,
): BuilderSession {
  session.business_profile = extractBusinessProfile(message, session.business_profile ?? {});
  const profile = session.business_profile;
  const hasMinimum =
    !!profile.business_name &&
    !!profile.description &&
    profile.description.length >= 10;

  const wantsWebsite =
    /\b(build|create|generate|make)\b.*\b(website|site|storefront|store|draft)\b/i.test(message) ||
    /\b(build my website|generate my website|create my website|yes proceed|yes,? build|go ahead)\b/i.test(
      message,
    );

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
    if (path === "about.body") next.about.body = value;
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
    setPath("about.body", `${next.about.body} Updated to match your request.`);
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

  return {
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
        body: `This privacy policy explains how ${name} and Storehaus collect, use, and protect your personal information when you shop on this storefront.`,
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
  };
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
