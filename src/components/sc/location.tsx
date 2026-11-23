import { useEffect, useState } from "react";
import { Check, LocateFixed, MapPin, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { LOCATION_EVENT, NIGERIAN_STATES, detectState, getSavedState, saveState } from "@/lib/location";
import { cn } from "@/lib/utils";

/** The user's saved state, kept in sync across screens. */
export const useUserState = () => {
  const [state, setState] = useState<string | null>(getSavedState());
  useEffect(() => {
    const on = (e: Event) => setState((e as CustomEvent).detail ?? getSavedState());
    window.addEventListener(LOCATION_EVENT, on);
    return () => window.removeEventListener(LOCATION_EVENT, on);
  }, []);
  return state;
};

export function LocationSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const current = useUserState();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const useDevice = async () => {
    setBusy(true);
    setError(null);
    try {
      await detectState();
      onOpenChange(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden gap-0 max-h-[85vh] flex flex-col">
        <div className="p-6 pb-4 flex flex-col gap-3">
          <span className="w-14 h-14 rounded-full bg-sport-guide-bg text-sport-guide-fg flex items-center justify-center">
            <MapPin size={26} />
          </span>
          <DialogTitle className="text-2xl font-extrabold tracking-[-0.02em] text-sc-ink">Where do you play?</DialogTitle>
          <DialogDescription className="text-sc-ink2 text-[15px]">
            We use your state to show matches, rides and venues near you first. Your exact location never leaves your phone.
          </DialogDescription>
          <button
            type="button"
            onClick={useDevice}
            disabled={busy}
            className="mt-1 h-[52px] rounded-full bg-sc-green text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <LocateFixed size={20} className={busy ? "animate-spin" : ""} />
            {busy ? "Finding you..." : "Use my location"}
          </button>
          {error && <p className="m-0 text-sm font-semibold text-sport-red-fg">{error}</p>}
          <span className="text-[13px] font-bold text-sc-ink3 uppercase tracking-[0.06em] pt-2">Or pick your state</span>
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="grid grid-cols-2 gap-2">
            {NIGERIAN_STATES.map((s) => {
              const on = current === s.name;
              return (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => {
                    saveState(s.name);
                    onOpenChange(false);
                  }}
                  className={cn(
                    "h-11 rounded-2xl px-3 text-sm font-bold flex items-center justify-between border",
                    on ? "bg-sc-ink text-white border-sc-ink" : "bg-white text-sc-ink border-sc-line"
                  )}
                >
                  {s.name}
                  {on && <Check size={16} />}
                </button>
              );
            })}
          </div>
          {current && (
            <button
              type="button"
              onClick={() => {
                saveState(null);
                onOpenChange(false);
              }}
              className="mt-4 w-full h-11 rounded-full bg-sc-soft text-sc-ink2 text-sm font-bold flex items-center justify-center gap-1.5"
            >
              <X size={16} /> Show all of Nigeria
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Small pill that shows the user's state and opens the picker. */
export function LocationChip({ className }: { className?: string }) {
  const state = useUserState();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("h-9 pl-2.5 pr-3.5 rounded-full bg-white text-sc-ink text-[13px] font-bold flex items-center gap-1.5 shadow-card", className)}
      >
        <MapPin size={16} className="text-sport-guide-fg" />
        {state ? state : "Set location"}
      </button>
      <LocationSheet open={open} onOpenChange={setOpen} />
    </>
  );
}

/** "Near me" vs "All of Nigeria" switch shown above lists. */
export function StateScope({ nearMe, onChange }: { nearMe: boolean; onChange: (v: boolean) => void }) {
  const state = useUserState();
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => (state ? onChange(true) : setOpen(true))}
        className={cn(
          "h-[38px] pl-3 pr-4 rounded-full text-sm font-bold flex items-center gap-1.5 border",
          nearMe && state ? "bg-sc-ink text-white border-sc-ink" : "bg-white text-sc-ink border-sc-line"
        )}
      >
        <MapPin size={16} />
        {state ? state : "Set location"}
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={cn(
          "h-[38px] px-4 rounded-full text-sm font-bold border",
          !nearMe || !state ? "bg-sc-ink text-white border-sc-ink" : "bg-white text-sc-ink border-sc-line"
        )}
      >
        All of Nigeria
      </button>
      {state && (
        <button type="button" onClick={() => setOpen(true)} className="ml-auto text-[13px] font-bold text-sc-green-dark">
          Change
        </button>
      )}
      <LocationSheet
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v && getSavedState()) onChange(true);
        }}
      />
    </div>
  );
}
