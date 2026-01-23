// Mock authentication service - will be replaced with real auth later
export interface User {
  id: string
  email: string
  name: string
  first_name?: string
  last_name?: string
  phone_number?: string
  address?: string
  zip_code?: string
  role: "admin" | "staff"
  hotelId: string
  hotelName: string
  profilePicture?: string
  businessId: string // Added business unique ID
}

export const MOCK_USERS = {
  admin: {
    email: "admin@hotel.com",
    password: "admin123",
    businessId: "GPHF8A2C1", // Grand Plaza Hotel business ID
    user: {
      id: "1",
      email: "admin@hotel.com",
      name: "Admin User",
      role: "admin" as const,
      hotelId: "hotel-1",
      hotelName: "Grand Plaza Hotel",
      businessId: "GPHF8A2C1",
    },
  },
  staff: {
    email: "staff@hotel.com",
    password: "staff123",
    businessId: "GPHF8A2C1", // Same business as admin
    user: {
      id: "2",
      email: "staff@hotel.com",
      name: "Front Desk Staff",
      role: "staff" as const,
      hotelId: "hotel-1",
      hotelName: "Grand Plaza Hotel",
      businessId: "GPHF8A2C1",
    },
  },
}

export interface LoginResult {
  user: User
  businessId: string
  token: string
}

export function mockLogin(email: string, password: string, businessId?: string): LoginResult | null {
  const userEntry = Object.values(MOCK_USERS).find((u) => u.email === email && u.password === password)

  if (!userEntry) {
    return null
  }

  // If business ID is provided, validate it matches the user's business
  if (businessId && userEntry.businessId !== businessId) {
    return null // Wrong business for this user
  }

  // Generate a mock JWT token
  const token = `mock_jwt_token_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`

  return {
    user: userEntry.user,
    businessId: userEntry.businessId,
    token,
  }
}

export function mockSignup(email: string, password: string, name: string, hotelName: string): User {
  const businessId = generateBusinessId(hotelName)

  return {
    id: Math.random().toString(36).substr(2, 9),
    email,
    name,
    role: "admin",
    hotelId: Math.random().toString(36).substr(2, 9),
    hotelName,
    businessId,
  }
}

// Generate business ID from hotel name (similar to backend logic)
function generateBusinessId(businessName: string): string {
  const initials = businessName.toUpperCase().match(/\b\w/g)?.join("") || "BUS"
  const randomHex = Math.random().toString(16).substring(2, 8).toUpperCase()
  return `${initials}${randomHex}`
}

