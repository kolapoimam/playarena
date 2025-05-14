import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  venue_name?: string;
  is_paid: boolean;
  number_of_slots?: number;
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

  useEffect(() => {
    if (profile) {
      fetchMatches();
    }
  }, [profile]);

  const fetchMatches = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;

    const { data: orgData, error: orgError } = await supabase
      .from("user_organized_matches")
      .select(`
        match_id,
        matches(id, title, slug, match_date, super_code, status, is_paid, venue_id, venues(name))
      `)
      .eq("user_id", session.session.user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (orgError) {
      toast({ title: "Error", description: "Failed to load organized matches.", variant: "destructive" });
      return;
    }

    setOrganizedMatches(
      orgData.map((item) => ({
        ...item.matches,
        super_code: item.matches.super_code,
        venue_name: item.matches.venues?.name,
        is_paid: item.matches.is_paid,
      }))
    );

    const { data: joinData, error: joinError } = await supabase
      .from("user_joined_matches")
      .select(`
        match_id,
        player_id,
        matches(id, title, slug, match_date, status, is_paid, venue_id, venues(name)),
        players(confirmation_code, number_of_slots)
      `)
      .eq("user_id", session.session.user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (joinError) {
      toast({ title: "Error", description: "Failed to load joined matches.", variant: "destructive" });
      return;
    }

    setJoinedMatches(
      joinData.map((item) => ({
        ...item.matches,
        confirmation_code: item.players.confirmation_code,
        venue_name: item.matches.venues?.name,
        is_paid: item.matches.is_paid,
        number_of_slots: item.players.number_of_slots,
      }))
    );
  };

  const cancelMatch = async (matchId: string, isJoined: boolean) => {
    const now = new Date();
    const { data: match } = await supabase
      .from("matches")
      .select("match_date")
      .eq("id", matchId)
      .single();

    if (new Date(match!.match_date) < now) {
      toast({ title: "Error", description: "Cannot cancel past matches.", variant: "destructive" });
      return;
    }

    if (isJoined) {
      const { error: playerError } = await supabase
        .from("user_joined_matches")
        .delete()
        .eq("user_id", profile!.id)
        .eq("match_id", matchId);

      if (playerError) {
        toast({ title: "Error", description: "Failed to cancel match.", variant: "destructive" });
        return;
      }
    } else {
      const { error: matchError } = await supabase
        .from("matches")
        .update({ status: "cancelled" })
        .eq("id", matchId);

      if (matchError) {
        toast({ title: "Error", description: "Failed to cancel match.", variant: "destructive" });
        return;
      }
    }

    toast({ title: "Success", description: "Match cancelled successfully!" });
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
                    </div>
                    <div className="flex gap-2">
                      {(match.status === "upcoming" || match.status === "live") ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
                          onClick={() => cancelMatch(match.id, false)}
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
                    </div>
                    <div className="flex gap-2">
                      {(match.status === "upcoming" || match.status === "live") ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
                          onClick={() => cancelMatch(match.id, true)}
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
    </Card>
  );
};

export default UserMatches;
