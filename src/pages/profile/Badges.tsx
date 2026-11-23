import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Award, DollarSign, Lock, Map, MapPin, Medal, Share2, Star, Trophy, UserPlus, Users, LucideIcon } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Seo } from "@/components/Seo";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, NavHeader, Progress, Screen, SPORT, Sport } from "@/components/sc/ui";
import { BadgesSkeleton } from "@/components/sc/skeletons";

type Badge = { id: string; name: string; description: string | null; icon: string | null; earned_at?: string | null };

const ICONS: Record<string, LucideIcon> = { UserPlus, Users, MapPin, Star, Map, Award, DollarSign, Trophy, Medal };
const TONES: Sport[] = ["football", "guide", "venue", "tennis", "cycling", "red", "money", "pink"];

const Badges = () => {
  const navigate = useNavigate();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        navigate("/auth", { replace: true });
        return;
      }
      try {
        const [{ data: all }, { data: mine }] = await Promise.all([
          supabase.from("badges").select("id, name, description, icon"),
          supabase.from("user_badges").select("badge_id, earned_at").eq("user_id", session.session.user.id),
        ]);
        setBadges(
          (all || []).map((b: Badge) => ({
            ...b,
            earned_at: (mine || []).find((m: { badge_id: string }) => m.badge_id === b.id)?.earned_at ?? null,
          }))
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate]);

  const earned = badges.filter((b) => b.earned_at).length;

  const share = async (b: Badge) => {
    const text = `I just earned the ${b.name} badge on SportCliq. ${b.description || ""} #SportCliq`;
    try {
      if (navigator.share) await navigator.share({ title: "SportCliq badge", text, url: window.location.origin });
      else await navigator.clipboard.writeText(text);
    } catch {
      /* user cancelled */
    }
  };

  return (
    <>
      <Seo title="Badges | Sport Cliq" description="Your SportCliq achievements." url={window.location.href} image={undefined} children={null} />
      <Screen>
        <NavHeader title="Badges" backTo="/profile" />
        <main className="px-5 pt-5 flex flex-col gap-4">
          {loading ? (
            <BadgesSkeleton />
          ) : badges.length === 0 ? (
            <EmptyState icon={Medal} sport="tennis" title="Badges are warming up" subtitle="Play, organise and host to start collecting badges. The first one is closer than you think." />
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <span className="text-[26px] font-extrabold tracking-[-0.03em]">
                  {earned} of {badges.length} earned
                </span>
                <Progress value={(earned * 100) / badges.length} height={10} />
                <span className="text-sm text-sc-ink3">
                  {earned === 0 ? "Your trophy cabinet is empty. Join a match to light it up." : earned === badges.length ? "Every badge collected. Legend status." : "Keep playing to unlock the rest."}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {badges.map((b, i) => {
                  const tone = SPORT[TONES[i % TONES.length]];
                  const Icon = (b.icon && ICONS[b.icon]) || Trophy;
                  const got = !!b.earned_at;
                  return (
                    <div key={b.id} className="bg-white rounded-3xl px-3 py-[18px] flex flex-col items-center gap-2.5 text-center">
                      <span
                        className="w-[72px] h-[72px] rounded-full flex items-center justify-center"
                        style={{
                          background: got ? tone.solid : "#E6E9E3",
                          color: got ? tone.onSolid : "#9AA19C",
                          boxShadow: got ? `0 0 0 6px ${tone.bg}` : "none",
                        }}
                      >
                        {got ? <Icon size={32} /> : <Lock size={28} />}
                      </span>
                      <span className="text-sm font-extrabold">{b.name}</span>
                      <span className="text-xs text-sc-ink3 font-semibold leading-4">
                        {got ? `Earned ${new Date(b.earned_at as string).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : b.description}
                      </span>
                      {got && (
                        <button type="button" onClick={() => share(b)} className="h-8 px-3 rounded-full bg-sc-soft text-xs font-bold flex items-center gap-1.5">
                          <Share2 size={14} /> Share
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </main>
        <Navbar />
      </Screen>
    </>
  );
};

export default Badges;
