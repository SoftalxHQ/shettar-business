"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RestaurantLayoutWrapper } from "@/components/restaurant-layout-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { canManageRestaurantMenu, canViewRestaurant, isRestaurantModuleEnabled } from "@/lib/restaurant-access";
import {
  createMenuCategory,
  createMenuItem,
  deleteMenuCategory,
  deleteMenuItem,
  fetchMenuCategories,
  resolveBusinessId,
  type MenuCategory,
  type MenuItem,
  updateMenuCategory,
  updateMenuItem,
  toggleMenuItemAvailability,
} from "@/lib/restaurant-api";
import {
  resolveAvailability,
  subscribeMenuAvailabilityChange,
  type MenuAvailabilityUpdate,
} from "@/lib/restaurant-menu-sync";
import { subscribeRestaurantChannel } from "@/lib/restaurant-cable";
import { CachedMenuImage } from "@/components/cached-menu-image";
import { prefetchMenuImages } from "@/lib/menu-image-cache";
import { toast } from "sonner";
import { ImageIcon, Loader2, Pencil, Plus, Search, Trash2, UtensilsCrossed, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import Image from "next/image";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

type PendingDelete =
  | { kind: "category"; id: number; name: string }
  | { kind: "item"; id: number; name: string };

export default function RestaurantMenuPage() {
  const router = useRouter();
  const { user, businessId } = useAuth();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [itemDialog, setItemDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [itemForm, setItemForm] = useState({
    restaurant_menu_category_id: 0,
    name: "",
    description: "",
    price: "",
    available: true,
  });
  const [itemImageFile, setItemImageFile] = useState<File | null>(null);
  const [itemImagePreview, setItemImagePreview] = useState<string | null>(null);
  const [removeItemImage, setRemoveItemImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [itemSearch, setItemSearch] = useState("");

  const bid = resolveBusinessId(businessId);
  const canView = canViewRestaurant(user);
  const canEdit = canManageRestaurantMenu(user);

  useEffect(() => {
    if (!user) return;
    if (!isRestaurantModuleEnabled(user)) {
      toast.error("Enable restaurant operations in Settings first");
      router.push("/dashboard/business/settings");
      return;
    }
    if (!canView) {
      router.push("/dashboard/business");
    }
  }, [user, router, canView]);

  const load = useCallback(async () => {
    if (!bid) return;
    setLoading(true);
    try {
      const data = await fetchMenuCategories(bid);
      setCategories(data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load menu");
    } finally {
      setLoading(false);
    }
  }, [bid]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (categories.length === 0) {
      setSelectedCategoryId(null);
      return;
    }
    if (!selectedCategoryId || !categories.some((c) => c.id === selectedCategoryId)) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  const applyMenuAvailabilityUpdate = useCallback(
    (update: MenuAvailabilityUpdate) => {
      const item = update.item;
      const itemId = item?.id;
      const available = resolveAvailability(update);
      const name = update.item_name || item?.name || "Item";

      const currentUserId = user?.id ? Number(user.id) : null;
      const actorId = update.actor_user_id;
      const isRemote =
        available !== undefined &&
        actorId != null &&
        currentUserId != null &&
        actorId !== currentUserId;
      if (isRemote) {
        toast.info(`${name} ${available ? "activated" : "deactivated"}`);
      }

      if (itemId == null || available === undefined) {
        load();
        return;
      }

      setCategories((prev) =>
        prev.map((cat) => ({
          ...cat,
          items: (cat.items || []).map((i) =>
            i.id === itemId ? { ...i, ...item, available } : i
          ),
        }))
      );
    },
    [load, user?.id]
  );

  useEffect(() => {
    return subscribeMenuAvailabilityChange(applyMenuAvailabilityUpdate);
  }, [applyMenuAvailabilityUpdate]);

  useEffect(() => {
    if (!bid) return;
    return subscribeRestaurantChannel(bid, () => {});
  }, [bid]);

  useEffect(() => {
    const urls = categories.flatMap((c) => (c.items || []).map((i) => i.image_url));
    prefetchMenuImages(urls);
  }, [categories]);

  const openNewCategory = () => {
    setEditingCategory(null);
    setCategoryName("");
    setCategoryDialog(true);
  };

  const openEditCategory = (cat: MenuCategory) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setCategoryDialog(true);
  };

  const saveCategory = async () => {
    if (!bid || !categoryName.trim()) return;
    setSaving(true);
    try {
      if (editingCategory) {
        await updateMenuCategory(bid, editingCategory.id, { name: categoryName.trim() });
        toast.success("Category updated");
      } else {
        await createMenuCategory(bid, { name: categoryName.trim(), position: categories.length });
        toast.success("Category created");
      }
      setCategoryDialog(false);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const resetItemImageState = (previewUrl?: string | null) => {
    if (itemImagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(itemImagePreview);
    }
    setItemImageFile(null);
    setItemImagePreview(previewUrl ?? null);
    setRemoveItemImage(false);
  };

  const openNewItem = (categoryId: number) => {
    setEditingItem(null);
    setItemForm({
      restaurant_menu_category_id: categoryId,
      name: "",
      description: "",
      price: "",
      available: true,
    });
    resetItemImageState(null);
    setItemDialog(true);
  };

  const openEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setItemForm({
      restaurant_menu_category_id: item.restaurant_menu_category_id,
      name: item.name,
      description: item.description || "",
      price: String(item.price),
      available: item.available,
    });
    resetItemImageState(item.image_url || null);
    setItemDialog(true);
  };

  const onItemImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (itemImagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(itemImagePreview);
    }
    setItemImageFile(file);
    setItemImagePreview(URL.createObjectURL(file));
    setRemoveItemImage(false);
  };

  const saveItem = async () => {
    if (!bid || !itemForm.name.trim()) {
      toast.error("Name is required");
      return;
    }
    const price = parseFloat(itemForm.price);
    if (Number.isNaN(price) || price < 0) {
      toast.error("Enter a valid price");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        restaurant_menu_category_id: itemForm.restaurant_menu_category_id,
        name: itemForm.name.trim(),
        description: itemForm.description.trim(),
        price,
        available: itemForm.available,
      };
      const imageOpts = {
        image: itemImageFile,
        removeImage: removeItemImage && !itemImageFile,
      };
      if (editingItem) {
        await updateMenuItem(
          bid,
          editingItem.id,
          payload,
          imageOpts.image || imageOpts.removeImage ? imageOpts : undefined
        );
        toast.success("Item updated");
      } else {
        await createMenuItem(bid, payload, itemImageFile ? { image: itemImageFile } : undefined);
        toast.success("Item created");
      }
      setItemDialog(false);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleItemAvailable = async (item: MenuItem) => {
    if (!bid || !canEdit) return;
    try {
      const updated = await toggleMenuItemAvailability(bid, item.id);
      setCategories((prev) =>
        prev.map((cat) => ({
          ...cat,
          items: (cat.items || []).map((i) =>
            i.id === updated.id ? { ...i, ...updated } : i
          ),
        }))
      );
      toast.success(`${updated.name} ${updated.available ? "activated" : "deactivated"}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const executeDelete = async () => {
    if (!bid || !pendingDelete) return;
    setDeleteLoading(true);
    try {
      if (pendingDelete.kind === "category") {
        await deleteMenuCategory(bid, pendingDelete.id);
        toast.success("Category deleted");
      } else {
        await deleteMenuItem(bid, pendingDelete.id);
        toast.success("Item deleted");
      }
      setPendingDelete(null);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleteLoading(false);
    }
  };

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) || null;
  const selectedItems = (selectedCategory?.items || []).filter((item) => {
    const q = itemSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      (item.description || "").toLowerCase().includes(q)
    );
  });

  return (
    <RestaurantLayoutWrapper activeTab="menu">
      <div className="h-full min-h-0 flex flex-col gap-3 overflow-hidden">
        <div className="shrink-0 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-indigo-600" />
              Menu
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Categories and items for staff order taking
            </p>
          </div>
          {canEdit && (
            <Button onClick={openNewCategory} size="sm" className="h-9 gap-2 shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4" />
              Add category
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center rounded-xl border border-slate-200 bg-white">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
          </div>
        ) : categories.length === 0 ? (
          <div className="flex-1 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-sm text-slate-500">
            No menu categories yet. Add a category to get started.
          </div>
        ) : (
          <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[14rem_minmax(0,1fr)] gap-3 overflow-hidden">
            <div className="min-h-0 flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="shrink-0 px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Categories</p>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto p-1.5 space-y-0.5">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={cn(
                      "w-full text-left rounded-lg px-2.5 py-2 transition-colors",
                      selectedCategoryId === cat.id
                        ? "bg-indigo-50 text-indigo-700 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.12)]"
                        : "text-slate-700 hover:bg-slate-50",
                    )}
                  >
                    <p className="text-sm font-medium truncate">{cat.name}</p>
                    <p className="text-[11px] text-slate-500 tabular-nums">
                      {(cat.items || []).length} items
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="shrink-0 px-3.5 py-2.5 border-b border-slate-100 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {selectedCategory?.name || "Items"}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {(selectedCategory?.items || []).length} items
                  </p>
                </div>
                {canEdit && selectedCategory && (
                  <div className="flex gap-1.5 shrink-0">
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => openEditCategory(selectedCategory)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0"
                      onClick={() =>
                        setPendingDelete({ kind: "category", id: selectedCategory.id, name: selectedCategory.name })
                      }
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                    <Button size="sm" className="h-8 gap-1" onClick={() => openNewItem(selectedCategory.id)}>
                      <Plus className="w-3.5 h-3.5" />
                      Item
                    </Button>
                  </div>
                )}
              </div>
              <div className="shrink-0 p-2.5 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <Input
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    placeholder="Search items…"
                    className="h-8 pl-8 text-sm"
                  />
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-1.5">
                {!selectedCategory || selectedItems.length === 0 ? (
                  <p className="text-xs text-slate-500 px-1 py-6 text-center">
                    {selectedCategory ? "No items match your search" : "Select a category"}
                  </p>
                ) : (
                  selectedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 px-2.5 py-2 rounded-lg border border-slate-100 bg-slate-50/60"
                    >
                      {item.image_url ? (
                        <CachedMenuImage
                          src={item.image_url}
                          alt={item.name}
                          className="w-11 h-11 rounded-md object-cover shrink-0 border"
                          placeholderClassName="w-11 h-11 rounded-md shrink-0 border"
                          showPlaceholderIcon
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-md border bg-white flex items-center justify-center shrink-0">
                          <ImageIcon className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{item.name}</p>
                        {item.description && (
                          <p className="text-[11px] text-slate-500 truncate">{item.description}</p>
                        )}
                        <p className="text-xs font-semibold text-indigo-700 mt-0.5">
                          ₦{Number(item.price).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant={item.available ? "default" : "secondary"} className="text-[10px]">
                          {item.available ? "Available" : "Unavailable"}
                        </Badge>
                        {canEdit && (
                          <>
                            <Switch
                              checked={item.available}
                              onCheckedChange={() => toggleItemAvailable(item)}
                            />
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEditItem(item)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() =>
                                setPendingDelete({ kind: "item", id: item.id, name: item.name })
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={categoryDialog} onOpenChange={setCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit category" : "New category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveCategory} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={itemDialog} onOpenChange={setItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit item" : "New menu item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                value={itemForm.description}
                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                placeholder="Internal note — not shown to guests"
              />
            </div>
            <div className="space-y-2">
              <Label>Price (₦) *</Label>
              <Input
                type="number"
                min="0"
                value={itemForm.price}
                onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={itemForm.available}
                onCheckedChange={(v) => setItemForm({ ...itemForm, available: v })}
              />
              <Label>Available for ordering</Label>
            </div>
            <div className="space-y-2">
              <Label>Photo</Label>
              {itemImagePreview ? (
                <div className="relative w-full max-w-[200px] aspect-square rounded-lg overflow-hidden border">
                  <Image
                    src={itemImagePreview}
                    alt="Menu item preview"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => {
                      resetItemImageState(null);
                      if (editingItem?.image_url) setRemoveItemImage(true);
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <ImageIcon className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground mb-2">JPG or PNG recommended</p>
                </div>
              )}
              <Input type="file" accept="image/*" onChange={onItemImageChange} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveItem} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && !deleteLoading && setPendingDelete(null)}
        title={
          pendingDelete?.kind === "category" ? "Delete category" : "Delete menu item"
        }
        description={
          pendingDelete?.kind === "category"
            ? `Delete "${pendingDelete.name}" and all items in this category? This cannot be undone.`
            : `Delete "${pendingDelete?.name}"? This cannot be undone.`
        }
        confirmText="Delete"
        onConfirm={executeDelete}
        loading={deleteLoading}
      />
    </RestaurantLayoutWrapper>
  );
}
