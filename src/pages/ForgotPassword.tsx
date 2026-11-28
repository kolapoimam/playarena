import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Mail, MailCheck, RotateCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, NavHeader, ScButton, Screen } from "@/components/sc/ui";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const WAIT = 60;

/** Forgot password: ask for the email, then confirm the reset link is on its way. */
export default function ForgotPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get("email") || "");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (!wait) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const valid = EMAIL.test(email.trim());

  const send = async () => {
    setTouched(true);
    if (!valid) return;
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    if (e) {
      const m = String(e.message || "");
      setError(/rate|too many|seconds/i.test(m) ? "Too many tries. Wait a minute, then send the link again." : /network|fetch/i.test(m) ? "No connection. Check your internet and try again." : "We could not send the link just now. Please try again.");
      return;
    }
    setSent(true);
    setWait(WAIT);
  };

  return (
    <Screen withNav={false}>
      <NavHeader title="Reset password" backTo="/auth" />
      <main className="px-5 pt-4 flex flex-col gap-5 max-w-md mx-auto">
        {!sent ? (
          <>
            <div className="flex flex-col gap-2">
              <span className="w-14 h-14 rounded-2xl bg-sc-green-bg text-sc-green-dark flex items-center justify-center"><Mail size={26} /></span>
              <h1 className="m-0 text-[28px] leading-[32px] font-extrabold tracking-[-0.03em]">Forgot your password?</h1>
              <p className="m-0 text-[15px] leading-6 text-sc-ink2">Enter the email on your account. We will send you a link to set a new password.</p>
            </div>
            <Card>
              <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex flex-col gap-3" noValidate>
                <label htmlFor="reset-email" className="text-sm font-bold">Email address</label>
                <Input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  onBlur={() => setTouched(true)}
                  aria-invalid={touched && !valid}
                  aria-describedby="reset-email-msg"
                  className="h-12"
                />
                <span id="reset-email-msg" className={`text-xs font-semibold ${touched && !valid ? "text-red-600" : "text-sc-ink3"}`}>
                  {touched && !valid ? (email ? "That email does not look right." : "Enter your email address.") : "Use the email you signed up with."}
                </span>
                {error && <p role="alert" className="m-0 rounded-2xl bg-red-50 text-red-700 text-sm font-semibold px-4 py-3">{error}</p>}
                <ScButton type="submit" trailing={busy ? undefined : ArrowRight} disabled={busy}>{busy ? "Sending link..." : "Send reset link"}</ScButton>
              </form>
            </Card>
            <button type="button" onClick={() => navigate("/auth")} className="text-sm font-bold text-sc-green-dark">I remember it, back to sign in</button>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <span className="w-14 h-14 rounded-2xl bg-sc-green text-white flex items-center justify-center"><MailCheck size={26} /></span>
              <h1 className="m-0 text-[28px] leading-[32px] font-extrabold tracking-[-0.03em]">Check your email</h1>
              <p className="m-0 text-[15px] leading-6 text-sc-ink2">If <b className="text-sc-ink">{email.trim()}</b> has a SportCliq account, a reset link is on its way. It works once and expires after an hour.</p>
            </div>
            <Card>
              <ol className="m-0 pl-5 flex flex-col gap-2 text-sm text-sc-ink2 leading-6">
                <li>Open the email from SportCliq.</li>
                <li>Tap <b className="text-sc-ink">Reset password</b>.</li>
                <li>Choose your new password.</li>
              </ol>
              <p className="m-0 text-xs text-sc-ink3">Nothing yet? Check spam or promotions.</p>
              {error && <p role="alert" className="m-0 rounded-2xl bg-red-50 text-red-700 text-sm font-semibold px-4 py-3">{error}</p>}
              <ScButton kind="soft" icon={RotateCw} onClick={send} disabled={busy || wait > 0}>{busy ? "Sending..." : wait > 0 ? `Send again in ${wait}s` : "Send the link again"}</ScButton>
            </Card>
            <div className="flex flex-col gap-2">
              <ScButton kind="dark" onClick={() => navigate("/auth")}>Back to sign in</ScButton>
              <button type="button" onClick={() => { setSent(false); setError(null); }} className="h-11 text-sm font-bold text-sc-green-dark">Use a different email</button>
            </div>
          </>
        )}
      </main>
    </Screen>
  );
}
