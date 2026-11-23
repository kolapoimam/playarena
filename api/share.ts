// Serves the app shell for /match/:slug and /cycling/:slug with link preview tags for
// that activity, so WhatsApp, X and Facebook show a proper title, copy and image.
// Any failure falls back to the plain app shell, so the page always loads.
export const config = { runtime: "edge" };

const SUPABASE_URL = "https://qxafigbrfpxdklwoqkxj.supabase.co";
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4YWZpZ2JyZnB4ZGtsd29xa3hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4NTkwOTIsImV4cCI6MjA2MjQzNTA5Mn0.UZ6Kq-8SgYAQcXL2nRwz14sl3ly7YEO71PN8bwn948c";
const SITE = "https://app.sportcliq.com";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const naira = (n?: number | null) => (n ? `₦${Number(n).toLocaleString("en-NG")}` : "Free");
const day = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Lagos" });
const time12 = (t: string) => {
  if (!t) return "";
  if (/am|pm/i.test(t)) return t.replace(/^0/, "").toUpperCase();
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

async function rest(path: string) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: ANON, authorization: `Bearer ${ANON}` } });
  if (!r.ok) return null;
  const j = await r.json();
  return Array.isArray(j) ? j[0] : null;
}

type Meta = { title: string; description: string; image: string; url: string; alt: string };

async function metaFor(kind: string, slug: string): Promise<Meta | null> {
  const s = encodeURIComponent(slug);
  if (kind === "match") {
    const m = await rest(`matches?slug=eq.${s}&select=title,match_date,match_time,is_paid,price,total_slots,venue:venues(name,city),players(number_of_slots)`);
    if (!m) return null;
    const taken = (m.players || []).reduce((a: number, p: { number_of_slots?: number }) => a + (p.number_of_slots || 1), 0);
    const left = Math.max((m.total_slots || 0) - taken, 0);
    const price = m.is_paid ? naira(m.price) : "Free";
    const place = m.venue ? `${m.venue.name}${m.venue.city ? `, ${m.venue.city}` : ""}` : "";
    const spots = m.total_slots ? (left ? `${left} of ${m.total_slots} spots left` : "Fully booked") : "";
    const q = new URLSearchParams({ k: "match", t: m.title, d: day(m.match_date), tm: time12(m.match_time), p: place, pr: price, s: spots });
    return {
      title: `${m.title} · ${day(m.match_date)}, ${time12(m.match_time)}`,
      description: `Football at ${place || "a venue near you"}. ${price === "Free" ? "Free to play" : `${price} per player`}${spots ? `, ${spots.toLowerCase()}` : ""}. Grab your slot on SportCliq.`,
      image: `${SITE}/api/og?${q}`,
      url: `${SITE}/match/${slug}`,
      alt: `${m.title}, football match on SportCliq`,
    };
  }
  const e = await rest(`cycling_events?slug=eq.${s}&select=title,event_date,start_time,is_free,price,max_attendees,duration_type,duration_value,start_landmark:landmarks!start_landmark_id(name,state),cycling_attendees(number_of_slots)`);
  if (!e) return null;
  const taken = (e.cycling_attendees || []).reduce((a: number, p: { number_of_slots?: number }) => a + (p.number_of_slots || 1), 0);
  const left = Math.max((e.max_attendees || 0) - taken, 0);
  const price = e.is_free ? "Free" : naira(e.price);
  const place = e.start_landmark ? `${e.start_landmark.name}${e.start_landmark.state ? `, ${e.start_landmark.state}` : ""}` : "";
  const dist = e.duration_value ? `${e.duration_value} ${e.duration_type === "distance" ? "km" : e.duration_type}` : "";
  const spots = e.max_attendees ? (left ? `${left} of ${e.max_attendees} spots left` : "Fully booked") : "";
  const q = new URLSearchParams({ k: "ride", t: e.title, d: day(e.event_date), tm: time12(e.start_time), p: place, pr: price, s: spots });
  return {
    title: `${e.title} · ${day(e.event_date)}, ${time12(e.start_time)}`,
    description: `Group ride from ${place || "a landmark near you"}${dist ? `, ${dist}` : ""}. ${price === "Free" ? "Free to join" : `${price} to join`}. Join the crew on SportCliq.`,
    image: `${SITE}/api/og?${q}`,
    url: `${SITE}/cycling/${slug}`,
    alt: `${e.title}, group ride on SportCliq`,
  };
}

function inject(html: string, m: Meta) {
  const strip = html
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\s+(?:name|property)="(?:description|og:[^"]+|twitter:[^"]+)"[^>]*>\s*/gi, "")
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, "");
  const tags = [
    `<title>${esc(m.title)} | SportCliq</title>`,
    `<meta name="description" content="${esc(m.description)}">`,
    `<link rel="canonical" href="${m.url}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="SportCliq">`,
    `<meta property="og:title" content="${esc(m.title)}">`,
    `<meta property="og:description" content="${esc(m.description)}">`,
    `<meta property="og:url" content="${m.url}">`,
    `<meta property="og:image" content="${esc(m.image)}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="${esc(m.alt)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:site" content="@SportCliq">`,
    `<meta name="twitter:title" content="${esc(m.title)}">`,
    `<meta name="twitter:description" content="${esc(m.description)}">`,
    `<meta name="twitter:image" content="${esc(m.image)}">`,
  ].join("\n    ");
  return strip.replace(/<\/head>/i, `    ${tags}\n  </head>`);
}

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const shell = await fetch(new URL("/index.html", url.origin)).then((r) => r.text());
  const headers = { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=0, s-maxage=300, stale-while-revalidate=3600" };
  try {
    const kind = url.searchParams.get("k") === "ride" ? "ride" : "match";
    const slug = url.searchParams.get("slug") || "";
    const m = slug ? await metaFor(kind, slug) : null;
    return new Response(m ? inject(shell, m) : shell, { headers });
  } catch {
    return new Response(shell, { headers });
  }
}
