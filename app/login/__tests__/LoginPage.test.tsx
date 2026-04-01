import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import authReducer, { login, setFirstTimeSetup } from "@/lib/store/slices/authSlice";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

// Mock api-client using vi.hoisted to avoid hoisting issues
const { mockApiLogin } = vi.hoisted(() => ({ mockApiLogin: vi.fn() }));
vi.mock("@/lib/api-client", () => ({
  api: { login: mockApiLogin },
}));

// Mock storage setters
vi.mock("@/lib/storage", () => ({
  setAuthToken: vi.fn(),
  setUserData: vi.fn(),
  setStoredBusinessId: vi.fn(),
  setStoredBusinessName: vi.fn(),
  getStoredBusinessId: vi.fn(() => null),
  getStoredBusinessName: vi.fn(() => null),
  getAuthToken: vi.fn(() => null),
  getUserData: vi.fn(() => null),
  getOrCreateDeviceId: vi.fn(() => "device_test"),
  logout: vi.fn(),
  changeBusiness: vi.fn(),
  isFirstTimeLogin: vi.fn(() => true),
}));

import LoginPage from "@/app/login/page";

function makeStore(firstTimeSetup = true) {
  const store = configureStore({ reducer: { auth: authReducer } });
  store.dispatch(setFirstTimeSetup(firstTimeSetup));
  return store;
}

function renderWithStore(firstTimeSetup = true) {
  const store = makeStore(firstTimeSetup);
  render(
    <Provider store={store}>
      <LoginPage />
    </Provider>
  );
  return store;
}

describe("LoginPage", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockApiLogin.mockClear();
  });

  it("shows Business ID input when isFirstTimeSetup is true", () => {
    renderWithStore(true);
    expect(screen.getByLabelText(/business id/i)).toBeInTheDocument();
  });

  it("hides Business ID input when isFirstTimeSetup is false", () => {
    renderWithStore(false);
    expect(screen.queryByLabelText(/business id/i)).not.toBeInTheDocument();
  });

  it("shows validation error when Business ID is missing on first-time setup", async () => {
    renderWithStore(true);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "admin@hotel.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password" } });
    fireEvent.submit(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText(/business id is required/i)).toBeInTheDocument();
    });
    expect(mockApiLogin).not.toHaveBeenCalled();
  });

  it("dispatches login action on successful API response", async () => {
    mockApiLogin.mockResolvedValueOnce({
      token: "jwt_token",
      data: {
        id: "1",
        email: "admin@hotel.com",
        first_name: "Admin",
        last_name: "User",
        business: {
          id: 1,
          name: "Grand Plaza",
          business_unique_id: "GPHF8A2C1",
          role: "admin",
        },
      },
    });

    const store = renderWithStore(false);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "admin@hotel.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password" } });
    fireEvent.submit(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });

    const state = store.getState().auth;
    expect(state.token).toBe("jwt_token");
    expect(state.user?.email).toBe("admin@hotel.com");
  });

  it("shows error message when API call fails", async () => {
    mockApiLogin.mockRejectedValueOnce(new Error("Invalid credentials"));

    renderWithStore(false);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "bad@hotel.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "wrong" } });
    fireEvent.submit(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });
});
