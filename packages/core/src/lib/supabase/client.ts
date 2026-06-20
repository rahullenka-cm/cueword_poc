// ============================================================================
// Browser Supabase client (anon key) — used by the live dashboards for reads,
// session writes, and Realtime subscriptions. Lazily created so the app still
// builds/runs before the project keys are provided.
// ============================================================================
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(url && anon);

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
    );
  }
  if (!browserClient) {
    browserClient = createClient(url, anon, {
      realtime: { params: { eventsPerSecond: 10 } },
      // Real Supabase Auth (coach app) needs the session persisted + refreshed.
      // Harmless for the student app, which still uses the POC config auth.
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return browserClient;
}
