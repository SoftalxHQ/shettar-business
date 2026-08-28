"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/lib/store/hooks";
import { logout } from "@/lib/store/slices/authSlice";
import { logout as storageLogout } from "@/lib/storage";
import { notifySessionExpired } from "@/lib/session-expiry";

const AUTH_URL_SKIP = ["/users/sign_in", "/users/sign_out", "/users/sign_up"];

export function FetchInterceptor() {
  const dispatch = useAppDispatch();
  const router = useRouter();

  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const response = await originalFetch(...args);

      if (response.status === 401) {
        const url =
          typeof args[0] === "string"
            ? args[0]
            : (args[0] as Request).url || "";

        const isAuthEndpoint = AUTH_URL_SKIP.some((path) => url.includes(path));
        if (!isAuthEndpoint && notifySessionExpired()) {
          dispatch(logout());
          storageLogout();
          router.push("/login");
        }
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [dispatch, router]);

  return null;
}
