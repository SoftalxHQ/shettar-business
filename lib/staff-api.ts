import { getAuthToken } from "@/lib/storage";
import type { Permissions, StaffMember, StaffStatus } from "@/lib/staff-types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

function basePath(businessId: string) {
  return `${API_URL}/api/v1/user_businesses/${businessId}/staff`;
}

function headers(json = true) {
  const token = getAuthToken();
  const h: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

async function parseResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      data.error ||
      data.errors?.join?.(", ") ||
      data.errors?.[0]?.message ||
      "Request failed";
    throw new Error(typeof msg === "string" ? msg : "Request failed");
  }
  return data as T;
}

export async function fetchStaff(businessId: string): Promise<StaffMember[]> {
  const res = await fetch(basePath(businessId), { headers: headers(false) });
  const data = await parseResponse<StaffMember[]>(res);
  return Array.isArray(data) ? data : [];
}

export async function switchStaffRole(
  businessId: string,
  memberId: number,
  payload: { preset_key: string; title: string; permissions: Permissions }
) {
  const res = await fetch(`${basePath(businessId)}/${memberId}/switch_role`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify(payload),
  });
  return parseResponse<{ message: string; member: StaffMember }>(res);
}

export async function suspendStaff(
  businessId: string,
  memberId: number,
  reason?: string
) {
  const res = await fetch(`${basePath(businessId)}/${memberId}/suspend`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({ reason }),
  });
  return parseResponse<{ message: string; member: StaffMember }>(res);
}

export async function deactivateStaff(
  businessId: string,
  memberId: number,
  reason?: string
) {
  const res = await fetch(`${basePath(businessId)}/${memberId}/deactivate`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({ reason }),
  });
  return parseResponse<{ message: string; member: StaffMember }>(res);
}

export async function fireStaff(
  businessId: string,
  memberId: number,
  reason?: string
) {
  const res = await fetch(`${basePath(businessId)}/${memberId}/fire`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({ reason }),
  });
  return parseResponse<{ message: string; member: StaffMember }>(res);
}

export async function reactivateStaff(
  businessId: string,
  memberId: number,
  reason?: string
) {
  const res = await fetch(`${basePath(businessId)}/${memberId}/reactivate`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({ reason }),
  });
  return parseResponse<{ message: string; member: StaffMember }>(res);
}

export async function reinstateStaff(
  businessId: string,
  memberId: number,
  reason?: string
) {
  const res = await fetch(`${basePath(businessId)}/${memberId}/reinstate`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({ reason }),
  });
  return parseResponse<{ message: string; member: StaffMember }>(res);
}

export function statusLabel(status: StaffStatus | string | undefined) {
  switch (status) {
    case "suspended":
      return "Suspended";
    case "deactivated":
      return "Deactivated";
    case "fired":
      return "Fired";
    default:
      return "Active";
  }
}
