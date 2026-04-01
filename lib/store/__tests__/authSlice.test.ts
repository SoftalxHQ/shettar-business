import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import authReducer, {
  login,
  logout,
  changeBusiness,
  updateUser,
  setLoading,
  setFirstTimeSetup,
  setDeviceId,
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

const initialState = {
  user: null,
  token: null,
  businessId: null,
  businessName: null,
  deviceId: "",
  isLoading: true,
  isFirstTimeSetup: true,
};

// ── Unit tests ────────────────────────────────────────────────────────────────

describe("authSlice reducers", () => {
  it("login sets all fields and clears loading/firstTimeSetup", () => {
    const state = authReducer(
      initialState,
      login({ user: mockUser, token: "tok123", businessId: "BID1", businessName: "Hotel A" })
    );
    expect(state.user).toEqual(mockUser);
    expect(state.token).toBe("tok123");
    expect(state.businessId).toBe("BID1");
    expect(state.businessName).toBe("Hotel A");
    expect(state.isLoading).toBe(false);
    expect(state.isFirstTimeSetup).toBe(false);
  });

  it("logout nulls user and token but preserves businessId and businessName", () => {
    const loggedIn = authReducer(
      initialState,
      login({ user: mockUser, token: "tok", businessId: "BID1", businessName: "Hotel A" })
    );
    const state = authReducer(loggedIn, logout());
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.businessId).toBe("BID1");
    expect(state.businessName).toBe("Hotel A");
  });

  it("changeBusiness nulls all auth fields and sets isFirstTimeSetup=true", () => {
    const loggedIn = authReducer(
      initialState,
      login({ user: mockUser, token: "tok", businessId: "BID1", businessName: "Hotel A" })
    );
    const state = authReducer(loggedIn, changeBusiness());
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.businessId).toBeNull();
    expect(state.businessName).toBeNull();
    expect(state.isFirstTimeSetup).toBe(true);
  });

  it("updateUser merges partial fields into existing user", () => {
    const loggedIn = authReducer(
      initialState,
      login({ user: mockUser, token: "tok", businessId: "BID1", businessName: "Hotel A" })
    );
    const state = authReducer(loggedIn, updateUser({ name: "Updated Name" }));
    expect(state.user?.name).toBe("Updated Name");
    expect(state.user?.email).toBe(mockUser.email); // unchanged
  });

  it("updateUser is a no-op when user is null", () => {
    const state = authReducer(initialState, updateUser({ name: "Ghost" }));
    expect(state.user).toBeNull();
  });

  it("setLoading sets isLoading", () => {
    const state = authReducer(initialState, setLoading(false));
    expect(state.isLoading).toBe(false);
    const state2 = authReducer(state, setLoading(true));
    expect(state2.isLoading).toBe(true);
  });

  it("setFirstTimeSetup sets isFirstTimeSetup", () => {
    const state = authReducer(initialState, setFirstTimeSetup(false));
    expect(state.isFirstTimeSetup).toBe(false);
  });

  it("setDeviceId sets deviceId", () => {
    const state = authReducer(initialState, setDeviceId("device_abc123"));
    expect(state.deviceId).toBe("device_abc123");
  });
});

// ── Property tests ────────────────────────────────────────────────────────────

const arbUser = fc.record<User>({
  id: fc.string({ minLength: 1 }),
  email: fc.emailAddress(),
  name: fc.string({ minLength: 1 }),
  role: fc.constantFrom("admin" as const, "manager" as const, "staff" as const),
  hotelId: fc.string({ minLength: 1 }),
  hotelName: fc.string({ minLength: 1 }),
  businessId: fc.string({ minLength: 1 }),
});

const arbLoginPayload = fc.record({
  user: arbUser,
  token: fc.string({ minLength: 1 }),
  businessId: fc.string({ minLength: 1 }),
  businessName: fc.string({ minLength: 1 }),
});

const arbLoggedInState = arbLoginPayload.map((p) =>
  authReducer(initialState, login(p))
);

describe("authSlice property tests", () => {
  // Feature: redux-toolkit-state-management, Property 2: Login action sets all fields
  it("Property 2: login sets all fields correctly for any payload", () => {
    fc.assert(
      fc.property(arbLoginPayload, (payload) => {
        const state = authReducer(initialState, login(payload));
        return (
          state.user === payload.user &&
          state.token === payload.token &&
          state.businessId === payload.businessId &&
          state.businessName === payload.businessName &&
          state.isLoading === false &&
          state.isFirstTimeSetup === false
        );
      }),
      { numRuns: 100 }
    );
  });

  // Feature: redux-toolkit-state-management, Property 3: Logout preserves business context
  it("Property 3: logout preserves businessId and businessName for any logged-in state", () => {
    fc.assert(
      fc.property(arbLoggedInState, (state) => {
        const next = authReducer(state, logout());
        return (
          next.user === null &&
          next.token === null &&
          next.businessId === state.businessId &&
          next.businessName === state.businessName
        );
      }),
      { numRuns: 100 }
    );
  });

  // Feature: redux-toolkit-state-management, Property 4: changeBusiness clears all auth fields
  it("Property 4: changeBusiness clears all fields for any state", () => {
    fc.assert(
      fc.property(arbLoggedInState, (state) => {
        const next = authReducer(state, changeBusiness());
        return (
          next.user === null &&
          next.token === null &&
          next.businessId === null &&
          next.businessName === null &&
          next.isFirstTimeSetup === true
        );
      }),
      { numRuns: 100 }
    );
  });

  // Feature: redux-toolkit-state-management, Property 5: updateUser merges partial fields
  it("Property 5: updateUser merges partial fields without overwriting others", () => {
    fc.assert(
      fc.property(
        arbLoggedInState,
        fc.record({ name: fc.string({ minLength: 1 }) }),
        (state, partial) => {
          const next = authReducer(state, updateUser(partial));
          if (!state.user) return next.user === null;
          return (
            next.user?.name === partial.name &&
            next.user?.email === state.user.email // unchanged field
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: redux-toolkit-state-management, Property 6: Reducer determinism
  it("Property 6: reducer is deterministic (same input → same output)", () => {
    fc.assert(
      fc.property(arbLoginPayload, (payload) => {
        const action = login(payload);
        const s1 = authReducer(initialState, action);
        const s2 = authReducer(initialState, action);
        return JSON.stringify(s1) === JSON.stringify(s2);
      }),
      { numRuns: 100 }
    );
  });
});
