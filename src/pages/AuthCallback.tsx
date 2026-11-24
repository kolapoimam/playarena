import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ensureProfile, takeAuthError } from "@/lib/ensureProfile";

/** Google sends people back here. Creates the profile for new accounts, then continues. */
export default function AuthCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let done = false;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("next") || "/profile";
    const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/profile";

    const fail = (description: string) => {
      if (done) return;
      done = true;
      toast({ title: "Sign in did not finish", description, variant: "destructive" });
      navigate("/auth", { replace: true });
    };

    const early = takeAuthError();
    if (early) {
      fail(early);
      return;
    }

    const finish = async () => {
      if (done) return;
      let { data } = await supabase.auth.getSession();
      const code = params.get("code");
      if (!data.session && code) {
        await supabase.auth.exchangeCodeForSession(code).catch(() => undefined);
        data = (await supabase.auth.getSession()).data;
      }
      if (!data.session) return;
      done = true;
      await ensureProfile(data.session.user);
      navigate(next, { replace: true });
    };

    const { data: sub } = supabase.auth.onAuthStateChange(() => { setTimeout(finish, 0); });
    finish();
    const t = setTimeout(() => fail("Please try signing in with Google again."), 15000);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(t);
    };
  }, [navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-sc-bg font-sans">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-sc-green mx-auto mb-4" />
        <p className="text-[15px] font-semibold text-sc-ink3">Completing your sign in</p>
      </div>
    </div>
  );
}
