"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GARMENT_CATEGORY_OPTIONS } from "@/lib/storefront/try-on";
import { cn } from "@/lib/utils";

type CatalogModel = {
  id: string;
  name: string;
  gender: string;
  image_url: string;
};

type ProductModelLookProps = {
  productId?: string;
  garmentImageUrl: string | null;
  canAddImage: boolean;
  uploadImage: (file: File) => Promise<string>;
  onAddImage: (url: string) => void;
};

export function ProductModelLook({
  productId,
  garmentImageUrl,
  canAddImage,
  uploadImage,
  onAddImage,
}: ProductModelLookProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [models, setModels] = useState<CatalogModel[]>([]);
  const [customModel, setCustomModel] = useState<CatalogModel | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [garmentCategory, setGarmentCategory] = useState("auto");
  const [busy, setBusy] = useState(false);
  const [uploadingModel, setUploadingModel] = useState(false);

  const allModels = customModel ? [customModel, ...models] : models;
  const selected = allModels.find((model) => model.id === selectedId) ?? null;

  useEffect(() => {
    let cancelled = false;
    void api
      .listTryOnModels()
      .then((next) => {
        if (cancelled) return;
        setModels(next);
        setSelectedId((current) => current ?? next[0]?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) setModels([]);
      });
    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function handleUploadModel(file: File | null) {
    if (!file) return;
    setUploadingModel(true);
    try {
      const url = await uploadImage(file);
      const model: CatalogModel = {
        id: "custom",
        name: "Your model",
        gender: "custom",
        image_url: url,
      };
      setCustomModel(model);
      setSelectedId("custom");
      toast.success("Model photo added.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload model photo.");
    } finally {
      setUploadingModel(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function generateLook() {
    if (!garmentImageUrl) {
      toast.error("Add a product photo first — that is the garment the model will wear.");
      return;
    }
    if (!selected) {
      toast.error("Choose a model, or upload a model photo.");
      return;
    }
    if (!canAddImage) {
      toast.error("Remove an image first — the gallery is full.");
      return;
    }

    setBusy(true);
    if (pollRef.current) clearInterval(pollRef.current);

    try {
      const { session: created } = await api.createModelLook({
        garment_image_url: garmentImageUrl,
        model_id: selected.id === "custom" ? undefined : selected.id,
        model_image_url: selected.image_url,
        garment_category: garmentCategory,
        product_id: productId,
      });

      if (created.status === "success" && created.result_url) {
        onAddImage(created.result_url);
        toast.success("Model look added to product images.");
        setBusy(false);
        return;
      }
      if (created.status === "error") {
        toast.error(created.error_message ?? "Could not create this look.");
        setBusy(false);
        return;
      }

      pollRef.current = setInterval(async () => {
        try {
          const { session: next } = await api.getModelLook(created.id);
          if (next.status === "success" && next.result_url) {
            if (pollRef.current) clearInterval(pollRef.current);
            onAddImage(next.result_url);
            toast.success("Model look added to product images.");
            setBusy(false);
          } else if (next.status === "error") {
            if (pollRef.current) clearInterval(pollRef.current);
            toast.error(next.error_message ?? "Could not create this look.");
            setBusy(false);
          }
        } catch (err) {
          if (pollRef.current) clearInterval(pollRef.current);
          toast.error(err instanceof Error ? err.message : "Could not create this look.");
          setBusy(false);
        }
      }, 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create this look.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">
        Use your product photo as the garment, pick a model, and add an on-model shot to the
        gallery. Standing full-body model photos work best.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {allModels.map((model) => (
          <button
            key={model.id}
            type="button"
            onClick={() => setSelectedId(model.id)}
            className={cn(
              "overflow-hidden rounded-lg border text-left transition",
              selectedId === model.id
                ? "border-primary ring-2 ring-primary/30"
                : "border-border hover:border-primary/40",
            )}
          >
            <div className="aspect-[3/4] bg-secondary/40">
              <img src={model.image_url} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="px-2 py-1.5">
              <p className="truncate text-xs font-semibold">{model.name}</p>
              <p className="text-[11px] capitalize text-ink-soft">{model.gender}</p>
            </div>
          </button>
        ))}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingModel}
          className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/20 px-3 text-center hover:border-primary/40 disabled:opacity-60 sm:aspect-auto sm:min-h-[10rem]"
        >
          {uploadingModel ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <ImagePlus className="h-5 w-5 text-ink-soft" />
          )}
          <span className="text-xs font-medium">
            {uploadingModel ? "Uploading…" : "Upload model photo"}
          </span>
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        className="sr-only"
        onChange={(event) => void handleUploadModel(event.target.files?.[0] ?? null)}
      />

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="space-y-2">
          <Label>Garment type</Label>
          <Select value={garmentCategory} onValueChange={setGarmentCategory}>
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
        <Button
          type="button"
          onClick={() => void generateLook()}
          disabled={busy || uploadingModel || !garmentImageUrl || !selected || !canAddImage}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {busy ? "Creating look…" : "Dress this model"}
        </Button>
      </div>
    </div>
  );
}
