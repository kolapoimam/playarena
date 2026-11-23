// SportCliq light design kit.
// Small, presentational building blocks shared by the redesigned screens.
import { ReactNode, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type Sport =
  | "football"
  | "cycling"
  | "venue"
  | "tennis"
  | "guide"
  | "money"
  | "red"
  | "pink"
  | "gray"
  | "ink";

// bg, fg (text safe), solid fill
export const SPORT: Record<Sport, { bg: string; fg: string; solid: string; onSolid: string }> = {
  football: { bg: "#DCFCE7", fg: "#15803D", solid: "#16A34A", onSolid: "#FFFFFF" },
  cycling: { bg: "#FFEDD5", fg: "#C2410C", solid: "#FB923C", onSolid: "#FFFFFF" },
  venue: { bg: "#EDE9FE", fg: "#6D28D9", solid: "#8B5CF6", onSolid: "#FFFFFF" },
  tennis: { bg: "#FEF9C3", fg: "#854D0E", solid: "#FACC15", onSolid: "#0E1411" },
  guide: { bg: "#DBEAFE", fg: "#1D4ED8", solid: "#3B82F6", onSolid: "#FFFFFF" },
  money: { bg: "#CCFBF1", fg: "#0F766E", solid: "#14B8A6", onSolid: "#FFFFFF" },
  red: { bg: "#FEE2E2", fg: "#B91C1C", solid: "#EF4444", onSolid: "#FFFFFF" },
  pink: { bg: "#FCE7F3", fg: "#BE185D", solid: "#EC4899", onSolid: "#FFFFFF" },
  gray: { bg: "#EEF0EB", fg: "#4A524D", solid: "#9CA3AF", onSolid: "#FFFFFF" },
  ink: { bg: "#0E1411", fg: "#FFFFFF", solid: "#0E1411", onSolid: "#FFFFFF" },
};

/* ---------- Brand ---------- */

export function BrandMark({ size = 44, className }: { size?: number; className?: string }) {
  return (
    <img
      src="/brand/sportcliq-mark.png"
      alt="SportCliq"
      width={size}
      height={size}
      className={cn("shrink-0 select-none", className)}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}

export function BrandWordmark({ height = 40, className }: { height?: number; className?: string }) {
  return (
    <img
      src="/brand/sportcliq-wordmark.png"
      alt="SportCliq"
      className={cn("shrink-0 select-none w-auto", className)}
      style={{ height }}
      draggable={false}
    />
  );
}

/* ---------- Icons and badges ---------- */

export function Bubble({
  icon: Icon,
  sport = "football",
  size = 44,
  solid = false,
  radius,
  className,
}: {
  icon: LucideIcon;
  sport?: Sport;
  size?: number;
  solid?: boolean;
  radius?: number;
  className?: string;
}) {
  const c = SPORT[sport];
  return (
    <span
      className={cn("flex items-center justify-center shrink-0", className)}
      style={{
        width: size,
        height: size,
        borderRadius: radius ?? size / 2,
        background: solid ? c.solid : c.bg,
        color: solid ? c.onSolid : c.fg,
      }}
    >
      <Icon size={Math.round(size * 0.48)} strokeWidth={2} />
    </span>
  );
}

export function Pill({
  children,
  sport = "gray",
  icon: Icon,
  className,
}: {
  children: ReactNode;
  sport?: Sport;
  icon?: LucideIcon;
  className?: string;
}) {
  const c = SPORT[sport];
  return (
    <span
      className={cn("inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-xs font-bold whitespace-nowrap", className)}
      style={{ background: c.bg, color: c.fg }}
    >
      {Icon && <Icon size={13} strokeWidth={2.4} />}
      {children}
    </span>
  );
}

// Dicebear avatars. The style is picked from the seed, so each person keeps the same look everywhere.
const DICEBEAR_STYLES = ["adventurer", "avataaars", "big-smile", "lorelei", "micah", "notionists", "personas", "fun-emoji"];
const DICEBEAR_BG = ["dcfce7", "ffedd5", "ede9fe", "fef9c3", "dbeafe", "ccfbf1", "fce7f3"];
export const dicebearUrl = (seed?: string | null) => {
  const s = (seed || "sportcliq").trim().toLowerCase();
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100003;
  const style = DICEBEAR_STYLES[h % DICEBEAR_STYLES.length];
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(s)}&backgroundColor=${DICEBEAR_BG.join(",")}&radius=50`;
};

export function Avatar({
  initials,
  sport = "football",
  size = 36,
  solid = true,
  src,
  seed,
}: {
  initials: string;
  sport?: Sport;
  size?: number;
  solid?: boolean;
  src?: string | null;
  seed?: string | null;
}) {
  const c = SPORT[sport];
  const [failed, setFailed] = useState(false);
  const url = src || (seed ? dicebearUrl(seed) : null);
  if (url && !failed) {
    return (
      <img
        src={url}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className="rounded-full object-cover shrink-0 bg-sc-soft"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="rounded-full flex items-center justify-center font-extrabold shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.36),
        background: solid ? c.solid : c.bg,
        color: solid ? c.onSolid : c.fg,
      }}
    >
      {initials.slice(0, 2).toUpperCase()}
    </span>
  );
}

export const initialsOf = (name?: string | null) =>
  (name || "?")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase() || "?";

const AVATAR_SPORTS: Sport[] = ["football", "guide", "pink", "cycling", "venue", "money"];
export const sportFor = (seed?: string | null): Sport => {
  const s = seed || "";
  let h = 0;
  for (let i = 0; i < s.length; i++) h += s.charCodeAt(i);
  return AVATAR_SPORTS[h % AVATAR_SPORTS.length];
};

export function DateBox({ date, sport = "football", size = 60 }: { date: string | Date; sport?: Sport; size?: number }) {
  const d = typeof date === "string" ? new Date(date) : date;
  const valid = !isNaN(d.getTime());
  const c = SPORT[sport];
  return (
    <div
      className="flex flex-col items-center justify-center shrink-0 rounded-[18px]"
      style={{ width: size, height: size + 6, background: c.bg }}
    >
      <span className="text-[11px] font-extrabold tracking-[0.08em]" style={{ color: c.fg }}>
        {valid ? d.toLocaleDateString("en-US", { month: "short" }).toUpperCase() : "TBD"}
      </span>
      <span className="text-2xl leading-[26px] font-extrabold text-sc-ink">{valid ? d.getDate() : "--"}</span>
    </div>
  );
}

export function Progress({ value, color = "#16A34A", height = 8, track = "#E6E9E3" }: { value: number; color?: string; height?: number; track?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="overflow-hidden rounded-full" style={{ height, background: track }}>
      <div className="rounded-full transition-all" style={{ width: `${pct}%`, height, background: color }} />
    </div>
  );
}

/* ---------- Layout ---------- */

export function Screen({ children, className, withNav = true }: { children: ReactNode; className?: string; withNav?: boolean }) {
  return (
    <div className={cn("min-h-screen bg-sc-bg text-sc-ink font-sans", withNav ? "pb-32" : "pb-10", className)}>{children}</div>
  );
}

export function IconButton({
  icon: Icon,
  label,
  onClick,
  dot = false,
  dark = false,
  className,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  dot?: boolean;
  dark?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "relative w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-card active:scale-95 transition-transform",
        dark ? "bg-sc-ink text-white" : "bg-white text-sc-ink",
        className
      )}
    >
      <Icon size={20} strokeWidth={2} />
      {dot && <span className="absolute top-2.5 right-[11px] w-[9px] h-[9px] rounded-full bg-sport-red border-2 border-white" />}
    </button>
  );
}

export function BackButton({ to, className }: { to?: string; className?: string }) {
  const navigate = useNavigate();
  return (
    <IconButton
      icon={ChevronLeft}
      label="Back"
      className={className}
      onClick={() => (to ? navigate(to) : window.history.length > 1 ? navigate(-1) : navigate("/"))}
    />
  );
}

export function PageHeader({
  title,
  subtitle,
  back,
  backTo,
  right,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: boolean;
  backTo?: string;
  right?: ReactNode;
}) {
  return (
    <header className="px-5 pt-[max(env(safe-area-inset-top),1rem)] flex flex-col gap-3.5">
      {(back || right) && (
        <div className="flex items-center justify-between min-h-11 pt-3">
          {back ? <BackButton to={backTo} /> : <span />}
          <div className="flex gap-2">{right}</div>
        </div>
      )}
      <div className={cn("flex flex-col gap-1.5", !(back || right) && "pt-6")}>
        <h1 className="m-0 text-[32px] leading-[38px] font-extrabold tracking-[-0.03em]">{title}</h1>
        {subtitle && <p className="m-0 text-[15px] leading-[22px] text-sc-ink2">{subtitle}</p>}
      </div>
    </header>
  );
}

export function NavHeader({ title, backTo, right }: { title?: ReactNode; backTo?: string; right?: ReactNode }) {
  return (
    <header className="px-5 pt-[max(env(safe-area-inset-top),1rem)] ">
      <div className="pt-3 flex items-center justify-between gap-3">
        <BackButton to={backTo} />
        <h1 className="m-0 flex-1 text-center text-[17px] font-extrabold truncate">{title}</h1>
        <div className="min-w-11 flex justify-end">{right}</div>
      </div>
    </header>
  );
}

export function Section({ title, action, onAction, className }: { title: ReactNode; action?: string; onAction?: () => void; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between px-5", className)}>
      <h2 className="m-0 text-xl font-extrabold tracking-[-0.02em]">{title}</h2>
      {action && (
        <button type="button" onClick={onAction} className="text-sm font-bold text-sc-green-dark">
          {action}
        </button>
      )}
    </div>
  );
}

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cn("bg-white rounded-3xl p-[18px] flex flex-col gap-3.5 shadow-card", onClick && "cursor-pointer active:scale-[0.99] transition-transform", className)}
    >
      {children}
    </div>
  );
}

export function Meta({ icon: Icon, children, className }: { icon: LucideIcon; children: ReactNode; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 text-sm text-sc-ink2 min-w-0", className)}>
      <Icon size={16} strokeWidth={2.2} className="shrink-0" />
      <span className="truncate">{children}</span>
    </span>
  );
}

export function ListGroup({ title, children, className }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {title && <span className="text-[13px] font-bold text-sc-ink3 uppercase tracking-[0.06em] px-1">{title}</span>}
      <div className="bg-white rounded-[22px] px-4 py-1 divide-y divide-sc-line">{children}</div>
    </div>
  );
}

export function ListRow({
  icon,
  sport = "gray",
  title,
  subtitle,
  right,
  onClick,
  chevron = true,
  leading,
}: {
  icon?: LucideIcon;
  sport?: Sport;
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  onClick?: () => void;
  chevron?: boolean;
  leading?: ReactNode;
}) {
  const Comp: any = onClick ? "button" : "div";
  return (
    <Comp type={onClick ? "button" : undefined} onClick={onClick} className="w-full flex items-center gap-3 py-3 text-left">
      {leading ?? (icon && <Bubble icon={icon} sport={sport} size={42} />)}
      <span className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="text-[15px] font-bold text-sc-ink truncate">{title}</span>
        {subtitle && <span className="text-[13px] text-sc-ink3 truncate">{subtitle}</span>}
      </span>
      {right}
      {chevron && onClick && <ChevronRight size={18} className="text-[#9AA19C] shrink-0" strokeWidth={2.2} />}
    </Comp>
  );
}

export function StatCard({ value, label, icon, sport = "football" }: { value: ReactNode; label: ReactNode; icon?: LucideIcon; sport?: Sport }) {
  return (
    <div className="flex-1 min-w-0 bg-white rounded-[20px] p-3.5 flex flex-col gap-2">
      {icon && <Bubble icon={icon} sport={sport} size={34} />}
      <span className="text-[22px] font-extrabold tracking-[-0.02em] truncate">{value}</span>
      <span className="text-xs font-semibold text-sc-ink3">{label}</span>
    </div>
  );
}

export function StickyFooter({ children }: { children: ReactNode }) {
  return (
    <div className="fixed left-0 right-0 bottom-0 z-30 px-5 pt-3.5 pb-[max(env(safe-area-inset-bottom),1.5rem)] bg-white/95 backdrop-blur-xl border-t border-sc-line flex flex-col gap-2.5">
      {children}
    </div>
  );
}

export function Chip({
  children,
  active,
  onClick,
  icon: Icon,
  sport,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  icon?: LucideIcon;
  sport?: Sport;
}) {
  const c = sport ? SPORT[sport] : null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 h-[38px] px-4 rounded-full border text-sm font-bold flex items-center gap-1.5 transition-colors",
        active ? "bg-sc-ink text-white border-sc-ink" : c ? "" : "bg-white text-sc-ink border-sc-line"
      )}
      style={!active && c ? { background: c.bg, color: c.fg, borderColor: c.bg } : undefined}
    >
      {Icon && <Icon size={16} strokeWidth={2} />}
      {children}
    </button>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      role="tablist"
      className="h-[46px] rounded-[15px] bg-sc-soft2 p-1 grid gap-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-xl text-sm font-bold transition-all",
            o.value === value ? "bg-white text-sc-ink shadow-[0_1px_3px_rgba(14,20,17,0.12)]" : "text-sc-ink2"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

type BtnKind = "primary" | "dark" | "soft" | "white" | "danger" | "cycling" | "venue";
const BTN: Record<BtnKind, string> = {
  primary: "bg-sc-green text-sc-green-ink",
  dark: "bg-sc-ink text-white",
  soft: "bg-sc-soft text-sc-ink",
  white: "bg-white text-sc-ink border border-sc-line",
  danger: "bg-sport-red-bg text-sport-red-fg",
  cycling: "bg-sport-cycling text-white",
  venue: "bg-sport-venue text-white",
};

export function ScButton({
  children,
  kind = "primary",
  icon: Icon,
  trailing: Trailing,
  onClick,
  disabled,
  type = "button",
  full = true,
  size = "lg",
  className,
}: {
  children: ReactNode;
  kind?: BtnKind;
  icon?: LucideIcon;
  trailing?: LucideIcon;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  full?: boolean;
  size?: "lg" | "md" | "sm";
  className?: string;
}) {
  const h = size === "lg" ? "h-[54px] text-base px-[22px]" : size === "md" ? "h-[46px] text-[15px] px-5" : "h-10 text-sm px-4";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-full font-bold flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
        h,
        full && "w-full",
        BTN[kind],
        className
      )}
    >
      {Icon && <Icon size={size === "sm" ? 16 : 20} strokeWidth={2.2} />}
      {children}
      {Trailing && <Trailing size={18} strokeWidth={2.2} />}
    </button>
  );
}

export function EmptyState({ icon, sport = "gray", title, subtitle, action }: { icon: LucideIcon; sport?: Sport; title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center gap-2.5 py-6 px-3">
      <Bubble icon={icon} sport={sport} size={64} />
      <span className="text-[17px] font-extrabold">{title}</span>
      {subtitle && <span className="text-sm text-sc-ink3 max-w-[260px]">{subtitle}</span>}
      {action}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex justify-center items-center py-10", className)}>
      <div className="w-8 h-8 rounded-full border-[3px] border-sc-soft2 border-t-sc-green animate-spin" />
    </div>
  );
}

export const formatNaira = (n?: number | null) =>
  n == null ? "" : `₦${Number(n).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;

export const formatTime12 = (t?: string | null) => {
  if (!t) return "";
  if (/am|pm/i.test(t)) return t.replace(/^0/, "");
  const [h, m] = t.split(":");
  const hr = parseInt(h, 10);
  if (isNaN(hr)) return t;
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
};

export const formatShortDate = (d?: string | null) => {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
};

/** Illustrated empty state with a friendly line and up to two actions. */
export function FunEmpty({
  icon: Icon,
  sport = "football",
  title,
  body,
  primary,
  secondary,
}: {
  icon: LucideIcon;
  sport?: Sport;
  title: ReactNode;
  body?: ReactNode;
  primary?: { label: string; onClick: () => void };
  secondary?: { label: string; onClick: () => void };
}) {
  const c = SPORT[sport];
  return (
    <div className="bg-white rounded-[28px] px-6 pt-8 pb-6 flex flex-col items-center text-center gap-3">
      <div className="relative w-[132px] h-[132px] flex items-center justify-center" aria-hidden="true">
        <span className="absolute inset-0 rounded-full" style={{ background: c.bg }} />
        <span className="absolute inset-[18px] rounded-full border-2 border-dashed" style={{ borderColor: c.solid, opacity: 0.45 }} />
        <span className="absolute w-3 h-3 rounded-full top-2 right-5" style={{ background: SPORT.tennis.solid }} />
        <span className="absolute w-2 h-2 rounded-full bottom-5 left-2" style={{ background: SPORT.pink.solid }} />
        <span className="absolute w-2.5 h-2.5 rounded-[3px] rotate-12 bottom-2 right-8" style={{ background: SPORT.guide.solid }} />
        <span className="relative w-[64px] h-[64px] rounded-[22px] flex items-center justify-center rotate-[-6deg] shadow-float" style={{ background: c.solid, color: c.onSolid }}>
          <Icon size={30} />
        </span>
      </div>
      <span className="text-[19px] font-extrabold tracking-[-0.02em] mt-1">{title}</span>
      {body && <span className="text-sm leading-[21px] text-sc-ink2 max-w-[280px]">{body}</span>}
      {(primary || secondary) && (
        <div className="w-full flex flex-col gap-2 pt-2">
          {primary && (
            <button type="button" onClick={primary.onClick} className="h-[50px] rounded-full font-bold text-[15px]" style={{ background: c.solid, color: c.onSolid }}>
              {primary.label}
            </button>
          )}
          {secondary && (
            <button type="button" onClick={secondary.onClick} className="h-[46px] rounded-full font-bold text-[15px] bg-sc-soft text-sc-ink">
              {secondary.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Cover images with designed fallbacks ---------- */
export const PLACEHOLDER = {
  venue: "/placeholders/stadium.webp",
  football: "/placeholders/football.webp",
  cycling: "/placeholders/cycling.webp",
  landmark: "/placeholders/landmark.webp",
} as const;
export type CoverKind = keyof typeof PLACEHOLDER;

/** Fills its (relative) parent with the image, or the SportCliq artwork when there is none or it fails. */
export function Cover({ src, kind, alt = "", className = "" }: { src?: string | null; kind: CoverKind; alt?: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const url = !src || failed ? PLACEHOLDER[kind] : src;
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => !failed && setFailed(true)}
      className={`absolute inset-0 w-full h-full object-cover ${className}`}
    />
  );
}
