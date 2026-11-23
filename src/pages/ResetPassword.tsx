import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { BrandMark, Card, ScButton, Screen } from "@/components/sc/ui";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data: d }) => d.session && setReady(true));
    return () => data.subscription.unsubscribe();
  }, []);

  const save = async () => {
    if (pw.length < 8) return setError("Use at least 8 characters.");
    if (pw !== pw2) return setError("The two passwords do not match.");
    setError(null);
    setBusy(true);
    const { error: e } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (e) return setError(e.message);
    toast({ title: "Password updated", description: "You are signed in with your new password." });
    navigate("/", { replace: true });
  };

  return (
    <Screen>
      <main className="px-5 pt-[max(env(safe-area-inset-top),2.5rem)] pb-10 flex flex-col gap-5">
        <BrandMark size={52} />
        <div className="flex flex-col gap-1">
          <h1 className="m-0 text-[30px] leading-[34px] font-extrabold tracking-[-0.03em]">Set a new password</h1>
          <p className="m-0 text-sc-ink2">Pick something you will remember. You will stay signed in after this.</p>
        </div>
        <Card className="flex flex-col gap-3">
          {!ready && <p className="m-0 text-sm text-sc-ink3">Checking your reset link...</p>}
          <label className="text-sm font-bold" htmlFor="pw">New password</label>
          <div className="relative">
            <Input id="pw" type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-sc-ink3">
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <label className="text-sm font-bold" htmlFor="pw2">Confirm password</label>
          <Input id="pw2" type={show ? "text" : "password"} value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
          {error && <span className="text-sm font-semibold text-red-600">{error}</span>}
          <ScButton icon={KeyRound} onClick={save} disabled={busy || !ready}>{busy ? "Saving..." : "Save password"}</ScButton>
        </Card>
        <button type="button" onClick={() => navigate("/auth")} className="text-sm font-bold text-sc-green-dark">Back to sign in</button>
      </main>
    </Screen>
  );
}
