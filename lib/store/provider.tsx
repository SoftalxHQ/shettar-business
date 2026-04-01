"use client";

import type React from "react";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "./store";
import { FetchInterceptor } from "@/components/fetch-interceptor";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <PersistGate
        loading={
          <div className="min-h-screen flex items-center justify-center">
            <LoadingSpinner size={40} />
          </div>
        }
        persistor={persistor}
      >
        <FetchInterceptor />
        {children}
      </PersistGate>
    </Provider>
  );
}
