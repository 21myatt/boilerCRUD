import "react-native-url-polyfill/auto";
import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, processLock } from "@supabase/supabase-js";
import type { SupabaseClient, SupabaseClientOptions } from "@supabase/supabase-js";
import { normalizeAppEnv } from "./app-env";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
const appEnv = normalizeAppEnv(process.env.EXPO_PUBLIC_APP_ENV ?? process.env.NODE_ENV);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const createMobileSupabaseOptions = (
  accessToken?: string
): SupabaseClientOptions<"public"> => ({
  ...(accessToken ? {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-app-env": appEnv
      }
    }
  } : {
    global: {
      headers: {
        "x-app-env": appEnv
      }
    }
  }),
  auth: {
    ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock
  }
});

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key",
  createMobileSupabaseOptions()
);

export const createAuthorizedSupabaseClient = (accessToken: string): SupabaseClient => createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key",
  createMobileSupabaseOptions(accessToken)
);

if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      void supabase.auth.startAutoRefresh();
      return;
    }

    void supabase.auth.stopAutoRefresh();
  });
}
