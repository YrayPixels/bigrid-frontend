import { INDUSTRY_OPTIONS, type PublishedStorefrontIndexEntry } from "@/lib/api/types";
import { getStorefrontBaseUrl } from "@/lib/site-seo";

function industryLabel(industry?: string | null) {
  if (!industry) return null;
  return INDUSTRY_OPTIONS.find((option) => option.value === industry)?.label ?? null;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function truncate(text: string, max: number) {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

export function StoreDirectoryCard({ store }: { store: PublishedStorefrontIndexEntry }) {
  const name = store.business_name || store.slug;
  const href = getStorefrontBaseUrl(store.slug);
  const banner = store.banner_url?.trim() || null;
  const logo = store.logo_url?.trim() || null;
  const brand = store.brand_color?.trim() || "#0E7C66";
  const category = industryLabel(store.industry);
  const blurb = store.description?.trim() ? truncate(store.description, 110) : null;

  return (
    <a
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {banner ? (
          // External merchant-uploaded assets; next/image domain allowlist won't cover arbitrary CDN URLs.
          <img
            src={banner}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{
              background: `linear-gradient(145deg, ${brand} 0%, color-mix(in oklab, ${brand} 55%, #0a0a0a) 100%)`,
            }}
          >
            {logo ? (
              <img
                src={logo}
                alt=""
                className="h-16 w-16 rounded-2xl object-cover shadow-elevated ring-2 ring-white/30"
              />
            ) : (
              <span className="font-display text-4xl font-bold tracking-tight text-white/95">
                {initials(name)}
              </span>
            )}
          </div>
        )}

        {banner && logo ? (
          <div className="absolute bottom-3 left-3">
            <img
              src={logo}
              alt=""
              className="h-11 w-11 rounded-xl object-cover shadow-elevated ring-2 ring-white/80"
            />
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-xl font-semibold tracking-tight transition-colors group-hover:text-primary">
            {name}
          </h2>
          {category ? (
            <span className="shrink-0 font-mono text-[10px] tracking-widest text-ink-soft uppercase">
              {category}
            </span>
          ) : null}
        </div>
        {blurb ? <p className="text-sm leading-relaxed text-ink-soft">{blurb}</p> : null}
        <span className="mt-auto pt-2 text-sm font-medium text-primary">
          Visit store
          <span
            aria-hidden
            className="inline-block transition-transform duration-300 group-hover:translate-x-1"
          >
            {" →"}
          </span>
        </span>
      </div>
    </a>
  );
}
