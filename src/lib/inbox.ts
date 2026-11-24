import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** A message the SportCliq team sent from the admin portal. */
export interface InboxItem {
  id: string;
  title: string | null;
  message: string;
  link: string | null;
  image_url: string | null;
  sent_at: string;
  read: boolean;
}

type InboxEvent = "view" | "open" | "click";

// The inbox functions are newer than the generated Supabase types
const rpc = (fn: string, args?: Record<string, unknown>) => (supabase.rpc as unknown as (f: string, a?: Record<string, unknown>) => Promise<{ data: any; error: any }>)(fn, args);

let unread = 0;
const listeners = new Set<(n: number) => void>();
const setUnread = (n: number) => {
  unread = Math.max(0, n);
  listeners.forEach((l) => l(unread));
};

export async function fetchInbox(limit = 30, offset = 0): Promise<{ items: InboxItem[]; unread: number }> {
  const { data, error } = await rpc("app_my_notifications", { p_limit: limit, p_offset: offset });
  if (error) throw error;
  const res = { items: (data?.items ?? []) as InboxItem[], unread: Number(data?.unread ?? 0) };
  setUnread(res.unread);
  return res;
}

export async function refreshUnread() {
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) return setUnread(0);
  try {
    await fetchInbox(1, 0);
  } catch {
    /* the bell simply shows no dot */
  }
}

/** Records that a message was seen, opened or its link followed. Safe to call more than once. */
export function trackInbox(id: string, event: InboxEvent) {
  rpc("app_track_notification", { p_id: id, p_event: event }).then(({ error }) => {
    if (error) console.warn("inbox track", error.message);
  });
}

export function markOpened(item: InboxItem) {
  if (!item.read) setUnread(unread - 1);
  trackInbox(item.id, "open");
}

export async function markAllInboxRead() {
  const { error } = await rpc("app_mark_all_notifications_read");
  if (error) throw error;
  setUnread(0);
}

/** Unread count for the bell. Refreshes when the app comes back into focus. */
export function useInboxUnread() {
  const [n, setN] = useState(unread);
  useEffect(() => {
    listeners.add(setN);
    refreshUnread();
    const onFocus = () => document.visibilityState === "visible" && refreshUnread();
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      listeners.delete(setN);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);
  return n;
}

/** Opens an inbox link. App paths stay in the app, full links open in a new tab. */
export function openInboxLink(link: string, navigate: (to: string) => void) {
  if (link.startsWith("/")) navigate(link);
  else if (link.startsWith("https://")) window.open(link, "_blank", "noopener,noreferrer");
}
