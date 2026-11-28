// Signed links for emails, so an unsubscribe link only works for its own user.
import { APP_URL } from "./notify.ts";

const SECRET = Deno.env.get("EMAIL_LINK_SECRET") || Deno.env.get("CRON_SECRET") || "";
const FN_URL = `${Deno.env.get("SUPABASE_URL") ?? ""}/functions/v1`;

async function hmac(text: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text)));
  return [...sig.slice(0, 16)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function unsubscribeUrl(userId: string, list: "engagement" | "feedback" = "engagement") {
  if (!SECRET) return `${APP_URL}/profile/notifications`;
  const t = await hmac(`${userId}:${list}`);
  return `${FN_URL}/email-unsubscribe?u=${encodeURIComponent(userId)}&l=${list}&t=${t}`;
}

export async function checkUnsubscribe(userId: string, list: string, token: string) {
  if (!SECRET || !userId || !token) return false;
  const want = await hmac(`${userId}:${list}`);
  if (want.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}
