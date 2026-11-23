import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ChevronLeft, ChevronRight, Filter, Store, Star, CheckCircle, Heart, ShieldCheck, MapPin } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Seo } from "@/components/Seo";

import { BackButton, FunEmpty, Meta, Pill, SPORT, formatNaira, Cover } from "@/components/sc/ui";
import { StateScope, useUserState } from "@/components/sc/location";
import { getSavedState } from "@/lib/location";
import { VenueListSkeleton } from "@/components/sc/skeletons";
// Define the Venue type
type Venue = {
  id: string;
  slug: string;
  name: string;
  city: string;
  state: string;
  image_urls: string[] | null;
  match_count: number;
  match_dates?: string[];
  aggregated_rating: number | null;
  is_verified: boolean;
  booking_fee: number | null;
};

// List of Nigerian states
const nigerianStates = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", 
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo", 
  "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", 
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", 
  "Sokoto", "Taraba", "Yobe", "Zamfara", "FCT"
];

const META_KEYWORDS = "Football in Nigeria, Sports in Nigeria, Play Sports Near You, Football Fields Near Me, Livescore, Osimhen, Asisat Oshola, Nigeria Startup, Sportstech, Football venues in Lagos, Football venues in Ilorin, Sports Betting in Nigeria, Organize sports in Nigeria, Football Matches, Bicycle Training in Nigeria, Cycling in Nigeria, Nigerian football, Nigerian cycling, Nigerian sports, Play football in Lagos, Play football in Ilorin, Play football in Abuja, Play football in Nigeria, Play cycling in Nigeria, Play sports in Nigeria, Nigerian sports tech, Nigerian sports startup, Nigerian sports community, Football events Nigeria, Cycling events Nigeria, Sport Cliq, SportCliq, sportcliq.com.ng, sportcliq.ng, sportcliq, sport cliq, sportcliq app, sportcliq platform, sportcliq football, sportcliq cycling, sportcliq venues, sportcliq matches, sportcliq events, sportcliq sports, sportcliq nigeria, sportcliq lagos, sportcliq ilorin, sportcliq abuja, sportcliq startup, sportcliq tech, sportcliq community, sportcliq platform, sportcliq app, sportcliq website, sportcliq online, sportcliq booking, sportcliq organize, sportcliq join, sportcliq play, sportcliq find, sportcliq search, sportcliq discover, sportcliq connect, sportcliq join match, sportcliq join cycling, sportcliq join event, sportcliq join venue, sportcliq join football, sportcliq join sports, sportcliq join nigeria, sportcliq join lagos, sportcliq join ilorin, sportcliq join abuja, sportcliq join startup, sportcliq join tech, sportcliq join community, sportcliq join platform, sportcliq join app, sportcliq join website, sportcliq join online, sportcliq join booking, sportcliq join organize, sportcliq join play, sportcliq join find, sportcliq join search, sportcliq join discover, sportcliq join connect";

const VenueDirectory = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [filteredVenues, setFilteredVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const venuesPerPage = 4;

  // Filter states
  const userState = useUserState();
  const [stateFilter, setStateFilter] = useState<string>(getSavedState() || "All");
  useEffect(() => {
    setStateFilter(userState || "All");
  }, [userState]);
  const [activityFilter, setActivityFilter] = useState<string>("All");
  const [sortOrder, setSortOrder] = useState<string>("None");

  useEffect(() => {
    const fetchUserAndVenues = async () => {
      try {
        // Get the logged-in user
        const { data: session } = await supabase.auth.getSession();
        if (session?.session) {
          setUserId(session.session.user.id);
        }

        // Fetch venues
        const now = new Date().toLocaleString("en-US", { timeZone: "Africa/Lagos" });
        const currentDate = new Date(now);
        const currentDateString = currentDate.toISOString().split("T")[0];

        const { data: venuesData, error: venuesError } = await supabase
          .from("venues")
          .select(`
            id,
            slug,
            name,
            city,
            state,
            image_urls,
            aggregated_rating,
            is_verified,
            booking_fee,
            matches:matches!venue_id (match_date)
          `)
          .order("created_at", { ascending: false });

        if (venuesError) throw venuesError;

        const venuesWithDetails = venuesData.map((venue: any) => ({
          ...venue,
          match_count: venue.matches ? venue.matches.length : 0,
          match_dates: venue.matches ? venue.matches.map((m: any) => m.match_date).filter((date: string) => date) : [],
        }));

        setVenues(venuesWithDetails as Venue[]);
        setFilteredVenues(venuesWithDetails as Venue[]);

        // Fetch user's favorites if logged in
        if (session?.session) {
          const { data: favData, error: favError } = await supabase
            .from("user_venue_favourites")
            .select("venue_id")
            .eq("user_id", session.session.user.id);
          if (favError) {
            toast({ title: "Error", description: "Failed to load favorites.", variant: "destructive" });
            return;
          }
          setFavorites(new Set(favData.map((fav) => fav.venue_id)));
        }
      } catch (error) {
        console.error("Error fetching venues:", error);
        toast({
          title: "Error",
          description: "Failed to load venues. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndVenues();
  }, [toast]);

  useEffect(() => {
    let filtered = [...venues];

    if (stateFilter !== "All") {
      filtered = filtered.filter((venue) => venue.state === stateFilter);
    }

    const now = new Date();
    const currentDateString = now.toISOString().split("T")[0];
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);

    if (activityFilter !== "All") {
      filtered = filtered.filter((venue) => {
        if (!venue.match_dates || venue.match_dates.length === 0) return false;
        return venue.match_dates.some((matchDate: string) => {
          const date = new Date(matchDate);
          switch (activityFilter) {
            case "Today":
              return matchDate === currentDateString;
            case "This Week":
              return date >= weekStart && date <= weekEnd;
            case "This Month":
              return date >= monthStart && date <= monthEnd;
            case "Next Month":
              return date >= nextMonthStart && date <= nextMonthEnd;
            default:
              return true;
          }
        });
      });
    }

    if (sortOrder === "Most Popular") {
      filtered.sort((a, b) => b.match_count - a.match_count);
    } else if (sortOrder === "Least Popular") {
      filtered.sort((a, b) => a.match_count - b.match_count);
    }

    setFilteredVenues(filtered);
    setCurrentPage(1);
  }, [stateFilter, activityFilter, sortOrder, venues]);

  const indexOfLastVenue = currentPage * venuesPerPage;
  const indexOfFirstVenue = indexOfLastVenue - venuesPerPage;
  const currentVenues = filteredVenues.slice(indexOfFirstVenue, indexOfLastVenue);
  const totalPages = Math.ceil(filteredVenues.length / venuesPerPage);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const resetFilters = () => {
    setStateFilter("All");
    setActivityFilter("All");
    setSortOrder("None");
    setCurrentPage(1);
  };

  const toggleFavorite = async (venueId: string) => {
    if (!userId) {
      toast({
        title: "Login Required",
        description: "Please log in to favorite a venue.",
        variant: "destructive",
      });
      return;
    }

    const isFavorited = favorites.has(venueId);
    if (isFavorited) {
      const { error } = await supabase
        .from("user_venue_favourites")
        .delete()
        .eq("user_id", userId)
        .eq("venue_id", venueId);
      if (error) {
        toast({ title: "Error", description: "Failed to remove favorite.", variant: "destructive" });
        return;
      }
      setFavorites((prev) => {
        const newFavs = new Set(prev);
        newFavs.delete(venueId);
        return newFavs;
      });
      toast({ title: "Success", description: "Removed from favorites." });
    } else {
      const { error } = await supabase
        .from("user_venue_favourites")
        .insert([{ user_id: userId, venue_id: venueId }]);
      if (error) {
        toast({ title: "Error", description: "Failed to add favorite.", variant: "destructive" });
        return;
      }
      setFavorites((prev) => new Set(prev).add(venueId));
      toast({ title: "Success", description: "Added to favorites!" });
    }
  };

  return (
    <>
      <Seo
        title="Venues Directory | Sport Cliq"
        description="Browse all sports venues and locations on Sport Cliq. Football venues in Lagos, Ilorin, Abuja. Football in Nigeria, Play Sports Near You, Football Fields Near Me, Livescore, Osimhen, Asisat Oshola, Nigeria Startup, Sportstech."
        url={window.location.href}
        image={undefined}
        children={<meta name="keywords" content={META_KEYWORDS} />}
      />
      <div className="min-h-screen pb-32 bg-sc-bg dark:bg-gray-900">
        <header className="px-5 pt-[max(env(safe-area-inset-top),1rem)] flex flex-col gap-3.5">
          <div className="pt-3 flex items-center justify-between min-h-11">
            <BackButton />
            <div className="flex gap-2"></div>
          </div>
          <h1 className="m-0 text-[32px] leading-[38px] font-extrabold tracking-[-0.03em]">Venues</h1>
        </header>

        <div className="px-5 pt-4">
          <StateScope nearMe={stateFilter !== "All" && stateFilter === userState} onChange={(v) => { setStateFilter(v && userState ? userState : "All"); setCurrentPage(1); }} />
        </div>
        <div className="mt-3 px-5">
          <Collapsible
            open={isFilterOpen}
            onOpenChange={setIsFilterOpen}
            className="mb-4"
          >
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Filter size={16} className="mr-2" />
                {isFilterOpen ? "Hide Filters" : "Show Filters"}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 p-4 rounded-3xl bg-white dark:bg-gray-800 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="state-filter" className="text-sc-ink2 dark:text-gray-300">Filter by State</Label>
                  <Select
                    value={stateFilter}
                    onValueChange={(value) => {
                      setStateFilter(value);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger id="state-filter" className="border-sc-line dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                      <SelectValue placeholder="Select a state" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All States</SelectItem>
                      {nigerianStates.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="activity-filter" className="text-sc-ink2 dark:text-gray-300">Filter by Activity</Label>
                  <Select
                    value={activityFilter}
                    onValueChange={(value) => {
                      setActivityFilter(value);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger id="activity-filter" className="border-sc-line dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                      <SelectValue placeholder="Select activity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All</SelectItem>
                      <SelectItem value="Today">Today</SelectItem>
                      <SelectItem value="This Week">This Week</SelectItem>
                      <SelectItem value="This Month">This Month</SelectItem>
                      <SelectItem value="Next Month">Next Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="sort-order" className="text-sc-ink2 dark:text-gray-300">Sort by Popularity</Label>
                  <Select
                    value={sortOrder}
                    onValueChange={(value) => {
                      setSortOrder(value);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger id="sort-order" className="border-sc-line dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                      <SelectValue placeholder="Select sort order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="None">None</SelectItem>
                      <SelectItem value="Most Popular">Most Popular</SelectItem>
                      <SelectItem value="Least Popular">Least Popular</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button variant="outline" onClick={resetFilters}>
                Reset Filters
              </Button>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div className="px-5 flex flex-col gap-3.5">
          {loading ? (
            <VenueListSkeleton />
          ) : filteredVenues.length > 0 ? (
            <>
              <div className="flex flex-col gap-3.5">
                {currentVenues.map((venue) => {
                  const venueImage = venue.image_urls && venue.image_urls.length > 0 ? venue.image_urls[0] : null;
                  return (
                    <div
                      key={venue.id}
                      className="bg-white rounded-[26px] overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
                      onClick={() => navigate(`/venue/${venue.slug}`)}
                    >
                      <div className="relative h-[150px] flex items-center justify-center" style={{ background: SPORT.venue.bg, color: SPORT.venue.fg }}>
                        <Cover src={venueImage} kind="venue" alt={venue.name} />
                        {venue.is_verified && (
                          <span className="absolute left-3 top-3">
                            <Pill sport="football" icon={ShieldCheck}>Verified</Pill>
                          </span>
                        )}
                        <button
                          type="button"
                          aria-label={favorites.has(venue.id) ? "Remove from favourites" : "Add to favourites"}
                          className="absolute right-3 top-3 w-9 h-9 rounded-full bg-white flex items-center justify-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(venue.id);
                          }}
                        >
                          <Heart size={18} className={favorites.has(venue.id) ? "text-sport-red" : "text-sc-ink"} fill={favorites.has(venue.id) ? "#EF4444" : "none"} />
                        </button>
                        {venue.booking_fee !== null && (
                          <span className="absolute right-3 bottom-3 h-[30px] px-3 rounded-full bg-sc-ink text-white text-[13px] font-extrabold flex items-center">
                            {formatNaira(venue.booking_fee)}/hr
                          </span>
                        )}
                      </div>
                      <div className="px-4 pt-3.5 pb-4 flex flex-col gap-2">
                        <span className="text-lg font-extrabold tracking-[-0.02em]">{venue.name}</span>
                        <Meta icon={MapPin}>{`${venue.city}, ${venue.state}`}</Meta>
                        <div className="flex gap-1.5 flex-wrap">
                          {venue.aggregated_rating !== null && <Pill sport="tennis" icon={Star}>{venue.aggregated_rating.toFixed(1)}</Pill>}
                          <Pill sport="gray">{`${venue.match_count} match${venue.match_count !== 1 ? "es" : ""}`}</Pill>
                        </div>
                        {venue.is_verified && (
                          <button
                            type="button"
                            className="mt-1 h-11 rounded-full text-white text-[15px] font-extrabold"
                            style={{ background: SPORT.venue.solid }}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/venue/${venue.slug}/book`);
                            }}
                          >
                            Book venue
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center mt-4">
                <Button
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={handlePreviousPage}
                  className="bg-white dark:bg-gray-800 text-sc-green-dark border-sc-green hover:bg-green-600 hover:text-white transition-colors"
                >
                  <ChevronLeft size={16} className="mr-2" />
                  Previous
                </Button>
                <span className="text-sc-ink2 dark:text-gray-300">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={handleNextPage}
                  className="bg-white dark:bg-gray-800 text-sc-green-dark border-sc-green hover:bg-green-600 hover:text-white transition-colors"
                >
                  Next
                  <ChevronRight size={16} className="ml-2" />
                </Button>
              </div>
            </>
          ) : (
            <FunEmpty
              icon={Store}
              sport="venue"
              title={stateFilter !== "All" ? `No venues listed in ${stateFilter} yet` : "No venues match that"}
              body={stateFilter !== "All" ? "Own a pitch or court here? List it and be the first place players book." : "Try a different filter or list a venue yourself."}
              primary={{ label: "List your venue", onClick: () => navigate("/venue-create") }}
              secondary={stateFilter !== "All" ? { label: "See venues across Nigeria", onClick: () => setStateFilter("All") } : undefined}
            />
          )}
        </div>

        <Navbar />
      </div>
    </>
  );
};

export default VenueDirectory;
