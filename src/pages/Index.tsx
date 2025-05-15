import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Store, Plus, Calendar, Users, Clock } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import Navbar from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import ThemeToggle, { useTheme } from "@/components/ThemeToggle";


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
    image_urls: string[] | null;
  } | null;
};

type Venue = {
  id: string;
  slug: string;
  name: string;
  city: string;
  state: string;
  image_urls: string[] | null;
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
  const [activeFaqTab, setActiveFaqTab] = useState('general');

  useEffect(() => {
const fetchData = async () => {
  try {
    const now = new Date().toLocaleString("en-US", { timeZone: "Africa/Lagos" });
    const currentDateTime = new Date(now);
    const currentDate = currentDateTime.toISOString().split("T")[0];
    const currentTime = currentDateTime.toTimeString().slice(0, 5);

    const { data: upcomingMatchesData, error: matchesError } = await supabase
      .from("matches")
      .select(`
        id,
        slug,
        title,
        match_date,
        match_time,
        is_paid,
        price,
        venue:venues(slug, name, city, image_urls)
      `)
      .gte("match_date", currentDate)
      .order("match_date", { ascending: true })
      .order("match_time", { ascending: true })
      .limit(5);

    if (matchesError) throw matchesError;

    let filteredMatches = upcomingMatchesData.filter((match: Match) => {
      const matchDateTime = new Date(`${match.match_date}T${match.match_time}:00`);
      const isToday = match.match_date === currentDate;
      const isTimePassed = isToday && match.match_time < currentTime;
      return !isTimePassed || match.match_date > currentDate;
    });

    if (filteredMatches.length < 5) {
      const { data: recentMatchesData, error: recentMatchesError } = await supabase
        .from("matches")
        .select(`
          id,
          slug,
          title,
          match_date,
          match_time,
          is_paid,
          price,
          venue:venues(slug, name, city, image_urls)
        `)
        .order("match_date", { ascending: false })
        .order("match_time", { ascending: false })
        .limit(5 - filteredMatches.length);

      if (recentMatchesError) throw recentMatchesError;

      filteredMatches = [...filteredMatches, ...recentMatchesData].slice(0, 5);
    }

    const { data: venuesData, error: venuesError } = await supabase
      .from("venues")
      .select(`
        id,
        slug,
        name,
        city,
        state,
        image_urls,
        matches:matches!venue_id(count)
      `)
      .order("created_at", { ascending: false })
      .limit(5);

    if (venuesError) throw venuesError;

    const venuesWithMatchCount = venuesData.map((venue: any) => ({
      ...venue,
      match_count: venue.matches[0]?.count || 0,
    }));

    setUpcomingMatches(filteredMatches as Match[]);
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
<header className="sticky top-0 z-50 p-4 flex items-center justify-center bg-green-50 dark:bg-green-900 shadow-md mb-4">
  <img
    src={theme === "dark" ? "/playarenadark.png" : "/playarenalight.png"}
    alt="PlayArena Logo"
    className="h-10 w-auto object-contain"
  />
</header>

<div className="fixed top-4 right-4 z-50">
  <ThemeToggle />
</div>

      <div className="px-4 mb-6 mt-4">
        <SearchBar />
      </div>

      <div className="grid grid-cols-3 gap-2 px-4 mb-8">
        <Button
          className="flex flex-col items-center justify-center h-20 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-transform hover:scale-105 flex-1 text-sm py-2"
          onClick={() => navigate("/organize")}
        >
          <Plus size={20} className="mb-1" />
          <span className="font-medium">Organize</span>
        </Button>
        <Button
          className="flex flex-col items-center justify-center h-20 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-transform hover:scale-105 flex-1 text-sm py-2"
          onClick={() => navigate("/confirm-checkin")}
        >
          <Users size={20} className="mb-1" />
          <span className="font-medium">Manage</span>
        </Button>
        <Button
          className="flex flex-col items-center justify-center h-20 bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-transform hover:scale-105 flex-1 text-sm py-2"
          onClick={() => navigate("/venue-create")}
        >
          <Store size={20} className="mb-1" />
          <span className="font-medium">Add Venue</span>
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      ) : (
        <>
          <section className="mb-8">
            <div className="flex justify-between items-center px-4 mb-3">
              <h2 className="text-2xl font-bold">Upcoming Matches</h2>
              <Button
                variant="outline"
                className="text-green-600 hover:bg-green-600 hover:text-white transition-colors"
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
                    className="min-w-[280px] bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 border border-gray-200 dark:border-gray-700"
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
                  className="mt-2 text-green-600"
                  onClick={() => navigate("/organize")}
                >
                  Create the first match!
                </Button>
              </div>
            )}
          </section>

          <section>
            <div className="flex justify-between items-center px-4 mb-3">
              <h2 className="text-2xl font-bold">Venues</h2>
              <Button
                variant="outline"
                className="text-green-600 hover:bg-green-600 hover:text-white transition-colors"
                onClick={() => navigate("/venues")}
              >
                See All
              </Button>
            </div>

            {popularVenues.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto px-4 pb-4">
                {popularVenues.map((venue) => {
                  const defaultImage = "https://dailytrust.com/wp-content/uploads/2023/12/football-488714_1280.jpg";
                  const venueImage = venue.image_urls && venue.image_urls.length > 0 ? venue.image_urls[0] : defaultImage;

                  return (
                    <div
                      key={venue.id}
                      className="min-w-[280px] bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 cursor-pointer"
                      onClick={() => navigate(`/venue/${venue.slug}`)}
                    >
                      <img
                        src={venueImage}
                        alt={venue.name}
                        className="w-full h-40 object-cover rounded-t-lg"
                      />
                      <div className="p-4">
                        <h3 className="font-bold text-lg mb-2">{venue.name}</h3>
                        <p className="text-sm text-muted-foreground mb-1">{`${venue.city}, ${venue.state}`}</p>
                        <p className="text-sm font-medium">{`${venue.match_count} Match${venue.match_count !== 1 ? "es" : ""}`}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-muted-foreground">No venues added yet.</p>
                <Button
                  variant="link"
                  className="mt-2 text-green-600"
                  onClick={() => navigate("/venue-create")}
                >
                  Add the first venue!
                </Button>
              </div>
            )}
          </section>

          <section className="px-4 py-6 bg-gradient-to-b from-green-50 to-white dark:from-green-900 dark:to-gray-800 rounded-lg mt-8">
            <h2 className="text-2xl font-bold mb-4 text-center">Frequently Asked Questions</h2>
            <div className="flex space-x-4 mb-4 justify-center">
              <button 
                className={`px-4 py-2 rounded-md ${activeFaqTab === 'general' ? 'bg-green-500 text-white' : 'bg-white dark:bg-gray-700'}`}
                onClick={() => setActiveFaqTab('general')}
              >
                General
              </button>
              <button 
                className={`px-4 py-2 rounded-md ${activeFaqTab === 'venues' ? 'bg-green-500 text-white' : 'bg-white dark:bg-gray-700'}`}
                onClick={() => setActiveFaqTab('venues')}
              >
                Venues
              </button>
              <button 
                className={`px-4 py-2 rounded-md ${activeFaqTab === 'matches' ? 'bg-green-500 text-white' : 'bg-white dark:bg-gray-700'}`}
                onClick={() => setActiveFaqTab('matches')}
              >
                Matches
              </button>
            </div>
            <div className={`space-y-4 ${activeFaqTab === 'general' ? 'block' : 'hidden'}`}>
              <details className="bg-white dark:bg-gray-700 rounded-md p-4">
                <summary className="font-semibold cursor-pointer">What is PlayArena?</summary>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">PlayArena is a platform for organizing and joining football matches and venues across Nigeria.</p>
              </details>
              <details className="bg-white dark:bg-gray-700 rounded-md p-4">
                <summary className="font-semibold cursor-pointer">How do I get started?</summary>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">No account needed! You can browse matches immediately. To organize a match or add a venue, simply use the 'Organize' or 'Add Venue' buttons.</p>
              </details>
              <details className="bg-white dark:bg-gray-700 rounded-md p-4">
                <summary className="font-semibold cursor-pointer">Is there a cost to use PlayArena?</summary>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Basic features are free, but some matches may have a fee set by organizers.</p>
              </details>
              <details className="bg-white dark:bg-gray-700 rounded-md p-4">
                <summary className="font-semibold cursor-pointer">How can I contact support?</summary>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">You can reach us directly on social media @PIousGeek</p>
              </details>
              <details className="bg-white dark:bg-gray-700 rounded-md p-4">
                <summary className="font-semibold cursor-pointer">What devices support PlayArena?</summary>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">PlayArena works on web browsers on desktops, tablets, and mobile devices.</p>
              </details>
            </div>
            <div className={`space-y-4 ${activeFaqTab === 'venues' ? 'block' : 'hidden'}`}>
              <details className="bg-white dark:bg-gray-700 rounded-md p-4">
                <summary className="font-semibold cursor-pointer">How do I add a venue?</summary>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Click 'Add Venue', fill in the details, and upload images to list your venue.</p>
              </details>
              <details className="bg-white dark:bg-gray-700 rounded-md p-4">
                <summary className="font-semibold cursor-pointer">Can I edit my venue details?</summary>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Yes, go to your venue page and use the edit option to update details.</p>
              </details>
              <details className="bg-white dark:bg-gray-700 rounded-md p-4">
                <summary className="font-semibold cursor-pointer">What images should I upload?</summary>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Upload clear photos of the venue, up to 3 images under 2MB each.</p>
              </details>
              <details className="bg-white dark:bg-gray-700 rounded-md p-4">
                <summary className="font-semibold cursor-pointer">How are venues ranked?</summary>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Venues are ranked by the number of matches hosted, shown as 'Match Count'.</p>
              </details>
              <details className="bg-white dark:bg-gray-700 rounded-md p-4">
                <summary className="font-semibold cursor-pointer">Can I remove my venue?</summary>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Contact support to request venue removal if needed.</p>
              </details>
            </div>
            <div className={`space-y-4 ${activeFaqTab === 'matches' ? 'block' : 'hidden'}`}>
              <details className="bg-white dark:bg-gray-700 rounded-md p-4">
                <summary className="font-semibold cursor-pointer">How do I join a match?</summary>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Use the 'Join Match' button on the match card to participate.</p>
              </details>
              <details className="bg-white dark:bg-gray-700 rounded-md p-4">
                <summary className="font-semibold cursor-pointer">Can I organize a paid match?</summary>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Yes, set the price when organizing via the 'Organize' page.</p>
              </details>
              <details className="bg-white dark:bg-gray-700 rounded-md p-4">
                <summary className="font-semibold cursor-pointer">What if a match is canceled?</summary>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Organizers will notify participants; refunds are handled case-by-case.</p>
              </details>
              <details className="bg-white dark:bg-gray-700 rounded-md p-4">
                <summary className="font-semibold cursor-pointer">How are match times set?</summary>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Organizers set the date and time in their local timezone.</p>
              </details>
              <details className="bg-white dark:bg-gray-700 rounded-md p-4">
                <summary className="font-semibold cursor-pointer">Can I see past matches?</summary>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Yes, use the 'See All' button on the Matches section and filter to view history.</p>
              </details>
            </div>
          </section>
        </>
      )}

      <Navbar />
    </div>
  );
};

export default Index;
