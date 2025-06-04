import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, MapPin, Clock, Users, Bike } from 'lucide-react';
import { format } from 'date-fns';
import Navbar from '@/components/Navbar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type CyclingEvent = {
  id_uuid: string;
  slug: string;
  title: string;
  event_date: string;
  start_time: string;
  start_landmark: { name: string; state: string };
  max_attendees: number;
  attendees: { id_uuid: string }[];
};

type Profile = {
  id: string;
  nickname: string | null;
  first_name: string | null;
};

const MyCycling = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hostedEvents, setHostedEvents] = useState<CyclingEvent[]>([]);
  const [joinedEvents, setJoinedEvents] = useState<CyclingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) {
          navigate('/login');
          return;
        }
        setUserId(session.session.user.id);
      } catch (err: any) {
        console.error('Auth error:', err);
        toast({
          title: 'Authentication Error',
          description: 'Failed to verify session. Please log in again.',
          variant: 'destructive',
        });
        navigate('/login');
      }
    };
    checkAuth();
  }, [navigate, toast]);

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;

      setLoading(true);
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, nickname, first_name')
          .eq('id', userId)
          .single();

        if (profileError) throw profileError;
        if (!profileData) throw new Error('Profile not found');
        setProfile(profileData);

        const { data: hostedData, error: hostedError } = await supabase
          .from('user_hosted_cycling')
          .select(`
            cycling_event:cycling_events!user_hosted_cycling_cycling_event_id_fkey(
              id_uuid,
              slug,
              title,
              event_date,
              start_time,
              start_landmark:landmarks!cycling_events_start_landmark_id_fkey(name, state),
              max_attendees,
              attendees:cycling_attendees(id_uuid)
            )
          `)
          .eq('user_id', userId);

        if (hostedError) throw hostedError;
        const hosted = hostedData
          ?.map((item) => item.cycling_event)
          .filter((event): event is CyclingEvent => !!event) || [];
        setHostedEvents(hosted);

        const { data: joinedData, error: joinedError } = await supabase
          .from('user_joined_cycling')
          .select(`
            cycling_event:cycling_events!user_joined_cycling_cycling_event_id_fkey(
              id_uuid,
              slug,
              title,
              event_date,
              start_time,
              start_landmark:landmarks!cycling_events_start_landmark_id_fkey(name, state),
              max_attendees,
              attendees:cycling_attendees(id_uuid)
            )
          `)
          .eq('user_id', userId);

        if (joinedError) throw joinedError;
        const joined = joinedData
          ?.map((item) => item.cycling_event)
          .filter((event): event is CyclingEvent => !!event) || [];
        setJoinedEvents(joined);
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to load cycling data');
        toast({
          title: 'Error',
          description: err.message || 'Failed to load your cycling data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, toast]);

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const handleNavigate = (slug: string) => {
    navigate(`/cycling/${slug}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-gray-100 dark:bg-gray-900">
      <header className="p-4 bg-gradient-to-r from-green-500 to-green-700 text-white rounded-b-2xl shadow-lg">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)} className="text-white hover:bg-green-600">
            <Bike size={18} className="mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">My Cycling</h1>
          <div className="w-10"></div>
        </div>
      </header>

      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-16 w-16">
            <AvatarImage src="" alt="Profile" />
            <AvatarFallback>
              {profile?.nickname?.[0] || profile?.first_name?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-semibold">
              {profile?.nickname || profile?.first_name || 'User'}
            </h2>
            <p className="text-muted-foreground">Your cycling activities</p>
          </div>
        </div>

        <Tabs defaultValue="hosted" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="hosted">Hosted Events</TabsTrigger>
            <TabsTrigger value="joined">Joined Events</TabsTrigger>
          </TabsList>
          <TabsContent value="hosted" className="mt-6">
            {hostedEvents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">You haven't hosted any cycling events yet.</p>
                <Button
                  className="mt-4 bg-green-500 hover:bg-green-600 text-white"
                  onClick={() => navigate('/host-cycling')}
                >
                  Host a Cycling Event
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {hostedEvents.map((event) => (
                  <Card key={event.id_uuid} className="cursor-pointer" onClick={() => handleNavigate(event.slug)}>
                    <CardHeader>
                      <CardTitle>{event.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
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
                            {event.attendees.length} / {event.max_attendees} attendees
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="joined" className="mt-6">
            {joinedEvents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">You haven't joined any cycling events yet.</p>
                <Button
                  className="mt-4 bg-green-500 hover:bg-green-600 text-white"
                  onClick={() => navigate('/cycling-activities')}
                >
                  Find Cycling Events
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {joinedEvents.map((event) => (
                  <Card key={event.id_uuid} className="cursor-pointer" onClick={() => handleNavigate(event.slug)}>
                    <CardHeader>
                      <CardTitle>{event.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
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
                            {event.attendees.length} / {event.max_attendees} attendees
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <Navbar />
    </div>
  );
};

export default MyCycling;
