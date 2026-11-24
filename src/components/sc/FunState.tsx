import { useNavigate } from "react-router-dom";
import { ArrowLeft, Home, KeyRound, RefreshCw, Search, type LucideIcon } from "lucide-react";
import { BrandMark } from "@/components/sc/ui";

/**
 * Friendly full screens for things that went wrong: a missing match, a locked
 * private activity, a broken page. Each one has its own little scene and a way out.
 */
export type FunKind = "match" | "ride" | "venue" | "landmark" | "ticket" | "locked" | "error" | "lost";

const ART: Record<FunKind, { bg: string; ink: string; scene: JSX.Element }> = {
  match: {
    bg: "#16A34A",
    ink: "#FFFFFF",
    scene: (
      <g>
        <g stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="3">
          <path d="M120 20V160" />
          <circle cx="120" cy="90" r="26" />
          <rect x="6" y="58" width="34" height="64" />
          <rect x="200" y="58" width="34" height="64" />
        </g>
        <path d="M150 120c20-36 46-46 70-30" stroke="#0E1411" strokeWidth="3" strokeDasharray="3 8" strokeLinecap="round" />
        <circle cx="62" cy="48" r="13" fill="#FFFFFF" stroke="#0E1411" strokeWidth="3" />
        <path d="M62 40l6 4-2 7h-8l-2-7z" fill="#0E1411" />
      </g>
    ),
  },
  ride: {
    bg: "#FB923C",
    ink: "#FFFFFF",
    scene: (
      <g>
        <path d="M6 128c40-18 80-18 116 0s76 18 112 0" stroke="#FFFFFF" strokeOpacity="0.5" strokeWidth="4" strokeDasharray="10 10" />
        <g stroke="#0E1411" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="54" cy="64" r="18" />
          <circle cx="104" cy="64" r="18" />
          <path d="M54 64l18-26h22l10 26M72 38l-6-10M90 38l-8 26H54" />
        </g>
      </g>
    ),
  },
  venue: {
    bg: "#8B5CF6",
    ink: "#FFFFFF",
    scene: (
      <g stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="3" fill="none">
        <path d="M30 150V70l90-36 90 36v80" />
        <path d="M70 150v-44h100v44" />
        <path d="M30 70h180" />
      </g>
    ),
  },
  landmark: {
    bg: "#14B8A6",
    ink: "#FFFFFF",
    scene: (
      <g>
        <path d="M6 140c50-30 90-30 120-10s70 20 108-8" stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="4" fill="none" />
        <path d="M60 128V44" stroke="#0E1411" strokeWidth="4" strokeLinecap="round" />
        <path d="M62 46h46l-10 14 10 14H62" fill="#FFFFFF" stroke="#0E1411" strokeWidth="3" strokeLinejoin="round" />
      </g>
    ),
  },
  ticket: {
    bg: "#EAB308",
    ink: "#0E1411",
    scene: (
      <g>
        <rect x="40" y="46" width="160" height="88" rx="14" fill="#FFFFFF" stroke="#0E1411" strokeWidth="3" />
        <path d="M150 46v88" stroke="#0E1411" strokeWidth="3" strokeDasharray="5 6" />
      </g>
    ),
  },
  locked: {
    bg: "#0E1411",
    ink: "#FFFFFF",
    scene: (
      <g>
        <g stroke="#FFFFFF" strokeOpacity="0.12" strokeWidth="3">
          <path d="M120 20V160" />
          <circle cx="120" cy="90" r="26" />
        </g>
        <rect x="92" y="78" width="56" height="46" rx="10" fill="#16A34A" />
        <path d="M102 78V64a18 18 0 0136 0v14" stroke="#16A34A" strokeWidth="7" fill="none" strokeLinecap="round" />
        <circle cx="120" cy="98" r="6" fill="#0E1411" />
        <path d="M120 102v10" stroke="#0E1411" strokeWidth="5" strokeLinecap="round" />
      </g>
    ),
  },
  error: {
    bg: "#EF4444",
    ink: "#FFFFFF",
    scene: (
      <g stroke="#FFFFFF" strokeOpacity="0.4" strokeWidth="3">
        <path d="M120 20V160" />
        <circle cx="120" cy="90" r="26" />
        <path d="M100 70l40 40M140 70l-40 40" strokeOpacity="0.9" strokeWidth="6" strokeLinecap="round" />
      </g>
    ),
  },
  lost: {
    bg: "#16A34A",
    ink: "#FFFFFF",
    scene: (
      <g>
        <g stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="3">
          <path d="M120 20V160" />
          <circle cx="120" cy="90" r="26" />
          <rect x="6" y="58" width="34" height="64" />
          <rect x="200" y="58" width="34" height="64" />
        </g>
        <path d="M188 46c18-20 34-22 44-14" stroke="#0E1411" strokeWidth="3" strokeDasharray="3 8" strokeLinecap="round" />
        <circle cx="226" cy="22" r="14" fill="#FFFFFF" stroke="#0E1411" strokeWidth="3" />
      </g>
    ),
  },
};

type Action = { label: string; onClick: () => void; icon?: LucideIcon };

export function FunState({ kind, badge, title, body, primary, secondary, back = true }: {
  kind: FunKind;
  badge?: string;
  title: string;
  body: string;
  primary: Action;
  secondary?: Action;
  back?: boolean;
}) {
  const navigate = useNavigate();
  const a = ART[kind];
  const P = primary.icon || Home;
  const S = secondary?.icon || Search;
  return (
    <div className="min-h-[100dvh] bg-sc-bg text-sc-ink font-sans px-6 pt-[max(env(safe-area-inset-top),1.25rem)] pb-10 flex flex-col">
      <div className="flex items-center justify-between h-11">
        {back ? (
          <button type="button" aria-label="Go back" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))} className="w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-card">
            <ArrowLeft size={20} />
          </button>
        ) : <span />}
        <BrandMark size={36} />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-5 py-8">
        <div className="relative w-[240px] h-[170px] animate-[sc-float_4s_ease-in-out_infinite]" aria-hidden="true">
          <svg viewBox="0 0 240 170" width="240" height="170" fill="none">
            <rect x="6" y="20" width="228" height="140" rx="26" fill={a.bg} />
            {a.scene}
          </svg>
          {badge && (
            <span className="absolute left-1/2 -translate-x-1/2 bottom-[-14px] h-8 px-3.5 rounded-full bg-white shadow-card text-[13px] font-extrabold inline-flex items-center whitespace-nowrap" style={{ color: "#0E1411" }}>
              {badge}
            </span>
          )}
        </div>
        <h1 className="m-0 mt-3 text-[28px] leading-[32px] font-extrabold tracking-[-0.03em] max-w-[320px]">{title}</h1>
        <p className="m-0 text-[15px] leading-[22px] text-sc-ink2 max-w-[310px]">{body}</p>
      </div>
      <div className="flex flex-col gap-2.5 w-full max-w-[400px] mx-auto">
        <button type="button" onClick={primary.onClick} className="h-[54px] rounded-full bg-sc-ink text-white font-bold inline-flex items-center justify-center gap-2 active:scale-[0.98]">
          <P size={18} /> {primary.label}
        </button>
        {secondary && (
          <button type="button" onClick={secondary.onClick} className="h-[54px] rounded-full bg-white font-bold inline-flex items-center justify-center gap-2 active:scale-[0.98]">
            <S size={18} /> {secondary.label}
          </button>
        )}
      </div>
      <style>{`@keyframes sc-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }`}</style>
    </div>
  );
}

/** Ready made screens for the common cases, with copy that keeps it light. */
export function NotFoundState({ kind }: { kind: "match" | "ride" | "venue" | "landmark" | "ticket" }) {
  const navigate = useNavigate();
  const copy = {
    match: { title: "This match has left the pitch", body: "It may have been removed, or the link has a typo. Plenty of other games are kicking off soon.", go: { label: "Find a match", to: "/matches" } },
    ride: { title: "This ride has rolled away", body: "It may have been removed, or the link has a typo. Other rides are looking for riders right now.", go: { label: "Find a ride", to: "/cycling-activities" } },
    venue: { title: "This venue is off the map", body: "It may have been removed, or the link has a typo. There are other great pitches to play on.", go: { label: "Browse venues", to: "/venues" } },
    landmark: { title: "This landmark went missing", body: "It may have been removed, or the link has a typo. Pick another starting point for your next ride.", go: { label: "Browse landmarks", to: "/landmarks" } },
    ticket: { title: "We could not find that ticket", body: "Check the link in your email or receipt. If it still does not work, the organiser can help.", go: { label: "Back home", to: "/" } },
  }[kind];
  return (
    <FunState
      kind={kind}
      badge="Not found"
      title={copy.title}
      body={copy.body}
      primary={{ label: copy.go.label, onClick: () => navigate(copy.go.to), icon: Search }}
      secondary={{ label: "Back home", onClick: () => navigate("/"), icon: Home }}
    />
  );
}

export function LoadFailedState({ onRetry }: { onRetry: () => void }) {
  const navigate = useNavigate();
  return (
    <FunState
      kind="error"
      badge="Connection trouble"
      title="We dropped the ball"
      body="Something went wrong while loading this page. Check your connection and give it another go."
      primary={{ label: "Try again", onClick: onRetry, icon: RefreshCw }}
      secondary={{ label: "Back home", onClick: () => navigate("/"), icon: Home }}
    />
  );
}

export const keyIcon = KeyRound;
