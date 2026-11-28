import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppMode = "football" | "cycling" | "horse_riding" | "paintball";

export const APP_MODES: { id: AppMode; label: string; sub: string; live: boolean }[] = [
  { id: "football", label: "Football", sub: "Matches and venues first", live: true },
  { id: "cycling", label: "Cycling", sub: "Group rides first", live: true },
  { id: "horse_riding", label: "Horse riding", sub: "Stables and rides, coming soon", live: false },
  { id: "paintball", label: "Paintballing", sub: "Arenas and sessions, coming soon", live: false },
];

const KEY = "sc_app_mode";
const EVT = "sc-app-mode";
const valid = (v: unknown): v is AppMode => APP_MODES.some((m) => m.id === v);

export function getAppMode(): AppMode {
  try { const v = localStorage.getItem(KEY); if (valid(v)) return v; } catch { /* ignore */ }
  return "football";
}

/** Saves the mode on this device and, when signed in, on the profile so it follows the user. */
export async function setAppMode(mode: AppMode) {
  try { localStorage.setItem(KEY, mode); } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent(EVT, { detail: mode }));
  try {
    const { data } = await supabase.auth.getSession();
    const id = data.session?.user?.id;
    if (id) await supabase.from("profiles").update({ preferred_mode: mode } as never).eq("id", id);
  } catch { /* the column may not exist yet, the device copy still works */ }
}

/** Picks up a mode saved on the profile from another device. */
export async function syncAppModeFromProfile() {
  try {
    const { data } = await supabase.auth.getSession();
    const id = data.session?.user?.id;
    if (!id) return;
    const { data: p, error } = await supabase.from("profiles").select("preferred_mode").eq("id", id).maybeSingle();
    const v = (p as any)?.preferred_mode;
    if (!error && valid(v) && v !== getAppMode()) {
      try { localStorage.setItem(KEY, v); } catch { /* ignore */ }
      window.dispatchEvent(new CustomEvent(EVT, { detail: v }));
    }
  } catch { /* ignore */ }
}

export function useAppMode(): AppMode {
  const [mode, setMode] = useState<AppMode>(getAppMode());
  useEffect(() => {
    const h = (e: Event) => { const v = (e as CustomEvent).detail; if (valid(v)) setMode(v); };
    window.addEventListener(EVT, h);
    syncAppModeFromProfile();
    return () => window.removeEventListener(EVT, h);
  }, []);
  return mode;
}
