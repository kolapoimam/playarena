import { useState, type ReactNode } from "react";
import { BadgeCheck, Ban, Check, Clock, Copy, MapPin, MessageSquare, Repeat, User } from "lucide-react";
import { SPORT, type Sport } from "@/components/sc/ui";
import { cn } from "@/lib/utils";

export type ActivityStatus = "Upcoming" | "Today" | "Live" | "Passed" | "Cancelled";

const STATUS_STYLE: Record<ActivityStatus, string> = {
  Upcoming: "bg-[#DBEAFE] text-[#1D4ED8]",
  Today: "bg-sc-green/10 text-sc-green",
  Live: "bg-[#FEE2E2] text-[#B91C1C]",
  Passed: "bg-black/[0.05] text-sc-ink3",
  Cancelled: "bg-[#FEE2E2] text-[#B91C1C]",
};

/** Works out the label from the date, start and end time, read as local time. */
export function activityStatus(date: string, start?: string | null, end?: string | null, cancelled?: boolean, fallbackHours = 2): ActivityStatus {
  if (cancelled) return "Cancelled";
  const toMin = (t?: string | null) => {
    const m = String(t || "").match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!m) return null;
    let h = Number(m[1]);
    if (m[3]?.toUpperCase() === "PM" && h !== 12) h += 12;
    if (m[3]?.toUpperCase() === "AM" && h === 12) h = 0;
    return h * 60 + Number(m[2]);
  };
  const [y, mo, d] = String(date).slice(0, 10).split("-").map(Number);
  const s = toMin(start) ?? 0;
  const e = toMin(end) ?? s + fallbackHours * 60;
  const startAt = new Date(y, mo - 1, d, Math.floor(s / 60), s % 60).getTime();
  const endAt = new Date(y, mo - 1, d, Math.floor(e / 60), e % 60).getTime();
  const now = Date.now();
  if (now >= startAt && now <= endAt) return "Live";
  if (now > endAt) return "Passed";
  const today = new Date();
  if (today.getFullYear() === y && today.getMonth() === mo - 1 && today.getDate() === d) return "Today";
  return "Upcoming";
}

type Action = { label: string; onClick: () => void; disabled?: boolean; hint?: string };

/**
 * One card for any activity a person organised or joined: the date on a coloured
 * tile, the time and place, their code, how full it is, who runs it, and actions.
 */
export default function ActivityCard({
  sport, title, date, timeLabel, place, status, codeLabel, code, taken, total, slotsLabel = "Slots",
  organiser, verified, repeat, extra, view, cancel, feedback, ticket,
}: {
  sport: Sport;
  title: string;
  date: string;
  timeLabel: string;
  place?: string | null;
  status: ActivityStatus;
  codeLabel: string;
  code?: string | null;
  taken?: number;
  total?: number;
  slotsLabel?: string;
  organiser?: string | null;
  verified?: boolean;
  repeat?: string | null;
  extra?: ReactNode;
  view: Action;
  cancel?: Action | null;
  feedback?: Action | null;
  ticket?: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const c = SPORT[sport];
  const d = new Date(`${String(date).slice(0, 10)}T00:00:00`);
  const valid = !isNaN(d.getTime());
  const dim = status === "Passed" || status === "Cancelled";
  const pct = total ? Math.min(100, ((taken || 0) / total) * 100) : 0;

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  return (
    <div className={cn("bg-white rounded-[24px] overflow-hidden", dim && "opacity-90")}>
      <div className="flex items-stretch">
        <div className="w-[74px] shrink-0 flex flex-col items-center justify-center py-4 leading-none" style={{ background: dim ? "#EEF0EC" : c.bg, color: dim ? "#6B726D" : c.fg }}>
          <span className="text-[11px] font-bold uppercase">{valid ? d.toLocaleDateString("en-GB", { weekday: "short" }) : ""}</span>
          <span className="text-[26px] font-extrabold my-0.5">{valid ? d.getDate() : "?"}</span>
          <span className="text-[11px] font-bold uppercase">{valid ? d.toLocaleDateString("en-GB", { month: "short" }) : ""}</span>
        </div>
        <div className="flex-1 min-w-0 p-3.5 flex flex-col gap-1.5">
          <div className="flex items-start gap-2">
            <span className={cn("text-[16px] leading-[21px] font-extrabold tracking-[-0.01em] line-clamp-2 flex-1 min-w-0", status === "Cancelled" && "line-through decoration-2 text-sc-ink3")}>{title}</span>
            <span className={cn("h-6 px-2.5 rounded-full text-[11.5px] font-bold inline-flex items-center gap-1 shrink-0", STATUS_STYLE[status])}>
              {status === "Live" && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
              {status}
            </span>
          </div>
          <span className="text-[13px] font-bold text-sc-ink inline-flex items-center gap-1.5"><Clock size={13} className="text-sc-ink3 shrink-0" /> {timeLabel}</span>
          {place && <span className="text-[13px] text-sc-ink2 inline-flex items-center gap-1.5 min-w-0"><MapPin size={13} className="text-sc-ink3 shrink-0" /><span className="truncate">{place}</span></span>}
          {repeat && <span className="text-[12.5px] text-sc-ink2 inline-flex items-center gap-1.5 min-w-0"><Repeat size={13} className="text-sc-ink3 shrink-0" /><span className="truncate">{repeat}</span></span>}
        </div>
      </div>

      <div className="mx-3.5 border-t border-sc-line py-2.5 grid grid-cols-2 gap-3">
        <div className="min-w-0 flex flex-col gap-0.5">
          <span className="text-[11px] font-semibold text-sc-ink3">{codeLabel}</span>
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="text-[15px] font-extrabold tracking-[0.12em] font-mono truncate">{code || "None"}</span>
            {code && (
              <button type="button" onClick={copy} aria-label={`Copy ${codeLabel}`} className="w-7 h-7 rounded-full bg-sc-bg flex items-center justify-center shrink-0 active:scale-95">
                {copied ? <Check size={13} className="text-sc-green" /> : <Copy size={13} />}
              </button>
            )}
          </span>
        </div>
        {typeof total === "number" && total > 0 ? (
          <div className="min-w-0 flex flex-col gap-1">
            <span className="flex justify-between text-[11px] font-semibold text-sc-ink3"><span>{slotsLabel}</span><b className="text-sc-ink">{taken || 0}/{total}</b></span>
            <span className="h-2 rounded-full bg-black/[0.06] overflow-hidden mt-1"><span className="block h-full rounded-full" style={{ width: `${pct}%`, background: c.solid }} /></span>
          </div>
        ) : extra ? <div className="min-w-0">{extra}</div> : <span />}
      </div>

      {organiser && (
        <div className="mx-3.5 mb-2.5 rounded-xl bg-sc-bg px-3 py-2 flex items-center gap-2 text-[12.5px] min-w-0">
          <User size={13} className="text-sc-ink3 shrink-0" />
          <span className="text-sc-ink3 shrink-0">Organised by</span>
          <b className="truncate">{organiser}</b>
          {verified && <BadgeCheck size={14} className="text-sc-green shrink-0" />}
        </div>
      )}

      <div className="px-3.5 pb-3.5 flex gap-2 items-center">
        <button type="button" onClick={view.onClick} className="flex-1 h-10 rounded-full bg-sc-ink text-white text-[13.5px] font-bold active:scale-[0.98]">{view.label}</button>
        {ticket}
        {feedback && (
          <button type="button" onClick={feedback.onClick} disabled={feedback.disabled} className="h-10 px-3.5 rounded-full bg-black/[0.05] text-[13px] font-bold inline-flex items-center gap-1.5 shrink-0 disabled:opacity-40 active:scale-[0.98]">
            <MessageSquare size={14} /> {feedback.label}
          </button>
        )}
        {cancel && (
          <button type="button" onClick={cancel.onClick} disabled={cancel.disabled} title={cancel.hint} className="h-10 px-3.5 rounded-full bg-[#FEE2E2] text-[#B91C1C] text-[13px] font-bold inline-flex items-center gap-1.5 shrink-0 disabled:opacity-40 active:scale-[0.98]">
            <Ban size={14} /> {cancel.label}
          </button>
        )}
      </div>
    </div>
  );
}
