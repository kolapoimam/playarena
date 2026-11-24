/**
 * When a booking code holds the pitch. A code is either one date, or repeats:
 * daily until an end date, weekly on chosen weekdays for a number of weeks,
 * or monthly on a day of the month for a number of months.
 */
export type CodeSchedule = {
  match_date: string | null;
  is_recurring?: boolean | null;
  recurring_frequency?: string | null;
  recurring_occurrences?: number | null;
  recurring_days?: number[] | null;
  recurring_until?: string | null;
  deactivated_at?: string | null;
  cancelled_at?: string | null;
};

export const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const dateOf = (iso: string) => { const [y, m, d] = iso.slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const MAX = 400;

/** Every date the code covers, in order. */
export function occurrences(s: CodeSchedule): string[] {
  if (!s.match_date) return [];
  const start = dateOf(s.match_date);
  if (!s.is_recurring) return [isoOf(start)];
  const freq = (s.recurring_frequency || "").toLowerCase();
  const out: string[] = [];

  if (freq === "daily") {
    const until = s.recurring_until ? dateOf(s.recurring_until) : addDays(start, Math.max(0, (s.recurring_occurrences || 1) - 1));
    for (let d = start; d <= until && out.length < MAX; d = addDays(d, 1)) out.push(isoOf(d));
  } else if (freq === "weekly") {
    const days = s.recurring_days?.length ? s.recurring_days : [start.getDay()];
    const weeks = Math.max(1, s.recurring_occurrences || 1);
    for (let i = 0; i < weeks * 7 && out.length < MAX; i++) {
      const d = addDays(start, i);
      if (days.includes(d.getDay())) out.push(isoOf(d));
    }
  } else if (freq === "monthly") {
    const day = s.recurring_days?.[0] || start.getDate();
    const months = Math.max(1, s.recurring_occurrences || 1);
    let m = 0;
    for (let i = 0; out.length < months && i < months + 1; i++) {
      const y = start.getFullYear(), mo = start.getMonth() + m++;
      const last = new Date(y, mo + 1, 0).getDate();
      const d = new Date(y, mo, Math.min(day, last));
      if (d >= start) out.push(isoOf(d));
    }
  } else {
    out.push(isoOf(start));
  }
  return out;
}

/** Dates that still hold the pitch, so cancelled codes hold nothing and stopped ones hold nothing from the stop date. */
export function activeOccurrences(s: CodeSchedule): string[] {
  if (s.cancelled_at) return [];
  const all = occurrences(s);
  if (!s.deactivated_at) return all;
  const stop = isoOf(new Date(s.deactivated_at));
  return all.filter((d) => d < stop);
}

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function scheduleLabel(s: CodeSchedule): string {
  if (!s.is_recurring) return "Once";
  const f = (s.recurring_frequency || "").toLowerCase();
  if (f === "daily") return s.recurring_until ? `Daily until ${dateOf(s.recurring_until).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : "Daily";
  if (f === "weekly") {
    const days = (s.recurring_days?.length ? s.recurring_days : s.match_date ? [dateOf(s.match_date).getDay()] : []).slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
    return `Every ${days.map((d) => WEEKDAYS[d]).join(", ")} for ${s.recurring_occurrences || 1} week${(s.recurring_occurrences || 1) > 1 ? "s" : ""}`;
  }
  if (f === "monthly") {
    const day = s.recurring_days?.[0] || (s.match_date ? dateOf(s.match_date).getDate() : 1);
    return `Day ${day} of each month for ${s.recurring_occurrences || 1} month${(s.recurring_occurrences || 1) > 1 ? "s" : ""}`;
  }
  return "Repeats";
}
