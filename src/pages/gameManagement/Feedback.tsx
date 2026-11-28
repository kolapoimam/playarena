import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Copy, Download, FileText, MessageSquareHeart, Sparkles, Star, KeyRound, Store, ClipboardList, Flag } from "lucide-react";
import { jsPDF } from "jspdf";
import Navbar from "@/components/Navbar";
import { Avatar, Card, FunEmpty, NavHeader, Screen, ScButton, formatShortDate, initialsOf } from "@/components/sc/ui";

type Match = {
  id: string;
  slug: string;
  super_code: string;
  organizer_name: string;
  title: string;
  match_date: string;
  match_time: string;
  players: { id: string; confirmation_code: string; player_name: string }[] | null;
};

type Feedback = {
  id: string;
  player_id: string;
  player_name: string;
  venue_quality: number;
  match_organization: number;
  referee_performance: number;
  comments: string;
  created_at: string;
};

type FeedbackSummary = { what_went_well: string[]; major_concerns: string[]; action_items: string[] };

const codeSchema = z.string().regex(/^\d{6}$/, { message: "Enter the 6 digit code from your ticket" });
const feedbackSchema = z.object({
  venue_quality: z.number().min(1).max(5),
  match_organization: z.number().min(1).max(5),
  referee_performance: z.number().min(1).max(5),
  comments: z.string().optional(),
});
type FeedbackFormValues = z.infer<typeof feedbackSchema>;

const CATS: { key: "venue_quality" | "match_organization" | "referee_performance"; label: string; icon: typeof Store; color: string; bg: string }[] = [
  { key: "venue_quality", label: "Venue", icon: Store, color: "#6D28D9", bg: "#EDE9FE" },
  { key: "match_organization", label: "Organisation", icon: ClipboardList, color: "#15803D", bg: "#E3F5E9" },
  { key: "referee_performance", label: "Refereeing", icon: Flag, color: "#C2410C", bg: "#FFEDD5" },
];
const MOODS = ["", "Poor", "Fair", "Good", "Great", "Brilliant"];

function Stars({ value, onChange, size = 34 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  return (
    <div className="flex gap-1.5" role={onChange ? "radiogroup" : undefined}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= value;
        const El = onChange ? "button" : "span";
        return (
          <El
            key={n}
            {...(onChange ? { type: "button", role: "radio", "aria-checked": value === n, "aria-label": `${n} of 5`, onClick: () => onChange(n) } : {})}
            className={onChange ? "active:scale-90 transition-transform" : ""}
          >
            <Star size={size} strokeWidth={1.8} fill={on ? "#FACC15" : "transparent"} color={on ? "#EAB308" : "#C9CEC6"} />
          </El>
        );
      })}
    </div>
  );
}

const Feedback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const matchSlug = searchParams.get("matchSlug");
  const [code, setCode] = useState(searchParams.get("code") || "");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [summary, setSummary] = useState<FeedbackSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [title, setTitle] = useState<string>("");

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { venue_quality: 0 as any, match_organization: 0 as any, referee_performance: 0 as any, comments: "" },
  });

  useEffect(() => {
    if (!matchSlug) return;
    supabase.from("matches").select("title").eq("slug", matchSlug).maybeSingle().then(({ data }) => setTitle((data as any)?.title || ""));
  }, [matchSlug]);

  const loadFeedback = async (matchId: string, withSummary: boolean) => {
    const { data: feedbackData } = await supabase
      .from("feedback")
      .select(`id, player_id, venue_quality, match_organization, referee_performance, comments, created_at, players(player_name)`)
      .eq("match_id", matchId)
      .order("created_at", { ascending: false });
    setFeedback(((feedbackData as any[]) || []).map((f) => ({ ...f, player_name: f.players?.player_name || "Player" })));
    if (!withSummary) return;
    const { data: summaryData } = await supabase.from("feedback_summaries").select("summary").eq("match_id", matchId).maybeSingle();
    const raw = (summaryData as any)?.summary;
    if (raw) {
      const norm = (v: unknown) => (Array.isArray(v) ? v : typeof v === "string" ? v.split("\n").filter(Boolean) : []);
      setSummary({ what_went_well: norm(raw.what_went_well), major_concerns: norm(raw.major_concerns), action_items: norm(raw.action_items) });
    }
  };

  const validateCode = async () => {
    const validation = codeSchema.safeParse(code.trim());
    if (!validation.success) {
      setCodeError(validation.error.errors[0].message);
      return;
    }
    setCodeError(null);
    setLoading(true);
    try {
      const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .select(`id, slug, super_code, organizer_name, title, match_date, match_time, players(id, confirmation_code, player_name)`)
        .eq("slug", matchSlug)
        .single();
      if (matchError || !matchData) {
        setCodeError("We could not find this match.");
        return;
      }
      const m: Match = { ...(matchData as any), players: Array.isArray((matchData as any).players) ? (matchData as any).players : [] };
      const c = code.trim();
      if (c === m.super_code) {
        setIsOrganizer(true);
        setMatch(m);
        await loadFeedback(m.id, true);
        return;
      }
      const player = m.players?.find((p) => p.confirmation_code === c);
      if (!player) {
        setCodeError("That code does not match any player in this match.");
        return;
      }
      const { data: existing } = await supabase.from("feedback").select("id").eq("match_id", m.id).eq("player_id", player.id).maybeSingle();
      setMatch(m);
      if (existing) {
        setHasSubmitted(true);
        await loadFeedback(m.id, true);
      }
    } catch (error) {
      console.error("Error validating code:", error);
      setCodeError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Links in the feedback email carry the ticket code, so open the form straight away
  const autoChecked = useRef(false);
  useEffect(() => {
    if (autoChecked.current || !matchSlug || !/^\d{6}$/.test(code.trim())) return;
    autoChecked.current = true;
    validateCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchSlug]);

  const onSubmit = async (data: FeedbackFormValues) => {
    if (!match || !match.players) return;
    if (!data.venue_quality || !data.match_organization || !data.referee_performance) {
      toast({ title: "Rate all three", description: "Tap the stars for venue, organisation and refereeing." });
      return;
    }
    setLoading(true);
    try {
      const player = match.players.find((p) => p.confirmation_code === code.trim());
      if (!player) return;
      const { error } = await supabase.from("feedback").insert({
        match_id: match.id,
        player_id: player.id,
        venue_quality: data.venue_quality,
        match_organization: data.match_organization,
        referee_performance: data.referee_performance,
        comments: data.comments || null,
      });
      if (error) throw error;
      toast({ title: "Thanks for the feedback", description: "Here is what other players said." });
      setHasSubmitted(true);
      await loadFeedback(match.id, true);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({ title: "Could not send feedback", description: "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const averages = useMemo(() => {
    const n = feedback.length || 1;
    return CATS.map((c) => ({ ...c, avg: feedback.reduce((s, f) => s + (f[c.key] || 0), 0) / n }));
  }, [feedback]);
  const overall = feedback.length ? averages.reduce((s, a) => s + a.avg, 0) / averages.length : 0;

  const downloadPDF = () => {
    if (!match || !feedback.length) return;

    const doc = new jsPDF();
    const img = new Image();
    img.src = "https://playarenagames.vercel.app/playarenalight.png"; // Updated to a valid public URL
    img.crossOrigin = "anonymous";

    const loadImage = new Promise((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = () => {
        console.warn("Logo image failed to load, proceeding without logo.");
        resolve(null); // Fallback to proceed without logo
      };
    });

    loadImage.then((loadedImg) => {
      // Header with branding
      if (loadedImg) doc.addImage(loadedImg, "PNG", 10, 10, 40, 40);
      doc.setFillColor(0, 128, 0); // Green background
      doc.rect(10, 10, 190, 40, "F");
      doc.setTextColor(255, 255, 255); // White text
      doc.setFontSize(20);
      doc.text(`${match.title} Report`, 105, 30, { align: "center" });
      const now = new Date();
      doc.setFontSize(10);
      doc.text(`Generated: ${now.toLocaleString("en-NG", { timeZone: "Africa/Lagos", hour12: true })}`, 105, 40, { align: "center" });

      // Content Section
      doc.setFillColor(240, 240, 240); // Light gray background
      doc.rect(10, 60, 190, 120, "F");
      doc.setTextColor(0, 0, 0); // Black text
      doc.setFontSize(14);
      doc.text("Feedback Details", 105, 70, { align: "center" });
      let y = 80;
      feedback.forEach((f, index) => {
        doc.setFontSize(10);
        doc.text(`Player ${index + 1}: ${f.player_name}`, 20, y);
        y += 10;
        doc.text(`Venue: ${f.venue_quality}/5`, 20, y);
        doc.text(`Org: ${f.match_organization}/5`, 80, y);
        doc.text(`Ref: ${f.referee_performance}/5`, 140, y);
        y += 10;
        if (f.comments) {
          doc.text("Comments:", 20, y);
          doc.setTextColor(100);
          doc.text(f.comments, 40, y, { maxWidth: 150 });
          y += 10 + Math.ceil(f.comments.length / 50) * 5;
        }
        y += 5;
        if (y > 160) {
          doc.addPage();
          doc.setFillColor(0, 128, 0);
          doc.rect(10, 10, 190, 40, "F");
          if (loadedImg) doc.addImage(loadedImg, "PNG", 10, 10, 40, 40);
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(20);
          doc.text("Sport Cliq Feedback Report (Cont.)", 105, 30, { align: "center" });
          doc.setFontSize(10);
          doc.text(`Generated: ${now.toLocaleString("en-NG", { timeZone: "Africa/Lagos", hour12: true })}`, 105, 40, { align: "center" });
          doc.setFillColor(240, 240, 240);
          doc.rect(10, 60, 190, 120, "F");
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(14);
          doc.text("Feedback Details", 105, 70, { align: "center" });
          y = 80;
        }
      });

      // Footer
      doc.setFillColor(0, 128, 0);
      doc.rect(10, 280, 190, 10, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text("© 2025 Sport Cliq. All rights reserved.", 105, 286, { align: "center" });

      doc.save(`feedback_${match.title.replace(/\s+/g, "_")}.pdf`);
    }).catch((error) => {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Proceeding without logo.",
        variant: "destructive",
      });
    });
  };

  const generateSummary = async () => {
    if (!feedback.length) {
      toast({
        title: "No Feedback",
        description: "No feedback available to generate a summary.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const comments = feedback.map((f) => f.comments || "").filter(Boolean);
      const avgVenueQuality = feedback.reduce((sum, f) => sum + f.venue_quality, 0) / feedback.length;
      const avgMatchOrganization = feedback.reduce((sum, f) => sum + f.match_organization, 0) / feedback.length;
      const avgRefereePerformance = feedback.reduce((sum, f) => sum + f.referee_performance, 0) / feedback.length;

      const prompt = `
        You are an expert in sports event analysis. Create a concise summary from player feedback with numerical ratings and comments, formatted as JSON with three sections: "what_went_well", "major_concerns", and "action_items". Each section should list 3-5 specific bullet points (max 10 words each) based on trends in ratings (>3.5 for positives, <3.0 for concerns) and comments, avoiding generic statements.

        Feedback Data:
        - Average Venue Quality: ${avgVenueQuality.toFixed(1)}/5
        - Average Match Organization: ${avgMatchOrganization.toFixed(1)}/5
        - Average Referee Performance: ${avgRefereePerformance.toFixed(1)}/5
        - Comments: ${comments.join("\n")}

        Output Format (JSON):
        {
          "what_went_well": ["Item 1", "Item 2", "Item 3"],
          "major_concerns": ["Item 1", "Item 2", "Item 3"],
          "action_items": ["Item 1", "Item 2", "Item 3"]
        }
      `;

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        toast({
          title: "Error",
          description: "API key is not configured. Please contact support.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );

      const data = await response.json();
      const summaryText = data.candidates[0].content.parts[0].text;
      const cleanedSummaryText = summaryText.replace(/```json\n|\n```/g, "").trim();
      const summary: FeedbackSummary = JSON.parse(cleanedSummaryText);

      const { error } = await supabase.from("feedback_summaries").upsert({
        match_id: match!.id,
        summary,
      });

      if (error) throw error;

      setSummary(summary);
      setSummaryDialogOpen(true);
      toast({
        title: "Success",
        description: "Summary generated successfully.",
      });
    } catch (error) {
      console.error("Error generating summary:", error);
      toast({
        title: "Error",
        description: "Failed to generate summary. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copySummary = () => {
    if (!summary) return;
    const text = `Feedback Summary for ${match?.title || "Match"}

What Went Well:
${summary.what_went_well.map((item, i) => `${i + 1}. ${item}`).join("\n")}

Major Concerns:
${summary.major_concerns.map((item, i) => `${i + 1}. ${item}`).join("\n")}

Action Items:
${summary.action_items.map((item, i) => `${i + 1}. ${item}`).join("\n")}
  `;
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Summary copied to clipboard.",
    });
  };

  if (!matchSlug) {
    return (
      <Screen>
        <NavHeader title="Match feedback" />
        <div className="px-5 pt-4">
          <FunEmpty
            icon={MessageSquareHeart}
            sport="football"
            title="Pick a match first"
            body="Open a past match and tap Give feedback to rate it."
            primary={{ label: "My matches", onClick: () => navigate("/profile/my-matches") }}
          />
        </div>
        <Navbar />
      </Screen>
    );
  }

  const showResults = match && (isOrganizer || hasSubmitted);

  return (
    <Screen>
      <NavHeader title="Match feedback" />
      <main className="px-5 pt-2 pb-28 flex flex-col gap-4">
        {/* Match header */}
        <div className="rounded-3xl p-5 text-white relative overflow-hidden" style={{ background: "#16A34A" }}>
          <MessageSquareHeart className="absolute opacity-20" size={120} style={{ right: -16, top: -16 }} aria-hidden="true" />
          <span className="text-xs font-bold tracking-[0.12em] opacity-85">{isOrganizer ? "ORGANISER VIEW" : "HOW WAS THE GAME?"}</span>
          <h1 className="m-0 mt-1 text-[24px] leading-7 font-extrabold tracking-[-0.02em] relative">{match?.title || title || "Your match"}</h1>
          {match && <span className="text-sm opacity-90 relative">{formatShortDate(match.match_date)} · organised by {match.organizer_name}</span>}
        </div>

        {/* Step 1: code */}
        {!match && (
          <Card className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-2xl bg-sc-soft flex items-center justify-center"><KeyRound size={20} /></span>
              <div className="flex flex-col">
                <span className="text-base font-extrabold">Enter your ticket code</span>
                <span className="text-[13px] text-sc-ink3">The 6 digit code on your match ticket. Organisers use the super code.</span>
              </div>
            </div>
            <Input
              value={code}
              onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setCodeError(null); }}
              placeholder="6-digit code"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="text-center text-2xl tracking-[0.4em] font-extrabold h-[60px]"
              onKeyDown={(e) => e.key === "Enter" && validateCode()}
            />
            {codeError && <span className="text-sm font-semibold text-red-600 -mt-2">{codeError}</span>}
            <ScButton onClick={validateCode} disabled={loading || code.length !== 6}>{loading ? "Checking..." : "Continue"}</ScButton>
            <button type="button" onClick={() => navigate("/profile/my-matches")} className="text-sm font-bold text-sc-green-dark">Find my code in My matches</button>
          </Card>
        )}

        {/* Step 2: rate */}
        {match && !showResults && (
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
            {CATS.map((c) => {
              const v = form.watch(c.key) as number;
              return (
                <Card key={c.key} className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: c.bg, color: c.color }}><c.icon size={20} /></span>
                    <span className="flex-1 text-base font-extrabold">{c.label}</span>
                    <span className="text-sm font-bold text-sc-ink3">{MOODS[v] || "Tap to rate"}</span>
                  </div>
                  <Stars value={v} onChange={(n) => form.setValue(c.key, n, { shouldValidate: true })} />
                </Card>
              );
            })}
            <Card className="flex flex-col gap-2">
              <span className="text-base font-extrabold">Anything else?</span>
              <Textarea {...form.register("comments")} placeholder="What went well, what could be better" className="min-h-[110px] rounded-2xl text-base" />
            </Card>
            <ScButton type="submit" disabled={loading}>{loading ? "Sending..." : "Send feedback"}</ScButton>
          </form>
        )}

        {/* Step 3: results */}
        {showResults && (
          <>
            {hasSubmitted && !isOrganizer && (
              <div className="rounded-2xl px-4 py-3 text-sm font-bold bg-sc-soft text-sc-green-dark">You have rated this match. Here is what everyone said.</div>
            )}
            {feedback.length === 0 ? (
              <FunEmpty icon={MessageSquareHeart} sport="football" title="No ratings yet" body="Once players rate the match, their scores show up here." />
            ) : (
              <>
                <Card className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <span className="text-[44px] leading-none font-extrabold tracking-[-0.03em]">{overall.toFixed(1)}</span>
                      <span className="text-xs font-bold text-sc-ink3 mt-1">{feedback.length} {feedback.length === 1 ? "rating" : "ratings"}</span>
                    </div>
                    <Stars value={Math.round(overall)} size={26} />
                  </div>
                  {averages.map((a) => (
                    <div key={a.key} className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: a.bg, color: a.color }}><a.icon size={17} /></span>
                      <span className="w-[104px] text-sm font-bold">{a.label}</span>
                      <div className="flex-1 h-2.5 rounded-full bg-sc-soft overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(a.avg / 5) * 100}%`, background: a.color }} /></div>
                      <span className="w-8 text-right text-sm font-extrabold">{a.avg.toFixed(1)}</span>
                    </div>
                  ))}
                </Card>

                {summary && (
                  <Card className="flex flex-col gap-2">
                    <span className="text-base font-extrabold inline-flex items-center gap-2"><Sparkles size={18} className="text-sc-green" /> Summary</span>
                    {summary.what_went_well.length > 0 && <p className="m-0 text-sm text-sc-ink2"><b>Went well.</b> {summary.what_went_well.join(". ")}</p>}
                    {summary.major_concerns.length > 0 && <p className="m-0 text-sm text-sc-ink2"><b>Concerns.</b> {summary.major_concerns.join(". ")}</p>}
                    {isOrganizer && summary.action_items.length > 0 && <p className="m-0 text-sm text-sc-ink2"><b>Next time.</b> {summary.action_items.join(". ")}</p>}
                  </Card>
                )}

                <span className="text-[13px] font-bold text-sc-ink2 mt-1">What players said</span>
                {feedback.map((f) => {
                  const avg = (f.venue_quality + f.match_organization + f.referee_performance) / 3;
                  return (
                    <Card key={f.id} className="flex flex-col gap-2.5">
                      <div className="flex items-center gap-3">
                        <Avatar initials={initialsOf(f.player_name)} seed={f.player_name} size={40} />
                        <span className="flex-1 min-w-0 flex flex-col">
                          <span className="text-[15px] font-extrabold truncate">{isOrganizer ? f.player_name : f.player_name.split(" ")[0]}</span>
                          <span className="text-xs text-sc-ink3">{formatShortDate(f.created_at)}</span>
                        </span>
                        <span className="h-8 px-3 rounded-full bg-[#FEF9C3] text-[#A16207] text-sm font-extrabold inline-flex items-center gap-1"><Star size={14} fill="#EAB308" color="#EAB308" /> {avg.toFixed(1)}</span>
                      </div>
                      {f.comments && <p className="m-0 text-[15px] leading-[22px] text-sc-ink2">{f.comments}</p>}
                      <div className="flex gap-1.5 flex-wrap">
                        {CATS.map((c) => (
                          <span key={c.key} className="h-7 px-2.5 rounded-full text-xs font-bold inline-flex items-center" style={{ background: c.bg, color: c.color }}>{c.label} {f[c.key]}/5</span>
                        ))}
                      </div>
                    </Card>
                  );
                })}

                {isOrganizer && (
                  <div className="flex flex-col gap-2.5 mt-2">
                    <ScButton onClick={generateSummary} disabled={loading}><Sparkles size={18} /> {loading ? "Working..." : summary ? "Refresh summary" : "Summarise feedback"}</ScButton>
                    <ScButton kind="soft" onClick={downloadPDF}><Download size={18} /> Download report</ScButton>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      <Dialog open={summaryDialogOpen} onOpenChange={setSummaryDialogOpen}>
        <DialogContent className="w-full max-w-[calc(100%-1.5rem)] sm:max-w-[420px] rounded-[28px] bg-sc-bg p-5 max-h-[88vh] overflow-y-auto">
          <DialogTitle className="text-xl font-extrabold text-sc-ink inline-flex items-center gap-2"><FileText size={20} /> Feedback summary</DialogTitle>
          <DialogDescription className="text-sm text-sc-ink2">Built from your players' ratings and comments.</DialogDescription>
          {summary && (
            <div className="flex flex-col gap-3 mt-2">
              {([
                ["What went well", summary.what_went_well, "#15803D", "#E3F5E9"],
                ["Concerns", summary.major_concerns, "#B91C1C", "#FEE2E2"],
                ["Action items", summary.action_items, "#1D4ED8", "#DBEAFE"],
              ] as const).map(([t, items, fg, bg]) => (
                <div key={t} className="bg-white rounded-3xl p-4 flex flex-col gap-2">
                  <span className="text-xs font-extrabold tracking-[0.1em] uppercase" style={{ color: fg }}>{t}</span>
                  {items.map((it, i) => (
                    <div key={i} className="flex gap-2 text-sm text-sc-ink2"><span className="w-5 h-5 rounded-full text-[11px] font-extrabold flex items-center justify-center shrink-0" style={{ background: bg, color: fg }}>{i + 1}</span>{it}</div>
                  ))}
                </div>
              ))}
              <ScButton kind="soft" onClick={copySummary}><Copy size={16} /> Copy summary</ScButton>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Navbar />
    </Screen>
  );
};

export default Feedback;
