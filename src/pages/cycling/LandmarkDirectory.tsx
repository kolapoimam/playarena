import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ChevronLeft, ChevronRight, Filter, MapPin, Heart } from "lucide-react";
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

// Define the Landmark type
type Landmark = {
  id_uuid: string;
  slug: string;
  name: string;
  state: string;
  description: string | null;
  event_count: number;
  event_dates?: string[];
};

// List of Nigerian states
const nigerianStates = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara",
  "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers",
  "Sokoto", "Taraba", "Yobe", "Zamfara",
];

const LandmarkDirectory = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [filteredLandmarks, setFilteredLandmarks] = useState<Landmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const landmarksPerPage = 4;

  // Filter states
  const [stateFilter, setStateFilter] = useState<string>("All");
  const [activityFilter, setActivityFilter] = useState<string>("All");
  const [sortOrder, setSortOrder] = useState<string>("None");

  useEffect(() => {
    const fetchUserAndLandmarks = async () => {
      try {
        // Get the logged-in user
        const { data: session } = await supabase.auth.getSession();
        if (session?.session) {
          setUserId(session.session.user.id);
        }

        // Fetch landmarks
        const now = new Date().toLocaleString("en-US", { timeZone: "Africa/Lagos" });
        const currentDate = new Date(now);
        const currentDateString = currentDate.toISOString().split("T")[0];

        const { data: landmarksData, error: landmarksError } = await supabase
          .from("landmarks")
          .select(`
            id_uuid,
            slug,
            name,
            state,
            description,
            cycling_events!start_landmark_id (event_date)
          `)
          .order("created_at", { ascending: false });

        if (landmarksError) throw landmarksError;

        const landmarksWithDetails = landmarksData.map((landmark: any) => ({
          ...landmark,
          event_count: landmark.cycling_events ? landmark.cycling_events.length : 0,
          event_dates: landmark.cycling_events
            ? landmark.cycling_events.map((e: any) => e.event_date).filter((date: string) => date)
            : [],
        }));

        setLandmarks(landmarksWithDetails as Landmark[]);
        setFilteredLandmarks(landmarksWithDetails as Landmark[]);

        // Fetch user's favorites if logged in
        if (session?.session) {
          const { data: favData, error: favError } = await supabase
            .from("user_landmark_favourites")
            .select("landmark_id")
            .eq("user_id", session.session.user.id);
          if (favError) {
            toast({ title: "Error", description: "Failed to load favorites.", variant: "destructive" });
            return;
          }
          setFavorites(new Set(favData.map((fav) => fav.landmark_id)));
        }
      } catch (error) {
        console.error("Error fetching landmarks:", error);
        toast({
          title: "Error",
          description: "Failed to load landmarks. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndLandmarks();
  }, [toast]);

  useEffect(() => {
    let filtered = [...landmarks];

    if (stateFilter !== "All") {
      filtered = filtered.filter((landmark) => landmark.state === stateFilter);
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
      filtered = filtered.filter((landmark) => {
        if (!landmark.event_dates || landmark.event_dates.length === 0) return false;
        return landmark.event_dates.some((eventDate: string) => {
          const date = new Date(eventDate);
          switch (activityFilter) {
            case "Today":
              return eventDate === currentDateString;
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
      filtered.sort((a, b) => b.event_count - a.event_count);
    } else if (sortOrder === "Least Popular") {
      filtered.sort((a, b) => a.event_count - b.event_count);
    }

    setFilteredLandmarks(filtered);
    setCurrentPage(1);
  }, [stateFilter, activityFilter, sortOrder, landmarks]);

  const indexOfLastLandmark = currentPage * landmarksPerPage;
  const indexOfFirstLandmark = indexOfLastLandmark - landmarksPerPage;
  const currentLandmarks = filteredLandmarks.slice(indexOfFirstLandmark, indexOfLastLandmark);
  const totalPages = Math.ceil(filteredLandmarks.length / landmarksPerPage);

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

  const toggleFavorite = async (landmarkId: string) => {
    if (!userId) {
      toast({
        title: "Login Required",
        description: "Please log in to favorite a landmark.",
        variant: "destructive",
      });
      return;
    }

    const isFavorited = favorites.has(landmarkId);
    if (isFavorited) {
      const { error } = await supabase
        .from("user_landmark_favourites")
        .delete()
        .eq("user_id", userId)
        .eq("landmark_id", landmarkId);
      if (error) {
        toast({ title: "Error", description: "Failed to remove favorite.", variant: "destructive" });
        return;
      }
      setFavorites((prev) => {
        const newFavs = new Set(prev);
        newFavs.delete(landmarkId);
        return newFavs;
      });
      toast({ title: "Success", description: "Removed from favorites." });
    } else {
      const { error } = await supabase
        .from("user_landmark_favourites")
        .insert([{ user_id: userId, landmark_id: landmarkId }]);
      if (error) {
        toast({ title: "Error", description: "Failed to add favorite.", variant: "destructive" });
        return;
      }
      setFavorites((prev) => new Set(prev).add(landmarkId));
      toast({ title: "Success", description: "Added to favorites!" });
    }
  };

  const truncateDescription = (description: string | null, maxLength: number = 100) => {
    if (!description) return "No description available.";
    return description.length > maxLength ? `${description.slice(0, maxLength)}...` : description;
  };

  return (
    <>
      <Seo
        title="Landmarks Directory | Sport Cliq"
        description="Browse all cycling landmarks and locations on Sport Cliq."
        url={window.location.href}
        image={undefined}
        children={null}
      />
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
              <h1 className="text-2xl font-bold">Landmark Directory</h1>
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
          ) : filteredLandmarks.length > 0 ? (
            <>
              <div className="space-y-4">
                {currentLandmarks.map((landmark) => {
                  const placeholderImage = "https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80";

                  return (
                    <div
                      key={landmark.id_uuid}
                      className="border rounded-lg overflow-hidden shadow-sm bg-white dark:bg-gray-800 cursor-pointer relative"
                      onClick={() => navigate(`/landmark/${landmark.slug}`)}
                    >
                      <img
                        src={placeholderImage}
                        alt={landmark.name}
                        className="w-full h-36 object-cover"
                      />
                      <Button
                        variant="ghost"
                        className="absolute bottom-2 right-2 text-red-500 hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(landmark.id_uuid);
                        }}
                      >
                        <Heart
                          size={24}
                          fill={favorites.has(landmark.id_uuid) ? "red" : "none"}
                        />
                      </Button>
                      <div className="p-4">
                        <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200 mb-1">{landmark.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{landmark.state}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{truncateDescription(landmark.description)}</p>
                        <div className="flex items-center text-sm font-medium text-green-600 dark:text-green-400">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span>{`${landmark.event_count} Event${landmark.event_count !== 1 ? "s" : ""}`}</span>
                        </div>
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
              <p className="text-gray-500 dark:text-gray-400 text-center p-4">No landmarks match your filters.</p>
            </div>
          )}
        </div>

        <Navbar />
      </div>
    </>
  );
};

export default LandmarkDirectory;
