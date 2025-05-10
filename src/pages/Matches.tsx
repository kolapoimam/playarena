
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Match type definition based on the existing Supabase schema
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

const Matches = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase
        .from("matches")
        .select(`
          *,
          venue:venues(*),
          players(*)
        `)
        .order("match_date", { ascending: true });

      if (error) {
        throw error;
      }

      if (data) {
        setMatches(data as Match[]);
      }
    } catch (error) {
      console.error("Error fetching matches:", error);
      toast({
        title: "Error",
        description: "Failed to load matches. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "short",
      day: "numeric",
      month: "short",
    };
    return new Date(dateString).toLocaleDateString("en-NG", options);
  };

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5); // Format from "14:30:00" to "14:30"
  };

  return (
    <div className="min-h-screen pb-20">
      <header className="p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">My Matches</h1>
        <Button asChild className="bg-green-500 hover:bg-green-600">
          <a href="/organize">Organize Match</a>
        </Button>
      </header>
      
      {loading ? (
        <div className="flex justify-center items-center h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      ) : matches.length > 0 ? (
        <div className="px-4 space-y-4">
          {matches.map((match) => (
            <div 
              key={match.id} 
              className="border rounded-lg overflow-hidden shadow-sm bg-card"
            >
              <div className="p-4">
                <h3 className="font-bold text-lg">{match.title}</h3>
                
                <div className="mt-2 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} />
                    <span>{formatDate(match.match_date)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock size={16} />
                    <span>{formatTime(match.match_time)}</span>
                  </div>
                  
                  {match.venue && (
                    <div className="flex items-center gap-2">
                      <MapPin size={16} />
                      <span>{match.venue.name}, {match.venue.city}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Users size={16} />
                    <span>
                      {match.players?.length || 0}/{match.total_slots} spots filled
                    </span>
                  </div>
                </div>
                
                <div className="mt-4 flex justify-between items-center">
                  <div>
                    <span className="text-xs text-muted-foreground">Organized by:</span>
                    <p className="font-medium">{match.organizer_name}</p>
                  </div>
                  
                  <Button 
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a href={`/match/${match.id}`}>View Details</a>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-[70vh] flex-col gap-4">
          <p className="text-muted-foreground text-center p-4">
            No matches found. Create or join a match to see it here.
          </p>
          <Button asChild>
            <a href="/organize">Organize a Match</a>
          </Button>
        </div>
      )}

      <Navbar />
    </div>
  );
};

export default Matches;
