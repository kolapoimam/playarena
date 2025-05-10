import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Calendar, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Match = {
  id: string;
  slug: string;
  title: string;
  match_date: string;
  match_time: string;
  is_paid: boolean;
  price: number | null;
  total_slots: number;
  venue: {
    slug: string;
    name: string;
    city: string;
  } | null;
  players: {
    player_name: string;
  }[];
};

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const query = searchParams.get("q");
    if (query) {
      setSearchTerm(query);
      searchMatches(query);
    }
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setSearchParams({ q: searchTerm });
      searchMatches(searchTerm);
    }
  };

  const searchMatches = async (query: string) => {
    setLoading(true);

    try {
      // Search for matches by title or venue name/city
      const { data, error } = await supabase
        .from("matches")
        .select(`
          id, slug, title, match_date, match_time, is_paid, price, total_slots,
          venue:venues(slug, name, city),
          players(*)
        `)
        .or(`title.ilike.%${query}%`)
        .eq('venue.active', true)
        .or(`name.ilike.%${query}%,city.ilike.%${query}%`, { foreignTable: "venues" })
        .order('match_date', { ascending: true });

      if (error) throw error;
      
      setMatches(data as Match[]);
    } catch (error) {
      console.error("Error searching matches:", error);
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
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Find Match</h1>
        
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative">
            <Input
              type="search"
              placeholder="Search matches by title, venue or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-4 pr-12 py-2 w-full rounded-lg"
            />
            <Button 
              type="submit" 
              size="sm"
              className="absolute right-1 top-1"
            >
              Search
            </Button>
          </div>
        </form>
        
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        ) : matches.length > 0 ? (
          <div className="space-y-4">
            {matches.map((match) => (
              <div 
                key={match.id}
                className="border rounded-lg p-4 bg-card hover:border-primary transition-colors cursor-pointer"
                onClick={() => navigate(`/match/${match.slug}`)}
              >
                <h3 className="font-semibold text-lg">{match.title}</h3>
                
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar size={16} />
                    <span>{formatDate(match.match_date)} at {formatTime(match.match_time)}</span>
                  </div>
                  
                  {match.venue && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin size={16} />
                      <span>{match.venue.name}, {match.venue.city}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Users size={16} />
                      <span>{match.players?.length || 0}/{match.total_slots} players</span>
                    </div>
                    
                    {match.is_paid && (
                      <span className="text-sm font-medium">₦{match.price?.toFixed(2)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : searchParams.get("q") ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No matches found for "{searchParams.get("q")}".</p>
            <p className="mt-2">Try searching with different keywords.</p>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[50vh]">
            <p className="text-muted-foreground text-center p-4">
              Enter a search term above to find matches nearby
            </p>
          </div>
        )}
      </div>

      <Navbar />
    </div>
  );
};

export default Search;
