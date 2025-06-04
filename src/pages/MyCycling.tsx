import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar, Clock, MapPin, Users } from "lucide-react";
import Navbar from "@/components/Navbar";

type Landmark = {
  name: string;
  state: string;
};

type CyclingEvent = {
  id_uuid: string;
  slug: string;
  title: string;
  event_date: string;
  start_time: string;
  max_attendees: number;
  attendees: { id_uuid: string }[];
  start_landmark: Landmark;
};

const MyCycling = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [hostedEvents, setHostedEvents] = useState<CyclingEvent[]>([]);
  const [joinedEvents, setJoinedEvents] = useState<CyclingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (session.session) {
          setUserId(session.session.user.id);
        } else {
          // Don't redirect; allow non-logged-in users to see empty state
          setUserId(null);
        }
      } catch (err: any) {
        console.error("Auth error:", err);
        setUserId(null);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (userId === null) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch hosted events
        const { data: hostedData, error: hostedError } = await supabase
          .from("user_hosted_cycling")
          .select(`
            cycling_event:cycling_events(
              id_uuid,
              slug,
              title,
              event_date,
              start_time,
              max_attendees,
              attendees:cycling_attendees!cycling_attendees_cycling_event_id_uuid_fkey(id_uuid),
              start_landmark:landmarks!cycling_events_start_landmark_id_fkey(name, state)
            )
          `)
          .eq("user_id", userId);

        if (hostedError) throw hostedError;

        const hosted = hostedData
          .map((item: any) => item.cycling_event)
          .filter((event: CyclingEvent | null) => event !== null);

        setHostedEvents(hosted);

        // Fetch joined events
        const { data: joinedData, error: joinedError } = await supabase
          .from("user_joined_cycling")
          .select(`
            cycling_event:cycling_events(
              id_uuid,
              slug,
              title,
              event_date,
              start_time,
              max_attendees,
              attendees:cycling_attendees!cycling_attendees_cycling_event_id_uuid_fkey(id_uuid),
              start_landmark:landmarks!cycling_events_start_landmark_id_fkey(name, state)
            )
          `)
          .eq("user_id", userId);

        if (joinedError) throw joinedError;

        const joined = joinedData
          .map((item: any) => item.cycling_event)
          .filter((event: CyclingEvent | null) => event !== null);

        setJoinedEvents(joined);
      } catch (err: any) {
        console.error("Error fetching data:", err);
        toast({
          title: "Error",
          description: err.message || "Failed to load events.",
          variant: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, toast]);

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    };
    return new Date(dateString).toLocaleDateString("en-NG", options);
  };

  const renderEventCard = (event: CyclingEvent) => (
    <Card
      key={event.id_uuid}
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => navigate(`/cycling/${event.slug}`)}
    >
      <CardHeader>
        <CardTitle className="text-lg">{event.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar size={16} />
            <span>{formatDate(event.event_date)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={16} />
            <span>{event.start_time}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={16} />
            <span>{event.start_landmark.name}, {event.start_landmark.state}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users size={16} />
            <span>
              Attendees: {event.attendees.length} / {event.max_attendees}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen pb-24">
        <header className="p-4 bg-gradient-to-r from-green-500 to-green-700 text-white rounded-b-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate(-1)} className="text-white hover:bg-green-600">
              <ArrowLeft size={18} className="mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">My Cycling</h1>
            <div className="w-10"></div>
          </div>
        </header>
        <div className="p-6 text-center">
          <p className="text-muted-foreground">Please log in to view your cycling events.</p>
          <Button
            className="mt-4 bg-green-500 hover:bg-green-600 text-white"
            onClick={() => navigate("/login")}
          >
            Log In
          </Button>
        </div>
        <Navbar />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="p-4 bg-gradient-to-r from-green-500 to-green-700 text-white rounded-b-2xl shadow-lg">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)} className="text-white hover:bg-green-600">
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">My Cycling</h1>
          <div className="w-10"></div>
        </div>
      </header>

      <div className="p-6">
        <Tabs defaultValue="hosted" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="hosted">Hosted Events</TabsTrigger>
            <TabsTrigger value="joined">Joined Events</TabsTrigger>
          </TabsList>
          <TabsContent value="hosted" className="space-y-4">
            {hostedEvents.length === 0 ? (
              <div className="text-center py-8 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <p className="text-muted-foreground">You haven't hosted any cycling events yet.</p>
                <Button
                  className="mt-4 bg-green-500 hover:bg-green-600 text-white"
                  onClick={() => navigate("/host-cycling")}
                >
                  Host a Cycling Event
                </Button>
              </div>
            ) : (
              hostedEvents.map(renderEventCard)
            )}
          </TabsContent>
          <TabsContent value="joined" className="space-y-4">
            {joinedEvents.length === 0 ? (
              <div className="text-center py-8 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <p className="text-muted-foreground">You haven't joined any cycling events yet.</p>
                <Button
                  className="mt-4 bg-green-500 hover:bg-green-600 text-white"
                  onClick={() => navigate("/cycling-activities")}
                >
                  Find Cycling Events
                </Button>
              </div>
            ) : (
              joinedEvents.map(renderEventCard)
            )}
          </TabsContent>
        </Tabs>
      </div>
      <Navbar />
    </div>
  );
};

export default MyCycling;
