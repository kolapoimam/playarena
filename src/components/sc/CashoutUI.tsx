import React from "react";
import { ArrowDownToLine, Banknote, RefreshCw, Clock, CheckCircle2, XCircle, ChevronDown, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { modalAction, modalCancel } from "@/components/ui/modal-styles";
import { formatNaira, formatNairaExact } from "@/components/sc/ui";

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

// ---------- request cashout modal ----------

type CashoutErrors = { amount?: string | null; bank?: string | null; account?: string | null; name?: string | null };

const fieldBox = "w-full h-[52px] rounded-2xl bg-white border border-sc-line px-4 text-[16px] font-semibold text-sc-ink outline-none transition focus:border-sc-ink placeholder:text-sc-ink3 placeholder:font-medium";

function Field({ label, error, children }: { label: string; error?: string | null; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-bold text-sc-ink2">{label}</span>
      {children}
      {error && <span className="text-[13px] font-semibold text-[#B91C1C]">{error}</span>}
    </label>
  );
}

export function CashoutDialog({
  open, onOpenChange, balance, accent = "#16A34A", banks,
  amount, onAmount, bank, onBank, account, onAccount, name, onName,
  errors = {}, loading, submitDisabled, onSubmit, note,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; balance: number; accent?: string; banks: string[];
  amount: string; onAmount: (v: string) => void; bank: string; onBank: (v: string) => void;
  account: string; onAccount: (v: string) => void; name: string; onName: (v: string) => void;
  errors?: CashoutErrors; loading?: boolean; submitDisabled?: boolean; onSubmit: () => void; note?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-sc-bg p-5 gap-4">
        <DialogHeader>
          <span className="w-12 h-12 rounded-2xl flex items-center justify-center mb-1" style={{ background: `${accent}1F`, color: accent }}>
            <ArrowDownToLine size={22} />
          </span>
          <DialogTitle>Request cashout</DialogTitle>
          <DialogDescription>{note || "Send your earnings to your bank account."}</DialogDescription>
        </DialogHeader>

        <div className="rounded-3xl bg-white p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold text-sc-ink2">Amount</span>
            <span className="text-[13px] font-semibold text-sc-ink3">Available {formatNairaExact(balance)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[30px] font-extrabold text-sc-ink3">₦</span>
            <input
              type="number"
              inputMode="decimal"
              min="1"
              value={amount}
              onChange={(e) => onAmount(e.target.value)}
              placeholder="0"
              aria-label="Amount in naira"
              className="sc-big-field flex-1 min-w-0 bg-transparent text-[34px] leading-[40px] font-extrabold tracking-[-0.02em] text-sc-ink outline-none placeholder:text-sc-ink3/50"
            />
            {balance > 0 && (
              <button type="button" onClick={() => onAmount(String(balance))} className="h-9 px-3.5 rounded-full text-[13px] font-bold" style={{ background: `${accent}1F`, color: accent }}>
                Max
              </button>
            )}
          </div>
          {errors.amount && <span className="text-[13px] font-semibold text-[#B91C1C]">{errors.amount}</span>}
        </div>

        <div className="flex flex-col gap-3.5">
          <Field label="Bank" error={errors.bank}>
            <span className="relative">
              <select value={bank} onChange={(e) => onBank(e.target.value)} className={`${fieldBox} appearance-none pr-10 ${bank ? "" : "text-sc-ink3 font-medium"}`}>
                <option value="">Select your bank</option>
                {banks.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-sc-ink3" />
            </span>
          </Field>
          <Field label="Account number" error={errors.account}>
            <input value={account} onChange={(e) => onAccount(e.target.value)} inputMode="numeric" pattern="[0-9]*" maxLength={10} placeholder="10 digit account number" className={fieldBox} />
          </Field>
          <Field label="Account name" error={errors.name}>
            <input value={name} onChange={(e) => onName(e.target.value)} placeholder="Name on the account" autoComplete="name" className={fieldBox} />
          </Field>
        </div>

        <DialogFooter>
          <button type="button" onClick={() => onOpenChange(false)} className={modalCancel}>Cancel</button>
          <button type="button" onClick={onSubmit} disabled={loading || submitDisabled} className={modalAction} style={{ background: accent }}>
            {loading ? <><Loader2 size={18} className="animate-spin" /> Sending request</> : "Request cashout"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
