// Share and save for matches and rides: an on-screen share sheet with ready-made copy,
// and a designed card (light, dark or green) that saves as a sharp PNG.
import { forwardRef, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Bike, CalendarDays, Clock, Copy, Download, Flag, ImageIcon, MapPin, MoreHorizontal, Route, Share2, Trophy, Users,
} from "lucide-react";
import { downloadElementAsPng, useQr } from "@/components/sc/TicketCard";
import { openExternal } from "@/components/sc/external";

export type ShareKind = "match" | "ride";
export type CardTheme = "light" | "dark" | "green";

export type ShareInfo = {
  kind: ShareKind;
  title: string;
  dateLabel: string; // "Thu, 26 Nov"
  timeLabel: string; // "4:00 PM"
  place: string; // venue or start landmark
  city?: string;
  finish?: string; // ride finish landmark
  priceLabel: string; // "₦2,000" or "Free"
  taken: number;
  total: number;
  chips?: string[]; // 5-a-side, Amateur / 18 km, Bring your bike
  stat?: { label: string; value: string }; // ride distance etc.
  url: string;
};

const ACCENT = { match: "#16A34A", ride: "#F97316" } as const;

export function shareText(i: ShareInfo) {
  const left = Math.max(i.total - i.taken, 0);
  const spots = i.total ? `${left} of ${i.total} spots left` : "";
  if (i.kind === "ride") {
    return [
      `Ride with us on ${i.dateLabel} at ${i.timeLabel}.`,
      `${i.title} starts from ${i.place}${i.finish ? ` and finishes at ${i.finish}` : ""}${i.stat ? `, ${i.stat.value}` : ""}.`,
      [i.priceLabel === "Free" ? "Free to join" : `${i.priceLabel} to join`, spots].filter(Boolean).join(", ") + ".",
      `Join the crew on SportCliq ${i.url}`,
    ].join("\n");
  }
  return [
    `Football on ${i.dateLabel} at ${i.timeLabel}.`,
    `${i.title} at ${i.place}${i.city ? `, ${i.city}` : ""}.`,
    [i.priceLabel === "Free" ? "Free to play" : `${i.priceLabel} per player`, spots].filter(Boolean).join(", ") + ".",
    `Grab your slot on SportCliq ${i.url}`,
  ].join("\n");
}

/* ---------- The designed card ---------- */

const THEMES: Record<CardTheme, { bg: string; ink: string; sub: string; panel: string; panelInk: string; line: string; logo: string }> = {
  light: { bg: "#F4F5F1", ink: "#0E1411", sub: "#5B655F", panel: "#FFFFFF", panelInk: "#0E1411", line: "rgba(14,20,17,0.10)", logo: "/brand/sportcliq-wordmark.png" },
  dark: { bg: "#0E1411", ink: "#FFFFFF", sub: "rgba(255,255,255,0.66)", panel: "rgba(255,255,255,0.07)", panelInk: "#FFFFFF", line: "rgba(255,255,255,0.12)", logo: "/brand/sportcliq-wordmark-white.png" },
  green: { bg: "#16A34A", ink: "#FFFFFF", sub: "rgba(255,255,255,0.82)", panel: "#FFFFFF", panelInk: "#0E1411", line: "rgba(255,255,255,0.22)", logo: "/brand/sportcliq-wordmark-white.png" },
};

export const ShareCard = forwardRef<HTMLDivElement, { info: ShareInfo; theme: CardTheme }>(function ShareCard({ info, theme }, ref) {
  const t = THEMES[theme];
  const accent = theme === "green" ? "#FFFFFF" : ACCENT[info.kind];
  const iconBg = theme === "green" ? "#E3F5E9" : info.kind === "ride" ? "#FFEDD5" : "#E3F5E9";
  const iconFg = info.kind === "ride" ? "#C2410C" : "#15803D";
  const qr = useQr(info.url, 360);
  const pct = info.total ? Math.min(100, Math.round((info.taken / info.total) * 100)) : 0;
  const left = Math.max(info.total - info.taken, 0);
  const Sport = info.kind === "ride" ? Bike : Trophy;
  const rows = [
    { icon: CalendarDays, label: "Date", value: info.dateLabel },
    { icon: Clock, label: info.kind === "ride" ? "Starts" : "Kickoff", value: info.timeLabel },
    { icon: MapPin, label: info.kind === "ride" ? "Start" : "Venue", value: info.city && info.kind === "match" ? `${info.place}, ${info.city}` : info.place },
    ...(info.finish ? [{ icon: Flag, label: "Finish", value: info.finish }] : []),
  ];
  return (
    <div ref={ref} style={{ width: 340, background: t.bg, color: t.ink, borderRadius: 28, overflow: "hidden", position: "relative", fontFamily: "Satoshi, 'Plus Jakarta Sans', sans-serif" }}>
      {/* sport art */}
      <svg aria-hidden="true" width="340" height="200" viewBox="0 0 340 200" style={{ position: "absolute", top: 0, right: 0, opacity: theme === "light" ? 0.9 : 1 }} fill="none">
        {info.kind === "match" ? (
          <g stroke={theme === "light" ? "rgba(22,163,74,0.18)" : "rgba(255,255,255,0.14)"} strokeWidth="3">
            <circle cx="300" cy="40" r="70" />
            <path d="M300 -40V120" />
            <rect x="200" y="-10" width="200" height="200" rx="10" />
          </g>
        ) : (
          <g stroke={theme === "light" ? "rgba(249,115,22,0.28)" : "rgba(255,255,255,0.18)"} strokeWidth="5" strokeLinecap="round">
            <path d="M150 170 C 210 150 200 90 260 80 S 330 40 360 10" strokeDasharray="2 14" />
            <circle cx="262" cy="80" r="9" fill={theme === "light" ? "rgba(249,115,22,0.28)" : "rgba(255,255,255,0.18)"} stroke="none" />
          </g>
        )}
      </svg>
      <div style={{ position: "relative", padding: "22px 22px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <img src={t.logo} alt="SportCliq" crossOrigin="anonymous" style={{ height: 26, width: "auto" }} />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 28, padding: "0 12px", borderRadius: 99, background: theme === "green" ? "rgba(255,255,255,0.2)" : info.kind === "ride" ? "#F97316" : "#16A34A", color: "#FFFFFF", fontSize: 11, fontWeight: 800, letterSpacing: "0.1em" }}>
            <Sport size={13} /> {info.kind === "ride" ? "GROUP RIDE" : "FOOTBALL MATCH"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
          <span style={{ display: "inline-flex", alignItems: "center", height: 26, padding: "0 12px", borderRadius: 99, fontSize: 11, fontWeight: 900, letterSpacing: "0.12em", background: info.priceLabel === "Free" ? "#BEF264" : "#FACC15", color: "#0E1411" }}>
            {info.priceLabel === "Free" ? "FREE" : "PAID"}
          </span>
        </div>
        <div style={{ fontSize: info.title.length > 34 ? 22 : info.title.length > 22 ? 26 : 30, lineHeight: 1.18, fontWeight: 900, letterSpacing: "-0.03em", marginTop: -4, paddingBottom: 2, wordBreak: "break-word", overflowWrap: "anywhere" }}>{info.title}</div>
        {!!info.chips?.length && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: -4 }}>
            {info.chips.map((c) => (
              <span key={c} style={{ minHeight: 26, padding: "4px 10px", display: "inline-flex", alignItems: "center", borderRadius: 99, fontSize: 12, lineHeight: "16px", fontWeight: 700, border: `1px solid ${t.line}`, color: t.ink, maxWidth: "100%", wordBreak: "break-word" }}>{c}</span>
            ))}
          </div>
        )}
        <div style={{ background: t.panel, color: t.panelInk, borderRadius: 22, padding: "6px 16px" }}>
          {rows.map((r, idx) => (
            <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderTop: idx ? `1px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#EEF0EA"}` : "none" }}>
              <span style={{ width: 34, height: 34, borderRadius: 11, background: theme === "dark" ? "rgba(255,255,255,0.1)" : iconBg, color: theme === "dark" ? accent : iconFg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <r.icon size={17} />
              </span>
              <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                <span style={{ fontSize: 11, lineHeight: "15px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.55 }}>{r.label}</span>
                <span style={{ fontSize: 15, fontWeight: 800, lineHeight: "20px", paddingBottom: 1, whiteSpace: "normal", wordBreak: "break-word", overflowWrap: "anywhere" }}>{r.value}</span>
              </span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "stretch" }}>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
            <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", columnGap: 8 }}>
              <span style={{ fontSize: info.priceLabel.length > 9 ? 21 : 26, lineHeight: 1.15, fontWeight: 900, letterSpacing: "-0.02em" }}>{info.priceLabel}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: t.sub, whiteSpace: "nowrap" }}>{info.kind === "ride" ? "to ride" : info.priceLabel === "Free" ? "to play" : "per player"}</span>
            </div>
            {info.stat && (
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, lineHeight: "17px", fontWeight: 700, color: t.sub, wordBreak: "break-word" }}><Route size={14} style={{ flexShrink: 0 }} /> {info.stat.value}</span>
            )}
            {info.total > 0 && (
              <>
                <div style={{ height: 8, borderRadius: 99, background: t.line, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", borderRadius: 99, background: accent }} />
                </div>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, lineHeight: "16px", fontWeight: 800, color: t.sub }}>
                  <Users size={13} style={{ flexShrink: 0 }} /> {left > 0 ? `${left} of ${info.total} spots left` : "Fully booked"}
                </span>
              </>
            )}
          </div>
          <div style={{ width: 104, borderRadius: 18, background: "#FFFFFF", padding: 8, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            {qr ? <img src={qr} alt="" style={{ width: 88, height: 88 }} /> : <div style={{ width: 88, height: 88 }} />}
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", color: "#0E1411" }}>SCAN TO JOIN</span>
          </div>
        </div>
        <div style={{ borderTop: `1px dashed ${t.line}`, paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, fontWeight: 700, color: t.sub }}>
          <span>{info.kind === "ride" ? "Join the crew" : "Grab your slot"}</span>
          <span style={{ color: t.ink, fontWeight: 800 }}>app.sportcliq.com</span>
        </div>
      </div>
    </div>
  );
});

/* ---------- Buttons, share sheet and save dialog ---------- */

const WA = () => (<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z" /></svg>);
const XI = () => (<svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true"><path d="M18.901 2H22l-6.77 7.737L23.194 22h-6.235l-4.884-7.397L5.598 22H2.497l7.243-8.279L1.806 2h6.393l4.415 6.744L18.901 2Z" /></svg>);
const FB = () => (<svg viewBox="0 0 24 24" width="21" height="21" fill="currentColor" aria-hidden="true"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z" /></svg>);
const TG = () => (<svg viewBox="0 0 24 24" width="21" height="21" fill="currentColor" aria-hidden="true"><path d="M21.9 4.3 18.7 19.4c-.2 1.1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.3-5 9.1-8.2c.4-.4-.1-.6-.6-.2L6.2 13 1.4 11.5c-1-.3-1.1-1 .2-1.5L20.5 2.8c.9-.3 1.6.2 1.4 1.5z" /></svg>);

export function ShareSheet({ open, onOpenChange, info }: { open: boolean; onOpenChange: (v: boolean) => void; info: ShareInfo }) {
  const { toast } = useToast();
  const text = shareText(info);
  const close = () => onOpenChange(false);
  const items = [
    { label: "WhatsApp", bg: "#25D366", Icon: WA, run: () => openExternal(`https://wa.me/?text=${encodeURIComponent(text)}`) },
    { label: "X", bg: "#0E1411", Icon: XI, run: () => openExternal(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}`) },
    { label: "Facebook", bg: "#1877F2", Icon: FB, run: () => openExternal(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(info.url)}`) },
    { label: "Telegram", bg: "#229ED9", Icon: TG, run: () => openExternal(`https://t.me/share/url?url=${encodeURIComponent(info.url)}&text=${encodeURIComponent(text.replace(info.url, "").trim())}`) },
    {
      label: "Copy",
      bg: "#E9EBE4",
      ink: "#0E1411",
      Icon: () => <Copy size={20} />,
      run: async () => {
        try {
          await navigator.clipboard.writeText(text);
          toast({ title: "Copied", description: "The invite and link are on your clipboard." });
        } catch {
          toast({ title: "Could not copy", description: info.url, variant: "destructive" });
        }
      },
    },
    {
      label: "More",
      bg: "#E9EBE4",
      ink: "#0E1411",
      Icon: () => <MoreHorizontal size={22} />,
      run: async () => {
        if (navigator.share) {
          try { await navigator.share({ title: info.title, text, url: info.url }); } catch { /* cancelled */ }
        } else {
          await navigator.clipboard?.writeText(text);
          toast({ title: "Copied", description: "Paste it anywhere to share." });
        }
      },
    },
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[calc(100%-1.5rem)] sm:max-w-[420px] rounded-[28px] bg-sc-bg p-5 gap-4 max-h-[88vh] overflow-y-auto">
        <div className="flex flex-col gap-1 pr-6">
          <DialogTitle className="text-xl font-extrabold text-sc-ink">Share this {info.kind === "ride" ? "ride" : "match"}</DialogTitle>
          <DialogDescription className="text-sm text-sc-ink2">Your friends get the details and a direct link.</DialogDescription>
        </div>
        <div className="bg-white rounded-3xl p-4 text-[13px] leading-5 text-sc-ink2 whitespace-pre-line">{text}</div>
        <div className="grid grid-cols-3 gap-3">
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              onClick={() => { it.run(); if (it.label !== "Copy") close(); }}
              className="flex flex-col items-center gap-2 py-3 rounded-3xl bg-white active:scale-95 transition-transform"
            >
              <span className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: it.bg, color: (it as any).ink || "#FFFFFF" }}>
                <it.Icon />
              </span>
              <span className="text-xs font-bold text-sc-ink">{it.label}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SaveCardDialog({ open, onOpenChange, info }: { open: boolean; onOpenChange: (v: boolean) => void; info: ShareInfo }) {
  const { toast } = useToast();
  const [theme, setTheme] = useState<CardTheme>("green");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const save = async () => {
    if (!ref.current) return;
    setBusy(true);
    try {
      await downloadElementAsPng(ref.current, `SportCliq-${info.kind}-${info.title}.png`);
    } catch {
      toast({ title: "Could not save the card", description: "Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };
  const themes: { id: CardTheme; label: string; swatch: string }[] = [
    { id: "light", label: "Light", swatch: "#F4F5F1" },
    { id: "dark", label: "Dark", swatch: "#0E1411" },
    { id: "green", label: "Green", swatch: "#16A34A" },
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[calc(100%-1.5rem)] sm:max-w-[420px] rounded-[28px] bg-sc-bg p-5 gap-4 max-h-[92vh] overflow-y-auto">
        <div className="flex flex-col gap-1 pr-6">
          <DialogTitle className="text-xl font-extrabold text-sc-ink">Save the card</DialogTitle>
          <DialogDescription className="text-sm text-sc-ink2">Post it on your status or in the group chat.</DialogDescription>
        </div>
        <div className="flex justify-center"><ShareCard ref={ref} info={info} theme={theme} /></div>
        <div className="flex gap-2 justify-center" role="radiogroup" aria-label="Card background">
          {themes.map((th) => (
            <button
              key={th.id}
              type="button"
              role="radio"
              aria-checked={theme === th.id}
              onClick={() => setTheme(th.id)}
              className={`h-11 pl-1.5 pr-4 rounded-full inline-flex items-center gap-2 text-sm font-bold transition-colors ${theme === th.id ? "bg-sc-ink text-white" : "bg-white text-sc-ink"}`}
            >
              <span className="w-8 h-8 rounded-full border border-black/10" style={{ background: th.swatch }} />
              {th.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={save} disabled={busy} className="h-[52px] rounded-full bg-sc-green text-white font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60">
          <Download size={18} /> {busy ? "Saving..." : "Save as image"}
        </button>
      </DialogContent>
    </Dialog>
  );
}

/** Share + Save card buttons used on match and ride pages. */
export default function ActivityShare({ info }: { info: ShareInfo }) {
  const [share, setShare] = useState(false);
  const [save, setSave] = useState(false);
  return (
    <>
      <div className="flex gap-2.5">
        <button type="button" onClick={() => setShare(true)} className="flex-1 h-[52px] rounded-full bg-white text-sc-ink font-bold inline-flex items-center justify-center gap-2 border border-sc-line active:scale-[0.98] transition-transform">
          <Share2 size={18} /> Share
        </button>
        <button type="button" onClick={() => setSave(true)} className="flex-1 h-[52px] rounded-full bg-white text-sc-ink font-bold inline-flex items-center justify-center gap-2 border border-sc-line active:scale-[0.98] transition-transform">
          <ImageIcon size={18} /> Save card
        </button>
      </div>
      <ShareSheet open={share} onOpenChange={setShare} info={info} />
      <SaveCardDialog open={save} onOpenChange={setSave} info={info} />
    </>
  );
}
