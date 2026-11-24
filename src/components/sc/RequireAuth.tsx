import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RowsSkeleton } from "@/components/sc/skeletons";
import Navbar from "@/components/Navbar";

const COPY: Record<string, { title: string; body: string }> = {
  organise: { title: "Sign in to organise", body: "Organising needs an account so your players, payments and cashouts stay safe with you. It takes less than a minute." },
  host: { title: "Sign in to host a ride", body: "Hosting needs an account so your riders, payments and cashouts stay safe with you. It takes less than a minute." },
  book: { title: "Sign in to book", body: "Venue bookings need an account so your booking, receipt and code stay safe with you. It takes less than a minute." },
  venue: { title: "Sign in to list a venue", body: "Venues are managed from an account so only you can change your listing and see your payouts." },
};

/**
 * Organising, hosting and booking need an account. Joining an activity does not.
 * Shows a friendly sign in screen and comes back here after signing in.
 */
export default function RequireAuth({ kind, children }: { kind: keyof typeof COPY; children: ReactNode }) {
  const [state, setState] = useState<"checking" | "in" | "out">("checking");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setState(data.session ? "in" : "out"));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setState(session ? "in" : "out"));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (state === "in") return <>{children}</>;
  if (state === "checking") return <div className="min-h-screen bg-sc-bg px-5 pt-16"><RowsSkeleton /></div>;

  const c = COPY[kind];
  const next = encodeURIComponent(location.pathname + location.search);
  return (
    <div className="min-h-screen bg-sc-bg font-sans text-sc-ink flex flex-col items-center justify-center px-6 pb-32 text-center">
      <div className="relative w-28 h-28 mb-6">
        <span className="absolute inset-0 rounded-[34px] bg-sc-green rotate-6" />
        <span className="absolute inset-0 rounded-[34px] bg-sc-ink flex items-center justify-center text-white">
          <LogIn size={40} strokeWidth={2.2} />
        </span>
      </div>
      <h1 className="m-0 text-[26px] leading-8 font-extrabold tracking-[-0.02em]">{c.title}</h1>
      <p className="m-0 mt-2 max-w-[320px] text-[15px] leading-[22px] text-sc-ink3">{c.body}</p>
      <div className="mt-7 w-full max-w-[320px] flex flex-col gap-2">
        <button type="button" onClick={() => navigate(`/auth?next=${next}`)} className="h-[52px] rounded-full bg-sc-ink text-white font-bold">Sign in or create account</button>
        <button type="button" onClick={() => navigate("/search")} className="h-[52px] rounded-full bg-black/[0.05] font-bold">Find something to join instead</button>
      </div>
      <Navbar />
    </div>
  );
}
