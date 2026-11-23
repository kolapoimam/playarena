// Leaving the app safely. External links always open in a new tab or app so the
// SportCliq screen the user was on stays in place when they come back.
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { CalendarPlus, ExternalLink, MapPin } from "lucide-react";

export const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

/** Open a URL outside the app without replacing the current screen. */
export function openExternal(url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/* ---------- Leave app confirmation (maps, venue links) ---------- */

type LeaveProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  url: string | null;
  destination?: string;
  title?: string;
  body?: string;
};

export function LeaveAppDialog({ open, onOpenChange, url, destination = "Google Maps", title, body }: LeaveProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-[380px] rounded-[28px] bg-white p-6 gap-0">
        <div className="flex flex-col items-center text-center gap-3">
          <span className="w-14 h-14 rounded-full bg-sc-green text-white flex items-center justify-center">
            <MapPin size={26} />
          </span>
          <DialogTitle className="text-xl font-extrabold tracking-[-0.02em] text-sc-ink">{title || `Open ${destination}?`}</DialogTitle>
          <DialogDescription className="text-sm text-sc-ink2 max-w-[280px]">
            {body || `You are leaving SportCliq for ${destination}. This page stays open, so you can come straight back.`}
          </DialogDescription>
        </div>
        <div className="flex flex-col gap-2.5 mt-6">
          <button
            type="button"
            onClick={() => {
              if (url) openExternal(url);
              onOpenChange(false);
            }}
            className="h-[52px] rounded-full bg-sc-green text-white font-bold inline-flex items-center justify-center gap-2"
          >
            <ExternalLink size={18} /> Continue to {destination}
          </button>
          <button type="button" onClick={() => onOpenChange(false)} className="h-[48px] rounded-full bg-sc-soft text-sc-ink font-bold">
            Stay here
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** A Directions button that asks before leaving for Google Maps. */
export function DirectionsButton({ url, className, label = "Directions", children }: { url?: string | null; className?: string; label?: string; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  if (!url) return null;
  return (
    <>
      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(true); }} className={className} aria-label={label}>
        {children ?? (<><ExternalLink size={18} /> {label}</>)}
      </button>
      <LeaveAppDialog open={open} onOpenChange={setOpen} url={url} />
    </>
  );
}

/* ---------- Add to calendar ---------- */

export type CalEvent = {
  title: string;
  start: Date;
  end: Date;
  location?: string;
  details?: string;
  url?: string;
};

const pad = (n: number) => n.toString().padStart(2, "0");
const utc = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

export const googleCalendarUrl = (e: CalEvent) =>
  "https://calendar.google.com/calendar/render?action=TEMPLATE" +
  `&text=${encodeURIComponent(e.title)}` +
  `&dates=${utc(e.start)}/${utc(e.end)}` +
  `&location=${encodeURIComponent(e.location || "")}` +
  `&details=${encodeURIComponent((e.details || "") + (e.url ? `\n\n${e.url}` : ""))}`;

export const outlookCalendarUrl = (e: CalEvent) =>
  "https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent" +
  `&subject=${encodeURIComponent(e.title)}&startdt=${e.start.toISOString()}&enddt=${e.end.toISOString()}` +
  `&location=${encodeURIComponent(e.location || "")}&body=${encodeURIComponent((e.details || "") + (e.url ? `\n\n${e.url}` : ""))}`;

export const icsText = (e: CalEvent) =>
  [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SportCliq//EN",
    "BEGIN:VEVENT",
    `UID:${utc(e.start)}-${Math.random().toString(36).slice(2)}@sportcliq.com`,
    `DTSTAMP:${utc(new Date())}`,
    `DTSTART:${utc(e.start)}`,
    `DTEND:${utc(e.end)}`,
    `SUMMARY:${esc(e.title)}`,
    e.location ? `LOCATION:${esc(e.location)}` : "",
    `DESCRIPTION:${esc((e.details || "") + (e.url ? `\n\n${e.url}` : ""))}`,
    e.url ? `URL:${e.url}` : "",
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Reminder",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

function downloadIcs(e: CalEvent) {
  const blob = new Blob([icsText(e)], { type: "text/calendar;charset=utf-8" });
  const file = new File([blob], "sportcliq-event.ics", { type: "text/calendar" });
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (isIOS() && nav.canShare && nav.canShare({ files: [file] })) {
    nav.share({ files: [file], title: e.title }).catch(() => undefined);
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sportcliq-event.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function AddToCalendarSheet({ open, onOpenChange, event }: { open: boolean; onOpenChange: (v: boolean) => void; event: CalEvent | null }) {
  if (!event) return null;
  const options = [
    { label: "Google Calendar", sub: "Opens in a new tab", run: () => openExternal(googleCalendarUrl(event)) },
    { label: isIOS() ? "Apple Calendar" : "Calendar file", sub: "Works with iPhone, Outlook and most apps", run: () => downloadIcs(event) },
    { label: "Outlook", sub: "Opens in a new tab", run: () => openExternal(outlookCalendarUrl(event)) },
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-[400px] rounded-[28px] bg-sc-bg p-5 gap-4">
        <div className="flex flex-col items-center text-center gap-2 pt-1">
          <span className="w-14 h-14 rounded-full bg-sc-green text-white flex items-center justify-center"><CalendarPlus size={26} /></span>
          <DialogTitle className="text-xl font-extrabold text-sc-ink">Add to calendar</DialogTitle>
          <DialogDescription className="text-sm text-sc-ink2">We add a reminder two hours before it starts.</DialogDescription>
        </div>
        <div className="bg-white rounded-3xl overflow-hidden">
          {options.map((o, i) => (
            <button
              key={o.label}
              type="button"
              onClick={() => {
                o.run();
                onOpenChange(false);
              }}
              className={`w-full flex items-center justify-between gap-3 px-[18px] py-4 text-left ${i ? "border-t border-sc-line" : ""}`}
            >
              <span className="flex flex-col">
                <span className="text-[15px] font-bold text-sc-ink">{o.label}</span>
                <span className="text-xs text-sc-ink3">{o.sub}</span>
              </span>
              <ExternalLink size={16} className="text-sc-ink3" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
