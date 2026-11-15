import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

// A placeholder lets static builds render the UI demo without Supabase credentials.
// Real Auth/Database requests still require the public project URL and key at runtime.
export const supabase = createClient(
  supabaseUrl ?? "https://not-configured.supabase.co",
  supabasePublishableKey ?? "not-configured",
);
