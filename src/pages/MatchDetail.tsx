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
  DollarSign
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
} from "@/components/ui/dialog";
import { format, isToday, isPast, differenceInHours, addDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
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
  venue: {
    id: string;
    slug: string;
    name: string;
    city: string;
    map_link: string | null;
  } | null;
  players: {
    player_name: string;
  }[];
};

const MatchDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slug) return;
    
    fetchMatch(slug);
  }, [slug]);

  const fetchMatch = async (matchSlug: string) => {
    try {
      const { data, error } = await supabase
        .from("matches")
        .select(`
          *,
          venue:venues(id, slug, name, city, map_link),
          players:players(*)
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
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    };
    return new Date(dateString).toLocaleDateString("en-NG", options);
  };

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5); // Format from "14:30:00" to "14:30"
  };

  const getMatchStatus = () => {
    if (!match) return { isStarted: false, isPassed: false, isFull: false };
    
    const matchDateTime = new Date(`${match.match_date}T${match.match_time}`);
    const now = new Date();
    const nextDay = addDays(matchDateTime, 1);
    
    // Check if match is full
    const isFull = match.players?.length >= match.total_slots;
    
    // Check if match has started
    const isStarted = now >= matchDateTime;
    
    // Check if match has passed (day after)
    const isPassed = now >= nextDay;
    
    return { isStarted, isPassed, isFull };
  };

  const shareMatch = async () => {
    if (!match) return;
    
    const url = `${window.location.origin}/match/${match.slug}`;
    const shareText = `Join my Football Match: ${match.title} at ${match.venue?.name || 'unknown venue'} on ${formatDate(match.match_date)} by ${formatTime(match.match_time)}. Powered by PlayArena. ${url}`;
    
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
      // Fallback to clipboard copy
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
    const shareText = `Join my Football Match: ${match.title} at ${match.venue?.name || 'unknown venue'} on ${formatDate(match.match_date)} by ${formatTime(match.match_time)}. Powered by PlayArena. ${url}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareToTwitter = () => {
    if (!match) return;
    
    const url = `${window.location.origin}/match/${match.slug}`;
    const shareText = `Join my Football Match: ${match.title} at ${match.venue?.name || 'unknown venue'} on ${formatDate(match.match_date)} by ${formatTime(match.match_time)}. Powered by PlayArena. ${url}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(twitterUrl, '_blank');
  };

  const shareToFacebook = () => {
    if (!match) return;
    
    const url = `${window.location.origin}/match/${match.slug}`;
    const shareText = `Join my Football Match: ${match.title} at ${match.venue?.name || 'unknown venue'} on ${formatDate(match.match_date)} by ${formatTime(match.match_time)}. Powered by PlayArena.`;
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
      // Increase delay to ensure dialog is fully rendered
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        // Ensure the element is in the viewport
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

  // Removed automatic download to avoid timing issues; let user trigger manually
  // useEffect(() => {
  //   if (downloadDialogOpen && isImageLoaded) {
  //     handleDownload();
  //   }
  // }, [downloadDialogOpen, isImageLoaded, handleDownload]);

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

  const { isStarted, isPassed, isFull } = getMatchStatus();

  return (
    <div className="min-h-screen pb-20">
      <div className="p-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)} 
          className="mb-4"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
        
        <h1 className="text-2xl font-bold mb-2">{match.title}</h1>
        <p className="text-muted-foreground mb-4">Organized by {match.organizer_name}</p>
        
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
          <div className="border rounded-lg p-4 bg-card">
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
                  {match.players?.length || 0}/{match.total_slots} spots filled
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
          
          <div className="border rounded-lg p-4 bg-card">
            <h2 className="font-semibold mb-3">Players ({match.players?.length || 0}/{match.total_slots})</h2>
            
            {match.players && match.players.length > 0 ? (
              <div className="space-y-2">
                {match.players.map((player, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <span className="w-8 h-8 rounded-full bg-playarena-100 flex items-center justify-center">
                      {player.player_name.charAt(0).toUpperCase()}
                    </span>
                    <span>{player.player_name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No players have joined yet</p>
            )}
            
            {!isPassed && !isStarted && !isFull && (
              <Button 
                className="w-full mt-4 bg-playarena-500 hover:bg-playarena-600 text-white"
                onClick={() => navigate(`/join/${match.slug}`)}
              >
                Join This Match
              </Button>
            )}
            
            {(isPassed || isStarted) && (
              <Button 
                className="w-full mt-4"
                variant="outline"
                disabled
              >
                {isPassed ? "Match Has Passed" : "Match Has Started"}
              </Button>
            )}
            
            {!isPassed && !isStarted && isFull && (
              <Button 
                className="w-full mt-4"
                variant="outline"
                disabled
              >
                Match Is Full
              </Button>
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
              Download Card
            </Button>
          </div>
        </div>
      </div>
      <Navbar />

      <Dialog open={downloadDialogOpen} onOpenChange={(open) => {
        setDownloadDialogOpen(open);
        setIsImageLoaded(false); // Reset image load state when dialog closes
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogTitle>Match Details Card</DialogTitle>
          <DialogDescription>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Download this card to share your match details with friends.
            </p>
            <div 
              ref={cardRef}
              className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <img 
                  src="/playarenadark.png" 
                  alt="PlayArena Logo" 
                  className="h-8 w-auto"
                  onLoad={handleImageLoad}
                  onError={() => {
                    toast({
                      title: "Error",
                      description: "Failed to load logo image.",
                      variant: "destructive",
                    });
                    setIsImageLoaded(true); // Proceed anyway
                  }}
                />
                <Trophy className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold mb-2">{match.title}</h2>
              <div className="space-y-2 mb-4">
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>{match.venue?.name || "Venue"}, {match.venue?.city || ""}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>{formatDate(match.match_date)} at {formatTime(match.match_time)}</span>
                </div>
                <div className="flex items-center">
                  <DollarSign className="h-4 w-4 mr-2" />
                  <span>{match.is_paid ? `Paid (₦${match.price?.toFixed(2)})` : "Free"}</span>
                </div>
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  <span>{match.players?.length || 0}/{match.total_slots} slots booked</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 my-4">
              <strong>Note:</strong> Save or share this card to invite players to your match.
            </p>
            <div className="flex gap-2">
              <Button 
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                onClick={handleDownload}
                disabled={!isImageLoaded}
              >
                Download Card
              </Button>
              <Button 
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
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
