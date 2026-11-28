import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// The confirmation email links to Supabase first. Supabase confirms the account and then
// sends the person here. Depending on settings the result arrives as tokens in the hash,
// a code in the query, a token hash, or an error. Each case is handled below.
const Confirm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const get = (k: string) => query.get(k) ?? hash.get(k);

    const done = (signedIn: boolean) => {
      toast({
        title: "Email confirmed",
        description: signedIn ? "Welcome to SportCliq. You are signed in." : "You can now sign in.",
      });
      // Remove tokens from the address bar
      window.history.replaceState(null, "", "/confirm");
      navigate(signedIn ? "/" : "/auth", { replace: true });
    };

    const fail = (message?: string) => {
      toast({
        title: "Confirmation link did not work",
        description:
          message && !/invalid|expired/i.test(message)
            ? message
            : "This link has expired or was already used. Try signing in. If that fails, sign up again to get a new link.",
        variant: "destructive",
      });
      window.history.replaceState(null, "", "/confirm");
      navigate("/auth", { replace: true });
    };

    const run = async () => {
      try {
        const errorDescription = get("error_description");
        if (errorDescription) return fail(errorDescription.replace(/\+/g, " "));

        // Tokens in the hash. The Supabase client reads them on load, so a session may already exist.
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (error) {
            const { data } = await supabase.auth.getSession();
            if (!data.session) return fail(error.message);
          }
          return done(true);
        }

        // PKCE code in the query
        const code = query.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            const { data } = await supabase.auth.getSession();
            if (!data.session) return fail(error.message);
          }
          return done(true);
        }

        // Token hash from a custom email template
        const tokenHash = get("token_hash");
        const type = (get("type") || "signup") as "signup" | "email" | "invite" | "magiclink";
        if (tokenHash) {
          const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
          if (error) return fail(error.message);
          return done(!!data.session);
        }

        // Older links that carry the token and email
        const token = get("token");
        const email = get("email");
        if (token && email) {
          const { data, error } = await supabase.auth.verifyOtp({ token, type: "signup", email });
          if (error) return fail(error.message);
          return done(!!data.session);
        }

        // Nothing in the link, but the person may already be signed in from the redirect
        const { data } = await supabase.auth.getSession();
        if (data.session) return done(true);
        fail();
      } catch (e: any) {
        fail(e?.message);
      }
    };

    run();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" />
      <span className="ml-2">Confirming your email...</span>
    </div>
  );
};

export default Confirm;
