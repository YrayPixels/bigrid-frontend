import { getStoreSubdomainHost } from "@/lib/store-host";
import type {
  AuthResponse,
  CreateStoreOrderInput,
  CreateStoreInput,
  MerchantDashboardOverview,
  PublicStorefront,
  Store,
  StoreOrder,
  StoreOrdersResponse,
  StoreOrderStatus,
  StorefrontContent,
  StorefrontTemplateId,
  UpdateStorefrontInput,
  User,
} from "./types";

const STORAGE_KEY = "storehaus_mock_db_v1";

type MockDB = {
  users: Record<string, { user: User; password: string }>;
  stores: Record<string, Store>;
  storefronts: Record<string, StorefrontContent>;
  orders: Record<string, StoreOrder[]>;
  visits: Record<string, { session_id?: string; path?: string; referrer?: string; visited_at: string }[]>;
  sessions: Record<string, string>;
};

function emptyDb(): MockDB {
  return { users: {}, stores: {}, storefronts: {}, orders: {}, visits: {}, sessions: {} };
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
      orders: db.orders ?? {},
      visits: db.visits ?? {},
      sessions: db.sessions ?? {},
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
  return new Date(b.placed_at ?? b.created_at ?? 0).getTime() - new Date(a.placed_at ?? a.created_at ?? 0).getTime();
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
    const activeOrders = orders.filter((order) => !["cancelled", "refunded"].includes(order.status));
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
        conversion_rate: visits.length ? Number(((orders.length / visits.length) * 100).toFixed(2)) : 0,
        products_count: (db.storefronts[store.id] ?? synthesizeStorefront(store)).products?.length ?? 0,
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
    return { storefront: db.storefronts[storeId] ?? null };
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

    db.storefronts[storeId] = body.storefront;
    save(db);
    return { storefront: body.storefront };
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
    const storefront = db.storefronts[store.id] ?? synthesizeStorefront(store);
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
    const storefront = db.storefronts[store.id] ?? synthesizeStorefront(store);
    return { store, storefront, generation_id: null };
  },

  async placeOrder(slug: string, body: CreateStoreOrderInput): Promise<{ order: StoreOrder }> {
    await delay(500);
    const db = load();
    const store = Object.values(db.stores).find((entry) => entry.slug === slug);
    if (!store) throw { status: 404, message: "Storefront not found" };
    const storefront = db.storefronts[store.id] ?? synthesizeStorefront(store);
    const products = new Map((storefront.products ?? []).map((product) => [product.id, product]));
    const items = body.items.map((line) => {
      const product = products.get(line.product_id);
      if (!product) throw { status: 422, message: `Product ${line.product_id} is no longer available.` };
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
};

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
      headline: `Glow with ${name}.`,
      sub: `${desc} Clean formulas, real results.`,
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

function resolveTemplateId(store: Store): StorefrontTemplateId {
  if (store.storefront_template_id && store.storefront_template_id !== "ai_pick") {
    return store.storefront_template_id;
  }

  if (store.industry === "fashion_and_apparel") {
    return "fashion_lookbook";
  }

  if (store.industry === "beauty_and_skincare") {
    return "minimalistic";
  }

  if (store.industry === "home_and_living") {
    return "editorial";
  }

  if (store.industry === "electronics" || store.industry === "food_and_beverage") {
    return "bold_grid";
  }

  return "classic";
}
