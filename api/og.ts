// Share image for a match or ride, 1200x630. Used as og:image by /api/share.
// GET /api/og?k=match|ride&t=Title&d=Thu, 26 Nov&tm=4:00 PM&p=Venue&pr=₦2,000&s=3 spots left
import { ImageResponse } from "@vercel/og";

export const config = { runtime: "edge" };

type El = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, ...children: unknown[]): El => ({
  type,
  props: { style: { display: "flex", ...style }, children: children.length === 1 ? children[0] : children },
});
const img = (src: string, style: Record<string, unknown>): El => ({ type: "img", props: { src, style } });

const clip = (s: string | null, n: number) => (s ? (s.length > n ? s.slice(0, n - 1) + "…" : s) : "");

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const q = url.searchParams;
  const kind = q.get("k") === "ride" ? "ride" : "match";
  const title = clip(q.get("t") || (kind === "ride" ? "Group ride" : "Football match"), 46);
  const date = clip(q.get("d"), 22);
  const time = clip(q.get("tm"), 12);
  const place = clip(q.get("p"), 40);
  const price = clip((q.get("pr") || "").replace("₦", "NGN "), 16);
  const spots = clip(q.get("s"), 26);
  const accent = kind === "ride" ? "#F97316" : "#22C55E";

  const [f500, f800, e500, e800] = await Promise.all(
    [
      "/og/plus-jakarta-sans-latin-500-normal.woff",
      "/og/plus-jakarta-sans-latin-800-normal.woff",
      "/og/plus-jakarta-sans-latin-ext-500-normal.woff",
      "/og/plus-jakarta-sans-latin-ext-800-normal.woff",
    ].map((p) => fetch(origin + p).then((r) => r.arrayBuffer())),
  );

  const chip = (text: string) =>
    h("div", { alignItems: "center", height: 52, padding: "0 22px", borderRadius: 99, background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.22)", color: "#FFFFFF", fontSize: 26, fontWeight: 500 }, text);

  const tree = h(
    "div",
    { width: 1200, height: 630, position: "relative", background: "#0E1411", fontFamily: "Jakarta" },
    img(`${origin}/og/${kind === "ride" ? "cycling" : "football"}.jpg`, { position: "absolute", left: 0, top: 0, width: 1200, height: 630, objectFit: "cover" }),
    h("div", { position: "absolute", left: 0, top: 0, width: 1200, height: 630, backgroundImage: "linear-gradient(90deg, rgba(14,20,17,0.94) 0%, rgba(14,20,17,0.82) 52%, rgba(14,20,17,0.25) 100%)" }),
    h(
      "div",
      { position: "absolute", left: 64, top: 56, right: 64, bottom: 56, flexDirection: "column", justifyContent: "space-between" },
      h(
        "div",
        { alignItems: "center", justifyContent: "space-between" },
        img(`${origin}/brand/sportcliq-wordmark-white.png`, { height: 58 }),
        h("div", { alignItems: "center", height: 50, padding: "0 24px", borderRadius: 99, background: accent, color: "#0E1411", fontSize: 22, fontWeight: 800, letterSpacing: 3 }, kind === "ride" ? "GROUP RIDE" : "FOOTBALL MATCH"),
      ),
      h(
        "div",
        { flexDirection: "column", gap: 22, maxWidth: 820 },
        h("div", { color: "#FFFFFF", fontSize: title.length > 28 ? 64 : 80, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2 }, title),
        h("div", { gap: 12, flexWrap: "wrap" }, ...[date, time, place].filter(Boolean).map(chip)),
      ),
      h(
        "div",
        { alignItems: "flex-end", justifyContent: "space-between" },
        h(
          "div",
          { flexDirection: "column", gap: 6 },
          h("div", { color: "#FFFFFF", fontSize: 54, fontWeight: 800, letterSpacing: -1 }, price || "Free"),
          spots ? h("div", { color: accent, fontSize: 26, fontWeight: 800 }, spots) : h("div", {}, ""),
        ),
        h("div", { alignItems: "center", height: 64, padding: "0 30px", borderRadius: 99, background: "#FFFFFF", color: "#0E1411", fontSize: 26, fontWeight: 800 }, kind === "ride" ? "Join the ride on app.sportcliq.com" : "Grab your slot on app.sportcliq.com"),
      ),
    ),
  );

  return new ImageResponse(tree as any, {
    width: 1200,
    height: 630,
    fonts: [
      { name: "Jakarta", data: f500, weight: 500, style: "normal" },
      { name: "Jakarta", data: f800, weight: 800, style: "normal" },
      { name: "Jakarta", data: e500, weight: 500, style: "normal" },
      { name: "Jakarta", data: e800, weight: 800, style: "normal" },
    ],
    headers: { "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" },
  });
}
