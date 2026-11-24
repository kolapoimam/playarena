import React, { useState, useEffect } from "react";
import ActivityCard, { activityStatus } from "@/components/sc/ActivityCard";
import ConfirmModal from "@/components/sc/ConfirmModal";
import { PageHeader, Segmented, formatTime12 } from "@/components/sc/ui";
import { Ban } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar, Volleyball, Users, MapPin, Copy, Repeat } from "lucide-react";
import { format } from "date-fns";
import { utcToZonedTime } from "date-fns-tz";
import { DateTime } from "luxon";
import Navbar from "@/components/Navbar";
import { ArrowLeft } from "lucide-react";
// Match management components
import MatchCodeInput from "@/components/matchManagement/MatchCodeInput";
import MatchDetails from "@/components/matchManagement/MatchDetails";
import MatchDetailsDialogue from "@/components/matchManagement/MatchDetailsDialogue";
import MatchDetailsForm from "@/components/matchManagement/MatchDetailsForm";
import MatchForm from "@/components/matchManagement/MatchForm";
import MatchHighlights from "@/components/matchManagement/MatchHighlights";
import MatchJoinersDialog from "@/components/match/MatchJoinersDialog";
import MatchPreviewDialog from "@/components/match/MatchPreviewDialog";
import MatchReport from "@/components/matchManagement/MatchReport";
import MatchSuccessDialog from "@/components/match/MatchSuccessDialog";
import TeamMatchDetails from "@/components/matchManagement/TeamMatchDetails";
// Profile components
import UserMatches from "@/components/profile/UserMatches";

import { BackButton } from "@/components/sc/ui";
import { PageSkeleton } from "@/components/sc/skeletons";
import { ViewTicketButton } from "@/components/sc/TicketCard";
import { FunEmpty } from "@/components/sc/ui";
import { Trophy as TrophyIcon } from "lucide-react";
import { Megaphone as WhistleIcon } from "lucide-react";
type Match = {
  id: string;
  title: string;
  slug: string;
  match_date: string;
  match_time: string;
  start_time: string;
  end_time: string;
  super_code?: string;
  confirmation_code?: string;
  status: string;
  cancellation_status: boolean;
  venue_name?: string;
  is_paid: boolean;
  number_of_slots?: number;
  player_status?: string;
  player_cancellation_status?: boolean;
  booked_slots?: number;
  total_slots?: number;
  organizer_name?: string;
  is_recurring: boolean;
  recurring_frequency: string | null;
  recurring_occurrences: number | null;
};

type Profile = {
  id: string;
  nickname?: string;
  first_name?: string;
};

type Organizer = {
  id: string;
  name: string;
  phone: string;
  is_verified: boolean;
};

const MyMatches = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organizedMatches, setOrganizedMatches] = useState<Match[]>([]);
  const [joinedMatches, setJoinedMatches] = useState<Match[]>([]);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [cancelMatchId, setCancelMatchId] = useState<string | null>(null);
  const [cancelIsJoined, setCancelIsJoined] = useState<boolean>(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"organizing" | "playing">("organizing");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Fetch profile and check authentication
      const { data: session, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session.session) {
        navigate("/auth");
        setLoading(false);
        return;
      }
      setUserId(session.session.user.id);

      // Start every request now (then() sends it) instead of one after another
      const organizersPromise = supabase
          .from("organizers")
          .select("id, name, phone, is_verified")
          .order("name", { ascending: true })
          .then((r) => r);
      const orgPromise = supabase
        .from("user_organized_matches")
        .select(`
          match_id,
          matches(
            id, title, slug, match_date, match_time, start_time, end_time, super_code, status, 
            cancellation_status, is_paid, venue_id, total_slots, organizer_name, 
            is_recurring, recurring_frequency, recurring_occurrences, venues(name)
          )
        `)
        .eq("user_id", session.session.user.id)
        .order("created_at", { ascending: false })
        .limit(5)
        .then((r) => r);
      const joinPromise = supabase
        .from("user_joined_matches")
        .select(`
          match_id,
          player_id,
          matches(
            id, title, slug, match_date, match_time, start_time, end_time, status, 
            cancellation_status, is_paid, venue_id, total_slots, organizer_name, 
            is_recurring, recurring_frequency, recurring_occurrences, venues(name)
          ),
          players(confirmation_code, number_of_slots, status, cancellation_status)
        `)
        .eq("user_id", session.session.user.id)
        .order("created_at", { ascending: false })
        .limit(5)
        .then((r) => r);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.session.user.id)
        .single();

      if (profileError) {
        toast({ title: "Error", description: "Failed to load profile.", variant: "destructive" });
        setLoading(false);
        return;
      }

      setProfile(profileData);

      // Fetch organizers
      try {
        const { data, error } = await organizersPromise;

        if (error) throw error;
        setOrganizers(data as Organizer[]);
      } catch (error: any) {
        console.error("Error fetching organizers:", error.message);
        toast({
          title: "Error",
          description: "Failed to load organizers. Please try again.",
          variant: "destructive",
        });
      }

      // Fetch organized matches with recurring details
      const { data: orgData, error: orgError } = await orgPromise;

      if (orgError) {
        toast({ title: "Error", description: "Failed to load organized matches.", variant: "destructive" });
        setLoading(false);
        return;
      }

      const organizedMatchesWithSlots = await Promise.all(
        orgData.map(async (item) => {
          const { data: players, error: playerError } = await supabase
            .from("players")
            .select("number_of_slots")
            .eq("match_id", item.matches.id)
            .eq("cancellation_status", false);

          if (playerError) {
            toast({ title: "Error", description: "Failed to load player slots.", variant: "destructive" });
            return { ...item.matches, booked_slots: 0 };
          }

          const bookedSlots = players.reduce((sum, player) => sum + (player.number_of_slots || 1), 0);
          return {
            ...item.matches,
            super_code: item.matches.super_code,
            venue_name: item.matches.venues?.name,
            is_paid: item.matches.is_paid,
            booked_slots: bookedSlots,
            total_slots: item.matches.total_slots,
            organizer_name: item.matches.organizer_name,
            is_recurring: item.matches.is_recurring || false,
            recurring_frequency: item.matches.recurring_frequency || null,
            recurring_occurrences: item.matches.recurring_occurrences || null,
          };
        })
      );

      setOrganizedMatches(organizedMatchesWithSlots);

      // Fetch joined matches with recurring details
      const { data: joinData, error: joinError } = await joinPromise;

      if (joinError) {
        toast({ title: "Error", description: "Failed to load joined matches.", variant: "destructive" });
        setLoading(false);
        return;
      }

      const joinedMatchesData = await Promise.all(
        joinData.map(async (item) => {
          let playerStatus = item.players?.status || "registered";
          let playerCancellationStatus = item.players?.cancellation_status || false;
          if (!item.players) {
            const { data: playerData } = await supabase
              .from("players")
              .select("status, cancellation_status")
              .eq("match_id", item.matches.id)
              .eq("player_name", profileData!.nickname || profileData!.first_name || "User")
              .single();
            playerStatus = playerData?.status || "cancelled";
            playerCancellationStatus = playerData?.cancellation_status || true;
          }
          const { data: players, error: playerError } = await supabase
            .from("players")
            .select("number_of_slots")
            .eq("match_id", item.matches.id)
            .eq("cancellation_status", false);
          const bookedSlots = playerError ? 0 : players.reduce((sum, player) => sum + (player.number_of_slots || 1), 0);
          return {
            ...item.matches,
            confirmation_code: item.players?.confirmation_code,
            venue_name: item.matches.venues?.name,
            is_paid: item.matches.is_paid,
            number_of_slots: item.players?.number_of_slots,
            player_status: playerStatus,
            player_cancellation_status: playerCancellationStatus,
            booked_slots: bookedSlots,
            total_slots: item.matches.total_slots,
            organizer_name: item.matches.organizer_name,
            is_recurring: item.matches.is_recurring || false,
            recurring_frequency: item.matches.recurring_frequency || null,
            recurring_occurrences: item.matches.recurring_occurrences || null,
          };
        })
      );

      setJoinedMatches(joinedMatchesData);
      setLoading(false);
    };

    fetchData();
  }, [navigate, toast]);

  const canCancelMatch = (matchDate: string, matchTime: string) => {
    if (!matchDate || !matchTime) return false;
    const now = new Date();
    const matchDateTime = new Date(`${matchDate}T${String(matchTime).slice(0, 5)}:00`);
    if (isNaN(matchDateTime.getTime())) return false;
    const oneHourBefore = new Date(matchDateTime.getTime() - 60 * 60 * 1000);
    return now < oneHourBefore;
  };

  const handleCancelConfirm = async () => {
    if (!cancelMatchId || !profile) return;

    const now = new Date();
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("match_date, match_time, start_time, end_time, cancellation_status")
      .eq("id", cancelMatchId)
      .single();

    if (
      matchError ||
      !match ||
      match.cancellation_status ||
      new Date(`${match.match_date}T${String(match.match_time).slice(0, 5)}:00`) <= new Date(now.getTime() + 60 * 60 * 1000)
    ) {
      toast({
        title: "Error",
        description: "Cannot cancel match within 1 hour, in the past, or already cancelled.",
        variant: "destructive",
      });
      setShowCancelDialog(false);
      return;
    }

    try {
      if (cancelIsJoined) {
        // Cancel participation
        const { error: joinedError } = await supabase
          .from("user_joined_matches")
          .delete()
          .eq("user_id", profile.id)
          .eq("match_id", cancelMatchId);

        if (joinedError) throw joinedError;

        const { error: playerError } = await supabase
          .from("players")
          .update({ status: "cancelled", cancellation_status: true, updated_at: new Date().toISOString() })
          .eq("match_id", cancelMatchId)
          .eq("player_name", profile.nickname || profile.first_name || "User");

        if (playerError) throw playerError;

        const { data: players, error: playerFetchError } = await supabase
          .from("players")
          .select("number_of_slots")
          .eq("match_id", cancelMatchId)
          .eq("cancellation_status", false);

        if (playerFetchError) throw playerFetchError;

        const bookedSlots = players.reduce((sum, player) => sum + (player.number_of_slots || 1), 0);
        setJoinedMatches((prev) =>
          prev.map((m) =>
            m.id === cancelMatchId
              ? { ...m, player_status: "cancelled", player_cancellation_status: true, booked_slots }
              : m
          )
        );
      } else {
        // Cancel entire match
        const { error: matchUpdateError } = await supabase
          .from("matches")
          .update({ status: "cancelled", cancellation_status: true, updated_at: new Date().toISOString() })
          .eq("id", cancelMatchId);

        if (matchUpdateError) throw matchUpdateError;

        const { error: playersError } = await supabase
          .from("players")
          .update({ status: "cancelled", cancellation_status: true, updated_at: new Date().toISOString() })
          .eq("match_id", cancelMatchId);

        if (playersError) throw playersError;

        setOrganizedMatches((prev) =>
          prev.map((m) =>
            m.id === cancelMatchId ? { ...m, status: "cancelled", cancellation_status: true, booked_slots: 0 } : m
          )
        );
      }

      toast({
        title: "Success",
        description: cancelIsJoined ? "Participation cancelled successfully!" : "Match cancelled successfully!",
      });
    } catch (error) {
      console.error("Cancellation error:", error);
      toast({ title: "Error", description: "Failed to cancel. Please try again.", variant: "destructive" });
    } finally {
      setCancelMatchId(null);
    }
  };

  const formatMatchDateTime = (date: string, time: string) => {
    if (!date || !time || isNaN(new Date(`${date}T${time}Z`).getTime())) {
      return { dateStr: "Invalid Date", timeStr: "Invalid Time" };
    }
    try {
      const zonedDate = utcToZonedTime(new Date(`${date}T${time}Z`), "Africa/Lagos");
      const dateStr = format(zonedDate, "EEE, dd MMM yyyy");
      const timeStr = format(zonedDate, "h:mm a");
      return { dateStr, timeStr };
    } catch {
      return { dateStr: "Invalid Date", timeStr: "Invalid Time" };
    }
  };

  const getMatchStatus = (matchDate: string, startTime: string, endTime: string) => {
    const now = DateTime.now().setZone("Africa/Lagos");
    const matchDateTime = DateTime.fromISO(`${matchDate}T${startTime}`, { zone: "utc" }).setZone("Africa/Lagos");
    const endDateTime = DateTime.fromISO(`${matchDate}T${endTime}`, { zone: "utc" }).setZone("Africa/Lagos");

    if (now < matchDateTime) return { text: "Upcoming", className: "bg-blue-100 text-blue-800" };
    if (now.hasSame(matchDateTime, "day") && now < matchDateTime) return { text: "Today", className: "bg-sc-green-bg text-sc-green-dark" };
    if (now >= matchDateTime && now <= endDateTime) return { text: "Live", className: "bg-sc-green-bg text-sc-green-dark" };
    return { text: "Passed", className: "bg-sc-soft text-sc-ink" };
  };

  const getStatusLabel = (status: string, isCancelled: boolean, matchDate: string, startTime: string, endTime: string) => {
    if (isCancelled) return { text: "Cancelled", className: "bg-red-100 text-red-800" };
    const matchStatus = getMatchStatus(matchDate, startTime, endTime);
    return matchStatus;
  };

  if (loading) {
    return (
      <PageSkeleton />
    );
  }

  const timeRange = (m: Match) => [m.start_time || m.match_time, m.end_time].filter(Boolean).map((t) => formatTime12(t as string)).join(" to ");
  const repeatLabel = (m: Match) => (m.is_recurring ? `Repeats ${m.recurring_frequency || ""}${m.recurring_occurrences ? `, ${m.recurring_occurrences} times` : ""}` : null);
  const feedbackOpen = (m: Match) => m.status === "completed" && (Date.now() - new Date(`${m.match_date}T${(m.match_time || "00:00").slice(0, 5)}:00`).getTime()) / 36e5 <= 48;
  const list = tab === "organizing" ? organizedMatches : joinedMatches;
  const sorted = [...list].sort((x, y) => {
    const sx = activityStatus(x.match_date, x.start_time || x.match_time, x.end_time, x.cancellation_status || x.player_cancellation_status);
    const sy = activityStatus(y.match_date, y.start_time || y.match_time, y.end_time, y.cancellation_status || y.player_cancellation_status);
    const rank = (st: string) => (st === "Live" ? 0 : st === "Today" ? 1 : st === "Upcoming" ? 2 : 3);
    if (rank(sx) !== rank(sy)) return rank(sx) - rank(sy);
    return rank(sx) < 3 ? x.match_date.localeCompare(y.match_date) : y.match_date.localeCompare(x.match_date);
  });

  return (
    <div className="min-h-screen flex flex-col bg-sc-bg text-sc-ink font-sans pb-32">
      <PageHeader back backTo="/profile" title="My matches" subtitle="Matches you organise and play in" />
      <main className="px-5 pt-4 flex flex-col gap-3">
        <Segmented
          options={[
            { value: "organizing", label: `Organising${organizedMatches.length ? ` (${organizedMatches.length})` : ""}` },
            { value: "playing", label: `Playing${joinedMatches.length ? ` (${joinedMatches.length})` : ""}` },
          ]}
          value={tab}
          onChange={(v) => setTab(v as "organizing" | "playing")}
        />
        {sorted.length === 0 ? (
          tab === "organizing" ? (
            <FunEmpty icon={WhistleIcon} sport="football" title="You haven't blown a whistle yet" body="Organise your first match. Pick a venue, set the slots and share the link with your squad." primary={{ label: "Organise a match", onClick: () => navigate("/organize") }} />
          ) : (
            <FunEmpty icon={TrophyIcon} sport="football" title="Your boots are still clean" body="Matches you join show up here with your ticket. Find a game near you and grab a slot." primary={{ label: "Find a match", onClick: () => navigate("/matches") }} />
          )
        ) : (
          sorted.map((match) => {
            const organizer = organizers.find((org) => org.name === match.organizer_name);
            const joined = tab === "playing";
            const cancelled = match.cancellation_status || (joined && match.player_cancellation_status);
            const status = activityStatus(match.match_date, match.start_time || match.match_time, match.end_time, cancelled);
            const live = status === "Upcoming" || status === "Today";
            const dateStr = new Date(`${match.match_date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
            return (
              <ActivityCard
                key={match.id}
                sport="football"
                title={match.title}
                date={match.match_date}
                timeLabel={timeRange(match)}
                place={match.venue_name || "Venue to be confirmed"}
                status={status}
                codeLabel={joined ? "Your code" : "Super code"}
                code={joined ? match.confirmation_code : match.super_code}
                taken={joined ? undefined : match.booked_slots}
                total={joined ? undefined : match.total_slots}
                extra={joined ? (
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-semibold text-sc-ink3">Your slots</span>
                    <span className="text-[15px] font-extrabold">{match.number_of_slots || 1}</span>
                  </span>
                ) : undefined}
                organiser={match.organizer_name || null}
                verified={!!organizer?.is_verified}
                repeat={repeatLabel(match)}
                view={{ label: "View details", onClick: () => navigate(`/match/${match.slug}`) }}
                ticket={joined && match.confirmation_code ? (
                  <ViewTicketButton soft ticket={{
                    sport: "football",
                    kind: "Match ticket",
                    title: match.title,
                    code: match.confirmation_code,
                    rows: [
                      { label: "Date", value: dateStr },
                      { label: "Time", value: timeRange(match) },
                      { label: "Venue", value: match.venue_name || "To be confirmed" },
                      { label: "Slots", value: String(match.number_of_slots || 1) },
                    ],
                    footnote: "The organiser scans this QR code on match day.",
                  }} />
                ) : undefined}
                cancel={live ? {
                  label: "Cancel",
                  disabled: !canCancelMatch(match.match_date, match.match_time),
                  hint: "You can cancel up to 1 hour before kick off",
                  onClick: () => { setCancelMatchId(match.id); setCancelIsJoined(joined); setShowCancelDialog(true); },
                } : null}
                feedback={status === "Passed" && !cancelled ? {
                  label: joined ? "Feedback" : "Reviews",
                  disabled: !feedbackOpen(match),
                  onClick: () => navigate(`/feedback?matchSlug=${match.slug}`),
                } : null}
              />
            );
          })
        )}
      </main>

      <ConfirmModal
        open={showCancelDialog}
        onOpenChange={(v) => { setShowCancelDialog(v); if (!v) setCancelMatchId(null); }}
        icon={Ban}
        tone="danger"
        title={cancelIsJoined ? "Leave this match?" : "Cancel this match?"}
        description={cancelIsJoined ? "Your slot is given up and the organiser is told. This cannot be undone." : "Every player is told the match is off. This cannot be undone."}
        confirmLabel={cancelIsJoined ? "Leave match" : "Cancel match"}
        cancelLabel="Keep it"
        onConfirm={handleCancelConfirm}
      />
      <Navbar />
    </div>
  );
};

export default MyMatches;
