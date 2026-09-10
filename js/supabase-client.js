/**
 * Shared Supabase client (ES module).
 * Uses only the public URL + anon key from window.ROTHSCHILD_CONFIG (js/config.js).
 * The anon key is safe to expose in the browser — Row Level Security policies
 * in Supabase are what actually restrict reads/writes, not this key.
 */
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.ROTHSCHILD_CONFIG || {};

let supabase = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.warn(
    "[Rothschild] Supabase is not configured yet. Set SUPABASE_URL and SUPABASE_ANON_KEY in js/config.js. Falling back to static placeholder content."
  );
}

export { supabase };
