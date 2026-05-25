// Staff and Permissions Types

export type StaffStatus = "active" | "suspended" | "deactivated" | "fired"

export interface StaffMember {
  id: number
  user_id: number
  business_id: number
  title: string
  role?: string
  permissions: Permissions
  is_owner: boolean
  status?: StaffStatus
  status_reason?: string | null
  status_changed_at?: string | null
  created_at: string
  updated_at: string

  // User info (from backend join)
  user?: {
    id: number
    email: string
    first_name: string
    last_name: string
    name: string
  }
}

export interface Permissions {
  dashboard?: DashboardPermissions
  rooms?: RoomsPermissions
  bookings?: BookingsPermissions
  staff?: StaffPermissions
  finance?: FinancePermissions
  settings?: SettingsPermissions
  promos?: PromosPermissions
  restaurant?: RestaurantPermissions
  guest_policies?: GuestPoliciesPermissions
}

export interface GuestPoliciesPermissions {
  view?: boolean
  create?: boolean
  edit?: boolean
  delete?: boolean
}

export interface DashboardPermissions {
  view_analytics?: boolean
  view_revenue?: boolean
}

export interface RoomsPermissions {
  view?: boolean
  create?: boolean
  edit?: boolean
  delete?: boolean
}

export interface BookingsPermissions {
  view?: boolean
  create?: boolean
  edit?: boolean
  cancel?: boolean
  view_payments?: boolean
  checkin_checkout?: boolean
}

export interface StaffPermissions {
  view?: boolean
  add?: boolean
  edit?: boolean
  remove?: boolean
  manage_permissions?: boolean
}

export interface FinancePermissions {
  view?: boolean
  withdraw?: boolean
  add?: boolean
  update_account?: boolean
  process_refunds?: boolean
  manage_payment_methods?: boolean
}

export interface SettingsPermissions {
  view?: boolean
  edit_details?: boolean
  edit_branding?: boolean
  edit_amenities?: boolean
}

export interface PromosPermissions {
  view?: boolean
  create?: boolean
  edit?: boolean
}

export interface RestaurantPermissions {
  view?: boolean
  manage_menu?: boolean
  create_orders?: boolean
  kitchen?: boolean
  cancel_orders?: boolean
  mark_paid?: boolean
  refund?: boolean
}

// Permission Presets
export const PERMISSION_PRESETS = {
  full_access: {
    name: "Full Access (Owner)",
    description: "Complete control over all business operations",
    permissions: {
      dashboard: { view_analytics: true, view_revenue: true },
      rooms: { view: true, create: true, edit: true, delete: true },
      bookings: { view: true, create: true, edit: true, cancel: true, view_payments: true, checkin_checkout: true },
      staff: { view: true, add: true, edit: true, remove: true, manage_permissions: true },
      finance: { view: true, withdraw: true, add: true, update_account: true, process_refunds: true, manage_payment_methods: true },
      settings: { view: true, edit_details: true, edit_branding: true, edit_amenities: true },
      promos: { view: true, create: true, edit: true },
      restaurant: { view: true, manage_menu: true, create_orders: true, kitchen: true, cancel_orders: true, mark_paid: true, refund: true },
      guest_policies: { view: true, create: true, edit: true, delete: true }
    }
  },
  manager: {
    name: "Manager",
    description: "Most permissions except staff management",
    permissions: {
      dashboard: { view_analytics: true, view_revenue: true },
      rooms: { view: true, create: true, edit: true, delete: false },
      bookings: { view: true, create: true, edit: true, cancel: true, view_payments: true, checkin_checkout: true },
      staff: { view: true, add: false, edit: false, remove: false, manage_permissions: false },
      finance: { view: true, withdraw: false, add: false, update_account: false, process_refunds: false, manage_payment_methods: false },
      settings: { view: true, edit_details: false, edit_branding: false, edit_amenities: false },
      promos: { view: true, create: true, edit: true },
      restaurant: { view: true, manage_menu: true, create_orders: true, kitchen: false, cancel_orders: true, mark_paid: true, refund: false },
      guest_policies: { view: true, create: false, edit: false, delete: false }
    }
  },
  kitchen: {
    name: "Kitchen",
    description: "Kitchen display and order status updates",
    permissions: {
      restaurant: { view: true, manage_menu: false, create_orders: false, kitchen: true, cancel_orders: false, mark_paid: false, refund: true }
    }
  },
  restaurant_staff: {
    name: "Restaurant / F&B",
    description: "Take orders and manage guest dining",
    permissions: {
      restaurant: { view: true, manage_menu: false, create_orders: true, kitchen: false, cancel_orders: true, mark_paid: true, refund: false }
    }
  },
  front_desk: {
    name: "Front Desk",
    description: "Bookings and guest management",
    permissions: {
      dashboard: { view_analytics: false, view_revenue: false },
      rooms: { view: true, create: false, edit: false, delete: false },
      bookings: { view: true, create: true, edit: true, cancel: false, view_payments: false, checkin_checkout: true },
      staff: { view: false },
      finance: { view: false },
      settings: { view: false },
      promos: { view: false, create: false, edit: false }
    }
  },
  custom: {
    name: "Custom",
    description: "Configure permissions manually",
    permissions: {}
  }
} as const

// Permission Labels
export const PERMISSION_LABELS = {
  dashboard: {
    title: "Dashboard",
    permissions: {
      view_analytics: "View Analytics",
      view_revenue: "View Revenue"
    }
  },
  rooms: {
    title: "Rooms Management",
    permissions: {
      view: "View Rooms",
      create: "Create Rooms",
      edit: "Edit Rooms",
      delete: "Delete Rooms"
    }
  },
  bookings: {
    title: "Bookings",
    permissions: {
      view: "View Bookings",
      create: "Create Bookings",
      edit: "Edit Bookings",
      cancel: "Cancel Bookings",
      view_payments: "View Payment Details",
      checkin_checkout: "Check-in/Check-out"
    }
  },
  staff: {
    title: "Staff Management",
    permissions: {
      view: "View Staff",
      add: "Add Staff",
      edit: "Edit Staff",
      remove: "Remove Staff",
      manage_permissions: "Manage Permissions"
    }
  },
  finance: {
    title: "Finance",
    permissions: {
      view: "View Finance",
      withdraw: "Withdraw Funds",
      add: "Add Funds",
      update_account: "Update Accounts",
      process_refunds: "Process Refunds",
      manage_payment_methods: "Manage Payment Methods"
    }
  },
  settings: {
    title: "Business Settings",
    permissions: {
      view: "View Settings",
      edit_details: "Edit Business Details",
      edit_branding: "Edit Branding",
      edit_amenities: "Edit Amenities"
    }
  },
  promos: {
    title: "Promo Codes",
    permissions: {
      view: "View Promo Codes",
      create: "Create Promo Codes",
      edit: "Edit Promo Codes"
    }
  },
  restaurant: {
    title: "Restaurant & Kitchen",
    permissions: {
      view: "View Restaurant",
      manage_menu: "Manage Menu",
      create_orders: "Take Orders",
      kitchen: "Kitchen Display",
      cancel_orders: "Cancel Orders",
      mark_paid: "Mark Payment Received",
      refund: "Refund Orders"
    }
  },
  guest_policies: {
    title: "Guest Notices & Policies",
    permissions: {
      view: "View Notices & Policies",
      create: "Add Notices & Policy Lines",
      edit: "Edit Notices & Policies",
      delete: "Remove Notices & Policy Lines"
    }
  }
} as const

// Helper to get enabled permissions count
export function getEnabledPermissionsCount(permissions: Permissions): number {
  let count = 0
  Object.values(permissions).forEach(category => {
    if (category && typeof category === 'object') {
      Object.values(category).forEach(value => {
        if (value === true) count++
      })
    }
  })
  return count
}

// Helper to get permission summary
export function getPermissionSummary(permissions: Permissions): string {
  const enabled: string[] = []

  Object.entries(permissions).forEach(([category, perms]) => {
    if (perms && typeof perms === 'object') {
      const hasAny = Object.values(perms).some(v => v === true)
      if (hasAny) {
        enabled.push(PERMISSION_LABELS[category as keyof typeof PERMISSION_LABELS]?.title || category)
      }
    }
  })

  return enabled.length > 0 ? enabled.join(', ') : 'No permissions'
}

export type PermissionPresetKey = keyof typeof PERMISSION_PRESETS

export function getPresetPermissions(key: PermissionPresetKey): Permissions {
  return PERMISSION_PRESETS[key].permissions as Permissions
}

export function getSwitchablePresets(): PermissionPresetKey[] {
  return ["manager", "front_desk", "kitchen", "restaurant_staff", "custom"]
}

function permissionFlag(value: unknown): boolean {
  return value === true
}

export function permissionsMatch(a: Permissions, b: Permissions): boolean {
  for (const [category, config] of Object.entries(PERMISSION_LABELS)) {
    const aCat = a[category as keyof Permissions] as Record<string, boolean> | undefined
    const bCat = b[category as keyof Permissions] as Record<string, boolean> | undefined
    for (const permKey of Object.keys(config.permissions)) {
      if (permissionFlag(aCat?.[permKey]) !== permissionFlag(bCat?.[permKey])) {
        return false
      }
    }
  }
  return true
}

/** Maps a member's permission set to the closest switchable preset, or custom. */
export function inferPermissionPreset(permissions: Permissions): PermissionPresetKey {
  for (const key of getSwitchablePresets()) {
    if (key === "custom") continue
    if (permissionsMatch(permissions, getPresetPermissions(key))) {
      return key
    }
  }
  return "custom"
}

export function getSwitchRoleInitialState(member: Pick<StaffMember, "title" | "permissions">) {
  const preset = inferPermissionPreset(member.permissions || {})
  return {
    preset,
    title: member.title || PERMISSION_PRESETS[preset].name,
    permissions:
      preset === "custom"
        ? { ...(member.permissions || {}) }
        : getPresetPermissions(preset),
  }
}

export const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "deactivated", label: "Deactivated" },
  { value: "fired", label: "Fired" },
] as const
