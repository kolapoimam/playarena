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
        const { count } = await supabase
          .from("players")
          .select("id", { count: "exact" })
          .eq("match_id", item.matches.id)
          .eq("cancellation_status", false);
        return {
          ...item.matches,
          super_code: item.matches.super_code,
          venue_name: item.matches.venues?.name,
          is_paid: item.matches.is_paid,
          booked_slots: count || 0,
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
          // Check if the player entry exists in players table (for cancelled matches)
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
          booked_slots: 0, // Not displayed in Playing tab
          total_slots: item.matches.total_slots,
        };
      })
    );

    setJoinedMatches(joinedMatchesData);
  };

  const canCancelMatch = (matchDate: string) => {
    const now = new Date();
    const matchTime = new Date(matchDate);
    const oneHourBefore = new Date(matchTime.getTime() - 60 * 60 * 1000); // 1 hour before match
    return now < oneHourBefore;
  };

  const handleCancelConfirm = async () => {
    if (!cancelMatchId) return;

    const now = new Date();
    const { data: match } = await supabase
      .from("matches")
      .select("match_date")
      .eq("id", cancelMatchId)
      .single();

    if (!match || new Date(match.match_date) <= new Date(now.getTime() + 60 * 60 * 1000)) {
      toast({ title: "Error", description: "Cannot cancel match within 1 hour or in the past.", variant: "destructive" });
      setShowCancelDialog(false);
      return;
    }

    if (cancelIsJoined) {
      // Cancel participation (Playing tab)
      const { error: joinedError } = await supabase
        .from("user_joined_matches")
        .delete()
        .eq("user_id", profile!.id)
        .eq("match_id", cancelMatchId);

      if (joinedError) {
        toast({ title: "Error", description: "Failed to cancel participation.", variant: "destructive" });
        setShowCancelDialog(false);
        return;
      }

      // Update player status and cancellation_status
      const { error: playerError } = await supabase
        .from("players")
        .update({ status: "cancelled", cancellation_status: true, updated_at: new Date().toISOString() })
        .eq("match_id", cancelMatchId)
        .eq("player_name", profile!.nickname || profile!.first_name || "User");

      if (playerError) {
        toast({ title: "Error", description: "Failed to update player status.", variant: "destructive" });
        setShowCancelDialog(false);
        return;
      }
    } else {
      // Cancel entire match (Organizing tab)
      const { error: matchError } = await supabase
        .from("matches")
        .update({ status: "cancelled", cancellation_status: true })
        .eq("id", cancelMatchId);

      if (matchError) {
        toast({ title: "Error", description: "Failed to cancel match.", variant: "destructive" });
        setShowCancelDialog(false);
        return;
      }

      // Update all players' status and cancellation_status
      const { error: playersError } = await supabase
        .from("players")
        .update({ status: "cancelled", cancellation_status: true, updated_at: new Date().toISOString() })
        .eq("match_id", cancelMatchId);

      if (playersError) {
        toast({ title: "Error", description: "Failed to update players' status.", variant: "destructive" });
        setShowCancelDialog(false);
        return;
      }
    }

    toast({ title: "Success", description: "Match cancelled successfully!" });
    setShowCancelDialog(false);
    fetchMatches();
  };

  const formatMatchDateTime = (date: string) => {
    const zonedDate = utcToZonedTime(new Date(date), "Africa/Lagos");
    const dateStr = format(zonedDate, "EEE, dd - MM - yyyy");
    const timeStr = format(zonedDate, "h:mm a");
    return { dateStr, timeStr };
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
                return (
                  <div
                    key={match.id}
                    className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 rounded-lg shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                  >
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{match.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <Calendar size={14} className="inline mr-1" />
                        {dateStr}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Time: {timeStr}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <MapPin size={14} className="inline mr-1" />
                        {match.venue_name || "Venue TBD"}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Super Code: {match.super_code || "N/A"}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Slots: {match.booked_slots}/{match.total_slots} booked
                      </p>
                      {match.cancellation_status && (
                        <p className="text-sm text-red-500 dark:text-red-400">
                          Status: Cancelled
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {(match.status === "upcoming" || match.status === "live") && !match.cancellation_status ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
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
                          size="sm"
                          className="bg-green-500 hover:bg-green-600 text-white"
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
                        size="sm"
                        className="bg-green-500 hover:bg-green-600 text-white"
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
                return (
                  <div
                    key={match.id}
                    className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 rounded-lg shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                  >
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{match.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <Calendar size={14} className="inline mr-1" />
                        {dateStr}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Time: {timeStr}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <MapPin size={14} className="inline mr-1" />
                        {match.venue_name || "Venue TBD"}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Confirmation Code: {match.confirmation_code || "N/A"}
                      </p>
                      {match.is_paid && match.number_of_slots && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Slots Purchased: {match.number_of_slots}
                        </p>
                      )}
                      {match.player_cancellation_status || match.cancellation_status ? (
                        <p className="text-sm text-red-500 dark:text-red-400">
                          Status: Cancelled
                        </p>
                      ) : (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Status: {match.player_status || "Registered"}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {(match.status === "upcoming" || match.status === "live") &&
                      !match.cancellation_status &&
                      !match.player_cancellation_status ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
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
                          size="sm"
                          className="bg-green-500 hover:bg-green-600 text-white"
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
                        size="sm"
                        className="bg-green-500 hover:bg-green-600 text-white"
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Cancellation</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel {cancelIsJoined ? "your participation in" : "this match"}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              className="border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              No, Go Back
            </Button>
            <Button
              className="bg-red-500 hover:bg-red-600 text-white"
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
