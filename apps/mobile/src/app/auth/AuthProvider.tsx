import { createSupabaseAuthBindings } from "@imsys/auth";
import { supabase } from "../../lib/supabase";

export const { AuthProvider, useAuth } = createSupabaseAuthBindings(supabase);
