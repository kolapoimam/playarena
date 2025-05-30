import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { isPast, differenceInMinutes } from "date-fns";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import MatchCodeInput from "@/components/MatchCodeInput";
import MatchDetails from "@/components/MatchDetails";
import PlayerManagement from "@/components/PlayerManagement";
import OrganizerCashout from "@/components/OrganizerCashout";
import CyclingDetails from "@/components/CyclingDetails";
import AttendeesManagement from "@/components/AttendeesManagement";
import HostCashout from "@/components/HostCashout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type Match = {
  id: string;
  slug: string;
  title: string;
  match_date: string;
  match_time: string;
  match_start_time?: string | null;
  match_end_time?: string | null;
  total_slots: number;
  organizer_name: string;
  super_code: string;
  is_paid: boolean;
  price?: number;
  cancellation_status: boolean;
  status: string;
  venue: {
    name?: string;
    city?: string;
  } | null;
  players: {
    id: string;
    player_name: string;
    status: string;
    confirmation_code: string;
    details: { phone: string } | null;
    number_of_slots?: number;
  }[] | null;
};

type CyclingEvent = {
  id: string;
  slug: string;
  title: string;
  event_date: string;
  event_time: string;
  event_start_time?: string | null;
  event_end_time?: string | null;
  total_slots: number;
  host_name: string;
  super_code: string;
  is_paid: boolean;
  price?: number;
  cancellation_status: boolean;
  status: string;
  location: {
    name?: string;
    city?: string;
  } | null;
  attendees: {
    id: string;
    attendee_name: string;
    status: string;
    confirmation_code: string;
    details: { phone: string } | null;
    number_of_slots?: number;
  }[] | null;
};

type Cashout = {
  id: string;
  event_id: string;
  super_code: string;
  amount: number;
  bank_account_number: string;
  bank_name: string;
  account_name: string;
  status: "Review" | "Processed" | "Failed" | "Successful";
  temp_identifier?: string;
  created_at: string;
};

const codeSchema = z
  .string()
  .regex(/^\d{6}$/, { message: "Code must be exactly 6 digits" });

const ConfirmCheckin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [superCode, setSuperCode] = useState("");
  const [superCodeError, setSuperCodeError] = useState<string | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [cyclingEvent, setCyclingEvent] = useState<CyclingEvent | null>(null);
  const [isCyclingEvent, setIsCyclingEvent] = useState(false);
  const [cashout, setCashout] = useState<Cashout | null>(null);
  const [matchNotFound, setMatchNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [playerStatuses, setPlayerStatuses] = useState<
    { id: string; status: string; checkinCode: string }[]
  >([]);
  const [checkinCodes, setCheckinCodes] = useState<{ [key: string]: string }>({});
  const [checkinCodeErrors, setCheckinCodeErrors] = useState<{
    [key: string]: string | null;
  }>({});
  const [tempIdentifier] = useState(uuidv4());
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [recentSuperCodes, setRecentSuperCodes] = useState<string[]>([]);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  useEffect(() => {
    const fetchUserId = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (session.session) {
        setUserId(session.session.user.id);
      } else {
        setUserId(null);
      }
    };
    fetchUserId();
  }, []);

  const resetState = () => {
    setMatch(null);
    setCyclingEvent(null);
    setIsCyclingEvent(false);
    setCashout(null);
    setMatchNotFound(false);
    setPlayerStatuses([]);
    setCheckinCodes({});
    setCheckinCodeErrors({});
    setError(null);
  };

  const fetchMatch = async () => {
    const validation = codeSchema.safeParse(superCode);
    if (!validation.success) {
      setSuperCodeError(validation.error.errors[0].message);
      setMatchNotFound(false);
      resetState();
      return;
    }
    setSuperCodeError(null);
    setMatchNotFound(false);
    setLoading(true);
    try {
      if (isCyclingEvent) {
        // Fetch cycling event data
        const { data, error } = await supabase
          .from("cycling_events")
          .select(`
            id, slug, title, event_date, event_time, event_start_time, event_end_time, total_slots, host_name, supercode, is_paid, price, cancellation_status, status,
            start_landmark:landmarks(name, state),
            attendees:cycling_attendees(id, attendee_name, attendee_phone, status, confirmation_code, details, number_of_slots)
          `)
          .eq("supercode", superCode)
          .single();

        if (error) throw error;

        if (!data) {
          setMatchNotFound(true);
          resetState();
          toast({
            title: "Event Not Found",
            description: `No cycling event found with super code ${superCode}. Please check the code and try again.`,
            variant: "destructive",
          });
          return;
        }

        if (userId) {
          const { data: walletData, error: walletError } = await supabase
            .from("wallets")
            .select("balance")
            .eq("organizer_id", userId)
            .single();

          if (!walletError && walletData) {
            setWalletBalance(walletData.balance);
          }
        }

        const cyclingData: CyclingEvent = {
          ...data,
          super_code: data.supercode,
          event_time: data.event_time || data.start_time || "00:00:00",
          total_slots: data.total_slots || data.max_attendees || 0,
          location: data.start_landmark
            ? {
                name: data.start_landmark.name ?? "Unknown Location",
                city: data.start_landmark.state ?? "Unknown City",
              }
            : null,
          attendees: Array.isArray(data.attendees) ? data.attendees.map(attendee => ({
            ...attendee,
            details: attendee.details || { phone: attendee.attendee_phone || "N/A" },
          })) : [],
          cancellation_status: data.cancellation_status ?? false,
          status: data.status ?? "upcoming",
        };

        setCyclingEvent(cyclingData);
        setPlayerStatuses(
          (cyclingData.attendees || []).map((attendee) => ({
            id: attendee.id,
            status: attendee.status,
            checkinCode: "",
          }))
        );

        try {
          const { data: cashoutData, error: cashoutError } = await supabase
            .from("cashouts")
            .select("*")
            .eq("super_code", superCode)
            .eq("event_id", cyclingData.id)
            .eq("temp_identifier", tempIdentifier)
            .maybeSingle();

          if (cashoutError) {
            if (
              cashoutError.code === "42703" &&
              cashoutError.message.includes("temp_identifier")
            ) {
              console.warn(
                "temp_identifier column not found in cashouts table. Please run the migration to add this column."
              );
              setCashout(null);
              toast({
                title: "Warning",
                description:
                  "Cashout information is unavailable due to a missing database column. Please contact support.",
                variant: "default",
              });
            } else {
              throw cashoutError;
            }
          } else {
            setCashout(cashoutData);
          }
        } catch (cashoutError: any) {
          console.error("Error fetching cashout", cashoutError.message);
          setCashout(null);
          toast({
            title: "Error",
            description: "Failed to fetch cashout information. Please try again later.",
            variant: "destructive",
          });
        }

        if (cyclingData.event_end_time && isPast(new Date(cyclingData.event_end_time))) {
          const updates =
            cyclingData.attendees
              ?.filter((p) => p.status === "registered" && p.status !== "checked_in")
              .map((p) =>
                supabase
                  .from("cycling_attendees")
                  .update({
                    status: "absent",
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", p.id)
              ) || [];

          await Promise.all(updates);
        }
      } else {
        // Fetch match data
        const { data, error } = await supabase
          .from("matches")
          .select(`
            id, slug, title, match_date, match_time, match_start_time, match_end_time, total_slots, organizer_name, super_code, is_paid, price, cancellation_status, status,
            venue:venues(name, city),
            players(id, player_name, status, confirmation_code, details, number_of_slots)
          `)
          .eq("super_code", superCode)
          .single();

        if (error) throw error;

        if (!data) {
          setMatchNotFound(true);
          resetState();
          toast({
            title: "Match Not Found",
            description: `No match found with super code ${superCode}. Please check the code and try again.`,
            variant: "destructive",
          });
          return;
        }

        if (userId) {
          const { data: walletData, error: walletError } = await supabase
            .from("wallets")
            .select("balance")
            .eq("organizer_id", userId)
            .single();

          if (!walletError && walletData) {
            setWalletBalance(walletData.balance);
          }
        }

        const matchData: Match = {
          ...data,
          venue: data.venue
            ? {
                name: data.venue.name ?? "Unknown Venue",
                city: data.venue.city ?? "Unknown City",
              }
            : null,
          players: Array.isArray(data.players) ? data.players : [],
          cancellation_status: data.cancellation_status ?? false,
          status: data.status ?? "upcoming",
        };

        setMatch(matchData);
        setPlayerStatuses(
          (matchData.players || []).map((player) => ({
            id: player.id,
            status: player.status,
            checkinCode: "",
          }))
        );

        try {
          const { data: cashoutData, error: cashoutError } = await supabase
            .from("cashouts")
            .select("*")
            .eq("super_code", superCode)
            .eq("match_id", matchData.id)
            .eq("temp_identifier", tempIdentifier)
            .maybeSingle();

          if (cashoutError) {
            if (
              cashoutError.code === "42703" &&
              cashoutError.message.includes("temp_identifier")
            ) {
              console.warn(
                "temp_identifier column not found in cashouts table. Please run the migration to add this column."
              );
              setCashout(null);
              toast({
                title: "Warning",
                description:
                  "Cashout information is unavailable due to a missing database column. Please contact support.",
                variant: "default",
              });
            } else {
              throw cashoutError;
            }
          } else {
            setCashout(cashoutData);
          }
        } catch (cashoutError: any) {
          console.error("Error fetching cashout", cashoutError.message);
          setCashout(null);
          toast({
            title: "Error",
            description: "Failed to fetch cashout information. Please try again later.",
            variant: "destructive",
          });
        }

        if (matchData.match_end_time && isPast(new Date(matchData.match_end_time))) {
          const updates =
            matchData.players
              ?.filter((p) => p.status === "registered" && p.status !== "checked_in")
              .map((p) =>
                supabase
                  .from("players")
                  .update({
                    status: "absent",
                    player_status: "Absent",
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", player_id)
              ) || [];

          await Promise.all(updatesToPlayers);
        }
      }
    } catch (error: any) {
      console.error("Error fetching event", error.message, error.details || error);
      setMatchNotFound(true);
      resetState();
      toast({
        title: "Error",
        description: error.message.includes("0 rows")
          ? `No event found with super code ${superCode}'. Please try again.`
          : "An error occurred while fetching the event. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
};

  const isEventPast = () => {
    if (isCyclingEvent && cyclingEvent) {
      return isPast(new Date(`${cyclingEvent.event_date}T${cyclingEvent.event_time}`));
    }
    if (match) {
      return isPast(new Date(`${match.match_date}T${match.match_time}`));
    }
    return false;
  };

  const canConfirmAttendees = () => {
    if (isCyclingEvent && cyclingEvent) {
      if (cyclingEvent.cancellation_status || isEventPast()) return false;
      return !!cyclingEvent.attendees?.length;
    }
    if (!match || match.cancellation_status || isEventPast()) return false;
    return !!match.players?.length;
  };

  const handleCancelEvent = async () => {
    if (isCyclingEvent && cyclingEvent) {
      if (cyclingEvent.cancellation_status) return;

      const eventDateTime = new Date(`${cyclingEvent.event_date}T${cyclingEvent.event_time}`);
      const now = new Date();
      const timeToStartMinutes = differenceInMinutes(eventDateTime, now);
      if (timeToStartMinutes <= 0) {
        toast({
          title: "Error",
          description: "Cannot cancel event after it has started.",
          variant: "destructive",
        });
        setIsCancelDialogOpen(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = eventError } = await supabase
        .from("cycling_events")
        .update({
          status: "cancelled",
          cancellation_status: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", cyclingEvent.id);

        if (eventError) throw eventError;

        const { error: attendeesError } = await supabase
        .from("cycling_attendees")
        .update({
          status: "canceled",
          cancellation_status: true,
          updated_at: new Date().toISOString(),
        })
        .eq("event_id", cyclingEvent.id);

        if (attendeesError) throw attendeesError;

        toast({
          title: "Success',
          description: 'Cycling event canceled successfully.',
        });
        await fetchMatch();
      } catch (error: any) {
        console.error('Error cancelling cycling event', error);
        toast({
          title: 'Error',
          description: 'Failed to cancel cycling event. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
        setIsCancelDialogOpen(false);
      }
    } else if (match && !match.cancellation_status) {
      const matchDateTime = new Date(`${match.match_date}T${match.match_time}`);
      const now = new Date();
      const timeToStartMinutes = differenceInMinutes(matchDateTime, now);
      if (timeToStartMinutes <= 0) {
        toast({
          title: 'Error',
          description: 'Cannot cancel match after it has started.',
          variant: 'destructive',
        });
        setIsCancelDialogOpen(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = matchError } = await supabase
        .from('matches')
        .update({
          match_status: 'canceled',
          cancellation_status: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', match.id);

        if (matchError) throw matchError;

        const { error: playersError } = await supabase
          .from('players')
          .update({
            player_status: 'canceled',
            cancellation_status: true,
            player_status: 'Absent',
            updated_at: new Date().toISOString(),
          })
          .eq('match_id', match.id);

        if (playersError) throw playersError;

        toast({
          title: 'Success',
          description: 'Match canceled successfully.',
        });
        await fetchMatch();
      } catch (error: any) {
        console.error('Error cancelling match', error);
        toast({
          title: 'Error',
          description: 'Failed to cancel match.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
        setIsCancelDialogOpen(false);
      }
    }
  };

  useEffect(() => {
    resetState();
    if (superCode && codeSchema.safeParse(superCode).success) {
      fetchMatch();
    }
  }, [superCode, isCyclingEvent]);

  useEffect(() => {
    if (isCyclingEvent && cyclingEvent?.id) {
      const subscription = supabase
        .channel(`attendees_cycling_${cyclingEvent.id}`)
        .onChange(
          'postgres_changes',
          {
            event: 'changed',
            schema: 'public',
            table: 'cycling_attendees',
            filter: `event_id=eq-${cyclingEvent.id}`,
          },
          (payload) => {
            console.log('Attendee update received', payload);
            fetchMatch();
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    } else if (match?.id) {
      const subscription = supabase
        .channel(`players_match_${match.id}`)
        .onChange(
          'postgres_changes',
          {
            event: 'changed',
            schema: 'public',
            table_name: 'players',
            filter: `match_id=match-${match.id}`,
          },
          (payload) => {
            console.log('Player updated', payload);
            fetchMatch();
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [match?.id, cyclingEvent?.id, isCyclingEvent]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="sticky top-0 dark:bg-gray-50 bg-green-500 text-white">
        <div className="p-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-white hover:text-gray-300"
          >
            <Arrow size={18} className="mr-2" />
            Back
          </Button>
          <h2 className="text-xl font-bold">Manage Events</h2>
          <div className="w-10"></div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4">
        <MatchCodeInput
          superCode={superCode}
          setSuperCode={setSuperCode}
          superCodeError={superCodeError}
          setSuperCodeError={setSuperCodeError}
          setMatchNotFound={setMatchNotFound}
          loading={loading}
          setLoading={setLoading}
          fetchMatch={fetchMatch}
          userId={userId}
          recentSuperCodes={recentSuperCodes}
          setRecentSuperCodes={setRecentSuperCodes}
          setIsCyclingEvent={setIsCyclingEvent}
          setCyclingEvent={setCyclingEvent}
        />

        {loading && (
          <div className="flex items-center py-4">
            <Loader className="animate-spin text-green-600" size={24} />
            <span className="ml-3 text-gray-700">Loading...</span>
          </div>
        )}

        {error && !loading && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 text-center">
            <AlertCircle
              size={36}
              className="text-red-600 dark:text-red-400 mx-auto"
            />
            <h2 className="text-lg font-semibold error-text-red-600 dark:text-red-400">
              Error
            </h2>
            <p className="mt-2 text-gray-500 dark:text-gray-400">{error}</p>
          </div>
        )}

        {matchNotFound && !loading && !error && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-4">
            <AlertCircle
              size={36}
              className="text-red-400 dark:text-red-400 text-center"
            />
            <h2 className="text-lg font-semibold text-center text-red-600 dark:text-red-400">
              Event Not Found
            </h2>
            <p className="mt-2 text-center text-gray-600 dark:text-gray-400">
              No event found with super code <strong>{superCode}</strong>.
            </p>
            </div>
          </div>
        )}

        {(match || cyclingEvent) && !error && (
          <Tabs defaultValue="details" className="w-full">
            <div className="sticky top-4 z-10">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
                <TabsList className="w-full grid grid-cols-2 bg-gray-100 dark:bg-gray-700 rounded-lg h-12">
                  <TabsTrigger
                    value="details"
                    className="active:bg-green-500 active:text-white py-2 text-sm font-semibold rounded-lg"
                  >
                    Details
                  </TabsTrigger>
                  <TabsTrigger
                    value="manage"
                    className="active:bg-green-500 active:text-white py-2 text-sm font-semibold rounded-lg"
                  >
                    Manage
                  </TabsTrigger>
                  <TabsTrigger
                    value="cashout"
                    className="active:bg-green-500 active:text-white py-2 text-sm font-semibold rounded-lg"
                  >
                    Cashout
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>
            <TabsContent value="details" className="mt-0">
              <div className="max-w-4xl mx-auto">
                {isCyclingEvent ? (
                  <CyclingDetails
                    event={cyclingEvent}
                    cashout={cashout}
                    handleCancel={() => setIsCancelDialogOpen(true)}
                    loading={loading}
                    isEventPast={isEventPast}
                    walletBalance={walletBalance || 0}
                    />
                ) : (
                  <MatchDetails
                    match={match}
                    cashout={cashout}
                    handleCancelMatch={() => setIsCancelDialogOpen(true)}
                    loading={loading}
                    isMatchPast={isEventPast}
                    />
                )}
              </div>
            </TabsContent>
            <TabsContent value="manage" className="mt-0">
              <div className="max-w-4xl mx-auto">
                {isCyclingEvent ? (
                  <AttendeesManagement
                    event={cyclingEvent}
                    tempIdentifier={tempIdentifier}
                    attendeeStatuses={playerStatuses}
                    setAttendeeStatuses={setPlayerStatuses}
                    checkinCodes={checkinCodes}
                    setCheckinCodes={setCheckinCodes}
                    checkinCodeErrors={checkinCodeErrors}
                    setCheckinCodeErrors={setCheckinCodeErrors}
                    fetchEvent={fetchMatch}
                    loading={loading}
                    setLoading={setLoading}
                    isEventPast={isEventPast}
                    canConfirmAttendees={canConfirmAttendees()}
                    handleCancel={() => setIsCancelDialogOpen(true)}
                    navigate={navigate}
                    />
                ) : (
                  <PlayerManagement
                    match={match}
                    tempIdentifier={temp_id}
                    playerStatuses={playerStatuses}
                    setPlayerStatus={setPlayerStatuses}
                    checkinCodes={checkinCodes}
                    setCheckinCodes={setCheckinCodes}
                    checkinCodeErrors={checkinCodeErrors}
                    setCheckinCodeErrors={setCheckinCodeErrors}
                    fetchMatch={fetchMatch}
                    loading={loading}
                    setLoading={setLoading}
                    isMatchPast={isPast}
                    canConfirmPlayers={canConfirmPlayers()}
                    handleCancelMatch={() => setIsCancelDialogOpen(true)}
                    navigate={navigate}
                    />
                )}
              </div>
            </TabsContent>
            <TabsContent value="cashout" className="mt-0">
              <div className="max-w-4xl mx-auto">
                {isCyclingEvent ? (
                  <HostCashout event={cyclingEvent} tempIdentifier={tempIdentifier} />
                ) : (
                  <OrganizerCashout match={match} tempIdentifier={tempIdentifier} />
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>

      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-center">
              Confirm {isCyclingEvent ? 'Event' : 'Match'} Cancellation
            </DialogTitle>
            <DialogDescription className="text-sm text-center mt-2 text-gray-600">
              Are you sure you want to cancel this {isCyclingEvent ? 'event' : 'match'}?
              This action cannot be undone, and {isCyclingEvent ? 'attendees' : 'players'} will be notified.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <div className="mt-6 flex items-center justify-between gap-2">
              <Button
                variant="outline"
                onClick={() => setIsCancelDialogOpen(false)}
                className="rounded-full px-2 py-1"
                >
                Cancel
              </Button>
              <Button
                onClick={() => handleCancelEvent}
                className="bg-red-500 hover:bg-red-600 text-white rounded-full px-2 py-1"
                disabled={loading}
                >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </span>
                ) : (
                    `Yes, Cancel ${isCyclingEvent ? 'Event' : 'Match'}`
                  )}
              </Button>
            </div>
          </DialogFooter>
      </DialogContent>
      <Navbar />
    </div>
  );
};

export default ConfirmCheckin;
