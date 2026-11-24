// Shared helpers for SportCliq notifications (OneSignal push and Resend email).
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const APP_URL = Deno.env.get("FRONTEND_URL") || "https://app.sportcliq.com";
const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID") ?? "";
const ONESIGNAL_API_KEY = Deno.env.get("ONESIGNAL_API_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
export const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || "SportCliq <hello@sportcliq.com>";
export const REPLY_TO = "sportcliqapp@gmail.com";

const ALLOWED = (Deno.env.get("ALLOWED_ORIGINS") || "https://app.sportcliq.com,https://sportcliq.com,http://localhost:8080,http://localhost:5173")
  .split(",").map((s) => s.trim()).filter(Boolean);

export function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  const ok = ALLOWED.includes(origin) || /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin);
  return {
    "Access-Control-Allow-Origin": ok ? origin : ALLOWED[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

export function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });
}

export function admin(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
    auth: { persistSession: false },
  });
}

/** True if an ISO date is within the last `minutes`. Stops old records being replayed. */
export function recent(iso?: string | null, minutes = 15) {
  if (!iso) return false;
  const age = Date.now() - new Date(iso).getTime();
  return age >= -60_000 && age <= minutes * 60_000;
}

export const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

// ---------- push ----------

export async function sendPush(externalIds: string[], title: string, message: string, path: string) {
  if (!externalIds.length) return { ok: true, skipped: "no recipients" };
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) return { ok: false, error: "OneSignal secrets missing" };
  // New OneSignal keys (os_v2_...) use the Key scheme. Older keys use Basic.
  const scheme = ONESIGNAL_API_KEY.startsWith("os_v2") ? "Key" : "Basic";
  const res = await fetch("https://api.onesignal.com/notifications?c=push", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `${scheme} ${ONESIGNAL_API_KEY}` },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      target_channel: "push",
      include_aliases: { external_id: externalIds },
      headings: { en: title },
      contents: { en: message },
      url: APP_URL + path,
      chrome_web_icon: `${APP_URL}/icons/icon-192x192.png`,
    }),
  });
  const text = await res.text();
  if (!res.ok) console.error("OneSignal error", res.status, text);
  return { ok: res.ok, status: res.status, body: text.slice(0, 300) };
}

// ---------- email ----------

export function emailShell(title: string, bodyHtml: string, cta?: { label: string; path: string }) {
  return `<!doctype html><html><body style="margin:0;background:#F4F5F1;font-family:Arial,Helvetica,sans-serif;color:#0E1411">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5F1;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #E5E7EB">
<tr><td style="background:#16A34A;padding:22px 28px"><img src="${APP_URL}/icons/icon-192x192.png" width="40" height="40" alt="SportCliq" style="vertical-align:middle;border-radius:10px"> <span style="color:#fff;font-size:20px;font-weight:bold;vertical-align:middle;margin-left:8px">SportCliq</span></td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 14px;font-size:22px;line-height:1.25">${esc(title)}</h1>
<div style="font-size:15px;line-height:1.6;color:#374151">${bodyHtml}</div>
${cta ? `<p style="margin:24px 0 0"><a href="${APP_URL}${cta.path}" style="display:inline-block;background:#16A34A;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px">${esc(cta.label)}</a></p>` : ""}
</td></tr>
<tr><td style="padding:18px 28px;background:#F9FAFB;font-size:12px;color:#6B7280">You can change your notification settings in the SportCliq app under Profile, Settings. Questions? Reply to this email or write to ${REPLY_TO}.</td></tr>
</table></td></tr></table></body></html>`;
}

export async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) return { ok: false, error: "RESEND_API_KEY missing" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: EMAIL_FROM, to: [to], reply_to: REPLY_TO, subject, html }),
  });
  const text = await res.text();
  if (!res.ok) console.error("Resend error", res.status, text);
  return { ok: res.ok, status: res.status, body: text.slice(0, 300) };
}

// ---------- user preferences ----------

type Pref = { enabled: boolean; type: "push" | "email" | "both" };

/**
 * Sends one notification to each user, by push and or email, following each
 * user's settings in user_notifications. Users with no saved setting get push,
 * which matches the defaults shown in the app.
 */
export async function notifyUsers(
  db: SupabaseClient,
  userIds: (string | null | undefined)[],
  eventType: string,
  title: string,
  message: string,
  path: string,
) {
  const ids = [...new Set(userIds.filter((x): x is string => !!x))];
  if (!ids.length) return { push: 0, email: 0 };

  const { data: rows } = await db
    .from("user_notifications")
    .select("user_id, is_enabled, notification_type")
    .eq("event_type", eventType)
    .in("user_id", ids);
  const prefs = new Map<string, Pref>();
  for (const r of rows ?? []) prefs.set(r.user_id, { enabled: r.is_enabled !== false, type: (r.notification_type || "push") as Pref["type"] });

  const push: string[] = [];
  const email: string[] = [];
  for (const id of ids) {
    const p = prefs.get(id) ?? { enabled: true, type: "push" };
    if (!p.enabled) continue;
    if (p.type === "push" || p.type === "both") push.push(id);
    if (p.type === "email" || p.type === "both") email.push(id);
  }

  const results: unknown[] = [];
  if (push.length) results.push(await sendPush(push, title, message, path));
  for (const id of email) {
    const { data } = await db.auth.admin.getUserById(id);
    const to = data?.user?.email;
    if (to) results.push(await sendEmail(to, title, emailShell(title, `<p>${esc(message)}</p>`, { label: "Open SportCliq", path })));
  }
  return { push: push.length, email: email.length, results };
}
