import { NextResponse } from "next/server";
import {
  formatUnsplashPhotoUrl,
  searchUnsplashPhotosDirect,
} from "@/lib/storefront-builder/unsplash-client";

/**
 * Server proxy for Unsplash search. The builder agent runs in the browser and
 * cannot read UNSPLASH_ACCESS_KEY — this route keeps the key server-side.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("query") ?? "").trim();
  const count = Number(searchParams.get("count") ?? "5");
  const orientationParam = (searchParams.get("orientation") ?? "landscape").trim();
  const orientation =
    orientationParam === "portrait" ||
    orientationParam === "squarish" ||
    orientationParam === "landscape" ||
    orientationParam === "any"
      ? orientationParam
      : "landscape";

  if (!query) {
    return NextResponse.json({ message: "query is required" }, { status: 422 });
  }

  try {
    const results = await searchUnsplashPhotosDirect(query, Number.isFinite(count) ? count : 5, {
      orientation,
    });

    return NextResponse.json({
      results: results
        .map((photo) => {
          const url = formatUnsplashPhotoUrl(photo, 1080);
          if (!url || !url.includes("images.unsplash.com")) return null;
          return {
            id: photo.id,
            urls: photo.urls,
            url,
            description: photo.description ?? null,
            alt_description: photo.alt_description ?? null,
            tags: photo.tags ?? [],
          };
        })
        .filter(Boolean),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unsplash search failed";
    return NextResponse.json({ message }, { status: 502 });
  }
}
