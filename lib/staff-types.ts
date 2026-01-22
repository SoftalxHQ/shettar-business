// Staff and Permissions Types

export interface StaffMember {
  id: number
  user_id: number
  business_id: number
  title: string
  permissions: Permissions
  is_owner: boolean
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
  payments?: PaymentsPermissions
  settings?: SettingsPermissions
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

export interface PaymentsPermissions {
  view?: boolean
  process_refunds?: boolean
  manage_payment_methods?: boolean
}

export interface SettingsPermissions {
  view?: boolean
  edit_details?: boolean
  edit_branding?: boolean
  edit_amenities?: boolean
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
      payments: { view: true, process_refunds: true, manage_payment_methods: true },
      settings: { view: true, edit_details: true, edit_branding: true, edit_amenities: true }
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
      payments: { view: true, process_refunds: false, manage_payment_methods: false },
      settings: { view: true, edit_details: false, edit_branding: false, edit_amenities: false }
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
      payments: { view: false },
      settings: { view: false }
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
  payments: {
    title: "Payments",
    permissions: {
      view: "View Payments",
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
