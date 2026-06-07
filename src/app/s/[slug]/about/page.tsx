"use client";

import type { CSSProperties } from "react";
import { BookOpen } from "lucide-react";
import { ContentPageView } from "@/components/storefront/pages/content-page-view";
import { EditableImage } from "@/components/storefront/theme/editable-image";
import { EditableText } from "@/components/storefront/theme/editable-text";
import { fashionTemplateImages } from "@/lib/storefront/fashion-defaults";
import { useStorefront } from "@/lib/storefront/store-context";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";

function FashionAboutPage() {
  const { store, storefront } = useStorefront();
  const page = storefront.pages?.about ?? storefront.about;
  const titlePath = storefront.pages?.about ? "pages.about.title" : "about.title";
  const bodyPath = storefront.pages?.about ? "pages.about.body" : "about.body";
  const aboutImageUrl = storefront.media?.about_image_url ?? fashionTemplateImages.about;

  return (
    <div className="bg-white text-[#111111]">
      <section className="bg-[#eef2ef] px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-5xl">
          <EditableText
            path={titlePath}
            value={page.title}
            as="h1"
            className="text-5xl font-bold leading-[0.95] tracking-[-0.05em] sm:text-7xl"
            style={{ fontFamily: "var(--font-editorial)" } as CSSProperties}
          />
          <p className="mt-8 max-w-3xl text-base leading-7 text-[#424242] sm:text-lg">
            {store.description ||
              `Discover the story, style, and point of view behind ${store.business_name}.`}
          </p>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 bg-[#f7f7f5] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#123D33]">
              <BookOpen className="h-3.5 w-3.5" strokeWidth={1.8} />
              Our Story
            </div>
            <h2
              className="max-w-xl text-4xl font-bold leading-[1.02] tracking-[-0.045em] sm:text-5xl"
              style={{ fontFamily: "var(--font-editorial)" }}
            >
              Where It All Began
            </h2>
            <EditableText
              path={bodyPath}
              value={page.body}
              as="p"
              className="mt-6 max-w-2xl whitespace-pre-line text-sm font-medium leading-7 text-[#333333]"
              multiline
            />
          </div>

          <EditableImage
            path="media.about_image_url"
            src={aboutImageUrl}
            alt={`${store.business_name} story`}
            className="aspect-[4/3] bg-[#eef0ef]"
            imgClassName="object-center transition duration-500 hover:scale-105"
          />
        </div>
      </section>
    </div>
  );
}

export default function AboutPage() {
  const { storefront } = useStorefront();
  const { theme } = useStorefrontTheme();
  const page = storefront.pages?.about ?? storefront.about;
  const titlePath = storefront.pages?.about ? "pages.about.title" : "about.title";
  const bodyPath = storefront.pages?.about ? "pages.about.body" : "about.body";

  if (theme.id === "fashion_lookbook") {
    return <FashionAboutPage />;
  }

  return (
    <ContentPageView
      title={page.title}
      body={page.body}
      titlePath={titlePath}
      bodyPath={bodyPath}
    />
  );
}
