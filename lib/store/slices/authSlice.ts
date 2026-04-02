import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { User } from "@/lib/mock-auth";
import type { RootState } from "../store";
import { REHYDRATE } from "redux-persist";

interface AuthState {
  user: User | null;
  token: string | null;
  businessId: string | null;
  businessName: string | null;
  deviceId: string;
  isLoading: boolean;
  isFirstTimeSetup: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  businessId: null,
  businessName: null,
  deviceId: "",
  isLoading: true,
  isFirstTimeSetup: true,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login: (
      state,
      action: PayloadAction<{
        user: User;
        token: string;
        businessId: string;
        businessName: string;
      }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.businessId = action.payload.businessId;
      state.businessName = action.payload.businessName;
      state.isLoading = false;
      state.isFirstTimeSetup = false;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      // businessId and businessName intentionally preserved
    },
    changeBusiness: (state) => {
      state.user = null;
      state.token = null;
      state.businessId = null;
      state.businessName = null;
      state.isFirstTimeSetup = true;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setFirstTimeSetup: (state, action: PayloadAction<boolean>) => {
      state.isFirstTimeSetup = action.payload;
    },
    setDeviceId: (state, action: PayloadAction<string>) => {
      state.deviceId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(REHYDRATE, (state) => {
      state.isLoading = false;
    });
  },
});

export const {
  login,
  logout,
  changeBusiness,
  updateUser,
  setLoading,
  setFirstTimeSetup,
  setDeviceId,
} = authSlice.actions;

// Selectors
export const selectUser = (state: RootState) => state.auth.user;
export const selectToken = (state: RootState) => state.auth.token;
export const selectBusinessId = (state: RootState) => state.auth.businessId;
export const selectBusinessName = (state: RootState) => state.auth.businessName;
export const selectDeviceId = (state: RootState) => state.auth.deviceId;
export const selectIsLoading = (state: RootState) => state.auth.isLoading;
export const selectIsFirstTimeSetup = (state: RootState) => state.auth.isFirstTimeSetup;

export default authSlice.reducer;
