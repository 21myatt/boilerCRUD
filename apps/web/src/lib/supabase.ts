import { createClient } from "@supabase/supabase-js";
import { normalizeAppEnv } from "./app-env";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required");
}

const appEnv = normalizeAppEnv(import.meta.env.VITE_APP_ENV ?? import.meta.env.MODE);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      "x-app-env": appEnv
    }
  }
});
