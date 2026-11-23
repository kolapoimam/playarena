import { forwardRef, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Award, DollarSign, Download, Lock, Map, MapPin, Medal, Share2, Star, Trophy, UserPlus, Users, Sparkles, LucideIcon } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Seo } from "@/components/Seo";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FunEmpty, NavHeader, Progress, Screen } from "@/components/sc/ui";
import { BadgesSkeleton } from "@/components/sc/skeletons";
import { downloadElementAsPng } from "@/components/sc/TicketCard";
import { openExternal } from "@/components/sc/external";

type Badge = { id: string; name: string; description: string | null; icon: string | null; earned_at?: string | null };

const ICONS: Record<string, LucideIcon> = { UserPlus, Users, MapPin, Star, Map, Award, DollarSign, Trophy, Medal };

/* Each badge gets its own bold colour, picked from its icon so it stays stable. */
type Palette = { bg: string; deep: string; soft: string; ink: string; ring: string };
const PALETTES: Record<string, Palette> = {
  UserPlus: { bg: "#16A34A", deep: "#14532D", soft: "#DCFCE7", ink: "#FFFFFF", ring: "#86EFAC" },
  Users: { bg: "#2563EB", deep: "#1E3A8A", soft: "#DBEAFE", ink: "#FFFFFF", ring: "#93C5FD" },
  MapPin: { bg: "#F97316", deep: "#9A3412", soft: "#FFEDD5", ink: "#FFFFFF", ring: "#FDBA74" },
  Star: { bg: "#FACC15", deep: "#854D0E", soft: "#FEF9C3", ink: "#422006", ring: "#FDE68A" },
  Map: { bg: "#0D9488", deep: "#134E4A", soft: "#CCFBF1", ink: "#FFFFFF", ring: "#5EEAD4" },
  Award: { bg: "#7C3AED", deep: "#4C1D95", soft: "#EDE9FE", ink: "#FFFFFF", ring: "#C4B5FD" },
  DollarSign: { bg: "#059669", deep: "#064E3B", soft: "#D1FAE5", ink: "#FFFFFF", ring: "#6EE7B7" },
  Trophy: { bg: "#EAB308", deep: "#713F12", soft: "#FEF9C3", ink: "#422006", ring: "#FDE047" },
  Medal: { bg: "#DB2777", deep: "#831843", soft: "#FCE7F3", ink: "#FFFFFF", ring: "#F9A8D4" },
};
const FALLBACK: Palette[] = Object.values(PALETTES);
const paletteFor = (b: Badge, i: number) => (b.icon && PALETTES[b.icon]) || FALLBACK[i % FALLBACK.length];
const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export const badgeShareText = (b: Badge) =>
  [
    `New badge unlocked: ${b.name}!`,
    b.description ? `${b.description}.` : "",
    b.earned_at ? `Earned on ${fmt(b.earned_at)}.` : "",
    "Earn yours at app.sportcliq.com",
  ]
    .filter(Boolean)
    .join(" ")
    .replace("..", ".");

/* The card people save and post */
const BadgeCard = forwardRef<HTMLDivElement, { badge: Badge; p: Palette }>(function BadgeCard({ badge, p }, ref) {
  const Icon = (badge.icon && ICONS[badge.icon]) || Trophy;
  return (
    <div ref={ref} style={{ width: 320, borderRadius: 30, overflow: "hidden", background: p.bg, color: p.ink, position: "relative", fontFamily: "Satoshi, 'Plus Jakarta Sans', sans-serif" }}>
      <svg aria-hidden="true" width="320" height="420" viewBox="0 0 320 420" style={{ position: "absolute", inset: 0 }} fill="none">
        <circle cx="160" cy="150" r="150" fill={p.ink === "#FFFFFF" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.28)"} />
        <circle cx="160" cy="150" r="112" stroke={p.ink === "#FFFFFF" ? "rgba(255,255,255,0.18)" : "rgba(66,32,6,0.14)"} strokeWidth="2" strokeDasharray="4 8" />
        {[...Array(14)].map((_, i) => {
          const a = (i / 14) * Math.PI * 2;
          return <circle key={i} cx={160 + Math.cos(a) * 138} cy={150 + Math.sin(a) * 138} r={i % 3 ? 3 : 5} fill={p.ring} opacity="0.8" />;
        })}
      </svg>
      <div style={{ position: "relative", padding: "20px 22px 22px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div style={{ alignSelf: "stretch", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <img src={p.ink === "#FFFFFF" ? "/brand/sportcliq-wordmark-white.png" : "/brand/sportcliq-wordmark.png"} alt="SportCliq" style={{ height: 24, width: "auto" }} />
          <span style={{ height: 26, padding: "0 10px", borderRadius: 99, background: "rgba(255,255,255,0.22)", fontSize: 10.5, fontWeight: 800, letterSpacing: "0.12em", display: "inline-flex", alignItems: "center" }}>BADGE UNLOCKED</span>
        </div>
        {/* medal */}
        <div style={{ position: "relative", width: 168, height: 190, display: "flex", justifyContent: "center", marginTop: 6 }}>
          <div style={{ position: "absolute", bottom: 0, left: 46, width: 30, height: 70, background: p.deep, transform: "skewX(12deg)", borderRadius: "0 0 6px 6px" }} />
          <div style={{ position: "absolute", bottom: 0, right: 46, width: 30, height: 70, background: p.deep, transform: "skewX(-12deg)", borderRadius: "0 0 6px 6px" }} />
          <div style={{ position: "absolute", top: 0, width: 150, height: 150, borderRadius: "50%", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 18px 40px rgba(0,0,0,0.22)" }}>
            <div style={{ width: 120, height: 120, borderRadius: "50%", background: p.soft, border: `6px solid ${p.ring}`, display: "flex", alignItems: "center", justifyContent: "center", color: p.deep }}>
              <Icon size={54} strokeWidth={2} />
            </div>
          </div>
        </div>
        <div style={{ fontSize: 30, lineHeight: "32px", fontWeight: 900, letterSpacing: "-0.03em", textAlign: "center" }}>{badge.name}</div>
        {badge.description && <div style={{ fontSize: 14, lineHeight: "20px", fontWeight: 600, textAlign: "center", opacity: 0.88, maxWidth: 250 }}>{badge.description}</div>}
        {badge.earned_at && (
          <div style={{ height: 32, padding: "0 14px", borderRadius: 99, background: "rgba(0,0,0,0.16)", fontSize: 13, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 6 }}>
            Earned {fmt(badge.earned_at)}
          </div>
        )}
        <div style={{ alignSelf: "stretch", marginTop: 4, height: 48, borderRadius: 99, background: "#FFFFFF", color: "#0E1411", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800 }}>
          Earn yours at app.sportcliq.com
        </div>
      </div>
    </div>
  );
});

const Badges = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<{ b: Badge; p: Palette } | null>(null);
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

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
  const sorted = [...badges].sort((a, b) => Number(!!b.earned_at) - Number(!!a.earned_at));

  const save = async () => {
    if (!cardRef.current || !open) return;
    setBusy(true);
    try {
      await downloadElementAsPng(cardRef.current, `SportCliq-badge-${open.b.name}.png`);
    } catch {
      toast({ title: "Could not save the badge", description: "Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    if (!open) return;
    const text = badgeShareText(open.b);
    try {
      if (cardRef.current && navigator.share) {
        const html2canvas = (await import("html2canvas")).default;
        const canvas = await html2canvas(cardRef.current, { scale: 3, backgroundColor: null, useCORS: true });
        const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png", 1));
        const file = blob ? new File([blob], "sportcliq-badge.png", { type: "image/png" }) : null;
        const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
        if (file && nav.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], text, title: open.b.name });
          return;
        }
        await navigator.share({ text, title: open.b.name, url: "https://app.sportcliq.com" });
        return;
      }
      openExternal(`https://wa.me/?text=${encodeURIComponent(text)}`);
    } catch {
      /* cancelled */
    }
  };

  return (
    <>
      <Seo title="Badges | SportCliq" description="Your SportCliq achievements." url={window.location.href} image={undefined} children={null} />
      <Screen>
        <NavHeader title="Badges" backTo="/profile" />
        <main className="px-5 pt-5 pb-28 flex flex-col gap-4">
          {loading ? (
            <BadgesSkeleton />
          ) : badges.length === 0 ? (
            <FunEmpty icon={Medal} sport="tennis" title="Badges are warming up" body="Play, organise and host to start collecting badges. The first one is closer than you think." primary={{ label: "Find a match", onClick: () => navigate("/matches") }} />
          ) : (
            <>
              <div className="rounded-[28px] p-5 text-white relative overflow-hidden" style={{ background: "#0E1411" }}>
                <Sparkles className="absolute opacity-20" size={120} style={{ right: -18, top: -18 }} aria-hidden="true" />
                <span className="text-xs font-bold tracking-[0.12em] opacity-70">YOUR CABINET</span>
                <div className="text-[34px] leading-none font-extrabold tracking-[-0.03em] mt-2">
                  {earned}<span className="opacity-50"> / {badges.length}</span>
                </div>
                <div className="mt-3"><Progress value={(earned * 100) / badges.length} height={10} /></div>
                <span className="block mt-2.5 text-sm opacity-80">
                  {earned === 0 ? "Join a match to light it up." : earned === badges.length ? "Every badge collected. Legend status." : "Tap a badge to save it or share it."}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {sorted.map((b, i) => {
                  const p = paletteFor(b, i);
                  const Icon = (b.icon && ICONS[b.icon]) || Trophy;
                  const got = !!b.earned_at;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => got && setOpen({ b, p })}
                      disabled={!got}
                      aria-label={got ? `${b.name}, earned. Open to save or share` : `${b.name}, locked`}
                      className="relative rounded-[26px] p-4 pt-5 flex flex-col items-center gap-2.5 text-center overflow-hidden active:scale-[0.97] transition-transform disabled:active:scale-100"
                      style={{ background: got ? p.bg : "#FFFFFF", color: got ? p.ink : "#0E1411" }}
                    >
                      {got && <span aria-hidden="true" className="absolute -right-8 -top-8 w-28 h-28 rounded-full" style={{ background: "rgba(255,255,255,0.14)" }} />}
                      <span
                        className="relative w-[78px] h-[78px] rounded-full flex items-center justify-center"
                        style={{ background: got ? "#FFFFFF" : "#EEF0EA", boxShadow: got ? `0 0 0 6px ${p.ring}` : "none", color: got ? p.deep : "#9AA19C" }}
                      >
                        {got ? <Icon size={34} /> : <Lock size={28} />}
                      </span>
                      <span className="relative text-[15px] font-extrabold leading-5">{b.name}</span>
                      <span className={`relative text-xs font-semibold leading-4 ${got ? "opacity-85" : "text-sc-ink3"}`}>
                        {got ? `Earned ${new Date(b.earned_at as string).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : b.description}
                      </span>
                      {got && (
                        <span className="relative h-8 px-3 rounded-full text-xs font-bold flex items-center gap-1.5" style={{ background: "rgba(255,255,255,0.22)" }}>
                          <Share2 size={14} /> Save or share
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </main>
        <Navbar />
      </Screen>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="w-full max-w-[calc(100%-1.5rem)] sm:max-w-[400px] rounded-[28px] bg-sc-bg p-5 gap-4 max-h-[92vh] overflow-y-auto">
          <div className="flex flex-col gap-1 pr-6">
            <DialogTitle className="text-xl font-extrabold text-sc-ink">Show it off</DialogTitle>
            <DialogDescription className="text-sm text-sc-ink2">Save the badge as an image or share it with your crew.</DialogDescription>
          </div>
          {open && <div className="flex justify-center"><BadgeCard ref={cardRef} badge={open.b} p={open.p} /></div>}
          {open && <div className="bg-white rounded-3xl p-4 text-[13px] leading-5 text-sc-ink2">{badgeShareText(open.b)}</div>}
          <div className="flex gap-2.5">
            <button type="button" onClick={share} className="flex-1 h-[52px] rounded-full bg-sc-green text-white font-bold inline-flex items-center justify-center gap-2"><Share2 size={18} /> Share</button>
            <button type="button" onClick={save} disabled={busy} className="flex-1 h-[52px] rounded-full bg-white border border-sc-line text-sc-ink font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"><Download size={18} /> {busy ? "Saving..." : "Save PNG"}</button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Badges;
