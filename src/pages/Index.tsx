import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Store, Plus, Calendar, Search, Clock } from "lucide-react";
import ActionButton from "@/components/ActionButton";
import MatchCard from "@/components/MatchCard";
import SearchBar from "@/components/SearchBar";
import Navbar from "@/components/Navbar";
import VenueItem from "@/components/VenueItem";
import ThemeToggle from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";

type Match = {
  id: string;
  slug: string;
  title: string;
  match_date: string;
  match_time: string;
  is_paid: boolean;
  price: number | null;
  venue: {
    slug: string;
    name: string;
    city: string;
    image_url: string | null;
  } | null;
};

type Venue = {
  id: string;
  slug: string;
  name: string;
  city: string;
  state: string;
  image_url: string | null;
};

const formatDate = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
};

const formatTime = (timeString: string) => {
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${period}`;
};

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [popularVenues, setPopularVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get upcoming matches
        const today = new Date().toISOString().split('T')[0];
        
        const { data: matchesData, error: matchesError } = await supabase
          .from("matches")
          .select(`
            id,
            slug,
            title,
            match_date,
            match_time,
            is_paid,
            price,
            venue:venues(slug, name, city, image_url)
          `)
          .gte('match_date', today)
          .order('match_date', { ascending: true })
          .limit(5);
        
        if (matchesError) throw matchesError;
        
        // Get popular venues
        const { data: venuesData, error: venuesError } = await supabase
          .from("venues")
          .select(`
            id,
            slug,
            name,
            city,
            state,
            image_url
          `)
          .order('created_at', { ascending: false })
          .limit(5);
          
        if (venuesError) throw venuesError;
        
        setUpcomingMatches(matchesData as Match[]);
        setPopularVenues(venuesData as Venue[]);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [toast]);

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="p-4 flex justify-between items-center">
        <h1 className="text-3xl font-bold">PlayArena</h1>
        <ThemeToggle />
      </header>

      {/* Search Bar */}
      <div className="px-4 mb-6">
        <SearchBar />
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-4 gap-2 px-4 mb-8">
        <ActionButton 
          icon={Plus} 
          label="Organize" 
          href="/organize" 
        />
        <ActionButton 
          icon={Calendar} 
          label="Join Match" 
          href="/search" 
        />
        <ActionButton 
          icon={Store} 
          label="Add Venue" 
          href="/venue-create" 
        />
        <ActionButton 
          icon={Search} 
          label="Search" 
          href="/search" 
        />
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      ) : (
        <>
          {/* Upcoming Matches */}
          <section className="mb-8">
            <div className="flex justify-between items-center px-4 mb-3">
              <h2 className="text-2xl font-bold">Upcoming Matches</h2>
              <button 
                className="text-primary text-sm"
                onClick={() => navigate('/search')}
              >
                See all
              </button>
            </div>
            
            {upcomingMatches.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto px-4 pb-4">
                {upcomingMatches.map((match) => (
                  <div 
                    key={match.id} 
                    className="min-w-[280px] bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700"
                  >
                    <h3 className="font-bold text-lg mb-2">{match.title}</h3>
                    
                    <div className="space-y-3 mb-4">
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
                          <Store size={18} />
                          <span>{match.venue.name}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {match.is_paid ? `₦${match.price?.toFixed(2)}` : 'Free'}
                        </span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => navigate(`/match/${match.slug}`)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
                    >
                      Join Match
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-muted-foreground">No upcoming matches yet.</p>
                <button 
                  className="mt-2 text-primary"
                  onClick={() => navigate('/organize')}
                >
                  Create the first match!
                </button>
              </div>
            )}
          </section>

          {/* Popular Venues */}
          <section>
            <div className="flex justify-between items-center px-4 mb-3">
              <h2 className="text-2xl font-bold">Venues</h2>
              <button 
                className="text-primary text-sm"
                onClick={() => navigate('/venue-create')}
              >
                Add venue
              </button>
            </div>
            
            {popularVenues.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto px-4 pb-4">
                {popularVenues.map((venue) => (
                  <div key={venue.id} className="min-w-[280px]">
                    <VenueItem
                      name={venue.name}
                      location={`${venue.city}, ${venue.state}`}
                      image={null}
                      onClick={() => navigate(`/venue/${venue.slug}`)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-muted-foreground">No venues added yet.</p>
                <button 
                  className="mt-2 text-primary"
                  onClick={() => navigate('/venue-create')}
                >
                  Add the first venue!
                </button>
              </div>
            )}
          </section>
        </>
      )}

      {/* Bottom Navigation */}
      <Navbar />
    </div>
  );
};

export default Index;
