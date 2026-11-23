import type { LucideIcon } from "lucide-react";
import { Bubble, SPORT, Sport, formatCompact, formatNaira } from "@/components/sc/ui";

export type StatsFilter = "all" | "this_month" | "last_month" | "this_week" | "last_week";

const PERIODS: { id: StatsFilter; label: string }[] = [
  { id: "all", label: "All time" },
  { id: "this_month", label: "This month" },
  { id: "last_month", label: "Last month" },
  { id: "this_week", label: "This week" },
  { id: "last_week", label: "Last week" },
];

export type StatTile = { label: string; value: number; icon: LucideIcon; sport: Sport; money?: boolean };

type Props = {
  sport: "football" | "cycling";
  filter: StatsFilter;
  onFilter: (f: StatsFilter) => void;
  heroLabel: string;
  heroIcon: LucideIcon;
  organised: { label: string; value: number };
  joined: { label: string; value: number };
  spent: number;
  cashout: number;
  extra: StatTile;
};

const show = (t: { value: number; money?: boolean }) => (t.money ? formatNaira(t.value) : formatCompact(t.value));

export default function StatsPanel({ sport, filter, onFilter, heroLabel, heroIcon: HeroIcon, organised, joined, spent, cashout, extra }: Props) {
  const c = SPORT[sport];
  const total = organised.value + joined.value;
  const period = PERIODS.find((p) => p.id === filter)?.label.toLowerCase() ?? "all time";

  return (
    <div className="flex flex-col gap-3">
      <div className="-mx-5 px-5 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Period">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={filter === p.id}
            onClick={() => onFilter(p.id)}
            className={`h-9 px-4 rounded-full text-[13px] font-bold whitespace-nowrap shrink-0 transition-colors ${
              filter === p.id ? "bg-sc-ink text-white" : "bg-white text-sc-ink2"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-[28px] p-5" style={{ background: c.solid, color: c.onSolid }}>
        <HeroIcon aria-hidden="true" className="absolute opacity-20" size={140} strokeWidth={1.3} style={{ right: -24, top: -18 }} />
        <span className="relative text-xs font-bold tracking-[0.12em] opacity-85">{heroLabel.toUpperCase()}</span>
        <div className="relative mt-1 text-[44px] leading-[48px] font-extrabold tracking-[-0.03em] truncate">{formatCompact(total)}</div>
        <span className="relative text-sm font-semibold opacity-85">Total for {period}</span>
        <div className="relative mt-4 grid grid-cols-2 gap-2">
          {[organised, joined].map((s) => (
            <div key={s.label} className="rounded-[18px] bg-white/20 px-3.5 py-3 min-w-0">
              <div className="text-[22px] leading-7 font-extrabold tracking-[-0.02em] truncate">{formatCompact(s.value)}</div>
              <div className="text-xs font-bold opacity-90 truncate">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[24px] bg-white p-4 grid grid-cols-2 divide-x divide-sc-line">
        {[
          { label: "Spent", value: spent },
          { label: "Cashed out", value: cashout },
        ].map((m, i) => (
          <div key={m.label} className={`flex flex-col gap-1 min-w-0 ${i === 1 ? "pl-4" : "pr-4"}`}>
            <span className="text-xs font-bold text-sc-ink3">{m.label}</span>
            <span className="text-[24px] leading-8 font-extrabold tracking-[-0.02em] truncate" title={`₦${m.value.toLocaleString("en-NG")}`}>
              {formatNaira(m.value)}
            </span>
          </div>
        ))}
      </div>

      <div className="rounded-[24px] bg-white p-4 flex items-center gap-3">
        <Bubble icon={extra.icon} sport={extra.sport} />
        <span className="flex-1 min-w-0 text-[15px] font-bold truncate">{extra.label}</span>
        <span className="text-[22px] font-extrabold tracking-[-0.02em]">{show(extra)}</span>
      </div>
    </div>
  );
}
