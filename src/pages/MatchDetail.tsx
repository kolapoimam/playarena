
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Users, ArrowLeft, Share2, Copy } from "lucide-react";

// Match type definition
type Match = {
  id: string;
  title: string;
  match_date: string;
  match_time: string;
  total_slots: number;
  is_paid: boolean;
  price: number | null;
  notes: string | null;
  organizer_name: string;
  venue: {
    name: string;
    city: string;
  } | null;
  players: {
    player_name: string;
  }[];
};

const MatchDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    fetchMatch(id);
  }, [id]);

  const fetchMatch = async (matchId: string) => {
    try {
      const { data, error } = await supabase
        .from("matches")
        .select(`
          *,
          venue:venues(*),
          players(*)
        `)
        .eq("id", matchId)
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

  const copyMatchLink = async () => {
    if (!match) return;
    
    setCopying(true);
    const url = `${window.location.origin}/match/${match.id}`;
    
    try {
      await navigator.clipboard.writeText(url);
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
    
    const url = `${window.location.origin}/match/${match.id}`;
    const title = `Join my football match: ${match.title}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: `Join my football match: ${match.title}`,
          url: url,
        });
      } catch (err) {
        console.error("Share failed:", err);
      }
    } else {
      copyMatchLink();
    }
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
                <div className="flex items-center gap-2">
                  <MapPin size={18} />
                  <span>{match.venue.name}, {match.venue.city}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Users size={18} />
                <span>
                  {match.players?.length || 0}/{match.total_slots} spots filled
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
            
            {match.players.length < match.total_slots && (
              <Button 
                className="w-full mt-4"
                onClick={() => navigate(`/join/${match.id}`)}
              >
                Join This Match
              </Button>
            )}
          </div>
          
          <div className="flex gap-3 mt-6">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={shareMatch}
            >
              <Share2 size={18} className="mr-2" />
              Share
            </Button>
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
    </div>
  );
};

export default MatchDetail;
