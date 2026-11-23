import React, { useState, useEffect } from "react";
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
        const { data, error } = await supabase
          .from("organizers")
          .select("id, name, phone, is_verified")
          .order("name", { ascending: true });

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
      const { data: orgData, error: orgError } = await supabase
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
        .limit(5);

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
      const { data: joinData, error: joinError } = await supabase
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
        .limit(5);

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
    const matchDateTime = new Date(`${matchDate}T${matchTime}Z`);
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
      new Date(`${match.match_date}T${match.match_time}Z`) <= new Date(now.getTime() + 60 * 60 * 1000)
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
      setShowCancelDialog(false);
      setCancelMatchId(null);
      setCancelIsJoined(false);
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

  return (
    <div className="min-h-screen flex flex-col bg-sc-bg dark:bg-gray-900">
      <header className="px-5 pt-[max(env(safe-area-inset-top),1rem)] flex flex-col gap-3.5">
          <div className="pt-3 flex items-center justify-between min-h-11">
            <BackButton to="/profile" />
            <div className="flex gap-2"></div>
          </div>
          <h1 className="m-0 text-[32px] leading-[38px] font-extrabold tracking-[-0.03em]">My matches</h1>
        </header>

      <div className="flex-grow overflow-y-auto">
        <div className="container mx-auto px-4 py-6">
          <Card className="w-full bg-white dark:bg-gray-800 border-none shadow-card rounded-3xl">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-sc-green-dark dark:text-green-400 flex items-center">
                <Volleyball className="mr-2 h-6 w-6" />
                My Matches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="organizing" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-sc-soft dark:bg-gray-700 rounded-t-lg">
                  <TabsTrigger
                    value="organizing"
                    className="data-[state=active]:bg-white data-[state=active]:text-sc-ink data-[state=active]:shadow-[0_1px_3px_rgba(14,20,17,0.12)]"
                  >
                    Organizing
                  </TabsTrigger>
                  <TabsTrigger
                    value="playing"
                    className="data-[state=active]:bg-white data-[state=active]:text-sc-ink data-[state=active]:shadow-[0_1px_3px_rgba(14,20,17,0.12)]"
                  >
                    Playing
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="organizing">
                  {organizedMatches.length > 0 ? (
                    organizedMatches.map((match) => {
                      const organizer = organizers.find((org) => org.name === match.organizer_name);
                      const isVerified = organizer?.is_verified || false;
                      const { dateStr, timeStr } = formatMatchDateTime(match.match_date, match.match_time);
                      const statusLabel = getStatusLabel(match.status, match.cancellation_status, match.match_date, match.start_time, match.end_time);
                      return (
                        <div
                          key={match.id}
                          className="w-full p-4 mb-4 bg-white dark:bg-gray-800 rounded-3xl shadow-card dark:border-gray-700"
                        >
                          <div className="flex justify-between items-start">
                            <div className="space-y-2">
                              <h3 className="text-lg font-semibold text-sc-ink dark:text-gray-100">{match.title}</h3>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusLabel.className}`}>
                                  {statusLabel.text}
                                </span>
                              </div>
                              <p className="text-sm text-sc-ink3 dark:text-gray-400 flex items-center">
                                <Calendar size={16} className="mr-2" />
                                {dateStr} at {timeStr}
                              </p>
                              <p className="text-sm text-sc-ink3 dark:text-gray-400 flex items-center">
                                <MapPin size={16} className="mr-2" />
                                {match.venue_name || "Venue TBD"}
                              </p>
                              {userId && match.is_recurring && (
                                <p className="text-sm text-sc-ink3 dark:text-gray-400 flex items-center">
                                  <Repeat size={16} className="mr-2" />
                                  Repeats {match.recurring_frequency} for {match.recurring_occurrences} times
                                </p>
                              )}
                              <div className="text-sm text-sc-ink3 dark:text-gray-400 flex items-center gap-2">
                                <span>Super Code:</span>
                                <span className="flex items-center gap-1">
                                  <span>{match.super_code || "N/A"}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      navigator.clipboard.writeText(match.super_code || '');
                                      toast({
                                        title: "Success",
                                        description: "Super code copied!",
                                      });
                                    }}
                                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    <Copy size={12} />
                                  </Button>
                                </span>
                              </div>
                              <p className="text-base font-medium text-sc-ink dark:text-gray-100">
                                Slots: <span className="text-sc-green-dark dark:text-green-400">{match.booked_slots}</span>/{match.total_slots}
                              </p>
                              <p className="text-sm text-sc-ink3 dark:text-gray-400 flex items-center">
                                Organized by: {match.organizer_name || "Unknown"}
                                {isVerified && <img src="/green-verified.png" alt="Verified" className="w-4 h-4 ml-1" />}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 flex gap-2">
                            {(match.status === "upcoming" || match.status === "live") && !match.cancellation_status ? (
                              <Button
                                variant="outline"
                                className="px-4 py-2 border-sc-green text-sc-green-dark hover:bg-green-500 hover:text-white rounded-lg"
                                onClick={() => {
                                  setCancelMatchId(match.id);
                                  setCancelIsJoined(false);
                                  setShowCancelDialog(true);
                                }}
                                disabled={!canCancelMatch(match.match_date, match.match_time)}
                              >
                                Cancel
                              </Button>
                            ) : (
                              <Button
                                className="px-4 py-2 bg-sc-green hover:brightness-95 text-sc-green-ink rounded-full font-bold"
                                onClick={() => navigate(`/feedback?matchSlug=${match.slug}`)}
                                disabled={
                                  (new Date().getTime() - new Date(`${match.match_date}T${match.match_time}Z`).getTime()) /
                                    (1000 * 60 * 60) >
                                  48 || match.status !== "completed"
                                }
                              >
                                Review Feedback
                              </Button>
                            )}
                            <Button
                              className="px-4 py-2 bg-sc-green hover:brightness-95 text-sc-green-ink rounded-full font-bold"
                              onClick={() => navigate(`/match/${match.slug}`)}
                            >
                              View Details
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-sc-ink3 dark:text-gray-400 p-4">
                      No organized matches found.
                    </p>
                  )}
                </TabsContent>
                <TabsContent value="playing">
                  {joinedMatches.length > 0 ? (
                    joinedMatches.map((match) => {
                      const organizer = organizers.find((org) => org.name === match.organizer_name);
                      const isVerified = organizer?.is_verified || false;
                      const { dateStr, timeStr } = formatMatchDateTime(match.match_date, match.match_time);
                      const statusLabel = getStatusLabel(match.player_status || "registered", match.player_cancellation_status || match.cancellation_status, match.match_date, match.start_time, match.end_time);
                      return (
                        <div
                          key={match.id}
                          className="w-full p-4 mb-4 bg-white dark:bg-gray-800 rounded-3xl shadow-card dark:border-gray-700"
                        >
                          <div className="flex justify-between items-start">
                            <div className="space-y-2">
                              <h3 className="text-lg font-semibold text-sc-ink dark:text-gray-100">{match.title}</h3>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusLabel.className}`}>
                                  {statusLabel.text}
                                </span>
                              </div>
                              <p className="text-sm text-sc-ink3 dark:text-gray-400 flex items-center">
                                <Calendar size={16} className="mr-2" />
                                {dateStr} at {timeStr}
                              </p>
                              <p className="text-sm text-sc-ink3 dark:text-gray-400 flex items-center">
                                <MapPin size={16} className="mr-2" />
                                {match.venue_name || "Venue TBD"}
                              </p>
                              {userId && match.is_recurring && (
                                <p className="text-sm text-sc-ink3 dark:text-gray-400 flex items-center">
                                  <Repeat size={16} className="mr-2" />
                                  Repeats {match.recurring_frequency} for {match.recurring_occurrences} times
                                </p>
                              )}
                              <div className="flex items-center justify-between gap-2 py-1">
                                <span className="text-sm text-sc-ink3">
                                  Code <b className="text-sc-ink tracking-[0.12em]">{match.confirmation_code || "N/A"}</b>
                                </span>
                                <ViewTicketButton
                                  ticket={{
                                    sport: "football",
                                    kind: "Match ticket",
                                    title: match.title,
                                    code: match.confirmation_code,
                                    rows: [
                                      { label: "Date", value: dateStr },
                                      { label: "Time", value: timeStr },
                                      { label: "Venue", value: match.venue_name || "To be confirmed" },
                                      { label: "Slots", value: String(match.number_of_slots || 1) },
                                    ],
                                    footnote: "The organiser scans this QR code on match day.",
                                  }}
                                />
                              </div>
                              {match.is_paid && match.number_of_slots && (
                                <p className="text-base font-medium text-sc-ink dark:text-gray-100">
                                  Slots Purchased: <span className="text-sc-green-dark dark:text-green-400">{match.number_of_slots}</span>
                                </p>
                              )}
                              <p className="text-sm text-sc-ink3 dark:text-gray-400 flex items-center">
                                Organized by: {match.organizer_name || "Unknown"}
                                {isVerified && <img src="/green-verified.png" alt="Verified" className="w-4 h-4 ml-1" />}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 flex gap-2">
                            {(match.status === "upcoming" || match.status === "live") &&
                            !match.cancellation_status &&
                            !match.player_cancellation_status ? (
                              <Button
                                variant="outline"
                                className="px-4 py-2 border-sc-green text-sc-green-dark hover:bg-green-500 hover:text-white rounded-lg"
                                onClick={() => {
                                  setCancelMatchId(match.id);
                                  setCancelIsJoined(true);
                                  setShowCancelDialog(true);
                                }}
                                disabled={!canCancelMatch(match.match_date, match.match_time)}
                              >
                                Cancel
                              </Button>
                            ) : (
                              <Button
                                className="px-4 py-2 bg-sc-green hover:brightness-95 text-sc-green-ink rounded-full font-bold"
                                onClick={() => navigate(`/feedback?matchSlug=${match.slug}`)}
                                disabled={
                                  (new Date().getTime() - new Date(`${match.match_date}T${match.match_time}Z`).getTime()) /
                                    (1000 * 60 * 60) >
                                  48 || match.status !== "completed"
                                }
                              >
                                Give Feedback
                              </Button>
                            )}
                            <Button
                              className="px-4 py-2 bg-sc-green hover:brightness-95 text-sc-green-ink rounded-full font-bold"
                              onClick={() => navigate(`/match/${match.slug}`)}
                            >
                              View Details
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-sc-ink3 dark:text-gray-400 p-4">
                      No joined matches found.
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="max-w-md rounded-3xl bg-white dark:bg-gray-800 border-none shadow-card">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-sc-ink dark:text-gray-100">
              Confirm Cancellation
            </DialogTitle>
            <DialogDescription className="text-sm text-sc-ink3 dark:text-gray-400">
              Are you sure you want to cancel {cancelIsJoined ? "your participation in" : "this match"}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-between mt-4">
            <Button
              variant="outline"
              className="w-1/2 px-4 py-2 border-sc-line text-sc-ink2 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg"
              onClick={() => setShowCancelDialog(false)}
            >
              No, Go Back
            </Button>
            <Button
              className="w-1/2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
              onClick={handleCancelConfirm}
            >
              Yes, Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="pb-28">
        <Navbar />
      </div>
    </div>
  );
};

export default MyMatches;
