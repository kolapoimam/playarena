// Builds the Supabase sign in emails (confirm sign up, reset password and the rest) in the
// same design as every other SportCliq email. The layout below is copied from
// supabase/functions/_shared/notify.ts. Change both together.
//
//   node supabase/auth-emails/build.mjs          writes the HTML files next to this script
//   node supabase/auth-emails/build.mjs --push   also saves them to Supabase (needs SUPABASE_ACCESS_TOKEN)
//
// Supabase fills in {{ .ConfirmationURL }}, {{ .Token }}, {{ .Email }} and {{ .NewEmail }}.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP_URL = "https://app.sportcliq.com";
const REPLY_TO = "sportcliqapp@gmail.com";
const PROJECT_REF = "qxafigbrfpxdklwoqkxj";
const SOCIAL = {
  x: "https://x.com/SportCliq",
  instagram: "https://www.instagram.com/SportCliqHQ",
  whatsapp: "https://whatsapp.com/channel/0029Vb69lS19RZAYCY9ors35",
};
const ICONS = "https://app.sportcliq.com/brand";
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function socialRow() {
  const icon = (href, file, label) =>
    `<td style="padding:0 7px"><a href="${href}" title="${label}" style="display:inline-block;text-decoration:none"><img src="${ICONS}/${file}" width="36" height="36" alt="${label}" style="display:block;width:36px;height:36px;border:0;border-radius:18px"></a></td>`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto"><tr>
${icon(SOCIAL.whatsapp, "social-wa.png", "SportCliq on WhatsApp")}
${icon(SOCIAL.x, "social-x.png", "SportCliq on X")}
${icon(SOCIAL.instagram, "social-ig.png", "SportCliq on Instagram")}
</tr></table>`;
}


function emailLayout(o) {
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
  [data-ogsc] .soc { color:#FFFFFF !important; }
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
<tr><td align="center" style="padding:20px 6px 0">${socialRow()}</td></tr>
<tr><td class="muted" align="center" style="padding:14px 6px 0;font-size:11px;line-height:1.6;color:#8A948E">SportCliq &middot; Play, organise and book sports near you${o.unsubscribeUrl ? `<br><a href="${o.unsubscribeUrl}" class="link" style="color:#8A948E;text-decoration:underline">Unsubscribe from these emails</a>` : ""}</td></tr>
</table>
</td></tr></table>
</body></html>`
}


const footer = `You got this email because this address was used on SportCliq. If that was not you, you can ignore it and nothing will change. Questions? Write to <a class="link" href="mailto:${REPLY_TO}" style="color:#15803D">${REPLY_TO}</a>.`;

const fallback = (url) =>
  `<p class="muted" style="margin:22px 0 0;font-size:12.5px;line-height:1.6;color:#69746D">Button not working? Copy this link into your browser.<br><a class="link" href="${url}" style="color:#15803D;word-break:break-all">${url}</a></p>`;

const codeBox = (token) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" class="panel" style="margin:20px 0 0;background:#F4F7F5;border-radius:14px"><tr><td class="text" style="padding:16px 26px;font-size:30px;font-weight:800;letter-spacing:8px;color:#0E1411;font-family:'SFMono-Regular',Menlo,Consolas,monospace">${token}</td></tr></table>`;

// The extra part (the copyable link or the code) goes under the button
const mail = (title, body, cta, preheader, extra = "") => {
  const html = emailLayout({ brandUrl: APP_URL, title, preheader, bodyHtml: body, cta, footerHtml: footer });
  const marker = '\n  </td></tr>\n  <tr><td class="foot';
  if (!html.includes(marker)) throw new Error("Layout changed, update build.mjs");
  return html.replace(marker, extra + marker);
};

const URL_ = "{{ .ConfirmationURL }}";

export const TEMPLATES = {
  confirmation: {
    subject: "Confirm your SportCliq email",
    html: mail(
      "Confirm your email",
      `<p style="margin:0">Welcome to SportCliq. Tap the button to confirm <strong>{{ .Email }}</strong> and finish setting up your account.</p><p style="margin:12px 0 0">The link works once and expires in 24 hours.</p>`,
      { label: "Confirm my email", url: URL_ },
      "Confirm your email to start playing on SportCliq.",
      fallback(URL_),
    ),
  },
  recovery: {
    subject: "Reset your SportCliq password",
    html: mail(
      "Reset your password",
      `<p style="margin:0">We got a request to reset the password for <strong>{{ .Email }}</strong>. Tap the button to choose a new one.</p><p style="margin:12px 0 0">The link works once and expires in 1 hour. If you did not ask for this, ignore this email and your password stays the same.</p>`,
      { label: "Choose a new password", url: URL_ },
      "Choose a new password for your SportCliq account.",
      fallback(URL_),
    ),
  },
  magic_link: {
    subject: "Your SportCliq sign in link",
    html: mail(
      "Sign in to SportCliq",
      `<p style="margin:0">Tap the button to sign in as <strong>{{ .Email }}</strong>. The link works once and expires soon.</p>`,
      { label: "Sign in", url: URL_ },
      "Your one tap sign in link for SportCliq.",
      fallback(URL_),
    ),
  },
  email_change: {
    subject: "Confirm your new SportCliq email",
    html: mail(
      "Confirm your new email",
      `<p style="margin:0">You asked to change your SportCliq email from <strong>{{ .Email }}</strong> to <strong>{{ .NewEmail }}</strong>. Tap the button to confirm.</p><p style="margin:12px 0 0">If you did not ask for this, ignore this email and nothing changes.</p>`,
      { label: "Confirm new email", url: URL_ },
      "Confirm the new email on your SportCliq account.",
      fallback(URL_),
    ),
  },
  invite: {
    subject: "You're invited to SportCliq",
    html: mail(
      "You're invited to SportCliq",
      `<p style="margin:0">You have been invited to join SportCliq with <strong>{{ .Email }}</strong>. Find football matches and group rides near you, book venues and pay in a few taps.</p>`,
      { label: "Accept the invite", url: URL_ },
      "Join SportCliq and start playing.",
      fallback(URL_),
    ),
  },
  reauthentication: {
    subject: "Your SportCliq verification code",
    html: mail(
      "Your verification code",
      `<p style="margin:0">Enter this code in SportCliq to confirm it is you.</p>`,
      undefined,
      "Your SportCliq verification code.",
      codeBox("{{ .Token }}") + `<p class="muted" style="margin:16px 0 0;font-size:13px;color:#69746D">If you did not ask for this code, you can ignore this email.</p>`,
    ),
  },
};

for (const [name, t] of Object.entries(TEMPLATES)) fs.writeFileSync(path.join(HERE, `${name}.html`), t.html);
console.log(`Wrote ${Object.keys(TEMPLATES).length} templates`);

if (process.argv.includes("--push")) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    console.error("SUPABASE_ACCESS_TOKEN is not set");
    process.exit(1);
  }
  const body = {};
  for (const [name, t] of Object.entries(TEMPLATES)) {
    body[`mailer_subjects_${name}`] = t.subject;
    body[`mailer_templates_${name}_content`] = t.html;
  }
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error("Supabase refused the templates", res.status, (await res.text()).slice(0, 500));
    process.exit(1);
  }
  console.log("Saved the sign in emails to Supabase");
}
