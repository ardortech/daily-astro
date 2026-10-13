// Supabase client for the browser: publishable key + anonymous auth, one user per device.
// Loaded lazily by sync.js so it stays out of the first-paint bundle.
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// null when the env vars are missing (local dev without .env): the app runs on localStorage only.
export const supabase = url && key ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } }) : null;

// The signed-in user, signing this device in anonymously on first launch.
export async function ensureUser() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return session.user;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.user;
}
