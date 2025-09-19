import type { Database } from "@/types/supabase";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env["EXPO_PUBLIC_SUPABASE_URL"] as string;
const SUPABASE_ANON_KEY = process.env[
  "EXPO_PUBLIC_SUPABASE_ANON_KEY"
] as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    "Faltan variables EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY",
  );
}

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
