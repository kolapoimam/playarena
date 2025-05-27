import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ChevronLeft, ChevronRight, Filter, Store, Star, CheckCircle, Heart } from "lucide-react";
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
  const [stateFilter, setStateFilter] = useState<string>("All");
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
    <div className="min-h-screen pb-24 bg-gray-100 dark:bg-gray-900">
      <header className="p-4 bg-gradient-to-r from-green-500 to-green-700 text-white rounded-b-2xl shadow-lg">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-green-600"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <div className="text-center">
            <h1 className="text-2xl font-bold">Venue Directory</h1>
          </div>
          <div className="w-10"></div>
        </div>
      </header>

      <div className="mt-6 px-4">
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
          <CollapsibleContent className="mt-4 p-4 border rounded-lg bg-white dark:bg-gray-800 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="state-filter" className="text-gray-700 dark:text-gray-300">Filter by State</Label>
                <Select
                  value={stateFilter}
                  onValueChange={(value) => {
                    setStateFilter(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger id="state-filter" className="border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
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
                <Label htmlFor="activity-filter" className="text-gray-700 dark:text-gray-300">Filter by Activity</Label>
                <Select
                  value={activityFilter}
                  onValueChange={(value) => {
                    setActivityFilter(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger id="activity-filter" className="border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
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
                <Label htmlFor="sort-order" className="text-gray-700 dark:text-gray-300">Sort by Popularity</Label>
                <Select
                  value={sortOrder}
                  onValueChange={(value) => {
                    setSortOrder(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger id="sort-order" className="border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
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

      <div className="px-4 space-y-4">
        {loading ? (
          <div className="flex justify-center items-center h-[50vh]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        ) : filteredVenues.length > 0 ? (
          <>
            <div className="space-y-4">
              {currentVenues.map((venue) => (
                <div
                  key={venue.id}
                  className="border rounded-lg overflow-hidden shadow-sm bg-white dark:bg-gray-800 cursor-pointer"
                  onClick={() => navigate(`/venue/${venue.slug}`)}
                >
                  <div className="relative">
                    <img
                      src={venue.image_urls && venue.image_urls.length > 0 ? venue.image_urls[0] : "https://dailytrust.com/wp-content/uploads/2023/12/football-488714_1280.jpg"}
                      alt={venue.name}
                      className="w-full h-36 object-cover"
                    />
                    <Button
                      variant="ghost"
                      className="absolute bottom-[-2rem] right-2 text-red-500 hover:text-red-700 bg-white dark:bg-gray-800/80 rounded-full p-1 z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(venue.id);
                      }}
                    >
                      <Heart
                        size={20}
                        fill={favorites.has(venue.id) ? "red" : "none"}
                      />
                    </Button>
                    <div className="p-4">
                      <div className="flex items-center">
                        <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200 mb-1">{venue.name}</h3>
                        {venue.is_verified && (
                          <img
                            src="/green-verified.png"
                            alt="Verified"
                            className="ml-1 w-4 h-4 object-contain"
                          />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{`${venue.city}, ${venue.state}`}</p>
                      <div className="flex items-center text-sm text-yellow-500 mb-1">
                        <Star size={14} className="mr-1 fill-yellow-500" />
                        <span>{venue.aggregated_rating !== null ? `${venue.aggregated_rating.toFixed(1)} / 5.0` : "No ratings"}</span>
                      </div>
                      <div className="flex items-center text-sm font-medium text-green-600 dark:text-green-400">
                        <Store className="h-4 w-4 mr-1" />
                        <span>{`${venue.match_count} Match${venue.match_count !== 1 ? "es" : ""}`}</span>
                        {venue.booking_fee !== null && (
                          <div className="ml-auto bg-green-100 dark:bg-green-900 rounded-full px-2 py-1 text-xs font-semibold text-green-700 dark:text-green-300">
                            NGN {venue.booking_fee.toFixed(2)}
                          </div>
                        )}
                      </div>
                      {venue.is_verified && (
                        <Button
                          variant="outline"
                          className="mt-2 w-full bg-green-500 text-white border-green-500 hover:bg-green-600 hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/venue/${venue.slug}/book`);
                          }}
                        >
                          Book Venue
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center mt-4">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={handlePreviousPage}
                className="bg-white dark:bg-gray-800 text-green-600 border-green-500 hover:bg-green-600 hover:text-white transition-colors"
              >
                <ChevronLeft size={16} className="mr-2" />
                Previous
              </Button>
              <span className="text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={handleNextPage}
                className="bg-white dark:bg-gray-800 text-green-600 border-green-500 hover:bg-green-600 hover:text-white transition-colors"
              >
                Next
                <ChevronRight size={16} className="ml-2" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-[50vh] flex-col gap-4">
            <p className="text-gray-500 dark:text-gray-400 text-center p-4">No venues match your filters.</p>
          </div>
        )}
      </div>

      <Navbar />
    </div>
  );
};

export default VenueDirectory;
