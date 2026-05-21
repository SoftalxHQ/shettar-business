import { getAuthToken, getStoredBusinessId } from "@/lib/storage";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

function basePath(businessId: string) {
  return `${API_URL}/api/v1/user_businesses/${businessId}`;
}

function headers(businessId: string, json = true) {
  const token = getAuthToken();
  const h: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "X-Business-Id": businessId,
  };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

type MenuItemPayload = {
  restaurant_menu_category_id: number;
  name: string;
  description?: string;
  price: number;
  available?: boolean;
  position?: number;
};

function buildMenuItemFormData(
  payload: MenuItemPayload | Partial<MenuItemPayload>,
  options?: { image?: File | null; removeImage?: boolean }
) {
  const formData = new FormData();
  const item = payload as Record<string, unknown>;
  if (item.restaurant_menu_category_id != null) {
    formData.append("item[restaurant_menu_category_id]", String(item.restaurant_menu_category_id));
  }
  if (item.name != null) formData.append("item[name]", String(item.name));
  if (item.description != null) formData.append("item[description]", String(item.description));
  if (item.price != null) formData.append("item[price]", String(item.price));
  if (item.available != null) formData.append("item[available]", String(item.available));
  if (item.position != null) formData.append("item[position]", String(item.position));
  if (options?.image) {
    formData.append("item[image]", options.image);
  } else if (options?.removeImage) {
    formData.append("item[image]", "");
  }
  return formData;
}

export type MenuCategory = {
  id: number;
  name: string;
  position: number;
  active: boolean;
  items?: MenuItem[];
};

export type MenuItem = {
  id: number;
  restaurant_menu_category_id: number;
  category_name?: string;
  name: string;
  description?: string | null;
  price: number;
  available: boolean;
  position: number;
  image_url?: string | null;
};

export type RestaurantOrderItem = {
  id: number;
  menu_item_id?: number | null;
  name: string;
  unit_price: number;
  quantity: number;
  refunded_quantity?: number;
  refundable_quantity?: number;
  notes?: string | null;
  line_total: number;
};

export type RoomServiceTarget = {
  reservation_id: number;
  booking_id: string;
  room_id: number;
  room_number: string;
  guest_name: string;
};

export type RestaurantOrder = {
  id: number;
  order_number: string;
  status: string;
  payment_status?: string;
  payment_method?: string | null;
  paid_at?: string | null;
  amount_paid?: number;
  refunded_amount?: number;
  amount_due?: number;
  source: string;
  table_label?: string | null;
  room_label?: string | null;
  room_id?: number | null;
  room_number?: string | null;
  booking_id?: string | null;
  guest_name?: string | null;
  notes?: string | null;
  subtotal: number;
  reservation_id?: number | null;
  placed_by_name?: string | null;
  items: RestaurantOrderItem[];
  created_at: string;
  updated_at: string;
};

export async function fetchMenuCategories(businessId: string) {
  const res = await fetch(`${basePath(businessId)}/restaurant_menu_categories`, {
    headers: headers(businessId),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load menu");
  return data.categories as MenuCategory[];
}

export async function createMenuCategory(businessId: string, payload: { name: string; position?: number; active?: boolean }) {
  const res = await fetch(`${basePath(businessId)}/restaurant_menu_categories`, {
    method: "POST",
    headers: headers(businessId),
    body: JSON.stringify({ category: payload }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.errors?.join?.(", ") || data.error || "Failed to create category");
  return data.category as MenuCategory;
}

export async function updateMenuCategory(businessId: string, id: number, payload: Partial<MenuCategory>) {
  const res = await fetch(`${basePath(businessId)}/restaurant_menu_categories/${id}`, {
    method: "PATCH",
    headers: headers(businessId),
    body: JSON.stringify({ category: payload }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.errors?.join?.(", ") || data.error || "Failed to update category");
  return data.category as MenuCategory;
}

export async function deleteMenuCategory(businessId: string, id: number) {
  const res = await fetch(`${basePath(businessId)}/restaurant_menu_categories/${id}`, {
    method: "DELETE",
    headers: headers(businessId),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to delete category");
  }
}

export async function fetchMenuItems(businessId: string) {
  const res = await fetch(`${basePath(businessId)}/restaurant_menu_items`, {
    headers: headers(businessId),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load menu items");
  return data.items as MenuItem[];
}

export async function createMenuItem(
  businessId: string,
  payload: MenuItemPayload,
  options?: { image?: File | null }
) {
  const useMultipart = !!options?.image;
  const res = await fetch(`${basePath(businessId)}/restaurant_menu_items`, {
    method: "POST",
    headers: headers(businessId, !useMultipart),
    body: useMultipart
      ? buildMenuItemFormData(payload, { image: options.image })
      : JSON.stringify({ item: payload }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.errors?.join?.(", ") || data.error || "Failed to create item");
  return data.item as MenuItem;
}

export async function updateMenuItem(
  businessId: string,
  id: number,
  payload: Partial<MenuItem>,
  options?: { image?: File | null; removeImage?: boolean }
) {
  const useMultipart = !!(options?.image || options?.removeImage);
  const res = await fetch(`${basePath(businessId)}/restaurant_menu_items/${id}`, {
    method: "PATCH",
    headers: headers(businessId, !useMultipart),
    body: useMultipart
      ? buildMenuItemFormData(payload, {
          image: options?.image,
          removeImage: options?.removeImage,
        })
      : JSON.stringify({ item: payload }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.errors?.join?.(", ") || data.error || "Failed to update item");
  return data.item as MenuItem;
}

export async function deleteMenuItem(businessId: string, id: number) {
  const res = await fetch(`${basePath(businessId)}/restaurant_menu_items/${id}`, {
    method: "DELETE",
    headers: headers(businessId),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to delete item");
  }
}

export async function fetchOrders(
  businessId: string,
  params?: { today?: boolean; status?: string; payment_status?: string; q?: string }
) {
  const qs = new URLSearchParams();
  if (params?.today) qs.set("today", "1");
  if (params?.status) qs.set("status", params.status);
  if (params?.payment_status) qs.set("payment_status", params.payment_status);
  if (params?.q) qs.set("q", params.q);
  const query = qs.toString() ? `?${qs.toString()}` : "";
  const res = await fetch(`${basePath(businessId)}/restaurant_orders${query}`, {
    headers: headers(businessId),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load orders");
  return data.orders as RestaurantOrder[];
}

export async function fetchRoomServiceTargets(businessId: string) {
  const res = await fetch(
    `${basePath(businessId)}/restaurant_orders/room_service_targets`,
    { headers: headers(businessId) }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load rooms");
  return data.targets as RoomServiceTarget[];
}

export async function fetchKitchenQueue(businessId: string) {
  const res = await fetch(`${basePath(businessId)}/restaurant_orders/kitchen_queue`, {
    headers: headers(businessId),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load kitchen queue");
  return data.orders as RestaurantOrder[];
}

export async function createOrder(
  businessId: string,
  payload: {
    table_label?: string;
    room_label?: string;
    notes?: string;
    reservation_id?: number;
    room_id?: number;
    payment_method?: string;
    paystack_reference?: string;
    items: { menu_item_id: number; quantity: number; notes?: string }[];
  }
) {
  const res = await fetch(`${basePath(businessId)}/restaurant_orders`, {
    method: "POST",
    headers: headers(businessId),
    body: JSON.stringify({ order: payload }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.errors?.join?.(", ") || "Failed to create order");
  return data.order as RestaurantOrder;
}

export async function transitionOrderStatus(businessId: string, orderId: number, status: string) {
  const res = await fetch(`${basePath(businessId)}/restaurant_orders/${orderId}/transition_status`, {
    method: "PATCH",
    headers: headers(businessId),
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.errors?.join?.(", ") || data.error || "Failed to update status");
  return data.order as RestaurantOrder;
}

export async function markOrderPaid(
  businessId: string,
  orderId: number,
  payment_method: string,
  paystack_reference?: string
) {
  const res = await fetch(`${basePath(businessId)}/restaurant_orders/${orderId}/mark_paid`, {
    method: "POST",
    headers: headers(businessId),
    body: JSON.stringify({ payment_method, paystack_reference }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to mark order paid");
  return data.order as RestaurantOrder;
}

export async function refundOrder(
  businessId: string,
  orderId: number,
  payload: {
    full?: boolean;
    items?: { order_item_id: number; quantity: number }[];
    reason?: string;
  }
) {
  const res = await fetch(`${basePath(businessId)}/restaurant_orders/${orderId}/refund`, {
    method: "POST",
    headers: headers(businessId),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to refund order");
  return data.order as RestaurantOrder;
}

export function resolveBusinessId(fallback?: string | null) {
  return fallback || getStoredBusinessId() || "";
}
