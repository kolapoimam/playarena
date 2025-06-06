import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  ArrowLeft, 
  ExternalLink,
  Bell,
  Lock
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { addHours } from "date-fns";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import PlayersTable from "@/components/PlayersTable";
import MatchDetailsDialogue from "@/components/MatchDetailsDialogue";

type Match = {
  id: string;
  slug: string;
  title: string;
  match_date: string;
  match_time: string;
  total_slots: number;
  is_paid: boolean;
  price: number | null;
  notes: string | null;
  organizer_name: string;
  player_number_required: boolean;
  is_private: boolean;
  access_password: string | null;
  sell_tickets: boolean;
  ticket_price: number | null;
  max_tickets: number | null;
  venue: {
    id: string;
    slug: string;
    name: string;
    city: string;
    map_link: string | null;
  } | null;
  players: {
    player_name: string;
    player_status: 'Registered' | 'Checked In' | 'Absent';
    number_of_slots: number;
  }[];
};

const MatchDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false); // State to control MatchDetailsDialogue
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null); // State for confirmation code
  const [selectedSlots, setSelectedSlots] = useState(1); // Default to 1 slot

  useEffect(() => {
    if (!slug) return;
    checkMatchAccess(slug);
  }, [slug]);

  const checkMatchAccess = async (matchSlug: string) => {
    try {
      const { data, error } = await supabase
        .from("matches")
        .select(`
          *,
          venue:venues(id, slug, name, city, map_link),
          players(player_name, player_status, number_of_slots)
        `)
        .eq("slug", matchSlug)
        .single();

      if (error) throw error;

      const matchData = data as Match;
      if (matchData.is_private) {
        setPasswordDialogOpen(true);
        setLoading(false);
      } else {
        setMatch(matchData);
        setLoading(false);
      }
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

  const verifyPassword = async () => {
    if (!slug) {
      navigate("/matches");
      return;
    }

    if (!password) {
      toast({
        title: "Error",
        description: "Please enter a password.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("matches")
        .select("access_password, is_private")
        .eq("slug", slug)
        .single();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to verify access. Please try again.",
          variant: "destructive",
        });
        navigate("/matches");
        return;
      }

      if (!data.is_private) {
        fetchMatch(slug);
        setPasswordDialogOpen(false);
        return;
      }

      if (data.access_password === password) {
        localStorage.setItem(`match_access_${slug}`, "true");
        setPasswordDialogOpen(false);
        fetchMatch(slug);
      } else {
        toast({
          title: "Error",
          description: "Incorrect or expired password. Please try again.",
          variant: "destructive",
        });
        navigate("/matches");
      }
    } catch (error) {
      console.error("Error verifying password:", error);
      toast({
        title: "Error",
        description: "Failed to verify access. Please try again.",
        variant: "destructive",
      });
      navigate("/matches");
    }
  };

  const fetchMatch = async (matchSlug: string) => {
    try {
      const { data, error } = await supabase
        .from("matches")
        .select(`
          *,
          venue:venues(id, slug, name, city, map_link),
          players(player_name, player_status, number_of_slots)
        `)
        .eq("slug", matchSlug)
        .single();

      if (error) throw error;

      setMatch(data as Match);
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

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    };
    return new Date(dateString).toLocaleDateString("en-NG", options);
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(":");
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return date.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  const getMatchStatus = () => {
    if (!match) return { isStarted: false, isEnded: false, isFull: false };
    
    const matchDateTime = new Date(`${match.match_date}T${match.match_time}`);
    const matchEndTime = addHours(matchDateTime, 2); // Match duration is 2 hours
    const now = new Date("2025-06-06T18:46:00+01:00"); // Current date and time: 06:46 PM WAT, June 06, 2025
    
    const totalPlayerSlots = match.players.reduce((sum, player) => sum + (player.number_of_slots || 1), 0);
    const isFull = totalPlayerSlots >= match.total_slots;
    const isStarted = now >= matchDateTime && now < matchEndTime;
    const isEnded = now >= matchEndTime;
    
    return { isStarted, isEnded, isFull };
  };

  const addToCalendar = () => {
    if (!match) return;

    const matchDateTime = new Date(`${match.match_date}T${match.match_time}`);
    const endDateTime = new Date(matchDateTime.getTime() + 2 * 60 * 60 * 1000);

    const formatGoogleDate = (date: Date) => {
      const pad = (num: number) => num.toString().padStart(2, '0');
      return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
    };

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE` +
      `&text=${encodeURIComponent(`Sport Cliq: ${match.title}`)}` +
      `&dates=${formatGoogleDate(matchDateTime)}/${formatGoogleDate(endDateTime)}` +
      `&location=${encodeURIComponent(match.venue ? `${match.venue.name}, ${match.venue.city}` : 'Unknown Venue')}` +
      `&details=${encodeURIComponent(
        `Football Match organized by ${match.organizer_name}.\n\n` +
        `Match Link: ${window.location.origin}/match/${match.slug}\n\n` +
        `Venue: ${match.venue?.name || 'Unknown'}, ${match.venue?.city || ''}\n\n` +
        `Additional Info: ${match.notes || 'No additional information provided'}\n\n` +
        `${match.is_private ? `Access Password: ${match.access_password}\n\n` : ''}` +
        `Powered by @SportCliq`
      )}` +
      `&sf=true&output=xml`;

    window.open(googleCalendarUrl, '_blank', 'width=600,height=600');
    setTimeout(() => navigate(`/match/${slug}`), 1000);
  };

  // Handle joining the match
  const handleJoinMatch = () => {
    if (!match) return;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase(); // Generate a random confirmation code
    setConfirmationCode(code);
    setSelectedSlots(1); // Default to 1 slot
    setDialogOpen(true); // Open the dialog
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-playarena-500"></div>
      </div>
    );
  }

  if (!match && !passwordDialogOpen) {
    return (
      <div className="p-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)} 
          className="mb-4"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold mb-2">Match Not Found</h2>
          <p className="text-muted-foreground">The match you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  if (passwordDialogOpen) {
    return (
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl border border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white text-center">Access Required</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300 text-center mt-2">
              This is a private match. Please enter the 6-character access password to view details.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="text"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700"
              maxLength={6}
            />
          </div>
          <DialogFooter className="flex justify-center">
            <Button 
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg transition-colors"
              onClick={verifyPassword}
            >
              Verify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const { isStarted, isEnded, isFull } = getMatchStatus();
  const totalPlayerSlots = match.players.reduce((sum, player) => sum + (player.number_of_slots || 1), 0);

  return (
    <div className="min-h-screen pb-24">
      <header className="p-4 bg-gradient-to-r from-green-500 to-green-700 text-white rounded-b-2xl shadow-lg">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)} 
            className="text-white hover:bg-green-600"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <div className="text-center">
            <h1 className="text-2xl font-bold">Match Details</h1>
          </div>
          <div className="w-10"></div>
        </div>
      </header>

      <div className="p-4">
        <h1 className="text-2xl font-bold mb-2">
          {match.title}{" "}
          {match.is_private && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Lock size={16} className="inline text-gray-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>This is a private match</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </h1>
<div className="flex justify-between items-center mb-4">
  <div className="flex items-center gap-2">
    <p className="text-muted-foreground">Organized by {match.organizer_name}</p>
    <img
      src="/green-verified.png"
      alt="Verified"
      className="inline-block w-5 h-5"
    />
  </div>
</div>
        
        {isEnded ? (
          <div className="bg-gray-100 border border-gray-200 text-gray-700 px-4 py-3 rounded mb-4">
            This match has passed
          </div>
        ) : isStarted ? (
          <div className="bg-playarena-100 border border-playarena-200 text-playarena-700 px-4 py-3 rounded mb-4">
            This match has started!
          </div>
        ) : isFull ? (
          <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            This match is completely filled up!
          </div>
        ) : null}
        
        <div className="space-y-4">
          <div className="border rounded-lg p-4 bg-card shadow-md relative">
<div className="absolute top-4 right-4 m-0 p-0">
  <Button
    variant="outline"
    size="sm"
    onClick={addToCalendar}
    className="text-playarena-600 border-playarena-300 hover:bg-playarena-50 p-2 m-0"
  >
    <Bell size={16} className="mr-0" />
  </Button>
</div>
            
            <h2 className="font-semibold mb-3">Match Details</h2>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar size={18} />
                <span>{formatDate(match.match_date)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock size={18} />
                <span>{formatTime(match.match_time)}</span>
              </div>
              
              {match.venue && (
                <div 
                  className="flex items-start gap-2 cursor-pointer" 
                  onClick={() => navigate(`/venue/${match.venue?.slug}`)}
                >
                  <MapPin size={18} className="mt-0.5" />
                  <div>
                    <span className="text-playarena-600 hover:underline">
                      {match.venue.name}, {match.venue.city}
                    </span>
                    {match.venue.map_link && (
                      <div className="mt-1">
                        <a 
                          href={match.venue.map_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs flex items-center text-playarena-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={12} className="mr-1" />
                          View on Google Maps
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Users size={18} />
                <span>
                  {totalPlayerSlots}/{match.total_slots} spots filled
                  {isFull && " (FULL)"}
                </span>
              </div>
              
              {match.is_paid && (
                <div className="font-semibold mt-2">
                  Price: ₦{match.price?.toFixed(2)}
                </div>
              )}
              
              {match.notes && (
                <div className="mt-3">
                  <h3 className="text-sm font-medium mb-1">Notes:</h3>
                  <p className="text-sm bg-muted p-2 rounded">{match.notes}</p>
                </div>
              )}
            </div>
          </div>
          
          <PlayersTable 
            match={match}
            navigate={navigate}
            isEnded={isEnded}
            isFull={isFull}
            totalPlayerSlots={totalPlayerSlots}
          />
          
          <MatchDetailsDialogue 
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            match={match}
            confirmationCode={confirmationCode}
            selectedSlots={selectedSlots}
            totalPlayerSlots={totalPlayerSlots}
          />
          
          {!isFull && !isEnded && (
            <Button 
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg px-6 py-3 shadow-sm transition-colors duration-200"
              onClick={handleJoinMatch}
            >
              Join This Match
            </Button>
          )}
        </div>
      </div>
      <Navbar />
    </div>
  );
};

export default MatchDetail;
