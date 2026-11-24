import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Loader2, Lock, Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { modalAction, modalCancel } from "@/components/ui/modal-styles";
import { FunState } from "@/components/sc/FunState";
import { cn } from "@/lib/utils";

/**
 * The door to a private activity. Asks for the access code in a small modal.
 * Closing it shows a friendly locked screen instead of an error, with a way back in.
 */
export default function AccessGate({ what = "match", onUnlock }: { what?: "match" | "ride"; onUnlock: (code: string) => Promise<boolean> }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const submit = async () => {
    if (code.length < 6) {
      setError("The code has 6 letters or numbers.");
      return;
    }
    setBusy(true);
    setError(null);
    const ok = await onUnlock(code).catch(() => false);
    setBusy(false);
    if (!ok) {
      setError("That code does not open this " + what + ". Check it with the organiser.");
      setShake(true);
      setTimeout(() => setShake(false), 450);
    }
  };

  return (
    <>
      <FunState
        kind="locked"
        badge={`Private ${what}`}
        title={open ? `This ${what} is invite only` : "You need the code to get in"}
        body={open
          ? `Enter the access code from the organiser to see the ${what}.`
          : `This ${what} is private, so we can only show it to people with the access code. Ask the organiser for it, or find an open ${what} to join.`}
        primary={{ label: "Enter access code", onClick: () => setOpen(true), icon: KeyRound }}
        secondary={{ label: what === "ride" ? "Find an open ride" : "Find an open match", onClick: () => navigate(what === "ride" ? "/cycling-activities" : "/matches"), icon: Search }}
      />
      <Dialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
        <DialogContent className="sm:max-w-[360px] max-w-[calc(100%-2rem)] p-5 gap-4">
          <div className="flex flex-col items-center text-center gap-2 pt-1">
            <span className="w-14 h-14 rounded-[20px] bg-sc-ink text-sc-green flex items-center justify-center"><Lock size={24} strokeWidth={2.4} /></span>
            <DialogTitle className="text-center">Access code needed</DialogTitle>
            <DialogDescription className="text-center text-[14px]">This {what} is private. Enter the 6 character code from the organiser.</DialogDescription>
          </div>
          <input
            autoFocus
            value={code}
            onChange={(e) => { setError(null); setCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6)); }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="ABC123"
            autoCapitalize="characters"
            autoComplete="off"
            aria-label="Access code"
            className={cn(
              "sc-big-field w-full h-14 rounded-2xl bg-sc-bg text-center text-[24px] font-extrabold tracking-[0.35em] uppercase outline-none border-2 border-transparent focus:border-sc-ink/15 placeholder:text-sc-ink3/40",
              error && "border-[#B91C1C]/40",
              shake && "animate-[sc-shake_0.4s_ease-in-out]",
            )}
          />
          {error && <p className="m-0 -mt-2 text-center text-[13px] font-semibold text-[#B91C1C]">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setOpen(false)} disabled={busy} className={cn(modalCancel, "flex-1 px-3")}>Cancel</button>
            <button type="button" onClick={submit} disabled={busy} className={cn(modalAction, "flex-1 px-3")}>
              {busy ? <Loader2 size={18} className="animate-spin" /> : "Unlock"}
            </button>
          </div>
          <style>{`@keyframes sc-shake { 0%,100% { transform: translateX(0) } 25% { transform: translateX(-8px) } 75% { transform: translateX(8px) } }`}</style>
        </DialogContent>
      </Dialog>
    </>
  );
}
