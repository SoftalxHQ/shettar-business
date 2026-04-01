import { describe, it, expect, beforeEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import authReducer, {
  login,
  logout,
  changeBusiness,
  updateUser,
} from "../slices/authSlice";
import type { User } from "@/lib/mock-auth";

const mockUser: User = {
  id: "1",
  email: "admin@hotel.com",
  name: "Admin User",
  role: "admin",
  hotelId: "hotel-1",
  hotelName: "Grand Plaza",
  businessId: "GPHF8A2C1",
};

function makeStore() {
  return configureStore({ reducer: { auth: authReducer } });
}

describe("auth flow integration tests", () => {
  let store: ReturnType<typeof makeStore>;

  beforeEach(() => {
    store = makeStore();
  });

  it("login dispatched to real store sets correct state", () => {
    store.dispatch(login({ user: mockUser, token: "tok", businessId: "BID1", businessName: "Hotel A" }));
    const state = store.getState().auth;
    expect(state.user).toEqual(mockUser);
    expect(state.token).toBe("tok");
    expect(state.businessId).toBe("BID1");
    expect(state.businessName).toBe("Hotel A");
    expect(state.isLoading).toBe(false);
    expect(state.isFirstTimeSetup).toBe(false);
  });

  it("login then logout: user/token null, businessId preserved", () => {
    store.dispatch(login({ user: mockUser, token: "tok", businessId: "BID1", businessName: "Hotel A" }));
    store.dispatch(logout());
    const state = store.getState().auth;
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.businessId).toBe("BID1");
    expect(state.businessName).toBe("Hotel A");
  });

  it("login then changeBusiness: all auth fields null, isFirstTimeSetup=true", () => {
    store.dispatch(login({ user: mockUser, token: "tok", businessId: "BID1", businessName: "Hotel A" }));
    store.dispatch(changeBusiness());
    const state = store.getState().auth;
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.businessId).toBeNull();
    expect(state.businessName).toBeNull();
    expect(state.isFirstTimeSetup).toBe(true);
  });

  it("login then updateUser: updated fields changed, others preserved", () => {
    store.dispatch(login({ user: mockUser, token: "tok", businessId: "BID1", businessName: "Hotel A" }));
    store.dispatch(updateUser({ name: "New Name", phone_number: "+234 800 000 0000" }));
    const state = store.getState().auth;
    expect(state.user?.name).toBe("New Name");
    expect(state.user?.phone_number).toBe("+234 800 000 0000");
    expect(state.user?.email).toBe(mockUser.email); // unchanged
    expect(state.user?.role).toBe(mockUser.role); // unchanged
  });
});
