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
import CyclingCodeInput from "@/components/CyclingCodeInput";
import MatchDetails from "@/components/MatchDetails";
import PlayerManagement from "@/components/PlayerManagement";
import OrganizerCashout from "@/components/matchManagement/OrganizerCashout";
import CyclingDetails from "@/components/CyclingDetails";
import AttendeesManagement from "@/components/AttendeesManagement";
import HostCashout from "@/components/HostCashout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Toggle } from "@/components/ui/toggle";

type Match = {
  id: string;
  slug: string;
  title: string;
  match_date: string;
  match_time: string;
  match_start_time?: string | null;
  match_end_time?: string | null;
  total_slots: number;
  organizer_id: string;
  organizer_name: string;
  super_code?: string | null;
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
  id_uuid: string;
  slug: string;
  title: string;
  event_date: string;
  start_time: string;
  max_attendees: number;
  host_id: string;
  host_name: string;
  host_phone: string;
  supercode: string;
  is_free: boolean;
  price?: number;
  cancellation_status: boolean;
  status: string;
  start_landmark_id: string;
  location: {
    name?: string;
    city?: string;
  } | null;
  cycling_attendees: {
    id_uuid: string;
    attendee_name: string;
    attendee_phone: string;
    status: "registered" | "checked_in" | "absent";
    confirmation_code: string;
    number_of_slots?: number;
  }[] | null;
};

type Cashout = {
  id: string;
  cycling_event_id_uuid: string;
  supercode: string;
  total_amount_paid: number;
  bank_account_number: string;
  bank_name: string;
  account_name: string;
  status: "Review" | "Processed" | "Failed" | "Successful";
  temp_identifier?: string;
  host_id: string;
  created_at: string;
  updated_at: string;
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
  const [eventNotFound, setEventNotFound] = useState(false);
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
  const [recentSuperCodes, setRecentSuperCodes] = useState<string[]>([]);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  const resetState = () => {
    setMatch(null);
    setCyclingEvent(null);
    setCashout(null);
    setEventNotFound(false);
    setPlayerStatuses([]);
    setCheckinCodes({});
    setCheckinCodeErrors({});
    setError(null);
    setWalletBalance(null);
  };

  const fetchEvent = async () => {
    const validation = codeSchema.safeParse(superCode);
    if (!validation.success) {
      setSuperCodeError(validation.error.errors[0].message);
      setEventNotFound(false);
      resetState();
      return;
    }
    setSuperCodeError(null);
    setEventNotFound(false);
    setLoading(true);
    try {
      if (isCyclingEvent) {
        const { data, error } = await supabase
          .from("cycling_events")
          .select(`
            id_uuid, slug, title, event_date, start_time, max_attendees, host_id, host_name, host_phone, supercode, is_free, price, status, start_landmark_id,
            start_landmark:landmarks!cycling_events_start_landmark_id_fkey(name, state),
            cycling_attendees!cycling_attendees_cycling_event_id_uuid_fkey(id_uuid, attendee_name, attendee_phone, status, confirmation_code, number_of_slots, payment_status, is_own_bike, is_rental_bike)
          `)
          .eq("supercode", superCode)
          .single();

        if (error) throw error;

        if (!data) {
          setEventNotFound(true);
          resetState();
          toast({
            title: "Event Not Found",
            description: `No cycling event found with super code ${superCode}. Please check the code and try again.`,
            variant: "destructive",
          });
          return;
        }

        const cyclingData: CyclingEvent = {
          ...data,
          location: data.start_landmark
            ? {
                name: data.start_landmark.name ?? "Unknown Location",
                city: data.start_landmark.state ?? "Unknown City",
              }
            : null,
          cycling_attendees: Array.isArray(data.cycling_attendees)
            ? data.cycling_attendees.map(attendee => ({
                ...attendee,
                status: attendee.status || "registered",
              }))
            : [],
          cancellation_status: data.cancellation_status ?? false,
          status: data.status ?? "upcoming",
        };

        setCyclingEvent(cyclingData);
        setPlayerStatuses(
          (cyclingData.cycling_attendees || []).map((attendee) => ({
            id: attendee.id_uuid,
            status: attendee.status,
            checkinCode: "",
          }))
        );

        if (cyclingData.host_id) {
          const { data: walletData, error: walletError } = await supabase
            .from("cycling_wallets")
            .select("total_earned, total_paid_out, balance")
            .eq("host_id", cyclingData.host_id)
            .maybeSingle();

          if (walletError) {
            console.error("Error fetching wallet balance:", walletError);
            setWalletBalance(0);
          } else if (walletData?.total_earned !== undefined && walletData?.total_paid_out !== undefined) {
            setWalletBalance(walletData.total_earned - walletData.total_paid_out);
          } else {
            setWalletBalance(walletData?.balance ?? 0);
          }
        }

        try {
          const { data: cashoutData, error: cashoutError } = await supabase
            .from("cycling_cashouts")
            .select("*")
            .eq("supercode", superCode)
            .eq("cycling_event_id_uuid", cyclingData.id_uuid)
            .eq("temp_identifier", tempIdentifier)
            .maybeSingle();

          if (cashoutError) {
            console.error("Error fetching cashout:", cashoutError);
            setCashout(null);
            toast({
              title: "Error",
              description: "Failed to fetch cashout information. Please try again later.",
              variant: "destructive",
            });
          } else {
            setCashout(cashoutData);
          }
        } catch (cashoutError: any) {
          console.error("Error fetching cashout:", cashoutError.message);
          setCashout(null);
          toast({
            title: "Error",
            description: "Failed to fetch cashout information. Please try again later.",
            variant: "destructive",
          });
        }

        if (cyclingData.event_date && cyclingData.start_time) {
          const eventEndTime = new Date(`${cyclingData.event_date}T${cyclingData.start_time}`);
          eventEndTime.setHours(eventEndTime.getHours() + 1);
          if (isPast(eventEndTime)) {
            const updates =
              cyclingData.cycling_attendees
                ?.filter((p) => p.status === "registered" && p.status !== "checked_in")
                .map((p) =>
                  supabase
                    .from("cycling_attendees")
                    .update({
                      status: "absent",
                      updated_at: new Date().toISOString(),
                    })
                    .eq("id_uuid", p.id_uuid)
                ) || [];
            await Promise.all(updates);
          }
        }
      } else {
        const { data, error } = await supabase
          .from("matches")
          .select(`
            id, slug, title, match_date, match_time, match_start_time, match_end_time, total_slots, organizer_id, organizer_name, super_code, is_paid, price, cancellation_status, status,
            venue:venues(name, city),
            players(id, player_name, status, confirmation_code, details, number_of_slots)
          `)
          .eq("super_code", superCode)
          .single();

        if (error) throw error;

        if (!data) {
          setEventNotFound(true);
          resetState();
          toast({
            title: "Match Not Found",
            description: `No match found with super code ${superCode}. Please check the code and try again.`,
            variant: "destructive",
          });
          return;
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

        if (matchData.organizer_id) {
          const { data: walletData, error: walletError } = await supabase
            .from("wallets")
            .select("balance")
            .eq("organizer_id", matchData.organizer_id)
            .maybeSingle();

          if (walletError) {
            console.error("Error fetching wallet balance:", walletError);
            setWalletBalance(0);
          } else {
            setWalletBalance(walletData?.balance ?? 0);
          }
        }

        try {
          const { data: cashoutData, error: cashoutError } = await supabase
            .from("cashouts")
            .select("*")
            .eq("super_code", superCode)
            .eq("match_id", matchData.id)
            .eq("temp_identifier", tempIdentifier)
            .maybeSingle();

          if (cashoutError) {
            console.error("Error fetching cashout:", cashoutError);
            setCashout(null);
            toast({
              title: "Error",
              description: "Failed to fetch cashout information. Please try again later.",
              variant: "destructive",
            });
          } else {
            setCashout(cashoutData);
          }
        } catch (cashoutError: any) {
          console.error("Error fetching cashout:", cashoutError.message);
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
                  .eq("id", p.id)
              ) || [];
          await Promise.all(updates);
        }
      }
    } catch (error: any) {
      console.error("Error fetching event:", error.message, error.details || error);
      setEventNotFound(true);
      resetState();
      toast({
        title: "Error",
        description: error.message.includes("0 rows")
          ? `No event found with super code ${superCode}. Please try again.`
          : "An error occurred while fetching the event. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isEventPast = () => {
    if (isCyclingEvent && cyclingEvent) {
      return isPast(new Date(`${cyclingEvent.event_date}T${cyclingEvent.start_time}`));
    }
    if (match) {
      return isPast(new Date(`${match.match_date}T${match.match_time}`));
    }
    return false;
  };

  const canConfirmAttendees = () => {
    if (isCyclingEvent && cyclingEvent) {
      if (cyclingEvent.cancellation_status || isEventPast()) return false;
      return !!cyclingEvent.cycling_attendees?.length;
    }
    if (!match || match.cancellation_status || isEventPast()) return false;
    return !!match.players?.length;
  };

  const handleCancelEvent = async () => {
    if (isCyclingEvent && cyclingEvent) {
      if (cyclingEvent.cancellation_status) return;

      const eventDateTime = new Date(`${cyclingEvent.event_date}T${cyclingEvent.start_time}`);
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
        const { error: eventError } = await supabase
          .from("cycling_events")
          .update({
            status: "cancelled",
            cancellation_status: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id_uuid", cyclingEvent.id_uuid);

        if (eventError) throw eventError;

        const { error: attendeesError } = await supabase
          .from("cycling_attendees")
          .update({
            status: "canceled",
            updated_at: new Date().toISOString(),
          })
          .eq("cycling_event_id_uuid", cyclingEvent.id_uuid);

        if (attendeesError) throw attendeesError;

        toast({
          title: "Success",
          description: "Cycling event canceled successfully.",
        });
        await fetchEvent();
      } catch (error: any) {
        console.error("Error cancelling cycling event:", error);
        toast({
          title: "Error",
          description: "Failed to cancel cycling event. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        setIsCancelDialogOpen(false);
      }
    } else if (match && !match.cancellation_status) {
      const matchDateTime = new Date(`${match.match_date}T${match.match_time}`);
      const now = new Date();
      const timeToStart = differenceInMinutes(matchDateTime, now);
      if (timeToStart <= 0) {
        toast({
          title: "Error",
          description: "Cannot cancel match after it has started.",
          variant: "destructive",
        });
        setIsCancelDialogOpen(false);
        return;
      }

      setLoading(true);
      try {
        const { error: matchError } = await supabase
          .from("matches")
          .update({
            status: "canceled",
            cancellation_status: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", match.id);

        if (matchError) throw matchError;

        const { error: playersError } = await supabase
          .from("players")
          .update({
            status: "canceled",
            player_status: "Absent",
            updated_at: new Date().toISOString(),
          })
          .eq("match_id", match.id);

        if (playersError) throw playersError;

        toast({
          title: "Success",
          description: "Match canceled successfully.",
        });
        await fetchEvent();
      } catch (error: any) {
        console.error("Error cancelling match:", error);
        toast({
          title: "Error",
          description: "Failed to cancel match.",
          variant: "destructive",
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
      fetchEvent();
    }
  }, [superCode, isCyclingEvent]);

  useEffect(() => {
    if (isCyclingEvent && cyclingEvent?.id_uuid) {
      const subscription = supabase
        .channel(`attendees_cycling_${cyclingEvent?.id_uuid}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "cycling_attendees",
            filter: `cycling_event_id_uuid=eq.${cyclingEvent?.id_uuid}`,
          },
          (payload) => {
            console.log("Attendee update received", payload);
            fetchEvent();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    } else if (match?.id) {
      const subscription = supabase
        .channel(`players_match_${match.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "players",
            filter: `match_id=eq.${match.id}`,
          },
          (payload) => {
            console.log("Player update received", payload);
            fetchEvent();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [match?.id, cyclingEvent?.id_uuid, isCyclingEvent]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="sticky top-0 z-50 dark:bg-gray-50 bg-green-500 text-white">
        <div className="p-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-white hover:text-gray-300"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <h2 className="text-xl font-bold">Manage Events</h2>
          <div className="w-10"></div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 mt-4 pb-24">
        {superCode.length < 6 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Select Event Type
            </h2>
            <div className="flex gap-4">
              <Toggle
                pressed={!isCyclingEvent}
                onPressedChange={() => {
                  setIsCyclingEvent(false);
                  setSuperCode("");
                  resetState();
                }}
                className="flex-1 py-2 text-center bg-gray-100 dark:bg-gray-700 rounded-lg data-[state=on]:bg-green-500 data-[state=on]:text-white"
              >
                Match
              </Toggle>
              <Toggle
                pressed={isCyclingEvent}
                onPressedChange={() => {
                  setIsCyclingEvent(true);
                  setSuperCode("");
                  resetState();
                }}
                className="flex-1 py-2 text-center bg-gray-100 dark:bg-gray-700 rounded-lg data-[state=on]:bg-green-500 data-[state=on]:text-white"
              >
                Cycling Event
              </Toggle>
            </div>
          </div>
        )}

        {isCyclingEvent ? (
          <CyclingCodeInput
            superCode={superCode}
            setSuperCode={setSuperCode}
            superCodeError={superCodeError}
            setSuperCodeError={setSuperCodeError}
            setEventNotFound={setEventNotFound}
            loading={loading}
            setLoading={setLoading}
            fetchEvent={fetchEvent}
            recentSuperCodes={recentSuperCodes}
            setRecentSuperCodes={setRecentSuperCodes}
            setCyclingEvent={setCyclingEvent}
          />
        ) : (
          <MatchCodeInput
            superCode={superCode}
            setSuperCode={setSuperCode}
            superCodeError={superCodeError}
            setSuperCodeError={setSuperCodeError}
            setMatchNotFound={setEventNotFound}
            loading={loading}
            setLoading={setLoading}
            fetchMatch={fetchEvent}
            recentSuperCodes={recentSuperCodes}
            setRecentSuperCodes={setRecentSuperCodes}
            setIsCyclingEvent={setIsCyclingEvent}
            setCyclingEvent={setCyclingEvent}
          />
        )}

        {loading && (
          <div className="flex items-center py-4">
            <Loader2 className="animate-spin text-green-600" size={24} />
            <span className="ml-3 text-gray-700">Loading...</span>
          </div>
        )}

        {error && !loading && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 text-center">
            <AlertCircle
              size={36}
              className="text-red-600 dark:text-red-400 mx-auto"
            />
            <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">
              Error
            </h2>
            <p className="mt-2 text-gray-500 dark:text-gray-400">{error}</p>
          </div>
        )}

        {eventNotFound && !loading && !error && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-4">
            <AlertCircle
              size={36}
              className="text-red-400 dark:text-red-400 mx-auto"
            />
            <h2 className="text-lg font-semibold text-center text-red-600 dark:text-red-400">
              Event Not Found
            </h2>
            <p className="mt-2 text-center text-gray-600 dark:text-gray-400">
              No {isCyclingEvent ? "cycling event" : "match"} found with super code "
              <strong>{superCode}</strong>".
            </p>
          </div>
        )}

        {(match || cyclingEvent) && !error && (
          <Tabs defaultValue="details" className="w-full">
            <div className="sticky top-16 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
              <TabsList className="w-full grid grid-cols-3 bg-gray-100 dark:bg-gray-700 rounded-lg h-12">
                <TabsTrigger
                  value="details"
                  className="data-[state=active]:bg-green-500 data-[state=active]:text-white py-2 text-sm font-semibold rounded-lg"
                >
                  Details
                </TabsTrigger>
                <TabsTrigger
                  value="manage"
                  className="data-[state=active]:bg-green-500 data-[state=active]:text-white py-2 text-sm font-semibold rounded-lg"
                >
                  Manage
                </TabsTrigger>
                <TabsTrigger
                  value="cashout"
                  className="data-[state=active]:bg-green-500 data-[state=active]:text-white py-2 text-sm"
                >
                  Cashout
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="details" className="mt-0 pb-8">
              <div className="max-w-4xl mx-auto">
                {isCyclingEvent ? (
                  <CyclingDetails
                    event={cyclingEvent}
                    cashout={cashout}
                    handleCancel={() => setIsCancelDialogOpen(true)}
                    loading={loading}
                    eventPast={isEventPast()}
                    walletBalance={walletBalance}
                  />
                ) : (
                  <MatchDetails
                    match={match}
                    cashout={cashout}
                    handleCancel={() => setIsCancelDialogOpen(true)}
                    loading={loading}
                    isMatchPast={isEventPast()}
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
                    fetchEvent={fetchEvent}
                    loading={loading}
                    setLoading={setLoading}
                    isEventPast={isEventPast()}
                    canConfirmAttendees={canConfirmAttendees()}
                    navigate={navigate}
                  />
                ) : (
                  <PlayerManagement
                    match={match}
                    tempIdentifier={tempIdentifier}
                    playerStatuses={playerStatuses}
                    setPlayerStatuses={setPlayerStatuses}
                    checkinCodes={checkinCodes}
                    setCheckinCodes={setCheckinCodes}
                    checkinCodeErrors={checkinCodeErrors}
                    setCheckinCodeErrors={setCheckinCodeErrors}
                    fetchMatch={fetchEvent}
                    loading={loading}
                    setLoading={setLoading}
                    isMatchPast={isEventPast()}
                    canConfirmPlayers={canConfirmAttendees()}
                    handleCancelMatch={() => setIsCancelDialogOpen(true)}
                    navigate={navigate}
                  />
                )}
              </div>
            </TabsContent>
            <TabsContent value="cashout" className="mt-0">
              <div className="max-w-4xl mx-auto">
                {isCyclingEvent ? (
                  <HostCashout
                    event={cyclingEvent}
                    tempIdentifier={tempIdentifier}
                  />
                ) : (
                  <OrganizerCashout
                    match={match}
                    tempIdentifier={tempIdentifier}
                  />
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}

        <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
          <DialogContent className="max-w-sm rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-center">
                Confirm {isCyclingEvent ? "Event" : "Match"} Cancellation
              </DialogTitle>
              <DialogDescription
                className="text-sm text-center mt-2 text-gray-600"
              >
                Are you sure you want to cancel this {isCyclingEvent ? "event" : "match"}?
                This action cannot be undone, and {isCyclingEvent ? "attendees" : "players"} will be notified.
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
                  onClick={handleCancelEvent}
                  className="bg-red-500 hover:bg-red-600 text-white rounded-full px-2 py-1"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="px-2">Processing...</span>
                    </>
                  ) : (
                    `Yes, Cancel ${isCyclingEvent ? "Event" : "Match"}`
                  )}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Navbar />
      </div>
    </div>
  );
};

export default ConfirmCheckin;
