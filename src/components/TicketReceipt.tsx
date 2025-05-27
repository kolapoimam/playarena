import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, ArrowLeft, Ticket, Copy } from "lucide-react";
import { format } from "date-fns";
import Navbar from "@/components/Navbar";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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
  const [downloadFormat, setDownloadFormat] = useState<'png' | 'pdf'>('png');
  const cardRef = useRef<HTMLDivElement>(null);

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
      toast({
        title: "Error",
        description: "Ticket card is not ready. Please try again.",
        variant: "destructive",
      });
      return;
    }
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');

      if (downloadFormat === 'png') {
        const link = document.createElement('a');
        link.download = `PlayArena-Ticket-${ticket?.match.title.replace(/\s+/g, '-')}.png`;
        link.href = imgData;
        link.click();
      } else {
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height],
        });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`PlayArena-Ticket-${ticket?.match.title.replace(/\s+/g, '-')}.pdf`);
      }
    } catch (error) {
      console.error("Error generating ticket:", error);
      toast({
        title: "Error",
        description: `Failed to download ticket as ${downloadFormat.toUpperCase()}.`,
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const copyTicketCode = () => {
    if (ticket?.ticket_code) {
      navigator.clipboard.writeText(ticket.ticket_code);
      toast({
        title: "Copied!",
        description: "Ticket code copied to clipboard",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold mb-2">Ticket Not Found</h2>
          <p className="text-muted-foreground">The ticket you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-gray-100 dark:bg-gray-900">
      <header className="sticky top-0 z-50 bg-gradient-to-r from-green-500 to-green-700 text-white shadow-lg">
        <div className="p-4 flex items-center justify-between max-w-7xl mx-auto">
          <Button
            variant="ghost"
            className="text-white hover:bg-green-600 transition-colors"
            onClick={() => navigate(`/match/${ticket.match.slug}`)}
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to Match
          </Button>
          <h1 className="text-2xl font-bold">Your Ticket</h1>
          <div className="w-10"></div>
        </div>
      </header>

      <div className="p-6 max-w-3xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Tickets Purchased!</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">
            Your tickets have been successfully purchased. Below is your unique 6-digit ticket code for entry.
          </p>
          <div className="relative">
            {/* Ticket Card */}
            <div
              ref={cardRef}
              className="relative bg-gradient-to-r from-green-500 to-green-700 rounded-lg p-6 text-white shadow-xl max-w-md mx-auto overflow-hidden border-4 border-dashed border-white/30 animate-ticket-reveal"
              style={{
                backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.1) 75%, transparent 75%, transparent)',
                backgroundSize: '40px 40px',
              }}
            >
              {/* Perforated Edge Semi-Circles */}
              <div className="absolute top-0 left-0 w-full h-2 bg-white/20 border-t border-dashed border-white/50" />
              <div className="absolute bottom-0 left-0 w-full h-2 bg-white/20 border-b border-dashed border-white/50" />
              <div className="absolute top-0 left-[-12px] w-6 h-6 bg-gray-100 dark:bg-gray-900 rounded-full" style={{ top: '20%' }} />
              <div className="absolute top-0 left-[-12px] w-6 h-6 bg-gray-100 dark:bg-gray-900 rounded-full" style={{ top: '50%' }} />
              <div className="absolute top-0 left-[-12px] w-6 h-6 bg-gray-100 dark:bg-gray-900 rounded-full" style={{ top: '80%' }} />
              <div className="absolute top-0 right-[-12px] w-6 h-6 bg-gray-100 dark:bg-gray-900 rounded-full" style={{ top: '20%' }} />
              <div className="absolute top-0 right-[-12px] w-6 h-6 bg-gray-100 dark:bg-gray-900 rounded-full" style={{ top: '50%' }} />
              <div className="absolute top-0 right-[-12px] w-6 h-6 bg-gray-100 dark:bg-gray-900 rounded-full" style={{ top: '80%' }} />

              {/* Ticket Content */}
              <div className="flex items-center justify-between mb-4">
                <img src="/playarenalight.png" alt="PlayArena Logo" className="h-10 w-auto" />
                <Ticket className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold mb-4 tracking-tight font-condensed uppercase">{ticket.match.title}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-sm">
                <div>
                  <div className="flex items-center mb-2">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span>{ticket.match.venue?.name || "Venue"}, {ticket.match.venue?.city || ""}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>
                      {format(new Date(ticket.match.match_date), "PPP")} at{" "}
                      {format(new Date(`1970-01-01T${ticket.match.match_time}`), "p")}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center mb-2">
                    <span className="font-semibold">Tickets:</span>
                    <span className="ml-2">{ticket.number_of_tickets}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-semibold">Total:</span>
                    <span className="ml-2">₦{ticket.total_price.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <div className="bg-white text-green-600 rounded-md p-4 text-center shadow-inner">
                <p className="text-sm font-medium uppercase tracking-wide">Ticket Code</p>
                <p className="text-4xl font-bold tracking-wider mt-1 font-mono">{ticket.ticket_code}</p>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 my-4 text-center">
            <strong>Note:</strong> Save or download this ticket code. You'll need it for entry on match day.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <select
                value={downloadFormat}
                onChange={(e) => setDownloadFormat(e.target.value as 'png' | 'pdf')}
                className="absolute top-0 left-0 w-20 p-2 text-sm bg-gray-100 dark:bg-gray-700 border rounded-lg"
                aria-label="Select download format"
              >
                <option value="png">PNG</option>
                <option value="pdf">PDF</option>
              </select>
              <Button
                className="w-full bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-2 pl-24 transition-colors"
                onClick={handleDownload}
                disabled={isDownloading}
                aria-label={`Download ticket as ${downloadFormat.toUpperCase()}`}
              >
                {isDownloading ? "Downloading..." : `Download ${downloadFormat.toUpperCase()}`}
              </Button>
            </div>
            <Button
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-2 transition-colors"
              onClick={copyTicketCode}
              disabled={isDownloading}
              aria-label="Copy ticket code"
            >
              <Copy size={16} className="mr-2" />
              Copy Code
            </Button>
          </div>
        </div>
      </div>
      <Navbar />
    </div>
  );
};

export default TicketReceipt;
