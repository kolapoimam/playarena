import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Twitter,
  Facebook,
  MessageCircle,
  Copy,
} from "lucide-react";

import { BackButton } from "@/components/sc/ui";
import { NavHeader, FunEmpty, EmptyState, formatTime12 } from "@/components/sc/ui";
import { teamColor } from "@/lib/teamColors";
import { Sparkles } from "lucide-react";
import { DetailSkeleton } from "@/components/sc/skeletons";
type MatchHighlight = {
  match_id: string;
  title: string;
  match_date: string;
  match_time: string;
  venue?: string;
  teams: {
    name: string;
    score: number;
    analytics: {
      possession: number;
      shots: number;
      fouls: number;
      yellow_cards: number;
      red_cards: number;
    };
  }[];
  events: {
    id: string;
    type: string;
    team_name: string;
    minute: number;
    description: string;
  }[];
};

/** A plain header for the public page. No back button and no app navigation. */
function PublicHeader() {
  return (
    <header className="px-5 pt-[max(env(safe-area-inset-top),1rem)]">
      <div className="max-w-2xl mx-auto pt-3 flex items-center justify-between gap-3">
        <a href="/" aria-label="SportCliq"><img src="/brand/sportcliq-wordmark.png" alt="SportCliq" className="h-7 w-auto" /></a>
        <a href="/" className="h-10 px-4 rounded-full bg-sc-ink text-white text-sm font-extrabold inline-flex items-center">Open SportCliq</a>
      </div>
    </header>
  );
}

const MatchHighlights = () => {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [highlight, setHighlight] = useState<MatchHighlight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHighlight = async () => {
      if (!slug) {
        toast({
          title: "Error",
          description: "Invalid share link.",
          variant: "destructive",
        });
        return;
      }

      try {
        const { data, error } = await supabase
          .rpc("get_match_highlights_by_slug", { p_slug: slug })
          .select(`
            match_id,
            title,
            match_date::text,
            match_time::text,
            teams,
            events
          `);

        if (error) throw error;
        if (!data || data.length === 0) {
          // The empty state explains this, no toast needed
          return;
        }

        setHighlight(data[0]);
      } catch (error) {
        console.error("Error fetching highlights:", error);
        toast({
          title: "Error",
          description: "Failed to load match highlights.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchHighlight();
  }, [slug, toast]);

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!highlight) {
    return (
      <div className="min-h-screen bg-sc-bg">
        <PublicHeader />
        <div className="px-5 pt-4">
          <FunEmpty
            icon={Sparkles}
            sport="tennis"
            title="No highlights yet"
            body="The organiser has not shared highlights for this match. Goals, assists and the man of the match land here once they do."
            primary={{ label: "See the match", onClick: () => { window.location.href = `/match/${slug}`; } }}
          />
        </div>
      </div>
    );
  }

  const teams = Array.isArray(highlight.teams) ? highlight.teams : [];
  const events = (Array.isArray(highlight.events) ? highlight.events : []).slice().sort((x, y) => y.minute - x.minute);
  const shareUrl = `${window.location.origin}/highlights/${slug}`;
  const LABEL: Record<string, { label: string; bg: string; fg: string }> = {
    goal: { label: "Goal", bg: "#DCFCE7", fg: "#15803D" },
    shot: { label: "Shot", bg: "#DBEAFE", fg: "#1D4ED8" },
    foul: { label: "Foul", bg: "#EEF0EB", fg: "#4A524D" },
    yellow_card: { label: "Yellow card", bg: "#FEF9C3", fg: "#854D0E" },
    red_card: { label: "Red card", bg: "#FEE2E2", fg: "#B91C1C" },
    substitution: { label: "Sub", bg: "#EDE9FE", fg: "#6D28D9" },
  };
  const time = formatTime12(String(highlight.match_time || "").slice(0, 5));
  const date = highlight.match_date ? new Date(`${String(highlight.match_date).slice(0, 10)}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) : "";

  return (
    <div className="min-h-screen bg-sc-bg text-sc-ink pb-12">
      <PublicHeader />
      <main className="max-w-2xl mx-auto px-4 pt-2 flex flex-col gap-4">
        <div className="bg-sc-ink text-white rounded-3xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold tracking-[0.14em] text-[#BEF264]">MATCH HIGHLIGHTS</span>
            <span className="text-xs font-bold text-white/60">{[date, time].filter(Boolean).join(" · ")}</span>
          </div>
          <span className="text-2xl font-extrabold tracking-[-0.02em] leading-7">{highlight.title}</span>
          {highlight.venue && <span className="-mt-3 text-sm text-white/70">{highlight.venue}</span>}
          {teams.length === 0 ? (
            <span className="text-sm text-white/70">Teams have not been set yet.</span>
          ) : (
            <div className="flex flex-col gap-2.5">
              {teams.map((t, i) => (
                <div key={`${i}-${t.name}`} className="flex items-center gap-3">
                  <span className="w-2.5 h-9 rounded-full" style={{ background: teamColor(i) }} />
                  <span className="flex-1 min-w-0 text-base font-extrabold truncate">{t.name}</span>
                  <span className="text-[34px] leading-none font-extrabold tabular-nums">{t.score || 0}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl p-[18px] flex flex-col gap-1">
          <span className="text-base font-extrabold mb-1">Key moments</span>
          {events.length === 0 ? (
            <EmptyState icon={Sparkles} sport="tennis" title="No moments yet" subtitle="Goals, shots and cards show up here as the organiser records them." />
          ) : (
            <div className="flex flex-col divide-y divide-sc-line">
              {events.map((e) => {
                const m = LABEL[e.type] || LABEL.foul;
                const ti = teams.findIndex((t) => t.name === e.team_name);
                return (
                  <div key={e.id} className="py-3 flex items-center gap-3">
                    <span className="w-10 text-center text-sm font-extrabold text-sc-ink3 tabular-nums">{e.minute}'</span>
                    <span className="h-7 px-2.5 rounded-full text-xs font-extrabold inline-flex items-center shrink-0" style={{ background: m.bg, color: m.fg }}>{m.label}</span>
                    <span className="flex-1 min-w-0 text-sm font-bold truncate">{e.description || e.team_name}</span>
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ti >= 0 ? teamColor(ti) : "#9CA3AF" }} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {teams.length > 0 && (
          <div className="bg-white rounded-3xl p-[18px] flex flex-col gap-3.5">
            <span className="text-base font-extrabold">Team stats</span>
            {teams.map((t, i) => (
              <div key={`${i}-${t.name}`} className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm font-bold">
                  <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: teamColor(i) }} />{t.name}</span>
                  <span className="text-sc-ink3">{t.analytics?.possession ?? 50}% possession</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[["Shots", t.analytics?.shots], ["Fouls", t.analytics?.fouls], ["Yellow", t.analytics?.yellow_cards], ["Red", t.analytics?.red_cards]].map(([k, v]) => (
                    <div key={k as string} className="bg-sc-soft rounded-xl py-2 flex flex-col items-center">
                      <span className="text-base font-extrabold tabular-nums">{(v as number) ?? 0}</span>
                      <span className="text-[11px] font-bold text-sc-ink3">{k}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-3xl p-[18px] flex flex-col gap-3">
          <span className="text-base font-extrabold">Share the highlights</span>
          <div className="grid grid-cols-4 gap-2">
            <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${highlight.title} on SportCliq ${shareUrl}`)}`} target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp" className="h-14 rounded-2xl bg-sc-soft flex items-center justify-center text-[#16A34A]"><MessageCircle size={22} /></a>
            <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`${highlight.title} on @SportCliq`)}`} target="_blank" rel="noopener noreferrer" aria-label="Share on X" className="h-14 rounded-2xl bg-sc-soft flex items-center justify-center"><Twitter size={22} /></a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook" className="h-14 rounded-2xl bg-sc-soft flex items-center justify-center text-[#1D4ED8]"><Facebook size={22} /></a>
            <button
              type="button"
              aria-label="Copy link"
              onClick={async () => {
                try { await navigator.clipboard.writeText(shareUrl); toast({ title: "Link copied" }); }
                catch { toast({ title: "Could not copy", description: shareUrl, variant: "destructive" }); }
              }}
              className="h-14 rounded-2xl bg-sc-soft flex items-center justify-center"
            >
              <Copy size={22} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MatchHighlights;
