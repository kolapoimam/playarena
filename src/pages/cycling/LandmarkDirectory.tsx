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

import { BackButton, SPORT } from "@/components/sc/ui";
import { Map as MapIcon } from "lucide-react";
import { Cover } from "@/components/sc/ui";
import { EventListSkeleton } from "@/components/sc/skeletons";
import { FunEmpty } from "@/components/sc/ui";
import { Flag as FlagIcon } from "lucide-react";
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
          // Favourites are a nice extra, so a problem here never blocks the list
          if (favError) console.warn("Landmark favourites not loaded", favError);
          else setFavorites(new Set((favData || []).map((fav: any) => fav.landmark_id)));
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
        console.error("Remove landmark favourite failed", error);
        toast({ title: "Could not remove favourite", description: error.message, variant: "destructive" });
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
        console.error("Add landmark favourite failed", error);
        toast({ title: "Could not save favourite", description: error.message, variant: "destructive" });
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
      <div className="min-h-screen pb-32 bg-sc-bg dark:bg-gray-900">
        <header className="px-5 pt-[max(env(safe-area-inset-top),1rem)] flex flex-col gap-3.5">
          <div className="pt-3 flex items-center justify-between min-h-11">
            <BackButton />
            <div className="flex gap-2"></div>
          </div>
          <h1 className="m-0 text-[32px] leading-[38px] font-extrabold tracking-[-0.03em]">Landmarks</h1>
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

        <div className="px-4 space-y-4">
          {loading ? (
            <div className="w-full px-1"><EventListSkeleton /></div>
          ) : filteredLandmarks.length > 0 ? (
            <>
              <div className="space-y-4">
                {currentLandmarks.map((landmark) => {
                  const fav = favorites.has(landmark.id_uuid);
                  return (
                    <div
                      key={landmark.id_uuid}
                      role="link"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && navigate(`/landmark/${landmark.slug}`)}
                      className="rounded-3xl overflow-hidden bg-white cursor-pointer active:scale-[0.99] transition-transform"
                      onClick={() => navigate(`/landmark/${landmark.slug}`)}
                    >
                      <div className="relative w-full h-40 overflow-hidden">
                        <Cover src={(landmark as any).image_url || (landmark as any).image_urls?.[0]} kind="landmark" alt="" />
                        <button
                          type="button"
                          aria-label={fav ? "Remove from favourites" : "Add to favourites"}
                          aria-pressed={fav}
                          className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-white/95 shadow-card flex items-center justify-center active:scale-90 transition-transform"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(landmark.id_uuid);
                          }}
                        >
                          <Heart size={20} color={fav ? "#DC2626" : "#0E1411"} fill={fav ? "#DC2626" : "none"} />
                        </button>
                        <span className="absolute left-3 bottom-3 h-8 px-3 rounded-full bg-white/95 text-sc-ink text-xs font-extrabold inline-flex items-center gap-1.5">
                          <MapPin size={14} className="text-[#C2410C]" /> {landmark.state}
                        </span>
                      </div>
                      <div className="p-[18px] flex flex-col gap-1.5">
                        <h3 className="m-0 text-[18px] font-extrabold tracking-[-0.01em] text-sc-ink">{landmark.name}</h3>
                        {landmark.description && <p className="m-0 text-sm text-sc-ink3 line-clamp-2">{truncateDescription(landmark.description)}</p>}
                        <span className="self-start mt-1 h-7 px-3 rounded-full text-xs font-bold inline-flex items-center" style={{ background: SPORT.cycling.bg, color: SPORT.cycling.fg }}>
                          {`${landmark.event_count} ride${landmark.event_count !== 1 ? "s" : ""}`}
                        </span>
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
<FunEmpty icon={FlagIcon} sport="guide" title="No landmarks here yet" body="Add the roundabout, gate or park your crew always meets at, and rides can start from it." primary={{ label: "Host a ride", onClick: () => navigate("/host-cycling") }} />
          )}
        </div>

        <Navbar />
      </div>
    </>
  );
};

export default LandmarkDirectory;
