"use client"

import { useAppDispatch, useAppSelector } from "./store/hooks"
import { 
  selectUser, selectBusinessId, selectBusinessName, selectDeviceId, selectIsLoading, selectIsFirstTimeSetup,
  login as loginAction, logout as logoutAction, changeBusiness as changeBusinessAction, updateUser as updateUserAction
} from "./store/slices/authSlice"
import { logout as storageLogout, changeBusiness as storageChangeBusiness, setAuthToken, setUserData, setStoredBusinessId, setStoredBusinessName } from "./storage"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { api } from "./api-client"
import type { User } from "./mock-auth"

export function useAuth() {
  const dispatch = useAppDispatch();
  const router = useRouter();

  const user = useAppSelector(selectUser);
  const businessId = useAppSelector(selectBusinessId);
  const businessName = useAppSelector(selectBusinessName);
  const deviceId = useAppSelector(selectDeviceId);
  const isLoading = useAppSelector(selectIsLoading);
  const isFirstTimeSetup = useAppSelector(selectIsFirstTimeSetup);

  const login = (userData: User, userBusinessId: string, userBusinessName: string, token: string) => {
    dispatch(loginAction({ user: userData, token, businessId: userBusinessId, businessName: userBusinessName }));
    setUserData(userData);
    setAuthToken(token);
    setStoredBusinessId(userBusinessId);
    setStoredBusinessName(userBusinessName);
    toast.success(`Welcome back, ${userData.name}!`, {
      description: `Signed in to ${userBusinessName}`,
    });
  };

  const logout = async (skipApiCall = false) => {
    const currentBusinessName = businessName;
    try {
      if (!skipApiCall) {
        await api.logout();
      }
    } catch (error) {
      console.error("Logout API call failed:", error);
    } finally {
      dispatch(logoutAction());
      storageLogout();

      if (skipApiCall) {
        toast.error("Session expired. Please login again.");
      } else {
        toast.success("Signed out successfully", {
          description: `You've been logged out of ${currentBusinessName || "your account"}`,
        });
      }
      router.push("/login");
    }
  };

  const changeBusiness = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error("Logout API call failed during change business:", error);
    }
    dispatch(changeBusinessAction());
    storageChangeBusiness();
    toast.info("Business cleared", {
      description: "You can now sign in to a different business",
    });
    router.push("/login");
  };

  const updateUser = (updates: Partial<User>) => {
    dispatch(updateUserAction(updates));
    if (user) {
      setUserData({ ...user, ...updates });
    }
  };

  return {
    user,
    businessId,
    businessName,
    deviceId,
    login,
    logout,
    changeBusiness,
    updateUser,
    isLoading,
    isFirstTimeSetup
  };
}
