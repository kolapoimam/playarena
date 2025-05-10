
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Store, Plus, Calendar, Search } from "lucide-react";
import ActionButton from "@/components/ActionButton";
import MatchCard from "@/components/MatchCard";
import SearchBar from "@/components/SearchBar";
import Navbar from "@/components/Navbar";
import VenueItem from "@/components/VenueItem";
import ThemeToggle from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";

type Match = {
  id: string;
  title: string;
  match_date: string;
  is_paid: boolean;
  price: number | null;
  venue: {
    name: string;
    city: string;
    image_url: string | null;
  } | null;
};

type Venue = {
  id: string;
  name: string;
  city: string;
  state: string;
  image_url: string | null;
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
            title,
            match_date,
            is_paid,
            price,
            venue:venues(name, city, image_url)
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

  const getMatchDetails = (match: Match) => {
    const details = [];
    
    if (match.is_paid) {
      details.push(`Paid (₦${match.price?.toFixed(2)})`);
    } else {
      details.push("Free");
    }
    
    if (match.venue) {
      details.push(`at ${match.venue.name}`);
    }
    
    return details.join(", ");
  };

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
                  <div key={match.id} className="min-w-[280px]" onClick={() => navigate(`/match/${match.id}`)}>
                    <MatchCard 
                      title={match.title}
                      details={getMatchDetails(match)}
                      image={match.venue?.image_url || "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"}
                    />
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
              <div className="px-4 space-y-3">
                {popularVenues.map((venue) => (
                  <div key={venue.id} onClick={() => navigate(`/venue/${venue.id}`)}>
                    <VenueItem
                      name={venue.name}
                      location={`${venue.city}, ${venue.state}`}
                      image={venue.image_url || "https://images.unsplash.com/photo-1571056642329-4f49f8af6443?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80"}
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
