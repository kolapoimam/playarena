
import { useState, useEffect, useRef } from "react";
import { NotFoundState } from "@/components/sc/FunState";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, ArrowLeft, Ticket, Share2, Download, Trophy, Volleyball, Medal } from "lucide-react";
import { format } from "date-fns";
import Navbar from "@/components/Navbar";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import { BackButton } from "@/components/sc/ui";
import { RowsSkeleton } from "@/components/sc/skeletons";
import TicketCard, { downloadElementAsPng } from "@/components/sc/TicketCard";
import { Check } from "lucide-react";
type Ticket = {
  ticket_code: string;
  buyer_name: string;
  number_of_tickets: number;
  total_price: number;
  purchase_date: string;
  match: {
    id: string;
    slug: string;
    title: string;
    match_date: string;
    match_time: string;
    venue: {
      name: string;
      city: string;
    } | null;
  };
};

const TicketReceipt = () => {
  const { ticketCode } = useParams<{ ticketCode: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [backgroundColor, setBackgroundColor] = useState('#4CAF50'); // Default green

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("tickets")
          .select(`
            ticket_code, buyer_name, number_of_tickets, total_price, purchase_date,
            match:matches(id, slug, title, match_date, match_time, venue:venues(name, city))
          `)
          .eq("ticket_code", ticketCode)
          .single();

        if (error) throw error;
        setTicket(data as Ticket);
      } catch (error) {
        console.error("Error fetching ticket:", error);
        toast({
          title: "Error",
          description: "Failed to load ticket details. Please try again.",
          variant: "destructive",
        });
        navigate("/matches");
      } finally {
        setLoading(false);
      }
    };
    if (ticketCode) fetchTicket();
  }, [ticketCode, navigate, toast]);

  const handleDownload = async () => {
    if (!cardRef.current) {
      toast({ title: "One moment", description: "Your ticket is still loading." });
      return;
    }
    setIsDownloading(true);
    try {
      await downloadElementAsPng(cardRef.current, `SportCliq-Ticket-${ticket?.match.title}-${ticket?.ticket_code}.png`);
    } catch (error) {
      console.error("Error generating ticket:", error);
      toast({ title: "Error", description: "Failed to download your ticket.", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = () => {
    const shareUrl = window.location.href;
    const shareText = `Check out my ticket for ${ticket?.match.title}! 🎟️ Ticket Code: ${ticket?.ticket_code}`;
    if (navigator.share) {
      navigator
        .share({
          title: "My SportCliq Ticket Receipt",
          text: shareText,
          url: shareUrl,
        })
        .then(() => {
          toast({
            title: "Shared!",
            description: "Ticket receipt link shared successfully.",
          });
        })
        .catch((error) => {
          console.error("Error sharing:", error);
          toast({
            title: "Error",
            description: "Failed to share the ticket receipt.",
            variant: "destructive",
          });
        });
    } else {
      toast({
        title: "Sharing Not Supported",
        description: "Your browser does not support sharing. Please copy the link manually.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="w-full"><RowsSkeleton /></div>
    );
  }

  if (!ticket) return <NotFoundState kind="ticket" />;

  const isDarkBackground = backgroundColor === '#4CAF50' || backgroundColor === '#000000' || backgroundColor === '#2196F3' || backgroundColor === '#9C27B0';
  const logoSrc = isDarkBackground ? '/playarenadark.png' : '/playarenalight.png';

  return (
    <div className="min-h-screen pb-20 bg-sc-bg dark:bg-gray-900">
      <header className="px-5 pt-[max(env(safe-area-inset-top),1rem)] sticky top-0 z-20 bg-sc-bg/95 backdrop-blur-xl pb-3">
          <div className="pt-3 flex items-center justify-between gap-3">
            <BackButton to={`/match/${ticket.match.slug}`} />
            <h1 className="m-0 flex-1 text-center text-[17px] font-extrabold truncate">Your ticket</h1>
            <div className="min-w-11 flex justify-end"></div>
          </div>
        </header>

      <div className="px-5 pt-2 pb-32 flex flex-col gap-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="w-14 h-14 rounded-full text-white flex items-center justify-center" style={{ background: "#EC4899" }}>
            <Check size={28} strokeWidth={3} />
          </span>
          <h2 className="m-0 text-2xl font-extrabold tracking-[-0.02em]">Tickets confirmed</h2>
          <p className="m-0 text-sm text-sc-ink2 max-w-[290px]">Show this QR code at the gate. The code below works too.</p>
        </div>
        <TicketCard
          ref={cardRef}
          sport="pink"
          kind="Spectator"
          title={ticket.match.title}
          rows={[
            { label: "Date", value: format(new Date(ticket.match.match_date), "EEE, d MMM yyyy") },
            { label: "Time", value: format(new Date(`1970-01-01T${ticket.match.match_time}`), "p") },
            { label: "Venue", value: `${ticket.match.venue?.name || "Venue"}${ticket.match.venue?.city ? `, ${ticket.match.venue.city}` : ""}` },
            { label: "Holder", value: ticket.buyer_name },
            { label: "Tickets", value: String(ticket.number_of_tickets) },
          ]}
          code={ticket.ticket_code}
          codeLabel="Ticket code"
          footnote="Gate staff scan this QR code on match day."
        />
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex-1 h-[52px] rounded-full text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: "#EC4899" }}
          >
            <Download size={18} /> {isDownloading ? "Saving..." : "Save as image"}
          </button>
          <button type="button" onClick={handleShare} className="h-[52px] px-5 rounded-full bg-white border border-sc-line font-bold flex items-center gap-2">
            <Share2 size={18} /> Share
          </button>
        </div>
      </div>
      <Navbar />
    </div>
  );
};

export default TicketReceipt;
