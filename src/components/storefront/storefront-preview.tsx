import { ArrowRight } from "lucide-react";
import type { Store, StorefrontContent } from "@/lib/api/types";
import { getStoreSubdomainHost } from "@/lib/store-host";

const fashionPreviewImage =
  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1000&q=85";

type StorefrontPreviewProps = {
  store: Store;
  content: StorefrontContent;
  domainLabel?: string;
};

export function StorefrontPreview({ store, content, domainLabel }: StorefrontPreviewProps) {
  const host = domainLabel ?? store.subdomain_host ?? getStoreSubdomainHost(store.slug);
  const chosenTemplate = store.storefront_template_id;
  const templateId =
    content.template?.id ??
    (chosenTemplate && chosenTemplate !== "ai_pick" ? chosenTemplate : "classic");
  const isEditorial = templateId === "editorial";
  const isBoldGrid = templateId === "bold_grid";
  const isFashionLookbook = templateId === "fashion_lookbook";

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-canvas-raised shadow-elevated">
      <div className="flex items-center gap-2 border-b border-border bg-secondary px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-accent/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-primary/70" />
        <span className="ml-3 truncate rounded bg-card px-3 py-1 text-xs text-ink-soft">
          {host}
        </span>
      </div>

      <div
        className={`relative px-8 py-16 sm:px-12 sm:py-20 ${
          isEditorial ? "text-center" : ""
        } ${isFashionLookbook ? "bg-[#f4f0ea]" : ""}`}
        style={{
          background: isFashionLookbook
            ? undefined
            : isBoldGrid
              ? `linear-gradient(135deg, ${store.brand_color}26 0%, ${store.brand_color}08 55%, transparent 55%)`
              : `linear-gradient(135deg, ${store.brand_color}1A, ${store.brand_color}05)`,
        }}
      >
        <div
          className={
            isFashionLookbook ? "grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]" : "w-full"
          }
        >
          <div className={isFashionLookbook ? "relative order-2 lg:order-1" : ""}>
            <span
              className="inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide"
              style={{ backgroundColor: `${store.brand_color}22`, color: store.brand_color }}
            >
              {content.template?.source === "ai_selected" ? "AI selected" : "Template"} ·{" "}
              {templateId.replace(/_/g, " ")}
            </span>
            <h2
              className={`mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl ${
                isFashionLookbook ? "max-w-xl uppercase leading-[0.95]" : ""
              }`}
            >
              {content.hero.headline}
            </h2>
            <p className="mt-4 text-lg text-ink-soft">{content.hero.subheadline}</p>
            <button
              className={`mt-8 inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold shadow-elevated ${
                isFashionLookbook ? "rounded-none bg-ink text-background" : "rounded-md text-white"
              }`}
              style={isFashionLookbook ? undefined : { backgroundColor: store.brand_color }}
            >
              {content.hero.cta_label} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          {isFashionLookbook ? (
            <div className="order-1 overflow-hidden rounded-[2rem] border border-black/10 bg-white p-3 shadow-elevated lg:order-2">
              <div className="relative aspect-[4/5] overflow-hidden bg-[#a7aaa5]">
                <img
                  src={fashionPreviewImage}
                  alt={`${store.business_name} fashion campaign preview`}
                  className="h-full w-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-black/16" />
                <div className="absolute inset-x-0 top-8 text-center text-white">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em]">
                    New collection
                  </p>
                  <p className="mx-auto mt-2 h-3 w-40 rounded bg-white/80" />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div
        className={`grid gap-6 border-t border-border bg-card px-8 py-12 sm:px-12 ${
          isBoldGrid
            ? "sm:grid-cols-3"
            : isEditorial
              ? "sm:grid-cols-3 text-center"
              : "sm:grid-cols-3"
        }`}
      >
        {content.value_props.map((valueProp, index) => (
          <div key={valueProp.title}>
            <div
              className={`grid h-9 w-9 place-items-center text-sm font-bold text-white ${
                isEditorial || isFashionLookbook ? "mx-auto rounded-full" : "rounded-lg"
              }`}
              style={{ backgroundColor: store.brand_color }}
            >
              {index + 1}
            </div>
            <h3 className="mt-3 font-display text-lg font-semibold">{valueProp.title}</h3>
            <p className="mt-1 text-sm text-ink-soft">{valueProp.body}</p>
          </div>
        ))}
      </div>

      <div
        className={`border-t border-border bg-canvas px-8 py-12 sm:px-12 ${
          isEditorial ? "text-center" : ""
        }`}
      >
        <h3 className="font-display text-2xl font-bold">{content.about.title}</h3>
        <p className="mt-3 w-full text-sm leading-relaxed text-ink-soft">{content.about.body}</p>
      </div>

      <div className="border-t border-border bg-card px-8 py-6 sm:px-12">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
          SEO metadata
        </span>
        <div className="mt-2 rounded-md border border-border bg-background p-4">
          <div className="text-sm font-medium text-primary">{content.seo.title}</div>
          <div className="text-xs text-ink-soft">{host}</div>
          <p className="mt-1 text-sm text-ink-soft">{content.seo.description}</p>
        </div>
      </div>
    </div>
  );
}
