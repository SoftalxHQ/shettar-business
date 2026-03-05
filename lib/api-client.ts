// API client with business context

import { getAuthToken, getStoredBusinessId } from "./storage"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
const APP_ENV = process.env.NEXT_PUBLIC_APP_ENV || "development"

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean
  requiresBusinessContext?: boolean
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private getHeaders(options: RequestOptions = {}): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "X-Client-Platform": "tauri-desktop", // Identify this as the Tauri desktop app
      "X-App-Env": APP_ENV, // Identify the environment (staging, production, etc.)
    }

    // Add authentication token if required
    if (options.requiresAuth) {
      const token = getAuthToken()
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }
    }

    // Add business context if required
    if (options.requiresBusinessContext) {
      const businessId = getStoredBusinessId()
      if (businessId) {
        headers["X-Business-Id"] = businessId
      }
    }

    return headers
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { requiresAuth = false, requiresBusinessContext = false, ...fetchOptions } = options

    const url = `${this.baseUrl}${endpoint}`
    const headers = this.getHeaders({ requiresAuth, requiresBusinessContext })

    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        ...headers,
        ...(fetchOptions.headers || {}),
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(response.status, errorData.message || response.statusText, errorData)
    }

    return response.json()
  }

  // Convenience methods
  async get<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" })
  }

  async post<T>(endpoint: string, data: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async put<T>(endpoint: string, data: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async delete<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" })
  }

  // Auth endpoints
  async login(email: string, password: string, businessId?: string) {
    const response = await fetch(`${this.baseUrl}/users/sign_in`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Platform": "tauri-desktop",
        "X-App-Env": APP_ENV,
      },
      credentials: "include", // Include cookies for sessions
      body: JSON.stringify({
        user: {
          email,
          password,
          business_id: businessId,
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(
        response.status,
        errorData.status?.message || errorData.message || "Login failed",
        errorData,
      )
    }

    const data = await response.json()

    // Extract JWT from Authorization header
    const authHeader = response.headers.get("Authorization")
    const token = authHeader?.replace("Bearer ", "") || ""

    return {
      ...data,
      token,
    }
  }

  async logout() {
    const token = getAuthToken()

    return fetch(`${this.baseUrl}/users/sign_out`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Platform": "tauri-desktop",
        "X-App-Env": APP_ENV,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
    })
  }

  // Business-scoped endpoints
  async getBusinessData<T>(endpoint: string): Promise<T> {
    return this.get<T>(endpoint, {
      requiresAuth: true,
      requiresBusinessContext: true,
    })
  }

  async postBusinessData<T>(endpoint: string, data: any): Promise<T> {
    return this.post<T>(endpoint, data, {
      requiresAuth: true,
      requiresBusinessContext: true,
    })
  }

  async putBusinessData<T>(endpoint: string, data: any): Promise<T> {
    return this.put<T>(endpoint, data, {
      requiresAuth: true,
      requiresBusinessContext: true,
    })
  }

  async deleteBusinessData<T>(endpoint: string): Promise<T> {
    return this.delete<T>(endpoint, {
      requiresAuth: true,
      requiresBusinessContext: true,
    })
  }
}

export class ApiError extends Error {
  status: number
  data: any

  constructor(status: number, message: string, data: any = {}) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.data = data
  }
}

// Export a singleton instance
export const api = new ApiClient(API_BASE_URL)

export default api
