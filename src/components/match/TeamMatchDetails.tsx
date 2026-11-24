import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowRightLeft, BookOpen, Calendar, Check, Clock, Eye, Loader2, MapPin, Minus, Plus, Redo2, Save, Shuffle, Undo2, Users } from "lucide-react";
import { isPast, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useDrag, useDrop } from "react-dnd";
import { Avatar, Bubble, EmptyState, Pill, ScButton, Segmented, initialsOf } from "@/components/sc/ui";

// Types
type Player = { id: string; player_name: string };
type Team = {
  name: string;
  players: string[];
  score: number;
  analytics: { possession: number; shots: number; fouls: number; yellow_cards: number; red_cards: number };
};
type Match = { id: string; slug: string; super_code: string; title: string; match_date: string; match_time: string; venue: string };

import { teamColor } from "@/lib/teamColors";

const blankTeam = (i: number): Team => ({
  name: `Team ${i + 1}`,
  players: [],
  score: 0,
  analytics: { possession: 50, shots: 0, fouls: 0, yellow_cards: 0, red_cards: 0 },
});

export const RULE_TEMPLATES: { name: string; text: string }[] = [
  { name: "5 a side casual", text: "5 players per side, two 15 minute halves, no offside, rolling substitutions, no slide tackles." },
  { name: "7 a side", text: "7 players per side, two 25 minute halves, no offside, rolling substitutions, kick ins instead of throw ins." },
  { name: "10 a side", text: "10 players per side, two 30 minute halves, standard fouls, offside applies in the final third." },
  { name: "11 a side standard", text: "11 players per side, two 45 minute halves, standard fouls and offside, 3 substitutions." },
  { name: "Winner stays on", text: "Short games of 10 minutes or first to 2 goals. The winning team stays on, the next team comes in." },
];

const PlayerRow = ({
  player,
  teamName,
  color,
  manual,
  onMove,
}: {
  player: Player;
  teamName: string;
  color: string;
  manual: boolean;
  onMove: () => void;
}) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "PLAYER",
    item: { playerId: player.id, teamName },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }), [player.id, teamName]);

  return (
    <div ref={drag} className={`flex items-center gap-3 py-2.5 transition-opacity ${isDragging ? "opacity-40" : ""}`}>
      <span className="relative">
        <Avatar initials={initialsOf(player.player_name)} seed={player.player_name} size={36} />
        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white" style={{ background: color }} />
      </span>
      <span className="flex-1 min-w-0 text-[15px] font-bold truncate">{player.player_name}</span>
      {manual && (
        <button type="button" onClick={onMove} aria-label={`Move ${player.player_name}`} className="h-9 px-3 rounded-full bg-sc-soft text-sc-ink text-xs font-bold inline-flex items-center gap-1.5">
          <ArrowRightLeft size={14} /> Move
        </button>
      )}
    </div>
  );
};

const TeamCard = ({
  team,
  index,
  players,
  manual,
  nameValue,
  onNameChange,
  onNameCommit,
  onDropPlayer,
  onMovePlayer,
}: {
  team: Team;
  index: number;
  players: Player[];
  manual: boolean;
  nameValue: string;
  onNameChange: (v: string) => void;
  onNameCommit: () => void;
  onDropPlayer: (playerId: string, fromTeam: string) => void;
  onMovePlayer: (playerId: string) => void;
}) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: "PLAYER",
    drop: (item: { playerId: string; teamName: string }) => {
      if (item.teamName !== team.name) onDropPlayer(item.playerId, item.teamName);
    },
    collect: (m) => ({ isOver: m.isOver() }),
  }), [team.name, onDropPlayer]);
  const color = teamColor(index);

  return (
    <div ref={drop} className={`bg-white rounded-3xl p-4 flex flex-col gap-2 transition-shadow ${isOver ? "ring-2 ring-sc-green" : ""}`}>
      <div className="flex items-center gap-2.5">
        <span className="w-3 h-8 rounded-full shrink-0" style={{ background: color }} />
        <input
          value={nameValue}
          onChange={(e) => onNameChange(e.target.value)}
          onBlur={onNameCommit}
          onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
          aria-label="Team name"
          maxLength={24}
          className="flex-1 min-w-0 bg-transparent text-lg font-extrabold tracking-[-0.01em] outline-none border-b border-transparent focus:border-sc-line"
        />
        <Pill sport="gray">{team.players.length}</Pill>
      </div>
      {team.players.length === 0 ? (
        <p className="m-0 py-3 text-sm text-sc-ink3 text-center bg-sc-soft rounded-2xl">{manual ? "Move players here" : "No players in this team"}</p>
      ) : (
        <div className="flex flex-col divide-y divide-sc-line">
          {team.players.map((id) => {
            const p = players.find((x) => x.id === id) || { id, player_name: "Player left" };
            return <PlayerRow key={id} player={p} teamName={team.name} color={color} manual={manual} onMove={() => onMovePlayer(id)} />;
          })}
        </div>
      )}
    </div>
  );
};

const Stepper = ({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) => (
  <div className="flex items-center justify-between bg-sc-soft rounded-2xl px-4 py-3">
    <span className="text-sm font-bold">{label}</span>
    <span className="flex items-center gap-3">
      <button type="button" aria-label={`Less ${label}`} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="w-9 h-9 rounded-full bg-white flex items-center justify-center disabled:opacity-40"><Minus size={16} /></button>
      <span className="w-6 text-center text-lg font-extrabold">{value}</span>
      <button type="button" aria-label={`More ${label}`} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="w-9 h-9 rounded-full bg-white flex items-center justify-center disabled:opacity-40"><Plus size={16} /></button>
    </span>
  </div>
);

const sheet = "w-full max-w-[calc(100%-1.5rem)] sm:max-w-[420px] rounded-[28px] bg-sc-bg p-5 gap-4 max-h-[92vh] overflow-y-auto";

const TeamMatchDetails = ({
  match,
  teams,
  setTeams,
  players,
  mode,
  setMode,
  isPublic,
  setIsPublic,
  history,
  historyIndex,
  addToHistory,
  setHistoryIndex,
}: {
  match: Match;
  teams: Team[];
  setTeams: (teams: Team[]) => void;
  players: Player[];
  mode: "automatic" | "manual";
  setMode: (mode: "automatic" | "manual") => void;
  isPublic: boolean;
  setIsPublic: (isPublic: boolean) => void;
  history: Team[][];
  historyIndex: number;
  addToHistory: (teams: Team[]) => void;
  setHistoryIndex: (index: number) => void;
}) => {
  const { toast } = useToast();
  const [names, setNames] = useState(teams.map((t) => t.name));
  const [genOpen, setGenOpen] = useState(false);
  const [numTeams, setNumTeams] = useState(Math.max(2, teams.length || 2));
  const [perTeam, setPerTeam] = useState(Math.max(1, Math.floor(players.length / Math.max(2, teams.length || 2)) || 5));
  const [rulesOpen, setRulesOpen] = useState(false);
  const [rule, setRule] = useState<string>("");
  const [appliedRule, setAppliedRule] = useState<{ name: string; text: string } | null>(null);
  const [applying, setApplying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [moving, setMoving] = useState<string | null>(null);
  const teamsRef = useRef(teams);
  teamsRef.current = teams;

  useEffect(() => setNames(teams.map((t) => t.name)), [teams]);

  // Show the rules already applied to this match
  useEffect(() => {
    supabase.from("matches").select("analytics").eq("id", match.id).maybeSingle().then(({ data }) => {
      const r = (data?.analytics as any)?.rules;
      if (r?.name) setAppliedRule({ name: r.name, text: r.text });
    });
  }, [match.id]);

  const matchStart = new Date(`${match.match_date}T${match.match_time}`);
  const started = !isNaN(matchStart.getTime()) && isPast(matchStart);
  const assigned = new Set(teams.flatMap((t) => t.players));
  const bench = players.filter((p) => !assigned.has(p.id));

  const commit = (next: Team[]) => {
    setTeams(next);
    addToHistory(next);
  };

  const movePlayer = (playerId: string, toTeam: string | null) => {
    const next = teamsRef.current.map((t) => {
      const without = t.players.filter((id) => id !== playerId);
      return t.name === toTeam ? { ...t, players: [...without, playerId] } : { ...t, players: without };
    });
    commit(next);
    setMoving(null);
  };

  const generate = () => {
    if (players.length === 0) {
      toast({ title: "No players yet", description: "Teams can be made once players join.", variant: "destructive" });
      return;
    }
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const take = Math.min(perTeam * numTeams, shuffled.length);
    const next: Team[] = Array.from({ length: numTeams }, (_, i) => ({ ...blankTeam(i), name: teams[i]?.name || `Team ${i + 1}` }));
    for (let i = 0; i < take; i++) next[i % numTeams].players.push(shuffled[i].id);
    commit(next);
    setGenOpen(false);
    toast({ title: "Teams shuffled", description: `${numTeams} teams made from ${take} players.${take < players.length ? ` ${players.length - take} on the bench.` : ""}` });
  };

  const renameTeam = (i: number) => {
    const name = names[i]?.trim();
    if (!name) {
      setNames(teams.map((t) => t.name));
      toast({ title: "Name needed", description: "A team name cannot be empty.", variant: "destructive" });
      return;
    }
    if (name === teams[i].name) return;
    if (teams.some((t, j) => j !== i && t.name.toLowerCase() === name.toLowerCase())) {
      setNames(teams.map((t) => t.name));
      toast({ title: "Name taken", description: "Two teams cannot share a name.", variant: "destructive" });
      return;
    }
    commit(teams.map((t, j) => (j === i ? { ...t, name } : t)));
  };

  const saveTeams = async () => {
    const all = teams.flatMap((t) => t.players);
    if (new Set(all).size !== all.length) {
      toast({ title: "Check the teams", description: "A player cannot be in two teams.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { data: existing, error: fetchError } = await supabase.from("team_assignments").select("id").eq("match_id", match.id).maybeSingle();
      if (fetchError && fetchError.code !== "PGRST116") throw fetchError;
      const row = { match_id: match.id, super_code: match.super_code, teams, is_public: isPublic };
      const { error } = existing
        ? await supabase.from("team_assignments").update(row).eq("id", existing.id)
        : await supabase.from("team_assignments").insert(row);
      if (error) throw error;
      toast({ title: "Teams saved", description: "Everyone sees the latest line ups." });
    } catch (e) {
      console.error("Error saving teams:", e);
      toast({ title: "Not saved", description: "Check your connection and try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const togglePublic = async (next: boolean) => {
    setIsPublic(next);
    try {
      const { data: existing, error: fetchError } = await supabase.from("team_assignments").select("id").eq("match_id", match.id).maybeSingle();
      if (fetchError && fetchError.code !== "PGRST116") throw fetchError;
      const { error } = existing
        ? await supabase.from("team_assignments").update({ is_public: next }).eq("id", existing.id)
        : await supabase.from("team_assignments").insert({ is_public: next, match_id: match.id, super_code: match.super_code, teams });
      if (error) throw error;
      toast({ title: next ? "Highlights are public" : "Highlights are private", description: next ? "Anyone with the link can see teams and the score." : "Only you can see teams and the score." });
    } catch (e) {
      console.error("Error updating privacy:", e);
      setIsPublic(!next);
      toast({ title: "Not changed", description: "Could not update who can see this match.", variant: "destructive" });
    }
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    setHistoryIndex(historyIndex - 1);
    setTeams(history[historyIndex - 1]);
  };
  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    setHistoryIndex(historyIndex + 1);
    setTeams(history[historyIndex + 1]);
  };

  const applyRule = async () => {
    const tpl = RULE_TEMPLATES.find((r) => r.name === rule);
    if (!tpl) {
      toast({ title: "Pick a rule set", description: "Choose one of the templates first.", variant: "destructive" });
      return;
    }
    setApplying(true);
    try {
      const { data, error: readError } = await supabase.from("matches").select("analytics").eq("id", match.id).maybeSingle();
      if (readError) throw readError;
      const current = (data?.analytics && typeof data.analytics === "object" ? data.analytics : {}) as Record<string, unknown>;
      const { error } = await supabase
        .from("matches")
        .update({ analytics: { ...current, rules: { name: tpl.name, text: tpl.text, applied_at: new Date().toISOString() } } })
        .eq("id", match.id);
      if (error) throw error;
      setAppliedRule(tpl);
      setRulesOpen(false);
      toast({ title: "Rules applied", description: `${tpl.name} rules are set for this match.` });
    } catch (e) {
      console.error("Error applying rule:", e);
      toast({ title: "Rules not applied", description: "Please try again.", variant: "destructive" });
    } finally {
      setApplying(false);
    }
  };

  const when = !isNaN(matchStart.getTime()) ? format(matchStart, "EEE d MMM, h:mm a") : match.match_date;
  const movingPlayer = players.find((p) => p.id === moving);

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-3xl p-[18px] flex flex-col gap-3">
        <span className="text-xl font-extrabold tracking-[-0.02em] line-clamp-2">{match.title}</span>
        <div className="flex flex-col gap-1.5 text-sm text-sc-ink2">
          <span className="flex items-center gap-2"><Calendar size={15} /> {when}</span>
          <span className="flex items-center gap-2"><MapPin size={15} /> {match.venue || "Venue not set"}</span>
          <span className="flex items-center gap-2"><Users size={15} /> {players.length} players · {teams.length} teams</span>
        </div>
      </div>

      <Segmented
        value={mode}
        onChange={(v) => setMode(v as "automatic" | "manual")}
        options={[
          { value: "automatic", label: <span className="inline-flex items-center gap-1.5"><Shuffle size={15} /> Auto</span> },
          { value: "manual", label: <span className="inline-flex items-center gap-1.5"><ArrowRightLeft size={15} /> Manual</span> },
        ]}
      />
      <p className="m-0 -mt-2 px-1 text-[13px] text-sc-ink3">
        {mode === "automatic" ? "Shuffle players into fair teams in one tap." : "Tap Move on a player, or drag them, to pick the teams yourself."}
      </p>

      <div className="grid grid-cols-4 gap-2">
        <button type="button" onClick={() => setGenOpen(true)} className="col-span-2 h-12 rounded-full bg-sc-ink text-white font-bold text-sm inline-flex items-center justify-center gap-2"><Shuffle size={17} /> {teams.some((t) => t.players.length) ? "Reshuffle" : "Make teams"}</button>
        <button type="button" onClick={undo} disabled={historyIndex <= 0} aria-label="Undo" className="h-12 rounded-full bg-white text-sc-ink inline-flex items-center justify-center disabled:opacity-40"><Undo2 size={18} /></button>
        <button type="button" onClick={redo} disabled={historyIndex >= history.length - 1} aria-label="Redo" className="h-12 rounded-full bg-white text-sc-ink inline-flex items-center justify-center disabled:opacity-40"><Redo2 size={18} /></button>
      </div>

      {players.length === 0 ? (
        <div className="bg-white rounded-3xl">
          <EmptyState icon={Users} sport="football" title="No players yet" subtitle="Teams appear here once players join the match." />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {teams.map((team, i) => (
            <TeamCard
              key={`${i}-${team.name}`}
              team={team}
              index={i}
              players={players}
              manual={mode === "manual"}
              nameValue={names[i] ?? team.name}
              onNameChange={(v) => setNames((prev) => prev.map((n, j) => (j === i ? v : n)))}
              onNameCommit={() => renameTeam(i)}
              onDropPlayer={(pid) => movePlayer(pid, team.name)}
              onMovePlayer={(pid) => setMoving(pid)}
            />
          ))}
        </div>
      )}

      {bench.length > 0 && (
        <div className="bg-white rounded-3xl p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-base font-extrabold">On the bench</span>
            <Pill sport="tennis">{bench.length}</Pill>
          </div>
          <div className="flex flex-col divide-y divide-sc-line">
            {bench.map((p) => (
              <PlayerRow key={p.id} player={p} teamName="__bench" color="#9CA3AF" manual onMove={() => setMoving(p.id)} />
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl p-4 flex items-center gap-3">
        <Bubble icon={Eye} sport="guide" size={42} />
        <span className="flex-1 flex flex-col">
          <span className="text-[15px] font-bold">Public highlights</span>
          <span className="text-[13px] text-sc-ink3">{isPublic ? "Anyone with the link can follow teams and the score" : "Only you can see teams and the score"}</span>
        </span>
        <Switch checked={isPublic} onCheckedChange={togglePublic} aria-label="Public highlights" />
      </div>

      <button type="button" onClick={() => setRulesOpen(true)} className="bg-white rounded-3xl p-4 flex items-center gap-3 text-left">
        <Bubble icon={BookOpen} sport="venue" size={42} />
        <span className="flex-1 min-w-0 flex flex-col">
          <span className="text-[15px] font-bold">{appliedRule ? appliedRule.name : "Match rules"}</span>
          <span className="text-[13px] text-sc-ink3 line-clamp-2">{appliedRule ? appliedRule.text : "Pick a rule set so everyone plays the same game"}</span>
        </span>
        <span className="text-sm font-bold text-sc-green-dark shrink-0">{appliedRule ? "Change" : "Apply"}</span>
      </button>

      <ScButton icon={saving ? undefined : Save} onClick={saveTeams} disabled={saving || players.length === 0}>
        {saving ? <Loader2 size={18} className="animate-spin" /> : "Save teams"}
      </ScButton>

      {/* Make or reshuffle teams */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className={sheet}>
          <div className="flex flex-col items-center text-center gap-2">
            <span className="w-12 h-12 rounded-full bg-sc-ink text-white flex items-center justify-center"><Shuffle size={22} /></span>
            <DialogTitle className="text-xl font-extrabold">Shuffle teams</DialogTitle>
            <DialogDescription className="text-sm text-sc-ink2">{players.length} players will be split at random. Anyone left over goes to the bench.</DialogDescription>
          </div>
          {started && (
            <p className="m-0 text-xs font-bold text-sport-tennis-fg bg-sport-tennis-bg rounded-2xl p-3">This match has already kicked off. Reshuffling changes the teams people are playing in.</p>
          )}
          <Stepper label="Teams" value={numTeams} min={2} max={10} onChange={setNumTeams} />
          <Stepper label="Players per team" value={perTeam} min={1} max={20} onChange={setPerTeam} />
          <ScButton onClick={generate} icon={Shuffle}>Shuffle now</ScButton>
        </DialogContent>
      </Dialog>

      {/* Move one player */}
      <Dialog open={!!moving} onOpenChange={(v) => !v && setMoving(null)}>
        <DialogContent className={sheet}>
          <DialogTitle className="text-xl font-extrabold text-center">Move {movingPlayer?.player_name || "player"}</DialogTitle>
          <DialogDescription className="text-sm text-sc-ink2 text-center">Pick the team they should play for.</DialogDescription>
          <div className="flex flex-col gap-2">
            {teams.map((t, i) => {
              const here = t.players.includes(moving || "");
              return (
                <button key={`${i}-${t.name}`} type="button" disabled={here} onClick={() => moving && movePlayer(moving, t.name)} className="h-14 px-4 rounded-2xl bg-white flex items-center gap-3 text-left disabled:opacity-50">
                  <span className="w-3 h-8 rounded-full" style={{ background: teamColor(i) }} />
                  <span className="flex-1 font-bold">{t.name}</span>
                  <span className="text-xs text-sc-ink3">{here ? "Current team" : `${t.players.length} players`}</span>
                </button>
              );
            })}
            {assigned.has(moving || "") && (
              <button type="button" onClick={() => moving && movePlayer(moving, null)} className="h-12 rounded-2xl bg-sc-soft font-bold text-sm">Send to the bench</button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Rules */}
      <Dialog open={rulesOpen} onOpenChange={setRulesOpen}>
        <DialogContent className={sheet}>
          <div className="flex flex-col items-center text-center gap-2">
            <span className="w-12 h-12 rounded-full bg-sport-venue-bg text-sport-venue-fg flex items-center justify-center"><BookOpen size={22} /></span>
            <DialogTitle className="text-xl font-extrabold">Match rules</DialogTitle>
            <DialogDescription className="text-sm text-sc-ink2">Players see these on the match highlights.</DialogDescription>
          </div>
          <div className="flex flex-col gap-2" role="radiogroup">
            {RULE_TEMPLATES.map((r) => {
              const on = rule === r.name;
              return (
                <button key={r.name} type="button" role="radio" aria-checked={on} onClick={() => setRule(r.name)} className={`rounded-2xl p-3.5 text-left flex gap-3 items-start bg-white ${on ? "ring-2 ring-sc-green" : ""}`}>
                  <span className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${on ? "bg-sc-green border-sc-green text-white" : "border-sc-line"}`}>{on && <Check size={12} strokeWidth={3} />}</span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[15px] font-bold">{r.name}</span>
                    <span className="text-[13px] text-sc-ink3 leading-5">{r.text}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <ScButton onClick={applyRule} disabled={!rule || applying}>{applying ? <Loader2 size={18} className="animate-spin" /> : "Apply rules"}</ScButton>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamMatchDetails;
