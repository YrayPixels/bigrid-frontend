"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderTree, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import type { StoreCategory } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CategoryForm = {
  name: string;
  parent_id: string;
};

const blankForm: CategoryForm = {
  name: "",
  parent_id: "",
};

function formFromCategory(category?: StoreCategory): CategoryForm {
  return {
    name: category?.name ?? "",
    parent_id: category?.parent_id ?? "",
  };
}

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<StoreCategory | undefined>();
  const [form, setForm] = useState<CategoryForm>(blankForm);

  const storeQuery = useQuery({
    queryKey: ["store", "me"],
    queryFn: () => api.getMyStore(),
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories", storeQuery.data?.id],
    queryFn: () => api.getCategories(),
    enabled: !!storeQuery.data,
  });

  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);

  const parentOptions = useMemo(
    () => categories.filter((category) => category.id !== editingCategory?.id),
    [categories, editingCategory?.id],
  );

  useEffect(() => {
    if (dialogOpen) {
      setForm(formFromCategory(editingCategory));
    }
  }, [dialogOpen, editingCategory]);

  const saveCategory = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        parent_id: form.parent_id || null,
      };

      if (editingCategory) {
        return api.updateCategory(editingCategory.id, payload);
      }

      return api.createCategory(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(editingCategory ? "Category updated." : "Category created.");
      setDialogOpen(false);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not save category"),
  });

  const deleteCategory = useMutation({
    mutationFn: (categoryId: string) => api.deleteCategory(categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category deleted.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not delete category"),
  });

  function openCreateDialog() {
    setEditingCategory(undefined);
    setForm(blankForm);
    setDialogOpen(true);
  }

  function openEditDialog(category: StoreCategory) {
    setEditingCategory(category);
    setDialogOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error("Category name is required.");
      return;
    }

    await saveCategory.mutateAsync();
  }

  if (storeQuery.isLoading || categoriesQuery.isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!storeQuery.data) return null;

  return (
    <div className="w-full px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <header>
          <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">Catalog</span>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Categories</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">
            Organize products into reusable categories. Parent categories support simple hierarchy
            for storefront filters and merchandising.
          </p>
        </header>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/products">Back to products</Link>
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add category
          </Button>
        </div>
      </div>

      <Card className="mt-8 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5 text-primary" />
            Store categories
          </CardTitle>
          <CardDescription>
            {categories.length
              ? `${categories.length} categor${categories.length === 1 ? "y" : "ies"} in your catalog`
              : "No categories yet. Create one or assign categories while importing products."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {categories.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-ink-soft">
                    <th className="px-3 py-3 font-medium">Name</th>
                    <th className="px-3 py-3 font-medium">Slug</th>
                    <th className="px-3 py-3 font-medium">Parent</th>
                    <th className="px-3 py-3 font-medium">Products</th>
                    <th className="px-3 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.id} className="border-b border-border/70">
                      <td className="px-3 py-4 font-medium">{category.name}</td>
                      <td className="px-3 py-4 text-ink-soft">{category.slug}</td>
                      <td className="px-3 py-4 text-ink-soft">
                        {category.parent_name ? (
                          <Badge variant="secondary">{category.parent_name}</Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-4">{category.products_count ?? 0}</td>
                      <td className="px-3 py-4">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(category)}
                          >
                            <Pencil className="mr-1 h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={deleteCategory.isPending}
                            onClick={() => deleteCategory.mutate(category.id)}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center">
              <p className="text-sm text-ink-soft">
                Categories help keep your product catalog consistent across admin and storefront
                filters.
              </p>
              <Button className="mt-4" onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Create your first category
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit category" : "Add category"}</DialogTitle>
            <DialogDescription>
              Categories are shared across your product catalog and storefront filters.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="category-name">Name</Label>
              <Input
                id="category-name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Serums"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-parent">Parent category</Label>
              <select
                id="category-parent"
                value={form.parent_id}
                onChange={(event) =>
                  setForm((current) => ({ ...current, parent_id: event.target.value }))
                }
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="">No parent</option>
                {parentOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveCategory.isPending}>
                {saveCategory.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {editingCategory ? "Save changes" : "Create category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
