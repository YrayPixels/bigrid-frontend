import { getStoreSubdomainHost } from "@/lib/store-host";
import type {
  AuthResponse,
  CreateStoreInput,
  PublicStorefront,
  Store,
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
  sessions: Record<string, string>;
};

function emptyDb(): MockDB {
  return { users: {}, stores: {}, storefronts: {}, sessions: {} };
}

function load(): MockDB {
  if (typeof window === "undefined") return emptyDb();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyDb();
  try {
    return JSON.parse(raw) as MockDB;
  } catch {
    return emptyDb();
  }
}

function save(db: MockDB) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
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

  if (store.industry === "beauty_and_skincare" || store.industry === "home_and_living") {
    return "editorial";
  }

  if (store.industry === "electronics" || store.industry === "food_and_beverage") {
    return "bold_grid";
  }

  return "classic";
}
