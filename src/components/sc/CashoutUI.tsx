import { ArrowDownToLine, Banknote, RefreshCw, Clock, CheckCircle2, XCircle } from "lucide-react";
import { formatNaira } from "@/components/sc/ui";

export type CashoutRow = { id: string; amount: number; created_at: string; status: string; name?: string | null; bank?: string | null; account?: string | null };

export function BalanceHero({ label = "Available to cash out", balance, onRefresh, onRequest, disabled, note, accent = "#16A34A" }: { label?: string; balance: number; onRefresh?: () => void; onRequest: () => void; disabled?: boolean; note?: string; accent?: string }) {
  return (
    <div className="relative rounded-[28px] p-5 text-white overflow-hidden" style={{ background: "#0E1411" }}>
      <span aria-hidden="true" className="absolute -right-12 -top-12 w-44 h-44 rounded-full border-[20px] border-white/10" />
      <span aria-hidden="true" className="absolute right-12 -bottom-16 w-32 h-32 rounded-full" style={{ background: accent, opacity: 0.35 }} />
      <div className="relative flex items-center justify-between">
        <span className="text-xs font-bold tracking-[0.12em] opacity-70 uppercase">{label}</span>
        {onRefresh && (
          <button type="button" onClick={onRefresh} aria-label="Refresh balance" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <RefreshCw size={17} />
          </button>
        )}
      </div>
      <div className="relative mt-2 text-[40px] leading-[46px] font-extrabold tracking-[-0.03em]">{formatNaira(balance) === "Free" ? "₦0" : formatNaira(balance)}</div>
      {note && <p className="relative m-0 mt-1 text-[13px] opacity-70">{note}</p>}
      <button
        type="button"
        onClick={onRequest}
        disabled={disabled}
        className="relative mt-4 w-full h-[52px] rounded-full font-bold inline-flex items-center justify-center gap-2 disabled:opacity-40"
        style={{ background: accent, color: "#FFFFFF" }}
      >
        <ArrowDownToLine size={18} /> Request cashout
      </button>
    </div>
  );
}

const tone = (s: string) => {
  const k = (s || "").toLowerCase();
  if (/paid|approved|complete|success/.test(k)) return { bg: "#DCFCE7", fg: "#15803D", Icon: CheckCircle2 };
  if (/reject|fail|declin|cancel/.test(k)) return { bg: "#FEE2E2", fg: "#B91C1C", Icon: XCircle };
  return { bg: "#FEF9C3", fg: "#A16207", Icon: Clock };
};

export function CashoutList({ rows, title = "Cashout history" }: { rows: CashoutRow[]; title?: string }) {
  return (
    <div className="bg-white rounded-3xl p-[18px] flex flex-col gap-1">
      <span className="text-base font-extrabold mb-1">{title}</span>
      {rows.length === 0 ? (
        <div className="flex items-center gap-3 py-3">
          <span className="w-11 h-11 rounded-2xl bg-sc-soft flex items-center justify-center"><Banknote size={20} /></span>
          <span className="text-sm text-sc-ink3">No cashouts yet. Requests you make show up here with their status.</span>
        </div>
      ) : (
        rows.map((r, i) => {
          const t = tone(r.status);
          return (
            <div key={r.id} className={`flex items-center gap-3 py-3 ${i ? "border-t border-sc-line" : ""}`}>
              <span className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: t.bg, color: t.fg }}><t.Icon size={20} /></span>
              <span className="flex-1 min-w-0 flex flex-col">
                <span className="text-[16px] font-extrabold">{formatNaira(r.amount)}</span>
                <span className="text-xs text-sc-ink3 truncate">
                  {[r.bank, r.account ? `•••${String(r.account).slice(-4)}` : null, new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })].filter(Boolean).join(" · ")}
                </span>
              </span>
              <span className="h-7 px-2.5 rounded-full text-xs font-bold capitalize inline-flex items-center" style={{ background: t.bg, color: t.fg }}>{r.status}</span>
            </div>
          );
        })
      )}
    </div>
  );
}
