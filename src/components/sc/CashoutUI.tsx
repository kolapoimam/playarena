import React, { useEffect, useState } from "react";
import { ArrowDownToLine, Banknote, RefreshCw, Clock, CheckCircle2, XCircle, ChevronDown, ChevronLeft, Loader2, Wallet } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { modalAction, modalCancel } from "@/components/ui/modal-styles";
import { formatNairaExact } from "@/components/sc/ui";
import { cn } from "@/lib/utils";

export type CashoutRow = { id: string; amount: number; created_at: string; status: string; name?: string | null; bank?: string | null; account?: string | null };

const naira = (n: number) => formatNairaExact(Math.max(0, Number(n) || 0));

export function BalanceHero({ label = "Available to cash out", balance, onRefresh, onRequest, disabled, note, accent = "#16A34A", breakdown }: { label?: string; balance: number; onRefresh?: () => unknown; onRequest: () => void; disabled?: boolean; note?: string; accent?: string; breakdown?: { gross: number; fee: number; rate: number; requested: number; note: string } | null }) {
  const [spinning, setSpinning] = useState(false);
  const [updated, setUpdated] = useState(false);
  const empty = !(Number(balance) > 0);
  const off = disabled || empty;

  const refresh = async () => {
    if (!onRefresh || spinning) return;
    setSpinning(true);
    setUpdated(false);
    const started = Date.now();
    try {
      await onRefresh();
    } finally {
      // keep the spin visible long enough to notice
      setTimeout(() => { setSpinning(false); setUpdated(true); setTimeout(() => setUpdated(false), 1800); }, Math.max(0, 500 - (Date.now() - started)));
    }
  };

  return (
    <div className="relative rounded-[28px] p-5 text-white overflow-hidden" style={{ background: "#0E1411" }}>
      <span aria-hidden="true" className="absolute -right-12 -top-12 w-44 h-44 rounded-full border-[20px] border-white/10" />
      <span aria-hidden="true" className="absolute right-12 -bottom-16 w-32 h-32 rounded-full" style={{ background: accent, opacity: 0.35 }} />
      <div className="relative flex items-center justify-between">
        <span className="text-xs font-bold tracking-[0.12em] opacity-70 uppercase">{label}</span>
        {onRefresh && (
          <button type="button" onClick={refresh} disabled={spinning} aria-label="Refresh balance" className="h-9 pl-3 pr-3.5 rounded-full bg-white/10 active:bg-white/20 flex items-center gap-1.5 text-[13px] font-bold">
            {updated ? <CheckCircle2 size={16} /> : <RefreshCw size={16} className={spinning ? "animate-spin" : ""} />}
            {spinning ? "Checking" : updated ? "Updated" : "Refresh"}
          </button>
        )}
      </div>
      <div className={cn("relative mt-2 text-[40px] leading-[46px] font-extrabold tracking-[-0.03em] transition-opacity", spinning && "opacity-50")}>{naira(balance)}</div>
      {note && <p className="relative m-0 mt-1 text-[13px] opacity-70">{note}</p>}
      {breakdown && breakdown.gross > 0 && (
        <div className="relative mt-3 rounded-2xl bg-white/[0.07] px-3.5 py-2.5 flex flex-col gap-1.5 text-[13px]">
          <div className="flex justify-between gap-3"><span className="opacity-70">Collected</span><span className="font-bold">{naira(breakdown.gross)}</span></div>
          <div className="flex justify-between gap-3">
            <span className="opacity-70">{breakdown.rate > 0 ? `Platform fee ${Math.round(breakdown.rate * 100)}%` : "Platform fee"}</span>
            <span className="font-bold">{breakdown.fee > 0 ? `− ${naira(breakdown.fee)}` : "Free"}</span>
          </div>
          {breakdown.requested > 0 && <div className="flex justify-between gap-3"><span className="opacity-70">Already requested</span><span className="font-bold">− {naira(breakdown.requested)}</span></div>}
          {breakdown.rate === 0 && <span className="text-[12px] opacity-60">{breakdown.note}</span>}
        </div>
      )}
      <button
        type="button"
        onClick={onRequest}
        disabled={off}
        aria-disabled={off}
        className={cn(
          "relative mt-4 w-full h-[52px] rounded-full font-bold inline-flex items-center justify-center gap-2 transition",
          off ? "bg-[#262C28] text-white/40 cursor-not-allowed" : "text-white active:scale-[0.98]",
        )}
        style={off ? undefined : { background: accent }}
      >
        <ArrowDownToLine size={18} /> {empty ? "Nothing to cash out yet" : "Request cashout"}
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
                <span className="text-[16px] font-extrabold">{naira(r.amount)}</span>
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

const field = "block w-full min-w-0 h-11 rounded-xl bg-sc-bg border border-transparent px-3.5 text-[16px] font-semibold text-sc-ink outline-none transition focus:bg-white focus:border-sc-ink/20 placeholder:text-sc-ink3 placeholder:font-medium";
const err = "text-[12.5px] font-semibold text-[#B91C1C]";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 min-w-0">
      <span className="text-[13px] font-semibold text-sc-ink3 shrink-0">{label}</span>
      <span className="flex justify-end min-w-0 text-[14px] font-bold text-sc-ink text-right"><span className="truncate">{value}</span></span>
    </div>
  );
}

const STEPS = ["Amount", "Bank", "Confirm"];

/**
 * Cashout in three short steps. Amount, then bank details, then a check before sending.
 * The parent still validates and saves, and any error it returns sends the user back to that step.
 */
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
  const [step, setStep] = useState(0);
  const [local, setLocal] = useState<CashoutErrors>({});
  const amt = Number(amount) || 0;
  const bal = Math.max(0, Number(balance) || 0);

  useEffect(() => { if (open) { setStep(0); setLocal({}); } }, [open]);
  // An error from saving takes the user to the step that needs fixing
  useEffect(() => { if (errors.amount) setStep(0); }, [errors.amount]);
  useEffect(() => { if (errors.bank || errors.account || errors.name) setStep(1); }, [errors.bank, errors.account, errors.name]);

  const e = { amount: local.amount || errors.amount, bank: local.bank || errors.bank, account: local.account || errors.account, name: local.name || errors.name };

  const next = () => {
    if (step === 0) {
      if (!(amt > 0)) return setLocal({ amount: "Enter an amount" });
      if (amt > bal) return setLocal({ amount: `You can cash out up to ${naira(bal)}` });
      setLocal({}); setStep(1);
    } else if (step === 1) {
      const n: CashoutErrors = {};
      if (!bank) n.bank = "Choose your bank";
      if (!/^\d{10}$/.test(account)) n.account = "Enter the 10 digit account number";
      if (name.trim().length < 2) n.name = "Enter the name on the account";
      setLocal(n);
      if (!Object.keys(n).length) setStep(2);
    }
  };

  const quick = [0.25, 0.5, 1].map((f) => ({ label: f === 1 ? "Max" : `${f * 100}%`, value: Math.floor(bal * f) })).filter((q) => q.value > 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent className="sm:max-w-[360px] max-w-[calc(100%-2rem)] bg-white p-5 gap-4">
        <DialogHeader className="gap-1">
          <div className="flex items-center gap-2.5 mb-1">
            {step > 0 ? (
              <button type="button" onClick={() => { setLocal({}); setStep(step - 1); }} aria-label="Back" className="w-9 h-9 rounded-full bg-black/[0.05] flex items-center justify-center active:scale-95">
                <ChevronLeft size={18} strokeWidth={2.4} />
              </button>
            ) : (
              <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: `${accent}1F`, color: accent }}><ArrowDownToLine size={17} /></span>
            )}
            <div className="flex gap-1">
              {STEPS.map((s, i) => (
                <span key={s} className="h-1.5 rounded-full transition-all" style={{ width: i === step ? 22 : 8, background: i <= step ? accent : "rgba(14,20,17,0.12)" }} />
              ))}
            </div>
          </div>
          <DialogTitle className="text-[19px]">{step === 0 ? "How much?" : step === 1 ? "Where should it go?" : "Check and send"}</DialogTitle>
          <DialogDescription className="text-[14px]">
            {step === 0 ? (note || "Cash out your earnings to your bank.") : step === 1 ? "Use an account in your own name." : "We review every request before paying out."}
          </DialogDescription>
        </DialogHeader>

        {step === 0 && (
          <div className="flex flex-col gap-2.5 min-w-0">
            <div className={cn("rounded-2xl bg-sc-bg px-4 py-3 flex items-center gap-1.5 min-w-0 border", e.amount ? "border-[#B91C1C]/40" : "border-transparent")}>
              <span className="text-[24px] font-extrabold text-sc-ink3">₦</span>
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                value={amount ? Number(amount).toLocaleString("en-NG") : ""}
                onChange={(ev) => { setLocal({}); onAmount(ev.target.value.replace(/[^0-9]/g, "").slice(0, 9)); }}
                placeholder="0"
                aria-label="Amount in naira"
                className="sc-big-field w-full min-w-0 bg-transparent text-[28px] leading-[34px] font-extrabold tracking-[-0.02em] text-sc-ink outline-none placeholder:text-sc-ink3/40"
              />
            </div>
            <div className="flex items-center justify-between gap-2 min-w-0">
              <span className="text-[13px] font-semibold text-sc-ink3 truncate">Available {naira(bal)}</span>
              <div className="flex gap-1.5 shrink-0">
                {quick.map((q) => (
                  <button key={q.label} type="button" onClick={() => { setLocal({}); onAmount(String(q.value)); }} className="h-8 px-3 rounded-full text-[12.5px] font-bold active:scale-95" style={{ background: `${accent}1A`, color: accent }}>
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
            {e.amount && <span className={err}>{e.amount}</span>}
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-3 min-w-0">
            <label className="flex flex-col gap-1.5 min-w-0">
              <span className="text-[12.5px] font-bold text-sc-ink2">Bank</span>
              <span className="relative block min-w-0">
                <select value={bank} onChange={(ev) => { setLocal({}); onBank(ev.target.value); }} className={cn(field, "appearance-none pr-9 truncate", !bank && "text-sc-ink3 font-medium")}>
                  <option value="">Choose bank</option>
                  {banks.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-sc-ink3" />
              </span>
              {e.bank && <span className={err}>{e.bank}</span>}
            </label>
            <label className="flex flex-col gap-1.5 min-w-0">
              <span className="text-[12.5px] font-bold text-sc-ink2">Account number</span>
              <input value={account} onChange={(ev) => { setLocal({}); onAccount(ev.target.value.replace(/[^0-9]/g, "").slice(0, 10)); }} inputMode="numeric" pattern="[0-9]*" maxLength={10} placeholder="0123456789" className={cn(field, "tracking-[0.06em]")} />
              {e.account && <span className={err}>{e.account}</span>}
            </label>
            <label className="flex flex-col gap-1.5 min-w-0">
              <span className="text-[12.5px] font-bold text-sc-ink2">Account name</span>
              <input value={name} onChange={(ev) => { setLocal({}); onName(ev.target.value); }} placeholder="As shown by your bank" autoComplete="name" className={field} />
              {e.name && <span className={err}>{e.name}</span>}
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="rounded-2xl bg-sc-bg px-4 py-1.5 divide-y divide-sc-line min-w-0">
            <div className="flex items-center gap-3 py-3">
              <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${accent}1F`, color: accent }}><Wallet size={18} /></span>
              <span className="flex flex-col min-w-0">
                <span className="text-[12px] font-semibold text-sc-ink3">You will receive</span>
                <span className="text-[22px] leading-7 font-extrabold tracking-[-0.02em]">{naira(amt)}</span>
              </span>
            </div>
            <Row label="Bank" value={bank} />
            <Row label="Account" value={account} />
            <Row label="Name" value={name} />
            <Row label="Left after this" value={naira(bal - amt)} />
          </div>
        )}

        <div className="flex gap-2 pt-1">
          {step === 0 && <button type="button" onClick={() => onOpenChange(false)} className={cn(modalCancel, "flex-1 px-4")}>Cancel</button>}
          {step < 2 ? (
            <button type="button" onClick={next} className={cn(modalAction, "flex-1 px-4")} style={{ background: accent }}>Continue</button>
          ) : (
            <button type="button" onClick={onSubmit} disabled={loading || submitDisabled} className={cn(modalAction, "flex-1 px-4")} style={{ background: accent }}>
              {loading ? <><Loader2 size={18} className="animate-spin" /> Sending</> : `Send ${naira(amt)}`}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
