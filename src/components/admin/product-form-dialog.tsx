"use client";

import {
  DragEvent,
  FormEvent,
  KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Bold,
  ChevronDown,
  GripVertical,
  ImagePlus,
  List,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { confirm } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { generateProductDescriptionCopy } from "@/lib/storefront-builder/product-description";
import type { StoreCategory, StoreProduct } from "@/lib/api/types";

type ProductForm = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  sale_price: string;
  currency: string;
  images: string[];
  sku: string;
  brand: string;
  category_id: string;
  stock_quantity: string;
  status: "active" | "draft" | "archived";
  variants: { name: string; options: string[] }[];
  perks: string[];
};

type CategoryTreeNode = {
  category: StoreCategory;
  children: StoreCategory[];
};

type FormErrors = {
  name?: string;
  price?: string;
  sale_price?: string;
};

const MAX_PRODUCT_IMAGES = 12;
const STORE_CURRENCY = "NGN";
const DESCRIPTION_SOFT_MAX = 2000;
const DESCRIPTION_IDEAL_MIN = 100;
const DESCRIPTION_IDEAL_MAX = 400;
const PERK_SUGGESTIONS = [
  "Free delivery in Lagos",
  "Same-day delivery",
  "30-day returns",
  "1-year warranty",
  "Authentic / original",
] as const;

const blankForm: ProductForm = {
  name: "",
  slug: "",
  description: "",
  price: "",
  sale_price: "",
  currency: STORE_CURRENCY,
  images: [],
  sku: "",
  brand: "",
  category_id: "",
  stock_quantity: "",
  status: "active",
  variants: [],
  perks: [],
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `product_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizeProductImages(images?: string[] | null, cover?: string | null): string[] {
  const unique: string[] = [];
  for (const src of [...(images ?? []), cover ?? ""]) {
    const trimmed = src.trim();
    if (!trimmed || unique.includes(trimmed)) continue;
    unique.push(trimmed);
    if (unique.length >= MAX_PRODUCT_IMAGES) break;
  }
  return unique;
}

function formatMoneyDetailed(value: number, currency = "NGN") {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
}

function alnumUpper(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function suggestSku(name: string, brand: string) {
  const brandCode = alnumUpper(brand).slice(0, 3);
  const words = name
    .trim()
    .split(/\s+/)
    .map((word) => alnumUpper(word))
    .filter(Boolean);
  const nameCode = (words.slice(0, 2).join("-") || "ITEM").slice(0, 18);
  const prefix = brandCode || words[0]?.slice(0, 3) || "PRD";
  const body = brandCode ? nameCode : words.slice(1, 3).join("-") || nameCode;
  return `${prefix}-${body || "ITEM"}-001`;
}

function serializeForm(form: ProductForm) {
  return JSON.stringify({
    ...form,
    variants: form.variants.map((variant) => ({
      name: variant.name,
      options: [...variant.options],
    })),
    perks: [...form.perks],
    images: [...form.images],
  });
}

function formFromProduct(product?: StoreProduct): ProductForm {
  if (!product) {
    return { ...blankForm, variants: [], perks: [], images: [] };
  }

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: String(product.price),
    sale_price: product.sale_price != null ? String(product.sale_price) : "",
    currency: STORE_CURRENCY,
    images: normalizeProductImages(product.images, product.image_url),
    sku: product.sku ?? "",
    brand: product.brand ?? "",
    category_id: product.category_id ?? "",
    stock_quantity:
      typeof product.stock_quantity === "number" ? String(product.stock_quantity) : "",
    status: product.status ?? "draft",
    variants: product.variants?.length
      ? product.variants.map((variant) => ({
          name: variant.name,
          options: [...variant.options],
        }))
      : [],
    perks: product.perks?.length ? [...product.perks] : [],
  };
}

function productFromForm(form: ProductForm, existing?: StoreProduct): StoreProduct {
  const name = form.name.trim();
  const slug = slugify(form.slug || name);
  const price = Number(form.price);
  const salePrice = form.sale_price.trim() ? Number(form.sale_price) : undefined;
  const stock = form.stock_quantity.trim() ? Number(form.stock_quantity) : undefined;
  const variants = form.variants
    .map((variant) => ({
      name: variant.name.trim(),
      options: variant.options.map((option) => option.trim()).filter(Boolean),
    }))
    .filter((variant) => variant.name && variant.options.length);
  const perks = form.perks.map((perk) => perk.trim()).filter(Boolean);
  const images = normalizeProductImages(form.images);

  return {
    id: existing?.id ?? form.id ?? uid(),
    slug,
    name,
    description: form.description.trim(),
    price: Number.isFinite(price) ? price : 0,
    sale_price: Number.isFinite(salePrice) ? salePrice : null,
    currency: STORE_CURRENCY,
    image_url: images[0] ?? null,
    images: images.length ? images : null,
    sku: form.sku.trim() || undefined,
    brand: form.brand.trim() || null,
    category_id: form.category_id || null,
    stock_quantity: Number.isFinite(stock) ? stock : undefined,
    status: form.status,
    variants: variants.length ? variants : undefined,
    perks: perks.length ? perks : undefined,
  };
}

function validateForm(form: ProductForm): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = "Product name is required.";
  if (!form.price.trim() || Number(form.price) < 0 || !Number.isFinite(Number(form.price))) {
    errors.price = "Enter a valid price.";
  }
  if (form.sale_price.trim()) {
    const sale = Number(form.sale_price);
    const price = Number(form.price);
    if (!Number.isFinite(sale) || sale < 0) {
      errors.sale_price = "Enter a valid sale price.";
    } else if (Number.isFinite(price) && sale >= price) {
      errors.sale_price = "Sale price should be less than the regular price.";
    }
  }
  return errors;
}

function FormSection({
  title,
  description,
  children,
  defaultOpen = true,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-white">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-secondary/40"
      >
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {description ? <p className="text-xs text-ink-soft">{description}</p> : null}
        </div>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-ink-soft transition-transform", open && "rotate-180")}
        />
      </button>
      {open ? <div className="space-y-4 border-t border-border px-4 py-4">{children}</div> : null}
    </section>
  );
}

function FieldLabel({
  children,
  required,
  optional,
  hint,
}: {
  children: ReactNode;
  required?: boolean;
  optional?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-sm font-medium">
        {children}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
        {optional ? <span className="ml-1 text-xs font-normal text-ink-soft">Optional</span> : null}
      </span>
      {hint ? <span className="text-[11px] text-ink-soft">{hint}</span> : null}
    </div>
  );
}

function insertAroundSelection(
  value: string,
  start: number,
  end: number,
  before: string,
  after = before,
) {
  const selected = value.slice(start, end) || "text";
  const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
  const cursor = start + before.length + selected.length + after.length;
  return { next, cursor };
}

function insertLinePrefix(value: string, start: number, end: number, prefix: string) {
  const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const block = value.slice(start, end) || "List item";
  const lines = block.split("\n").map((line) => (line.startsWith(prefix) ? line : `${prefix}${line}`));
  const next = `${value.slice(0, lineStart)}${lines.join("\n")}${value.slice(end)}`;
  return { next, cursor: lineStart + lines.join("\n").length };
}

export type ProductFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProduct?: StoreProduct;
  categoryTree: CategoryTreeNode[];
  brandOptions: string[];
  isSaving: boolean;
  onSave: (product: StoreProduct) => Promise<void>;
  uploadImage: (file: File) => Promise<string>;
  onCreateCategory: (input: {
    name: string;
    parent_id?: string | null;
  }) => Promise<StoreCategory>;
};

export function ProductFormDialog({
  open,
  onOpenChange,
  editingProduct,
  categoryTree,
  brandOptions,
  isSaving,
  onSave,
  uploadImage,
  onCreateCategory,
}: ProductFormDialogProps) {
  const [form, setForm] = useState<ProductForm>(() => formFromProduct(editingProduct));
  const [baseline, setBaseline] = useState(() => serializeForm(formFromProduct(editingProduct)));
  const [errors, setErrors] = useState<FormErrors>({});
  const [showSlug, setShowSlug] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [skuTouched, setSkuTouched] = useState(false);
  const [imageUrlDraft, setImageUrlDraft] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(
    null,
  );
  const [imageDropActive, setImageDropActive] = useState(false);
  const [dragImageIndex, setDragImageIndex] = useState<number | null>(null);
  const [dropImageIndex, setDropImageIndex] = useState<number | null>(null);
  const [optionDrafts, setOptionDrafts] = useState<Record<number, string>>({});
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryParentId, setNewCategoryParentId] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const closingRef = useRef(false);

  const isDirty = serializeForm(form) !== baseline;
  const suggestedSku = useMemo(
    () => suggestSku(form.name, form.brand),
    [form.name, form.brand],
  );
  const parentCategories = useMemo(
    () => categoryTree.map((node) => node.category),
    [categoryTree],
  );

  function resetEditor(product?: StoreProduct) {
    const next = formFromProduct(product);
    setForm(next);
    setBaseline(serializeForm(next));
    setErrors({});
    setShowSlug(Boolean(product?.slug));
    setSlugTouched(Boolean(product));
    setSkuTouched(Boolean(product?.sku));
    setImageUrlDraft("");
    setOptionDrafts({});
    setDragImageIndex(null);
    setDropImageIndex(null);
    setCreatingCategory(false);
    setNewCategoryName("");
    setNewCategoryParentId("");
    setUploadProgress(null);
    setSessionKey((current) => current + 1);
  }

  useEffect(() => {
    if (!open) return;
    resetEditor(editingProduct);
    const timer = window.setTimeout(() => nameInputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
    // Only re-seed when the editor opens or the product being edited changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingProduct?.id]);

  useEffect(() => {
    if (!open || skuTouched) return;
    if (!form.name.trim() && !form.brand.trim()) {
      if (form.sku) setForm((current) => ({ ...current, sku: "" }));
      return;
    }
    setForm((current) => {
      const nextSku = suggestSku(current.name, current.brand);
      return current.sku === nextSku ? current : { ...current, sku: nextSku };
    });
  }, [form.name, form.brand, form.sku, open, skuTouched]);

  const pricePreview = useMemo(() => {
    const price = Number(form.price);
    if (!form.price.trim() || !Number.isFinite(price)) return null;
    return formatMoneyDetailed(price, STORE_CURRENCY);
  }, [form.price]);

  const salePreview = useMemo(() => {
    const sale = Number(form.sale_price);
    if (!form.sale_price.trim() || !Number.isFinite(sale)) return null;
    return formatMoneyDetailed(sale, STORE_CURRENCY);
  }, [form.sale_price]);

  const descriptionLength = form.description.length;
  const descriptionHint =
    descriptionLength === 0
      ? `Aim for ${DESCRIPTION_IDEAL_MIN}–${DESCRIPTION_IDEAL_MAX} characters`
      : descriptionLength < DESCRIPTION_IDEAL_MIN
        ? `Short · add ~${DESCRIPTION_IDEAL_MIN - descriptionLength} more chars`
        : descriptionLength <= DESCRIPTION_IDEAL_MAX
          ? "Good length for storefront cards"
          : descriptionLength <= DESCRIPTION_SOFT_MAX
            ? "Long · fine for detail pages"
            : "Over the recommended limit";

  async function requestClose() {
    if (closingRef.current) return;
    if (!isDirty) {
      onOpenChange(false);
      return;
    }
    closingRef.current = true;
    const ok = await confirm("Discard unsaved changes?", {
      description: "Your product edits will be lost.",
      confirmLabel: "Discard",
      cancelLabel: "Keep editing",
      destructive: true,
    });
    closingRef.current = false;
    if (ok) onOpenChange(false);
  }

  function handleDialogOpenChange(next: boolean) {
    if (next) {
      onOpenChange(true);
      return;
    }
    void requestClose();
  }

  async function uploadFiles(files: File[]) {
    if (!files.length) return;
    const remaining = MAX_PRODUCT_IMAGES - form.images.length;
    if (remaining <= 0) {
      toast.error(`You can add up to ${MAX_PRODUCT_IMAGES} images.`);
      return;
    }

    const toUpload = files.slice(0, remaining);
    setUploadingImage(true);
    setUploadProgress({ current: 0, total: toUpload.length });
    try {
      const uploaded: string[] = [];
      for (let index = 0; index < toUpload.length; index += 1) {
        setUploadProgress({ current: index + 1, total: toUpload.length });
        uploaded.push(await uploadImage(toUpload[index]));
      }
      setForm((current) => ({
        ...current,
        images: normalizeProductImages([...current.images, ...uploaded]),
      }));
      toast.success(
        uploaded.length === 1 ? "Image uploaded." : `${uploaded.length} images uploaded.`,
      );
      if (files.length > remaining) {
        toast.message(`Only ${remaining} more image(s) could be added (max ${MAX_PRODUCT_IMAGES}).`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload image");
    } finally {
      setUploadingImage(false);
      setUploadProgress(null);
    }
  }

  function removeImage(index: number) {
    setForm((current) => ({
      ...current,
      images: current.images.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function reorderImage(from: number, to: number) {
    if (from === to || from < 0 || to < 0) return;
    setForm((current) => {
      if (from >= current.images.length || to >= current.images.length) return current;
      const images = [...current.images];
      const [item] = images.splice(from, 1);
      images.splice(to, 0, item);
      return { ...current, images };
    });
  }

  function setCoverImage(index: number) {
    setForm((current) => {
      if (index <= 0 || index >= current.images.length) return current;
      const images = [...current.images];
      const [item] = images.splice(index, 1);
      images.unshift(item);
      return { ...current, images };
    });
  }

  function addImageFromUrl(url: string) {
    const trimmed = url.trim();
    if (!trimmed) {
      toast.error("Enter an image URL.");
      return false;
    }
    if (form.images.length >= MAX_PRODUCT_IMAGES) {
      toast.error(`You can add up to ${MAX_PRODUCT_IMAGES} images.`);
      return false;
    }
    if (form.images.includes(trimmed)) {
      toast.error("That image is already in the gallery.");
      return false;
    }
    setForm((current) => ({
      ...current,
      images: normalizeProductImages([...current.images, trimmed]),
    }));
    return true;
  }

  function onImageDragStart(index: number) {
    setDragImageIndex(index);
  }

  function onImageDragOver(event: DragEvent, index: number) {
    event.preventDefault();
    if (dragImageIndex === null || dragImageIndex === index) return;
    setDropImageIndex(index);
  }

  function onImageDrop(index: number) {
    if (dragImageIndex !== null) reorderImage(dragImageIndex, index);
    setDragImageIndex(null);
    setDropImageIndex(null);
  }

  function onFilesDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (form.images.length >= MAX_PRODUCT_IMAGES || uploadingImage) return;
    setImageDropActive(true);
  }

  function onFilesDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    setImageDropActive(false);
  }

  function onFilesDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    setImageDropActive(false);
    const files = Array.from(event.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/"),
    );
    void uploadFiles(files);
  }

  function addVariantOption(index: number, raw: string) {
    const value = raw.trim();
    if (!value) return;
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) => {
        if (variantIndex !== index) return variant;
        if (variant.options.some((option) => option.toLowerCase() === value.toLowerCase())) {
          return variant;
        }
        return { ...variant, options: [...variant.options, value] };
      }),
    }));
    setOptionDrafts((current) => ({ ...current, [index]: "" }));
  }

  function removeVariantOption(variantIndex: number, optionIndex: number) {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, index) =>
        index === variantIndex
          ? { ...variant, options: variant.options.filter((_, i) => i !== optionIndex) }
          : variant,
      ),
    }));
  }

  function handleOptionKeyDown(event: KeyboardEvent<HTMLInputElement>, index: number) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addVariantOption(index, optionDrafts[index] ?? "");
    } else if (event.key === "Backspace" && !(optionDrafts[index] ?? "").length) {
      const options = form.variants[index]?.options ?? [];
      if (options.length) removeVariantOption(index, options.length - 1);
    }
  }

  function togglePerkSuggestion(suggestion: string) {
    setForm((current) => {
      const exists = current.perks.some(
        (perk) => perk.toLowerCase() === suggestion.toLowerCase(),
      );
      if (exists) {
        return {
          ...current,
          perks: current.perks.filter((perk) => perk.toLowerCase() !== suggestion.toLowerCase()),
        };
      }
      return { ...current, perks: [...current.perks, suggestion] };
    });
  }

  function applyDescriptionFormat(kind: "bold" | "list") {
    const el = descriptionRef.current;
    const start = el?.selectionStart ?? form.description.length;
    const end = el?.selectionEnd ?? form.description.length;
    const result =
      kind === "bold"
        ? insertAroundSelection(form.description, start, end, "**")
        : insertLinePrefix(form.description, start, end, "- ");
    setForm((current) => ({ ...current, description: result.next }));
    requestAnimationFrame(() => {
      descriptionRef.current?.focus();
      descriptionRef.current?.setSelectionRange(result.cursor, result.cursor);
    });
  }

  async function generateDescription() {
    const name = form.name.trim();
    if (!name) {
      toast.error("Add a product name first.");
      nameInputRef.current?.focus();
      return;
    }

    const categoryName =
      categoryTree
        .flatMap(({ category, children }) => [category, ...children])
        .find((category) => category.id === form.category_id)?.name ?? null;

    setGeneratingDescription(true);
    try {
      const price = Number(form.price);
      const description = await generateProductDescriptionCopy({
        name,
        category: categoryName,
        price: form.price.trim() && Number.isFinite(price) ? price : null,
        currency: STORE_CURRENCY,
        existing_description: form.description.trim() || null,
      });
      setForm((current) => ({
        ...current,
        description: description.slice(0, DESCRIPTION_SOFT_MAX + 200),
      }));
      toast.success("Description drafted — edit anything you like.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate description");
    } finally {
      setGeneratingDescription(false);
    }
  }

  async function handleCreateCategory() {
    const name = newCategoryName.trim();
    if (!name) {
      toast.error("Enter a category name.");
      return;
    }
    setSavingCategory(true);
    try {
      const created = await onCreateCategory({
        name,
        parent_id: newCategoryParentId || null,
      });
      setForm((current) => ({ ...current, category_id: created.id }));
      setCreatingCategory(false);
      setNewCategoryName("");
      setNewCategoryParentId("");
      toast.success("Category created.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create category");
    } finally {
      setSavingCategory(false);
    }
  }

  async function submit(options?: {
    statusOverride?: ProductForm["status"];
    addAnother?: boolean;
  }) {
    const nextForm = options?.statusOverride
      ? { ...form, status: options.statusOverride }
      : form;
    const nextErrors = validateForm(nextForm);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      toast.error(Object.values(nextErrors)[0]);
      nameInputRef.current?.focus();
      return;
    }

    const product = productFromForm(nextForm, editingProduct);
    try {
      await onSave(product);
      if (options?.addAnother) {
        toast.success("Product added. Ready for another.");
        resetEditor(undefined);
        requestAnimationFrame(() => nameInputRef.current?.focus());
        return;
      }
      toast.success(
        editingProduct
          ? nextForm.status === "active" &&
            (options?.statusOverride === "active" || editingProduct.status === "draft")
            ? "Product published."
            : "Product updated."
          : options?.statusOverride === "draft" || nextForm.status === "draft"
            ? "Product saved as draft."
            : "Product published.",
      );
      setBaseline(serializeForm(nextForm));
      onOpenChange(false);
    } catch {
      // Parent mutation surfaces the error toast.
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Primary CTA publishes to the live store. "Save as draft" is the only path that
    // keeps a product off the live catalog. Respect an explicit Archived selection.
    if (form.status === "archived") {
      await submit();
      return;
    }
    await submit({ statusOverride: "active" });
  }

  const selectClassName =
    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[min(92dvh,900px)] w-[calc(100%-1.5rem)] max-w-5xl flex-col gap-0 overflow-hidden bg-canvas p-0 sm:rounded-2xl"
      >
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <header className="shrink-0 border-b border-border bg-white px-4 py-4 sm:px-6">
            <div className="flex w-full flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 pr-4">
                <DialogTitle className="font-display text-xl font-bold tracking-tight sm:text-2xl">
                  {editingProduct ? "Edit product" : "Add product"}
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-ink-soft">
                  Publish to show it on your live store, or save as draft to keep it private.
                  {isDirty ? (
                    <span className="ml-2 text-amber-700">Unsaved changes</span>
                  ) : null}
                </DialogDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close editor"
                onClick={() => void requestClose()}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            <div
              key={`${editingProduct?.id ?? "new"}-${sessionKey}`}
              className="grid w-full gap-6 lg:grid-cols-[minmax(0,1fr)_240px]"
            >
              <div className="space-y-4">
                <FormSection title="Basics" description="Name, description, and catalog details.">
                  <label className="block space-y-2">
                    <FieldLabel required>Product name</FieldLabel>
                    <Input
                      ref={nameInputRef}
                      value={form.name}
                      onChange={(event) => {
                        const name = event.target.value;
                        setForm((current) => ({
                          ...current,
                          name,
                          slug: slugTouched ? current.slug : slugify(name),
                        }));
                        if (errors.name) setErrors((current) => ({ ...current, name: undefined }));
                      }}
                      placeholder="Oversized Hoodie"
                      required
                      aria-invalid={Boolean(errors.name)}
                    />
                    {errors.name ? <p className="text-xs text-destructive">{errors.name}</p> : null}
                  </label>

                  <div className="space-y-2">
                    {!showSlug ? (
                      <button
                        type="button"
                        className="text-xs font-medium text-primary hover:underline"
                        onClick={() => setShowSlug(true)}
                      >
                        Edit URL slug
                        {form.slug ? (
                          <span className="ml-1 font-normal text-ink-soft">(/{form.slug})</span>
                        ) : null}
                      </button>
                    ) : (
                      <label className="block space-y-2">
                        <FieldLabel optional hint="Used in product URLs">
                          Slug
                        </FieldLabel>
                        <Input
                          value={form.slug}
                          onChange={(event) => {
                            setSlugTouched(true);
                            setForm((current) => ({ ...current, slug: event.target.value }));
                          }}
                          placeholder="oversized-hoodie"
                        />
                      </label>
                    )}
                  </div>

                  <div className="space-y-2">
                    <FieldLabel optional hint={descriptionHint}>
                      Description
                    </FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void generateDescription()}
                        disabled={generatingDescription || isSaving || !form.name.trim()}
                      >
                        {generatingDescription ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        {generatingDescription ? "Writing…" : "Generate with AI"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyDescriptionFormat("bold")}
                      >
                        <Bold className="h-3.5 w-3.5" />
                        Bold
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyDescriptionFormat("list")}
                      >
                        <List className="h-3.5 w-3.5" />
                        List
                      </Button>
                      <span className="self-center text-[11px] text-ink-soft">
                        Uses Markdown · **bold**, - lists
                      </span>
                    </div>
                    <Textarea
                      ref={descriptionRef}
                      value={form.description}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          description: event.target.value.slice(0, DESCRIPTION_SOFT_MAX + 200),
                        }))
                      }
                      placeholder="What makes this product worth buying?"
                      className="min-h-32"
                    />
                    <div className="flex justify-between gap-3 text-[11px] text-ink-soft">
                      <span>
                        Ideal {DESCRIPTION_IDEAL_MIN}–{DESCRIPTION_IDEAL_MAX} chars for cards
                      </span>
                      <span
                        className={cn(
                          descriptionLength > DESCRIPTION_SOFT_MAX && "text-destructive",
                        )}
                      >
                        {descriptionLength}/{DESCRIPTION_SOFT_MAX}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <FieldLabel optional>Category</FieldLabel>
                      <select
                        value={form.category_id}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, category_id: event.target.value }))
                        }
                        className={selectClassName}
                      >
                        <option value="">No category</option>
                        {categoryTree.map(({ category, children }) =>
                          children.length ? (
                            <optgroup key={category.id} label={category.name}>
                              <option value={category.id}>{category.name} (parent)</option>
                              {children.map((child) => (
                                <option key={child.id} value={child.id}>
                                  {child.name}
                                </option>
                              ))}
                            </optgroup>
                          ) : (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ),
                        )}
                      </select>
                      {!creatingCategory ? (
                        <button
                          type="button"
                          className="text-xs font-medium text-primary hover:underline"
                          onClick={() => setCreatingCategory(true)}
                        >
                          + New category
                        </button>
                      ) : (
                        <div className="space-y-2 rounded-lg border border-border bg-secondary/20 p-3">
                          <Input
                            value={newCategoryName}
                            onChange={(event) => setNewCategoryName(event.target.value)}
                            placeholder="Category name"
                            autoFocus
                          />
                          <select
                            value={newCategoryParentId}
                            onChange={(event) => setNewCategoryParentId(event.target.value)}
                            className={selectClassName}
                          >
                            <option value="">Top-level category</option>
                            {parentCategories.map((category) => (
                              <option key={category.id} value={category.id}>
                                Under {category.name}
                              </option>
                            ))}
                          </select>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              disabled={savingCategory}
                              onClick={() => void handleCreateCategory()}
                            >
                              {savingCategory ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : null}
                              Create
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setCreatingCategory(false);
                                setNewCategoryName("");
                                setNewCategoryParentId("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    <label className="block space-y-2">
                      <FieldLabel optional>Brand</FieldLabel>
                      <Input
                        value={form.brand}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, brand: event.target.value }))
                        }
                        placeholder="Nike"
                        list="product-brand-options"
                      />
                      <datalist id="product-brand-options">
                        {brandOptions.map((brand) => (
                          <option key={brand} value={brand} />
                        ))}
                      </datalist>
                    </label>
                    <div className="space-y-2">
                      <FieldLabel optional hint={!skuTouched ? "Auto" : undefined}>
                        SKU
                      </FieldLabel>
                      <Input
                        value={form.sku}
                        onChange={(event) => {
                          setSkuTouched(true);
                          setForm((current) => ({ ...current, sku: event.target.value }));
                        }}
                        placeholder={suggestedSku}
                      />
                      <div className="flex flex-wrap gap-2 text-xs">
                        {!skuTouched && form.sku ? (
                          <span className="text-ink-soft">Suggested from name/brand</span>
                        ) : null}
                        {skuTouched ? (
                          <button
                            type="button"
                            className="font-medium text-primary hover:underline"
                            onClick={() => {
                              setSkuTouched(false);
                              setForm((current) => ({
                                ...current,
                                sku: suggestSku(current.name, current.brand),
                              }));
                            }}
                          >
                            Reset to suggested ({suggestedSku})
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <label className="block space-y-2">
                      <FieldLabel optional>Status</FieldLabel>
                      <select
                        value={form.status}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            status: event.target.value as ProductForm["status"],
                          }))
                        }
                        className={selectClassName}
                      >
                        <option value="active">Active (live)</option>
                        <option value="draft">Draft</option>
                        <option value="archived">Archived</option>
                      </select>
                    </label>
                  </div>
                </FormSection>

                <FormSection
                  title="Pricing & inventory"
                  description="Prices are in Nigerian Naira (NGN)."
                >
                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="block space-y-2">
                      <FieldLabel required hint={pricePreview ?? undefined}>
                        Price (NGN)
                      </FieldLabel>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={form.price}
                        onChange={(event) => {
                          setForm((current) => ({ ...current, price: event.target.value }));
                          if (errors.price || errors.sale_price) {
                            setErrors((current) => ({
                              ...current,
                              price: undefined,
                              sale_price: undefined,
                            }));
                          }
                        }}
                        placeholder="28500"
                        required
                        aria-invalid={Boolean(errors.price)}
                      />
                      {errors.price ? (
                        <p className="text-xs text-destructive">{errors.price}</p>
                      ) : null}
                    </label>
                    <label className="block space-y-2">
                      <FieldLabel optional hint={salePreview ?? undefined}>
                        Sale price (NGN)
                      </FieldLabel>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={form.sale_price}
                        onChange={(event) => {
                          setForm((current) => ({ ...current, sale_price: event.target.value }));
                          if (errors.sale_price) {
                            setErrors((current) => ({ ...current, sale_price: undefined }));
                          }
                        }}
                        placeholder="Optional"
                        aria-invalid={Boolean(errors.sale_price)}
                      />
                      {errors.sale_price ? (
                        <p className="text-xs text-destructive">{errors.sale_price}</p>
                      ) : null}
                    </label>
                    <label className="block space-y-2">
                      <FieldLabel optional>Stock</FieldLabel>
                      <Input
                        type="number"
                        min="0"
                        value={form.stock_quantity}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            stock_quantity: event.target.value,
                          }))
                        }
                        placeholder="25"
                      />
                    </label>
                  </div>
                </FormSection>

                <FormSection
                  title="Product images"
                  description={`Up to ${MAX_PRODUCT_IMAGES} images. First image is the cover.`}
                >
                  <div
                    onDragOver={onFilesDragOver}
                    onDragLeave={onFilesDragLeave}
                    onDrop={onFilesDrop}
                    className={cn(
                      "rounded-lg border border-dashed px-4 py-8 text-center transition-colors",
                      imageDropActive
                        ? "border-primary bg-primary/5"
                        : "border-border bg-secondary/20",
                    )}
                  >
                    <ImagePlus className="mx-auto h-6 w-6 text-ink-soft" />
                    <p className="mt-2 text-sm font-medium">Drag & drop images here</p>
                    <p className="mt-1 text-xs text-ink-soft">
                      PNG, JPG, or WebP · max {MAX_PRODUCT_IMAGES}
                    </p>
                    {uploadProgress ? (
                      <p className="mt-3 text-sm font-medium text-primary">
                        Uploading {uploadProgress.current} of {uploadProgress.total}…
                      </p>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      disabled={uploadingImage || form.images.length >= MAX_PRODUCT_IMAGES}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploadingImage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ImagePlus className="h-4 w-4" />
                      )}
                      Choose files
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      onChange={(event) => {
                        const files = Array.from(event.target.files ?? []);
                        event.target.value = "";
                        void uploadFiles(files);
                      }}
                      disabled={uploadingImage || form.images.length >= MAX_PRODUCT_IMAGES}
                    />
                  </div>

                  {form.images.length ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {form.images.map((image, index) => (
                        <div
                          key={`${image}-${index}`}
                          draggable
                          onDragStart={() => onImageDragStart(index)}
                          onDragOver={(event) => onImageDragOver(event, index)}
                          onDrop={() => onImageDrop(index)}
                          onDragEnd={() => {
                            setDragImageIndex(null);
                            setDropImageIndex(null);
                          }}
                          className={cn(
                            "relative overflow-hidden rounded-lg border bg-secondary/40",
                            dropImageIndex === index
                              ? "border-primary ring-2 ring-primary/30"
                              : "border-border",
                            dragImageIndex === index && "opacity-60",
                          )}
                        >
                          <div className="absolute left-2 top-2 z-10 flex items-center gap-1">
                            <span className="inline-flex h-6 w-6 cursor-grab items-center justify-center rounded-md bg-background/90 text-ink-soft shadow-sm active:cursor-grabbing">
                              <GripVertical className="h-3.5 w-3.5" />
                            </span>
                            {index === 0 ? (
                              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                                Cover
                              </span>
                            ) : null}
                          </div>
                          <div className="aspect-square w-full">
                            <img
                              src={image}
                              alt={`Product image ${index + 1}`}
                              className="h-full w-full object-contain object-center"
                              draggable={false}
                            />
                          </div>
                          <div className="flex items-center justify-between gap-1 border-t border-border bg-background/95 p-1.5">
                            <span className="px-1 text-[11px] text-ink-soft">Drag to reorder</span>
                            <div className="flex items-center gap-0.5">
                              {index > 0 ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-[11px]"
                                  onClick={() => setCoverImage(index)}
                                >
                                  Set cover
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={() => removeImage(index)}
                                aria-label="Remove image"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-end gap-3">
                    <label className="min-w-0 flex-1 space-y-2 text-sm font-medium">
                      Add image URL
                      <Input
                        value={imageUrlDraft}
                        onChange={(event) => setImageUrlDraft(event.target.value)}
                        placeholder="https://..."
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            if (addImageFromUrl(imageUrlDraft)) setImageUrlDraft("");
                          }
                        }}
                      />
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (addImageFromUrl(imageUrlDraft)) setImageUrlDraft("");
                      }}
                      disabled={form.images.length >= MAX_PRODUCT_IMAGES}
                    >
                      Add URL
                    </Button>
                  </div>
                </FormSection>

                <FormSection
                  title="Variants"
                  description="Optional options like Size or Color. Leave empty for simple products."
                  defaultOpen={Boolean(form.variants.length)}
                >
                  {form.variants.length ? (
                    <div className="space-y-3">
                      {form.variants.map((variant, index) => (
                        <div key={index} className="rounded-lg border border-border p-3">
                          <div className="flex items-start gap-2">
                            <Input
                              value={variant.name}
                              onChange={(event) =>
                                setForm((current) => ({
                                  ...current,
                                  variants: current.variants.map((item, itemIndex) =>
                                    itemIndex === index
                                      ? { ...item, name: event.target.value }
                                      : item,
                                  ),
                                }))
                              }
                              placeholder="Size"
                              className="max-w-[140px]"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="shrink-0"
                              onClick={() =>
                                setForm((current) => ({
                                  ...current,
                                  variants: current.variants.filter(
                                    (_, itemIndex) => itemIndex !== index,
                                  ),
                                }))
                              }
                              aria-label="Remove variant group"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-input bg-transparent px-2 py-1.5">
                            {variant.options.map((option, optionIndex) => (
                              <span
                                key={`${option}-${optionIndex}`}
                                className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium"
                              >
                                {option}
                                <button
                                  type="button"
                                  className="rounded-sm text-ink-soft hover:text-foreground"
                                  onClick={() => removeVariantOption(index, optionIndex)}
                                  aria-label={`Remove ${option}`}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                            <input
                              value={optionDrafts[index] ?? ""}
                              onChange={(event) =>
                                setOptionDrafts((current) => ({
                                  ...current,
                                  [index]: event.target.value.replace(/,/g, ""),
                                }))
                              }
                              onKeyDown={(event) => handleOptionKeyDown(event, index)}
                              onBlur={() => addVariantOption(index, optionDrafts[index] ?? "")}
                              placeholder={
                                variant.options.length ? "Add option" : "Type S, then Enter"
                              }
                              className="min-w-[120px] flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-ink-soft">
                      No variants yet. Add a group when this product has sizes, colors, or other
                      options.
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        variants: [...current.variants, { name: "", options: [] }],
                      }))
                    }
                  >
                    <Plus className="h-4 w-4" />
                    Add variant group
                  </Button>
                </FormSection>

                <FormSection
                  title="Perks"
                  description="Highlight benefits like warranty or free delivery."
                  defaultOpen={Boolean(form.perks.length)}
                >
                  <div className="flex flex-wrap gap-2">
                    {PERK_SUGGESTIONS.map((suggestion) => {
                      const selected = form.perks.some(
                        (perk) => perk.toLowerCase() === suggestion.toLowerCase(),
                      );
                      return (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => togglePerkSuggestion(suggestion)}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                            selected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-background text-ink-soft hover:bg-secondary",
                          )}
                        >
                          {suggestion}
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-3">
                    {form.perks.map((perk, index) => (
                      <div key={index} className="grid gap-3 md:grid-cols-[1fr_auto]">
                        <Input
                          value={perk}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              perks: current.perks.map((item, itemIndex) =>
                                itemIndex === index ? event.target.value : item,
                              ),
                            }))
                          }
                          placeholder="Free delivery in Lagos"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              perks: current.perks.filter((_, itemIndex) => itemIndex !== index),
                            }))
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm((current) => ({ ...current, perks: [...current.perks, ""] }))
                    }
                  >
                    <Plus className="h-4 w-4" />
                    Add custom perk
                  </Button>
                </FormSection>
              </div>

              <aside className="space-y-4 lg:sticky lg:top-0 lg:self-start">
                <div className="overflow-hidden rounded-xl border border-border bg-white p-4 shadow-sm">
                  <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-ink-soft">
                    Storefront preview
                  </p>
                  <div className="flex h-44 items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary/30">
                    {form.images[0] ? (
                      <img
                        src={form.images[0]}
                        alt=""
                        className="h-full w-full object-contain object-center"
                      />
                    ) : (
                      <ImagePlus className="h-8 w-8 text-ink-soft" />
                    )}
                  </div>
                  <p className="mt-3 truncate text-base font-semibold">
                    {form.name.trim() || "Product name"}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                    {salePreview ? (
                      <>
                        <span className="font-semibold text-primary">{salePreview}</span>
                        {pricePreview ? (
                          <span className="text-xs text-ink-soft line-through">{pricePreview}</span>
                        ) : null}
                      </>
                    ) : (
                      <span className="font-semibold">{pricePreview ?? "—"}</span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-ink-soft">
                    <span className="rounded-full bg-secondary px-2 py-0.5 uppercase tracking-wide">
                      {form.status}
                    </span>
                    {form.brand.trim() ? <span>{form.brand}</span> : null}
                    {form.sku.trim() ? <span>SKU {form.sku}</span> : null}
                  </div>
                </div>
              </aside>
            </div>
          </div>

          <footer className="shrink-0 border-t border-border bg-white px-4 py-4 sm:px-6">
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button type="button" variant="outline" onClick={() => void requestClose()}>
                Cancel
              </Button>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                {!editingProduct || form.status === "draft" ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSaving || uploadingImage}
                    onClick={() => void submit({ statusOverride: "draft" })}
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Save as draft
                  </Button>
                ) : null}
                {!editingProduct ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSaving || uploadingImage}
                    onClick={() => void submit({ addAnother: true, statusOverride: "active" })}
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Save & add another
                  </Button>
                ) : null}
                <Button type="submit" disabled={isSaving || uploadingImage}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {form.status === "archived"
                    ? "Save product"
                    : form.status === "draft" || !editingProduct
                      ? "Publish product"
                      : "Save product"}
                </Button>
              </div>
            </div>
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  );
}
