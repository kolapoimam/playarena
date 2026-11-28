import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Copy, Download } from "lucide-react";
import TicketCard, { downloadElementAsPng } from "@/components/sc/TicketCard";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type Venue = {
  slug: string;
  name: string;
  city: string;
};

type Match = {
  title: string;
  match_date: string;
  match_time: string;
  is_paid: boolean;
  price: number | null;
  total_slots: number;
  is_recurring: boolean;
  recurring_frequency: string | null;
  recurring_occurrences: number | null;
  venue: Venue | null;
};

type MatchJoinersDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: Match | null;
  confirmationCode: string | null;
  selectedSlots: number;
  totalPlayerSlots: number;
};

const MatchJoinersDialog = ({
  open,
  onOpenChange,
  match,
  confirmationCode,
  selectedSlots,
  totalPlayerSlots,
}: MatchJoinersDialogProps) => {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

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


  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "Unknown Date";
    const options: Intl.DateTimeFormatOptions = {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    };
    return new Date(dateString).toLocaleDateString("en-NG", options);
  };

  const formatTime = (timeString: string | undefined) => {
    if (!timeString) return "Unknown Time";
    const [hours, minutes] = timeString.split(":");
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return date.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  const handleDownload = async () => {
    if (!cardRef.current || !isImageLoaded) {
      toast({ title: "One moment", description: "Your ticket is still loading. Try again in a second." });
      return;
    }
    setIsDownloading(true);
    try {
      await downloadElementAsPng(cardRef.current, `SportCliq-Ticket-${match?.title || "Match"}-${confirmationCode || ""}.png`);
    } catch (error) {
      console.error("Error generating image:", error);
      toast({ title: "Error", description: "Failed to download your ticket.", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  const rows = [
    { label: "Date", value: formatDate(match?.match_date) },
    { label: "Time", value: formatTime(match?.match_time) },
    { label: "Venue", value: match?.venue ? `${match.venue.name}, ${match.venue.city}` : "To be confirmed" },
    { label: "Slots", value: `${selectedSlots} slot${selectedSlots === 1 ? "" : "s"} booked` },
    { label: "Entry", value: match?.is_paid && match?.price ? `₦${(match.price * selectedSlots).toLocaleString("en-NG")}` : "Free" },
    ...(userId && match?.is_recurring ? [{ label: "Repeats", value: `${match.recurring_frequency} · ${match.recurring_occurrences}x` }] : []),
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen && !isDownloading) onOpenChange(newOpen);
      }}
    >
      <DialogContent className="w-full max-w-[calc(100%-1.5rem)] sm:max-w-[420px] max-h-[92vh] overflow-y-auto bg-sc-bg p-5">
        <div className="flex flex-col items-center gap-2 text-center pt-2">
          <span className="w-14 h-14 rounded-full bg-sc-green text-white flex items-center justify-center">
            <Check size={28} strokeWidth={3} />
          </span>
          <DialogTitle className="text-2xl font-extrabold tracking-[-0.02em] text-sc-ink">You're in!</DialogTitle>
          <DialogDescription className="text-sm text-sc-ink2 max-w-[280px]">
            {selectedSlots > 1 ? `${selectedSlots} slots are booked.` : "Your slot is booked."} Show this QR code or the code below at check in.
          </DialogDescription>
        </div>
        <TicketCard
          ref={cardRef}
          sport="football"
          kind="Match ticket"
          title={match?.title || "Your match"}
          rows={rows}
          code={confirmationCode}
          footnote="The organiser scans this QR code on match day."
          onReady={() => setIsImageLoaded(true)}
        />
        <div className="flex flex-col gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!isImageLoaded || isDownloading}
            className="h-[52px] rounded-full bg-sc-green text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Download size={18} /> {isDownloading ? "Saving..." : "Save ticket as image"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirmationCode) navigator.clipboard?.writeText(confirmationCode);
              toast({ title: "Copied", description: "Your confirmation code is on the clipboard." });
            }}
            className="h-[46px] rounded-full bg-white border border-sc-line text-sc-ink font-bold flex items-center justify-center gap-2"
          >
            <Copy size={16} /> Copy code
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MatchJoinersDialog;
