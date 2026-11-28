// Every time people see is in 12 hour format, for example "4:30 PM".
// Accepts "16:30", "16:30:00" or "4:30 PM".
export function time12(t?: string | null): string {
  const raw = String(t || "").trim();
  if (!raw) return "";
  const m = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]\.?m\.?)?$/i);
  if (!m) return raw;
  let h = Number(m[1]);
  const min = m[2];
  const ampm = m[3]?.toLowerCase().replace(/\./g, "");
  if (ampm === "pm" && h < 12) h += 12;
  if (ampm === "am" && h === 12) h = 0;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${min} ${suffix}`;
}
