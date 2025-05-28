import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ExternalLink, Bicycle } from "lucide-react";
import CyclingDetailsDialogue from "@/components/CyclingDetailsDialogue";
import Navbar from "@/components/Navbar";

type Landmark = {
  name: string;
  state: string;
  description: string;
  map_link: string;
};

type Attendee = {
  id: string;
  attendee_name: string;
  attendee_phone: string;
  attendee_status: string;
  cycling_event_id: string;
};

type CyclingEvent = {
  id: string;
  slug: string;
  title: string;
  event_date: string;
  start_time: string;
  duration_value: number;
  duration_type: string;
  max_attendees: number;
  is_free: boolean;
  host_name: string;
  host_phone: string;
  notes?: string;
  is_own_bike: boolean;
  is_rental_available: boolean;
  start_landmark: Landmark;
  end_landmark?: Landmark;
};

const CyclingDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [event, setEvent] = useState<CyclingEvent | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    const fetchEvent = async () => {
      try {
        const { data, error } = await supabase
          .from("cycling_events")
          .select(`
            *,
            start_landmark:landmarks!start_landmark_id(name, state, description, map_link),
            end_landmark:landmarks!end_landmark_id(name, state, description, map_link)
          `)
          .eq("slug", slug)
          .single();

        if (error) throw error;
        setEvent(data);

        const { data: attendeesData, error: attendeesError } = await supabase
          .from("cycling_attendees")
          .select("*")
          .eq("cycling_event_id", data.id);
        if (!attendeesError) setAttendees(attendeesData || []);

        setLoading(false);
      } catch (error: any) {
        console.error("Error fetching event:", error);
        toast({
          title: "Error",
          description: "Failed to load event details.",
          variant: "destructive",
        });
        navigate("/cycling");
      }
    };
    fetchEvent();
  }, [slug, navigate, toast]);

  const getEventStatus = () => {
    if (!event) return "upcoming";
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const eventDate = new Date(event.event_date);

    if (eventDate.toDateString() === today.toDateString()) return "today";
    if (eventDate.toDateString() === tomorrow.toDateString()) return "tomorrow";
    if (eventDate > now) return "upcoming";
    return "passed";
  };

  const handleShare = () => {
    const url = `${window.location.origin}/cycling-event/${slug}`;
    if (navigator.share) {
      navigator
        .share({
          title: event?.title,
          text: `Join my cycling event: ${event?.title} at ${event?.start_landmark.name}!`,
          url,
        })
        .catch(() =>
          toast({ title: "Error", description: "Failed to share event." })
        );
    } else {
      navigator.clipboard.writeText(url);
      toast({
        title: "Link Copied",
        description: "Event link copied to clipboard.",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold mb-2">Event Not Found</h2>
          <p className="text-gray-500 dark:text-gray-400">
            The event doesn't exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  const status = getEventStatus();
  const isPast = status === "passed";

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
          <h1 className="text-xl font-bold">Event Details</h1>
          <div className="w-10"></div>
        </div>
      </header>
      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle>{event.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>
                <strong>Status:</strong>{" "}
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </p>
              <p>
                <strong>Date:</strong>{" "}
                {new Date(event.event_date).toLocaleDateString("en-US", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
              <p>
                <strong>Time:</strong> {event.start_time}
              </p>
              <p>
                <strong>Start:</strong> {event.start_landmark.name},{" "}
                {event.start_landmark.state}
                {event.start_landmark.map_link && (
                  <a
                    href={event.start_landmark.map_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 hover:underline"
                  >
                    <ExternalLink size={12} className="inline" /> Map
                  </a>
                )}
              </p>
              {event.end_landmark && (
                <p>
                  <strong>End:</strong> {event.end_landmark.name},{" "}
                  {event.end_landmark.state}
                </p>
              )}
              <p>
                <strong>Duration:</strong> {event.duration_value}{" "}
                {event.duration_type}
              </p>
              <p>
                <strong>Attendees:</strong> {attendees.length}/
                {event.max_attendees}
              </p>
              <p>
                <strong>Cost:</strong> {event.is_free ? "Free" : "Paid"}
              </p>
              <p>
                <strong>Bike Options:</strong>{" "}
                {event.is_own_bike && "Own Bike"}{" "}
                {event.is_rental_available && "Rentals Available"}
              </p>
              {event.notes && (
                <p>
                  <strong>Notes:</strong> {event.notes}
                </p>
              )}
              <p>
                <strong>Host:</strong> {event.host_name} ({event.host_phone})
              </p>
            </div>
            <div className="flex space-x-2 mt-4">
              <Button
                onClick={handleShare}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                Share
              </Button>
              {!isPast && attendees.length < event.max_attendees && (
                <Button
                  onClick={() => navigate(`/join-cycling/${event.slug}`)}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  Join Event
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Attendees</CardTitle>
          </CardHeader>
          <CardContent>
            {attendees.length === 0 ? (
              <p>No attendees yet.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left">Name</th>
                    <th className="text-left">Phone</th>
                    <th className="text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendees.map((attendee) => (
                    <tr key={attendee.id}>
                      <td>{attendee.attendee_name}</td>
                      <td>{attendee.attendee_phone}</td>
                      <td>
                        {attendee.attendee_status.replace("_", " ").toUpperCase()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
      <CyclingDetailsDialogue event={event} attendees={attendees} />
      <Navbar />
    </div>
  );
};

export default CyclingDetail;
