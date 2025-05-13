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
import { format, isToday, isPast, differenceInHours, addHours } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import html2canvas from "html2canvas";

// Match type definition
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
  venue: {
    id: string;
    slug: string;
    name: string;
    city: string;
    map_link: string | null;
  } | null;
  players: {
    player_name: string;
    status: string;
    number_of_slots: number;
  }[];
};

// Helper function to capitalize status
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
  const cardRef = useRef<HTMLDivElement>(null);

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
          players(player_name, status, number_of_slots)
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
          players(player_name, status, number_of_slots)
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
    if (!match) return { isStarted: false, isPassed: false, isFull: false };
    
    const matchDateTime = new Date(`${match.match_date}T${match.match_time}`);
    const now = new Date("2025-05-13T19:46:00+01:00"); // 07:46 PM WAT, May 13, 2025
    const fortyEightHoursAfter = addHours(matchDateTime, 48);
    
    const totalPlayerSlots = match.players.reduce((sum, player) => sum + (player.number_of_slots || 1), 0);
    const isFull = totalPlayerSlots >= match.total_slots;
    const isStarted = now >= matchDateTime;
    const isPassed = now >= fortyEightHoursAfter;
    const isFeedbackWindow = now >= matchDateTime && now < fortyEightHoursAfter;
    
    return { isStarted, isPassed, isFull, isFeedbackWindow };
  };

  const shareMatch = async () => {
    if (!match) return;
    
    const url = `${window.location.origin}/match/${match.slug}`;
    const totalPlayerSlots = match.players.reduce((sum, player) => sum + (player.number_of_slots || 1), 0);
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
    const totalPlayerSlots = match.players.reduce((sum, player) => sum + (player.number_of_slots || 1), 0);
    const shareText = `Join my Football Match: ${match.title} at ${match.venue?.name || 'unknown venue'} on ${formatDate(match.match_date)} by ${formatTime(match.match_time)}. ${totalPlayerSlots}/${match.total_slots} slots. Powered by PlayArena. ${url}${match.is_private ? ` (Access Password: ${match.access_password})` : ''}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareToTwitter = () => {
    if (!match) return;
    
    const url = `${window.location.origin}/match/${match.slug}`;
    const totalPlayerSlots = match.players.reduce((sum, player) => sum + (player.number_of_slots || 1), 0);
    const shareText = `Join my Football Match: ${match.title} at ${match.venue?.name || 'unknown venue'} on ${formatDate(match.match_date)} by ${formatTime(match.match_time)}. ${totalPlayerSlots}/${match.total_slots} slots. Powered by PlayArena. ${url}${match.is_private ? ` (Access Password: ${match.access_password})` : ''}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(twitterUrl, '_blank');
  };

  const shareToFacebook = () => {
    if (!match) return;
    
    const url = `${window.location.origin}/match/${match.slug}`;
    const totalPlayerSlots = match.players.reduce((sum, player) => sum + (player.number_of_slots || 1), 0);
    const shareText = `Join my Football Match: ${match.title} at ${match.venue?.name || 'unknown venue'} on ${formatDate(match.match_date)} by ${formatTime(match.match_time)}. ${totalPlayerSlots}/${match.total_slots} slots. Powered by PlayArena. ${match.is_private ? ` (Access Password: ${match.access_password})` : ''}`;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}"e=${encodeURIComponent(shareText)}`;
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

    // Format dates for Google Calendar (YYYYMMDDTHHMMSSZ)
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
        `Additional Info: ${match.description || 'No additional information provided'}\n\n` +
        `${match.is_private ? `Access Password: ${match.access_password}\n\n` : ''}` +
        `Powered by PlayArena`
      )}` +
      `&sf=true&output=xml`;

    window.open(googleCalendarUrl, '_blank', 'width=600,height=600');
    setTimeout(() => navigate(`/match/${slug}`), 1000); // Redirect after a short delay
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

  const { isStarted, isPassed, isFull, isFeedbackWindow } = getMatchStatus();
  const totalPlayerSlots = match.players.reduce((sum, player) => sum + (player.number_of_slots || 1), 0);

  return (
    <div className="min-h-screen pb-20">
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
          <p className="text-muted-foreground">Organized by {match.organizer_name}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={addToCalendar}
            className="flex items-center gap-1"
          >
            <CalendarPlus size={16} />
            Add to Calendar
          </Button>
        </div>
        
        {isPassed ? (
          <div className="bg-gray-100 border border-gray-200 text-gray-700 px-4 py-3 rounded mb-4">
            This match has passed
          </div>
        ) : isStarted ? (
          <div className="bg-playarena-100 border border-playarena-200 text-playarena-700 px-4 py-3 rounded mb-4">
            This match has already started!
          </div>
        ) : isFull ? (
          <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            This match is completely filled up!
          </div>
        ) : null}
        
        <div className="space-y-4">
          <div className="border rounded-lg p-4 bg-card shadow-md">
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
                      variant={
                        player.status === "confirmed" ? "default" :
                        player.status === "pending" ? "destructive" :
                        player.status === "checked_in" ? "secondary" :
                        player.status === "absent" ? "outline" :
                        "default"
                      }
                    >
                      {formatStatus(player.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No players have joined yet</p>
            )}
            
            <div className="mt-6">
              {isFeedbackWindow ? (
                <Button 
                  className="w-full bg-playarena-500 hover:bg-playarena-600 text-white"
                  onClick={() => navigate(`/feedback?matchId=${match.id}`)}
                >
                  Give Feedback
                </Button>
              ) : (isPassed || isStarted) ? (
                <Button 
                  className="w-full bg-playarena-500 hover:bg-playarena-600 text-white"
                  variant="outline"
                  disabled
                >
                  {isPassed ? "Match Has Passed" : "Match Has Started"}
                </Button>
              ) : !isFull ? (
                <Button 
                  className="w-full bg-playarena-500 hover:bg-playarena-600 text-white"
                  onClick={() => navigate(`/join/${match.slug}`)}
                >
                  Join This Match
                </Button>
              ) : (
                <Button 
                  className="w-full bg-playarena-500 hover:bg-playarena-600 text-white"
                  variant="outline"
                  disabled
                >
                  Match Is Full
                </Button>
              )}
            </div>
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
                <h2 className={`text-xl font-bold mb-2 ${backgroundOption === "white" ? "text-black" : "text-white"}`}>{match.title}</h2>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center">
                    <MapPin className={`h-4 w-4 mr-2 ${backgroundOption === "white" ? "text-black" : "text-white"}`} />
                    <span className={backgroundOption === "white" ? "text-black" : "text-white"}>{match.venue?.name || "Venue"}, {match.venue?.city || ""}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className={`h-4 w-4 mr-2 ${backgroundOption === "white" ? "text-black" : "text-white"}`} />
                    <span className={backgroundOption === "white" ? "text-black" : "text-white"}>{formatDate(match.match_date)} at {formatTime(match.match_time)}</span>
                  </div>
                  <div className="flex items-center">
                    <DollarSign className={`h-4 w-4 mr-2 ${backgroundOption === "white" ? "text-black" : "text-white"}`} />
                    <span className={backgroundOption === "white" ? "text-black" : "text-white"}>{match.is_paid ? `Paid (₦${match.price?.toFixed(2)})` : "Free"}</span>
                  </div>
                  <div className="flex items-center">
                    <Users className={`h-4 w-4 mr-2 ${backgroundOption === "white" ? "text-black" : "text-white"}`} />
                    <span className={backgroundOption === "white" ? "text-black" : "text-white"}>{totalPlayerSlots}/{match.total_slots} slots booked</span>
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
