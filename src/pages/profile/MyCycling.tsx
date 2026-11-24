import { useState, useEffect } from "react";
import ActivityCard, { activityStatus } from "@/components/sc/ActivityCard";
import ConfirmModal from "@/components/sc/ConfirmModal";
import { PageHeader, Segmented, formatTime12 } from "@/components/sc/ui";
import { Ban } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Bike, Calendar, MapPin, Copy } from "lucide-react";
import Navbar from "@/components/Navbar";
import { format, parse } from "date-fns";
import { utcToZonedTime } from "date-fns-tz";
import { DateTime } from "luxon";

import { BackButton } from "@/components/sc/ui";
import { PageSkeleton } from "@/components/sc/skeletons";
import { ViewTicketButton } from "@/components/sc/TicketCard";
import { FunEmpty } from "@/components/sc/ui";
import { Route as RouteIcon, Bike as BikeIcon } from "lucide-react";
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
  supercode?: string;
  host_name?: string;
  confirmation_code?: string;
  status?: string | null;
  attendee_id?: string | null;
  my_slots?: number | null;
  my_status?: string | null;
  end_landmark?: Landmark | null;
};

const MyCycling = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [hostedEvents, setHostedEvents] = useState<CyclingEvent[]>([]);
  const [joinedEvents, setJoinedEvents] = useState<CyclingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"hosting" | "riding">("hosting");
  const [cancelling, setCancelling] = useState<CyclingEvent | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (session.session) {
          setUserId(session.session.user.id);
        } else {
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
              supercode,
              host_name,
              status,
              attendees:cycling_attendees!cycling_attendees_cycling_event_id_uuid_fkey(id_uuid, number_of_slots, status),
              start_landmark:landmarks!cycling_events_start_landmark_id_fkey(name, state)
            )
          `)
          .eq("user_id", userId);

        if (hostedError) throw hostedError;

        const hosted = hostedData
          .map((item: any) => item.cycling_event)
          .filter((event: CyclingEvent | null) => event !== null);

        setHostedEvents(hosted);

        // Fetch joined events with confirmation code
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
              host_name,
              status,
              attendees:cycling_attendees!cycling_attendees_cycling_event_id_uuid_fkey(id_uuid),
              start_landmark:landmarks!cycling_events_start_landmark_id_fkey(name, state)
            ),
            attendee:cycling_attendees!user_joined_cycling_attendee_id_fkey(id_uuid, confirmation_code, number_of_slots, status)
          `)
          .eq("user_id", userId);

        if (joinedError) throw joinedError;

        const joined = joinedData
          .map((item: any) => ({
            ...item.cycling_event,
            confirmation_code: item.attendee?.confirmation_code,
            attendee_id: item.attendee?.id_uuid ?? null,
            my_slots: item.attendee?.number_of_slots ?? 1,
            my_status: item.attendee?.status ?? null,
          }))
          .filter((event: any) => event && event.id_uuid);

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

  const formatMatchDateTime = (date: string, time: string) => {
    try {
      // Parse event_date (e.g., '2025-06-20 00:00:00+00') to extract YYYY-MM-DD
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) throw new Error("Invalid date");
      const dateStr = format(dateObj, "yyyy-MM-dd");

      // Parse start_time (e.g., '07:00 AM') to HH:mm format
      const parsedTime = parse(time, "h:mm a", new Date());
      if (isNaN(parsedTime.getTime())) throw new Error("Invalid time");
      const timeStr = format(parsedTime, "HH:mm");

      // Combine date and time for UTC parsing
      const isoDateTime = `${dateStr}T${timeStr}:00Z`;
      const zonedDate = utcToZonedTime(new Date(isoDateTime), "Africa/Lagos");
      return {
        dateStr: format(zonedDate, "EEE, dd MMM yyyy"),
        timeStr: format(zonedDate, "h:mm a"),
      };
    } catch (err) {
      console.error("Date/time parsing error:", err);
      return { dateStr: "Invalid Date", timeStr: "Invalid Time" };
    }
  };

  const getMatchStatus = (matchDate: string, startTime: string) => {
    try {
      const dateObj = new Date(matchDate);
      if (isNaN(dateObj.getTime())) throw new Error("Invalid date");
      const dateStr = format(dateObj, "yyyy-MM-dd");

      // Parse start_time (e.g., '07:00 AM') to HH:mm
      const parsedTime = parse(startTime, "h:mm a", new Date());
      if (isNaN(parsedTime.getTime())) throw new Error("Invalid time");
      const timeStr = format(parsedTime, "HH:mm");

      const isoDateTime = `${dateStr}T${timeStr}:00Z`;
      const now = DateTime.now().setZone("Africa/Lagos");
      const matchDateTime = DateTime.fromISO(isoDateTime, { zone: "utc" }).setZone("Africa/Lagos");
      const endDateTime = matchDateTime.plus({ hours: 1 }); // Assume 1-hour duration

      if (now < matchDateTime) return { text: "Upcoming", className: "bg-blue-100 text-blue-800" };
      if (now.hasSame(matchDateTime, "day") && now < matchDateTime) return { text: "Today", className: "bg-sc-green-bg text-sc-green-dark" };
      if (now >= matchDateTime && now <= endDateTime) return { text: "Live", className: "bg-sc-green-bg text-sc-green-dark" };
      return { text: "Passed", className: "bg-sc-soft text-sc-ink" };
    } catch {
      return { text: "Unknown", className: "bg-sc-soft text-sc-ink" };
    }
  };

  if (loading) {
    return (
      <PageSkeleton />
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex flex-col bg-sc-bg dark:bg-gray-900">
        <header className="px-5 pt-[max(env(safe-area-inset-top),1rem)] flex flex-col gap-3.5">
          <div className="pt-3 flex items-center justify-between min-h-11">
            <BackButton />
            <div className="flex gap-2"></div>
          </div>
          <h1 className="m-0 text-[32px] leading-[38px] font-extrabold tracking-[-0.03em]">My cycling</h1>
        </header>
        <div className="flex-grow overflow-y-auto">
          <div className="container mx-auto px-4 py-6">
            <p className="text-sm text-sc-ink3 dark:text-gray-400 p-4 text-center">
              Please log in to view your cycling events.
            </p>
            <Button
              className="mx-auto block px-4 py-2 bg-sc-green hover:brightness-95 text-sc-green-ink rounded-full font-bold"
              onClick={() => navigate("/auth")}
            >
              Log In
            </Button>
          </div>
        </div>
        <div className="pb-28">
          <Navbar />
        </div>
      </div>
    );
  }

  const rideTaken = (e: CyclingEvent) => (e.attendees || []).filter((a: any) => a.status !== "cancelled").reduce((n: number, a: any) => n + (Number(a.number_of_slots) || 1), 0);
  const list = tab === "hosting" ? hostedEvents : joinedEvents;
  const sorted = [...list].sort((x, y) => {
    const rank = (st: string) => (st === "Live" ? 0 : st === "Today" ? 1 : st === "Upcoming" ? 2 : 3);
    const sx = activityStatus(x.event_date, x.start_time, null, x.status === "cancelled", 3);
    const sy = activityStatus(y.event_date, y.start_time, null, y.status === "cancelled", 3);
    if (rank(sx) !== rank(sy)) return rank(sx) - rank(sy);
    return rank(sx) < 3 ? String(x.event_date).localeCompare(String(y.event_date)) : String(y.event_date).localeCompare(String(x.event_date));
  });

  const doCancel = async () => {
    if (!cancelling) return;
    const e = cancelling;
    try {
      if (tab === "hosting") {
        const { error } = await supabase.from("cycling_events").update({ status: "cancelled", updated_at: new Date().toISOString() } as any).eq("id_uuid", e.id_uuid);
        if (error) throw error;
        setHostedEvents((prev) => prev.map((x) => (x.id_uuid === e.id_uuid ? { ...x, status: "cancelled" } : x)));
        toast({ title: "Ride cancelled", description: "Riders can see the ride is off." });
      } else {
        if (e.attendee_id) {
          const { error } = await supabase.from("cycling_attendees").update({ status: "cancelled" } as any).eq("id_uuid", e.attendee_id);
          if (error) throw error;
        }
        // keep the record in My cycling, marked as left, so nothing disappears unexpectedly
        setJoinedEvents((prev) => prev.map((x) => (x.id_uuid === e.id_uuid ? { ...x, my_status: "cancelled" } : x)));
        toast({ title: "You left the ride", description: "Your spot is free for someone else." });
      }
    } catch (err: any) {
      toast({ title: "Could not cancel", description: err.message || "Please try again.", variant: "destructive" });
    } finally {
      setCancelling(null);
    }
  };

  const canCancel = (e: CyclingEvent) => {
    const m = String(e.start_time || "").match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!m) return false;
    let h = Number(m[1]);
    if (m[3]?.toUpperCase() === "PM" && h !== 12) h += 12;
    if (m[3]?.toUpperCase() === "AM" && h === 12) h = 0;
    const [y, mo, d] = String(e.event_date).slice(0, 10).split("-").map(Number);
    return new Date(y, mo - 1, d, h, Number(m[2])).getTime() - Date.now() > 60 * 60 * 1000;
  };

  return (
    <div className="min-h-screen flex flex-col bg-sc-bg text-sc-ink font-sans pb-32">
      <PageHeader back backTo="/profile" title="My cycling" subtitle="Rides you host and ride in" />
      <main className="px-5 pt-4 flex flex-col gap-3">
        <Segmented
          options={[
            { value: "hosting", label: `Hosting${hostedEvents.length ? ` (${hostedEvents.length})` : ""}` },
            { value: "riding", label: `Riding${joinedEvents.length ? ` (${joinedEvents.length})` : ""}` },
          ]}
          value={tab}
          onChange={(v) => setTab(v as "hosting" | "riding")}
        />
        {sorted.length === 0 ? (
          tab === "hosting" ? (
            <FunEmpty icon={RouteIcon} sport="cycling" title="No rides hosted yet" body="Lead the pack. Pick a landmark, set the distance and invite your crew." primary={{ label: "Host a ride", onClick: () => navigate("/host-cycling") }} />
          ) : (
            <FunEmpty icon={BikeIcon} sport="cycling" title="Your wheels are waiting" body="Rides you join appear here with your ticket. Find a group ride near you." primary={{ label: "Browse rides", onClick: () => navigate("/cycling-activities") }} />
          )
        ) : (
          sorted.map((event) => {
            const riding = tab === "riding";
            const cancelled = event.status === "cancelled" || (riding && event.my_status === "cancelled");
            const status = activityStatus(event.event_date, event.start_time, null, cancelled, 3);
            const upcoming = status === "Upcoming" || status === "Today";
            const place = event.start_landmark ? `${event.start_landmark.name}${event.start_landmark.state ? `, ${event.start_landmark.state}` : ""}` : null;
            const dateStr = new Date(`${String(event.event_date).slice(0, 10)}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
            return (
              <ActivityCard
                key={event.id_uuid}
                sport="cycling"
                title={event.title}
                date={String(event.event_date).slice(0, 10)}
                timeLabel={`Starts ${formatTime12(event.start_time)}`}
                place={place ? `Meet at ${place}` : null}
                status={status}
                codeLabel={riding ? "Your code" : "Super code"}
                code={riding ? event.confirmation_code : event.supercode}
                taken={riding ? undefined : rideTaken(event)}
                total={riding ? undefined : event.max_attendees}
                slotsLabel="Riders"
                extra={riding ? (
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-semibold text-sc-ink3">Your spots</span>
                    <span className="text-[15px] font-extrabold">{event.my_slots || 1}</span>
                  </span>
                ) : undefined}
                organiser={event.host_name || null}
                view={{ label: "View details", onClick: () => navigate(`/cycling/${event.slug}`) }}
                ticket={riding && event.confirmation_code ? (
                  <ViewTicketButton soft ticket={{
                    sport: "cycling",
                    kind: "Ride ticket",
                    title: event.title,
                    code: event.confirmation_code,
                    rows: [
                      { label: "Date", value: dateStr },
                      { label: "Starts", value: formatTime12(event.start_time) },
                      { label: "Meet at", value: place || "See ride details" },
                      { label: "Host", value: event.host_name || "SportCliq host" },
                    ],
                    footnote: "The host scans this QR code on ride day.",
                  }} />
                ) : undefined}
                cancel={upcoming ? { label: riding ? "Leave" : "Cancel", disabled: !canCancel(event), hint: "You can cancel up to 1 hour before the start", onClick: () => setCancelling(event) } : null}
              />
            );
          })
        )}
      </main>
      <ConfirmModal
        open={!!cancelling}
        onOpenChange={(v) => !v && setCancelling(null)}
        icon={Ban}
        tone="danger"
        title={tab === "hosting" ? "Cancel this ride?" : "Leave this ride?"}
        description={tab === "hosting" ? "Every rider can see the ride is off. This cannot be undone." : "Your spot is given up and the host can see it. This cannot be undone."}
        confirmLabel={tab === "hosting" ? "Cancel ride" : "Leave ride"}
        cancelLabel="Keep it"
        onConfirm={doCancel}
      />
      <Navbar />
    </div>
  );
};

export default MyCycling;
