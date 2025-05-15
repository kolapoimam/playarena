import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Calendar, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import QRCode from "qrcode";
import { format } from "date-fns";
import Navbar from "@/components/Navbar";

type Match = {
  id: string;
  slug: string;
  title: string;
  match_date: string;
  match_time: string;
  venue: { name: string; city: string } | null;
  sell_tickets: boolean;
  ticket_price: number | null;
  max_tickets: number | null;
};

const Ticketing = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [match, setMatch] = useState<Match | null>(null);
  const [fanName, setFanName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [ticketCount, setTicketCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [checkinCode, setCheckinCode] = useState("");

  useEffect(() => {
    let isMounted = true;
    if (!slug) {
      if (isMounted) {
        toast({
          title: "Error",
          description: "Invalid match URL.",
          variant: "destructive",
        });
        navigate("/matches");
      }
      return;
    }
    fetchMatchDetails();
    return () => {
      isMounted = false;
    };
  }, [slug, navigate]);

  const fetchMatchDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("matches")
        .select(`
          id, slug, title, match_date, match_time, sell_tickets, ticket_price, max_tickets,
          venue:venues(name, city)
        `)
        .eq("slug", slug)
        .single();

      if (error) {
        console.error("Supabase error:", error.message, error.code);
        throw new Error("Match not found");
      }

      if (!data) {
        throw new Error("No match data returned");
      }

      if (!data.sell_tickets) {
        toast({
          title: "Tickets Unavailable",
          description: "Tickets are not available for this match.",
          variant: "destructive",
        });
        navigate("/matches");
        return;
      }

      setMatch(data as Match);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching match:", error);
      toast({
        title: "Error",
        description: "Failed to load match details. Please try again.",
        variant: "destructive",
      });
      navigate("/matches");
    }
  };

  const generateCheckinCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleBuyTickets = async () => {
    if (!match || !fanName || !phoneNumber || phoneNumber.length !== 11 || (match.ticket_price && ticketCount < 1)) {
      toast({
        title: "Error",
        description: "Please fill all required fields correctly.",
        variant: "destructive",
      });
      return;
    }

    const totalPrice = match.ticket_price ? match.ticket_price * ticketCount : 0;
    const newCheckinCode = generateCheckinCode();
    const qrData = `${match.id}-${newCheckinCode}-${fanName}-${ticketCount}`;
    const qrUrl = await QRCode.toDataURL(qrData);

    try {
      const { error } = await supabase.from("tickets").insert({
        match_id: match.id,
        fan_name: fanName,
        phone_number: phoneNumber,
        email: email || null,
        number_of_tickets: ticketCount,
        total_price: totalPrice,
        qr_code: qrData,
        checkin_code: newCheckinCode,
      });

      if (error) throw error;

      setQrCodeUrl(qrUrl);
      setCheckinCode(newCheckinCode);
      setTicketDialogOpen(true);
    } catch (error) {
      console.error("Error purchasing tickets:", error);
      toast({
        title: "Error",
        description: "Failed to purchase tickets. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-playarena-500"></div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="p-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft size={18} className="mr-2" /> Back
        </Button>
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold mb-2">Match Not Found</h2>
          <p className="text-muted-foreground">The match you're looking for doesn't exist or has no tickets available.</p>
          <Button onClick={() => navigate("/matches")} className="mt-4">
            View Available Matches
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="p-4 bg-gradient-to-r from-yellow-500 to-yellow-700 text-white rounded-b-2xl shadow-lg">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)} className="text-white hover:bg-yellow-600">
            <ArrowLeft size={18} className="mr-2" /> Back
          </Button>
          <div className="text-center">
            <h1 className="text-2xl font-bold">Buy Tickets</h1>
          </div>
          <div className="w-10"></div>
        </div>
      </header>

      <div className="p-6 max-w-md mx-auto">
        <h2 className="text-xl font-bold mb-4">{match.title}</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar size={18} />
            <span>{format(new Date(match.match_date), "PPP")} at {format(new Date(`2000-01-01T${match.match_time}`), "p")}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={18} />
            <span>{match.venue ? `${match.venue.name}, ${match.venue.city}` : "Venue TBD"}</span>
          </div>
          {match.ticket_price && (
            <div className="font-semibold">
              Price per Ticket: ₦{match.ticket_price.toFixed(2)}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Label>Number of Tickets</Label>
            <Button
              variant="outline"
              onClick={() => setTicketCount(prev => Math.max(1, prev - 1))}
              disabled={ticketCount <= 1}
            >
              -
            </Button>
            <span className="mx-2">{ticketCount}</span>
            <Button
              variant="outline"
              onClick={() => setTicketCount(prev => (match.max_tickets ? Math.min(match.max_tickets, prev + 1) : prev + 1))}
            >
              +
            </Button>
          </div>
          <Input
            placeholder="Your Full Name"
            value={fanName}
            onChange={(e) => setFanName(e.target.value)}
            required
          />
          <Input
            placeholder="Phone Number (11 digits)"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 11))}
            required
            maxLength={11}
          />
          <Input
            placeholder="Email (Optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
          />
          <Button
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
            onClick={handleBuyTickets}
          >
            Buy Tickets
          </Button>
        </div>
      </div>
      <Navbar />

      <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <TicketPrinter match={match} fanName={fanName} ticketCount={ticketCount} qrCodeUrl={qrCodeUrl} checkinCode={checkinCode} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

const TicketPrinter = ({ match, fanName, ticketCount, qrCodeUrl, checkinCode }: { match: Match; fanName: string; ticketCount: number; qrCodeUrl: string; checkinCode: string }) => {
  const [printProgress, setPrintProgress] = useState(0);
  const totalSteps = 100;

  useEffect(() => {
    const interval = setInterval(() => {
      setPrintProgress((prev) => {
        if (prev >= totalSteps) {
          clearInterval(interval);
          return totalSteps;
        }
        return prev + 1;
      });
    }, 30);
    return () => clearInterval(interval);
  }, []);

  const handleDownload = (format: "png" | "pdf") => {
    if (format === "png" && qrCodeUrl) {
      const link = document.createElement("a");
      link.href = qrCodeUrl;
      link.download = `Ticket-${match.title}-${fanName}.png`;
      link.click();
    }
  };

  return (
    <div className="text-center">
      <DialogTitle className="text-xl font-bold">Ticket Printing</DialogTitle>
      <DialogDescription>
        <div className="relative mb-4">
          <div className="bg-gray-200 h-12 rounded-t-lg"></div>
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-20 h-20 bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-sm">Printer</span>
          </div>
          {printProgress < totalSteps && (
            <div
              className="absolute bottom-0 left-0 bg-white h-0 transition-all duration-100 ease-in-out"
              style={{ width: "100%", height: `${(printProgress / totalSteps) * 200}px` }}
            >
              <div className="p-4 bg-white shadow-md rounded-b-lg">
                <h3 className="font-semibold">Ticket</h3>
                <p>Fan: {fanName}</p>
                <p>Tickets: {ticketCount}</p>
                <p>Match: {match.title}</p>
                <p>Date: {format(new Date(match.match_date), "PPP")} at {format(new Date(`2000-01-01T${match.match_time}`), "p")}</p>
                <p>Venue: {match.venue ? `${match.venue.name}, ${match.venue.city}` : "Venue TBD"}</p>
                <p>Checkin Code: {checkinCode}</p>
                <p>We're going to watch {match.title}!</p>
                {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code" className="w-20 h-20 mx-auto mt-2" />}
              </div>
            </div>
          )}
          {printProgress >= totalSteps && (
            <div className="p-4 bg-white shadow-md rounded-b-lg">
              <h3 className="font-semibold">Ticket</h3>
              <p>Fan: {fanName}</p>
              <p>Tickets: {ticketCount}</p>
              <p>Match: {match.title}</p>
              <p>Date: {format(new Date(match.match_date), "PPP")} at {format(new Date(`2000-01-01T${match.match_time}`), "p")}</p>
              <p>Venue: {match.venue ? `${match.venue.name}, ${match.venue.city}` : "Venue TBD"}</p>
              <p>Checkin Code: {checkinCode}</p>
              <p>We're going to watch {match.title}!</p>
              {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code" className="w-20 h-20 mx-auto mt-2" />}
              <div className="mt-4 flex gap-2">
                <Button onClick={() => handleDownload("png")}>Download PNG</Button>
                <Button onClick={() => handleDownload("pdf")} disabled>Download PDF (Coming Soon)</Button>
              </div>
            </div>
          )}
        </div>
      </DialogDescription>
    </div>
  );
};

export default Ticketing;
