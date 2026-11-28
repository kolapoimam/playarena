// One click unsubscribe from SportCliq engagement or feedback emails.
import { admin } from "../_shared/notify.ts";
import { checkUnsubscribe } from "../_shared/links.ts";

const page = (title: string, body: string) => new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;background:#F3F5F2;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#0E1411">
<div style="max-width:460px;margin:60px auto;padding:32px;background:#FFFFFF;border-radius:22px;border:1px solid #E4E8E5">
<div style="font-size:19px;font-weight:800;margin-bottom:18px">SportCliq</div>
<h1 style="margin:0 0 10px;font-size:22px">${title}</h1><p style="margin:0;font-size:15px;line-height:1.6;color:#2B3530">${body}</p>
<p style="margin:22px 0 0"><a href="https://app.sportcliq.com/profile/notifications" style="color:#15803D;font-weight:700">Manage your notifications</a></p>
</div></body></html>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const u = url.searchParams.get("u") || "";
  const l = url.searchParams.get("l") === "feedback" ? "feedback" : "engagement";
  const t = url.searchParams.get("t") || "";
  if (!(await checkUnsubscribe(u, l, t))) return page("Link not valid", "This unsubscribe link is not valid. You can turn emails off in the app under Profile, Settings, Notifications.");
  const db = admin();
  const { error } = await db.from("email_preferences").upsert({ user_id: u, [l]: false, unsubscribed_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) {
    console.error("unsubscribe", error);
    return page("Something went wrong", "We could not update your preference just now. Please try again in a minute.");
  }
  return page("You are unsubscribed", l === "feedback" ? "You will not get feedback requests after activities any more." : "You will not get SportCliq tips and reminders any more. Tickets, payments and booking emails still arrive.");
});
