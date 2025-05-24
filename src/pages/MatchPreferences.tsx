import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import Navbar from "@/components/Navbar";
import { ChevronLeft, CheckCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";

const profileSchema = z.object({
  state: z.string().min(1, "State is required"),
  skill_level: z.string().optional(),
  gender: z.enum(["male", "female"]).optional(),
  date_of_birth: z
    .string()
    .refine((date) => {
      const birthDate = new Date(date);
      const today = new Date("2025-05-24T14:03:00+01:00");
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
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();
        setProfile(profileData);
      }
    };
    fetchProfile();
  }, []);

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      state: profile?.state || "",
      skill_level: profile?.skill_level || "",
      gender: profile?.gender,
      date_of_birth: profile?.date_of_birth ? format(new Date(profile.date_of_birth), "yyyy-MM-dd") : "",
    },
  });

  const calculateAge = (dob?: string) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date("2025-05-24T14:03:00+01:00");
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

  return (
    <div className="min-h-screen bg-brand-light text-foreground font-nunito">
      {/* Header with Back Button */}
      <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700">
        <Button
          variant="ghost"
          onClick={() => navigate("/profile")}
          className="text-brand hover:text-brand-dark transition-colors duration-300"
        >
          <ChevronLeft className="w-5 h-5 mr-2" /> Back
        </Button>
        <h1 className="text-xl font-bold ml-4">Match Preferences</h1>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 dark:text-gray-300">State</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} className="text-base">
                    <FormControl>
                      <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg">
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
                          className="text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                  <FormLabel className="text-gray-700 dark:text-gray-300">Skill Level</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} className="text-base">
                    <FormControl>
                      <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg">
                        <SelectValue placeholder="Select skill level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {["Beginner", "Amateur", "Intermediate", "Advanced", "Professional"].map((level) => (
                        <SelectItem
                          key={level}
                          value={level}
                          className="text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                  <FormLabel className="text-gray-700 dark:text-gray-300">Gender</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} className="text-base">
                    <FormControl>
                      <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem
                        value="male"
                        className="text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        Male
                      </SelectItem>
                      <SelectItem
                        value="female"
                        className="text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                  <FormLabel className="text-gray-700 dark:text-gray-300">Date of Birth</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      className="text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg"
                    />
                  </FormControl>
                  {profile?.date_of_birth && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Age: {calculateAge(profile.date_of_birth)} years
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full bg-brand hover:bg-brand-dark text-white font-medium rounded-lg px-4 py-2 text-sm flex items-center justify-center transition-colors duration-300"
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
      </div>

      {/* Bottom Navbar */}
      <Navbar />

      {/* Custom Styles */}
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700&display=swap');
        .font-nunito {
          font-family: 'Nunito', sans-serif;
        }
        .text-brand {
          color: #17a34a;
        }
        .bg-brand {
          background-color: #17a34a;
        }
        .bg-brand-light {
          background-color: #e6f4ea;
        }
        .hover\:text-brand-dark:hover {
          color: #13863b;
        }
        .hover\:bg-brand-dark:hover {
          background-color: #13863b;
        }
      `}</style>
    </div>
  );
};

export default MatchPreferences;
