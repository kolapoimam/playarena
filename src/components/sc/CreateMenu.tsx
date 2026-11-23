import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bike, ChevronLeft, ChevronRight, Plus, Route, Store, Trophy, Users } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SPORT } from "@/components/sc/ui";

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

// The options that used to sit at the top of Home: Organise, Manage, Host ride, List venue.
export function CreateMenu({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState<"menu" | "organise">("menu");

  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next) setStep("menu");
  };
  const go = (to: string) => {
    close(false);
    navigate(to);
  };

  const options = [
    { label: "Organise", sub: "Set up a match or a group ride", icon: Plus, sport: "football" as const, onClick: () => setStep("organise") },
    { label: "Manage", sub: "Check in players for your games", icon: Users, sport: "guide" as const, onClick: () => go("/confirm-checkin") },
    { label: "Host ride", sub: "Plan a route and invite riders", icon: Route, sport: "cycling" as const, onClick: () => go("/host-cycling") },
    { label: "List venue", sub: "Add your pitch or court", icon: Store, sport: "venue" as const, onClick: () => go("/venue-create") },
  ];

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-[calc(100%-2.5rem)] sm:max-w-md rounded-[28px] p-6 bg-white border-none shadow-float font-sans">
        {step === "menu" ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-[22px] font-extrabold text-center text-sc-ink tracking-[-0.02em]">What would you like to do?</DialogTitle>
              <DialogDescription className="text-center text-sc-ink2 mt-1">Organise, manage, host or list in a few taps.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2.5 mt-4 min-w-0 w-full">
              {options.map((o) => (
                <button
                  key={o.label}
                  type="button"
                  onClick={o.onClick}
                  className="w-full min-w-0 flex items-center gap-3.5 rounded-[22px] bg-sc-bg p-3 text-left active:scale-[0.98] transition-transform"
                >
                  <span className="w-12 h-12 rounded-[16px] flex items-center justify-center shrink-0" style={{ background: SPORT[o.sport].bg, color: SPORT[o.sport].fg }}>
                    <o.icon size={22} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] font-extrabold text-sc-ink">{o.label}</span>
                    <span className="block text-[13px] text-sc-ink2 truncate">{o.sub}</span>
                  </span>
                  <ChevronRight size={18} className="text-[#9AA19C] shrink-0" />
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-extrabold text-center text-sc-ink tracking-[-0.02em]">What are you organising?</DialogTitle>
              <DialogDescription className="text-center text-sc-ink2 mt-1">Bring people together for a match or a group ride.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                type="button"
                onClick={() => go("/organize")}
                className="rounded-3xl p-4 h-36 flex flex-col justify-between text-left"
                style={{ background: SPORT.football.solid, color: SPORT.football.onSolid }}
              >
                <Trophy size={28} />
                <span className="text-lg font-extrabold leading-tight">Football match</span>
              </button>
              <button
                type="button"
                onClick={() => go("/host-cycling")}
                className="rounded-3xl p-4 h-36 flex flex-col justify-between text-left"
                style={{ background: SPORT.cycling.solid, color: SPORT.cycling.onSolid }}
              >
                <Bike size={28} />
                <span className="text-lg font-extrabold leading-tight">Cycling ride</span>
              </button>
            </div>
            <button type="button" onClick={() => setStep("menu")} className="mt-3 mx-auto flex items-center gap-1 text-sm font-bold text-sc-ink2">
              <ChevronLeft size={16} /> Back
            </button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
