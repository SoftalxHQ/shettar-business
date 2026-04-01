"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "./store";
import { FetchInterceptor } from "@/components/fetch-interceptor";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

function StoreGate({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner size={40} />
      </div>
    );
  }

  return (
    <>
      <FetchInterceptor />
      {children}
    </>
  );
}

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <StoreGate>{children}</StoreGate>
      </PersistGate>
    </Provider>
  );
}
