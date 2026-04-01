import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import authReducer, { login, setLoading } from "@/lib/store/slices/authSlice";
import type { User } from "@/lib/mock-auth";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/dashboard",
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

// Mock tauri
vi.mock("@/lib/tauri", () => ({ setupNativeWindow: vi.fn() }));

// Minimal DashboardLayout test wrapper
import { DashboardLayout } from "@/components/dashboard-layout";

const mockUser: User = {
  id: "1",
  email: "admin@hotel.com",
  name: "Admin User",
  role: "admin",
  hotelId: "hotel-1",
  hotelName: "Grand Plaza",
  businessId: "GPHF8A2C1",
};

function makeStore(overrides?: Partial<ReturnType<typeof authReducer>>) {
  const store = configureStore({ reducer: { auth: authReducer } });
  if (overrides?.user) {
    store.dispatch(
      login({
        user: overrides.user,
        token: "tok",
        businessId: "BID1",
        businessName: "Hotel A",
      })
    );
  }
  return store;
}

function renderWithStore(
  ui: React.ReactElement,
  store: ReturnType<typeof makeStore>
) {
  return render(<Provider store={store}>{ui}</Provider>);
}

describe("DashboardLayout", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("redirects to /login when user is null and isLoading is false", () => {
    const store = makeStore();
    store.dispatch(setLoading(false));

    renderWithStore(
      <DashboardLayout>
        <div>content</div>
      </DashboardLayout>,
      store
    );

    expect(mockPush).toHaveBeenCalledWith("/login");
  });

  it("renders children when user is authenticated", () => {
    const store = makeStore({ user: mockUser });
    renderWithStore(
      <DashboardLayout>
        <div data-testid="child">Dashboard Content</div>
      </DashboardLayout>,
      store
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });
});
