"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { storefrontApi } from "@/lib/api/storefront";
import type { StoreProductReview } from "@/lib/api/types";
import { useStorefront } from "@/lib/storefront/store-context";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import { cn } from "@/lib/utils";

type ProductReviewsModuleProps = {
  productId: string;
  productName: string;
  appearance?: "fashion" | "soft" | "minimal";
  className?: string;
};

function StarRow({
  rating,
  size = "sm",
  interactive = false,
  onSelect,
}: {
  rating: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onSelect?: (value: number) => void;
}) {
  const sizeClass = size === "lg" ? "h-5 w-5" : size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  return (
    <div className="flex items-center gap-0.5 text-[#efc64b]">
      {Array.from({ length: 5 }).map((_, index) => {
        const value = index + 1;
        const filled = value <= Math.round(rating);
        const star = (
          <Star
            key={value}
            className={cn(sizeClass, filled ? "fill-current" : "fill-transparent opacity-40")}
          />
        );
        if (!interactive || !onSelect) return star;
        return (
          <button
            key={value}
            type="button"
            className="p-0.5"
            onClick={() => onSelect(value)}
            aria-label={`Rate ${value} stars`}
          >
            {star}
          </button>
        );
      })}
    </div>
  );
}

function formatReviewDate(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function ProductReviewsModule({
  productId,
  productName,
  appearance = "soft",
  className,
}: ProductReviewsModuleProps) {
  const { store } = useStorefront();
  const { theme, mode } = useStorefrontTheme();
  const [reviews, setReviews] = useState<StoreProductReview[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [body, setBody] = useState("");
  const [rating, setRating] = useState(5);

  const loadReviews = useCallback(async () => {
    if (!store.slug || !productId) return;
    setLoading(true);
    try {
      const result = await storefrontApi.listProductReviews(store.slug, productId);
      setReviews(result.reviews);
      setAverageRating(result.average_rating);
      setReviewCount(result.review_count);
    } catch {
      setReviews([]);
      setAverageRating(0);
      setReviewCount(0);
    } finally {
      setLoading(false);
    }
  }, [productId, store.slug]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "edit") return;
    if (!authorName.trim() || !body.trim()) {
      toast.error("Please add your name and review.");
      return;
    }
    setSubmitting(true);
    try {
      await storefrontApi.submitProductReview(store.slug, productId, {
        author_name: authorName.trim(),
        author_email: authorEmail.trim() || undefined,
        rating,
        body: body.trim(),
      });
      toast.success("Thanks for your review!");
      setAuthorName("");
      setAuthorEmail("");
      setBody("");
      setRating(5);
      setShowForm(false);
      await loadReviews();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit review.");
    } finally {
      setSubmitting(false);
    }
  }

  const isFashion = appearance === "fashion";
  const surface = theme.palette.surface;
  const muted = theme.palette.muted;
  const displayAverage = reviewCount > 0 ? averageRating : 0;

  return (
    <section
      className={cn(
        isFashion
          ? "mx-auto grid max-w-7xl gap-8 px-4 pb-14 pt-10 sm:px-6 lg:grid-cols-[320px_minmax(0,1fr)]"
          : "mx-auto max-w-7xl px-4 pb-14 sm:px-6",
        className,
      )}
      style={{ color: theme.palette.text }}
    >
      <div className={cn(!isFashion && "mb-8 flex flex-wrap items-end justify-between gap-4")}>
        <div>
          <h2
            className={cn(
              "font-bold",
              isFashion ? "border-b pb-3 text-sm" : "text-2xl tracking-tight",
            )}
            style={isFashion ? { borderColor: theme.palette.text } : undefined}
          >
            Reviews {reviewCount > 0 ? `(${reviewCount})` : ""}
          </h2>
          <div className={cn("mt-4 flex items-end gap-2", isFashion && "mt-6")}>
            <span
              className={cn(
                "font-light leading-none",
                isFashion ? "text-6xl text-[#236c42]" : "text-4xl font-semibold",
              )}
            >
              {loading ? "—" : displayAverage.toFixed(1)}
            </span>
            {isFashion ? <span className="pb-2 text-xl text-[#777777]">/5</span> : null}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StarRow rating={displayAverage} size={isFashion ? "md" : "md"} />
            <span className="text-xs font-semibold" style={{ color: muted }}>
              {reviewCount === 0
                ? `Be the first to review ${productName}`
                : `${reviewCount} review${reviewCount === 1 ? "" : "s"}`}
            </span>
          </div>
        </div>

        {mode !== "edit" ? (
          <button
            type="button"
            onClick={() => setShowForm((open) => !open)}
            className={cn(
              "mt-4 text-xs font-semibold uppercase tracking-[0.08em]",
              appearance === "soft" || appearance === "minimal"
                ? "rounded-full border px-5 py-2.5"
                : "border-b pb-0.5",
            )}
            style={
              appearance === "fashion"
                ? { borderColor: theme.palette.text }
                : {
                    borderColor: theme.palette.border,
                    backgroundColor: surface,
                    color: theme.palette.primary,
                  }
            }
          >
            {showForm ? "Cancel" : "Write a review"}
          </button>
        ) : null}
      </div>

      <div className="space-y-4">
        {showForm && mode !== "edit" ? (
          <form
            onSubmit={handleSubmit}
            className={cn("space-y-4 p-5", appearance === "fashion" ? "" : "rounded-2xl border")}
            style={{
              backgroundColor: surface,
              borderColor: appearance === "fashion" ? undefined : theme.palette.border,
            }}
          >
            <div>
              <p className="text-sm font-semibold">Your rating</p>
              <div className="mt-2">
                <StarRow rating={rating} size="lg" interactive onSelect={setRating} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-semibold">Name</span>
                <input
                  value={authorName}
                  onChange={(event) => setAuthorName(event.target.value)}
                  required
                  maxLength={80}
                  className="mt-1.5 w-full border px-3 py-2 text-sm outline-none"
                  style={{
                    borderColor: theme.palette.border,
                    backgroundColor: theme.palette.background,
                    borderRadius: appearance === "fashion" ? 0 : 12,
                  }}
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold">Email (optional)</span>
                <input
                  type="email"
                  value={authorEmail}
                  onChange={(event) => setAuthorEmail(event.target.value)}
                  maxLength={255}
                  className="mt-1.5 w-full border px-3 py-2 text-sm outline-none"
                  style={{
                    borderColor: theme.palette.border,
                    backgroundColor: theme.palette.background,
                    borderRadius: appearance === "fashion" ? 0 : 12,
                  }}
                />
              </label>
            </div>
            <label className="block text-sm">
              <span className="font-semibold">Review</span>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                required
                rows={4}
                maxLength={2000}
                className="mt-1.5 w-full border px-3 py-2 text-sm outline-none"
                style={{
                  borderColor: theme.palette.border,
                  backgroundColor: theme.palette.background,
                  borderRadius: appearance === "fashion" ? 0 : 12,
                }}
                placeholder={`How was ${productName}?`}
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className={cn(
                "px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] disabled:opacity-60",
                appearance !== "fashion" && "rounded-full",
              )}
              style={{ backgroundColor: theme.palette.primary, color: theme.palette.background }}
            >
              {submitting ? "Submitting…" : "Submit review"}
            </button>
          </form>
        ) : null}

        {loading ? (
          <p className="text-sm" style={{ color: muted }}>
            Loading reviews…
          </p>
        ) : reviews.length === 0 ? (
          <p className="text-sm leading-6" style={{ color: muted }}>
            No reviews yet. Share your experience with this product.
          </p>
        ) : (
          reviews.map((review) => (
            <article
              key={review.id}
              className={cn("p-5", appearance !== "fashion" && "rounded-2xl border")}
              style={{
                backgroundColor: surface,
                borderColor: appearance === "fashion" ? undefined : theme.palette.border,
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold">{review.author_name}</h3>
                  <div className="mt-1">
                    <StarRow rating={review.rating} />
                  </div>
                </div>
                <span className="text-xs" style={{ color: muted }}>
                  {formatReviewDate(review.created_at)}
                </span>
              </div>
              <p className="mt-4 max-w-2xl text-sm leading-6" style={{ color: muted }}>
                {review.body}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
