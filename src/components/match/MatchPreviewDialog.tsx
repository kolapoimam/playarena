import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Eye } from "lucide-react";
import { FormValues } from "@/components/MatchFormTypes";
import { ShareCard, CardTheme, ShareInfo } from "@/components/sc/ActivityShare";
import { formatNairaExact, formatTime12 } from "@/components/sc/ui";

type Venue = { id: string; name: string; city?: string };

type MatchPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formValues: Partial<FormValues> & Record<string, any>;
  selectedVenue: Venue | undefined;
};

export const matchInfoFromForm = (f: Record<string, any>, venue?: { name: string; city?: string }, slug?: string | null): ShareInfo => {
  const date = f.match_date ? new Date(f.match_date) : null;
  return {
    kind: "match",
    title: f.title || "Your match",
    dateLabel: date && !isNaN(date.getTime()) ? date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "Date not set",
    timeLabel: f.start_time ? `${formatTime12(f.start_time)}${f.end_time ? ` to ${formatTime12(f.end_time)}` : ""}` : "Time not set",
    place: venue?.name || "Venue not set",
    city: venue?.city,
    priceLabel: f.is_paid && Number(f.price) > 0 ? formatNairaExact(Number(f.price)) : "Free",
    taken: 0,
    total: Number(f.total_slots) || 0,
    chips: [f.match_type, f.skill_level, f.gender].filter(Boolean),
    url: `https://app.sportcliq.com/match/${slug || "your-match"}`,
  };
};

export function ThemePicker({ value, onChange }: { value: CardTheme; onChange: (t: CardTheme) => void }) {
  const themes: { id: CardTheme; label: string; swatch: string }[] = [
    { id: "light", label: "Light", swatch: "#F4F5F1" },
    { id: "dark", label: "Dark", swatch: "#0E1411" },
    { id: "green", label: "Green", swatch: "#16A34A" },
  ];
  return (
    <div className="flex gap-2 justify-center" role="radiogroup" aria-label="Card background">
      {themes.map((th) => (
        <button
          key={th.id}
          type="button"
          role="radio"
          aria-checked={value === th.id}
          onClick={() => onChange(th.id)}
          className={`h-11 pl-1.5 pr-4 rounded-full inline-flex items-center gap-2 text-sm font-bold ${value === th.id ? "bg-sc-ink text-white" : "bg-white text-sc-ink"}`}
        >
          <span className="w-8 h-8 rounded-full border border-black/10" style={{ background: th.swatch }} />
          {th.label}
        </button>
      ))}
    </div>
  );
}

const MatchPreviewDialog = ({ open, onOpenChange, formValues, selectedVenue }: MatchPreviewDialogProps) => {
  const [theme, setTheme] = useState<CardTheme>("green");
  const info = matchInfoFromForm(formValues, selectedVenue);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[calc(100%-1.5rem)] sm:max-w-[420px] rounded-[28px] bg-sc-bg p-5 gap-4 max-h-[92vh] overflow-y-auto">
        <div className="flex flex-col items-center text-center gap-2">
          <span className="w-12 h-12 rounded-full bg-sc-ink text-white flex items-center justify-center"><Eye size={22} /></span>
          <DialogTitle className="text-xl font-extrabold text-sc-ink">Preview</DialogTitle>
          <DialogDescription className="text-sm text-sc-ink2">This is how your match card looks when players share it.</DialogDescription>
        </div>
        <div className="flex justify-center"><ShareCard info={info} theme={theme} /></div>
        <ThemePicker value={theme} onChange={setTheme} />
        {formValues.notes && (
          <div className="bg-white rounded-3xl p-4 text-sm text-sc-ink2 whitespace-pre-line"><b className="text-sc-ink">Notes.</b> {formValues.notes}</div>
        )}
        <button type="button" onClick={() => onOpenChange(false)} className="h-[52px] rounded-full bg-sc-ink text-white font-bold">Back to editing</button>
      </DialogContent>
    </Dialog>
  );
};

export default MatchPreviewDialog;
