"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAppDispatch } from "@/lib/store/hooks";
import { logout } from "@/lib/store/slices/authSlice";
import { logout as storageLogout } from "@/lib/storage";

export function FetchInterceptor() {
  const dispatch = useAppDispatch();
  const router = useRouter();

  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);

        if (response.status === 401) {
          const url =
            typeof args[0] === "string"
              ? args[0]
              : (args[0] as Request).url || "";

          if (
            !url.includes("/users/sign_in") &&
            !url.includes("/users/sign_out")
          ) {
            dispatch(logout());
            storageLogout();
            toast.error("Session expired. Please login again.");
            router.push("/login");
          }
        }

        return response;
      } catch (error) {
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [dispatch, router]);

  return null;
}
