import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Check, Copy, Download, Lock, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FormValues } from "@/components/MatchFormTypes";
import { ShareCard, CardTheme, ShareSheet } from "@/components/sc/ActivityShare";
import { downloadElementAsPng } from "@/components/sc/TicketCard";
import { matchInfoFromForm, ThemePicker } from "@/components/match/MatchPreviewDialog";

type Venue = { id: string; name: string; city?: string };

type MatchSuccessDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formValues: Partial<FormValues> & Record<string, any>;
  selectedVenue: Venue | undefined;
  supercode: string | null;
  matchSlug: string | null;
  onNavigate: (slug: string) => void;
};

const MatchSuccessDialog = ({ open, onOpenChange, formValues, selectedVenue, supercode, matchSlug, onNavigate }: MatchSuccessDialogProps) => {
  const { toast } = useToast();
  const [theme, setTheme] = useState<CardTheme>("green");
  const [share, setShare] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const info = matchInfoFromForm(formValues, selectedVenue, matchSlug);

  const save = async () => {
    if (!ref.current) return;
    setBusy(true);
    try {
      await downloadElementAsPng(ref.current, `SportCliq-match-${info.title}.png`);
    } catch {
      toast({ title: "Could not save the card", description: "Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[calc(100%-1.5rem)] sm:max-w-[420px] rounded-[28px] bg-sc-bg p-5 gap-4 max-h-[92vh] overflow-y-auto">
        <div className="flex flex-col items-center text-center gap-2 pt-1">
          <span className="w-14 h-14 rounded-full bg-sc-green text-white flex items-center justify-center"><Check size={28} strokeWidth={3} /></span>
          <DialogTitle className="text-2xl font-extrabold tracking-[-0.02em] text-sc-ink">Your match is live</DialogTitle>
          <DialogDescription className="text-sm text-sc-ink2 max-w-[290px]">Share the card in your group chat and watch the slots fill.</DialogDescription>
        </div>

        {supercode && (
          <div className="rounded-3xl bg-sc-ink text-white p-4 flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center shrink-0"><Lock size={20} /></span>
            <span className="flex-1 flex flex-col">
              <span className="text-[11px] font-bold tracking-[0.12em] opacity-70">YOUR SUPER CODE, KEEP IT PRIVATE</span>
              <span className="text-2xl font-extrabold tracking-[0.3em]">{supercode}</span>
            </span>
            <button
              type="button"
              aria-label="Copy super code"
              onClick={() => { navigator.clipboard?.writeText(supercode); toast({ title: "Copied", description: "Use it to manage players and check in." }); }}
              className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center"
            >
              <Copy size={18} />
            </button>
          </div>
        )}

        <div className="flex justify-center"><ShareCard ref={ref} info={info} theme={theme} /></div>
        <ThemePicker value={theme} onChange={setTheme} />

        <div className="flex gap-2.5">
          <button type="button" onClick={() => setShare(true)} className="flex-1 h-[52px] rounded-full bg-sc-green text-white font-bold inline-flex items-center justify-center gap-2"><Share2 size={18} /> Share</button>
          <button type="button" onClick={save} disabled={busy} className="flex-1 h-[52px] rounded-full bg-white border border-sc-line text-sc-ink font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"><Download size={18} /> {busy ? "Saving..." : "Save card"}</button>
        </div>
        {matchSlug && (
          <button type="button" onClick={() => { onOpenChange(false); onNavigate(matchSlug); }} className="h-[48px] rounded-full bg-sc-ink text-white font-bold">View match</button>
        )}
        <ShareSheet open={share} onOpenChange={setShare} info={info} />
      </DialogContent>
    </Dialog>
  );
};

export default MatchSuccessDialog;
