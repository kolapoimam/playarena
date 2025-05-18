import { useEffect, useState, useRef, useCallback } from "react";
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
  Share2, 
  Download, 
  ChevronDown,
  ExternalLink,
  Trophy,
  DollarSign,
  CalendarPlus,
  Lock
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { format, isPast, addHours } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import html2canvas from "html2canvas";

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

type Cashout = {
  id: string;
  match_id: string;
  amount: number;
  status: "under_review" | "processed" | "failed" | "successful";
};

const formatStatus = (status: string) => {
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
};

const MatchDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [backgroundOption, setBackgroundOption] = useState("field");
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slug) {
      toast({
        title: "Error",
        description: "No match slug provided.",
        variant: "destructive",
      });
      navigate("/matches");
      return;
    }
    checkMatchAccess(slug);
  }, [slug, navigate, toast]);

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
        await fetchMatchDetails(matchData);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching match:", error);
      toast({
        title: "Error",
        description: "Failed to load match details. Please try again.",
        variant: "destructive",
      });
      setLoading(false); // Ensure loading state is cleared even on error
    }
  };

  const fetchMatchDetails = async (matchData: Match) => {
    try {
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('player_status, number_of_slots')
        .eq('match_id', matchData.id);

      if (playersError) throw playersError;

      const { data: cashoutData, error: cashoutError } = await supabase
        .from("cashout_requests")
        .select("amount, status")
        .eq("match_id", matchData.id)
        .in("status", ["processed", "successful"]);

      if (cashoutError) throw cashoutError;

      const totalPlayerSlots = playersData.reduce((sum, player) => sum + (player.number_of_slots || 1), 0);
      let balance = 0;
      if (matchData.is_paid && matchData.price) {
        const checkedInPlayers = playersData.filter(p => p.player_status === 'Checked In');
        balance = checkedInPlayers.reduce(
          (sum, player) => sum + ((player.number_of_slots || 1) * (matchData.price || 0)),
          0
        );
      }
      const cashoutTotal = cashoutData ? cashoutData.reduce((sum, request) => sum + (request.amount || 0), 0) : 0;
      balance -= cashoutTotal;
      setWalletBalance(balance < 0 ? 0 : balance);

      setMatch({ ...matchData, players: playersData.map(p => ({
        player_name: p.player_name || '',
        player_status: p.player_status as 'Registered' | 'Checked In' | 'Absent',
        number_of_slots: p.number_of_slots || 1
      })) });
    } catch (error) {
      console.error("Error fetching match details:", error);
      toast({
        title: "Error",
        description: "Failed to load match details. Please try again.",
        variant: "destructive",
      });
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

      await fetchMatchDetails(data as Match);
    } catch (error) {
      console.error("Error fetching match:", error);
      toast({
        title: "Error",
        description: "Failed to load match details. Please try again.",
        variant: "destructive",
      });
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
    const matchEndTime = addHours(matchDateTime, 2);
    const now = new Date("2025-05-18T21:41:00+01:00"); // Current date and time: 09:41 PM WAT, May 18, 2025
    
    const totalPlayerSlots = match.players ? match.players.reduce((sum, player) => sum + (player.number_of_slots || 1), 0) : 0;
    const isFull = totalPlayerSlots >= match.total_slots;
    const isStarted = now >= matchDateTime && now < matchEndTime;
    const isEnded = now >= matchEndTime;
    
    return { isStarted, isEnded, isFull };
  };

  const getStatusStyles = (status: string) => {
    switch (status.toLowerCase()) {
      case "registered":
        return "bg-yellow-500 text-white border-yellow-600";
      case "checked in":
        return "bg-green-500 text-white border-green-600";
      case "absent":
        return "bg-red-500 text-white border-red-600";
      default:
        return "bg-gray-500 text-white border-gray-600";
    }
  };

  const shareMatch = async () => {
    if (!match) return;
    
    const url = `${window.location.origin}/match/${match.slug}`;
    const totalPlayerSlots = match.players ? match.players.reduce((sum, player) => sum + (player.number_of_slots || 1), 0) : 0;
    const shareText = `Join my Football Match: ${match.title} at ${match.venue?.name || 'unknown venue'} on ${formatDate(match.match_date)} by ${formatTime(match.match_time)}. ${totalPlayerSlots}/${match.total_slots} slots. Powered by PlayArena. ${url}${match.is_private ? ` (Access Password: ${match.access_password})` : ''}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join my Football Match: ${match.title}`,
          text: shareText,
          url: url,
        });
      } catch (err) {
        console.error("Share failed:", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        toast({
          title: "Link copied!",
          description: "Share it with your friends to join the match.",
        });
      } catch (err) {
        toast({
          title: "Failed to copy",
          description: "Please try again or copy the URL manually.",
          variant: "destructive",
        });
      }
    }
  };

  const shareToWhatsApp = () => {
    if (!match) return;
    
    const url = `${window.location.origin}/match/${match.slug}`;
    const totalPlayerSlots = match.players ? match.players.reduce((sum, player) => sum + (player.number_of_slots || 1), 0) : 0;
    const shareText = `Join my Football Match: ${match.title} at ${match.venue?.name || 'unknown venue'} on ${formatDate(match.match_date)} by ${formatTime(match.match_time)}. ${totalPlayerSlots}/${match.total_slots} slots. Powered by PlayArena. ${url}${match.is_private ? ` (Access Password: ${match.access_password})` : ''}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareToTwitter = () => {
    if (!match) return;
    
    const url = `${window.location.origin}/match/${match.slug}`;
    const totalPlayerSlots = match.players ? match.players.reduce((sum, player) => sum + (player.number_of_slots || 1), 0) : 0;
    const shareText = `Join my Football Match: ${match.title} at ${match.venue?.name || 'unknown venue'} on ${formatDate(match.match_date)} by ${formatTime(match.match_time)}. ${totalPlayerSlots}/${match.total_slots} slots. Powered by PlayArena. ${url}${match.is_private ? ` (Access Password: ${match.access_password})` : ''}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(twitterUrl, '_blank');
  };

  const shareToFacebook = () => {
    if (!match) return;
    
    const url = `${window.location.origin}/match/${match.slug}`;
    const totalPlayerSlots = match.players ? match.players.reduce((sum, player) => sum + (player.number_of_slots || 1), 0) : 0;
    const shareText = `Join my Football Match: ${match.title} at ${match.venue?.name || 'unknown venue'} on ${formatDate(match.match_date)} by ${formatTime(match.match_time)}. ${totalPlayerSlots}/${match.total_slots} slots. Powered by PlayArena. ${match.is_private ? ` (Access Password: ${match.access_password})` : ''}`;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(shareText)}`;
    window.open(facebookUrl, '_blank');
  };

  const handleImageLoad = () => {
    setIsImageLoaded(true);
  };

  const handleDownload = useCallback(async () => {
    if (!cardRef.current || !isImageLoaded) {
      toast({
        title: "Error",
        description: "Card is not ready for download. Please wait a moment and try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: -window.scrollY,
      });

      const link = document.createElement('a');
      link.download = `PlayArena-Match-${match?.title.replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error("Error generating image:", error);
      toast({
        title: "Error",
        description: "Failed to download match card. Please try again.",
        variant: "destructive",
      });
    }
  }, [isImageLoaded, match, toast]);

  const addToCalendar = () => {
    if (!match) return;

    const matchDateTime = new Date(`${match.match_date}T${match.match_time}`);
    const endDateTime = new Date(matchDateTime.getTime() + 2 * 60 * 60 * 1000);

    const formatGoogleDate = (date: Date) => {
      const pad = (num: number) => num.toString().padStart(2, '0');
      return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
    };

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE` +
      `&text=${encodeURIComponent(`PlayArena: ${match.title}`)}` +
      `&dates=${formatGoogleDate(matchDateTime)}/${formatGoogleDate(endDateTime)}` +
      `&location=${encodeURIComponent(match.venue ? `${match.venue.name}, ${match.venue.city}` : 'Unknown Venue')}` +
      `&details=${encodeURIComponent(
        `Football Match organized by ${match.organizer_name}.\n\n` +
        `Match Link: ${window.location.origin}/match/${match.slug}\n\n` +
        `Venue: ${match.venue?.name || 'Unknown'}, ${match.venue?.city || ''}\n\n` +
        `Additional Info: ${match.notes || 'No additional information provided'}\n\n` +
        `${match.is_private ? `Access Password: ${match.access_password}\n\n` : ''}` +
        `Powered by PlayArena`
      )}` +
      `&sf=true&output=xml`;

    window.open(googleCalendarUrl, '_blank', 'width=600,height=600');
    setTimeout(() => navigate(`/match/${slug}`), 1000);
  };

  // Ensure the Match Details section is visible after rendering
  useEffect(() => {
    const matchDetailsSection = document.getElementById('match-details-section');
    if (matchDetailsSection) {
      matchDetailsSection.style.display = 'block';
    }
  }, [match, loading]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-playarena-500"></div>
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
  const totalPlayerSlots = match?.players ? match.players.reduce((sum, player) => sum + (player.number_of_slots || 1), 0) : 0;

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

      <div id="match-details-section" className="p-4" style={{ display: 'none' }}>
        {match ? (
          <>
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
                <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-700 border-green-300">
                  Verified
                </span>
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Wallet Balance: ₦{walletBalance.toFixed(2)}
              </p>
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
              <div className="border rounded-lg p-4 bg-card shadow-md">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="font-semibold">Match Details</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addToCalendar}
                    className="text-playarena-600 border-playarena-600 hover:bg-playarena-100"
                  >
                    <CalendarPlus size={16} className="mr-1" />
                    Add to Calendar
                  </Button>
                </div>
                
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
                      {totalPlayerSlots}/{match.total_slots} slots filled
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
              
              <div className="border rounded-lg p-4 bg-card shadow-md">
                <h2 className="font-semibold mb-3">Players ({totalPlayerSlots}/{match.total_slots})</h2>
                
                {match.players && match.players.length > 0 ? (
                  <div className="space-y-2">
                    {match.players.map((player, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-md justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-full bg-playarena-100 flex items-center justify-center">
                            {player.player_name.charAt(0).toUpperCase()}
                          </span>
                          <span>
                            {player.number_of_slots > 1 ? `${player.player_name} (${player.number_of_slots})` : player.player_name}
                          </span>
                        </div>
                        <Badge
                          className={getStatusStyles(player.player_status)}
                        >
                          {formatStatus(player.player_status)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No players have joined yet</p>
                )}
                
                <div className="mt-6">
                  {isEnded ? (
                    <Button 
                      className="w-full bg-playarena-500 hover:bg-playarena-600 text-white"
                      onClick={() => navigate(`/feedback?matchSlug=${match.slug}`)}
                    >
                      Give Feedback
                    </Button>
                  ) : isFull ? (
                    <Button 
                      className="w-full bg-playarena-500 hover:bg-playarena-600 text-white"
                      variant="outline"
                      disabled
                    >
                      Match Is Full
                    </Button>
                  ) : (
                    <Button 
                      className="w-full bg-playarena-500 hover:bg-playarena-600 text-white"
                      onClick={() => navigate(`/join/${match.slug}`)}
                    >
                      Join This Match
                    </Button>
                  )}
                </div>
                {match.sell_tickets && !isEnded && (
                  <div className="mt-4">
                    <Button
                      className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
                      onClick={() => navigate(`/ticketing/${match.slug}`)}
                    >
                      Buy Tickets
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 mt-6">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="flex-1"
                    >
                      <Share2 size={18} className="mr-2" />
                      Share
                      <ChevronDown size={16} className="ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[200px]">
                    <DropdownMenuItem onClick={shareToWhatsApp}>
                      Share to WhatsApp
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={shareToTwitter}>
                      Share to Twitter
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={shareToFacebook}>
                      Share to Facebook
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={shareMatch}>
                      Share via Device
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Button 
                  variant="outline"
                  className="flex-1"
                  onClick={() => setDownloadDialogOpen(true)}
                >
                  <Download size={18} className="mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <h2 className="text-xl font-semibold mb-2">Match Not Found</h2>
            <p className="text-muted-foreground">The match you're looking for doesn't exist or has been removed.</p>
          </div>
        )}
      </div>
      <Navbar />

      <Dialog open={downloadDialogOpen} onOpenChange={(open) => {
        setDownloadDialogOpen(open);
        setIsImageLoaded(false);
        if (!open) setBackgroundOption("field");
      }}>
        <DialogContent className="sm:max-w-[425px] max-w-[90vw] rounded-2xl">
          <DialogTitle>Match Details</DialogTitle>
          <DialogDescription>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Download this card to share your match details with friends. Choose any background below.
            </p>
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Background:</label>
              <div className="flex items-center space-x-4 mt-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="field"
                    checked={backgroundOption === "field"}
                    onChange={() => setBackgroundOption("field")}
                    className="form-radio text-playarena-500"
                  />
                  <span>Default</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="white"
                    checked={backgroundOption === "white"}
                    onChange={() => setBackgroundOption("white")}
                    className="form-radio text-playarena-500"
                  />
                  <span>White</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="green"
                    checked={backgroundOption === "green"}
                    onChange={() => setBackgroundOption("green")}
                    className="form-radio text-playarena-500"
                  />
                  <span>Green</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="black"
                    checked={backgroundOption === "black"}
                    onChange={() => setBackgroundOption("black")}
                    className="form-radio text-playarena-500"
                  />
                  <span>Black</span>
                </label>
              </div>
            </div>
            <div 
              ref={cardRef}
              className={`rounded-lg p-6 shadow-lg relative overflow-hidden ${backgroundOption === "field" ? "bg-cover bg-center" : ""}`}
              style={{
                backgroundImage: backgroundOption === "field" ? "url('/football-field.jpg')" : "",
                backgroundColor: backgroundOption !== "field" ? backgroundOption : "transparent",
                ...(backgroundOption === "field" && {
                  backgroundBlendMode: "overlay",
                  backgroundColor: "rgba(0, 0, 0, 0.5)",
                }),
              }}
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <img 
                    src={backgroundOption === "white" ? "/playarenalight.png" : "/playarenadark.png"}
                    alt="PlayArena Logo" 
                    className="h-8 w-auto"
                    onLoad={handleImageLoad}
                    onError={() => {
                      toast({
                        title: "Error",
                        description: "Failed to load logo image.",
                        variant: "destructive",
                      });
                      setIsImageLoaded(true);
                    }}
                  />
                  <Trophy className={`h-6 w-6 ${backgroundOption === "white" ? "text-black" : "text-white"}`} />
                </div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className={`text-xl font-bold ${backgroundOption === "white" ? "text-black" : "text-white"}`}>{match?.title || "Match Title"}</h2>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center">
                    <MapPin className={`h-4 w-4 mr-2 ${backgroundOption === "white" ? "text-black" : "text-white"}`} />
                    <span className={backgroundOption === "white" ? "text-black" : "text-white"}>{match?.venue?.name || "Venue"}, {match?.venue?.city || ""}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className={`h-4 w-4 mr-2 ${backgroundOption === "white" ? "text-black" : "text-white"}`} />
                    <span className={backgroundOption === "white" ? "text-black" : "text-white"}>{match ? formatDate(match.match_date) : "TBD"} at {match ? formatTime(match.match_time) : "TBD"}</span>
                  </div>
                  <div className="flex items-center">
                    <DollarSign className={`h-4 w-4 mr-2 ${backgroundOption === "white" ? "text-black" : "text-white"}`} />
                    <span className={backgroundOption === "white" ? "text-black" : "text-white"}>{match?.is_paid ? `Paid (₦${match.price?.toFixed(2)})` : "Free"}</span>
                  </div>
                  <div className="flex items-center">
                    <Users className={`h-4 w-4 mr-2 ${backgroundOption === "white" ? "text-black" : "text-white"}`} />
                    <span className={backgroundOption === "white" ? "text-black" : "text-white"}>{totalPlayerSlots}/{match?.total_slots || 0} slots booked</span>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 my-4">
              <strong>Note:</strong> Save or share this card to invite players to your match.
            </p>
            <div className="flex gap-2">
              <Button 
                className="w-full bg-playarena-500 hover:bg-playarena-600 text-white"
                onClick={handleDownload}
                disabled={!isImageLoaded}
              >
                Download
              </Button>
              <Button 
                className="w-full bg-playarena-500 hover:bg-playarena-600 text-white"
                onClick={() => setDownloadDialogOpen(false)}
              >
                Close
              </Button>
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MatchDetail;
