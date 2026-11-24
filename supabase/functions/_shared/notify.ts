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

/** Stable UUID from any text, so retries of the same notification are ignored by OneSignal. */
export async function stableUuid(text: string) {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))).slice(0, 16);
  h[6] = (h[6] & 0x0f) | 0x50; h[8] = (h[8] & 0x3f) | 0x80;
  const x = [...h].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

export async function sendPush(externalIds: string[], title: string, message: string, path: string, idempotencyKey?: string) {
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
      ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
    }),
  });
  const text = await res.text();
  if (!res.ok) console.error("OneSignal error", res.status, text);
  return { ok: res.ok, status: res.status, body: text.slice(0, 300) };
}

// ---------- email ----------

// Email layout shared by every SportCliq email. Works in light and dark mode:
// text never sits on a green fill except white button text, the logo mark reads on both
// backgrounds, and dark mode clients get matching dark colours through the style block.
function emailLayout(o: {
  brandUrl: string
  title: string
  bodyHtml: string
  preheader?: string
  cta?: { label: string; url: string }
  details?: [string, string][]
  footerHtml: string
}) {
  const details = o.details?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="panel" style="margin:22px 0 0;background:#F4F7F5;border-radius:14px">
${o.details.map(([k, v], i) => `<tr><td class="muted" style="padding:${i ? '0' : '14px'} 18px 10px;font-size:13px;color:#5B6660">${esc(k)}</td><td class="text" align="right" style="padding:${i ? '0' : '14px'} 18px 10px;font-size:14px;font-weight:700;color:#0E1411">${esc(v)}</td></tr>`).join('')}
<tr><td colspan="2" style="height:4px;line-height:4px;font-size:4px">&nbsp;</td></tr></table>`
    : ''
  const cta = o.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 4px"><tr><td class="btn" bgcolor="#15803D" style="border-radius:999px;background:#15803D">
<a href="${o.cta.url}" class="btn-a" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:999px;-webkit-text-fill-color:#FFFFFF">${esc(o.cta.label)}&nbsp;&rarr;</a></td></tr></table>`
    : ''
  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(o.title)}</title>
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  body { margin:0; padding:0; }
  a { color:#15803D; }
  @media (max-width:600px) { .card-pad { padding:26px 22px !important; } .h1 { font-size:22px !important; } }
  @media (prefers-color-scheme: dark) {
    .bg { background:#0B100D !important; }
    .card { background:#141B17 !important; border-color:#243029 !important; }
    .panel { background:#1B2520 !important; }
    .text, .h1, .brand { color:#F2F5F3 !important; }
    .muted { color:#A3AEA7 !important; }
    .rule { border-color:#243029 !important; }
    .foot { background:#101612 !important; border-top-color:#243029 !important; }
    a.link { color:#4ADE80 !important; }
  }
  [data-ogsc] .bg { background:#0B100D !important; }
  [data-ogsc] .card { background:#141B17 !important; border-color:#243029 !important; }
  [data-ogsc] .panel { background:#1B2520 !important; }
  [data-ogsc] .text, [data-ogsc] .h1, [data-ogsc] .brand { color:#F2F5F3 !important; }
  [data-ogsc] .muted { color:#A3AEA7 !important; }
  [data-ogsc] .foot { background:#101612 !important; border-top-color:#243029 !important; }
  [data-ogsc] .btn-a { color:#FFFFFF !important; }
</style>
</head>
<body class="bg" style="margin:0;padding:0;background:#F3F5F2;font-family:'Plus Jakarta Sans',Segoe UI,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${esc(o.preheader || o.title)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="bg" style="background:#F3F5F2"><tr><td align="center" style="padding:32px 14px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding:0 6px 18px">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td style="vertical-align:middle"><img src="${o.brandUrl}/brand/sportcliq-mark.png" width="36" height="36" alt="" style="display:block;width:36px;height:36px;border-radius:10px;border:0"></td>
    <td class="brand" style="vertical-align:middle;padding-left:10px;font-size:19px;font-weight:800;letter-spacing:-0.3px;color:#0E1411">SportCliq</td>
  </tr></table>
</td></tr>
<tr><td class="card" style="background:#FFFFFF;border:1px solid #E4E8E5;border-radius:22px;overflow:hidden">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr><td style="height:5px;line-height:5px;font-size:5px;background:#35B551">&nbsp;</td></tr>
  <tr><td class="card-pad" style="padding:34px 34px 30px">
    <h1 class="h1" style="margin:0 0 14px;font-size:24px;line-height:1.25;font-weight:800;letter-spacing:-0.4px;color:#0E1411">${esc(o.title)}</h1>
    <div class="text" style="font-size:15px;line-height:1.65;color:#2B3530">${o.bodyHtml}</div>
    ${details}
    ${cta}
  </td></tr>
  <tr><td class="foot muted" style="padding:18px 34px 22px;background:#F8FAF8;border-top:1px solid #EDF0EE;font-size:12px;line-height:1.6;color:#69746D">${o.footerHtml}</td></tr>
  </table>
</td></tr>
<tr><td class="muted" align="center" style="padding:18px 6px 0;font-size:11px;line-height:1.6;color:#8A948E">SportCliq &middot; Play, organise and book sports near you</td></tr>
</table>
</td></tr></table>
</body></html>`
}

export function emailShell(title: string, bodyHtml: string, cta?: { label: string; path: string }, extra?: { preheader?: string; details?: [string, string][] }) {
  return emailLayout({
    brandUrl: APP_URL, title, bodyHtml, preheader: extra?.preheader, details: extra?.details,
    cta: cta ? { label: cta.label, url: `${APP_URL}${cta.path}` } : undefined,
    footerHtml: `You can change which emails you get in the SportCliq app under Profile, Settings, Notifications. Questions? Reply to this email or write to <a class="link" href="mailto:${REPLY_TO}" style="color:#15803D">${REPLY_TO}</a>.`,
  });
}

export async function sendEmail(to: string, subject: string, html: string, idempotencyKey?: string) {
  if (!RESEND_API_KEY) return { ok: false, error: "RESEND_API_KEY missing" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
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
  /** When set, each user gets their own push and email keyed on this, so repeats are dropped. */
  onceKey?: string,
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
  if (onceKey) {
    for (const id of push) results.push(await sendPush([id], title, message, path, await stableUuid(`${onceKey}:push:${id}`)));
  } else if (push.length) {
    results.push(await sendPush(push, title, message, path));
  }
  for (const id of email) {
    const { data } = await db.auth.admin.getUserById(id);
    const to = data?.user?.email;
    if (to) results.push(await sendEmail(to, title, emailShell(title, `<p style="margin:0">${esc(message)}</p>`, { label: "Open SportCliq", path }, { preheader: message }), onceKey ? `${onceKey}:email:${id}` : undefined));
  }
  return { push: push.length, email: email.length, results };
}
