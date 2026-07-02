import { createFileRoute, Link } from "@tanstack/react-router";
import { Menu, Search, User, ShoppingBag, ArrowRight, ArrowLeft, Star, ChevronDown } from "lucide-react";
import heroChair from "@/assets/hero-chair.jpg";
import collectionModern from "@/assets/collection-modern-form.jpg";
import catChairs from "@/assets/cat-chairs.jpg";
import catTables from "@/assets/cat-tables.jpg";
import catSofas from "@/assets/cat-sofas.jpg";
import catAccessories from "@/assets/cat-accessories.jpg";
import prodLamp from "@/assets/prod-lamp.jpg";
import prodBlueChair from "@/assets/prod-blue-chair.jpg";
import prodSofaChair from "@/assets/prod-sofa-chair.jpg";
import roomLiving from "@/assets/room-living.jpg";
import roomBedroom from "@/assets/room-bedroom.jpg";
import roomDining from "@/assets/room-dining.jpg";
import { products } from "@/lib/products";

export const Route = createFileRoute("/")({
  component: Index,
});

const categories = [
  { name: "Chairs", count: 14, img: catChairs },
  { name: "Tables", count: 11, img: catTables },
  { name: "Sofas", count: 12, img: catSofas },
  { name: "Accessories", count: 22, img: catAccessories },
];

const rooms = [
  { name: "Living Room", copy: "Create a cozy, stylish space you'll love spending time in.", img: roomLiving },
  { name: "Bedroom", copy: "Build a peaceful retreat with comfort-first design.", img: roomBedroom },
  { name: "Dining", copy: "Make every meal feel like a gathering worth having.", img: roomDining },
];

const reviews = [
  {
    name: "Amelia Carter",
    city: "Melbourne",
    product: "Organic Conference Chair",
    price: 220,
    img: prodSofaChair,
    body: "The craftsmanship is absolutely beautiful. The carved details and balanced design instantly elevated my space. It's one of those pieces that quietly steals attention without trying too hard. Truly impressive work.",
  },
  {
    name: "Daniel Morrison",
    city: "Brighton",
    product: "Decker Table Lamp",
    price: 110,
    img: prodLamp,
    body: "Every guest notices these pieces the moment they walk in. The quality, texture, and finish speak for themselves, adding a refined yet cozy feel to the room. It's design that feels both thoughtful and timeless.",
  },
  {
    name: "Lina Farrow",
    city: "Willow Creek",
    product: "Sofa Savile Row von",
    price: 120,
    img: prodBlueChair,
    body: "I fell in love the moment I placed it in my home. The design feels solid, elegant, and full of character — and somehow it looks even better with time. A piece that truly grows with your space.",
  },
];

function Nav() {
  return (
    <header className="bg-primary text-primary-foreground rounded-2xl mx-3 md:mx-6 mt-3 md:mt-6 px-4 md:px-6 h-14 flex items-center justify-between">
      <button aria-label="Menu" className="size-9 rounded-full border border-primary-foreground/30 flex items-center justify-center hover:bg-primary-foreground/10 transition">
        <Menu className="size-4" />
      </button>
      <div className="text-lg md:text-xl tracking-[0.35em] font-semibold" style={{ fontFamily: "var(--font-display)" }}>
        ÉLAVÉ
      </div>
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

function Hero() {
  return (
    <section className="mx-3 md:mx-6 mt-3 relative rounded-3xl overflow-hidden bg-[oklch(0.9_0.02_80)]">
      <img src={heroChair} alt="Modern elegant wingback chair" width={1280} height={1024} className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-background/10 to-transparent" />
      <div className="relative grid md:grid-cols-2 gap-6 p-6 md:p-14 lg:p-20 min-h-[560px] md:min-h-[640px]">
        <div className="flex flex-col justify-between">
          <div>
            <h1 className="text-[15vw] md:text-[6.5rem] lg:text-[8rem] font-bold leading-[0.9] text-foreground">
              Modern<br />&amp; Elegant
            </h1>
            <p className="mt-6 max-w-md text-sm md:text-base text-foreground/70 leading-relaxed">
              Thoughtfully crafted furniture that blends timeless design, everyday comfort, and lasting quality.
            </p>
          </div>
          <div className="flex gap-3 mt-8">
            <button className="bg-background text-foreground px-6 h-12 rounded-full font-medium text-sm hover:bg-background/90 transition">
              Buy now
            </button>
            <button className="border border-foreground/30 text-foreground px-6 h-12 rounded-full font-medium text-sm hover:bg-foreground/5 transition">
              View product
            </button>
          </div>
        </div>
      </div>
      {/* Discount badge */}
      <div className="absolute top-8 right-8 md:top-14 md:right-1/2 md:translate-x-[220%] size-24 md:size-28 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-lg md:text-xl leading-tight text-center shadow-lg rotate-[-8deg]">
        <span>10%<br/>OFF</span>
      </div>
    </section>
  );
}

function Collections() {
  return (
    <section className="mx-3 md:mx-6 mt-16 md:mt-24">
      <div className="flex items-end justify-between mb-8">
        <h2 className="text-3xl md:text-5xl font-semibold">Discover Our Curated Collections</h2>
        <button className="border border-foreground/30 rounded-full px-6 h-11 text-sm font-medium hover:bg-foreground/5 transition shrink-0 ml-4">
          View All
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {categories.map((c) => (
          <a href="#" key={c.name} className="group relative aspect-[4/5] rounded-2xl overflow-hidden">
            <img src={c.img} alt={c.name} width={768} height={768} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute bottom-5 left-5 text-white">
              <div className="text-2xl md:text-3xl font-semibold">{c.name}</div>
              <div className="text-xs opacity-80 mt-1">{c.count} Products</div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

function NewArrivals() {
  return (
    <section className="mx-3 md:mx-6 mt-16 md:mt-24">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h2 className="text-3xl md:text-5xl font-semibold">New Arrivals</h2>
        <div className="flex flex-wrap gap-2 text-sm">
          {["All","Chairs","Tables","Sofas","Accessories"].map((t,i) => (
            <button key={t} className={`px-4 h-9 rounded-full border ${i===0 ? "bg-primary text-primary-foreground border-primary" : "border-foreground/25 hover:bg-foreground/5"}`}>{t}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((p) => (
          <Link to="/product/$slug" params={{ slug: p.slug }} key={p.slug} className="group">
            <div className="aspect-square rounded-2xl bg-card overflow-hidden">
              <img src={p.img} alt={p.name} width={768} height={768} loading="lazy" className="w-full h-full object-cover transition duration-500 group-hover:scale-105" />
            </div>
            <div className="mt-4 px-1">
              <div className="font-medium text-sm md:text-base">{p.name}</div>
              <div className="mt-1 text-sm flex items-baseline gap-2">
                <span className="font-semibold">${p.price.toFixed(2)}</span>
                <span className="text-muted-foreground line-through text-xs">${p.was.toFixed(2)}</span>
              </div>
              <div className="flex gap-1.5 mt-2">
                {p.swatches.map((s) => (
                  <span key={s.hex} className="size-3 rounded-full border border-foreground/10" style={{ backgroundColor: s.hex }} />
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>
      <div className="flex justify-center gap-2 mt-8">
        <button aria-label="Previous" className="size-10 rounded-full border border-foreground/20 hover:bg-foreground/5 flex items-center justify-center"><ArrowLeft className="size-4" /></button>
        <button aria-label="Next" className="size-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><ArrowRight className="size-4" /></button>
      </div>
    </section>
  );
}

function ModernForm() {
  return (
    <section className="mx-3 md:mx-6 mt-16 md:mt-24 relative rounded-3xl overflow-hidden bg-[oklch(0.9_0.02_80)] min-h-[420px] md:min-h-[520px]">
      <img src={collectionModern} alt="Modern Form Collection pink armchair" width={1280} height={1024} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-background/20 to-transparent" />
      <div className="relative p-6 md:p-14 lg:p-20 max-w-xl">
        <div className="text-xs tracking-widest uppercase text-foreground/60 mb-4">New Season Edit</div>
        <h2 className="text-4xl md:text-6xl font-semibold leading-[0.95]">Modern Form<br />Collection</h2>
        <p className="mt-5 text-sm text-foreground/70">Designed for contemporary living.</p>
        <p className="mt-4 text-sm text-foreground/70 max-w-md leading-relaxed">
          Minimal shapes, natural materials, and refined details come together to create furniture that feels calm, functional, and timeless. Crafted to elevate modern spaces — without excess.
        </p>
        <button className="mt-8 bg-background text-foreground px-6 h-12 rounded-full font-medium text-sm hover:bg-background/90 transition">
          View All
        </button>
      </div>
      {/* Ribbon */}
      <div className="absolute top-0 right-0 w-52 h-52 overflow-hidden pointer-events-none">
        <div className="absolute top-8 -right-14 rotate-45 bg-accent text-accent-foreground text-xs font-semibold py-2 w-72 text-center tracking-wider">
          UP TO 10% OFF • UP TO 10% OFF
        </div>
      </div>
      <div className="absolute bottom-6 right-6 flex gap-2">
        <button aria-label="Previous" className="size-10 rounded-full bg-background/80 backdrop-blur border border-foreground/10 flex items-center justify-center"><ArrowLeft className="size-4" /></button>
        <button aria-label="Next" className="size-10 rounded-full bg-background/80 backdrop-blur border border-foreground/10 flex items-center justify-center"><ArrowRight className="size-4" /></button>
      </div>
    </section>
  );
}

function Rooms() {
  return (
    <section className="mx-3 md:mx-6 mt-16 md:mt-24">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl md:text-5xl font-semibold">Style your space by room</h2>
        <div className="flex gap-2">
          <button aria-label="Previous" className="size-10 rounded-full border border-foreground/20 flex items-center justify-center"><ArrowLeft className="size-4" /></button>
          <button aria-label="Next" className="size-10 rounded-full border border-foreground/20 flex items-center justify-center"><ArrowRight className="size-4" /></button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {rooms.map((r) => (
          <div key={r.name} className="relative aspect-[4/5] rounded-2xl overflow-hidden group">
            <img src={r.img} alt={r.name} width={1024} height={768} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 text-white flex items-end justify-between gap-4">
              <div>
                <div className="text-2xl md:text-3xl font-semibold">{r.name}</div>
                <div className="text-xs opacity-85 mt-1 max-w-[220px]">{r.copy}</div>
              </div>
              <button aria-label="View room" className="size-10 rounded-full bg-white/90 text-foreground flex items-center justify-center shrink-0"><ArrowRight className="size-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Reviews() {
  return (
    <section className="mx-3 md:mx-6 mt-16 md:mt-24">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl md:text-5xl font-semibold">Crafted &amp; Loved</h2>
        <div className="flex gap-2">
          <button aria-label="Previous" className="size-10 rounded-full border border-foreground/20 flex items-center justify-center"><ArrowLeft className="size-4" /></button>
          <button aria-label="Next" className="size-10 rounded-full border border-foreground/20 flex items-center justify-center"><ArrowRight className="size-4" /></button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {reviews.map((r) => (
          <article key={r.name} className="bg-card rounded-2xl p-6 border border-border/60">
            <div className="flex items-center gap-3 border border-border rounded-xl p-3">
              <img src={r.img} alt={r.product} width={64} height={64} loading="lazy" className="size-12 rounded-lg object-cover bg-muted" />
              <div>
                <div className="text-sm font-medium">{r.product}</div>
                <div className="text-xs text-muted-foreground mt-0.5">${r.price.toFixed(2)}</div>
              </div>
            </div>
            <div className="flex gap-0.5 mt-4 text-accent">
              {Array.from({length:5}).map((_,i) => <Star key={i} className="size-4 fill-current" />)}
            </div>
            <p className="mt-3 text-sm text-foreground/75 leading-relaxed">{r.body}</p>
            <div className="mt-5 flex items-center gap-3 pt-4 border-t border-border">
              <div className="size-10 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                {r.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div>
                <div className="text-sm font-medium">{r.name}</div>
                <div className="text-xs text-muted-foreground">{r.city}</div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mx-3 md:mx-6 mt-20 md:mt-28 mb-6 bg-primary text-primary-foreground rounded-3xl p-8 md:p-14">
      <div className="grid md:grid-cols-4 gap-10">
        <div className="md:col-span-2">
          <div className="text-2xl tracking-[0.35em] font-semibold" style={{ fontFamily: "var(--font-display)" }}>ÉLAVÉ</div>
          <p className="mt-4 max-w-sm text-sm text-primary-foreground/70">
            Furniture designed to blend timeless silhouettes with the calm of modern living.
          </p>
          <form className="mt-6 flex gap-2 max-w-sm">
            <input type="email" placeholder="Enter your email" className="flex-1 bg-primary-foreground/10 border border-primary-foreground/20 rounded-full px-4 h-11 text-sm placeholder:text-primary-foreground/50 outline-none focus:border-primary-foreground/50" />
            <button className="bg-accent text-accent-foreground rounded-full px-5 h-11 text-sm font-medium">Subscribe</button>
          </form>
        </div>
        {[
          { title: "Shop", links: ["Chairs","Tables","Sofas","Accessories"] },
          { title: "Company", links: ["About","Journal","Stockists","Contact"] },
        ].map(col => (
          <div key={col.title}>
            <div className="text-sm font-semibold mb-4">{col.title}</div>
            <ul className="space-y-3 text-sm text-primary-foreground/70">
              {col.links.map(l => <li key={l}><a href="#" className="hover:text-primary-foreground">{l}</a></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-12 pt-6 border-t border-primary-foreground/15 text-xs text-primary-foreground/60 flex flex-wrap justify-between gap-2">
        <span>© {new Date().getFullYear()} ÉLAVÉ. All rights reserved.</span>
        <span>Crafted with care.</span>
      </div>
    </footer>
  );
}

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main>
        <Hero />
        <Collections />
        <NewArrivals />
        <ModernForm />
        <Rooms />
        <Reviews />
      </main>
      <Footer />
    </div>
  );
}
