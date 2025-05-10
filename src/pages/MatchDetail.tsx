import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  ArrowLeft, 
  Share2, 
  Copy, 
  ChevronDown,
  ExternalLink
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [copying, setCopying] = useState(false);

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
          players(*)
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

  const isMatchTimePassed = () => {
    if (!match) return false;
    const now = new Date();
    const matchDateTime = new Date(`${match.match_date}T${match.match_time}`);
    return now >= matchDateTime;
  };

  const copyMatchLink = async () => {
    if (!match) return;
    
    setCopying(true);
    const url = `${window.location.origin}/match/${match.slug}`;
    const shareText = `Join my Football Match: ${match.title} at ${match.venue?.name || 'unknown venue'} on ${formatDate(match.match_date)} by ${formatTime(match.match_time)}. Powered by PlayArena. ${url}`;
    
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
    } finally {
      setCopying(false);
    }
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
      copyMatchLink();
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
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

  const isFull = match.players?.length >= match.total_slots;
  const matchHasStarted = isMatchTimePassed();

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
        
        {isFull && (
          <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            This match is completely filled up!
          </div>
        )}
        
        {matchHasStarted && (
          <div className="bg-yellow-100 border border-yellow-200 text-yellow-700 px-4 py-3 rounded mb-4">
            This match has already started!
          </div>
        )}
        
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
                    <span className="text-primary hover:underline">
                      {match.venue.name}, {match.venue.city}
                    </span>
                    {match.venue.map_link && (
                      <div className="mt-1">
                        <a 
                          href={match.venue.map_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs flex items-center text-primary hover:underline"
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
                    <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      {player.player_name.charAt(0).toUpperCase()}
                    </span>
                    <span>{player.player_name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No players have joined yet</p>
            )}
            
            {!isFull && !matchHasStarted && (
              <Button 
                className="w-full mt-4"
                onClick={() => navigate(`/join/${match.slug}`)}
              >
                Join This Match
              </Button>
            )}
            
            {!isFull && matchHasStarted && (
              <Button 
                className="w-full mt-4"
                variant="outline"
                disabled
              >
                Match Has Started
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
              onClick={copyMatchLink}
              disabled={copying}
            >
              <Copy size={18} className="mr-2" />
              {copying ? "Copying..." : "Copy Link"}
            </Button>
          </div>
        </div>
      </div>
      <Navbar />
    </div>
  );
};

export default MatchDetail;
