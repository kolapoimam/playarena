import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** Profiles only accept letters in names, so Google names like "Ada Obi-Lawal" are cleaned first. */
const letters = (v?: unknown) => {
  const s = String(v ?? "").replace(/[^a-zA-Z]/g, "");
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";
};

export function namesFor(user: User) {
  const meta = { ...(user.user_metadata || {}), ...(user.identities?.find((i) => i.provider === "google")?.identity_data || {}) } as Record<string, unknown>;
  const full = String(meta.full_name || meta.name || "").trim().split(/\s+/).filter(Boolean);
  const first = letters(meta.first_name) || letters(meta.given_name) || letters(full[0]) || letters(user.email?.split("@")[0]) || "Sport";
  const last = letters(meta.last_name) || letters(meta.family_name) || (full.length > 1 ? letters(full[full.length - 1]) : "") || "User";
  return { first, last };
}

const checked = new Set<string>();

/**
 * Makes sure a signed in user has a profile row. New Google accounts get one with clean names.
 * Existing profiles are left as they are. Never throws.
 */
export async function ensureProfile(user?: User | null) {
  if (!user || checked.has(user.id)) return;
  checked.add(user.id);
  try {
    const { data, error } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
    if (error || data) return;
    const { first, last } = namesFor(user);
    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id,
      email: user.email,
      first_name: first,
      last_name: last,
      is_initial_setup: true,
      updated_at: new Date().toISOString(),
    } as never);
    if (insertError && !/duplicate|already exists/i.test(insertError.message)) console.warn("Profile create", insertError.message);
  } catch (e) {
    checked.delete(user.id);
    console.warn("Profile check", e);
  }
}

/** Reads a sign in error Supabase sent back in the address and removes it from the address bar. */
export function takeAuthError(): string | null {
  if (typeof window === "undefined") return null;
  const q = new URLSearchParams(window.location.search);
  const h = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const raw = q.get("error_description") || h.get("error_description");
  if (!raw && !q.get("error") && !h.get("error")) return null;
  const msg = (raw || q.get("error") || h.get("error") || "").replace(/\+/g, " ");
  ["error", "error_code", "error_description"].forEach((k) => q.delete(k));
  const search = q.toString();
  window.history.replaceState(null, "", window.location.pathname + (search ? `?${search}` : ""));
  if (/database error/i.test(msg)) return "We could not create your account just now. Please try again in a moment.";
  if (/access_denied|cancel/i.test(msg)) return "Google sign in was cancelled.";
  return msg;
}
