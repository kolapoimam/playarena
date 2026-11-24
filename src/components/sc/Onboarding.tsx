import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { ArrowRight, Bike, ChevronLeft, LocateFixed, MapPin, Store, Trophy, LucideIcon } from "lucide-react";
import { BrandMark, SPORT, Sport } from "@/components/sc/ui";
import { detectState, getSavedState } from "@/lib/location";
import { LocationSheet } from "@/components/sc/location";

const KEY = "sc_onboarded_v2";
export const resetOnboarding = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
};

type Slide = { sport: Sport; icon: LucideIcon; kicker: string; title: string; body: string };

const SLIDES: Slide[] = [
  { sport: "football", icon: Trophy, kicker: "PLAY", title: "Find a game tonight", body: "Free and paid football matches near you. Grab a slot in two taps." },
  { sport: "cycling", icon: Bike, kicker: "RIDE", title: "Roll with a crew", body: "Join group rides from landmarks across your city, or host your own." },
  { sport: "venue", icon: Store, kicker: "BOOK", title: "Book the pitch", body: "Reserve verified venues by the hour and get an access code instantly." },
  { sport: "guide", icon: MapPin, kicker: "NEAR YOU", title: "Where do you play?", body: "Share your location and we'll put activities in your state first." },
];

export default function Onboarding() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  // Swipe the card left or right to move between slides
  const [drag, setDrag] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const touch = useRef<{ x: number; y: number; lock: boolean | null } | null>(null);

  useEffect(() => {
    if (pathname.startsWith("/auth/callback")) return;
    try {
      if (!localStorage.getItem(KEY)) setOpen(true);
    } catch {
      /* ignore */
    }
  }, [pathname]);

  const finish = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  if (!open) return null;
  const s = SLIDES[i];
  const c = SPORT[s.sport];
  const last = i === SLIDES.length - 1;
  const Icon = s.icon;

  const go = (n: number) => {
    if (n < 0 || n >= SLIDES.length) return;
    setDir(n > i ? 1 : -1);
    setI(n);
  };
  const onStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY, lock: null };
  };
  const onMove = (e: React.TouchEvent) => {
    const st = touch.current;
    if (!st) return;
    const t = e.touches[0];
    const dx = t.clientX - st.x;
    const dy = t.clientY - st.y;
    if (st.lock === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) st.lock = Math.abs(dx) > Math.abs(dy);
    if (!st.lock) return;
    // resist at the first and last slide
    const edge = (dx > 0 && i === 0) || (dx < 0 && last);
    setDrag(edge ? dx * 0.25 : dx);
  };
  const onEnd = () => {
    const dx = drag;
    touch.current = null;
    setDrag(0);
    if (dx < -60) go(i + 1);
    else if (dx > 60) go(i - 1);
  };

  const locate = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const st = await detectState();
      setMsg(`Got it. Showing ${st} first.`);
      setTimeout(finish, 900);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Welcome to SportCliq" className="fixed inset-0 z-[60] bg-sc-bg font-sans text-sc-ink flex flex-col">
      <div className="px-5 flex items-center justify-between" style={{ paddingTop: "max(env(safe-area-inset-top), 1rem)" }}>
        <div className="pt-3 flex items-center gap-2">
          <BrandMark size={32} />
          <span className="text-base font-extrabold tracking-[-0.02em]">SportCliq</span>
        </div>
        {!last && (
          <button type="button" onClick={finish} className="mt-3 h-10 px-4 rounded-full bg-white text-sm font-bold text-sc-ink2">
            Skip
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-center px-5">
        <div
          key={i}
          onTouchStart={onStart}
          onTouchMove={onMove}
          onTouchEnd={onEnd}
          onTouchCancel={onEnd}
          className={`relative overflow-hidden rounded-[32px] p-6 h-[360px] flex flex-col justify-between select-none touch-pan-y ${dir === 1 ? "animate-[sc-card-next_0.3s_ease-out]" : "animate-[sc-card-prev_0.3s_ease-out]"}`}
          style={{
            background: c.solid,
            color: c.onSolid,
            transform: drag ? `translateX(${drag}px) rotate(${drag / 40}deg)` : undefined,
            transition: drag ? "none" : "transform 0.25s ease-out",
          }}
        >
          <Icon aria-hidden="true" className="absolute opacity-20" size={260} strokeWidth={1} style={{ right: -60, bottom: -60 }} />
          <span className="w-16 h-16 rounded-full bg-white/25 flex items-center justify-center">
            <Icon size={32} />
          </span>
          <div className="relative flex flex-col gap-2.5">
            <span className="text-[13px] font-extrabold tracking-[0.1em] opacity-90">{s.kicker}</span>
            <h2 className="m-0 text-[32px] leading-9 font-extrabold tracking-[-0.03em]">{s.title}</h2>
            <p className="m-0 text-base leading-6 font-medium opacity-95">{s.body}</p>
          </div>
        </div>

        <div className="flex justify-center gap-1 pt-5">
          {SLIDES.map((_, k) => (
            <button key={k} type="button" aria-label={`Slide ${k + 1}`} onClick={() => go(k)} className="h-6 px-1 flex items-center">
              <span className="block h-2 rounded-full transition-all" style={{ width: k === i ? 24 : 8, background: k === i ? "#0E1411" : "#D5D9D3" }} />
            </button>
          ))}
        </div>
        {i === 0 && <p className="m-0 pt-1 text-center text-[12px] font-semibold text-sc-ink3">Swipe to see more</p>}

        {last && (
          <div className="pt-5 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={locate}
              disabled={busy}
              className="h-[52px] rounded-full bg-white border border-sc-line text-sc-ink font-bold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <LocateFixed size={20} className={busy ? "animate-spin" : ""} />
              {busy ? "Finding you..." : getSavedState() ? `Using ${getSavedState()}` : "Use my location"}
            </button>
            <button type="button" onClick={() => setPick(true)} className="text-sm font-bold text-sc-green-dark">
              Pick my state instead
            </button>
            {msg && <p className="m-0 text-center text-sm font-semibold text-sc-ink2">{msg}</p>}
          </div>
        )}
      </div>

      <div className="px-5 pt-3 flex gap-2.5" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1.5rem)" }}>
        {i > 0 && (
          <button
            type="button"
            aria-label="Previous"
            onClick={() => go(i - 1)}
            className="w-[54px] h-[54px] rounded-full bg-white text-sc-ink flex items-center justify-center shrink-0"
          >
            <ChevronLeft size={22} />
          </button>
        )}
        <button
          type="button"
          onClick={() => (last ? finish() : go(i + 1))}
          className="flex-1 h-[54px] rounded-full bg-sc-ink text-white text-base font-bold flex items-center justify-center gap-2"
        >
          {last ? "Let's play" : "Next"} <ArrowRight size={18} />
        </button>
      </div>

      <LocationSheet
        open={pick}
        onOpenChange={(v) => {
          setPick(v);
          if (!v && getSavedState()) finish();
        }}
      />
      <style>{`@keyframes sc-card-next { from { opacity: 0; transform: translateX(40px) scale(0.98); } to { opacity: 1; transform: none; } } @keyframes sc-card-prev { from { opacity: 0; transform: translateX(-40px) scale(0.98); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  );
}
