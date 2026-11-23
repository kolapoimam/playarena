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
const profileSchema = z.object({
  state: z.string().min(1, "State is required"),
  skill_level: z.string().optional(),
  gender: z.enum(["male", "female"]).optional(),
  date_of_birth: z
    .string()
    .refine((date) => {
      const birthDate = new Date(date);
      const today = new Date("2025-05-24T17:01:00+01:00");
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
    const today = new Date("2025-05-24T17:01:00+01:00");
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
      <div className="min-h-screen flex items-center justify-center bg-sc-bg dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sc-green"></div>
      </div>
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

      <div className="flex-grow overflow-y-auto">
        <div className="container mx-auto px-4 py-6">
          <Card className="bg-white dark:bg-gray-800 border-none shadow-card rounded-3xl">
            <CardContent className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sc-ink2 dark:text-gray-300">State</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} className="text-base">
                          <FormControl>
                            <SelectTrigger className="bg-white dark:bg-gray-700 border-sc-line dark:border-gray-600 text-sc-ink dark:text-gray-100 rounded-lg">
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {[
                              "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
                              "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa",
                              "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger",
                              "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe",
                              "Zamfara", "FCT",
                            ].map((state) => (
                              <SelectItem
                                key={state}
                                value={state}
                                className="text-base bg-white dark:bg-gray-700 text-sc-ink dark:text-gray-100"
                              >
                                {state}
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
                    name="skill_level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sc-ink2 dark:text-gray-300">Skill Level</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} className="text-base">
                          <FormControl>
                            <SelectTrigger className="bg-white dark:bg-gray-700 border-sc-line dark:border-gray-600 text-sc-ink dark:text-gray-100 rounded-lg">
                              <SelectValue placeholder="Select skill level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {["Beginner", "Amateur", "Intermediate", "Advanced", "Professional"].map((level) => (
                              <SelectItem
                                key={level}
                                value={level}
                                className="text-base bg-white dark:bg-gray-700 text-sc-ink dark:text-gray-100"
                              >
                                {level}
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
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sc-ink2 dark:text-gray-300">Gender</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} className="text-base">
                          <FormControl>
                            <SelectTrigger className="bg-white dark:bg-gray-700 border-sc-line dark:border-gray-600 text-sc-ink dark:text-gray-100 rounded-lg">
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem
                              value="male"
                              className="text-base bg-white dark:bg-gray-700 text-sc-ink dark:text-gray-100"
                            >
                              Male
                            </SelectItem>
                            <SelectItem
                              value="female"
                              className="text-base bg-white dark:bg-gray-700 text-sc-ink dark:text-gray-100"
                            >
                              Female
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="date_of_birth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sc-ink2 dark:text-gray-300">Date of Birth</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            disabled={!!profile?.date_of_birth}
                            className="text-base bg-white dark:bg-gray-700 border-sc-line dark:border-gray-600 text-sc-ink dark:text-gray-100 rounded-lg"
                          />
                        </FormControl>
                        {dateOfBirth && (
                          <p className="text-sm text-sc-ink3 dark:text-gray-400 mt-1">
                            Age: {calculateAge(dateOfBirth)} years
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full bg-sc-green hover:brightness-95 text-sc-green-ink font-bold rounded-full px-4 py-2 text-sm flex items-center justify-center"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={16} className="mr-2" />
                        Save Preferences
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="pb-28">
        <Navbar />
      </div>
    </div>
  );
};

export default MatchPreferences;
