import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle, Copy, Download, FileText, AlertCircle, ArrowLeft } from "lucide-react";
import { jsPDF } from "jspdf";
import Navbar from "@/components/Navbar";

type Match = {
  id: string;
  slug: string;
  super_code: string;
  organizer_name: string;
  title: string;
  match_date: string;
  match_time: string;
  players: {
    id: string;
    confirmation_code: string;
    player_name: string;
  }[] | null;
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

type FeedbackSummary = {
  what_went_well: string[];
  major_concerns: string[];
  action_items: string[];
};

// Validation schemas
const codeSchema = z.string().regex(/^\d{6}$/, { message: "Code must be exactly 6 digits" });

const feedbackSchema = z.object({
  venue_quality: z.number().min(1).max(5),
  match_organization: z.number().min(1).max(5),
  referee_performance: z.number().min(1).max(5),
  comments: z.string().optional(),
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;

const Feedback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const matchSlug = searchParams.get("matchSlug");
  const [dialogOpen, setDialogOpen] = useState(true);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [summary, setSummary] = useState<FeedbackSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      venue_quality: 3,
      match_organization: 3,
      referee_performance: 3,
      comments: "",
    },
  });

  const isFeedbackExpired = () => {
    if (!match?.match_date || !match?.match_time) return true;
    const matchDateTime = new Date(`${match.match_date}T${match.match_time}`);
    const now = new Date("2025-05-13T21:44:00+01:00"); // 09:44 PM WAT, May 13, 2025
    const hoursSinceMatch = (now.getTime() - matchDateTime.getTime()) / (1000 * 60 * 60);
    return hoursSinceMatch > 48;
  };

  useEffect(() => {
    setDialogOpen(true);
    setMatch(null);
    setFeedback([]);
    setSummary(null);
    setIsOrganizer(false);
    setHasSubmitted(false);
    setCode("");
    setCodeError(null);
  }, [matchSlug]);

  const validateCode = async () => {
    const validation = codeSchema.safeParse(code);
    if (!validation.success) {
      setCodeError(validation.error.errors[0].message);
      return;
    }
    setCodeError(null);
    setLoading(true);

    try {
      const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .select(`
          id, slug, super_code, organizer_name, title, match_date, match_time,
          players(id, confirmation_code, player_name)
        `)
        .eq("slug", matchSlug)
        .single();

      if (matchError || !matchData) {
        toast({
          title: "Error",
          description: "Match not found. Please check the match slug.",
          variant: "destructive",
        });
        navigate("/matches");
        return;
      }

      const match: Match = {
        ...matchData,
        players: Array.isArray(matchData.players) ? matchData.players : [],
      };

      if (code === match.super_code) {
        setIsOrganizer(true);
        setMatch(match);
        setDialogOpen(false);

        const { data: feedbackData, error: feedbackError } = await supabase
          .from("feedback")
          .select(`
            id, player_id, venue_quality, match_organization, referee_performance, comments, created_at,
            players(player_name)
          `)
          .eq("match_id", match.id);

        if (feedbackError) throw feedbackError;

        setFeedback(
          feedbackData.map((f) => ({
            ...f,
            player_name: f.players?.player_name || "Unknown",
          }))
        );

        const { data: summaryData, error: summaryError } = await supabase
          .from("feedback_summaries")
          .select("summary")
          .eq("match_id", match.id)
          .single();

        if (summaryData && !summaryError) {
          setSummary(summaryData.summary);
        }

        return;
      }

      const player = match.players?.find((p) => p.confirmation_code === code);
      if (!player) {
        setCodeError("Invalid code. Please try again.");
        setLoading(false);
        navigate(`/match/${match.slug}`);
        return;
      }

      const { data: existingFeedback, error: feedbackError } = await supabase
        .from("feedback")
        .select("id")
        .eq("match_id", match.id)
        .eq("player_id", player.id)
        .single();

      if (existingFeedback && !feedbackError) {
        setHasSubmitted(true);
        setMatch(match);
        setDialogOpen(false);
        toast({
          title: "Feedback Already Submitted",
          description: "You have already submitted feedback for this match.",
        });
        return;
      }

      setMatch(match);
      setDialogOpen(false);
    } catch (error) {
      console.error("Error validating code:", error);
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
      navigate(`/match/${match?.slug || ""}`);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: FeedbackFormValues) => {
    if (!match || !match.players || isFeedbackExpired()) return;
    setLoading(true);

    try {
      const player = match.players.find((p) => p.confirmation_code === code);
      if (!player) {
        toast({
          title: "Error",
          description: "Player not found.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("feedback").insert({
        match_id: match.id,
        player_id: player.id,
        venue_quality: data.venue_quality,
        match_organization: data.match_organization,
        referee_performance: data.referee_performance,
        comments: data.comments || null,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Feedback submitted successfully.",
      });
      navigate(`/match/${match.slug}`);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
      doc.text("PlayArena Feedback Report", 105, 30, { align: "center" });
      const now = new Date("2025-05-13T21:44:00+01:00");
      doc.setFontSize(10);
      doc.text(`Generated: ${now.toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}`, 105, 40, { align: "center" });

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
          doc.text("PlayArena Feedback Report (Cont.)", 105, 30, { align: "center" });
          doc.setFontSize(10);
          doc.text(`Generated: ${now.toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}`, 105, 40, { align: "center" });
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
      doc.text("© 2025 PlayArena. All rights reserved.", 105, 286, { align: "center" });

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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
        <header className="sticky top-0 z-50 bg-green-500 text-white shadow-md">
          <div className="p-4 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="text-white hover:text-gray-200"
            >
              <ArrowLeft size={18} className="mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Feedback</h1>
            <div className="w-10"></div>
          </div>
        </header>
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 text-center border border-gray-200 dark:border-gray-700">
            <AlertCircle size={40} className="text-red-600 dark:text-red-500 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-red-600 dark:text-red-500">Invalid Match</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              No match slug provided. Please access feedback from the match details page.
            </p>
          </div>
        </div>
        <Navbar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <header className="sticky top-0 z-50 bg-green-500 text-white shadow-md">
        <div className="p-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-white hover:text-gray-200"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Feedback</h1>
          <div className="w-10"></div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/matches")}
          className="text-green-500 mb-4 hover:text-green-600"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back to Matches
        </Button>

        {match && !isOrganizer && !hasSubmitted && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Feedback for {match.title}
            </h2>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="venue_quality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Venue Quality</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="text-base">
                            <SelectValue placeholder="Select rating" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map((num) => (
                            <SelectItem key={num} value={num.toString()} className="text-base">
                              {num} / 5
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="match_organization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Match Organization</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="text-base">
                            <SelectValue placeholder="Select rating" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map((num) => (
                            <SelectItem key={num} value={num.toString()} className="text-base">
                              {num} / 5
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="referee_performance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Referee Performance</FormLabel>
                      <Select
                        onValueChange=(value) => field.onChange(parseInt(value))}
                        value={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="text-base">
                            <SelectValue placeholder="Select rating" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map((num) => (
                            <SelectItem key={num} value={num.toString()} className="text-base">
                              {num} / 5
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="comments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Comments / Complaints</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Share your thoughts about the match..."
                          className="text-base"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-2"
                  disabled={loading || isFeedbackExpired()}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} className="mr-2" />
                      Submit Feedback
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </div>
        )}

        {match && isOrganizer && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Feedback for {match.title}
              </h2>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Button
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg px-4 py-2 transition-colors shadow-sm"
                  onClick={downloadPDF}
                  disabled={!feedback.length}
                >
                  <Download size={18} className="mr-2" />
                  Download PDF
                </Button>
                <Button
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg px-4 py-2 transition-colors shadow-sm"
                  onClick={generateSummary}
                  disabled={loading || !feedback.length}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText size={18} className="mr-2" />
                      Generate Summary
                    </>
                  )}
                </Button>
              </div>
            </div>
            {feedback.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-900 dark:text-gray-100">
                  <thead className="text-xs uppercase bg-gray-100 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3">Player</th>
                      <th className="px-4 py-3">Venue Quality</th>
                      <th className="px-4 py-3">Match Organization</th>
                      <th className="px-4 py-3">Referee Performance</th>
                      <th className="px-4 py-3">Comments</th>
                      <th className="px-4 py-3">Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedback.map((f) => (
                      <tr
                        key={f.id}
                        className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                      >
                        <td className="px-4 py-3">{f.player_name}</td>
                        <td className="px-4 py-3">{f.venue_quality}/5</td>
                        <td className="px-4 py-3">{f.match_organization}/5</td>
                        <td className="px-4 py-3">{f.referee_performance}/5</td>
                        <td className="px-4 py-3">{f.comments || "N/A"}</td>
                        <td className="px-4 py-3">{new Date(f.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                No feedback has been submitted for this match yet.
              </p>
            )}
          </div>
        )}

        {hasSubmitted && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 text-center border border-gray-200 dark:border-gray-700">
            <CheckCircle size={40} className="text-green-500 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-green-600 dark:text-green-500">
              Feedback Already Submitted
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Thank you for your feedback. You have already submitted feedback for this match.
            </p>
          </div>
        )}
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) navigate(`/match/${match?.slug || matchSlug || ""}`);
        }}
      >
        <DialogContent className="max-w-md rounded-xl bg-white dark:bg-gray-800 p-6 shadow-md border border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 text-center">
              Enter Match Code
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400 text-center mt-2 text-sm">
              {isOrganizer
                ? "Enter your organizer super code to review feedback."
                : "Enter your 6-digit player confirmation code to proceed."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Enter 6-digit code"
              value={code}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
                setCode(value);
                setCodeError(null);
              }}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              className="w-full text-base"
            />
            {codeError && <p className="text-sm text-red-600 mt-1">{codeError}</p>}
          </div>
          <DialogFooter className="flex justify-center">
            <Button
              className="bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-2"
              onClick={validateCode}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Validating...
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={summaryDialogOpen} onOpenChange={setSummaryDialogOpen}>
        <DialogContent className="max-w-md rounded-xl bg-white dark:bg-gray-800 p-6 shadow-md border border-gray-200 dark:border-gray-700 mx-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 text-center">
              Feedback Summary
            </DialogTitle>
          </DialogHeader>
          {summary && (
            <div className="space-y-4 text-center">
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  What Went Well
                </h3>
                <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400">
                  {summary.what_went_well.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Major Concerns
                </h3>
                <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400">
                  {summary.major_concerns.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Action Items
                </h3>
                <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400">
                  {summary.action_items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-4 justify-center">
                <Button
                  className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-2"
                  onClick={copySummary}
                >
                  <Copy size={18} className="mr-2" />
                  Copy Summary
                </Button>
                <Button
                  className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-2"
                  onClick={() => {
                    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
                    const img = new Image();
                    img.src = "https://playarenagames.vercel.app/playarenalight.png";
                    img.crossOrigin = "anonymous";

                    const loadImage = new Promise((resolve, reject) => {
                      img.onload = () => resolve(img);
                      img.onerror = () => {
                        console.warn("Logo image failed to load, proceeding without logo.");
                        resolve(null);
                      };
                    });

                    loadImage.then((loadedImg) => {
                      // Header with branding
                      if (loadedImg) doc.addImage(loadedImg, "PNG", 10, 10, 40, 40);
                      doc.setFillColor(0, 128, 0);
                      doc.rect(10, 10, 190, 40, "F");
                      doc.setTextColor(255, 255, 255);
                      doc.setFontSize(24);
                      doc.text("PlayArena Feedback Summary", 105, 30, { align: "center" });
                      const now = new Date("2025-05-13T21:44:00+01:00");
                      doc.setFontSize(12);
                      doc.text(`Date: ${now.toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}`, 105, 40, { align: "center" });

                      // Content
                      doc.setFillColor(245, 245, 245);
                      doc.rect(20, 60, 170, 200, "F");
                      doc.setTextColor(0, 0, 0);
                      let y = 70;
                      const sections = ["What Went Well", "Major Concerns", "Action Items"];
                      const contents = [summary.what_went_well, summary.major_concerns, summary.action_items];
                      sections.forEach((section, idx) => {
                        doc.setFontSize(16);
                        doc.text(section, 30, y);
                        y += 10;
                        doc.setFontSize(12);
                        contents[idx].forEach((item, i) => {
                          doc.text(`• ${item}`, 40, y + i * 10);
                        });
                        y += contents[idx].length * 10 + 15;
                      });

                      // Footer
                      doc.setFillColor(0, 128, 0);
                      doc.rect(10, 270, 190, 20, "F");
                      doc.setTextColor(255, 255, 255);
                      doc.setFontSize(10);
                      doc.text("© 2025 PlayArena | Enhancing Your Sports Experience", 105, 280, { align: "center" });

                      doc.save(`summary_${match!.title.replace(/\s+/g, "_")}.pdf`);
                    }).catch((error) => {
                      console.error("Error generating PDF:", error);
                      toast({
                        title: "Error",
                        description: "Failed to generate PDF. Proceeding without logo.",
                        variant: "destructive",
                      });
                    });
                  }}
                >
                  <Download size={18} className="mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Navbar />
    </div>
  );
};

export default Feedback;
