// Mock data for bookings, rooms, guests, etc.
export interface Booking {
  id: string
  guestName: string
  guestEmail: string
  guestPhone: string
  roomNumber: string
  roomType: string
  checkInDate: string
  checkOutDate: string
  status: "confirmed" | "checked-in" | "checked-out" | "cancelled"
  totalAmount: number
  paidAmount: number
  guests: number
  specialRequests?: string
  bookingDate: string
}

export interface Room {
  id: string
  number: string
  type: string
  price: number
  capacity: number
  status: "available" | "occupied" | "maintenance" | "reserved"
  amenities: string[]
}

export const MOCK_ROOMS: Room[] = [
  {
    id: "1",
    number: "101",
    type: "Standard",
    price: 120,
    capacity: 2,
    status: "available",
    amenities: ["WiFi", "TV", "AC"],
  },
  {
    id: "2",
    number: "102",
    type: "Standard",
    price: 120,
    capacity: 2,
    status: "occupied",
    amenities: ["WiFi", "TV", "AC"],
  },
  {
    id: "3",
    number: "201",
    type: "Deluxe",
    price: 180,
    capacity: 3,
    status: "available",
    amenities: ["WiFi", "TV", "AC", "Mini Bar"],
  },
  {
    id: "4",
    number: "202",
    type: "Deluxe",
    price: 180,
    capacity: 3,
    status: "reserved",
    amenities: ["WiFi", "TV", "AC", "Mini Bar"],
  },
  {
    id: "5",
    number: "301",
    type: "Suite",
    price: 280,
    capacity: 4,
    status: "available",
    amenities: ["WiFi", "TV", "AC", "Mini Bar", "Balcony", "Jacuzzi"],
  },
]

export const MOCK_BOOKINGS: Booking[] = [
  {
    id: "1",
    guestName: "John Smith",
    guestEmail: "john.smith@email.com",
    guestPhone: "+1 (555) 123-4567",
    roomNumber: "102",
    roomType: "Standard",
    checkInDate: "2025-12-15",
    checkOutDate: "2025-12-18",
    status: "checked-in",
    totalAmount: 360,
    paidAmount: 360,
    guests: 2,
    bookingDate: "2025-12-10",
  },
  {
    id: "2",
    guestName: "Sarah Johnson",
    guestEmail: "sarah.j@email.com",
    guestPhone: "+1 (555) 234-5678",
    roomNumber: "202",
    roomType: "Deluxe",
    checkInDate: "2025-12-20",
    checkOutDate: "2025-12-25",
    status: "confirmed",
    totalAmount: 900,
    paidAmount: 0,
    guests: 3,
    specialRequests: "Late check-in requested",
    bookingDate: "2025-12-12",
  },
  {
    id: "3",
    guestName: "Mike Davis",
    guestEmail: "mike.d@email.com",
    guestPhone: "+1 (555) 345-6789",
    roomNumber: "108",
    roomType: "Standard",
    checkInDate: "2025-12-10",
    checkOutDate: "2025-12-15",
    status: "checked-out",
    totalAmount: 600,
    paidAmount: 600,
    guests: 1,
    bookingDate: "2025-12-05",
  },
  {
    id: "4",
    guestName: "Emily Brown",
    guestEmail: "emily.brown@email.com",
    guestPhone: "+1 (555) 456-7890",
    roomNumber: "301",
    roomType: "Suite",
    checkInDate: "2025-12-22",
    checkOutDate: "2025-12-27",
    status: "confirmed",
    totalAmount: 1400,
    paidAmount: 700,
    guests: 4,
    specialRequests: "Anniversary celebration, need decoration",
    bookingDate: "2025-12-14",
  },
  {
    id: "5",
    guestName: "Robert Wilson",
    guestEmail: "r.wilson@email.com",
    guestPhone: "+1 (555) 567-8901",
    roomNumber: "205",
    roomType: "Deluxe",
    checkInDate: "2025-12-18",
    checkOutDate: "2025-12-21",
    status: "checked-in",
    totalAmount: 540,
    paidAmount: 540,
    guests: 2,
    bookingDate: "2025-12-11",
  },
]

export interface Payment {
  id: string
  bookingId: string
  guestName: string
  amount: number
  date: string
  method: "cash" | "card" | "online"
  status: "completed" | "pending" | "refunded"
}

export const MOCK_PAYMENTS: Payment[] = [
  {
    id: "1",
    bookingId: "1",
    guestName: "John Smith",
    amount: 360,
    date: "2025-12-15",
    method: "card",
    status: "completed",
  },
  {
    id: "2",
    bookingId: "3",
    guestName: "Mike Davis",
    amount: 600,
    date: "2025-12-15",
    method: "cash",
    status: "completed",
  },
  {
    id: "3",
    bookingId: "4",
    guestName: "Emily Brown",
    amount: 700,
    date: "2025-12-14",
    method: "online",
    status: "completed",
  },
  {
    id: "4",
    bookingId: "5",
    guestName: "Robert Wilson",
    amount: 540,
    date: "2025-12-18",
    method: "card",
    status: "completed",
  },
]

export interface StaffMember {
  id: string
  name: string
  email: string
  role: string
  department: string
  phone: string
  status: "active" | "on-leave" | "inactive"
  hireDate: string
  salary: number
}

export const MOCK_STAFF: StaffMember[] = [
  {
    id: "1",
    name: "Alice Cooper",
    email: "alice.c@hotel.com",
    role: "Front Desk Manager",
    department: "Front Desk",
    phone: "+1 (555) 111-2222",
    status: "active",
    hireDate: "2023-01-15",
    salary: 45000,
  },
  {
    id: "2",
    name: "Bob Martinez",
    email: "bob.m@hotel.com",
    role: "Receptionist",
    department: "Front Desk",
    phone: "+1 (555) 222-3333",
    status: "active",
    hireDate: "2023-06-01",
    salary: 32000,
  },
  {
    id: "3",
    name: "Carol White",
    email: "carol.w@hotel.com",
    role: "Housekeeping Supervisor",
    department: "Housekeeping",
    phone: "+1 (555) 333-4444",
    status: "active",
    hireDate: "2022-03-20",
    salary: 38000,
  },
  {
    id: "4",
    name: "David Lee",
    email: "david.l@hotel.com",
    role: "Maintenance Technician",
    department: "Maintenance",
    phone: "+1 (555) 444-5555",
    status: "on-leave",
    hireDate: "2023-09-10",
    salary: 35000,
  },
]

export interface RoomTypeAvailability {
  type: string
  available: number
  total: number
}

export const MOCK_ROOM_AVAILABILITY: RoomTypeAvailability[] = [
  {
    type: "Standard",
    available: 4,
    total: 18,
  },
  {
    type: "Deluxe",
    available: 8,
    total: 12,
  },
  {
    type: "Suite",
    available: 0,
    total: 6,
  },
  {
    type: "Executive",
    available: 2,
    total: 8,
  },
]
