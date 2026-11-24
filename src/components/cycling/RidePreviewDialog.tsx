import { useState } from "react";
import { Eye } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ShareCard, CardTheme, ShareInfo } from "@/components/sc/ActivityShare";
import { ThemePicker } from "@/components/match/MatchPreviewDialog";
import { formatNairaExact, formatTime12 } from "@/components/sc/ui";

type Landmark = { id_uuid: string; name: string; state: string };

export const rideInfoFromForm = (f: Record<string, any>, start?: Landmark, finish?: Landmark, slug?: string | null): ShareInfo => {
  const date = f.event_date ? new Date(f.event_date) : null;
  const unit = f.duration_type === "distance" ? "km" : f.duration_type === "minutes" ? "min" : "hours";
  return {
    kind: "ride",
    title: f.title || "Your ride",
    dateLabel: date && !isNaN(date.getTime()) ? date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) : "Date not set",
    timeLabel: f.start_time ? formatTime12(f.start_time) : "Time not set",
    place: start ? `${start.name}${start.state ? `, ${start.state}` : ""}` : "Start not set",
    finish: finish ? `${finish.name}${finish.state ? `, ${finish.state}` : ""}` : undefined,
    priceLabel: f.is_free || !(Number(f.price) > 0) ? "Free" : formatNairaExact(Number(f.price)),
    taken: 0,
    total: Number(f.max_attendees) || 0,
    stat: f.duration_value ? { label: "Route", value: `${f.duration_value} ${unit}` } : undefined,
    chips: [f.is_own_bike ? "Bring your bike" : null, f.is_rental_available ? "Rentals available" : null].filter(Boolean) as string[],
    url: `https://app.sportcliq.com/cycling/${slug || "your-ride"}`,
  };
};

export default function RidePreviewDialog({
  open, onOpenChange, formValues, start, finish,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  formValues: Record<string, any>;
  start?: Landmark;
  finish?: Landmark;
}) {
  const [theme, setTheme] = useState<CardTheme>("green");
  const info = rideInfoFromForm(formValues, start, finish);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] bg-sc-bg p-5 gap-4">
        <div className="flex flex-col items-center text-center gap-2">
          <span className="w-12 h-12 rounded-full text-white flex items-center justify-center" style={{ background: "#F97316" }}><Eye size={22} /></span>
          <DialogTitle className="text-center">Preview</DialogTitle>
          <DialogDescription className="text-center">This is how your ride card looks when riders share it.</DialogDescription>
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
}
