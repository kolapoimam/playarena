import { supabase } from "@/integrations/supabase/client";

export type EventType = "goal" | "yellow_card" | "red_card" | "foul" | "shot" | "substitution";
export type MatchEvent = {
  id: string;
  match_id: string;
  type: EventType;
  team_name: string;
  team_index?: number | null;
  player_id?: string | null;
  assist_player_id?: string | null;
  minute: number;
  description: string;
  created_at?: string;
};

/** The server functions are new. Until their SQL has been run, fall back to direct writes. */
const missingFn = (e: any) =>
  e?.code === "PGRST202" || e?.code === "42883" || /could not find the function|function .* does not exist/i.test(String(e?.message || ""));

/** A clear message for the organiser, never a vague network error. */
export function eventError(e: any): string {
  const m = String(e?.message || e || "");
  if (/wrong_super_code/.test(m)) return "Your super code does not match this match. Enter it again.";
  if (/match_cancelled/.test(m)) return "This match was cancelled, so moments can not be recorded.";
  if (/match_not_found/.test(m)) return "This match could not be found.";
  if (/minute/i.test(m) && /check|constraint/i.test(m)) return "That minute is outside the match. Pick a minute between 0 and 200.";
  if (/row-level security|permission denied|42501/i.test(m)) return "Recording is not allowed for this match yet. Ask SportCliq support to enable it.";
  if (/Failed to fetch|NetworkError|network/i.test(m)) return "Check your connection and try again.";
  return m || "Please try again.";
}

export async function saveEvent(superCode: string, ev: MatchEvent): Promise<MatchEvent> {
  const payload = { ...ev, player_id: ev.player_id || null, assist_player_id: ev.assist_player_id || null };
  const { data, error } = await supabase.rpc("save_match_event" as any, { p_super_code: superCode, p_event: payload } as any);
  if (!error) return (data as MatchEvent) || ev;
  if (!missingFn(error)) throw error;
  // Older database: only the original columns exist
  const base = { id: ev.id, match_id: ev.match_id, type: ev.type, team_name: ev.team_name, player_id: ev.player_id || null, minute: ev.minute, description: ev.description };
  const { error: e2 } = await supabase.from("match_events").upsert(base as any);
  if (e2) throw e2;
  return ev;
}

export async function deleteEvent(superCode: string, matchId: string, id: string) {
  const { error } = await supabase.rpc("delete_match_event" as any, { p_super_code: superCode, p_match_id: matchId, p_event_id: id } as any);
  if (!error) return;
  if (!missingFn(error)) throw error;
  const { error: e2 } = await supabase.from("match_events").delete().eq("id", id).eq("match_id", matchId);
  if (e2) throw e2;
}

export async function renameTeamEvents(superCode: string, matchId: string, oldName: string, newName: string, index: number) {
  const { error } = await supabase.rpc("rename_match_team" as any, { p_super_code: superCode, p_match_id: matchId, p_old: oldName, p_new: newName, p_index: index } as any);
  if (!error) return;
  if (!missingFn(error)) throw error;
  const { error: e2 } = await supabase.from("match_events").update({ team_name: newName } as any).eq("match_id", matchId).eq("team_name", oldName);
  if (e2) throw e2;
}

/** Keeps one copy of each event, newest version wins. */
export function mergeEvents(list: MatchEvent[], incoming: MatchEvent): MatchEvent[] {
  const i = list.findIndex((e) => e.id === incoming.id);
  if (i === -1) return [...list, incoming];
  const next = list.slice();
  next[i] = { ...next[i], ...incoming };
  return next;
}

/** The team an event belongs to, by name, then by its saved position. */
export function teamIndexOf(teams: { name: string }[], e: Pick<MatchEvent, "team_name" | "team_index">) {
  const byName = teams.findIndex((t) => t.name === e.team_name);
  if (byName >= 0) return byName;
  if (e.team_index != null && e.team_index >= 0 && e.team_index < teams.length) return e.team_index;
  return -1;
}
