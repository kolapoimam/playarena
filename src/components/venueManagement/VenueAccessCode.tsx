import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CalendarDays, Check, Copy, KeyRound, Loader2, Plus, Repeat, Share2, User, Phone, Clock } from "lucide-react";
import TimeInput from "@/components/TimeInput";
import { EmptyState, Segmented, formatTime12 } from "@/components/sc/ui";
import { modalAction, modalCancel } from "@/components/ui/modal-styles";
import { cn } from "@/lib/utils";

type AccessCode = {
  id: string;
  booking_id: string | null;
  code: string;
  expiry_date: string;
  status: "pending" | "active" | "inactive";
  created_at: string;
  booker_name: string | null;
  booker_phone: string | null;
  match_date: string;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  recurring_frequency: string | null;
  recurring_occurrences: number | null;
};

type VenueAccessCodeProps = {
  venueId: string;
};

const VenueAccessCode = ({ venueId }: VenueAccessCodeProps) => {
  const { toast } = useToast();
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [showAccessCodeDialog, setShowAccessCodeDialog] = useState(false);
  const [accessCodeForm, setAccessCodeForm] = useState({
    match_date: "",
    start_time: "",
    end_time: "",
    is_recurring: false,
    recurring_frequency: "",
    recurring_occurrences: "",
  });
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [filter, setFilter] = useState<"open" | "closed">("open");

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (session.session) {
        setUserId(session.session.user.id);
      }
    };
    checkAuth();
  }, []);

  const fetchAccessCodes = useCallback(async () => {
    if (!venueId) {
      setAccessCodes([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("booking_access_codes")
        .select(`
          id, booking_id, code, expiry_date, status, created_at, booker_name, booker_phone,
          match_date, start_time, end_time, is_recurring, recurring_frequency, recurring_occurrences
        `)
        .eq("venue_id", venueId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Client-side expiry check: Update status to inactive if expired
      const now = new Date();
      const updatedCodes = await Promise.all(
        (data || []).map(async (code) => {
          const expiryDate = new Date(code.expiry_date);
          if (expiryDate < now && code.status !== "inactive") {
            const { error: updateError } = await supabase
              .from("booking_access_codes")
              .update({ status: "inactive" })
              .eq("id", code.id);
            if (updateError) {
              console.error("Error updating expired code:", updateError);
            }
            return { ...code, status: "inactive" };
          }
          return code;
        })
      );

      setAccessCodes(updatedCodes);
    } catch (error) {
      console.error("Error fetching access codes:", error);
      toast({
        title: "Error",
        description: "Failed to load access codes.",
        variant: "destructive",
      });
      setAccessCodes([]);
    }
  }, [venueId, toast]);

  useEffect(() => {
    fetchAccessCodes();

    const channel = supabase
      .channel(`access_codes_${venueId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "booking_access_codes",
          filter: `venue_id=eq.${venueId}`,
        },
        () => {
          fetchAccessCodes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [venueId, fetchAccessCodes]);

  const handleGenerateAccessCode = async () => {
    const { match_date, start_time, end_time, is_recurring, recurring_frequency, recurring_occurrences } = accessCodeForm;
    if (!match_date || !start_time || !end_time) {
      toast({
        title: "Error",
        description: "Please fill in date and time fields.",
        variant: "destructive",
      });
      return;
    }
    if (is_recurring && (!(recurring_frequency || "weekly") || !recurring_occurrences || parseInt(recurring_occurrences) < 1)) {
      toast({
        title: "Error",
        description: "Please specify valid recurring frequency and occurrences.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: user, error: userError } = await supabase.auth.getUser();
      if (userError || !user.user) {
        throw new Error("User not authenticated");
      }

      const code = Math.random().toString(36).slice(-6).toUpperCase();
      const createdAt = new Date().toISOString();

      const { error } = await supabase
        .from("booking_access_codes")
        .insert({
          venue_id: venueId,
          code,
          expiry_date: new Date(new Date(createdAt).getTime() + 48 * 60 * 60 * 1000).toISOString(),
          status: "pending",
          created_at: createdAt,
          booking_id: null,
          match_date,
          start_time,
          end_time,
          is_recurring: is_recurring || false,
          recurring_frequency: is_recurring ? (recurring_frequency || "weekly") : null,
          recurring_occurrences: is_recurring ? parseInt(recurring_occurrences) : null,
        });

      if (error) {
        console.error("Access code error:", error);
        throw error;
      }

      setGeneratedCode(code);
      await fetchAccessCodes();
    } catch (error: any) {
      console.error("Access code error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate access code.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast({ title: "Copy this code", description: code });
    }
  };

  const shareCode = async (code: string) => {
    const text = `Your SportCliq booking code is ${code}. Open app.sportcliq.com/organize and enter it to set up your match for free.`;
    if (navigator.share) {
      try { await navigator.share({ text }); } catch { /* closed */ }
    } else handleCopyCode(text);
  };

  const closeDialog = () => {
    setShowAccessCodeDialog(false);
    setGeneratedCode(null);
    setAccessCodeForm({ match_date: "", start_time: "", end_time: "", is_recurring: false, recurring_frequency: "", recurring_occurrences: "" });
  };

  const tone = (status: string) =>
    status === "active" ? "bg-sc-green/10 text-sc-green" : status === "pending" ? "bg-[#FEF9C3] text-[#A16207]" : "bg-black/[0.05] text-sc-ink3";
  const label = (status: string) => (status === "active" ? "Used" : status === "pending" ? "Waiting" : "Expired");
  const shown = accessCodes.filter((c) => (filter === "open" ? c.status === "pending" : c.status !== "pending"));
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const fmtWhen = (d: string) => new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  const field = "block w-full min-w-0 h-11 rounded-xl bg-sc-bg px-3.5 text-[16px] font-semibold text-sc-ink outline-none border border-transparent focus:bg-white focus:border-sc-ink/20";

  return (
    <div className="flex flex-col gap-3.5">
      <div className="bg-white rounded-[24px] p-4 flex items-center gap-3">
        <span className="w-11 h-11 rounded-2xl bg-sport-venue-bg text-sport-venue-fg flex items-center justify-center shrink-0"><KeyRound size={20} /></span>
        <span className="flex-1 min-w-0 flex flex-col">
          <span className="text-[16px] font-extrabold">Booking codes</span>
          <span className="text-[13px] text-sc-ink3">Give an organiser a free slot at your venue. Codes last 48 hours.</span>
        </span>
        <button type="button" onClick={() => setShowAccessCodeDialog(true)} className="h-10 pl-3 pr-4 rounded-full bg-sc-ink text-white text-[14px] font-bold inline-flex items-center gap-1.5 shrink-0 active:scale-95">
          <Plus size={16} /> New
        </button>
      </div>

      <Segmented
        options={[{ value: "open", label: `Waiting${accessCodes.filter((c) => c.status === "pending").length ? ` (${accessCodes.filter((c) => c.status === "pending").length})` : ""}` }, { value: "closed", label: "Used and expired" }]}
        value={filter}
        onChange={setFilter}
      />

      {shown.length === 0 ? (
        <div className="bg-white rounded-[24px]">
          <EmptyState icon={KeyRound} sport="venue" title={filter === "open" ? "No codes waiting" : "Nothing here yet"} subtitle={filter === "open" ? "Create a code and share it with an organiser." : "Codes move here once they are used or expire."} />
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {shown.map((code) => (
            <div key={code.id} className="bg-white rounded-[22px] p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[22px] font-extrabold tracking-[0.18em] font-mono">{code.code}</span>
                <button type="button" onClick={() => handleCopyCode(code.code)} aria-label="Copy code" className="w-8 h-8 rounded-full bg-black/[0.05] flex items-center justify-center active:scale-95">
                  {copied === code.code ? <Check size={15} className="text-sc-green" /> : <Copy size={15} />}
                </button>
                {code.status === "pending" && (
                  <button type="button" onClick={() => shareCode(code.code)} aria-label="Share code" className="w-8 h-8 rounded-full bg-black/[0.05] flex items-center justify-center active:scale-95"><Share2 size={15} /></button>
                )}
                <span className={cn("ml-auto h-7 px-2.5 rounded-full text-[12px] font-bold inline-flex items-center", tone(code.status))}>{label(code.status)}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[13px] text-sc-ink2">
                <span className="inline-flex items-center gap-1.5 min-w-0"><CalendarDays size={14} className="shrink-0 text-sc-ink3" /><span className="truncate">{code.match_date ? fmtDate(code.match_date) : "Any day"}</span></span>
                <span className="inline-flex items-center gap-1.5 min-w-0"><Clock size={14} className="shrink-0 text-sc-ink3" /><span className="truncate">{formatTime12(code.start_time)} to {formatTime12(code.end_time)}</span></span>
                {code.booker_name && <span className="inline-flex items-center gap-1.5 min-w-0"><User size={14} className="shrink-0 text-sc-ink3" /><span className="truncate">{code.booker_name}</span></span>}
                {code.booker_phone && <span className="inline-flex items-center gap-1.5 min-w-0"><Phone size={14} className="shrink-0 text-sc-ink3" /><span className="truncate">{code.booker_phone}</span></span>}
                {userId && code.is_recurring && <span className="col-span-2 inline-flex items-center gap-1.5"><Repeat size={14} className="text-sc-ink3" /> Repeats {code.recurring_frequency} for {code.recurring_occurrences} times</span>}
              </div>
              <span className="text-[12px] text-sc-ink3">{code.status === "pending" ? `Expires ${fmtWhen(code.expiry_date)}` : `Created ${fmtWhen(code.created_at)}`}</span>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showAccessCodeDialog} onOpenChange={(v) => (v ? setShowAccessCodeDialog(true) : closeDialog())}>
        <DialogContent className="sm:max-w-[360px] max-w-[calc(100%-2rem)] p-5 gap-4">
          {generatedCode ? (
            <div className="flex flex-col items-center text-center gap-3 pt-2">
              <span className="w-14 h-14 rounded-[20px] bg-sc-green/10 text-sc-green flex items-center justify-center"><Check size={26} strokeWidth={2.6} /></span>
              <DialogTitle className="text-center">Code ready</DialogTitle>
              <DialogDescription className="text-center">Share it with the organiser. It works once and expires in 48 hours.</DialogDescription>
              <span className="w-full rounded-2xl bg-sc-bg py-4 text-[30px] font-extrabold tracking-[0.3em] font-mono">{generatedCode}</span>
              <div className="w-full flex gap-2">
                <button type="button" onClick={() => handleCopyCode(generatedCode)} className={cn(modalCancel, "flex-1 px-3")}>
                  {copied === generatedCode ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy</>}
                </button>
                <button type="button" onClick={() => shareCode(generatedCode)} className={cn(modalAction, "flex-1 px-3")}><Share2 size={16} /> Share</button>
              </div>
              <button type="button" onClick={closeDialog} className="text-[14px] font-bold text-sc-ink3 py-1">Done</button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>New booking code</DialogTitle>
                <DialogDescription>Pick the date and time this free booking covers.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3 min-w-0">
                <label className="flex flex-col gap-1.5 min-w-0">
                  <span className="text-[12.5px] font-bold text-sc-ink2">Date</span>
                  <input type="date" value={accessCodeForm.match_date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setAccessCodeForm({ ...accessCodeForm, match_date: e.target.value })} className={field} />
                </label>
                <div className="flex flex-col gap-1.5 min-w-0">
                  <span className="text-[12.5px] font-bold text-sc-ink2">Starts</span>
                  <TimeInput value={accessCodeForm.start_time} onChange={(v) => setAccessCodeForm({ ...accessCodeForm, start_time: v })} placeholder="01:00 PM" />
                </div>
                <div className="flex flex-col gap-1.5 min-w-0">
                  <span className="text-[12.5px] font-bold text-sc-ink2">Ends</span>
                  <TimeInput value={accessCodeForm.end_time} onChange={(v) => setAccessCodeForm({ ...accessCodeForm, end_time: v })} placeholder="03:00 PM" />
                </div>
                <button
                  type="button"
                  onClick={() => setAccessCodeForm({ ...accessCodeForm, is_recurring: !accessCodeForm.is_recurring })}
                  className="flex items-center justify-between gap-3 rounded-xl bg-sc-bg px-3.5 h-12"
                  aria-pressed={accessCodeForm.is_recurring}
                >
                  <span className="text-[14px] font-bold inline-flex items-center gap-2"><Repeat size={16} /> Repeats</span>
                  <span className={cn("w-11 h-6 rounded-full p-0.5 transition-colors", accessCodeForm.is_recurring ? "bg-sc-green" : "bg-black/15")}>
                    <span className={cn("block w-5 h-5 rounded-full bg-white shadow transition-transform", accessCodeForm.is_recurring && "translate-x-5")} />
                  </span>
                </button>
                {accessCodeForm.is_recurring && (
                  <div className="flex flex-col gap-2.5">
                    <Segmented
                      options={[{ value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }, { value: "monthly", label: "Monthly" }]}
                      value={(accessCodeForm.recurring_frequency || "weekly") as any}
                      onChange={(v) => setAccessCodeForm({ ...accessCodeForm, recurring_frequency: v })}
                    />
                    <label className="flex items-center justify-between gap-3">
                      <span className="text-[13px] font-bold text-sc-ink2">How many times</span>
                      <input type="number" inputMode="numeric" min="1" max="52" value={accessCodeForm.recurring_occurrences} onChange={(e) => setAccessCodeForm({ ...accessCodeForm, recurring_occurrences: e.target.value.replace(/[^0-9]/g, "").slice(0, 2) })} placeholder="4" className={cn(field, "w-24 text-center")} />
                    </label>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={closeDialog} className={cn(modalCancel, "flex-1 px-3")}>Cancel</button>
                <button type="button" onClick={handleGenerateAccessCode} disabled={loading} className={cn(modalAction, "flex-1 px-3")}>
                  {loading ? <Loader2 size={18} className="animate-spin" /> : "Create code"}
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VenueAccessCode;
