import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, NavHeader, ScButton, Screen } from "@/components/sc/ui";

const CATS = [
  { key: "overall", label: "The ride overall" },
  { key: "route", label: "The route" },
  { key: "organisation", label: "How it was organised" },
] as const;
type Key = (typeof CATS)[number]["key"];

function Stars({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="flex gap-1.5" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} of 5`} onClick={() => onChange(n)} className="active:scale-90 transition-transform">
          <Star size={32} strokeWidth={1.8} fill={n <= value ? "#FACC15" : "transparent"} color={n <= value ? "#EAB308" : "#C9CEC6"} />
        </button>
      ))}
    </div>
  );
}

/** Feedback after a ride. The rider's ticket code proves they were on it. */
export default function RideFeedback() {
  const { slug = "" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [code, setCode] = useState(params.get("code") || "");
  const [scores, setScores] = useState<Record<Key, number>>({ overall: 0, route: 0, organisation: 0 });
  const [comments, setComments] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | "saved" | "already">(null);
  const once = useRef(false);

  useEffect(() => {
    if (once.current) return;
    once.current = true;
    supabase.from("cycling_events").select("title").eq("slug", slug).maybeSingle().then(({ data }) => setTitle((data as any)?.title || ""));
  }, [slug]);

  const submit = async () => {
    if (!/^\d{6}$/.test(code.trim())) return setError("Enter the 6 digit code on your ride ticket.");
    if (!scores.overall) return setError("Give the ride a rating first.");
    setBusy(true);
    setError(null);
    const { data, error: e } = await supabase.rpc("submit_ride_feedback" as any, {
      p_slug: slug, p_code: code.trim(), p_overall: scores.overall, p_organisation: scores.organisation, p_route: scores.route, p_comments: comments,
    } as any);
    setBusy(false);
    if (e) {
      const m = String(e.message || "");
      return setError(/wrong_code/.test(m) ? "That code is not on this ride. Check your ticket." : /ride_not_found/.test(m) ? "We could not find this ride." : "We could not send your feedback. Please try again.");
    }
    setDone(data === "already" ? "already" : "saved");
  };

  return (
    <Screen withNav={false}>
      <NavHeader title="Rate the ride" backTo={`/cycling/${slug}`} />
      <main className="px-5 pt-4 flex flex-col gap-4 max-w-md mx-auto">
        {done ? (
          <div className="flex flex-col items-center text-center gap-3 pt-8">
            <span className="w-16 h-16 rounded-full bg-sc-green text-white flex items-center justify-center"><CheckCircle2 size={32} /></span>
            <h1 className="m-0 text-[26px] leading-8 font-extrabold tracking-[-0.03em]">{done === "already" ? "You already rated this ride" : "Thanks for the feedback"}</h1>
            <p className="m-0 text-[15px] text-sc-ink2 max-w-[300px]">It goes to the host and helps make the next ride better.</p>
            <ScButton onClick={() => navigate("/cycling-activities")}>Find your next ride</ScButton>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <h1 className="m-0 text-[26px] leading-8 font-extrabold tracking-[-0.03em]">How was {title || "the ride"}?</h1>
              <p className="m-0 text-[15px] text-sc-ink2">About 30 seconds. Your feedback goes to the host.</p>
            </div>
            <Card>
              {CATS.map((c) => (
                <div key={c.key} className="flex flex-col gap-1.5">
                  <span className="text-sm font-bold">{c.label}{c.key !== "overall" && <span className="font-semibold text-sc-ink3">, optional</span>}</span>
                  <Stars value={scores[c.key]} label={c.label} onChange={(v) => setScores((s) => ({ ...s, [c.key]: v }))} />
                </div>
              ))}
              <label htmlFor="ride-comments" className="text-sm font-bold">What would make it better?</label>
              <Textarea id="ride-comments" value={comments} onChange={(e) => setComments(e.target.value.slice(0, 600))} placeholder="Pace, route, meeting point, anything" className="min-h-[96px] rounded-2xl" />
              <label htmlFor="ride-code" className="text-sm font-bold">Your ticket code</label>
              <Input id="ride-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="6 digit code" className="h-12 tracking-[0.3em] font-bold placeholder:tracking-normal" />
              {error && <p role="alert" className="m-0 rounded-2xl bg-red-50 text-red-700 text-sm font-semibold px-4 py-3">{error}</p>}
              <ScButton onClick={submit} disabled={busy}>{busy ? <Loader2 size={18} className="animate-spin" /> : "Send feedback"}</ScButton>
            </Card>
          </>
        )}
      </main>
    </Screen>
  );
}
