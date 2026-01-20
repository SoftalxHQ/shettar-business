// Local storage utilities for managing business context
// All functions check for client-side to prevent SSR errors

const BUSINESS_ID_KEY = "abri_business_id"
const BUSINESS_NAME_KEY = "abri_business_name"
const AUTH_TOKEN_KEY = "abri_auth_token"
const USER_DATA_KEY = "abri_user_data"
const DEVICE_ID_KEY = "abri_device_id"

// Check if we're on the client side
const isClient = typeof window !== "undefined"

// Generate a unique device ID on first use
export function getOrCreateDeviceId(): string {
  if (!isClient) return ""

  let deviceId = localStorage.getItem(DEVICE_ID_KEY)
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    localStorage.setItem(DEVICE_ID_KEY, deviceId)
  }
  return deviceId
}

// Business ID management
export function getStoredBusinessId(): string | null {
  if (!isClient) return null
  return localStorage.getItem(BUSINESS_ID_KEY)
}

export function setStoredBusinessId(businessId: string): void {
  if (!isClient) return
  localStorage.setItem(BUSINESS_ID_KEY, businessId)
}

export function clearStoredBusinessId(): void {
  if (!isClient) return
  localStorage.removeItem(BUSINESS_ID_KEY)
}

// Business Name management
export function getStoredBusinessName(): string | null {
  if (!isClient) return null
  return localStorage.getItem(BUSINESS_NAME_KEY)
}

export function setStoredBusinessName(businessName: string): void {
  if (!isClient) return
  localStorage.setItem(BUSINESS_NAME_KEY, businessName)
}

export function clearStoredBusinessName(): void {
  if (!isClient) return
  localStorage.removeItem(BUSINESS_NAME_KEY)
}

// Auth token management
export function getAuthToken(): string | null {
  if (!isClient) return null
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function setAuthToken(token: string): void {
  if (!isClient) return
  localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export function clearAuthToken(): void {
  if (!isClient) return
  localStorage.removeItem(AUTH_TOKEN_KEY)
}

// User data management
export function getUserData(): any {
  if (!isClient) return null
  const data = localStorage.getItem(USER_DATA_KEY)
  return data ? JSON.parse(data) : null
}

export function setUserData(userData: any): void {
  if (!isClient) return
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData))
}

export function clearUserData(): void {
  if (!isClient) return
  localStorage.removeItem(USER_DATA_KEY)
}

// Full logout - clears auth but keeps business ID
export function logout(): void {
  clearAuthToken()
  clearUserData()
  // Note: business ID is intentionally NOT cleared
}

// Change business - clears everything including business ID
export function changeBusiness(): void {
  clearAuthToken()
  clearUserData()
  clearStoredBusinessId()
  clearStoredBusinessName()
}

// Check if this is first time login (no business ID stored)
export function isFirstTimeLogin(): boolean {
  return !getStoredBusinessId()
}
