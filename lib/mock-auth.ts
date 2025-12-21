// Mock authentication service - will be replaced with real auth later
export interface User {
  id: string
  email: string
  name: string
  role: "admin" | "staff"
  hotelId: string
  hotelName: string
  profilePicture?: string
}

export const MOCK_USERS = {
  admin: {
    email: "admin@hotel.com",
    password: "admin123",
    user: {
      id: "1",
      email: "admin@hotel.com",
      name: "Admin User",
      role: "admin" as const,
      hotelId: "hotel-1",
      hotelName: "Grand Plaza Hotel",
    },
  },
  staff: {
    email: "staff@hotel.com",
    password: "staff123",
    user: {
      id: "2",
      email: "staff@hotel.com",
      name: "Front Desk Staff",
      role: "staff" as const,
      hotelId: "hotel-1",
      hotelName: "Grand Plaza Hotel",
    },
  },
}

export function mockLogin(email: string, password: string): User | null {
  const user = Object.values(MOCK_USERS).find((u) => u.email === email && u.password === password)
  return user ? user.user : null
}

export function mockSignup(email: string, password: string, name: string, hotelName: string): User {
  return {
    id: Math.random().toString(36).substr(2, 9),
    email,
    name,
    role: "admin",
    hotelId: Math.random().toString(36).substr(2, 9),
    hotelName,
  }
}
