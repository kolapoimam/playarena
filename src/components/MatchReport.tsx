import { useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Share2, Download } from "lucide-react";
import html2canvas from "html2canvas";
import { supabase } from "@/integrations/supabase/client";

type Player = { id: string; player_name: string };
type Team = {
  name: string;
  players: string[];
  score: number;
  analytics: { possession: number; shots: number; fouls: number; yellow_cards: number; red_cards: number };
};
type MatchEvent = {
  id: string;
  match_id: string;
  type: "goal" | "yellow_card" | "red_card" | "foul" | "shot" | "substitution";
  team_name: string;
  player_id?: string;
  minute: number;
  description: string;
};
type Match = { id: string; slug: string; super_code: string; title: string; match_date: string; match_time: string };
type TeamRanking = {
  name: string;
  goals: number;
  points: number;
  yellow_cards: number;
  red_cards: number;
  fouls: number;
  shots: number;
};

const generateAnalyticsAndRankings = (events: MatchEvent[], teams: Team[]): { updatedTeams: Team[]; rankings: TeamRanking[] } => {
  const updatedTeams = teams.map((team) => ({
    ...team,
    score: 0,
    analytics: { possession: 50, shots: 0, fouls: 0, yellow_cards: 0, red_cards: 0 },
  }));

  const teamStats: { [key: string]: TeamRanking } = {};
  teams.forEach((team) => {
    teamStats[team.name] = { name: team.name, goals: 0, points: 0, yellow_cards: 0, red_cards: 0, fouls: 0, shots: 0 };
  });

  let totalActions = 0;
  events.forEach((event) => {
    const team = updatedTeams.find((t) => t.name === event.team_name);
    if (!team || !teamStats[event.team_name]) return;

    if (event.type === "goal") {
      team.score += 1;
      teamStats[event.team_name].goals += 1;
      teamStats[event.team_name].points += 3;
      totalActions += 1;
    } else if (event.type === "yellow_card") {
      team.analytics.yellow_cards += 1;
      teamStats[event.team_name].yellow_cards += 1;
      teamStats[event.team_name].points -= 1;
      totalActions += 1;
    } else if (event.type === "red_card") {
      team.analytics.red_cards += 1;
      teamStats[event.team_name].red_cards += 1;
      teamStats[event.team_name].points -= 3;
      totalActions += 1;
    } else if (event.type === "foul") {
      team.analytics.fouls += 1;
      teamStats[event.team_name].fouls += 1;
      teamStats[event.team_name].points -= 0.5;
      totalActions += 1;
    } else if (event.type === "shot") {
      team.analytics.shots += 1;
      teamStats[event.team_name].shots += 1;
      totalActions += 1;
    }
  });

  const actionsPerTeam: { [key: string]: number } = {};
  teams.forEach((team) => (actionsPerTeam[team.name] = 0));
  events.forEach((event) => {
    if (["goal", "shot", "foul"].includes(event.type) && actionsPerTeam[event.team_name] !== undefined) {
      actionsPerTeam[event.team_name] += 1;
    }
  });

  const totalTeamActions = Object.values(actionsPerTeam).reduce((sum, val) => sum + val, 0);
  updatedTeams.forEach((team) => {
    if (totalTeamActions > 0) {
      team.analytics.possession = Math.round((actionsPerTeam[team.name] / totalTeamActions) * 100);
    }
  });

  const rankings = Object.values(teamStats).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goals !== a.goals) return b.goals - a.goals;
    return a.red_cards - b.red_cards;
  });

  return { updatedTeams, rankings };
};

const MatchReport = ({
  match,
  teams,
  setTeams,
  events,
  setEvents,
  players,
  addToHistory,
  isPublic,
}: {
  match: Match;
  teams: Team[];
  setTeams: (teams: Team[]) => void;
  events: MatchEvent[];
  setEvents: (events: MatchEvent[]) => void;
  players: Player[];
  addToHistory: (teams: Team[]) => void;
  isPublic: boolean;
}) => {
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const { rankings } = generateAnalyticsAndRankings(events, teams);

  const handleScoreChange = async (teamName: string, value: string) => {
    if (!/^\d+$/.test(value) || parseInt(value) >= 30) {
      toast({ title: "Invalid Score", description: "Score must be a number less than 30.", variant: "destructive" });
      return;
    }

    const score = parseInt(value);
    const updatedTeams = teams.map((t) => (t.name === teamName ? { ...t, score } : t));
    setTeams(updatedTeams);
    addToHistory(updatedTeams);

    try {
      const { data: existingAssignment, error: fetchError } = await supabase
        .from("team_assignments")
        .select("id")
        .eq("match_id", match.id)
        .maybeSingle();

      if (fetchError && fetchError.code !== "PGRST116") throw fetchError;

      const teamAssignmentData = { match_id: match.id, super_code: match.super_code, teams, is_public: isPublic };
      const { error } = existingAssignment
        ? await supabase.from("team_assignments").update(teamAssignmentData).eq("id", existingAssignment.id)
        : await supabase.from("team_assignments").insert(teamAssignmentData);

      if (error) throw error;
      toast({ title: "Teams Saved", description: "Team assignments and analytics have been updated." });
    } catch (error) {
      console.error("Error saving teams:", error);
      toast({ title: "Error", description: "Failed to save teams.", variant: "destructive" });
    }
  };

  const addEvent = async (type: MatchEvent["type"], teamName: string, description: string) => {
    if (!match) return;

    const newEvent: MatchEvent = {
      id: crypto.randomUUID(),
      match_id: match.id,
      type,
      team_name: teamName,
      minute: Math.floor(Date.now() / 60000) % 90,
      description,
    };

    try {
      const { error } = await supabase.from("match_events").insert(newEvent);
      if (error) throw error;

      const updatedEvents = [...events, newEvent];
      setEvents(updatedEvents);
      const { updatedTeams } = generateAnalyticsAndRankings(updatedEvents, teams);
      setTeams(updatedTeams);
      addToHistory(updatedTeams);
    } catch (error) {
      console.error("Error adding event:", error);
      toast({ title: "Error", description: "Failed to add event.", variant: "destructive" });
    }
  };

  const exportReport = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `match-report-${match?.slug}.png`;
      link.click();
      toast({ title: "Success", description: "Match report exported as PNG." });
    } catch (error) {
      console.error("Error exporting report:", error);
      toast({ title: "Error", description: "Failed to export match report.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    if (!isPublic) {
      toast({ title: "Error", description: "Match must be public to share highlights.", variant: "destructive" });
      return;
    }

    try {
      const shareUrl = `${window.location.origin}/highlights/${match.slug}`;
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "Success", description: "Shareable link copied to clipboard!" });
    } catch (error) {
      console.error("Error copying share link:", error);
      toast({ title: "Error", description: "Failed to copy share link.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
        <Button
          onClick={exportReport}
          className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs sm:text-sm px-3 py-2 flex-1 sm:flex-none"
          disabled={isExporting}
        >
          {isExporting ? "Exporting..." : <><Download size={16} className="mr-2" /> Export Report</>}
        </Button>
        <Button
          onClick={handleShare}
          className="bg-green-500 hover:bg-green-600 text-white text-xs sm:text-sm px-3 py-2 flex-1 sm:flex-none"
        >
          <Share2 size={16} className="mr-2" />
          Share
        </Button>
      </div>

      <div ref={reportRef} className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
        <div className="hidden print:block absolute top-4 left-4">
          <img src="/playarenalight.png" alt="PlayArena Logo" className="w-24 sm:w-32" />
        </div>
        <div className="mt-12 sm:mt-16">
          <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100 text-center">{match.title} Report</h2>
          <div className="space-y-4 sm:space-y-6">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200">Score Table</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-700">
                      <th className="p-2 text-gray-900 dark:text-gray-100">Team</th>
                      <th className="p-2 text-gray-900 dark:text-gray-100">Score</th>
                      <th className="p-2 text-gray-900 dark:text-gray-100">Possession</th>
                      <th className="p-2 text-gray-900 dark:text-gray-100">Shots</th>
                      <th className="p-2 text-gray-900 dark:text-gray-100">Fouls</th>
                      <th className="p-2 text-gray-900 dark:text-gray-100">Yellow Cards</th>
                      <th className="p-2 text-gray-900 dark:text-gray-100">Red Cards</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teams.map((team) => (
                      <tr key={team.name} className="border-b dark:border-gray-600">
                        <td className="p-2 text-gray-900 dark:text-gray-100">{team.name}</td>
                        <td className="p-2">
                          <Input
                            type="number"
                            value={team.score}
                            onChange={(e) => handleScoreChange(team.name, e.target.value)}
                            className="w-16 sm:w-20 text-xs sm:text-sm"
                            min="0"
                            max="29"
                          />
                        </td>
                        <td className="p-2 text-gray-900 dark:text-gray-100">{team.analytics.possession}%</td>
                        <td className="p-2 text-gray-900 dark:text-gray-100">{team.analytics.shots}</td>
                        <td className="p-2 text-gray-900 dark:text-gray-100">{team.analytics.fouls}</td>
                        <td className="p-2 text-gray-900 dark:text-gray-100">{team.analytics.yellow_cards}</td>
                        <td className="p-2 text-gray-900 dark:text-gray-100">{team.analytics.red_cards}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200">Rankings</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-700">
                      <th className="p-2 text-gray-900 dark:text-gray-100">Rank</th>
                      <th className="p-2 text-gray-900 dark:text-gray-100">Team</th>
                      <th className="p-2 text-gray-900 dark:text-gray-100">Points</th>
                      <th className="p-2 text-gray-900 dark:text-gray-100">Goals</th>
                      <th className="p-2 text-gray-900 dark:text-gray-100">Yellow Cards</th>
                      <th className="p-2 text-gray-900 dark:text-gray-100">Red Cards</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.map((team, index) => (
                      <tr key={team.name} className="border-b dark:border-gray-600">
                        <td className="p-2 text-gray-900 dark:text-gray-100">{index + 1}</td>
                        <td className="p-2 text-gray-900 dark:text-gray-100">{team.name}</td>
                        <td className="p-2 text-gray-900 dark:text-gray-100">{team.points}</td>
                        <td className="p-2 text-gray-900 dark:text-gray-100">{team.goals}</td>
                        <td className="p-2 text-gray-900 dark:text-gray-100">{team.yellow_cards}</td>
                        <td className="p-2 text-gray-900 dark:text-gray-100">{team.red_cards}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200">Events</h3>
              {events.length === 0 ? (
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">No events recorded.</p>
              ) : (
                events.map((event) => (
                  <p key={event.id} className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    {event.minute}' - {event.type.replace("_", " ")} ({event.team_name}): {event.description}
                  </p>
                ))
              )}
              <div className="flex flex-wrap gap-2 sm:gap-3 mt-2">
                {teams.map((team) => (
                  <div key={team.name} className="flex flex-wrap gap-2 sm:gap-3">
                    <Button
                      onClick={() => addEvent("goal", team.name, `Goal scored by ${team.name}`)}
                      className="bg-green-500 hover:bg-green-600 text-white text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
                    >
                      Goal
                    </Button>
                    <Button
                      onClick={() => addEvent("yellow_card", team.name, `Yellow card for ${team.name}`)}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
                    >
                      Yellow
                    </Button>
                    <Button
                      onClick={() => addEvent("red_card", team.name, `Red card for ${team.name}`)}
                      className="bg-red-500 hover:bg-red-600 text-white text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
                    >
                      Red
                    </Button>
                    <Button
                      onClick={() => addEvent("foul", team.name, `Foul by ${team.name}`)}
                      className="bg-gray-500 hover:bg-gray-600 text-white text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
                    >
                      Foul
                    </Button>
                    <Button
                      onClick={() => addEvent("shot", team.name, `Shot by ${team.name}`)}
                      className="bg-blue-500 hover:bg-blue-600 text-white text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
                    >
                      Shot
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchReport;
