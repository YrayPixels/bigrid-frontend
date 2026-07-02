import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import {
  Menu, Search, User, ShoppingBag, ChevronDown, ChevronRight,
  Star, Minus, Plus, Truck, RotateCcw, ShieldCheck, Heart, Share2,
} from "lucide-react";
import { getProduct, products, type Product } from "@/lib/products";

export const Route = createFileRoute("/product/$slug")({
  loader: ({ params }) => {
    const product = getProduct(params.slug);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.product.name} — ÉLAVÉ` },
          { name: "description", content: loaderData.product.short },
          { property: "og:title", content: `${loaderData.product.name} — ÉLAVÉ` },
          { property: "og:description", content: loaderData.product.short },
          { property: "og:image", content: loaderData.product.img },
        ]
      : [],
  }),
  component: ProductPage,
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-sm text-muted-foreground">Product not found</div>
        <Link to="/" className="mt-3 inline-block underline">Back to shop</Link>
      </div>
    </div>
  ),
});

function Nav() {
  return (
    <header className="bg-primary text-primary-foreground rounded-2xl mx-3 md:mx-6 mt-3 md:mt-6 px-4 md:px-6 h-14 flex items-center justify-between">
      <button aria-label="Menu" className="size-9 rounded-full border border-primary-foreground/30 flex items-center justify-center hover:bg-primary-foreground/10 transition">
        <Menu className="size-4" />
      </button>
      <Link to="/" className="text-lg md:text-xl tracking-[0.35em] font-semibold" style={{ fontFamily: "var(--font-display)" }}>
        ÉLAVÉ
      </Link>
      <div className="flex items-center gap-2 md:gap-4 text-sm">
        <button className="hidden md:flex items-center gap-1.5 opacity-90 hover:opacity-100">
          <span className="inline-block w-4 h-3 rounded-sm bg-gradient-to-b from-red-500 via-white to-blue-600" />
          USD $ <ChevronDown className="size-3.5" />
        </button>
        <button aria-label="Search" className="size-9 rounded-full hover:bg-primary-foreground/10 flex items-center justify-center"><Search className="size-4" /></button>
        <button aria-label="Account" className="size-9 rounded-full hover:bg-primary-foreground/10 flex items-center justify-center"><User className="size-4" /></button>
        <button aria-label="Cart" className="size-9 rounded-full hover:bg-primary-foreground/10 flex items-center justify-center"><ShoppingBag className="size-4" /></button>
      </div>
    </header>
  );
}

function ProductPage() {
  const { product } = Route.useLoaderData() as { product: Product };
  const [activeImg, setActiveImg] = useState(0);
  const [color, setColor] = useState(0);
  const [size, setSize] = useState(0);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<"description" | "specs" | "shipping">("description");

  const discount = Math.round(((product.was - product.price) / product.was) * 100);
  const related = products.filter((p) => p.slug !== product.slug).slice(0, 4);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />

      {/* Breadcrumb */}
      <nav className="mx-3 md:mx-6 mt-6 text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="size-3" />
        <span className="hover:text-foreground cursor-pointer">Shop</span>
        <ChevronRight className="size-3" />
        <span className="hover:text-foreground cursor-pointer">{product.category}</span>
        <ChevronRight className="size-3" />
        <span className="text-foreground">{product.name}</span>
      </nav>

      {/* Main product section */}
      <section className="mx-3 md:mx-6 mt-6 grid lg:grid-cols-2 gap-6 lg:gap-10">
        {/* Gallery */}
        <div className="grid grid-cols-[80px_1fr] gap-4">
          <div className="flex flex-col gap-3">
            {product.gallery.map((g, i) => (
              <button
                key={i}
                onClick={() => setActiveImg(i)}
                className={`aspect-square rounded-xl overflow-hidden bg-card border-2 transition ${activeImg === i ? "border-foreground" : "border-transparent hover:border-border"}`}
              >
                <img src={g} alt="" width={80} height={80} loading="lazy" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
          <div className="relative aspect-square rounded-2xl bg-card overflow-hidden">
            <img src={product.gallery[activeImg]} alt={product.name} width={1024} height={1024} className="w-full h-full object-cover" />
            {discount > 0 && (
              <div className="absolute top-5 left-5 size-16 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-sm font-bold text-center rotate-[-8deg] shadow-lg">
                {discount}%<br/>OFF
              </div>
            )}
            <div className="absolute top-5 right-5 flex flex-col gap-2">
              <button aria-label="Wishlist" className="size-10 rounded-full bg-background/80 backdrop-blur border border-border flex items-center justify-center hover:bg-background"><Heart className="size-4" /></button>
              <button aria-label="Share" className="size-10 rounded-full bg-background/80 backdrop-blur border border-border flex items-center justify-center hover:bg-background"><Share2 className="size-4" /></button>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="lg:pt-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{product.category} · SKU {product.sku}</div>
          <h1 className="mt-3 text-4xl md:text-5xl lg:text-6xl font-semibold leading-[0.95]">{product.name}</h1>

          <div className="mt-4 flex items-center gap-3 text-sm">
            <div className="flex gap-0.5 text-accent">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`size-4 ${i < Math.round(product.rating) ? "fill-current" : "opacity-30"}`} />
              ))}
            </div>
            <span className="font-medium">{product.rating}</span>
            <span className="text-muted-foreground">({product.reviewCount} reviews)</span>
          </div>

          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-4xl font-semibold">${product.price.toFixed(2)}</span>
            <span className="text-lg text-muted-foreground line-through">${product.was.toFixed(2)}</span>
            <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded-full font-medium">Save ${(product.was - product.price).toFixed(2)}</span>
          </div>

          <p className="mt-6 text-foreground/75 leading-relaxed">{product.short}</p>

          {/* Color */}
          <div className="mt-8">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Color</span>
              <span className="text-muted-foreground">{product.swatches[color].name}</span>
            </div>
            <div className="mt-3 flex gap-3">
              {product.swatches.map((s, i) => (
                <button
                  key={s.name}
                  onClick={() => setColor(i)}
                  aria-label={s.name}
                  className={`size-10 rounded-full border-2 transition ${color === i ? "border-foreground scale-110" : "border-border hover:border-foreground/40"}`}
                  style={{ backgroundColor: s.hex }}
                />
              ))}
            </div>
          </div>

          {/* Size */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Size</span>
              <button className="text-muted-foreground hover:text-foreground underline underline-offset-2">Size guide</button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {product.sizes.map((s, i) => (
                <button
                  key={s}
                  onClick={() => setSize(i)}
                  className={`px-4 h-11 rounded-full border text-sm transition ${size === i ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-foreground/40"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity + Add */}
          <div className="mt-8 flex gap-3">
            <div className="flex items-center border border-border rounded-full h-14 px-2">
              <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease" className="size-10 flex items-center justify-center rounded-full hover:bg-muted"><Minus className="size-4" /></button>
              <span className="w-10 text-center font-medium tabular-nums">{qty}</span>
              <button onClick={() => setQty(Math.min(product.stock, qty + 1))} aria-label="Increase" className="size-10 flex items-center justify-center rounded-full hover:bg-muted"><Plus className="size-4" /></button>
            </div>
            <button className="flex-1 h-14 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition flex items-center justify-center gap-2">
              <ShoppingBag className="size-4" /> Add to cart — ${(product.price * qty).toFixed(2)}
            </button>
          </div>
          <button className="mt-3 w-full h-14 border border-foreground/30 rounded-full font-medium hover:bg-foreground/5 transition">
            Buy it now
          </button>

          <div className="mt-4 text-xs text-muted-foreground flex items-center gap-2">
            <span className="size-2 rounded-full bg-green-600" />
            In stock — {product.stock} available, ships in 2–3 weeks
          </div>

          {/* Trust row */}
          <div className="mt-8 grid grid-cols-3 gap-3 pt-6 border-t border-border">
            {[
              { icon: Truck, label: "Free delivery", note: "Orders over $500" },
              { icon: RotateCcw, label: "30-day returns", note: "No questions asked" },
              { icon: ShieldCheck, label: "10-year warranty", note: "Craft guaranteed" },
            ].map((t) => (
              <div key={t.label} className="text-center">
                <t.icon className="size-5 mx-auto text-foreground/70" />
                <div className="mt-2 text-xs font-medium">{t.label}</div>
                <div className="text-xs text-muted-foreground">{t.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="mx-3 md:mx-6 mt-20">
        <div className="flex gap-6 border-b border-border">
          {([
            ["description", "Description"],
            ["specs", "Specifications"],
            ["shipping", "Shipping & Returns"],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`pb-4 text-sm font-medium border-b-2 -mb-px transition ${tab === k ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="py-8 grid md:grid-cols-2 gap-10 max-w-4xl">
          {tab === "description" && (
            <>
              <p className="text-foreground/75 leading-relaxed">{product.description}</p>
              <ul className="space-y-2 text-sm">
                {product.features.map((f) => (
                  <li key={f} className="flex gap-3">
                    <span className="size-1.5 rounded-full bg-accent mt-2 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {tab === "specs" && (
            <div className="md:col-span-2 grid sm:grid-cols-2 gap-x-10">
              {product.specs.map((s) => (
                <div key={s.label} className="flex justify-between py-3 border-b border-border text-sm">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="font-medium">{s.value}</span>
                </div>
              ))}
            </div>
          )}
          {tab === "shipping" && (
            <div className="md:col-span-2 space-y-4 text-sm text-foreground/75 max-w-2xl leading-relaxed">
              <p>Every piece ships from our workshop within 2–3 weeks. Standard delivery is free on orders over $500 within the continental US. White-glove delivery, including in-home placement and packaging removal, is available at checkout.</p>
              <p>Not the right fit? Return any unused piece within 30 days for a full refund. Custom orders are final sale.</p>
            </div>
          )}
        </div>
      </section>

      {/* Related */}
      <section className="mx-3 md:mx-6 mt-16 mb-20">
        <div className="flex items-end justify-between mb-8">
          <h2 className="text-3xl md:text-4xl font-semibold">You may also like</h2>
          <Link to="/" className="text-sm underline underline-offset-4">View all</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {related.map((p) => (
            <Link
              key={p.slug}
              to="/product/$slug"
              params={{ slug: p.slug }}
              className="group"
            >
              <div className="aspect-square rounded-2xl bg-card overflow-hidden">
                <img src={p.img} alt={p.name} width={768} height={768} loading="lazy" className="w-full h-full object-cover transition duration-500 group-hover:scale-105" />
              </div>
              <div className="mt-4 px-1">
                <div className="font-medium text-sm md:text-base">{p.name}</div>
                <div className="mt-1 text-sm flex items-baseline gap-2">
                  <span className="font-semibold">${p.price.toFixed(2)}</span>
                  <span className="text-muted-foreground line-through text-xs">${p.was.toFixed(2)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}