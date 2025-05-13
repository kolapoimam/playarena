import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ChevronDown, ChevronUp, Store } from "lucide-react";
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
import { cn } from "@/lib/utils";

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
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const venuesPerPage = 4;

  // Filter states
  const [stateFilter, setStateFilter] = useState<string>("All");
  const [activityFilter, setActivityFilter] = useState<string>("All");
  const [sortOrder, setSortOrder] = useState<string>("None");

  useEffect(() => {
    const fetchVenues = async () => {
      try {
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

  return (
    <div className="min-h-screen pb-20">
      <header className="p-4 bg-gradient-to-r from-green-500 to-green-700 text-white rounded-b-2xl shadow-lg">
        <div className="flex items-center justify-between">
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

      <div className="p-4">
        <div className="mb-6">
          <Button
            variant="outline"
            className="w-full flex justify-between items-center bg-white dark:bg-gray-800 text-green-600 border-green-500 hover:bg-green-50 dark:hover:bg-green-900"
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          >
            <span>Filters</span>
            {isFiltersOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </Button>
          <div
            className={cn(
              "mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm transition-all duration-300",
              isFiltersOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"
            )}
          >
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Filter by State
              </label>
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

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Filter by Activity
              </label>
              <Select onValueChange={setActivityFilter} value={activityFilter}>
                <SelectTrigger className="w-full">
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
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Sort by Popularity
              </label>
              <Select onValueChange={setSortOrder} value={sortOrder}>
                <SelectTrigger className="w-full">
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
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        ) : filteredVenues.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-4">
              {currentVenues.map((venue) => {
                const defaultImage = "https://dailytrust.com/wp-content/uploads/2023/12/football-488714_1280.jpg";
                const venueImage = venue.image_urls && venue.image_urls.length > 0 ? venue.image_urls[0] : defaultImage;

                return (
                  <div
                    key={venue.id}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 cursor-pointer transform transition-all hover:scale-105 hover:bg-green-50 dark:hover:bg-green-900"
                    onClick={() => navigate(`/venue/${venue.slug}`)}
                  >
                    <img
                      src={venueImage}
                      alt={venue.name}
                      className="w-full h-36 object-cover rounded-t-xl"
                    />
                    <div className="p-3">
                      <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-1">{venue.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{`${venue.city}, ${venue.state}`}</p>
                      <div className="flex items-center text-sm font-medium text-green-600 dark:text-green-400">
                        <Store className="h-4 w-4 mr-1" />
                        <span>{`${venue.match_count} Match${venue.match_count !== 1 ? "es" : ""}`}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center px-4 mt-6">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => prev - 1)}
                className="bg-white dark:bg-gray-800 text-green-600 border-green-500 hover:bg-green-600 hover:text-white transition-colors"
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage((prev) => prev + 1)}
                className="bg-white dark:bg-gray-800 text-green-600 border-green-500 hover:bg-green-600 hover:text-white transition-colors"
              >
                Next
              </Button>
            </div>
          </>
        ) : (
          <div className="px-4 py-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">No venues match your filters.</p>
          </div>
        )}
      </div>

      <Navbar />
    </div>
  );
};

export default VenueDirectory;
