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

  if (!query) {
    return NextResponse.json({ message: "query is required" }, { status: 422 });
  }

  try {
    const results = await searchUnsplashPhotosDirect(query, Number.isFinite(count) ? count : 5);
    return NextResponse.json({
      results: results.map((photo) => ({
        id: photo.id,
        urls: photo.urls,
        url: formatUnsplashPhotoUrl(photo, 1080),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unsplash search failed";
    return NextResponse.json({ message }, { status: 502 });
  }
}
