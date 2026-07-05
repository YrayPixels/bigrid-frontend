"use client";

import Link from "next/link";
import { Search, ShoppingBag, User } from "lucide-react";
import type { Store, StorefrontContent, StoreProduct } from "@/lib/api/types";
import { EditableImage } from "@/components/storefront/theme/editable-image";
import { EditableText } from "@/components/storefront/theme/editable-text";
import { StorefrontLink } from "@/components/storefront/theme/storefront-link";
import {
  hairFashionDifferences,
  hairFashionFooterColumns,
  hairFashionNavItems,
  hairFashionProductTags,
  hairFashionTemplateImages,
} from "@/lib/storefront/hair-fashion-defaults";
import { getHomepageProducts } from "@/lib/storefront/product-plugs";
import { useCart } from "@/lib/storefront/cart-context";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";

const styleTiles = [
  { image: hairFashionTemplateImages.styles[0], label: "Ponytails & buns" },
  { image: hairFashionTemplateImages.styles[1], label: "Headband wigs" },
  { image: hairFashionTemplateImages.styles[2], label: "Clip-ins" },
];

function HairProductCard({
  product,
  index,
  editable,
}: {
  product: StoreProduct;
  index: number;
  editable: boolean;
}) {
  const imageUrl =
    product.image_url ?? hairFashionTemplateImages.products[index % hairFashionTemplateImages.products.length];
  const tag = hairFashionProductTags[product.slug] ?? product.name.split(" ")[0]?.toLowerCase();
  const price = product.price / 100;

  return (
    <div className="flex flex-col items-center text-center">
      <span className="mb-2 font-[family-name:var(--font-script)] text-3xl text-[#1a1410]/70">{tag}</span>
      <StorefrontLink href={`/products/${product.slug}`} className={editable ? "pointer-events-none" : ""}>
        <div className="flex aspect-[3/4] w-full items-end justify-center">
          <img src={imageUrl} alt={product.name} className="h-full w-full object-contain" />
        </div>
      </StorefrontLink>
      <p className="mt-4 text-xs font-medium tracking-wide text-[#1a1410]">{product.name}</p>
      <p className="mt-1 text-xs text-[#1a1410]/60">from ${price.toFixed(0)}</p>
    </div>
  );
}

export function HairAndFashionHome({
  store,
  storefront,
}: {
  store: Store;
  storefront: StorefrontContent;
}) {
  const { mode } = useStorefrontTheme();
  const { itemCount } = useCart();
  const editable = mode === "edit";
  const { products: featuredProducts } = getHomepageProducts(storefront, "hair-and-fashion", 4);
  const navLinks = storefront.navigation?.length ? storefront.navigation : [...hairFashionNavItems];

  return (
    <main className="bg-white text-[#1a1410]">
      <section
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(180deg,#f8d0c4 0%,#f6c9bd 60%,#f2b8ab 100%)" }}
      >
        <header className="absolute inset-x-0 top-0 z-20">
          <div className="mx-auto grid max-w-[1400px] grid-cols-3 items-center px-6 py-6 lg:px-10">
            <nav className="hidden items-center gap-8 text-[0.72rem] font-medium uppercase tracking-[0.28em] text-[#1a1410] lg:flex">
              <StorefrontLink href={navLinks[0]?.href ?? "/products"} className="hover:opacity-60">
                {navLinks[0]?.label ?? "Shop"}
              </StorefrontLink>
            </nav>
            <div className="col-start-2 flex flex-col items-center leading-none">
              <span className="font-[family-name:var(--font-script)] text-4xl text-[#1a1410]">
                {store.business_name.split(" ")[0] ?? "Lush"}
              </span>
              <span className="text-[0.6rem] font-medium tracking-[0.4em]">
                {store.business_name.split(" ").slice(1).join(" ") || "ROOTS"}
              </span>
            </div>
            <div className="flex items-center justify-end gap-6 text-[0.72rem] font-medium uppercase tracking-[0.28em] text-[#1a1410]">
              {navLinks.slice(1).map((link) => (
                <StorefrontLink key={link.label} href={link.href} className="hidden hover:opacity-60 lg:inline">
                  {link.label}
                </StorefrontLink>
              ))}
              <div className="flex items-center gap-4 pl-2">
                {editable ? (
                  <span className="hover:opacity-60">
                    <ShoppingBag className="h-4 w-4" />
                  </span>
                ) : (
                  <Link href="/cart" className="relative hover:opacity-60" aria-label="Cart">
                    <ShoppingBag className="h-4 w-4" />
                    {itemCount > 0 ? (
                      <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-[#1a1410] px-1 text-[9px] font-bold text-white">
                        {itemCount}
                      </span>
                    ) : null}
                  </Link>
                )}
                <button type="button" aria-label="Account" className="hover:opacity-60">
                  <User className="h-4 w-4" />
                </button>
                <button type="button" aria-label="Search" className="hover:opacity-60">
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-6 pb-3 text-[0.65rem] uppercase tracking-[0.24em] text-[#1a1410] lg:hidden">
            {navLinks.map((link) => (
              <StorefrontLink key={link.label} href={link.href} className="hover:opacity-60">
                {link.label}
              </StorefrontLink>
            ))}
          </div>
        </header>

        <div className="relative mx-auto grid min-h-[720px] max-w-[1400px] items-end gap-8 px-6 pb-16 pt-40 lg:min-h-[820px] lg:grid-cols-2 lg:px-10 lg:pb-24 lg:pt-44">
          <div className="relative z-10 max-w-lg">
            <h1 className="font-[family-name:var(--font-editorial)] text-6xl leading-[0.95] text-[#1a1410] lg:text-7xl xl:text-8xl">
              <EditableText path="hero.headline" value={storefront.hero.headline} as="span" />
              <span className="mt-2 block pl-4 font-[family-name:var(--font-script)] text-6xl leading-none text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.08)] lg:text-7xl xl:text-8xl">
                naturally.
              </span>
            </h1>
            <EditableText
              path="hero.subheadline"
              value={storefront.hero.subheadline}
              as="p"
              className="mt-8 max-w-sm text-sm leading-relaxed text-[#1a1410]/80 lg:text-base"
            />
            <StorefrontLink
              href="/products"
              className="mt-8 inline-flex items-center justify-center bg-white px-10 py-4 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-[#1a1410] transition-colors hover:bg-[#1a1410] hover:text-white"
            >
              <EditableText path="hero.cta_label" value={storefront.hero.cta_label} as="span" />
            </StorefrontLink>
          </div>
          <div className="relative flex items-end justify-center lg:absolute lg:inset-y-0 lg:right-0 lg:w-[58%]">
            <EditableImage
              path="media.hero_image_url"
              src={storefront.media?.hero_image_url ?? hairFashionTemplateImages.hero}
              alt="Model with voluminous natural curly hair"
              className="flex h-full max-h-[820px] w-auto items-end justify-center"
              imgClassName="h-full w-auto max-h-[820px] object-contain object-bottom"
            />
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-2">
        <div className="flex flex-col items-center bg-[#f5f2ec] px-8 py-20 text-center lg:px-16 lg:py-28">
          <h2 className="font-[family-name:var(--font-editorial)] text-4xl text-[#1a1410] lg:text-5xl">The perfect match.</h2>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-[#1a1410]/70">
            Our signature textures are created to blend flawlessly with the natural curls, coils, and kinks you were born with.
          </p>
          <StorefrontLink
            href="/products"
            className="mt-8 inline-flex items-center justify-center bg-[#1a1410] px-8 py-3.5 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-white transition-colors hover:bg-[#1a1410]/80"
          >
            Shop Extensions
          </StorefrontLink>
          <img src={hairFashionTemplateImages.match} alt="Perfect match" className="mt-14 max-h-[520px] w-auto object-contain" />
        </div>
        <div className="flex flex-col items-center bg-white px-8 py-20 text-center lg:px-16 lg:py-28">
          <h2 className="font-[family-name:var(--font-editorial)] text-4xl text-[#1a1410] lg:text-5xl">Perfect extensions kit.</h2>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-[#1a1410]/70">
            Our texture-tailored maintenance kits are specially formulated to meet the needs of hair extensions wearers everywhere.
          </p>
          <StorefrontLink
            href="/products"
            className="mt-8 inline-flex items-center justify-center bg-[#1a1410] px-8 py-3.5 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-white transition-colors hover:bg-[#1a1410]/80"
          >
            Shop Extensions Care
          </StorefrontLink>
          <img src={hairFashionTemplateImages.kit} alt="Extensions kit" className="mt-14 max-h-[520px] w-auto object-contain" />
        </div>
      </section>

      <section
        className="relative py-24 text-white lg:py-32"
        style={{
          backgroundImage: `linear-gradient(rgba(10,8,8,0.72),rgba(10,8,8,0.82)), url(${hairFashionTemplateImages.textureBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="mx-auto max-w-[1200px] px-6 lg:px-10">
          <h2 className="text-center font-[family-name:var(--font-script)] text-6xl text-white lg:text-7xl">
            the lush roots difference
          </h2>
          <div className="mt-16 grid gap-x-16 gap-y-14 md:grid-cols-2">
            {hairFashionDifferences.map((item) => (
              <div key={item.number} className="relative pl-24">
                <span className="absolute left-0 top-0 font-[family-name:var(--font-editorial)] text-6xl leading-none text-white/15">
                  {item.number}
                </span>
                <h3 className="text-[0.75rem] font-semibold uppercase tracking-[0.32em]">{item.title}</h3>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-white/75">{item.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-20 text-center text-[0.7rem] uppercase tracking-[0.3em] text-white/80">
            <span className="underline underline-offset-4">See More Reasons</span> why over 250,000 women believe in
            and trust the Lush Roots difference
          </p>
        </div>
      </section>

      <section className="bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-10">
          <h2 className="text-center font-[family-name:var(--font-editorial)] text-4xl text-[#1a1410] lg:text-5xl">
            Choose your style
          </h2>
          <div className="mt-14 grid grid-cols-2 gap-4 lg:gap-6">
            <div className="relative flex aspect-square flex-col items-center justify-center overflow-hidden bg-[#1a1410] p-8 text-center text-white">
              <img
                src={hairFashionTemplateImages.styles[2]}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-30 transition group-hover:opacity-40"
              />
              <div className="relative">
                <h3 className="font-[family-name:var(--font-editorial)] text-2xl lg:text-3xl">
                  Wefted hair
                  <br />& closures
                </h3>
                <p className="mx-auto mt-3 max-w-[220px] text-xs text-white/75">
                  For protective styles that perfectly match your texture.
                </p>
                <StorefrontLink
                  href="/products"
                  className="mt-5 inline-flex bg-[#f8d0c4] px-6 py-2.5 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[#1a1410] transition hover:bg-white"
                >
                  Shop Now
                </StorefrontLink>
              </div>
            </div>
            {styleTiles.map((tile) => (
              <div key={tile.label} className="group relative aspect-square overflow-hidden bg-[#f8d0c4]">
                <img
                  src={tile.image}
                  alt={tile.label}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/40 to-transparent p-5">
                  <span className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-white">{tile.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-10">
          <h2 className="text-center font-[family-name:var(--font-editorial)] text-4xl text-[#1a1410] lg:text-5xl">Best sellers</h2>
          <div className="mt-14 grid grid-cols-2 gap-8 md:grid-cols-4 lg:gap-10">
            {featuredProducts.slice(0, 4).map((product, index) => (
              <HairProductCard key={product.id} product={product} index={index} editable={editable} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f8d0c4] py-20 lg:py-24">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="font-[family-name:var(--font-script)] text-5xl text-[#1a1410] lg:text-6xl">stay in the loop</h2>
          <p className="mt-4 text-sm text-[#1a1410]/75">
            Get first access to new textures, restocks, and styling tips crafted for your curls.
          </p>
          <form className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row" onSubmit={(event) => event.preventDefault()}>
            <input
              type="email"
              required
              placeholder="Your email address"
              className="flex-1 border border-[#1a1410]/20 bg-white/70 px-5 py-3 text-sm text-[#1a1410] placeholder:text-[#1a1410]/50 focus:border-[#1a1410] focus:outline-none"
            />
            <button
              type="submit"
              className="bg-[#1a1410] px-6 py-3 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-[#1a1410]/80"
            >
              Subscribe
            </button>
          </form>
        </div>
      </section>

      <footer className="bg-[#1a1410] pt-20 pb-10 text-white/80">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-6 md:grid-cols-5 lg:px-10">
          <div className="md:col-span-1">
            <div className="flex flex-col leading-none">
              <span className="font-[family-name:var(--font-script)] text-4xl text-white">
                {store.business_name.split(" ")[0] ?? "Lush"}
              </span>
              <span className="text-[0.6rem] font-medium tracking-[0.4em] text-white">
                {store.business_name.split(" ").slice(1).join(" ") || "ROOTS"}
              </span>
            </div>
            <p className="mt-6 text-xs leading-relaxed text-white/60">
              Premium virgin hair extensions and care crafted exclusively for natural textures.
            </p>
          </div>
          {hairFashionFooterColumns.map((column) => (
            <div key={column.title}>
              <h4 className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-white">{column.title}</h4>
              <ul className="mt-5 space-y-3 text-sm text-white/60">
                {column.links.map((item) => (
                  <li key={item.href}>
                    <StorefrontLink href={item.href} className="hover:text-white">
                      {item.label}
                    </StorefrontLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-16 flex max-w-[1200px] flex-col justify-between gap-3 border-t border-white/10 px-6 pt-8 text-xs text-white/50 md:flex-row lg:px-10">
          <span>© {new Date().getFullYear()} {store.business_name}. All rights reserved.</span>
          <StorefrontLink href="/privacy-policy" className="hover:text-white">
            Privacy policy
          </StorefrontLink>
        </div>
      </footer>
    </main>
  );
}
