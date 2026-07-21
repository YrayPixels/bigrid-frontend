"use client";

import Link from "next/link";
import { FormEvent, Fragment, useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  FolderTree,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import type { StoreCategory } from "@/lib/api/types";
import { merchantInvalidators, useCategories, useStoreMe } from "@/hooks/use-merchant-queries";
import { confirm } from "@/components/ui/confirm-dialog";
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
import { cn } from "@/lib/utils";

type CategoryForm = {
  name: string;
  parent_id: string;
};

type CategoryTreeNode = {
  category: StoreCategory;
  children: StoreCategory[];
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

function buildCategoryTree(categories: StoreCategory[]): CategoryTreeNode[] {
  const childrenByParent = new Map<string, StoreCategory[]>();
  const roots: StoreCategory[] = [];

  for (const category of categories) {
    if (category.parent_id) {
      const siblings = childrenByParent.get(category.parent_id) ?? [];
      siblings.push(category);
      childrenByParent.set(category.parent_id, siblings);
    } else {
      roots.push(category);
    }
  }

  const sortByOrder = (a: StoreCategory, b: StoreCategory) =>
    (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name);

  const rootIds = new Set(roots.map((category) => category.id));
  for (const category of categories) {
    if (
      category.parent_id &&
      !rootIds.has(category.parent_id) &&
      !roots.some((root) => root.id === category.id)
    ) {
      const parentListed = categories.some((item) => item.id === category.parent_id);
      if (!parentListed) roots.push(category);
    }
  }

  return roots.sort(sortByOrder).map((category) => ({
    category,
    children: (childrenByParent.get(category.id) ?? []).sort(sortByOrder),
  }));
}

function directProductCount(category: StoreCategory) {
  return category.products_count ?? 0;
}

function totalProductCount(category: StoreCategory, children: StoreCategory[]) {
  return (
    directProductCount(category) +
    children.reduce((sum, child) => sum + directProductCount(child), 0)
  );
}

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<StoreCategory | undefined>();
  const [form, setForm] = useState<CategoryForm>(blankForm);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const storeQuery = useStoreMe();
  const categoriesQuery = useCategories(storeQuery.data?.id);

  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);

  const parentOptions = useMemo(() => {
    const disallowed = new Set<string>();
    if (editingCategory) {
      disallowed.add(editingCategory.id);
      for (const category of categories) {
        if (category.parent_id === editingCategory.id) disallowed.add(category.id);
      }
    }

    return categories.filter(
      (category) => !category.parent_id && !disallowed.has(category.id),
    );
  }, [categories, editingCategory]);

  useEffect(() => {
    if (dialogOpen && editingCategory) {
      setForm(formFromCategory(editingCategory));
    }
  }, [dialogOpen, editingCategory]);

  useEffect(() => {
    setExpandedIds((current) => {
      if (current.size) return current;
      // Expand parents that already have children on first load.
      return new Set(
        categoryTree.filter((node) => node.children.length > 0).map((node) => node.category.id),
      );
    });
  }, [categoryTree]);

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
      merchantInvalidators.categories(queryClient);
      merchantInvalidators.products(queryClient);
      toast.success(editingCategory ? "Category updated." : "Category created.");
      setDialogOpen(false);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not save category"),
  });

  const deleteCategory = useMutation({
    mutationFn: (categoryId: string) => api.deleteCategory(categoryId),
    onSuccess: () => {
      merchantInvalidators.categories(queryClient);
      merchantInvalidators.products(queryClient);
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

  function openCreateSubcategory(parent: StoreCategory) {
    setEditingCategory(undefined);
    setForm({ name: "", parent_id: parent.id });
    setExpandedIds((current) => new Set(current).add(parent.id));
    setDialogOpen(true);
  }

  function openEditDialog(category: StoreCategory) {
    setEditingCategory(category);
    setDialogOpen(true);
  }

  function toggleExpanded(categoryId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }

  async function handleDelete(category: StoreCategory, childCount = 0) {
    const productCount = directProductCount(category);
    if (childCount > 0) {
      toast.error("Move or delete subcategories before deleting this category.");
      return;
    }
    if (productCount > 0) {
      toast.error("Reassign or remove products in this category before deleting it.");
      return;
    }

    const confirmed = await confirm(`Delete ${category.name}?`, {
      description: "This action cannot be undone.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!confirmed) return;

    await deleteCategory.mutateAsync(category.id);
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

  const rootCount = categoryTree.length;
  const subcategoryCount = categories.filter((category) => category.parent_id).length;

  return (
    <div className="w-full px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <header>
          <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">Catalog</span>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Categories</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">
            Organize products into reusable categories. Nest subcategories under parents for
            storefront filters and merchandising.
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
              ? `${rootCount} parent categor${rootCount === 1 ? "y" : "ies"}${
                  subcategoryCount
                    ? ` · ${subcategoryCount} subcategor${subcategoryCount === 1 ? "y" : "ies"}`
                    : ""
                }`
              : "No categories yet. Create one or assign categories while importing products."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {categoryTree.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-ink-soft">
                    <th className="px-3 py-3 font-medium">Name</th>
                    <th className="px-3 py-3 font-medium">Slug</th>
                    <th className="px-3 py-3 font-medium">Products</th>
                    <th className="px-3 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryTree.map(({ category, children }) => {
                    const expanded = expandedIds.has(category.id);
                    const hasChildren = children.length > 0;
                    const totalCount = totalProductCount(category, children);
                    const directCount = directProductCount(category);

                    return (
                      <Fragment key={category.id}>
                        <tr className="border-b border-border/70">
                          <td className="px-3 py-4">
                            <div className="flex items-center gap-1.5">
                              {hasChildren ? (
                                <button
                                  type="button"
                                  onClick={() => toggleExpanded(category.id)}
                                  className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-ink-soft hover:bg-secondary hover:text-ink"
                                  aria-label={
                                    expanded
                                      ? `Collapse ${category.name}`
                                      : `Expand ${category.name}`
                                  }
                                  aria-expanded={expanded}
                                >
                                  <ChevronRight
                                    className={cn(
                                      "h-4 w-4 transition",
                                      expanded && "rotate-90",
                                    )}
                                  />
                                </button>
                              ) : (
                                <span className="h-7 w-7 shrink-0" />
                              )}
                              <div className="min-w-0">
                                <div className="font-medium">{category.name}</div>
                                {hasChildren ? (
                                  <p className="mt-0.5 text-xs text-ink-soft">
                                    {children.length} subcategor
                                    {children.length === 1 ? "y" : "ies"}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4 text-ink-soft">{category.slug}</td>
                          <td className="px-3 py-4">
                            {totalCount > 0 ? (
                              <Link
                                href={`/admin/products?category_id=${encodeURIComponent(category.id)}`}
                                className="group inline-flex flex-col"
                              >
                                <span className="font-medium text-primary underline-offset-2 group-hover:underline">
                                  {totalCount}
                                </span>
                                {hasChildren && totalCount !== directCount ? (
                                  <span className="mt-0.5 text-[11px] text-ink-soft">
                                    {directCount} direct · {totalCount - directCount} in
                                    subcategories
                                  </span>
                                ) : null}
                              </Link>
                            ) : (
                              <>
                                <div className="font-medium">{totalCount}</div>
                                {hasChildren && totalCount !== directCount ? (
                                  <p className="mt-0.5 text-[11px] text-ink-soft">
                                    {directCount} direct · {totalCount - directCount} in
                                    subcategories
                                  </p>
                                ) : null}
                              </>
                            )}
                          </td>
                          <td className="px-3 py-4">
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => openCreateSubcategory(category)}
                              >
                                <Plus className="mr-1 h-3.5 w-3.5" />
                                Subcategory
                              </Button>
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
                                onClick={() => void handleDelete(category, children.length)}
                              >
                                <Trash2 className="mr-1 h-3.5 w-3.5" />
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>

                        {hasChildren && expanded
                          ? children.map((child) => (
                              <tr
                                key={child.id}
                                className="border-b border-border/50 bg-secondary/20"
                              >
                                <td className="px-3 py-3">
                                  <div className="ml-8 flex items-center gap-2 border-l border-border pl-3">
                                    <span className="font-medium">{child.name}</span>
                                    <Badge variant="secondary" className="text-[10px]">
                                      Subcategory
                                    </Badge>
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-ink-soft">{child.slug}</td>
                                <td className="px-3 py-3">
                                  {directProductCount(child) > 0 ? (
                                    <Link
                                      href={`/admin/products?category_id=${encodeURIComponent(child.id)}`}
                                      className="font-medium text-primary underline-offset-2 hover:underline"
                                    >
                                      {directProductCount(child)}
                                    </Link>
                                  ) : (
                                    directProductCount(child)
                                  )}
                                </td>
                                <td className="px-3 py-3">
                                  <div className="flex gap-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => openEditDialog(child)}
                                    >
                                      <Pencil className="mr-1 h-3.5 w-3.5" />
                                      Edit
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      disabled={deleteCategory.isPending}
                                      onClick={() => void handleDelete(child)}
                                    >
                                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                                      Delete
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          : null}
                      </Fragment>
                    );
                  })}
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
            <DialogTitle>
              {editingCategory
                ? "Edit category"
                : form.parent_id
                  ? "Add subcategory"
                  : "Add category"}
            </DialogTitle>
            <DialogDescription>
              {form.parent_id && !editingCategory
                ? `This subcategory will nest under ${
                    categories.find((category) => category.id === form.parent_id)?.name ??
                    "the selected parent"
                  }.`
                : "Nest under a parent to create a subcategory for storefront filters."}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
            <div className="space-y-2">
              <Label htmlFor="category-name">Name</Label>
              <Input
                id="category-name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
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
                <option value="">No parent (top-level)</option>
                {parentOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-ink-soft">
                Only top-level categories can be parents. Subcategories stay one level deep.
              </p>
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
