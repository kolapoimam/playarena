import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Store, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import ThemeToggle from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Define the Venue type
type Venue = {
  id: string;
  slug: string;
  name: string;
  city: string;
  state: string;
  image_urls: string[] | null;
  match_count: number;
  match_dates?: string[]; // For activity filtering
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
  const { theme } = useTheme();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [filteredVenues, setFilteredVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const venuesPerPage = 4;

  // Filter states
  const [stateFilter, setStateFilter] = useState<string>("All");
  const [activityFilter, setActivityFilter] = useState<string>("All");
  const [sortByPopularity, setSortByPopularity] = useState<boolean>(false);

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        // Get current date for activity filtering
        const now = new Date().toLocaleString("en-US", { timeZone: "Africa/Lagos" });
        const currentDate = new Date(now);
        const currentDateString = currentDate.toISOString().split("T")[0];

        // Fetch all venues with match count and match dates
        const { data: venuesData, error: venuesError } = await supabase
          .from("venues")
          .select(`
            id,
            slug,
            name,
            city,
            state,
            image_urls,
            match_count:matches!venue_id(count),
            match_dates:matches!venue_id(match_date)
          `)
          .order("created_at", { ascending: false });

        if (venuesError) throw venuesError;

        // Map venues to include match_count and match_dates, ensuring match_count is a number
        const venuesWithDetails = venuesData.map((venue: any) => ({
          ...venue,
          match_count: Number(venue.match_count) || 0, // Ensure match_count is a number
          match_dates: venue.match_dates?.map((m: any) => m.match_date) || [],
        }));

        setVenues(venuesWithDetails as Venue[]);
        setFilteredVenues(venuesWithDetails as Venue[]);
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

    fetchVenues();
  }, [toast]);

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...venues];

    // State filter
    if (stateFilter !== "All") {
      filtered = filtered.filter((venue) => venue.state === stateFilter);
    }

    // Activity filter
    const now = new Date();
    const currentDateString = now.toISOString().split("T")[0];
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday of current week
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Sunday
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

    // Sort by popularity (match count)
    if (sortByPopularity) {
      filtered.sort((a, b) => (b.match_count || 0) - (a.match_count || 0));
    }

    setFilteredVenues(filtered);
    setCurrentPage(1); // Reset to first page on filter change
  }, [stateFilter, activityFilter, sortByPopularity, venues]);

  // Pagination logic
  const indexOfLastVenue = currentPage * venuesPerPage;
  const indexOfFirstVenue = indexOfLastVenue - venuesPerPage;
  const currentVenues = filteredVenues.slice(indexOfFirstVenue, indexOfLastVenue);
  const totalPages = Math.ceil(filteredVenues.length / venuesPerPage);

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 p-4 flex justify-between items-center bg-white dark:bg-gray-900 shadow-sm">
        <div className="flex items-center">
          <Button
            variant="ghost"
            className="mr-2"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={18} />
          </Button>
          <img
            src={theme === "dark" ? "/playarenadark.png" : "/playarenalight.png"}
            alt="PlayArena Logo"
            className="h-12 w-auto object-contain"
          />
        </div>
        <ThemeToggle />
      </header>

      {/* Filters */}
      <div className="px-4 py-4">
        <h1 className="text-2xl font-bold mb-4">All Venues</h1>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {/* State Filter */}
          <div>
            <label className="block text-sm font-medium mb-1">Filter by State</label>
            <Select onValueChange={setStateFilter} value={stateFilter}>
              <SelectTrigger className="w-full">
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

          {/* Activity Filter */}
          <div>
            <label className="block text-sm font-medium mb-1">Filter by Activity</label>
            <Select onValueChange={setActivityFilter} value={activityFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select activity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="Today">Today</SelectItem>
                <SelectItem value="This Week">This Week</SelectItem>
                <SelectItem value="This Month">This Month</SelectItem>
                <SelectItem value="Next Month">Next Month</SelectItem> {/* Added */}
              </SelectContent>
            </Select>
          </div>

          {/* Popularity Sort */}
          <div className="flex items-center">
            <label className="block text-sm font-medium mr-2">Sort by Popularity</label>
            <input
              type="checkbox"
              checked={sortByPopularity}
              onChange={(e) => setSortByPopularity(e.target.checked)}
              className="h-5 w-5 text-green-500"
            />
          </div>
        </div>

        {/* Venue List */}
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        ) : filteredVenues.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-4">
              {currentVenues.map((venue) => {
                const defaultImage = "https://dailytrust.com/wp-content/uploads/2023/12/football-488714_1280.jpg";
                const venueImage = venue.image_urls && venue.image_urls.length > 0 ? venue.image_urls[0] : defaultImage;

                return (
                  <div
                    key={venue.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 cursor-pointer"
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

            {/* Pagination */}
            <div className="flex justify-between items-center px-4 mt-6">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => prev - 1)}
              >
                Previous
              </Button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage((prev) => prev + 1)}
              >
                Next
              </Button>
            </div>
          </>
        ) : (
          <div className="px-4 py-8 text-center">
            <p className="text-muted-foreground">No venues match your filters.</p>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <Navbar />
    </div>
  );
};

export default VenueDirectory;
