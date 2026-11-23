import { Bubble, ScButton } from "@/components/sc/ui";
import { SlidersHorizontal, MapPin, Trophy, Users, Cake } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import { ChevronLeft, CheckCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import MatchCard from "@/components/match/MatchCard";
import MatchCodeInput from "@/components/match/MatchCodeInput";
import MatchDetails from "@/components/match/MatchDetails";
import MatchDetailsDialogue from "@/components/match/MatchDetailsDialogue";
import MatchDetailsForm from "@/components/match/MatchDetailsForm";
import MatchForm from "@/components/match/MatchForm";
import MatchHighlights from "@/components/match/MatchHighlights";
import MatchJoinersDialog from "@/components/match/MatchJoinersDialog";
import MatchPreviewDialog from "@/components/match/MatchPreviewDialog";
import MatchReport from "@/components/match/MatchReport";
import MatchSuccessDialog from "@/components/match/MatchSuccessDialog";
import TeamMatchDetails from "@/components/match/TeamMatchDetails";
import UserMatches from "@/components/match/UserMatches";

import { BackButton } from "@/components/sc/ui";
import { PageSkeleton } from "@/components/sc/skeletons";
const profileSchema = z.object({
  state: z.string().min(1, "State is required"),
  skill_level: z.string().optional(),
  gender: z.enum(["male", "female"]).optional(),
  date_of_birth: z
    .string()
    .refine((date) => {
      const birthDate = new Date(date);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
      return age >= 13;
    }, "You must be at least 13 years old")
    .optional(),
});

const MatchPreferences = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      state: "",
      skill_level: "",
      gender: undefined,
      date_of_birth: "",
    },
  });

  const { watch } = form;
  const dateOfBirth = watch("date_of_birth");

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.session.user.id)
        .single();

      if (error) {
        toast({ title: "Error", description: "Failed to load profile.", variant: "destructive" });
        setLoading(false);
        return;
      }

      setProfile(data);
      form.reset({
        state: data?.state || "",
        skill_level: data?.skill_level || "",
        gender: data?.gender || undefined,
        date_of_birth: data?.date_of_birth ? format(new Date(data.date_of_birth), "yyyy-MM-dd") : "",
      });
      setLoading(false);
    };

    fetchProfile();
  }, [navigate, toast, form]);

  const calculateAge = (dob?: string) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const onSubmit = async (data: z.infer<typeof profileSchema>) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", profile?.id);

      if (error) {
        throw new Error(error.message);
      }

      toast({ title: "Success", description: "Preferences updated successfully!" });
      setProfile({ ...profile, ...data });
      navigate("/profile");
    } catch (error: any) {
      console.error("Error updating preferences:", error);
      toast({ title: "Error", description: error.message || "Failed to update preferences.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PageSkeleton />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-sc-bg dark:bg-gray-900">
      <header className="px-5 pt-[max(env(safe-area-inset-top),1rem)]">
          <div className="pt-3 flex items-center justify-between gap-3">
            <BackButton to="/profile" />
            <h1 className="m-0 flex-1 text-center text-[17px] font-extrabold truncate">Match preferences</h1>
            <div className="min-w-11 flex justify-end"></div>
          </div>
        </header>

      <div className="flex-grow overflow-y-auto px-5 pt-3 pb-6">
        <div className="relative rounded-[28px] p-5 text-white overflow-hidden mb-4" style={{ background: "#16A34A" }}>
          <SlidersHorizontal className="absolute opacity-20" size={120} style={{ right: -16, top: -16 }} aria-hidden="true" />
          <span className="text-xs font-bold tracking-[0.12em] opacity-85">YOUR GAME</span>
          <p className="m-0 mt-1 text-[22px] leading-7 font-extrabold tracking-[-0.02em] max-w-[260px]">Tell us how you play and we show the right matches first.</p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
            <div className="bg-white rounded-3xl p-[18px] flex flex-col gap-3">
              <div className="flex items-center gap-3"><Bubble icon={MapPin} sport="football" size={40} radius={13} /><span className="text-base font-extrabold">Where you play</span></div>
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger aria-label="State" className="h-[52px] rounded-2xl text-base"><SelectValue placeholder="Choose your state" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {["Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara", "FCT"].map((st) => (
                          <SelectItem key={st} value={st} className="text-base">{st}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="bg-white rounded-3xl p-[18px] flex flex-col gap-3">
              <div className="flex items-center gap-3"><Bubble icon={Trophy} sport="tennis" size={40} radius={13} /><span className="text-base font-extrabold">Skill level</span></div>
              <FormField
                control={form.control}
                name="skill_level"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Skill level">
                      {["Beginner", "Amateur", "Intermediate", "Advanced", "Professional"].map((lv) => (
                        <button key={lv} type="button" role="radio" aria-checked={field.value === lv} onClick={() => field.onChange(lv)} className={`h-11 px-4 rounded-full text-sm font-bold ${field.value === lv ? "bg-sc-ink text-white" : "bg-sc-soft text-sc-ink"}`}>{lv}</button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="bg-white rounded-3xl p-[18px] flex flex-col gap-3">
              <div className="flex items-center gap-3"><Bubble icon={Users} sport="guide" size={40} radius={13} /><span className="text-base font-extrabold">Gender</span></div>
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Gender">
                      {[["male", "Male"], ["female", "Female"]].map(([v, l]) => (
                        <button key={v} type="button" role="radio" aria-checked={field.value === v} onClick={() => field.onChange(v)} className={`h-12 rounded-2xl text-[15px] font-bold ${field.value === v ? "bg-sc-ink text-white" : "bg-sc-soft text-sc-ink"}`}>{l}</button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="bg-white rounded-3xl p-[18px] flex flex-col gap-3">
              <div className="flex items-center gap-3"><Bubble icon={Cake} sport="pink" size={40} radius={13} /><span className="flex-1 text-base font-extrabold">Date of birth</span>{dateOfBirth && <span className="text-sm font-bold text-sc-ink3">{calculateAge(dateOfBirth)} years</span>}</div>
              <FormField
                control={form.control}
                name="date_of_birth"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input type="date" aria-label="Date of birth" {...field} disabled={!!profile?.date_of_birth} className="text-base" />
                    </FormControl>
                    {profile?.date_of_birth && <p className="m-0 text-xs text-sc-ink3">Your date of birth is locked once saved.</p>}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <ScButton type="submit" icon={CheckCircle} disabled={loading}>{loading ? "Saving..." : "Save preferences"}</ScButton>
          </form>
        </Form>
      </div>

      <div className="pb-28">
        <Navbar />
      </div>
    </div>
  );
};

export default MatchPreferences;
