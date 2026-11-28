import { supabase } from "@/integrations/supabase/client";

/**
 * Reporting and blocking. People can report a match, ride, venue or person to the
 * SportCliq team, and block an organiser so their activities stop showing up.
 * Blocked people are saved on the account (so they follow you to every device) and
 * copied to this device so lists can hide them straight away.
 */

export type ReportKind = "match" | "cycling" | "venue" | "person";
/** byName is used for match organisers, whose matches are matched by organiser name */
export type BlockedPerson = { id: string; name: string; byName?: boolean };

export const REPORT_REASONS = [
  "Spam or a scam",
  "Offensive or abusive",
  "Fake or misleading",
  "Safety concern",
  "Something else",
] as const;

const KEY = "sc_blocked";
const listeners = new Set<() => void>();

function read(): BlockedPerson[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v.filter((p) => p && typeof p.id === "string") : [];
  } catch {
    return [];
  }
}

function write(list: BlockedPerson[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage full or blocked */
  }
  listeners.forEach((fn) => fn());
}

export const blockedPeople = (): BlockedPerson[] => read();

const norm = (s?: string | null) => String(s || "").trim().toLowerCase();

/** True when the signed in person has blocked this user, by account or by organiser name. */
export function isBlocked(userId?: string | null, name?: string | null) {
  const list = read();
  if (!list.length) return false;
  return list.some((p) => (userId && p.id === userId) || (p.byName && name && norm(p.name) === norm(name)));
}

export function onBlockedChange(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Copies the account's blocked list to this device. Called when someone signs in. */
export function syncBlockedFromAccount(meta?: Record<string, unknown> | null) {
  const list = (meta?.blocked_people as BlockedPerson[] | undefined) || [];
  write(Array.isArray(list) ? list : []);
}

async function save(list: BlockedPerson[]) {
  const { error } = await supabase.auth.updateUser({ data: { blocked_people: list } });
  if (error) throw error;
  write(list);
}

export async function blockPerson(p: BlockedPerson) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Sign in to block someone.");
  if (data.user.id === p.id) throw new Error("You cannot block yourself.");
  const myName = norm([data.user.user_metadata?.first_name, data.user.user_metadata?.last_name].filter(Boolean).join(" "));
  if (p.byName && myName && myName === norm(p.name)) throw new Error("You cannot block yourself.");
  const current = (data.user.user_metadata?.blocked_people as BlockedPerson[] | undefined) || read();
  if (current.some((x) => x.id === p.id)) return write(current);
  await save([...current, { id: p.id, name: (p.name || "Someone").slice(0, 80), ...(p.byName ? { byName: true } : {}) }]);
}

export async function unblockPerson(id: string) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Sign in first.");
  const current = (data.user.user_metadata?.blocked_people as BlockedPerson[] | undefined) || read();
  await save(current.filter((x) => x.id !== id));
}

/** Sends a report to the SportCliq team. They review reports within 24 hours. */
export async function reportContent(r: { kind: ReportKind; id: string; title: string; reason: string; details?: string; ownerId?: string | null }) {
  const { error } = await supabase.functions.invoke("send-notification", {
    body: {
      event: "content_reported",
      kind: r.kind,
      target_id: r.id,
      title: r.title.slice(0, 160),
      reason: r.reason,
      details: (r.details || "").slice(0, 600),
      owner_id: r.ownerId || null,
      page: typeof window !== "undefined" ? window.location.pathname : "",
    },
  });
  if (error) throw error;
}
