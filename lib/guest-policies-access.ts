import type { User } from "@/lib/mock-auth";

export type GuestPoliciesPermissions = {
  view?: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
};

function perms(user: User | null): GuestPoliciesPermissions | undefined {
  return user?.permissions?.guest_policies as GuestPoliciesPermissions | undefined;
}

export function isAdminOrOwner(user: User | null): boolean {
  return user?.role === "admin";
}

export function canViewGuestPolicies(user: User | null): boolean {
  if (!user) return false;
  if (isAdminOrOwner(user)) return true;
  const p = perms(user);
  return !!(p?.view || p?.create || p?.edit || p?.delete);
}

export function canCreateGuestPolicies(user: User | null): boolean {
  if (!user) return false;
  if (isAdminOrOwner(user)) return true;
  return !!perms(user)?.create;
}

export function canEditGuestPolicies(user: User | null): boolean {
  if (!user) return false;
  if (isAdminOrOwner(user)) return true;
  return !!perms(user)?.edit;
}

export function canDeleteGuestPolicies(user: User | null): boolean {
  if (!user) return false;
  if (isAdminOrOwner(user)) return true;
  return !!perms(user)?.delete;
}

export function canWriteGuestPolicies(user: User | null): boolean {
  return (
    canCreateGuestPolicies(user) ||
    canEditGuestPolicies(user) ||
    canDeleteGuestPolicies(user)
  );
}

export function canAccessBusinessSettings(user: User | null): boolean {
  if (!user) return false;
  if (isAdminOrOwner(user)) return true;
  if (user.permissions?.settings?.view) return true;
  if (
    user.permissions?.settings?.edit_details ||
    user.permissions?.settings?.edit_branding ||
    user.permissions?.settings?.edit_amenities
  ) {
    return true;
  }
  return canViewGuestPolicies(user);
}

export function canEditBusinessDetails(user: User | null): boolean {
  if (!user) return false;
  if (isAdminOrOwner(user)) return true;
  return !!user.permissions?.settings?.edit_details;
}

export function canEditBranding(user: User | null): boolean {
  if (!user) return false;
  if (isAdminOrOwner(user)) return true;
  return !!user.permissions?.settings?.edit_branding;
}

export function canEditAmenities(user: User | null): boolean {
  if (!user) return false;
  if (isAdminOrOwner(user)) return true;
  return !!user.permissions?.settings?.edit_amenities;
}
