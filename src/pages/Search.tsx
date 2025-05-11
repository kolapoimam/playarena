
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Calendar, MapPin, Users, Search as SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format, isToday, isPast, differenceInHours } from "date-fns";

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

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const query = searchParams.get("q");
    if (query) {
      setSearchTerm(query);
      searchMatches(query);
      setHasSearched(true);
    }
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setSearchParams({ q: searchTerm });
      searchMatches(searchTerm);
      setHasSearched(true);
    }
  };

  const searchMatches = async (query: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("matches")
        .select(`
          id, slug, title, match_date, match_time, is_paid, price, total_slots,
          venue:venues(slug, name, city),
          players:players(player_name)
        `)
        .or(`title.ilike.%${query}%,venues.name.ilike.%${query}%,venues.city.ilike.%${query}%`)
        .order('match_date', { ascending: true });

      if (error) throw error;
      setMatches(data as Match[]);
    } catch (error) {
      console.error("Error searching matches:", error);
      setMatches([]);
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
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${period}`;
  };

  const getMatchStatus = (matchDate: string, matchTime: string) => {
    const matchDateTime = new Date(`${matchDate}T${matchTime}:00Z`);
    const now = new Date();
    
    let statusLabel = "Upcoming";
    let statusClass = "bg-blue-100 text-blue-800";
    
    if (isPast(matchDateTime) && !isToday(matchDateTime)) {
      statusLabel = "Passed";
      statusClass = "bg-gray-200 text-gray-600";
    } else if (isToday(matchDateTime)) {
      const hoursDiff = differenceInHours(matchDateTime, now);
      if (hoursDiff >= 0 && hoursDiff <= 2) {
        statusLabel = "Live";
        statusClass = "bg-red-100 text-red-700 animate-pulse";
      } else if (hoursDiff > 2) {
        statusLabel = "Today";
        statusClass = "bg-green-100 text-green-700";
      } else {
        statusLabel = "Passed";
        statusClass = "bg-gray-200 text-gray-600";
      }
    }
    
    return { statusLabel, statusClass };
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Find Match</h1>
        
        <form onSubmit={handleSearch} className="mb-6 relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <SearchIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <Input
            type="search"
            placeholder="Search matches by title, venue or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 pr-24 py-2 w-full rounded-full"
          />
          <Button 
            type="submit" 
            size="sm"
            className="absolute right-2 top-1/2 transform -translate-y-1/2"
          >
            Search
          </Button>
        </form>
        
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        ) : hasSearched ? (
          matches.length > 0 ? (
            <div className="space-y-4">
              {matches.map((match) => {
                const { statusLabel, statusClass } = getMatchStatus(match.match_date, match.match_time);
                
                return (
                  <div 
                    key={match.id}
                    className="border rounded-lg p-4 bg-card hover:border-primary transition-colors cursor-pointer"
                    onClick={() => navigate(`/match/${match.slug}`)}
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-lg">{match.title}</h3>
                      <Badge className={`${statusClass}`}>{statusLabel}</Badge>
                    </div>
                    
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
                        
                        <span className="text-sm font-medium">
                          {match.is_paid ? `₦${match.price?.toFixed(2)}` : 'Free'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No matches found for "{searchParams.get("q")}".</p>
              <p className="mt-2">Try searching with different keywords.</p>
            </div>
          )
        ) : (
          <div className="flex items-center justify-center h-[50vh]">
            <p className="text-muted-foreground text-center p-4">
              Search for matches by title, venue name, or city
            </p>
          </div>
        )}
      </div>

      <Navbar />
    </div>
  );
};

export default SearchPage;
