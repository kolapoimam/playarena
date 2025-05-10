import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Store, Plus, Calendar, Search, Clock } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import Navbar from "@/components/Navbar";
import ThemeToggle from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

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
  match_count: number;
};

const formatDate = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" };
  return new Date(dateString).toLocaleDateString("en-US", options);
};

const formatTime = (timeString: string) => {
  const [hours, minutes] = timeString.split(":");
  const hour = parseInt(hours);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${period}`;
};

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme } = useTheme();
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [popularVenues, setPopularVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get upcoming matches
        const today = new Date().toISOString().split("T")[0];

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
          .gte("match_date", today)
          .order("match_date", { ascending: true })
          .limit(5);

        if (matchesError) throw matchesError;

        // Get popular venues with match count
        const { data: venuesData, error: venuesError } = await supabase
          .from("venues")
          .select(`
            id,
            slug,
            name,
            city,
            state,
            image_url,
            matches:matches!venue_id(count)
          `)
          .order("created_at", { ascending: false })
          .limit(5);

        if (venuesError) throw venuesError;

        // Map venues to include match_count
        const venuesWithMatchCount = venuesData.map((venue: any) => ({
          ...venue,
          match_count: venue.matches[0]?.count || 0,
        }));

        setUpcomingMatches(matchesData as Match[]);
        setPopularVenues(venuesWithMatchCount as Venue[]);
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
<header className="sticky top-0 z-50 p-4 flex justify-between items-center bg-white dark:bg-gray-900 shadow-sm">
        <img
          src={theme === "dark" ? "/playarenadark.png" : "/playarenalight.png"}
          alt="PlayArena Logo"
          className="h-12 w-auto object-contain"
        />
        <ThemeToggle />
      </header>

      {/* Search Bar */}
      <div className="px-4 mb-6">
        <SearchBar />
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 px-4 mb-8">
        <Button
          className="flex flex-col items-center justify-center h-24 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-transform hover:scale-105"
          onClick={() => navigate("/organize")}
        >
          <Plus size={24} className="mb-2" />
          <span className="text-sm font-medium">Organize</span>
        </Button>
        <Button
          className="flex flex-col items-center justify-center h-24 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-transform hover:scale-105"
          onClick={() => navigate("/search")}
        >
          <Calendar size={24} className="mb-2" />
          <span className="text-sm font-medium">Join Match</span>
        </Button>
        <Button
          className="flex flex-col items-center justify-center h-24 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-transform hover:scale-105"
          onClick={() => navigate("/venue-create")}
        >
          <Store size={24} className="mb-2" />
          <span className="text-sm font-medium">Add Venue</span>
        </Button>
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
              <Button
                variant="outline"
                className="text-primary hover:bg-primary hover:text-white transition-colors"
                onClick={() => navigate("/matches")}
              >
                See All
              </Button>
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
                          {match.is_paid ? `₦${match.price?.toFixed(2)}` : "Free"}
                        </span>
                      </div>
                    </div>

                    <Button
                      onClick={() => navigate(`/match/${match.slug}`)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
                    >
                      Join Match
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-muted-foreground">No upcoming matches yet.</p>
                <Button
                  variant="link"
                  className="mt-2 text-primary"
                  onClick={() => navigate("/organize")}
                >
                  Create the first match!
                </Button>
              </div>
            )}
          </section>

          {/* Popular Venues */}
          <section>
            <div className="flex justify-between items-center px-4 mb-3">
              <h2 className="text-2xl font-bold">Venues</h2>
              <Button
                className="bg-green-500 hover:bg-green-600 text-white"
                onClick={() => navigate("/venue-create")}
              >
                <Plus size={16} className="mr-2" />
                Add Venue
              </Button>
            </div>

            {popularVenues.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto px-4 pb-4">
                {popularVenues.map((venue) => (
                  <div
                    key={venue.id}
                    className="min-w-[280px] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 cursor-pointer"
                    onClick={() => navigate(`/venue/${venue.slug}`)}
                  >
 <img
                      src="https://dailytrust.com/wp-content/uploads/2023/12/football-488714_1280.jpg"
                      alt={venue.name}
                      className="w-full h-40 object-cover rounded-t-lg"
                    />
                    <div className="p-4">
                      <h3 className="font-bold text-lg mb-2">{venue.name}</h3>
                      <p className="text-sm text-muted-foreground mb-1">{`${venue.city}, ${venue.state}`}</p>
                      <p className="text-sm font-medium">{`${venue.match_count} Match${venue.match_count !== 1 ? "es" : ""}`}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-muted-foreground">No venues added yet.</p>
                <Button
                  variant="link"
                  className="mt-2 text-primary"
                  onClick={() => navigate("/venue-create")}
                >
                  Add the first venue!
                </Button>
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
