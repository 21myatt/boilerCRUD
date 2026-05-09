import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { shouldRetryQuery } from "@imsys/client";
import { Toaster } from "sonner";
import { AuthProvider } from "../auth/AuthProvider";
import { i18n } from "../i18n";

void i18n;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: shouldRetryQuery
    },
    mutations: {
      retry: false
    }
  }
});

export const AppProviders = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      {children}
      <Toaster position="top-right" richColors />
    </AuthProvider>
  </QueryClientProvider>
);
