import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Calendar, Users, MapPin } from "lucide-react";
import { format } from "date-fns";
import { utcToZonedTime } from "date-fns-tz";

type Match = {
  id: string;
  title: string;
  slug: string;
  match_date: string;
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
};

type Profile = {
  id: string;
  nickname?: string;
  first_name?: string;
};

type UserMatchesProps = {
  profile: Profile | null;
};

const UserMatches = ({ profile }: UserMatchesProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [organizedMatches, setOrganizedMatches] = useState<Match[]>([]);
  const [joinedMatches, setJoinedMatches] = useState<Match[]>([]);
  const [cancelMatchId, setCancelMatchId] = useState<string | null>(null);
  const [cancelIsJoined, setCancelIsJoined] = useState<boolean>(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchMatches();
    }
  }, [profile]);

  const fetchMatches = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;

    // Fetch organized matches
    const { data: orgData, error: orgError } = await supabase
      .from("user_organized_matches")
      .select(`
        match_id,
        matches(id, title, slug, match_date, super_code, status, cancellation_status, is_paid, venue_id, total_slots, venues(name))
      `)
      .eq("user_id", session.session.user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (orgError) {
      toast({ title: "Error", description: "Failed to load organized matches.", variant: "destructive" });
      return;
    }

    // Fetch booked slots for each organized match
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
        };
      })
    );

    setOrganizedMatches(organizedMatchesWithSlots);

    // Fetch joined matches
    const { data: joinData, error: joinError } = await supabase
      .from("user_joined_matches")
      .select(`
        match_id,
        player_id,
        matches(id, title, slug, match_date, status, cancellation_status, is_paid, venue_id, total_slots, venues(name)),
        players(confirmation_code, number_of_slots, status, cancellation_status)
      `)
      .eq("user_id", session.session.user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (joinError) {
      toast({ title: "Error", description: "Failed to load joined matches.", variant: "destructive" });
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
            .eq("player_name", profile!.nickname || profile!.first_name || "User")
            .single();
          playerStatus = playerData?.status || "cancelled";
          playerCancellationStatus = playerData?.cancellation_status || true;
        }
        return {
          ...item.matches,
          confirmation_code: item.players?.confirmation_code,
          venue_name: item.matches.venues?.name,
          is_paid: item.matches.is_paid,
          number_of_slots: item.players?.number_of_slots,
          player_status: playerStatus,
          player_cancellation_status: playerCancellationStatus,
          booked_slots: 0,
          total_slots: item.matches.total_slots,
        };
      })
    );

    setJoinedMatches(joinedMatchesData);
  };

  const canCancelMatch = (matchDate: string) => {
    if (!matchDate) return false;
    const now = new Date();
    const matchTime = new Date(matchDate);
    if (isNaN(matchTime.getTime())) return false;
    const oneHourBefore = new Date(matchTime.getTime() - 60 * 60 * 1000);
    return now < oneHourBefore;
  };

  const handleCancelConfirm = async () => {
    if (!cancelMatchId || !profile) return;

    const now = new Date();
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("match_date, cancellation_status")
      .eq("id", cancelMatchId)
      .single();

    if (matchError || !match || match.cancellation_status || new Date(match.match_date) <= new Date(now.getTime() + 60 * 60 * 1000)) {
      toast({ title: "Error", description: "Cannot cancel match within 1 hour, in the past, or already cancelled.", variant: "destructive" });
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

        // Update booked_slots for the match
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

        // Update booked_slots to 0 since the match is cancelled
        setOrganizedMatches((prev) =>
          prev.map((m) =>
            m.id === cancelMatchId ? { ...m, status: "cancelled", cancellation_status: true, booked_slots: 0 } : m
          )
        );
      }

      toast({ title: "Success", description: cancelIsJoined ? "Participation cancelled successfully!" : "Match cancelled successfully!" });
      await fetchMatches(); // Refresh matches to ensure consistency
    } catch (error) {
      console.error("Cancellation error:", error);
      toast({ title: "Error", description: "Failed to cancel. Please try again.", variant: "destructive" });
    } finally {
      setShowCancelDialog(false);
      setCancelMatchId(null);
      setCancelIsJoined(false);
    }
  };

  const formatMatchDateTime = (date: string) => {
    if (!date || isNaN(new Date(date).getTime())) {
      return { dateStr: "Invalid Date", timeStr: "Invalid Time" };
    }
    try {
      const zonedDate = utcToZonedTime(new Date(date), "Africa/Lagos");
      const dateStr = format(zonedDate, "EEE, dd MMM yyyy");
      const timeStr = format(zonedDate, "h:mm a");
      return { dateStr, timeStr };
    } catch {
      return { dateStr: "Invalid Date", timeStr: "Invalid Time" };
    }
  };

  const getStatusLabel = (status: string, isCancelled: boolean) => {
    if (isCancelled) return { text: "Cancelled", className: "bg-red-100 text-red-800" };
    switch (status) {
      case "upcoming":
        return { text: "Upcoming", className: "bg-blue-100 text-blue-800" };
      case "live":
        return { text: "Live", className: "bg-green-100 text-green-800" };
      case "completed":
        return { text: "Completed", className: "bg-gray-100 text-gray-800" };
      case "cancelled":
        return { text: "Cancelled", className: "bg-red-100 text-red-800" };
      default:
        return { text: "Registered", className: "bg-yellow-100 text-yellow-800" };
    }
  };

  return (
    <Card className="bg-white dark:bg-gray-800 border-none shadow-xl rounded-xl">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-green-700 dark:text-green-400 flex items-center">
          <Users className="mr-2 h-6 w-6" />
          My Matches
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="organizing" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-700 rounded-t-lg">
            <TabsTrigger
              value="organizing"
              className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
            >
              Organizing
            </TabsTrigger>
            <TabsTrigger
              value="playing"
              className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
            >
              Playing
            </TabsTrigger>
          </TabsList>
          <TabsContent value="organizing">
            {organizedMatches.length > 0 ? (
              organizedMatches.map((match) => {
                const { dateStr, timeStr } = formatMatchDateTime(match.match_date);
                const statusLabel = getStatusLabel(match.status, match.cancellation_status);
                return (
                  <div
                    key={match.id}
                    className="p-4 mb-4 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{match.title}</h3>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusLabel.className}`}>
                            {statusLabel.text}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                          <Calendar size={16} className="mr-2" />
                          {dateStr} at {timeStr}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                          <MapPin size={16} className="mr-2" />
                          {match.venue_name || "Venue TBD"}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Super Code: {match.super_code || "N/A"}
                        </p>
                        <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                          Slots: <span className="text-green-600 dark:text-green-400">{match.booked_slots}</span>/{match.total_slots}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      {(match.status === "upcoming" || match.status === "live") && !match.cancellation_status ? (
                        <Button
                          variant="outline"
                          className="px-4 py-2 border-green-500 text-green-500 hover:bg-green-500 hover:text-white rounded-lg"
                          onClick={() => {
                            setCancelMatchId(match.id);
                            setCancelIsJoined(false);
                            setShowCancelDialog(true);
                          }}
                          disabled={!canCancelMatch(match.match_date)}
                        >
                          Cancel
                        </Button>
                      ) : (
                        <Button
                          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg"
                          onClick={() => navigate(`/feedback?matchId=${match.id}`)}
                          disabled={
                            (new Date().getTime() - new Date(match.match_date).getTime()) /
                              (1000 * 60 * 60) >
                            48 || match.status !== "completed"
                          }
                        >
                          Give Feedback
                        </Button>
                      )}
                      <Button
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg"
                        onClick={() => navigate(`/match/${match.slug}`)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400 p-4">
                No organized matches found.
              </p>
            )}
          </TabsContent>
          <TabsContent value="playing">
            {joinedMatches.length > 0 ? (
              joinedMatches.map((match) => {
                const { dateStr, timeStr } = formatMatchDateTime(match.match_date);
                const statusLabel = getStatusLabel(match.player_status || "registered", match.player_cancellation_status || match.cancellation_status);
                return (
                  <div
                    key={match.id}
                    className="p-4 mb-4 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{match.title}</h3>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusLabel.className}`}>
                            {statusLabel.text}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                          <Calendar size={16} className="mr-2" />
                          {dateStr} at {timeStr}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                          <MapPin size={16} className="mr-2" />
                          {match.venue_name || "Venue TBD"}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Confirmation Code: {match.confirmation_code || "N/A"}
                        </p>
                        {match.is_paid && match.number_of_slots && (
                          <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                            Slots Purchased: <span className="text-green-600 dark:text-green-400">{match.number_of_slots}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      {(match.status === "upcoming" || match.status === "live") &&
                      !match.cancellation_status &&
                      !match.player_cancellation_status ? (
                        <Button
                          variant="outline"
                          className="px-4 py-2 border-green-500 text-green-500 hover:bg-green-500 hover:text-white rounded-lg"
                          onClick={() => {
                            setCancelMatchId(match.id);
                            setCancelIsJoined(true);
                            setShowCancelDialog(true);
                          }}
                          disabled={!canCancelMatch(match.match_date)}
                        >
                          Cancel
                        </Button>
                      ) : (
                        <Button
                          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg"
                          onClick={() => navigate(`/feedback?matchId=${match.id}`)}
                          disabled={
                            (new Date().getTime() - new Date(match.match_date).getTime()) /
                              (1000 * 60 * 60) >
                            48 || match.status !== "completed"
                          }
                        >
                          Give Feedback
                        </Button>
                      )}
                      <Button
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg"
                        onClick={() => navigate(`/match/${match.slug}`)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400 p-4">
                No joined matches found.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-gray-800 border-none shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Confirm Cancellation
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
              Are you sure you want to cancel {cancelIsJoined ? "your participation in" : "this match"}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              className="px-4 py-2 border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg"
              onClick={() => setShowCancelDialog(false)}
            >
              No, Go Back
            </Button>
            <Button
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
              onClick={handleCancelConfirm}
            >
              Yes, Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default UserMatches;
