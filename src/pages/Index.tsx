import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Store, Plus, Calendar, Users, Clock } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import Navbar from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import ThemeToggle from "@/components/ThemeToggle";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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
  type: "football";
};

type CyclingEvent = {
  id: string;
  slug: string;
  title: string;
  event_date: string;
  start_time: string;
  is_free: boolean;
  start_landmark: {
    name: string;
    state: string;
  } | null;
  type: "cycling";
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
  const [upcomingMatches, setUpcomingMatches] = useState<(Match | CyclingEvent)[]>([]);
  const [popularVenues, setPopularVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFaqTab, setActiveFaqTab] = useState('general');
  const [isOrganizeDialogOpen, setIsOrganizeDialogOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const now = new Date().toLocaleString("en-US", { timeZone: "Africa/Lagos" });
        const currentDateTime = new Date(now);
        const currentDate = currentDateTime.toISOString().split("T")[0];
        const currentTime = currentDateTime.toTimeString().slice(0, 5);

        // Fetch football matches
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

        let filteredMatches: Match[] = upcomingMatchesData
          .filter((match: Match) => {
            const matchDateTime = new Date(`${match.match_date}T${match.match_time}:00`);
            const isToday = match.match_date === currentDate;
            const isTimePassed = isToday && match.match_time < currentTime;
            return !isTimePassed || match.match_date > currentDate;
          })
          .map((match) => ({ ...match, type: "football" as const }));

        // Fetch cycling events
        const { data: cyclingEventsData, error: cyclingError } = await supabase
          .from("cycling_events")
          .select(`
            id,
            slug,
            title,
            event_date,
            start_time,
            is_free,
            start_landmark:landmarks!start_landmark_id(name, state)
          `)
          .gte("event_date", currentDate)
          .order("event_date", { ascending: true })
          .order("start_time", { ascending: true })
          .limit(5);

        if (cyclingError) throw cyclingError;

        let filteredCyclingEvents: CyclingEvent[] = cyclingEventsData
          .filter((event: CyclingEvent) => {
            const eventDateTime = new Date(`${event.event_date}T${event.start_time}:00`);
            const isToday = event.event_date === currentDate;
            const isTimePassed = isToday && event.start_time < currentTime;
            return !isTimePassed || event.event_date > currentDate;
          })
          .map((event) => ({ ...event, type: "cycling" as const }));

        // Combine and sort matches and cycling events, limit to 5
        const combinedEvents = [...filteredMatches, ...filteredCyclingEvents]
          .sort((a, b) => {
            const dateA = new Date(`${a.match_date || a.event_date}T${a.match_time || a.start_time}:00`);
            const dateB = new Date(`${b.match_date || b.event_date}T${b.match_time || b.start_time}:00`);
            return dateA.getTime() - dateB.getTime();
          })
          .slice(0, 5);

        // If fewer than 5 events, fetch recent matches/events
        if (combinedEvents.length < 5) {
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
            .limit(5 - combinedEvents.length);

          if (recentMatchesError) throw recentMatchesError;

          const { data: recentCyclingData, error: recentCyclingError } = await supabase
            .from("cycling_events")
            .select(`
              id,
              slug,
              title,
              event_date,
              start_time,
              is_free,
              start_landmark:landmarks!start_landmark_id(name, state)
            `)
            .order("event_date", { ascending: false })
            .order("start_time", { ascending: false })
            .limit(5 - combinedEvents.length);

          if (recentCyclingError) throw recentCyclingError;

          const recentMatches = recentMatchesData.map((match) => ({ ...match, type: "football" as const }));
          const recentCyclingEvents = recentCyclingData.map((event) => ({ ...event, type: "cycling" as const }));

          combinedEvents.push(
            ...[...recentMatches, ...recentCyclingEvents]
              .sort((a, b) => {
                const dateA = new Date(`${a.match_date || a.event_date}T${a.match_time || a.start_time}:00`);
                const dateB = new Date(`${b.match_date || b.event_date}T${b.match_time || b.start_time}:00`);
                return dateB.getTime() - dateA.getTime();
              })
              .slice(0, 5 - combinedEvents.length)
          );
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

        setUpcomingMatches(combinedEvents);
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

  const handleOrganizeClick = () => {
    setIsOrganizeDialogOpen(true);
  };

  const handleOrganizeSelect = (type: "football" | "cycling") => {
    setIsOrganizeDialogOpen(false);
    navigate(type === "football" ? "/organize" : "/host-cycling");
  };

  return (
    <div className="min-h-screen pb-24 relative">
      <div className="sticky top-0 z-50 p-4 flex items-center justify-between bg-green-50 dark:bg-green-900 shadow-md mb-4">
        <div className="flex items-center w-full max-w-[calc(100%-60px)]">
          <img
            src="/navlogo.png"
            alt="PlayArena Logo"
            className="h-10 w-10 object-contain mr-4"
          />
          <div className="flex-1 max-w-[500px]">
            <SearchBar />
          </div>
        </div>
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggle />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 px-4 mb-8">
        <Button
          className="flex flex-col items-center justify-center h-20 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-transform hover:scale-105 flex-1 text-sm py-2"
          onClick={handleOrganizeClick}
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

      <div className="px-4 mb-8" style={{ overflow: 'hidden', borderRadius: '16px' }}>
        <img
          src="/downolad now.jpg"
          alt="Download Now"
          className="w-full h-auto object-cover"
          style={{ borderRadius: '16px' }}
        />
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      ) : (
        <>
          <section className="mb-8">
            <div className="flex justify-between items-center px-4 mb-3">
              <h2 className="text-2xl font-bold">Activities</h2>
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
                {upcomingMatches.map((event) => (
                  <div
                    key={event.id}
                    className="min-w-[280px] bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 border border-gray-200 dark:border-gray-700"
                  >
                    <h3 className="font-bold text-lg mb-2">{event.title}</h3>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar size={18} />
                        <span>{formatDate(event.match_date || event.event_date)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock size={18} />
                        <span>{formatTime(event.match_time || event.start_time)}</span>
                      </div>

                      {event.type === "football" && event.venue && (
                        <div
                          className="flex items-start gap-2 cursor-pointer"
                          onClick={() => navigate(`/venue/${event.venue?.slug}`)}
                        >
                          <Store size={18} />
                          <span>{event.venue.name}</span>
                        </div>
                      )}

                      {event.type === "cycling" && event.start_landmark && (
                        <div className="flex items-start gap-2">
                          <Store size={18} />
                          <span>{event.start_landmark.name}, {event.start_landmark.state}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {event.type === "football"
                            ? event.is_paid
                              ? `₦${event.price?.toFixed(2)}`
                              : "Free"
                            : event.is_free
                            ? "Free"
                            : "Paid"}
                        </span>
                      </div>
                    </div>

                    <Button
                      onClick={() =>
                        navigate(event.type === "football" ? `/match/${event.slug}` : `/cycling/${event.slug}`)
                      }
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
                    >
                      {event.type === "football" ? "Join Match" : "Join Event"}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-muted-foreground">No upcoming activities yet.</p>
                <Button
                  variant="link"
                  className="mt-2 text-green-600"
                  onClick={handleOrganizeClick}
                >
                  Create the first activity!
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
                  const venueImage = venue.image_urls?.[0] || defaultImage;

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
                        <div className="flex items-center gap-1 mb-2">
                          <h3 className="font-bold text-lg">{venue.name}</h3>
                          {venue.is_verified && (
                            <img
                              src="/green-verified.png"
                              alt="Verified"
                              className="ml-1 w-4 h-4 object-contain"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src =
                                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%234CAF50'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'/%3E%3C/svg%3E";
                              }}
                            />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {`${venue.city}, ${venue.state}`}
                        </p>
                        <p className="text-sm font-medium">
                          {`${venue.match_count} Match${venue.match_count !== 1 ? "es" : ""}`}
                        </p>
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
                className={`px-4 py-2 rounded-md ${
                  activeFaqTab === "general" ? "bg-green-500 text-white" : "bg-white dark:bg-gray-700"
                }`}
                onClick={() => setActiveFaqTab("general")}
              >
                General
              </button>
              <button
                className={`px-4 py-2 rounded-md ${
                  activeFaqTab === "venues" ? "bg-green-500 text-white" : "bg-white dark:bg-gray-700"
                }`}
                onClick={() => setActiveFaqTab("venues")}
              >
                Venues
              </button>
              <button
                className={`px-4 py-2 rounded-md ${
                  activeFaqTab === "matches" ? "bg-green-500 text-white" : "bg-white dark:bg-gray-700"
                }`}
                onClick={() => setActiveFaqTab("matches")}
              >
                Matches
              </button>
            </div>
            <div className={`space-y-4 ${activeFaqTab === "general" ? "block" : "hidden"}`}>
              <details className="bg-white dark:bg-gray-700 rounded-md p-4">
                <summary className="font-semibold cursor-pointer">What is Sport Cliq?</summary>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Sport Cliq is a platform for organizing and joining football matches and cycling events across Nigeria.
                </p>
              </details>
              <details className="bg-white dark:bg-gray-700 rounded-md p-4">
                <summary className="font-semibold cursor-pointer">How do I get started?</summary>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  No account needed! You can browse matches and events immediately. To organize an activity or add a venue, use the 'Organize' or 'Add Venue' buttons.
                </p>
              </details>
              <details className="bg-white dark:bg-gray-700 rounded-md p-4">
                <summary className="font-semibold cursor-pointer">Is there a cost to use Sport Cliq?</summary>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Basic features are free, but some matches or events may have a fee set by organizers.
                </p>
              </details>
              <details className="bg-white dark:bg-gray-700 rounded-md p-4">
                <summary className="font-semibold cursor-pointer">How can I contact support?</summary>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  You can reach us directly on social media @PIousGeek
                </p>
              </details>
              <details className="bg-white dark:bg-gray-700 rounded-md p-4">
                <summary className="font-semibold cursor-pointer">What devices support Sport Cliq?</summary>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Sport Cliq works on web browsers on desktops, tablets, and mobile devices.
                </p>
              </details>
            </div>
            <div className={`space-y-4 ${activeFaqTab === "venues" ? "block" : "hidden"}`}>
              <details className="bg-white dark:bg-gray-700 rounded-md p-4">
                <summary className="font-semibold cursor-pointer">How do I add a venue?</summary>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Click 'Add Venue', fill in the details, and upload images to list your venue.
                </p>
              </details>
              <details className="bg-white dark:bg-gray-700 rounded-md p-4">
                <summary className="font-semibold cursor-pointer">Can I edit my venue details?</summary>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Yes, go to your venue page and use the edit option to update details.
                </p>
              </details>
              <details className="bg-white dark:bg-gray-700 rounded-md p-4">
                <summary className="font-semibold cursor-pointer">What images should I upload?</summary>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Upload clear photos of the venue, up to 3 images under 2MB each.
                </p>
              </details>
              <details className="bg-white dark:bg-gray-700 rounded-md p-4">
                <summary className="font-semibold cursor-pointer">How are venues ranked?</summary>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Venues are ranked by the number of matches hosted, shown as 'Match Count'.
                </p>
              </details>
              <details className="bg-white dark:bg-gray-700 rounded-md p-4">
                <summary className="font-semibold cursor-pointer">Can I remove my venue?</summary>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Contact support to request venue removal if needed.
                </p>
              </details>
            </div>
            <div className={`space-y-4 ${activeFaqTab === "matches" ? "block" : "hidden"}`}>
              <details className="bg-white dark:bg-gray-700 rounded-md p-4">
                <summary className="font-semibold cursor-pointer">How do I join a match?</summary>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Use the 'Join Match' button on the match card to participate.
                </p>
              </details>
              <details className="bg-white dark:bg-gray-700 rounded-md p-4">
                <summary className="font-semibold cursor-pointer">Can I organize a paid match?</summary>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Yes, set the price when organizing via the 'Organize' page.
                </p>
              </details>
              <details className="bg-white dark:bg-gray-700 rounded-md p-4">
                <summary className="font-semibold cursor-pointer">What if a match is canceled?</summary>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Organizers will notify participants; refunds are handled case-by-case.
                </p>
              </details>
              <details className="bg-white dark:bg-gray-700 rounded-md p-4">
                <summary className="font-semibold cursor-pointer">How are match times set?</summary>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Organizers set the date and time in their local timezone.
                </p>
              </details>
              <details className="bg-white dark:bg-gray-700 rounded-md p-4">
                <summary className="font-semibold cursor-pointer">Can I see past matches?</summary>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Yes, use the 'See All' button on the Matches section and filter to view history.
                </p>
              </details>
            </div>
          </section>
        </>
      )}

      <Dialog open={isOrganizeDialogOpen} onOpenChange={setIsOrganizeDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 bg-white dark:bg-gray-800 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center text-gray-900 dark:text-white">
              Create Your Adventure
            </DialogTitle>
            <DialogDescription className="text-center text-gray-600 dark:text-gray-300 mt-2">
              Ready to bring people together? Choose whether you want to organize a thrilling football match or an exciting cycling event!
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-6">
            <Button
              onClick={() => handleOrganizeSelect("football")}
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15.93l-3.95-3.95 1.41-1.41L11 14.17l5.59-5.59 1.41 1.41L11 15.93z" />
              </svg>
              Organize Football Match
            </Button>
            <Button
              onClick={() => handleOrganizeSelect("cycling")}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM5 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5zm5.8-10l2.4-2.4.8.8c1.3 1.3 3 2.1 5.1 2.1V9c-1.5 0-2.7-.6-3.6-1.5l-1.9-1.9c-.5-.4-1-.6-1.6-.6s-1.1.2-1.4.6L7.8 8.4c-.4.4-.6.9-.6 1.4 0 .6.2 1.1.6 1.4L11 14v5h2v-6.2l-2.2-2.3L12 9.1l-2.2 2.2c-.4-.4-.9-.6-1.4-.6s-1 .2-1.4.6L5 13.3V11H3v3.7l3.3-3.3c.4-.4.9-.6 1.4-.6s1 .2 1.4.6l2.2 2.2 2.2-2.2c.4-.4.6-.9.6-1.4 0-.5-.2-1-.6-1.4z" />
              </svg>
              Organize Cycling Event
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Navbar />
    </div>
  );
};

export default Index;
