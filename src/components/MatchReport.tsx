import { useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Share2, Download, Copy, Twitter, Facebook, MessageCircle } from "lucide-react";
import html2canvas from "html2canvas";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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
type Match = { id: string; slug: string; super_code: string; title: string; match_date: string; match_time: string; venue: string };
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
    analytics: { possession: 50, shots: 0, fouls: 0, yellow_cards: 0, red_cards: 0 },
  }));

  const teamStats: { [key: string]: TeamRanking } = {};
  teams.forEach((team) => {
    teamStats[team.name] = { name: team.name, goals: team.score, points: 0, yellow_cards: 0, red_cards: 0, fouls: 0, shots: 0 };
  });

  let totalActions = 0;
  events.forEach((event) => {
    const team = updatedTeams.find((t) => t.name === event.team_name);
    if (!team || !teamStats[event.team_name]) return;

    if (event.type === "goal") {
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
  const totalScore = teams.reduce((sum, team) => sum + team.score, 0);

  updatedTeams.forEach((team) => {
    let possession = 50;
    if (totalTeamActions > 0) {
      possession = Math.round((actionsPerTeam[team.name] / totalTeamActions) * 100);
    }
    if (totalScore > 0) {
      const scoreWeight = (team.score / totalScore) * 20; // Score influences possession up to 20%
      possession = Math.min(80, Math.max(20, possession + scoreWeight));
    }
    team.analytics.possession = Math.round(possession);
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
  const {akartaRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [eventType, setEventType] = useState<MatchEvent["type"] | null>(null);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const { updatedTeams, rankings } = generateAnalyticsAndRankings(events, teams);

  const handleScoreChange = async (teamName: string, value: string) => {
    if (!/^\d+$/.test(value) || parseInt(value) >= 30) {
      toast({ title: "Invalid Score", description: "Score must be a number less than 30.", variant: "destructive" });
      return;
    }

    const score = parseInt(value);
    const tempTeams = teams.map((t) => (t.name === teamName ? { ...t, score } : t));
    const { updatedTeams: newTeams } = generateAnalyticsAndRankings(events, tempTeams);
    setTeams(newTeams);
    addToHistory(newTeams);

    try {
      const { data: existingAssignment, error: fetchError } = await supabase
        .from("team_assignments")
        .select("id")
        .eq("match_id", match.id)
        .maybeSingle();

      if (fetchError && fetchError.code !== "PGRST116") throw fetchError;

      const teamAssignmentData = { match_id: match.id, super_code: match.super_code, teams: newTeams, is_public: isPublic };
      const { error } = existingAssignment
        ? await supabase.from("team_assignments").update(teamAssignmentData).eq("id", existingAssignment.id)
        : await supabase.from("team_assignments").insert(teamAssignmentData);

      if (error) throw error;
      toast({ title: "Teams Saved", description: "Team scores and analytics have been updated." });
    } catch (error) {
      console.error("Error saving teams:", error);
      toast({ title: "Error", description: "Failed to save teams.", variant: "destructive" });
    }
  };

  const addEvent = async (type: MatchEvent["type"], teamName: string) => {
    if (!match) return;

    const newEvent: MatchEvent = {
      id: crypto.randomUUID(),
      match_id: match.id,
      type,
      team_name: teamName,
      minute: Math.floor(Date.now() / 60000) % 90,
      description: `${type.replace("_", " ")} by ${teamName}`,
    };

    try {
      const { error } = await supabase.from("match_events").insert(newEvent);
      if (error) throw error;

      const updatedEvents = [...events, newEvent];
      setEvents(updatedEvents);
      const { updatedTeams } = generateAnalyticsAndRankings(updatedEvents, teams);
      setTeams(updatedTeams);
      addToHistory(updatedTeams);
      setEventDialogOpen(false);
    } catch (error) {
      console.error("Error adding event:", error);
      toast({ title: "Error", description: "Failed to add event.", variant: "destructive" });
    }
  };

  const exportReport = async () => {
    if (!exportRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(exportRef.current, {
        scale: 3,
        useCORS: true,
        width: 800,
        height: exportRef.current.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        backgroundColor: '#ffffff',
      });
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
    setShareOpen(true);
  };

  const copyShareLink = async () => {
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
    <div className="space-y-6 sm:space-y-8">
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

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="rounded-xl max-w-md">
          <DialogTitle>Share Match Highlights</DialogTitle>
          <DialogDescription>
            <p className="text-sm mb-4">Relive the excitement! Share this epic match with your friends and teammates!</p>
            <p className="text-sm mb-4 break-all bg-gray-100 dark:bg-gray-700 p-2 rounded">{`${window.location.origin}/highlights/${match.slug}`}</p>
            <div className="flex justify-center gap-4 mb-4">
              <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(`${window.location.origin}/highlights/${match.slug}`)}&text=Check out this epic match on SportCliq!`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="p-2">
                  <Twitter size={20} className="text-blue-400" />
                </Button>
              </a>
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/highlights/${match.slug}`)}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="p-2">
                  <Facebook size={20} className="text-blue-600" />
                </Button>
              </a>
              <a href={`https://api.whatsapp.com/send?text=Check out this epic match on SportCliq! ${encodeURIComponent(`${window.location.origin}/highlights/${match.slug}`)}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="p-2">
                  <MessageCircle size={20} className="text-green-500" />
                </Button>
              </a>
              <Button variant="outline" onClick={copyShareLink} className="p-2">
                <Copy size={20} className="text-gray-600" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">Powered by @SportCliq</p>
          </DialogDescription>
        </DialogContent>
      </Dialog>

      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent className="rounded-xl max-w-md">
          <DialogTitle>Select Team for {eventType?.replace("_", " ")}</DialogTitle>
          <DialogDescription>
            <p className="text-sm mb-4">Choose the team to apply this event to.</p>
            <div className="flex justify-center flex-wrap gap-3">
              {teams.map((team) => (
                <Button
                  key={team.name}
                  onClick={() => addEvent(eventType!, team.name)}
                  className="bg-green-500 hover:bg-green-600 text-white text-sm px-4 py-2 flex-1 min-w-[120px]"
                >
                  {team.name}
                </Button>
              ))}
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>

      <div ref={reportRef} className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
        <div ref={exportRef} className="space-y-8 w-[800px] bg-gradient-to-br from-blue-50 to-green-50 p-6 rounded-lg">
          <div className="text-center">
            <img src="/playarenalight.png" alt="PlayArena Logo" className="w-32 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-blue-800">{match.title}</h2>
            <p className="text-sm text-gray-600">{match.match_date} at {match.match_time} | {match.venue}</p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Score Table</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-blue-100">
                      <th className="p-3 text-gray-800 font-semibold">Team</th>
                      <th className="p-3 text-gray-800 font-semibold">Score</th>
                      <th className="p-3 text-gray-800 font-semibold">Possession</th>
                      <th className="p-3 text-gray-800 font-semibold">Shots</th>
                      <th className="p-3 text-gray-800 font-semibold">Fouls</th>
                      <th className="p-3 text-gray-800 font-semibold">Yellow</th>
                      <th className="p-3 text-gray-800 font-semibold">Red</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teams.map((team, index) => (
                      <tr key={team.name} className="border-b border-gray-200">
                        <td className="p-3 text-gray-800 font-medium">{team.name}</td>
                        <td className="p-3">
                          <Input
                            type="number"
                            value={team.score}
                            onChange={(e) => handleScoreChange(team.name, e.target.value)}
                            className="w-16 text-sm text-center border-gray-300 focus:border-blue-500"
                            min="0"
                            max="29"
                          />
                        </td>
                        <td className="p-3 text-gray-800 text-center">{team.analytics.possession}%</td>
                        <td className="p-3 text-gray-800 text-center">{team.analytics.shots}</td>
                        <td className="p-3 text-gray-800 text-center">{team.analytics.fouls}</td>
                        <td className="p-3 text-gray-800 text-center">{team.analytics.yellow_cards}</td>
                        <td className="p-3 text-gray-800 text-center">{team.analytics.red_cards}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Rankings</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-green-100">
                      <th className="p-3 text-gray-800 font-semibold">Rank</th>
                      <th className="p-3 text-gray-800 font-semibold">Team</th>
                      <th className="p-3 text-gray-800 font-semibold">Points</th>
                      <th className="p-3 text-gray-800 font-semibold">Goals</th>
                      <th className="p-3 text-gray-800 font-semibold">Yellow</th>
                      <th className="p-3 text-gray-800 font-semibold">Red</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.map((team, index) => (
                      <tr key={team.name} className="border-b border-gray-200">
                        <td className="p-3 text-gray-800 text-center">{index + 1}</td>
                        <td className="p-3 text-gray-800 font-medium">{team.name}</td>
                        <td className="p-3 text-gray-800 text-center">{team.points}</td>
                        <td className="p-3 text-gray-800 text-center">{team.goals}</td>
                        <td className="p-3 text-gray-800 text-center">{team.yellow_cards}</td>
                        <td className="p-3 text-gray-800 text-center">{team.red_cards}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-yellow-500">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Events</h3>
              {events.length === 0 ? (
                <p className="text-sm text-gray-600">No events recorded.</p>
              ) : (
                <ul className="space-y-2">
                  {events.map((event) => (
                    <li key={event.id} className="text-sm text-gray-600 flex items-center">
                      <span className="inline-block w-12 text-center font-semibold text-blue-600">{event.minute}'</span>
                      <span className="flex-1">{event.type.replace("_", " ")} ({event.team_name}): {event.description}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="text-center mt-6">
            <p className="text-xs text-gray-500">Generated on May 21, 2025, 09:19 PM WAT</p>
            <p className="text-xs text-gray-500">Powered by SportCliq</p>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Record Events</h3>
          <div className="flex justify-center flex-wrap gap-3 mt-3">
            <Button
              onClick={() => { setEventType("goal"); setEventDialogOpen(true); }}
              className="bg-green-500 hover:bg-green-600 text-white text-sm px-4 py-2 min-w-[80px]"
            >
              Goal
            </Button>
            <Button
              onClick={() => { setEventType("yellow_card"); setEventDialogOpen(true); }}
              className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm px-4 py-2 min-w-[80px]"
            >
              Yellow
            </Button>
            <Button
              onClick={() => { setEventType("red_card"); setEventDialogOpen(true); }}
              className="bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-2 min-w-[80px]"
            >
              Red
            </Button>
            <Button
              onClick={() => { setEventType("foul"); setEventDialogOpen(true); }}
              className="bg-gray-500 hover:bg-gray-600 text-white text-sm px-4 py-2 min-w-[80px]"
            >
              Foul
            </Button>
            <Button
              onClick={() => { setEventType("shot"); setEventDialogOpen(true); }}
              className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 py-2 min-w-[80px]"
            >
              Shot
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchReport;
