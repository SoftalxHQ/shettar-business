// Room Type and Room interfaces and constants

export interface RoomType {
  id: number
  name: string
  description: string
  price: number
  old_price?: number
  business_id: number
  images_url?: string[]

  // 41 amenities
  fan?: boolean
  air_conditioning?: boolean
  breakfast_included?: boolean
  wifi?: boolean
  minibar?: boolean
  television?: boolean
  ironing_facilities?: boolean
  refrigerator?: boolean
  safe?: boolean
  private_bathroom?: boolean
  shower?: boolean
  bathtub?: boolean
  hairdryer?: boolean
  toiletries?: boolean
  desk?: boolean
  seating_area?: boolean
  sofa?: boolean
  dining_area?: boolean
  electric_kettle?: boolean
  microwave?: boolean
  kitchenette?: boolean
  dining_table?: boolean
  wake_up_service?: boolean
  alarm_clock?: boolean
  towels?: boolean
  linens?: boolean
  balcony?: boolean
  patio?: boolean
  terrace?: boolean
  fireplace?: boolean
  private_pool?: boolean
  shared_pool?: boolean
  mountain_view?: boolean
  garden_view?: boolean
  city_view?: boolean
  sea_view?: boolean
  lake_view?: boolean
  river_view?: boolean
  landmark_view?: boolean

  // Computed
  rooms_count?: number
  available_rooms?: number
}

export interface Room {
  id: number
  number: number
  status: 'available' | 'unavailable'
  room_type_id: number
  booked: boolean
}

// Amenity categories for organized UI
export const AMENITY_CATEGORIES = {
  'Basic Amenities': [
    'fan', 'air_conditioning', 'wifi', 'television', 'minibar'
  ],
  'Bathroom': [
    'private_bathroom', 'shower', 'bathtub', 'hairdryer', 'toiletries'
  ],
  'Furniture': [
    'desk', 'seating_area', 'sofa', 'dining_area', 'dining_table'
  ],
  'Kitchen': [
    'electric_kettle', 'microwave', 'kitchenette', 'refrigerator'
  ],
  'Services': [
    'ironing_facilities', 'wake_up_service', 'alarm_clock', 'safe', 'breakfast_included'
  ],
  'Linens': [
    'towels', 'linens'
  ],
  'Outdoor': [
    'balcony', 'patio', 'terrace'
  ],
  'Luxury': [
    'fireplace', 'private_pool', 'shared_pool'
  ],
  'Views': [
    'mountain_view', 'garden_view', 'city_view', 'sea_view',
    'lake_view', 'river_view', 'landmark_view'
  ]
} as const

// User-friendly labels for amenities
export const AMENITY_LABELS: Record<string, string> = {
  fan: 'Fan',
  air_conditioning: 'Air Conditioning',
  breakfast_included: 'Breakfast Included',
  wifi: 'WiFi',
  minibar: 'Minibar',
  television: 'Television',
  ironing_facilities: 'Ironing Facilities',
  refrigerator: 'Refrigerator',
  safe: 'Safe',
  private_bathroom: 'Private Bathroom',
  shower: 'Shower',
  bathtub: 'Bathtub',
  hairdryer: 'Hairdryer',
  toiletries: 'Toiletries',
  desk: 'Desk',
  seating_area: 'Seating Area',
  sofa: 'Sofa',
  dining_area: 'Dining Area',
  electric_kettle: 'Electric Kettle',
  microwave: 'Microwave',
  kitchenette: 'Kitchenette',
  dining_table: 'Dining Table',
  wake_up_service: 'Wake-up Service',
  alarm_clock: 'Alarm Clock',
  towels: 'Towels',
  linens: 'Linens',
  balcony: 'Balcony',
  patio: 'Patio',
  terrace: 'Terrace',
  fireplace: 'Fireplace',
  private_pool: 'Private Pool',
  shared_pool: 'Shared Pool',
  mountain_view: 'Mountain View',
  garden_view: 'Garden View',
  city_view: 'City View',
  sea_view: 'Sea View',
  lake_view: 'Lake View',
  river_view: 'River View',
  landmark_view: 'Landmark View',
}

// All amenity keys
export const AMENITY_KEYS = Object.values(AMENITY_CATEGORIES).flat()

// Helper to format amenity name
export function formatAmenityName(key: string): string {
  return AMENITY_LABELS[key] || key.split('_').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
}

// Helper to get amenities that are enabled
export function getEnabledAmenities(roomType: RoomType): string[] {
  return AMENITY_KEYS.filter(key => roomType[key as keyof RoomType] === true)
}

// Helper to count enabled amenities
export function countEnabledAmenities(roomType: RoomType): number {
  return getEnabledAmenities(roomType).length
}
