import { useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Copy, Download, Facebook, Goal, Loader2, MessageCircle, Minus, Plus, Share2, ShieldAlert, Target, Twitter, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { format, differenceInMinutes } from "date-fns";
import { EmptyState, ScButton, Segmented } from "@/components/sc/ui";
import { downloadElementAsPng } from "@/components/sc/TicketCard";
import { teamColor } from "@/lib/teamColors";

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
type TeamRanking = { name: string; goals: number; points: number; yellow_cards: number; red_cards: number; fouls: number; shots: number };

const EVENT_META: Record<MatchEvent["type"], { label: string; bg: string; fg: string }> = {
  goal: { label: "Goal", bg: "#DCFCE7", fg: "#15803D" },
  shot: { label: "Shot", bg: "#DBEAFE", fg: "#1D4ED8" },
  foul: { label: "Foul", bg: "#EEF0EB", fg: "#4A524D" },
  yellow_card: { label: "Yellow card", bg: "#FEF9C3", fg: "#854D0E" },
  red_card: { label: "Red card", bg: "#FEE2E2", fg: "#B91C1C" },
  substitution: { label: "Sub", bg: "#EDE9FE", fg: "#6D28D9" },
};

/** Team stats from the recorded events. Goals come from the scoreboard. */
const generateAnalyticsAndRankings = (events: MatchEvent[], teams: Team[]): { updatedTeams: Team[]; rankings: TeamRanking[] } => {
  const updatedTeams = teams.map((team) => ({ ...team, analytics: { possession: 50, shots: 0, fouls: 0, yellow_cards: 0, red_cards: 0 } }));
  const stats: Record<string, TeamRanking> = {};
  teams.forEach((t) => (stats[t.name] = { name: t.name, goals: t.score || 0, points: 0, yellow_cards: 0, red_cards: 0, fouls: 0, shots: 0 }));
  const actions: Record<string, number> = {};
  teams.forEach((t) => (actions[t.name] = 0));

  events.forEach((e) => {
    const team = updatedTeams.find((t) => t.name === e.team_name);
    const s = stats[e.team_name];
    if (!team || !s) return;
    if (e.type === "yellow_card") { team.analytics.yellow_cards++; s.yellow_cards++; }
    if (e.type === "red_card") { team.analytics.red_cards++; s.red_cards++; }
    if (e.type === "foul") { team.analytics.fouls++; s.fouls++; }
    if (e.type === "shot") { team.analytics.shots++; s.shots++; }
    if (["goal", "shot", "foul"].includes(e.type)) actions[e.team_name]++;
  });

  // A simple possession estimate from attacking actions, nudged by the score
  const totalActions = Object.values(actions).reduce((a, b) => a + b, 0);
  const totalScore = teams.reduce((a, t) => a + (t.score || 0), 0);
  updatedTeams.forEach((t) => {
    let p = totalActions > 0 ? (actions[t.name] / totalActions) * 100 : 100 / Math.max(1, teams.length);
    if (totalScore > 0) p = Math.min(80, Math.max(20, p + ((t.score || 0) / totalScore) * 10 - 5));
    t.analytics.possession = Math.round(p);
  });

  // 3 points for a win, 1 for a draw against the other teams, cards cost points
  Object.values(stats).forEach((s) => {
    teams.forEach((o) => {
      if (o.name === s.name) return;
      if (s.goals > (o.score || 0)) s.points += 3;
      else if (s.goals === (o.score || 0)) s.points += 1;
    });
    s.points -= s.red_cards * 2 + s.yellow_cards * 0.5;
  });
  const rankings = Object.values(stats).sort((a, b) => b.points - a.points || b.goals - a.goals || a.red_cards - b.red_cards);
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
  const exportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [eventType, setEventType] = useState<MatchEvent["type"] | null>(null);
  const [eventTeam, setEventTeam] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [view, setView] = useState<"live" | "stats">("live");
  const { updatedTeams, rankings } = generateAnalyticsAndRankings(events, teams);

  const start = new Date(`${match.match_date}T${match.match_time}`);
  const minuteNow = () => {
    if (isNaN(start.getTime())) return 0;
    return Math.max(0, Math.min(150, differenceInMinutes(new Date(), start)));
  };
  const nameOf = (id?: string) => players.find((p) => p.id === id)?.player_name;
  const shareUrl = `${window.location.origin}/highlights/${match.slug}`;

  const persist = async (next: Team[], quiet = false) => {
    try {
      const { data: existing, error: fetchError } = await supabase.from("team_assignments").select("id").eq("match_id", match.id).maybeSingle();
      if (fetchError && fetchError.code !== "PGRST116") throw fetchError;
      const row = { match_id: match.id, super_code: match.super_code, teams: next, is_public: isPublic };
      const { error } = existing
        ? await supabase.from("team_assignments").update(row).eq("id", existing.id)
        : await supabase.from("team_assignments").insert(row);
      if (error) throw error;
      if (!quiet) toast({ title: "Score saved" });
    } catch (e) {
      console.error("Error saving score:", e);
      toast({ title: "Score not saved", description: "Check your connection and try again.", variant: "destructive" });
    }
  };

  const changeScore = (teamName: string, delta: number) => {
    const team = teams.find((t) => t.name === teamName);
    if (!team) return;
    const score = Math.max(0, Math.min(29, (team.score || 0) + delta));
    if (score === team.score) return;
    const { updatedTeams: next } = generateAnalyticsAndRankings(events, teams.map((t) => (t.name === teamName ? { ...t, score } : t)));
    setTeams(next);
    addToHistory(next);
    persist(next, true);
  };

  const openEvent = (type: MatchEvent["type"]) => {
    if (teams.length === 0) {
      toast({ title: "Make teams first", description: "Events are recorded against a team.", variant: "destructive" });
      return;
    }
    setEventType(type);
    setEventTeam(teams.length === 2 ? null : null);
  };

  const record = async (teamName: string, playerId?: string) => {
    if (!eventType) return;
    setRecording(true);
    const who = nameOf(playerId);
    const newEvent: MatchEvent = {
      id: crypto.randomUUID(),
      match_id: match.id,
      type: eventType,
      team_name: teamName,
      ...(playerId ? { player_id: playerId } : {}),
      minute: minuteNow(),
      description: `${EVENT_META[eventType].label}${who ? ` by ${who}` : ""} for ${teamName}`,
    };
    try {
      const { error } = await supabase.from("match_events").insert(newEvent);
      if (error) throw error;
      const nextEvents = [...events, newEvent];
      setEvents(nextEvents);
      // A goal also goes on the scoreboard
      const scored = eventType === "goal" ? teams.map((t) => (t.name === teamName ? { ...t, score: Math.min(29, (t.score || 0) + 1) } : t)) : teams;
      const { updatedTeams: next } = generateAnalyticsAndRankings(nextEvents, scored);
      setTeams(next);
      addToHistory(next);
      if (eventType === "goal") persist(next, true);
      toast({ title: `${EVENT_META[eventType].label} recorded`, description: newEvent.description });
      setEventType(null);
      setEventTeam(null);
    } catch (e) {
      console.error("Error adding event:", e);
      toast({ title: "Not recorded", description: "Check your connection and try again.", variant: "destructive" });
    } finally {
      setRecording(false);
    }
  };

  const exportReport = async () => {
    if (!exportRef.current) return;
    if (teams.length === 0) {
      toast({ title: "Nothing to export yet", description: "Make teams and record the score first.", variant: "destructive" });
      return;
    }
    setIsExporting(true);
    try {
      await downloadElementAsPng(exportRef.current, `SportCliq-report-${match.slug}.png`);
      toast({ title: "Report saved", description: "Share it in your group chat." });
    } catch (e) {
      console.error("Error exporting report:", e);
      toast({ title: "Export failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const openShare = () => {
    if (!isPublic) {
      toast({ title: "Highlights are private", description: "Turn on Public highlights in the Teams tab, then share.", variant: "destructive" });
      return;
    }
    setShareOpen(true);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "Link copied" });
    } catch {
      toast({ title: "Could not copy", description: shareUrl, variant: "destructive" });
    }
  };

  const eventsDesc = [...events].sort((a, b) => b.minute - a.minute);
  const teamPlayers = (name: string) => (teams.find((t) => t.name === name)?.players || []).map((id) => players.find((p) => p.id === id)).filter(Boolean) as Player[];
  const generated = format(new Date(), "d MMM yyyy, h:mm a");

  return (
    <div className="flex flex-col gap-4">
      {/* Scoreboard */}
      <div className="bg-sc-ink text-white rounded-3xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-[0.14em] text-[#BEF264]">SCOREBOARD</span>
          <span className="text-xs font-bold text-white/60">{minuteNow() > 0 ? `${minuteNow()}'` : "Not started"}</span>
        </div>
        {teams.length === 0 ? (
          <p className="m-0 text-sm text-white/70">Make teams to start keeping score.</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {teams.map((t, i) => (
              <div key={`${i}-${t.name}`} className="flex items-center gap-3">
                <span className="w-2.5 h-9 rounded-full shrink-0" style={{ background: teamColor(i) }} />
                <span className="flex-1 min-w-0 text-base font-extrabold truncate">{t.name}</span>
                <button type="button" aria-label={`Take a goal off ${t.name}`} onClick={() => changeScore(t.name, -1)} disabled={!t.score} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center disabled:opacity-30"><Minus size={18} /></button>
                <span className="w-10 text-center text-[34px] leading-none font-extrabold tabular-nums">{t.score || 0}</span>
                <button type="button" aria-label={`Add a goal for ${t.name}`} onClick={() => changeScore(t.name, 1)} className="w-10 h-10 rounded-full bg-[#BEF264] text-sc-ink flex items-center justify-center"><Plus size={18} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Record */}
      <div className="bg-white rounded-3xl p-[18px] flex flex-col gap-3">
        <span className="text-base font-extrabold">Record a moment</span>
        <div className="grid grid-cols-5 gap-2">
          {(["goal", "shot", "foul", "yellow_card", "red_card"] as const).map((type) => {
            const m = EVENT_META[type];
            const Icon = type === "goal" ? Goal : type === "shot" ? Target : type === "foul" ? ShieldAlert : null;
            return (
              <button key={type} type="button" onClick={() => openEvent(type)} className="h-[72px] rounded-2xl flex flex-col items-center justify-center gap-1.5 active:scale-[0.97] transition-transform" style={{ background: m.bg, color: m.fg }}>
                {Icon ? <Icon size={20} /> : <span className="w-3.5 h-5 rounded-[3px]" style={{ background: type === "yellow_card" ? "#FACC15" : "#EF4444" }} />}
                <span className="text-[11px] font-extrabold">{type === "yellow_card" ? "Yellow" : type === "red_card" ? "Red" : m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <Segmented value={view} onChange={(v) => setView(v as "live" | "stats")} options={[{ value: "live", label: "Timeline" }, { value: "stats", label: "Stats" }]} />

      {view === "live" ? (
        <div className="bg-white rounded-3xl p-[18px]">
          {eventsDesc.length === 0 ? (
            <EmptyState icon={Goal} sport="football" title="No moments yet" subtitle="Goals, shots, fouls and cards you record show up here." />
          ) : (
            <div className="flex flex-col divide-y divide-sc-line">
              {eventsDesc.map((e) => {
                const m = EVENT_META[e.type] || EVENT_META.foul;
                const ti = teams.findIndex((t) => t.name === e.team_name);
                return (
                  <div key={e.id} className="py-3 flex items-center gap-3">
                    <span className="w-11 text-center text-sm font-extrabold text-sc-ink3 tabular-nums">{e.minute}'</span>
                    <span className="h-7 px-2.5 rounded-full text-xs font-extrabold inline-flex items-center" style={{ background: m.bg, color: m.fg }}>{m.label}</span>
                    <span className="flex-1 min-w-0 flex flex-col">
                      <span className="text-sm font-bold truncate">{nameOf(e.player_id) || e.team_name}</span>
                      {nameOf(e.player_id) && <span className="text-xs text-sc-ink3 truncate">{e.team_name}</span>}
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ti >= 0 ? teamColor(ti) : "#9CA3AF" }} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {updatedTeams.length === 0 ? (
            <div className="bg-white rounded-3xl"><EmptyState icon={Trophy} sport="tennis" title="No stats yet" subtitle="Make teams and record a few moments to see stats." /></div>
          ) : (
            <>
              <div className="bg-white rounded-3xl p-[18px] flex flex-col gap-3.5">
                <span className="text-base font-extrabold">Team stats</span>
                {updatedTeams.map((t, i) => (
                  <div key={`${i}-${t.name}`} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-sm font-bold">
                      <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: teamColor(i) }} />{t.name}</span>
                      <span className="text-sc-ink3">{t.analytics.possession}% possession</span>
                    </div>
                    <div className="h-2 rounded-full bg-sc-soft2 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${t.analytics.possession}%`, background: teamColor(i) }} /></div>
                    <div className="grid grid-cols-4 gap-2">
                      {[["Shots", t.analytics.shots], ["Fouls", t.analytics.fouls], ["Yellow", t.analytics.yellow_cards], ["Red", t.analytics.red_cards]].map(([k, v]) => (
                        <div key={k as string} className="bg-sc-soft rounded-xl py-2 flex flex-col items-center">
                          <span className="text-base font-extrabold tabular-nums">{v}</span>
                          <span className="text-[11px] font-bold text-sc-ink3">{k}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {rankings.length > 2 && (
                <div className="bg-white rounded-3xl p-[18px] flex flex-col gap-2">
                  <span className="text-base font-extrabold">Table</span>
                  {rankings.map((r, i) => (
                    <div key={r.name} className="flex items-center gap-3 py-1.5 text-sm">
                      <span className="w-6 font-extrabold text-sc-ink3">{i + 1}</span>
                      <span className="flex-1 font-bold truncate">{r.name}</span>
                      <span className="w-14 text-right text-sc-ink3">{r.goals} goals</span>
                      <span className="w-12 text-right font-extrabold">{Math.round(r.points * 10) / 10} pts</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="flex gap-2.5">
        <ScButton kind="dark" icon={isExporting ? undefined : Download} onClick={exportReport} disabled={isExporting}>{isExporting ? <Loader2 size={18} className="animate-spin" /> : "Save report"}</ScButton>
        <ScButton kind="primary" icon={Share2} onClick={openShare}>Share</ScButton>
      </div>

      {/* Pick team and player for an event */}
      <Dialog open={!!eventType} onOpenChange={(v) => { if (!v) { setEventType(null); setEventTeam(null); } }}>
        <DialogContent className="w-full max-w-[calc(100%-1.5rem)] sm:max-w-[420px] rounded-[28px] bg-sc-bg p-5 gap-4 max-h-[92vh] overflow-y-auto">
          <DialogTitle className="text-xl font-extrabold text-center">{eventType ? EVENT_META[eventType].label : ""}</DialogTitle>
          <DialogDescription className="text-sm text-sc-ink2 text-center">{eventTeam ? "Who was it? You can skip this." : "Which team?"}</DialogDescription>
          {!eventTeam ? (
            <div className="flex flex-col gap-2">
              {teams.map((t, i) => (
                <button key={`${i}-${t.name}`} type="button" onClick={() => setEventTeam(t.name)} className="h-14 px-4 rounded-2xl bg-white flex items-center gap-3 text-left font-bold">
                  <span className="w-3 h-8 rounded-full" style={{ background: teamColor(i) }} />{t.name}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {teamPlayers(eventTeam).map((p) => (
                <button key={p.id} type="button" disabled={recording} onClick={() => record(eventTeam, p.id)} className="h-12 px-4 rounded-2xl bg-white text-left font-bold text-sm disabled:opacity-50">{p.player_name}</button>
              ))}
              <ScButton kind="dark" onClick={() => record(eventTeam)} disabled={recording}>{recording ? <Loader2 size={18} className="animate-spin" /> : `Record for ${eventTeam}`}</ScButton>
              <button type="button" onClick={() => setEventTeam(null)} className="h-10 text-sm font-bold text-sc-ink3">Change team</button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Share */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="w-full max-w-[calc(100%-1.5rem)] sm:max-w-[420px] rounded-[28px] bg-sc-bg p-5 gap-4">
          <div className="flex flex-col items-center text-center gap-2">
            <span className="w-12 h-12 rounded-full bg-sc-green text-white flex items-center justify-center"><Share2 size={22} /></span>
            <DialogTitle className="text-xl font-extrabold">Share highlights</DialogTitle>
            <DialogDescription className="text-sm text-sc-ink2">Teams, score and every moment, live.</DialogDescription>
          </div>
          <div className="bg-white rounded-2xl px-4 py-3 text-sm font-bold break-all">{shareUrl}</div>
          <div className="grid grid-cols-4 gap-2">
            <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Follow ${match.title} on SportCliq ${shareUrl}`)}`} target="_blank" rel="noopener noreferrer" className="h-14 rounded-2xl bg-white flex items-center justify-center text-[#16A34A]" aria-label="Share on WhatsApp"><MessageCircle size={22} /></a>
            <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`${match.title} on @SportCliq`)}`} target="_blank" rel="noopener noreferrer" className="h-14 rounded-2xl bg-white flex items-center justify-center text-sc-ink" aria-label="Share on X"><Twitter size={22} /></a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="h-14 rounded-2xl bg-white flex items-center justify-center text-[#1D4ED8]" aria-label="Share on Facebook"><Facebook size={22} /></a>
            <button type="button" onClick={copyLink} className="h-14 rounded-2xl bg-white flex items-center justify-center text-sc-ink" aria-label="Copy link"><Copy size={22} /></button>
          </div>
        </DialogContent>
      </Dialog>

      {/* The report image, drawn off screen so it exports on any device */}
      <div aria-hidden="true" style={{ position: "fixed", left: -10000, top: 0, pointerEvents: "none" }}>
        <div ref={exportRef} style={{ width: 720, background: "#F4F5F1", padding: 36, fontFamily: "Satoshi, 'Plus Jakarta Sans', sans-serif", color: "#0E1411", borderRadius: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <img src="/brand/sportcliq-wordmark.png" alt="SportCliq" style={{ height: 34 }} crossOrigin="anonymous" />
            <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.12em", color: "#15803D" }}>MATCH REPORT</span>
          </div>
          <div style={{ marginTop: 24, fontSize: 34, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: "38px" }}>{match.title}</div>
          <div style={{ marginTop: 6, fontSize: 15, color: "#4A524D", fontWeight: 600 }}>
            {!isNaN(start.getTime()) ? format(start, "EEEE d MMMM yyyy, h:mm a") : match.match_date} · {match.venue}
          </div>
          <div style={{ marginTop: 22, background: "#0E1411", color: "#fff", borderRadius: 24, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
            {teams.map((t, i) => (
              <div key={`${i}-${t.name}`} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ width: 10, height: 34, borderRadius: 99, background: teamColor(i) }} />
                <span style={{ flex: 1, fontSize: 22, fontWeight: 800 }}>{t.name}</span>
                <span style={{ fontSize: 40, fontWeight: 900 }}>{t.score || 0}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 18, background: "#fff", borderRadius: 24, padding: "16px 22px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr repeat(5, 1fr)", fontSize: 12, fontWeight: 800, color: "#646C67", letterSpacing: "0.06em", paddingBottom: 8 }}>
              <span>TEAM</span><span>POSS</span><span>SHOTS</span><span>FOULS</span><span>YELLOW</span><span>RED</span>
            </div>
            {updatedTeams.map((t, i) => (
              <div key={`${i}-${t.name}`} style={{ display: "grid", gridTemplateColumns: "2fr repeat(5, 1fr)", fontSize: 16, fontWeight: 700, padding: "8px 0", borderTop: "1px solid #E3E6E0" }}>
                <span>{t.name}</span><span>{t.analytics.possession}%</span><span>{t.analytics.shots}</span><span>{t.analytics.fouls}</span><span>{t.analytics.yellow_cards}</span><span>{t.analytics.red_cards}</span>
              </div>
            ))}
          </div>
          {events.length > 0 && (
            <div style={{ marginTop: 18, background: "#fff", borderRadius: 24, padding: "16px 22px" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#646C67", letterSpacing: "0.06em", paddingBottom: 6 }}>KEY MOMENTS</div>
              {[...events].sort((a, b) => a.minute - b.minute).slice(0, 14).map((e) => (
                <div key={e.id} style={{ display: "flex", gap: 14, fontSize: 15, fontWeight: 600, padding: "6px 0" }}>
                  <span style={{ width: 40, fontWeight: 800, color: "#646C67" }}>{e.minute}'</span>
                  <span style={{ flex: 1 }}>{e.description}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "#646C67" }}>
            <span>Made on {generated}</span>
            <span>app.sportcliq.com · @SportCliq</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchReport;
