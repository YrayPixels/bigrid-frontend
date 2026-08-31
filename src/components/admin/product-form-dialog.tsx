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
  CopyPlus,
  FilePen,
  GripVertical,
  ImagePlus,
  List,
  Loader2,
  Plus,
  Rocket,
  Save,
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { generateProductDescriptionCopy } from "@/lib/storefront-builder/product-description";
import { api } from "@/lib/api/client";
import type { StoreCategory, StoreProduct, TryOnMode } from "@/lib/api/types";
import { ProductModelLook } from "@/components/admin/product-model-look";
import {
  GARMENT_CATEGORY_OPTIONS,
  NAIL_EFFECT_OPTIONS,
  NAIL_POLISH_TEXTURE_OPTIONS,
  NAIL_PRESS_ON_TEXTURE_OPTIONS,
  NAIL_SHAPE_OPTIONS,
  NAIL_SUB_TYPE_OPTIONS,
  TRY_ON_MODES,
  isTryOnMode,
  refImageHintForMode,
  styleOptionsForMode,
  usesGenderStyle,
} from "@/lib/storefront/try-on";

type VariantOptionForm = {
  value: string;
  price: string;
  image_url: string;
};

type ProductForm = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  sale_price: string;
  floor_price: string;
  currency: string;
  images: string[];
  sku: string;
  barcode: string;
  brand: string;
  category_id: string;
  stock_quantity: string;
  status: "active" | "draft" | "archived";
  variants: { name: string; options: VariantOptionForm[] }[];
  perks: string[];
  try_on_enabled: boolean;
  try_on_mode: TryOnMode;
  try_on_bag_gender: "female" | "male" | "ask";
  try_on_bag_style: string;
  try_on_garment_category: string;
  try_on_ref_image_url: string;
  try_on_nail_effect_type: "nail_polish" | "press_on_nails";
  try_on_nail_sub_type: "color" | "design";
  try_on_nail_color: string;
  try_on_nail_texture: string;
  try_on_nail_shape: string;
  try_on_nail_length: string;
  try_on_fabric_template_id: string;
};

type StoreVariantOption = NonNullable<StoreProduct["variants"]>[number]["options"][number];

function blankVariantOption(value = ""): VariantOptionForm {
  return { value, price: "", image_url: "" };
}

function normalizeVariantOption(option: StoreVariantOption): VariantOptionForm {
  if (typeof option === "string") {
    return blankVariantOption(option);
  }
  return {
    value: option.value,
    price: option.price != null ? String(option.price) : "",
    image_url: option.image_url ?? "",
  };
}

function serializeVariantOption(option: VariantOptionForm) {
  return {
    value: option.value,
    price: option.price,
    image_url: option.image_url,
  };
}

function mapVariantOptionToProduct(option: VariantOptionForm) {
  const value = option.value.trim();
  if (!value) return null;

  const mapped: {
    value: string;
    price?: number | null;
    image_url?: string | null;
  } = { value };

  const priceStr = option.price.trim();
  if (priceStr) {
    const price = Number(priceStr);
    mapped.price = Number.isFinite(price) ? price : null;
  }

  const imageUrl = option.image_url.trim();
  if (imageUrl) {
    mapped.image_url = imageUrl;
  }

  return mapped;
}

type CategoryTreeNode = {
  category: StoreCategory;
  children: StoreCategory[];
};

type FormErrors = {
  name?: string;
  price?: string;
  sale_price?: string;
  floor_price?: string;
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
  floor_price: "",
  currency: STORE_CURRENCY,
  images: [],
  sku: "",
  barcode: "",
  brand: "",
  category_id: "",
  stock_quantity: "",
  status: "active",
  variants: [],
  perks: [],
  try_on_enabled: false,
  try_on_mode: "bag",
  try_on_bag_gender: "ask",
  try_on_bag_style: "random",
  try_on_garment_category: "auto",
  try_on_ref_image_url: "",
  try_on_nail_effect_type: "nail_polish",
  try_on_nail_sub_type: "color",
  try_on_nail_color: "#c41e3a",
  try_on_nail_texture: "cream",
  try_on_nail_shape: "square_oval",
  try_on_nail_length: "1",
  try_on_fabric_template_id: "",
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
      options: variant.options.map(serializeVariantOption),
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
    floor_price: product.floor_price != null ? String(product.floor_price) : "",
    currency: STORE_CURRENCY,
    images: normalizeProductImages(product.images, product.image_url),
    sku: product.sku ?? "",
    barcode: product.barcode ?? "",
    brand: product.brand ?? "",
    category_id: product.category_id ?? "",
    stock_quantity:
      typeof product.stock_quantity === "number" ? String(product.stock_quantity) : "",
    status: product.status ?? "draft",
    variants: product.variants?.length
      ? product.variants.map((variant) => ({
          name: variant.name,
          options: variant.options.map(normalizeVariantOption),
        }))
      : [],
    perks: product.perks?.length ? [...product.perks] : [],
    try_on_enabled: Boolean(product.try_on?.enabled),
    try_on_mode: isTryOnMode(product.try_on?.mode) ? product.try_on.mode : "bag",
    try_on_bag_gender:
      product.try_on?.bag_gender_default === "female" ||
      product.try_on?.bag_gender_default === "male"
        ? product.try_on.bag_gender_default
        : "ask",
    try_on_bag_style: product.try_on?.bag_style ?? "random",
    try_on_garment_category: product.try_on?.garment_category ?? "auto",
    try_on_ref_image_url: product.try_on?.ref_image_url ?? "",
    try_on_nail_effect_type:
      product.try_on?.nail_effect_type === "press_on_nails" ? "press_on_nails" : "nail_polish",
    try_on_nail_sub_type: product.try_on?.nail_sub_type === "design" ? "design" : "color",
    try_on_nail_color: product.try_on?.nail_color ?? "#c41e3a",
    try_on_nail_texture: product.try_on?.nail_texture ?? "cream",
    try_on_nail_shape: product.try_on?.nail_shape ?? "square_oval",
    try_on_nail_length:
      product.try_on?.nail_length != null ? String(product.try_on.nail_length) : "1",
    try_on_fabric_template_id: product.try_on?.fabric_template_id ?? "",
  };
}

function productFromForm(form: ProductForm, existing?: StoreProduct): StoreProduct {
  const name = form.name.trim();
  const slug = slugify(form.slug || name);
  const price = Number(form.price);
  const salePrice = form.sale_price.trim() ? Number(form.sale_price) : undefined;
  const floorPrice = form.floor_price.trim() ? Number(form.floor_price) : undefined;
  const stock = form.stock_quantity.trim() ? Number(form.stock_quantity) : undefined;
  const variants = form.variants
    .map((variant) => ({
      name: variant.name.trim(),
      options: variant.options
        .map(mapVariantOptionToProduct)
        .filter((option): option is NonNullable<typeof option> => option !== null),
    }))
    .filter((variant) => variant.name && variant.options.length);
  const perks = form.perks.map((perk) => perk.trim()).filter(Boolean);
  const images = normalizeProductImages(form.images);
  const refImage = form.try_on_ref_image_url.trim();

  return {
    id: existing?.id ?? form.id ?? uid(),
    slug,
    name,
    description: form.description.trim(),
    price: Number.isFinite(price) ? price : 0,
    sale_price: Number.isFinite(salePrice) ? salePrice : null,
    floor_price: Number.isFinite(floorPrice) ? floorPrice : null,
    currency: STORE_CURRENCY,
    image_url: images[0] ?? null,
    images: images.length ? images : null,
    sku: form.sku.trim() || undefined,
    barcode: form.barcode.trim() || null,
    brand: form.brand.trim() || null,
    category_id: form.category_id || null,
    stock_quantity: Number.isFinite(stock) ? stock : undefined,
    status: form.status,
    variants: variants.length ? variants : undefined,
    perks: perks.length ? perks : undefined,
    try_on: {
      enabled: form.try_on_enabled,
      mode: form.try_on_mode,
      bag_gender_default: form.try_on_bag_gender,
      bag_style: form.try_on_bag_style || "random",
      ref_image_url: refImage || null,
      garment_category:
        form.try_on_garment_category === "full_body" ||
        form.try_on_garment_category === "upper_body" ||
        form.try_on_garment_category === "lower_body" ||
        form.try_on_garment_category === "outerwear" ||
        form.try_on_garment_category === "shoes"
          ? form.try_on_garment_category
          : "auto",
      nail_effect_type: form.try_on_nail_effect_type,
      nail_sub_type: form.try_on_nail_sub_type,
      nail_color: form.try_on_nail_color,
      nail_texture: form.try_on_nail_texture,
      nail_shape: form.try_on_nail_shape,
      nail_length: Number(form.try_on_nail_length) || 1,
      fabric_template_id: form.try_on_fabric_template_id.trim() || undefined,
    },
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
  if (form.floor_price.trim()) {
    const floor = Number(form.floor_price);
    const price = Number(form.price);
    if (!Number.isFinite(floor) || floor < 0) {
      errors.floor_price = "Enter a valid floor price.";
    } else if (Number.isFinite(price) && floor > price) {
      errors.floor_price = "Floor price cannot exceed regular price.";
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
    <section className="overflow-hidden rounded-xl border border-border bg-card">
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
  const [fabricTemplates, setFabricTemplates] = useState<
    { id: string; name: string; thumbnail_url: string | null }[]
  >([]);
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
    if (!open || !form.try_on_enabled || form.try_on_mode !== "fabric") return;
    let cancelled = false;
    void api
      .listFabricTemplates()
      .then((templates) => {
        if (!cancelled) setFabricTemplates(templates);
      })
      .catch(() => {
        if (!cancelled) setFabricTemplates([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, form.try_on_enabled, form.try_on_mode]);

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

  const floorPreview = useMemo(() => {
    const floor = Number(form.floor_price);
    if (!form.floor_price.trim() || !Number.isFinite(floor)) return null;
    return formatMoneyDetailed(floor, STORE_CURRENCY);
  }, [form.floor_price]);

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
    if (![...event.dataTransfer.types].includes("Files")) return;
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
    if (![...event.dataTransfer.types].includes("Files")) return;
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
        if (
          variant.options.some(
            (option) => option.value.trim().toLowerCase() === value.toLowerCase(),
          )
        ) {
          return variant;
        }
        return { ...variant, options: [...variant.options, blankVariantOption(value)] };
      }),
    }));
    setOptionDrafts((current) => ({ ...current, [index]: "" }));
  }

  function updateVariantOption(
    variantIndex: number,
    optionIndex: number,
    field: keyof VariantOptionForm,
    raw: string,
  ) {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, index) =>
        index === variantIndex
          ? {
              ...variant,
              options: variant.options.map((option, idx) =>
                idx === optionIndex ? { ...option, [field]: raw } : option,
              ),
            }
          : variant,
      ),
    }));
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

  const primaryActionLabel =
    form.status === "archived"
      ? "Save product"
      : form.status === "draft" || !editingProduct
        ? "Publish product"
        : "Save product";
  const primaryActionIsPublish = primaryActionLabel === "Publish product";

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="inset-0 flex h-dvh max-h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-canvas p-0 left-0 top-0 sm:inset-auto sm:left-[50%] sm:top-[50%] sm:h-auto sm:max-h-[min(92dvh,900px)] sm:w-[calc(100%-1.5rem)] sm:max-w-5xl sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-2xl sm:border"
      >
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <header className="shrink-0 border-b border-border bg-canvas-raised px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex w-full items-start justify-between gap-3">
              <div className="min-w-0 pr-2">
                <DialogTitle className="font-display text-lg font-bold tracking-tight sm:text-2xl">
                  {editingProduct ? "Edit product" : "Add product"}
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-xs text-ink-soft sm:mt-1 sm:text-sm">
                  <span className="hidden sm:inline">
                    Publish to show it on your live store, or save as draft to keep it private.
                  </span>
                  <span className="sm:hidden">
                    {isDirty ? "Unsaved changes" : "Fill in details and publish when ready."}
                  </span>
                  {isDirty ? (
                    <span className="ml-2 hidden text-amber-700 sm:inline">Unsaved changes</span>
                  ) : null}
                </DialogDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close editor"
                className="shrink-0"
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
                <FormSection
                  title="Product images"
                  description={`Up to ${MAX_PRODUCT_IMAGES} images. First image is the cover.`}
                >
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
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

                    {form.images.length < MAX_PRODUCT_IMAGES ? (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={onFilesDragOver}
                        onDragLeave={onFilesDragLeave}
                        onDrop={onFilesDrop}
                        disabled={uploadingImage}
                        className={cn(
                          "flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-3 text-center transition-colors",
                          "disabled:cursor-not-allowed disabled:opacity-60",
                          imageDropActive
                            ? "border-primary bg-primary/5"
                            : "border-border bg-secondary/20 hover:border-primary/40 hover:bg-secondary/40",
                        )}
                      >
                        {uploadingImage ? (
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        ) : (
                          <ImagePlus className="h-6 w-6 text-ink-soft" />
                        )}
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium">
                            {uploadingImage
                              ? uploadProgress
                                ? `${uploadProgress.current}/${uploadProgress.total}`
                                : "Uploading…"
                              : "Add images"}
                          </p>
                          <p className="text-[11px] text-ink-soft">
                            {uploadingImage
                              ? "Please wait"
                              : "Drop or browse · PNG, JPG, WebP"}
                          </p>
                        </div>
                      </button>
                    ) : null}
                  </div>

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
                  title="Wear on a model"
                  description="Generate an on-model photo from your product image. Added to the gallery above."
                >
                  <ProductModelLook
                    productId={form.id}
                    garmentImageUrl={form.images[0] ?? null}
                    canAddImage={form.images.length < MAX_PRODUCT_IMAGES}
                    uploadImage={uploadImage}
                    onAddImage={(url) =>
                      setForm((current) => ({
                        ...current,
                        images: normalizeProductImages([...current.images, url]),
                      }))
                    }
                  />
                </FormSection>

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
                      <FieldLabel optional hint="For POS scan">
                        Barcode
                      </FieldLabel>
                      <Input
                        value={form.barcode}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, barcode: event.target.value }))
                        }
                        placeholder="EAN / UPC / QR payload"
                        inputMode="text"
                        autoComplete="off"
                      />
                    </label>
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
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                          if (errors.price || errors.sale_price || errors.floor_price) {
                            setErrors((current) => ({
                              ...current,
                              price: undefined,
                              sale_price: undefined,
                              floor_price: undefined,
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
                      <FieldLabel optional hint={floorPreview ?? undefined}>
                        Bargain floor price (Dealie AI)
                      </FieldLabel>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={form.floor_price}
                        onChange={(event) => {
                          setForm((current) => ({ ...current, floor_price: event.target.value }));
                          if (errors.floor_price) {
                            setErrors((current) => ({ ...current, floor_price: undefined }));
                          }
                        }}
                        placeholder="Min AI bargain price"
                        aria-invalid={Boolean(errors.floor_price)}
                      />
                      {errors.floor_price ? (
                        <p className="text-xs text-destructive">{errors.floor_price}</p>
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
                  title="Variants"
                  description="Optional options like Size or Color. Sizes can have different prices; colors can have different images."
                  defaultOpen={Boolean(form.variants.length)}
                >
                  {form.variants.length ? (
                    <div className="space-y-3">
                      {form.variants.map((variant, index) => (
                        <div key={index} className="rounded-lg border border-border p-3">
                          <div className="flex items-center gap-2">
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
                              placeholder="Size or Color"
                              className="max-w-[160px] font-medium"
                            />
                            <span className="text-xs text-ink-soft">
                              {variant.options.length
                                ? `${variant.options.length} option${variant.options.length === 1 ? "" : "s"}`
                                : "No options yet"}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="ml-auto shrink-0 text-ink-soft hover:text-destructive"
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

                          <div className="mt-3 overflow-x-auto">
                            <div className="min-w-[420px] space-y-2">
                              {variant.options.length ? (
                                <div className="grid grid-cols-[minmax(0,1.1fr)_104px_minmax(148px,1.2fr)_36px] items-center gap-2 px-0.5 text-[11px] font-medium text-ink-soft">
                                  <span>Value</span>
                                  <span>Price (NGN)</span>
                                  <span>Image</span>
                                  <span className="sr-only">Remove</span>
                                </div>
                              ) : null}

                              {variant.options.map((option, optionIndex) => {
                                const imageInGallery = form.images.includes(option.image_url);
                                const hasCustomUrl =
                                  Boolean(option.image_url.trim()) && !imageInGallery;

                                return (
                                  <div
                                    key={`${index}-${optionIndex}`}
                                    className="grid grid-cols-[minmax(0,1.1fr)_104px_minmax(148px,1.2fr)_36px] items-center gap-2"
                                  >
                                    <Input
                                      value={option.value}
                                      onChange={(event) =>
                                        updateVariantOption(
                                          index,
                                          optionIndex,
                                          "value",
                                          event.target.value,
                                        )
                                      }
                                      placeholder="S, Blue, 128GB…"
                                    />
                                    <Input
                                      type="number"
                                      min="0"
                                      step="any"
                                      value={option.price}
                                      onChange={(event) =>
                                        updateVariantOption(
                                          index,
                                          optionIndex,
                                          "price",
                                          event.target.value,
                                        )
                                      }
                                      placeholder="—"
                                    />
                                    <div className="min-w-0">
                                      {form.images.length ? (
                                        <div className="flex items-center gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              updateVariantOption(
                                                index,
                                                optionIndex,
                                                "image_url",
                                                "",
                                              )
                                            }
                                            className={cn(
                                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-[10px] font-medium transition-colors",
                                              !option.image_url.trim()
                                                ? "border-primary bg-primary/10 text-primary"
                                                : "border-input text-ink-soft hover:bg-secondary",
                                            )}
                                            aria-label="No image"
                                            title="No image"
                                          >
                                            None
                                          </button>
                                          {form.images.map((image, imageIndex) => {
                                            const selected = option.image_url === image;
                                            return (
                                              <button
                                                key={`${image}-${imageIndex}`}
                                                type="button"
                                                onClick={() =>
                                                  updateVariantOption(
                                                    index,
                                                    optionIndex,
                                                    "image_url",
                                                    image,
                                                  )
                                                }
                                                className={cn(
                                                  "h-9 w-9 shrink-0 overflow-hidden rounded-md border transition",
                                                  selected
                                                    ? "border-primary ring-2 ring-primary/30"
                                                    : "border-input hover:border-primary/40",
                                                )}
                                                aria-label={
                                                  imageIndex === 0
                                                    ? "Use cover image"
                                                    : `Use gallery image ${imageIndex + 1}`
                                                }
                                                title={
                                                  imageIndex === 0
                                                    ? "Cover image"
                                                    : `Gallery ${imageIndex + 1}`
                                                }
                                              >
                                                <img
                                                  src={image}
                                                  alt=""
                                                  className="h-full w-full object-cover"
                                                />
                                              </button>
                                            );
                                          })}
                                          {hasCustomUrl ? (
                                            <Input
                                              value={option.image_url}
                                              onChange={(event) =>
                                                updateVariantOption(
                                                  index,
                                                  optionIndex,
                                                  "image_url",
                                                  event.target.value,
                                                )
                                              }
                                              placeholder="https://…"
                                              className="h-9 min-w-0 flex-1"
                                            />
                                          ) : null}
                                        </div>
                                      ) : (
                                        <Input
                                          value={option.image_url}
                                          onChange={(event) =>
                                            updateVariantOption(
                                              index,
                                              optionIndex,
                                              "image_url",
                                              event.target.value,
                                            )
                                          }
                                          placeholder="Image URL (optional)"
                                        />
                                      )}
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-9 w-9 shrink-0 text-ink-soft hover:text-destructive"
                                      onClick={() => removeVariantOption(index, optionIndex)}
                                      aria-label={`Remove ${option.value || "option"}`}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                );
                              })}

                              <div className="rounded-md border border-dashed border-input px-2.5 py-1.5">
                                <Input
                                  value={optionDrafts[index] ?? ""}
                                  onChange={(event) =>
                                    setOptionDrafts((current) => ({
                                      ...current,
                                      [index]: event.target.value.replace(/,/g, ""),
                                    }))
                                  }
                                  onKeyDown={(event) => handleOptionKeyDown(event, index)}
                                  onBlur={() =>
                                    addVariantOption(index, optionDrafts[index] ?? "")
                                  }
                                  placeholder={
                                    variant.options.length
                                      ? "Add another option, press Enter"
                                      : "Type an option (e.g. Blue), then Enter"
                                  }
                                  className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                                />
                              </div>
                            </div>
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

                <FormSection
                  title="Virtual try-on"
                  description="Let shoppers see this product on themselves. Store try-on must also be enabled in Settings → Operations."
                  defaultOpen={form.try_on_enabled}
                >
                  <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-background p-4">
                    <div>
                      <p className="text-sm font-semibold">Enable try-on for this product</p>
                      <p className="mt-1 text-sm text-ink-soft">
                        Shows Try it on on the product page when the store feature is on.
                      </p>
                    </div>
                    <Switch
                      checked={form.try_on_enabled}
                      onCheckedChange={(checked) =>
                        setForm((current) => ({ ...current, try_on_enabled: checked }))
                      }
                      aria-label="Enable try-on for this product"
                    />
                  </div>

                  {form.try_on_enabled ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Mode</Label>
                        <Select
                          value={form.try_on_mode}
                          onValueChange={(value) =>
                            setForm((current) => ({
                              ...current,
                              try_on_mode: isTryOnMode(value) ? value : "bag",
                              try_on_bag_style: "random",
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TRY_ON_MODES.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {usesGenderStyle(form.try_on_mode) ? (
                        <>
                          <div className="space-y-2">
                            <Label>Default gender</Label>
                            <Select
                              value={form.try_on_bag_gender}
                              onValueChange={(value) =>
                                setForm((current) => ({
                                  ...current,
                                  try_on_bag_gender:
                                    value === "female" || value === "male" ? value : "ask",
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ask">Ask shopper</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="male">Male</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Label>Default style</Label>
                            <Select
                              value={form.try_on_bag_style}
                              onValueChange={(value) =>
                                setForm((current) => ({ ...current, try_on_bag_style: value }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {styleOptionsForMode(form.try_on_mode).map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      ) : null}

                      {form.try_on_mode === "clothes" ? (
                        <div className="space-y-2">
                          <Label>Garment category</Label>
                          <Select
                            value={form.try_on_garment_category}
                            onValueChange={(value) =>
                              setForm((current) => ({
                                ...current,
                                try_on_garment_category: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {GARMENT_CATEGORY_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : null}

                      {form.try_on_mode === "nail" ? (
                        <>
                          <div className="space-y-2">
                            <Label>Nail type</Label>
                            <Select
                              value={form.try_on_nail_effect_type}
                              onValueChange={(value) =>
                                setForm((current) => ({
                                  ...current,
                                  try_on_nail_effect_type:
                                    value === "press_on_nails" ? "press_on_nails" : "nail_polish",
                                  try_on_nail_texture: "cream",
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {NAIL_EFFECT_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Look</Label>
                            <Select
                              value={form.try_on_nail_sub_type}
                              onValueChange={(value) =>
                                setForm((current) => ({
                                  ...current,
                                  try_on_nail_sub_type: value === "design" ? "design" : "color",
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {NAIL_SUB_TYPE_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {form.try_on_nail_sub_type === "color" ? (
                            <div className="space-y-2">
                              <Label>Color</Label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={form.try_on_nail_color}
                                  onChange={(event) =>
                                    setForm((current) => ({
                                      ...current,
                                      try_on_nail_color: event.target.value,
                                    }))
                                  }
                                  className="h-9 w-12 cursor-pointer rounded border border-border bg-background"
                                  aria-label="Nail color"
                                />
                                <Input
                                  value={form.try_on_nail_color}
                                  onChange={(event) =>
                                    setForm((current) => ({
                                      ...current,
                                      try_on_nail_color: event.target.value,
                                    }))
                                  }
                                  placeholder="#c41e3a"
                                />
                              </div>
                            </div>
                          ) : null}
                          <div className="space-y-2">
                            <Label>Texture</Label>
                            <Select
                              value={form.try_on_nail_texture}
                              onValueChange={(value) =>
                                setForm((current) => ({ ...current, try_on_nail_texture: value }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(form.try_on_nail_effect_type === "press_on_nails"
                                  ? NAIL_PRESS_ON_TEXTURE_OPTIONS
                                  : NAIL_POLISH_TEXTURE_OPTIONS
                                ).map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {form.try_on_nail_effect_type === "press_on_nails" ? (
                            <>
                              <div className="space-y-2">
                                <Label>Shape</Label>
                                <Select
                                  value={form.try_on_nail_shape}
                                  onValueChange={(value) =>
                                    setForm((current) => ({ ...current, try_on_nail_shape: value }))
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {NAIL_SHAPE_OPTIONS.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Length</Label>
                                <Input
                                  type="number"
                                  min="0.8"
                                  max="2.15"
                                  step="0.05"
                                  value={form.try_on_nail_length}
                                  onChange={(event) =>
                                    setForm((current) => ({
                                      ...current,
                                      try_on_nail_length: event.target.value,
                                    }))
                                  }
                                />
                              </div>
                            </>
                          ) : null}
                        </>
                      ) : null}

                      {form.try_on_mode === "fabric" ? (
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Fabric template</Label>
                          {fabricTemplates.length ? (
                            <Select
                              value={form.try_on_fabric_template_id}
                              onValueChange={(value) =>
                                setForm((current) => ({
                                  ...current,
                                  try_on_fabric_template_id: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Choose a fabric" />
                              </SelectTrigger>
                              <SelectContent>
                                {fabricTemplates.map((template) => (
                                  <SelectItem key={template.id} value={template.id}>
                                    {template.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              value={form.try_on_fabric_template_id}
                              onChange={(event) =>
                                setForm((current) => ({
                                  ...current,
                                  try_on_fabric_template_id: event.target.value,
                                }))
                              }
                              placeholder="PerfectCorp template ID"
                            />
                          )}
                          <p className="text-xs text-ink-soft">
                            Fabric try-on applies a material template to the shopper’s photo.
                          </p>
                        </div>
                      ) : null}

                      {form.try_on_mode !== "fabric" ? (
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Reference image URL (optional)</Label>
                          <Input
                            value={form.try_on_ref_image_url}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                try_on_ref_image_url: event.target.value,
                              }))
                            }
                            placeholder="Defaults to product cover image"
                          />
                          <p className="text-xs text-ink-soft">
                            {refImageHintForMode(form.try_on_mode)}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </FormSection>
              </div>

              <aside className="space-y-4 lg:sticky lg:top-0 lg:self-start">
                <div className="overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm">
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
                    {form.barcode.trim() ? <span>Barcode {form.barcode}</span> : null}
                  </div>
                </div>
              </aside>
            </div>
          </div>

          <footer className="shrink-0 border-t border-border bg-canvas-raised px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4 sm:pb-4">
            <div className="flex w-full items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0 sm:h-9 sm:w-auto sm:px-4"
                aria-label="Cancel"
                onClick={() => void requestClose()}
              >
                <X className="h-4 w-4 sm:hidden" />
                <span className="hidden sm:inline">Cancel</span>
              </Button>
              <div className="flex items-center justify-end gap-2">
                {!editingProduct || form.status === "draft" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0 sm:h-9 sm:w-auto sm:px-4"
                    aria-label="Save as draft"
                    disabled={isSaving || uploadingImage}
                    onClick={() => void submit({ statusOverride: "draft" })}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FilePen className="h-4 w-4 sm:hidden" />
                    )}
                    <span className="hidden sm:inline">Save as draft</span>
                  </Button>
                ) : null}
                {!editingProduct ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0 sm:h-9 sm:w-auto sm:px-4"
                    aria-label="Save and add another"
                    disabled={isSaving || uploadingImage}
                    onClick={() => void submit({ addAnother: true, statusOverride: "active" })}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CopyPlus className="h-4 w-4 sm:hidden" />
                    )}
                    <span className="hidden sm:inline">Save & add another</span>
                  </Button>
                ) : null}
                <Button
                  type="submit"
                  size="icon"
                  className="shrink-0 sm:h-9 sm:w-auto sm:px-4"
                  aria-label={primaryActionLabel}
                  disabled={isSaving || uploadingImage}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : primaryActionIsPublish ? (
                    <Rocket className="h-4 w-4 sm:hidden" />
                  ) : (
                    <Save className="h-4 w-4 sm:hidden" />
                  )}
                  <span className="hidden sm:inline">{primaryActionLabel}</span>
                </Button>
              </div>
            </div>
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  );
}
