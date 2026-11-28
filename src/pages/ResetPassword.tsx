import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, CheckCircle2, Eye, EyeOff, KeyRound, Link2Off, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Card, NavHeader, ScButton, Screen } from "@/components/sc/ui";

type Stage = "checking" | "invalid" | "form" | "done";

const RULES = [
  { id: "len", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { id: "mix", label: "Letters and numbers", test: (p: string) => /[a-z]/i.test(p) && /\d/.test(p) },
  { id: "case", label: "A capital letter or a symbol", test: (p: string) => /[A-Z]/.test(p) || /[^a-z0-9]/i.test(p) },
];

/** Opened from the reset email. Checks the link, takes the new password, confirms it saved. */
export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stage, setStage] = useState<Stage>("checking");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Supabase puts errors like an expired link in the address
    const q = new URLSearchParams(window.location.search);
    const h = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const err = h.get("error_description") || q.get("error_description") || h.get("error") || q.get("error");
    if (err) {
      const code = h.get("error_code") || q.get("error_code") || "";
      setLinkError(/expired/i.test(code + err) ? "This reset link has expired." : "This reset link is not valid any more.");
      setStage("invalid");
      return;
    }
    let settled = false;
    const ok = () => { if (!settled) { settled = true; setStage("form"); } };
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) ok();
    });
    (async () => {
      const code = q.get("code");
      if (code) await supabase.auth.exchangeCodeForSession(code).catch(() => undefined);
      const { data: d } = await supabase.auth.getSession();
      if (d.session) ok();
    })();
    const t = setTimeout(() => {
      if (!settled) { setLinkError("We could not open this reset link."); setStage("invalid"); }
    }, 8000);
    return () => { data.subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  const passed = RULES.map((r) => r.test(pw));
  const strong = passed.every(Boolean);
  const matches = pw.length > 0 && pw === pw2;

  const save = async () => {
    setTried(true);
    if (!strong) return setError("Your new password needs to meet all three points below.");
    if (!matches) return setError("The two passwords do not match.");
    setError(null);
    setBusy(true);
    const { error: e } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (e) {
      const m = String(e.message || "");
      return setError(/different from the old|same as/i.test(m) ? "Pick a password you have not used before." : /session|expired|jwt/i.test(m) ? "Your reset link has expired. Ask for a new one." : m || "We could not save it. Please try again.");
    }
    setStage("done");
    toast({ title: "Password updated" });
  };

  return (
    <Screen withNav={false}>
      <NavHeader title="New password" backTo="/auth" />
      <main className="px-5 pt-4 flex flex-col gap-5 max-w-md mx-auto">
        {stage === "checking" && (
          <Card className="items-center text-center py-10">
            <Loader2 size={28} className="animate-spin text-sc-green" />
            <span className="text-sm font-semibold text-sc-ink3">Checking your reset link</span>
          </Card>
        )}

        {stage === "invalid" && (
          <>
            <div className="flex flex-col gap-2">
              <span className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center"><Link2Off size={26} /></span>
              <h1 className="m-0 text-[28px] leading-[32px] font-extrabold tracking-[-0.03em]">{linkError}</h1>
              <p className="m-0 text-[15px] leading-6 text-sc-ink2">Reset links work once and expire after an hour. Ask for a fresh one and use the newest email.</p>
            </div>
            <ScButton onClick={() => navigate("/forgot-password")}>Send a new link</ScButton>
            <button type="button" onClick={() => navigate("/auth")} className="h-11 text-sm font-bold text-sc-green-dark">Back to sign in</button>
          </>
        )}

        {stage === "form" && (
          <>
            <div className="flex flex-col gap-2">
              <span className="w-14 h-14 rounded-2xl bg-sc-green-bg text-sc-green-dark flex items-center justify-center"><KeyRound size={26} /></span>
              <h1 className="m-0 text-[28px] leading-[32px] font-extrabold tracking-[-0.03em]">Set a new password</h1>
              <p className="m-0 text-[15px] leading-6 text-sc-ink2">Choose something you will remember. You stay signed in after this.</p>
            </div>
            <Card>
              <form onSubmit={(e) => { e.preventDefault(); save(); }} className="flex flex-col gap-3" noValidate>
                <label className="text-sm font-bold" htmlFor="pw">New password</label>
                <div className="relative">
                  <Input id="pw" type={show ? "text" : "password"} value={pw} onChange={(e) => { setPw(e.target.value); setError(null); }} autoComplete="new-password" autoFocus className="h-12 pr-12" aria-describedby="pw-rules" />
                  <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide passwords" : "Show passwords"} className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-sc-ink3">
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <ul id="pw-rules" className="m-0 p-0 list-none flex flex-col gap-1.5">
                  {RULES.map((r, i) => (
                    <li key={r.id} className={`flex items-center gap-2 text-[13px] font-semibold ${passed[i] ? "text-sc-green-dark" : tried ? "text-red-600" : "text-sc-ink3"}`}>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center ${passed[i] ? "bg-sc-green text-white" : "bg-sc-soft"}`}>{passed[i] && <Check size={12} strokeWidth={3} />}</span>
                      {r.label}
                    </li>
                  ))}
                </ul>
                <label className="text-sm font-bold mt-1" htmlFor="pw2">Confirm new password</label>
                <Input id="pw2" type={show ? "text" : "password"} value={pw2} onChange={(e) => { setPw2(e.target.value); setError(null); }} autoComplete="new-password" className="h-12" aria-invalid={pw2.length > 0 && !matches} />
                {pw2.length > 0 && (
                  <span className={`text-xs font-semibold ${matches ? "text-sc-green-dark" : "text-red-600"}`}>{matches ? "Passwords match" : "Passwords do not match yet"}</span>
                )}
                {error && <p role="alert" className="m-0 rounded-2xl bg-red-50 text-red-700 text-sm font-semibold px-4 py-3">{error}</p>}
                <ScButton type="submit" icon={busy ? undefined : KeyRound} disabled={busy}>{busy ? "Saving..." : "Save new password"}</ScButton>
              </form>
            </Card>
          </>
        )}

        {stage === "done" && (
          <>
            <div className="flex flex-col items-center text-center gap-3 pt-6">
              <span className="w-16 h-16 rounded-full bg-sc-green text-white flex items-center justify-center"><CheckCircle2 size={32} /></span>
              <h1 className="m-0 text-[28px] leading-[32px] font-extrabold tracking-[-0.03em]">Password updated</h1>
              <p className="m-0 text-[15px] leading-6 text-sc-ink2 max-w-[300px]">You are signed in. Use your new password next time you sign in.</p>
            </div>
            <ScButton onClick={() => navigate("/", { replace: true })}>Continue to SportCliq</ScButton>
          </>
        )}
      </main>
    </Screen>
  );
}
