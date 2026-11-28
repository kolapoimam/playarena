import { useEffect, useState } from "react";
import { Flag, ShieldOff } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { IconButton } from "@/components/sc/ui";
import { REPORT_REASONS, blockPerson, isBlocked, reportContent, unblockPerson, type ReportKind } from "@/lib/safety";
import { cn } from "@/lib/utils";

type Props = {
  kind: ReportKind;
  id: string;
  title: string;
  /** The person who made this, so they can be blocked */
  owner?: { id?: string | null; name?: string | null; byName?: boolean } | null;
  className?: string;
};

const WHAT: Record<ReportKind, string> = { match: "match", cycling: "ride", venue: "venue", person: "person" };

/** Flag button that opens Report and Block. Used on match, ride and venue pages. */
export function ReportButton({ kind, id, title, owner, className }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton icon={Flag} label={`Report this ${WHAT[kind]}`} onClick={() => setOpen(true)} className={className} />
      <ReportSheet open={open} onOpenChange={setOpen} kind={kind} id={id} title={title} owner={owner} />
    </>
  );
}

export function ReportSheet({ open, onOpenChange, kind, id, title, owner }: Props & { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState<"report" | "block" | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReason("");
    setDetails("");
    supabase.auth.getSession().then(({ data }) => setMe(data.session?.user?.id ?? null));
    setBlocked(isBlocked(owner?.id, owner?.byName ? owner?.name : null));
  }, [open, owner?.id]);

  const canBlock = !!owner?.id && owner.id !== me;
  const ownerName = owner?.name || "this organiser";

  const send = async () => {
    if (!reason) return;
    setBusy("report");
    try {
      await reportContent({ kind, id, title, reason, details, ownerId: owner?.id });
      toast({ title: "Thanks for telling us", description: "Our team reviews every report within 24 hours." });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Report not sent", description: e?.message || "Check your connection and try again.", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const toggleBlock = async () => {
    if (!owner?.id) return;
    if (!me) {
      toast({ title: "Sign in to block", description: "Blocking is saved on your account." });
      return;
    }
    setBusy("block");
    try {
      if (blocked) {
        await unblockPerson(owner.id);
        toast({ title: `${ownerName} unblocked` });
      } else {
        await blockPerson({ id: owner.id, name: ownerName, byName: owner.byName });
        toast({ title: `${ownerName} blocked`, description: "Their matches and rides won't show for you. Undo it any time in Settings." });
      }
      setBlocked(!blocked);
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Could not update", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-[420px] rounded-[28px] bg-white p-6 gap-0 max-h-[90vh] overflow-y-auto">
        <DialogTitle className="text-xl font-extrabold text-sc-ink">Report this {WHAT[kind]}</DialogTitle>
        <DialogDescription className="text-sm text-sc-ink2 mt-1">
          Tell us what is wrong with {title}. Reports are private and our team reviews them within 24 hours.
        </DialogDescription>

        <div className="flex flex-col gap-2 mt-5" role="radiogroup" aria-label="Reason">
          {REPORT_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={reason === r}
              onClick={() => setReason(r)}
              className={cn(
                "h-12 px-4 rounded-2xl text-left text-[15px] font-bold border-2 transition-colors",
                reason === r ? "border-sc-green bg-sc-green/10 text-sc-ink" : "border-sc-line bg-white text-sc-ink",
              )}
            >
              {r}
            </button>
          ))}
        </div>

        <label className="block mt-4">
          <span className="text-[13px] font-bold text-sc-ink2">Anything else we should know (optional)</span>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value.slice(0, 600))}
            rows={3}
            className="mt-1.5 w-full rounded-2xl border border-sc-line bg-sc-bg px-4 py-3 text-[15px] text-sc-ink outline-none focus:border-sc-green"
          />
        </label>

        <button
          type="button"
          disabled={!reason || busy !== null}
          onClick={send}
          className="mt-4 h-[52px] w-full rounded-full bg-sc-green text-white font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Flag size={18} /> {busy === "report" ? "Sending..." : "Send report"}
        </button>

        {canBlock && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={toggleBlock}
            className="mt-2.5 h-[48px] w-full rounded-full bg-sc-soft text-sc-ink font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <ShieldOff size={18} /> {busy === "block" ? "Saving..." : blocked ? `Unblock ${ownerName}` : `Block ${ownerName}`}
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}
