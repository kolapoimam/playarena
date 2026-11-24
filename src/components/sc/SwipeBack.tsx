import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

// Main tabs have nothing to go back to
const ROOTS = new Set(["/", "/activities", "/search", "/profile", "/auth"]);
const EDGE = 28; // how close to the left edge the finger must start
const TRIGGER = 72; // how far the finger must travel to go back

/**
 * Swipe right from the left edge of the screen to go back, like a native app.
 * A small arrow follows the finger and the page goes back when it is let go far enough.
 */
const SwipeBack = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [pull, setPull] = useState(0);
  const start = useRef<{ x: number; y: number; locked: boolean | null } | null>(null);
  const pullRef = useRef(0);

  useEffect(() => {
    if (ROOTS.has(pathname)) return;
    // In a browser tab the phone already swipes back on its own, so only step in
    // when SportCliq runs as an installed app, where that gesture is missing.
    const installed = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as any).standalone === true;
    if (!installed && !(window as any).__scForceSwipe) return;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (e.touches.length !== 1 || t.clientX > EDGE) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      start.current = { x: t.clientX, y: t.clientY, locked: null };
    };
    const onMove = (e: TouchEvent) => {
      const s = start.current;
      if (!s) return;
      const t = e.touches[0];
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      if (s.locked === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) s.locked = Math.abs(dx) > Math.abs(dy) * 1.2 && dx > 0;
      if (!s.locked) {
        if (s.locked === false) start.current = null;
        return;
      }
      if (e.cancelable) e.preventDefault();
      pullRef.current = Math.max(0, Math.min(dx, 140));
      setPull(pullRef.current);
    };
    const onEnd = () => {
      const go = start.current?.locked && pullRef.current >= TRIGGER;
      start.current = null;
      pullRef.current = 0;
      setPull(0);
      if (!go) return;
      const idx = (window.history.state as any)?.idx;
      if (typeof idx === "number" && idx > 0) navigate(-1);
      else navigate("/", { replace: true });
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd);
    document.addEventListener("touchcancel", onEnd);
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onEnd);
    };
  }, [pathname, navigate]);

  if (!pull) return null;
  const ready = pull >= TRIGGER;
  return (
    <div
      aria-hidden="true"
      className="fixed top-1/2 left-0 z-[250] pointer-events-none"
      style={{ transform: `translate(${pull * 0.55 - 44}px, -50%)` }}
    >
      <span
        className={`flex items-center justify-center w-11 h-11 rounded-full shadow-card transition-colors ${ready ? "bg-sc-ink text-white" : "bg-white text-sc-ink"}`}
        style={{ transform: `scale(${0.8 + Math.min(pull / TRIGGER, 1) * 0.2})` }}
      >
        <ChevronLeft size={22} strokeWidth={2.6} />
      </span>
    </div>
  );
};

export default SwipeBack;
