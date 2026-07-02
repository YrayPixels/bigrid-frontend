import { createFileRoute } from "@tanstack/react-router";
import { ShoppingBag, User, Search, ChevronDown } from "lucide-react";
import hero from "@/assets/hero.jpg";
import match from "@/assets/match.jpg";
import kit from "@/assets/kit.jpg";
import textureBg from "@/assets/texture-bg.jpg";
import style1 from "@/assets/style-1.jpg";
import style2 from "@/assets/style-2.jpg";
import style3 from "@/assets/style-3.jpg";
import product1 from "@/assets/product-1.jpg";
import product2 from "@/assets/product-2.jpg";
import product3 from "@/assets/product-3.jpg";
import product4 from "@/assets/product-4.jpg";

export const Route = createFileRoute("/")({
  component: Index,
});

function Logo() {
  return (
    <a href="/" className="flex flex-col items-center leading-none">
      <span className="font-script text-4xl -mb-1 text-ink">Lush</span>
      <span className="text-[0.6rem] tracking-[0.4em] font-medium text-ink">ROOTS</span>
    </a>
  );
}

function Nav() {
  const links = ["Shop", "Our Textures", "Our Story", "Extensions Care 101", "Help"];
  return (
    <header className="absolute top-0 left-0 right-0 z-20">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10 py-6 grid grid-cols-3 items-center">
        <nav className="hidden lg:flex items-center gap-8 text-[0.72rem] tracking-[0.28em] font-medium uppercase text-ink">
          <a href="#shop" className="flex items-center gap-1 hover:opacity-60 transition">
            Shop <ChevronDown className="h-3 w-3" />
          </a>
          <a href="#textures" className="hover:opacity-60 transition">Our Textures</a>
        </nav>
        <div className="flex justify-center col-start-2">
          <Logo />
        </div>
        <div className="flex items-center justify-end gap-6 text-[0.72rem] tracking-[0.28em] font-medium uppercase text-ink">
          <a href="#story" className="hidden lg:inline hover:opacity-60 transition">Our Story</a>
          <a href="#care" className="hidden lg:inline hover:opacity-60 transition">Extensions Care 101</a>
          <a href="#help" className="hidden lg:inline hover:opacity-60 transition">Help</a>
          <div className="flex items-center gap-4 pl-2">
            <button aria-label="Cart" className="hover:opacity-60 transition"><ShoppingBag className="h-4 w-4" /></button>
            <button aria-label="Account" className="hover:opacity-60 transition"><User className="h-4 w-4" /></button>
            <button aria-label="Search" className="hover:opacity-60 transition"><Search className="h-4 w-4" /></button>
          </div>
        </div>
      </div>
      {/* mobile nav */}
      <div className="lg:hidden flex justify-center gap-6 pb-3 text-[0.65rem] tracking-[0.24em] uppercase text-ink">
        {links.map((l) => (
          <a key={l} href="#" className="hover:opacity-60">{l.split(" ")[0]}</a>
        ))}
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden" style={{ background: "linear-gradient(180deg,#f8d0c4 0%,#f6c9bd 60%,#f2b8ab 100%)" }}>
      <Nav />
      <div className="relative mx-auto max-w-[1400px] px-6 lg:px-10 pt-40 pb-16 lg:pt-44 lg:pb-24 min-h-[720px] lg:min-h-[820px] grid lg:grid-cols-2 gap-8 items-end">
        <div className="relative z-10 max-w-lg">
          <h1 className="font-serif text-6xl lg:text-7xl xl:text-8xl leading-[0.95] text-ink">
            Be beautiful,
            <br />
            be you,
            <span className="block font-script text-white text-6xl lg:text-7xl xl:text-8xl leading-none mt-2 pl-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.08)]">
              naturally.
            </span>
          </h1>
          <p className="mt-8 text-sm lg:text-base text-ink/80 max-w-sm leading-relaxed">
            Premium virgin hair extensions
            <br />
            created exclusively for natural textures.
          </p>
          <a
            href="#shop"
            className="mt-8 inline-flex items-center justify-center bg-white text-ink text-[0.7rem] tracking-[0.3em] uppercase font-semibold px-10 py-4 hover:bg-ink hover:text-white transition-colors"
          >
            Shop Now
          </a>
        </div>
        <div className="relative lg:absolute lg:inset-y-0 lg:right-0 lg:w-[58%] flex items-end justify-center">
          <img
            src={hero}
            alt="Model with voluminous natural curly hair"
            width={1280}
            height={1280}
            className="h-full w-auto max-h-[820px] object-contain object-bottom"
          />
        </div>
      </div>
    </section>
  );
}

function TwoUp() {
  return (
    <section id="shop" className="grid md:grid-cols-2">
      <div className="bg-[#f5f2ec] px-8 lg:px-16 py-20 lg:py-28 flex flex-col items-center text-center">
        <h2 className="font-serif text-4xl lg:text-5xl text-ink">The perfect match.</h2>
        <p className="mt-6 max-w-md text-sm text-ink/70 leading-relaxed">
          Our signature textures are created to blend flawlessly with the natural curls, coils, and kinks you were born with.
        </p>
        <a
          href="#"
          className="mt-8 inline-flex items-center justify-center bg-ink text-white text-[0.7rem] tracking-[0.3em] uppercase font-semibold px-8 py-3.5 hover:bg-ink/80 transition-colors"
        >
          Shop Extensions
        </a>
        <img src={match} alt="Model with radiant natural afro" width={900} height={1100} loading="lazy" className="mt-14 max-h-[520px] w-auto object-contain" />
      </div>
      <div className="bg-white px-8 lg:px-16 py-20 lg:py-28 flex flex-col items-center text-center">
        <h2 className="font-serif text-4xl lg:text-5xl text-ink">Perfect extensions kit.</h2>
        <p className="mt-6 max-w-md text-sm text-ink/70 leading-relaxed">
          Our texture-tailored maintenance kits are specially formulated to meet the needs of hair extensions wearers everywhere.
        </p>
        <a
          href="#"
          className="mt-8 inline-flex items-center justify-center bg-ink text-white text-[0.7rem] tracking-[0.3em] uppercase font-semibold px-8 py-3.5 hover:bg-ink/80 transition-colors"
        >
          Shop Extensions Care
        </a>
        <img src={kit} alt="Extensions care kit with bottles and brush" width={1100} height={1100} loading="lazy" className="mt-14 max-h-[520px] w-auto object-contain" />
      </div>
    </section>
  );
}

const differences = [
  {
    n: "01",
    title: "Uncompromised Quality",
    body: "To us, quality is everything. We know the difference between a 'quick fix' and a transformative product crafted with care. Our priority is to offer you beautiful extensions that really last.",
  },
  {
    n: "02",
    title: "Black-Owned & Operated",
    body: "The Black women behind Lush Roots are naturals, just like you. We know what's needed to achieve the perfect look and will stop at nothing to give it to you. We deserve it, after all.",
  },
  {
    n: "03",
    title: "Curl Pattern Pioneers",
    body: "We're the creators and tastemakers of the original natural hair extensions movement. Nine years in, we continue to innovate, so that you always get next-level styles ahead of the rest.",
  },
  {
    n: "04",
    title: "Ethically Sourced",
    body: "We know where our virgin hair comes from because we own the factory that creates our signature textures. From our honest and fair donor collection process to our multi-step filtration methods, we ensure our products are made the right way.",
  },
];

function Difference() {
  return (
    <section
      id="story"
      className="relative py-24 lg:py-32 text-white"
      style={{
        backgroundImage: `linear-gradient(rgba(10,8,8,0.72),rgba(10,8,8,0.82)), url(${textureBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="mx-auto max-w-[1200px] px-6 lg:px-10">
        <h2 className="font-script text-6xl lg:text-7xl text-white text-center">
          the lush roots difference
        </h2>
        <div className="mt-16 grid md:grid-cols-2 gap-x-16 gap-y-14">
          {differences.map((d) => (
            <div key={d.n} className="relative pl-24">
              <span className="absolute left-0 top-0 font-serif text-6xl text-white/15 leading-none">{d.n}</span>
              <h3 className="text-[0.75rem] tracking-[0.32em] uppercase font-semibold text-white">
                {d.title}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-white/75 max-w-md">{d.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-20 text-center text-[0.7rem] tracking-[0.3em] uppercase text-white/80">
          <a href="#" className="underline underline-offset-4 hover:text-white">See More Reasons</a>{" "}
          why over 250,000 women believe in and trust the Lush Roots difference
        </p>
      </div>
    </section>
  );
}

function ChooseStyle() {
  return (
    <section id="textures" className="py-20 lg:py-28 bg-white">
      <div className="mx-auto max-w-[1200px] px-6 lg:px-10">
        <h2 className="font-serif text-4xl lg:text-5xl text-center text-ink">Choose your style</h2>
        <div className="mt-14 grid grid-cols-2 gap-4 lg:gap-6">
          <div className="relative bg-ink text-white aspect-square overflow-hidden flex flex-col items-center justify-center text-center p-8 group">
            <img src={style3} alt="" width={800} height={800} loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-30 group-hover:opacity-40 transition" />
            <div className="relative">
              <h3 className="font-serif text-2xl lg:text-3xl">Wefted hair<br />& closures</h3>
              <p className="mt-3 text-xs text-white/75 max-w-[220px] mx-auto">For protective styles that perfectly match your texture.</p>
              <a href="#" className="mt-5 inline-flex bg-blush text-ink text-[0.65rem] tracking-[0.3em] uppercase font-semibold px-6 py-2.5 hover:bg-white transition">Shop Now</a>
            </div>
          </div>
          <StyleTile img={style1} label="Ponytails & buns" />
          <StyleTile img={style2} label="Headband wigs" />
          <StyleTile img={style3} label="Clip-ins" />
        </div>
      </div>
    </section>
  );
}

function StyleTile({ img, label }: { img: string; label: string }) {
  return (
    <div className="relative aspect-square overflow-hidden bg-blush group">
      <img src={img} alt={label} width={800} height={800} loading="lazy" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700" />
      <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/40 to-transparent">
        <span className="text-white text-[0.7rem] tracking-[0.3em] uppercase font-semibold">{label}</span>
      </div>
    </div>
  );
}

const bestsellers = [
  { img: product1, label: '"For Kurls" Wefted Hair', tag: "for kurls" },
  { img: product2, label: '"For Koils" Wefted Hair', tag: "for kols" },
  { img: product3, label: '"For Kinks" Clip-Ins', tag: "for kinks" },
  { img: product4, label: '"For Kurls" Clip-Ins', tag: "for kurls" },
];

function Bestsellers() {
  return (
    <section className="py-20 lg:py-28 bg-white">
      <div className="mx-auto max-w-[1200px] px-6 lg:px-10">
        <h2 className="font-serif text-4xl lg:text-5xl text-center text-ink">Best sellers</h2>
        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-10">
          {bestsellers.map((p) => (
            <div key={p.label} className="text-center flex flex-col items-center">
              <span className="font-script text-3xl text-ink/70 mb-2">{p.tag}</span>
              <div className="aspect-[3/4] w-full flex items-end justify-center">
                <img src={p.img} alt={p.label} width={700} height={900} loading="lazy" className="h-full w-full object-contain" />
              </div>
              <p className="mt-4 text-xs tracking-wide text-ink font-medium">{p.label}</p>
              <p className="mt-1 text-xs text-ink/60">from $189</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Newsletter() {
  return (
    <section className="bg-blush py-20 lg:py-24">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <h2 className="font-script text-5xl lg:text-6xl text-ink">stay in the loop</h2>
        <p className="mt-4 text-sm text-ink/75">
          Get first access to new textures, restocks, and styling tips crafted for your curls.
        </p>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
        >
          <input
            type="email"
            required
            placeholder="Your email address"
            className="flex-1 bg-white/70 border border-ink/20 px-5 py-3 text-sm text-ink placeholder:text-ink/50 focus:outline-none focus:border-ink"
          />
          <button className="bg-ink text-white text-[0.7rem] tracking-[0.3em] uppercase font-semibold px-6 py-3 hover:bg-ink/80 transition">
            Subscribe
          </button>
        </form>
      </div>
    </section>
  );
}

function Footer() {
  const cols = [
    { title: "Shop", items: ["Wefted Hair", "Clip-Ins", "Ponytails", "Extensions Care", "Gift Cards"] },
    { title: "Learn", items: ["Our Textures", "Extensions Care 101", "The Blog", "FAQ"] },
    { title: "Support", items: ["Contact Us", "Shipping & Returns", "Track Order", "Help Center"] },
    { title: "Company", items: ["Our Story", "Careers", "Press", "Affiliates"] },
  ];
  return (
    <footer id="help" className="bg-ink text-white/80 pt-20 pb-10">
      <div className="mx-auto max-w-[1200px] px-6 lg:px-10 grid md:grid-cols-5 gap-10">
        <div className="md:col-span-1">
          <div className="flex flex-col leading-none">
            <span className="font-script text-4xl text-white">Lush</span>
            <span className="text-[0.6rem] tracking-[0.4em] font-medium text-white">ROOTS</span>
          </div>
          <p className="mt-6 text-xs text-white/60 leading-relaxed">
            Premium virgin hair extensions and care crafted exclusively for natural textures.
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h4 className="text-[0.7rem] tracking-[0.3em] uppercase font-semibold text-white">{c.title}</h4>
            <ul className="mt-5 space-y-3 text-sm text-white/60">
              {c.items.map((i) => (
                <li key={i}><a href="#" className="hover:text-white transition">{i}</a></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto max-w-[1200px] px-6 lg:px-10 mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between text-xs text-white/50 gap-3">
        <span>© {new Date().getFullYear()} Lush Roots. All rights reserved.</span>
        <div className="flex gap-6">
          <a href="#" className="hover:text-white">Privacy</a>
          <a href="#" className="hover:text-white">Terms</a>
          <a href="#" className="hover:text-white">Accessibility</a>
        </div>
      </div>
    </footer>
  );
}

function Index() {
  return (
    <main className="bg-white">
      <Hero />
      <TwoUp />
      <Difference />
      <ChooseStyle />
      <Bestsellers />
      <Newsletter />
      <Footer />
    </main>
  );
}
