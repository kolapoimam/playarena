import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { MapPin, ArrowLeft, ExternalLink, Calendar, Clock, Bike } from "lucide-react";
import Navbar from "@/components/Navbar";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

// Custom CSS to style ReactQuill for description
const quillStyles = `
  .ql-container {
    border: none !important;
    background: transparent !important;
    padding: 0 !important;
  }
  .ql-editor {
    padding: 0 !important;
    font-family: 'Plus Jakarta Sans', sans-serif !important;
    color: inherit !important;
    font-size: 1rem !important;
  }
  .ql-editor p {
    margin: 0 !important;
  }
  .dark .ql-editor {
    color: #d1d5db !important;
  }
`;

type Landmark = {
  id_uuid: string;
  slug: string;
  name: string;
  state: string;
  description: string | null;
  map_link: string | null;
};

type CyclingEvent = {
  id_uuid: string;
  slug: string;
  title: string;
  event_date: string;
  start_time: string;
  is_free: boolean;
  price: number | null;
};

const formatDate = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" };
  return new Date(dateString).toLocaleDateString("en-US", options);
};

const formatTime = (timeString: string) => {
  if (!timeString) return "N/A";
  const match = timeString.match(/(\d{1,2}:\d{2}\s*[AP]M)/i);
  return match ? match[0] : timeString;
};

const LandmarkDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [landmark, setLandmark] = useState<Landmark | null>(null);
  const [events, setEvents] = useState<CyclingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setError("No landmark slug provided.");
      setLoading(false);
      return;
    }

    const fetchLandmark = async () => {
      try {
        const { data, error } = await supabase
          .from("landmarks")
          .select("id_uuid, slug, name, state, description, map_link")
          .eq("slug", slug)
          .single();

        if (error) throw new Error(error.message || "Failed to fetch landmark.");
        setLandmark(data as Landmark);
        return data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
        console.error("Error fetching landmark:", errorMessage);
        setError(errorMessage);
        toast({
          title: "Error",
          description: "Failed to load landmark details. Please try again.",
          variant: "destructive",
        });
        throw err;
      }
    };

    const fetchEvents = async (landmarkId: string) => {
      try {
        const { data, error } = await supabase
          .from("cycling_events")
          .select("id_uuid, slug, title, event_date, start_time, is_free, price")
          .eq("start_landmark_id", landmarkId)
          .order("event_date", { ascending: false })
          .limit(5);

        if (error) throw new Error(error.message || "Failed to fetch events.");
        setEvents(data as CyclingEvent[]);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
        console.error("Error fetching events:", errorMessage);
        toast({
          title: "Error",
          description: "Failed to load recent events. Please try again.",
          variant: "destructive",
        });
      } finally {
        setEventsLoading(false);
      }
    };

    const fetchData = async () => {
      try {
        const landmarkData = await fetchLandmark();
        if (landmarkData) {
          await fetchEvents(landmarkData.id_uuid);
        }
      } catch (err) {
        console.error("Error in fetchData:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug, toast]);

  // Quill toolbar configuration (read-only, so no toolbar)
  const quillModules = {
    toolbar: false,
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh] bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error || !landmark) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4 text-gray-700 dark:text-gray-300"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
            {error ? "Error Loading Landmark" : "Landmark Not Found"}
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            {error || "The landmark you're looking for doesn't exist or has been removed."}
          </p>
        </div>
      </div>
    );
  }

  const placeholderImage = "https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80";

  return (
    <div className="min-h-screen pb-20 bg-gray-50 dark:bg-gray-900">
      <style>{quillStyles}</style>
      <header className="sticky top-0 z-50 bg-green-500 text-white shadow-md">
        <div className="p-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-white hover:text-gray-200"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Landmark Details</h1>
          <div className="w-10"></div>
        </div>
      </header>

      <div className="p-6 max-w-3xl mx-auto">
        <div className="rounded-xl overflow-hidden mb-6 h-64 shadow-md">
          <img
            src={placeholderImage}
            alt={landmark.name}
            className="w-full h-full object-cover"
          />
        </div>

        <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">{landmark.name}</h1>
        <div className="flex items-center text-gray-600 dark:text-gray-400 mb-4">
          <MapPin size={18} className="mr-2" />
          <span>{landmark.state}</span>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-lg mb-4 text-gray-900 dark:text-gray-100">Landmark Details</h2>

            <div className="space-y-4">
              {landmark.description && (
                <div className="flex items-start">
                  <MapPin size={18} className="mr-2 text-gray-700 dark:text-gray-300 mt-1" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</h3>
                    <ReactQuill
                      value={landmark.description || "<p>No description available.</p>"}
                      readOnly={true}
                      modules={quillModules}
                      className="w-full border-none bg-transparent p-0 text-gray-600 dark:text-gray-400"
                    />
                  </div>
                </div>
              )}

              {landmark.map_link && (
                <div className="pt-2">
                  <a
                    href={landmark.map_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-green-500 hover:text-green-600 text-sm font-medium"
                  >
                    <ExternalLink size={16} className="mr-2" />
                    View on Google Maps
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-lg mb-4 text-gray-900 dark:text-gray-100">Recent Events</h2>

            {eventsLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
              </div>
            ) : events.length > 0 ? (
              <div className="space-y-4">
                {events.map((event) => (
                  <div
                    key={event.id_uuid}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                    onClick={() => navigate(`/cycling/${event.slug}`)}
                  >
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{event.title}</h3>
                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <Calendar size={16} />
                      <span>{formatDate(event.event_date)}</span>
                      <Clock size={16} />
                      <span>{formatTime(event.start_time)}</span>
                    </div>
                    <div className="mt-1 text-sm font-medium text-green-600 dark:text-green-400">
                      {event.is_free ? "Free" : `₦${event.price?.toFixed(2)}`}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400">No recent events found for this landmark.</p>
            )}
          </div>

          <div className="mt-6">
            <Button
              className="w-full bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-2"
              onClick={() => navigate(`/host-cycling?landmark=${landmark.slug}`)}
            >
              <Bike size={16} className="mr-2" />
              Host Event
            </Button>
          </div>
        </div>
      </div>

      <Navbar />
    </div>
  );
};

export default LandmarkDetail;
