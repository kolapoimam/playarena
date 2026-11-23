import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, CheckCircle, ChevronDown, Mail, Lock } from "lucide-react";
import { format } from "date-fns";

type Profile = {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  nickname?: string;
  phone_number?: string;
  state?: string;
  skill_level?: string;
  gender?: "male" | "female";
  date_of_birth?: string;
  is_initial_setup: boolean;
  created_at?: string;
  updated_at?: string;
  last_email_change?: string;
};

type Venue = {
  id: string;
  name: string;
  slug: string;
  pin: string;
  verified: boolean;
};

const profileSchema = z.object({
  first_name: z
    .string()
    .min(3, "First name must be at least 3 characters")
    .regex(/^[a-zA-Z]+$/, "First name must contain only letters")
    .optional(),
  last_name: z
    .string()
    .min(3, "Last name must be at least 3 characters")
    .regex(/^[a-zA-Z]+$/, "Last name must contain only letters")
    .optional(),
  nickname: z
    .string()
    .min(3, "Nickname must be at least 3 characters")
    .regex(/^[a-zA-Z0-9\s]+$/, "Nickname must contain letters, numbers, and spaces")
    .optional(),
  phone_number: z
    .string()
    .regex(/^[0-9]{1,11}$/, "Phone number must contain only numbers and 11 digits")
    .optional(),
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

const emailSchema = z.object({
  new_email: z.string().email("Invalid email address"),
});

const pinSchema = z.object({
  access_pin: z
    .string()
    .length(6, "Access pin must be 6 characters")
    .regex(/^[a-zA-Z0-9]{6}$/, "Access pin must be 6 characters and contain only letters and numbers"),
});

type ProfileSettingsProps = {
  profile: Profile | null;
  setProfile: (profile: Profile) => void;
  setShowSettings: (show: boolean) => void;
};

const ProfileSettings = ({ profile, setProfile, setShowSettings }: ProfileSettingsProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [showChangeEmailDialog, setShowChangeEmailDialog] = useState(false);
  const [showVenueDialog, setShowVenueDialog] = useState(false);
  const [operationLoading, setOperationLoading] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [resetPasswordShouldClose, setResetPasswordShouldClose] = useState(false);
  const [changeEmailShouldClose, setChangeEmailShouldClose] = useState(false);
  const [venueShouldClose, setVenueShouldClose] = useState(false);

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: profile?.first_name || "",
      last_name: profile?.last_name || "",
      nickname: profile?.nickname || "",
      phone_number: profile?.phone_number || "",
      state: profile?.state || "",
      skill_level: profile?.skill_level || "",
      gender: profile?.gender,
      date_of_birth: profile?.date_of_birth ? format(new Date(profile.date_of_birth), "yyyy-MM-dd") : "",
    },
  });

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      new_email: "",
    },
  });

  const resetPasswordForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      new_email: profile?.email || "",
    },
  });

  const pinForm = useForm<z.infer<typeof pinSchema>>({
    resolver: zodResolver(pinSchema),
    defaultValues: {
      access_pin: "",
    },
  });

  useEffect(() => {
    const fetchVenues = async () => {
      if (!profile?.id) return;
      try {
        const { data, error } = await supabase
          .from("access_pins")
          .select(`
            venue_id,
            pin,
            verified,
            user_id,
            venues (
              id,
              name,
              slug
            )
          `)
          .eq("user_id", profile.id);

        if (error) {
          console.error("Error fetching venues:", error);
          if (error.code === "42703") {
            toast({ title: "Error", description: "Database schema issue. Please contact support.", variant: "destructive" });
          } else {
            toast({ title: "Error", description: "Failed to fetch linked venues.", variant: "destructive" });
          }
          return;
        }

        setVenues(
          data.map((item) => ({
            id: item.venues.id,
            name: item.venues.name,
            slug: item.venues.slug,
            pin: item.pin,
            verified: item.verified === 'true',
          }))
        );
      } catch (err) {
        console.error("Unexpected error fetching venues:", err);
        toast({ title: "Error", description: "An unexpected error occurred while fetching venues.", variant: "destructive" });
      }
    };
    fetchVenues();
  }, [profile?.id, toast]);

  const onSubmit = async (data: z.infer<typeof profileSchema>) => {
    setLoading(true);
    const updates = profile?.is_initial_setup
      ? data
      : {
          nickname: data.nickname,
          state: data.state,
          skill_level: data.skill_level,
          date_of_birth: data.date_of_birth,
        };

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ ...updates, is_initial_setup: false, updated_at: new Date().toISOString() })
        .eq("id", profile?.id);

      if (error) {
        throw new Error(error.message);
      }

      toast({ title: "Success", description: "Profile updated successfully!" });
      setProfile({ ...profile!, ...updates, is_initial_setup: false, updated_at: new Date().toISOString() });
      setShowSettings(false);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({ title: "Error", description: error.message || "Failed to update profile.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (data: z.infer<typeof emailSchema>) => {
    console.log("Reset Password triggered with:", data);
    setOperationLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.new_email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: "Success",
        description: "Password reset email sent! Please check your inbox and spam folder.",
        variant: "default",
      });
      setResetPasswordShouldClose(true);
      setShowResetPasswordDialog(false);
      resetPasswordForm.reset();
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send reset password email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setOperationLoading(false);
    }
  };

  const handleChangeEmail = async (data: z.infer<typeof emailSchema>) => {
    console.log("Change Email triggered with:", data);
    if (data.new_email === profile?.email) {
      toast({ title: "Error", description: "New email must be different from the current email.", variant: "destructive" });
      return;
    }

    setOperationLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: data.new_email });

      if (error) {
        throw new Error(error.message);
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ email: data.new_email, last_email_change: new Date().toISOString() })
        .eq("id", profile?.id);

      if (profileError) {
        throw new Error(profileError.message);
      }

      setProfile({ ...profile!, email: data.new_email, last_email_change: new Date().toISOString() });
      toast({
        title: "Success",
        description: "Email change initiated! Check your new and old email inboxes to confirm.",
        variant: "default",
      });
      setChangeEmailShouldClose(true);
      setShowChangeEmailDialog(false);
      emailForm.reset();
    } catch (error: any) {
      console.error("Error changing email:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to initiate email change. Please try again.",
        variant: "destructive",
      });
    } finally {
      setOperationLoading(false);
    }
  };

  const handleSubmitPin = async (data: z.infer<typeof pinSchema>) => {
    console.log("Submit Pin triggered with:", data);
    setOperationLoading(true);
    try {
      // Validate pin without user_id
      const { data: pinData, error: pinError } = await supabase
        .from("access_pins")
        .select(`
          venue_id,
          pin,
          verified,
          user_id,
          venues (
            id,
            name,
            slug,
            user_id
          )
        `)
        .eq("pin", data.access_pin)
        .single();

      if (pinError) {
        console.error("Pin validation error:", pinError);
        throw new Error(`Invalid or expired access pin: ${pinError.message}`);
      }

      if (!pinData) {
        console.error("No pin data returned for pin:", data.access_pin);
        throw new Error("Invalid or expired access pin.");
      }

      console.log("Pin data:", pinData);

      // Check if pin is already linked (handle verified as string)
      if (pinData.verified === 'true') {
        console.error("Pin already verified:", pinData);
        throw new Error("This access pin is already linked to a user.");
      }

      if (pinData.user_id) {
        console.error("Pin has user_id:", pinData.user_id);
        throw new Error("This access pin is already linked to a user.");
      }

      if (pinData.venues?.user_id) {
        console.error("Venue has user_id:", pinData.venues.user_id);
        throw new Error("This venue is already linked to a user.");
      }

      // Update access_pins with user_id and verified = 'true'
      const { error: updatePinError } = await supabase
        .from("access_pins")
        .update({
          user_id: profile?.id,
          verified: 'true',
          updated_at: new Date().toISOString(),
        })
        .eq("pin", data.access_pin);

      if (updatePinError) {
        console.error("Update access_pins error:", updatePinError);
        throw new Error(`Failed to link venue to profile: ${updatePinError.message}`);
      }

      // Update venues with user_id
      const { error: updateVenueError } = await supabase
        .from("venues")
        .update({
          user_id: profile?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pinData.venue_id);

      if (updateVenueError) {
        console.error("Update venues error:", updateVenueError);
        throw new Error(`Failed to update venue ownership: ${updateVenueError.message}`);
      }

      // Update local venues state
      setVenues([
        ...venues,
        {
          id: pinData.venues.id,
          name: pinData.venues.name,
          slug: pinData.venues.slug,
          pin: pinData.pin,
          verified: true,
        },
      ]);

      toast({
        title: "Success",
        description: "Venue successfully linked to your profile!",
        variant: "default",
      });

      // Redirect to venue management dashboard
      navigate(`/venuemanager/dashboard/${pinData.venue_id}`);
      setVenueShouldClose(true);
      setShowVenueDialog(false);
      pinForm.reset();
    } catch (error: any) {
      console.error("Error submitting pin:", error.message, error);
      if (error.code === "42703") {
        toast({ title: "Error", description: "Database schema issue. Please ensure user_id column exists.", variant: "destructive" });
      } else if (error.code === "42501") {
        toast({ title: "Error", description: "Permission denied. Please contact support.", variant: "destructive" });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to validate access pin. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setOperationLoading(false);
    }
  };

  const canChangeEmail = () => {
    if (!profile?.last_email_change) return true;
    const lastChange = new Date(profile.last_email_change);
    const now = new Date();
    const diffDays = (now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 30;
  };

  const calculateAge = (dob?: string) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const handleManageVenue = (venueId: string) => {
    navigate(`/venuemanager/dashboard/${venueId}`);
    setVenueShouldClose(true);
    setShowVenueDialog(false);
  };

  // Prevent dialogs from closing unless explicitly allowed
  const handleDialogOpenChange = (setter: (value: boolean) => void, shouldClose: boolean, setShouldClose: (value: boolean) => void) => (open: boolean) => {
    console.log(`Dialog open change: open=${open}, shouldClose=${shouldClose}, operationLoading=${operationLoading}`);
    if (!open && shouldClose && !operationLoading) {
      setter(false);
      setShouldClose(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card className="bg-white dark:bg-gray-800 border-none shadow-card rounded-3xl overflow-hidden">
        <details className="group">
          <summary className="flex items-center justify-between p-4 text-xl font-semibold text-sc-green-dark dark:text-green-400 cursor-pointer bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 hover:bg-green-200 dark:hover:bg-green-700 transition-colors">
            Account Details
            <ChevronDown className="w-6 h-6 transition-transform group-open:rotate-180 text-sc-green-dark dark:text-green-400" />
          </summary>
          <CardContent className="p-4 pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sc-ink2 dark:text-gray-300">First Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={!profile?.is_initial_setup}
                            className="text-base bg-white dark:bg-gray-700 border-sc-line dark:border-gray-600 text-sc-ink dark:text-gray-100 rounded-lg"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sc-ink2 dark:text-gray-300">Last Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={!profile?.is_initial_setup}
                            className="text-base bg-white dark:bg-gray-700 border-sc-line dark:border-gray-600 text-sc-ink dark:text-gray-100 rounded-lg"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="nickname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sc-ink2 dark:text-gray-300">Nickname</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="text-base bg-white dark:bg-gray-700 border-sc-line dark:border-gray-600 text-sc-ink dark:text-gray-100 rounded-lg"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sc-ink2 dark:text-gray-300">Phone Number</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={!profile?.is_initial_setup}
                          inputMode="numeric"
                          maxLength={11}
                          className="text-base bg-white dark:bg-gray-700 border-sc-line dark:border-gray-600 text-sc-ink dark:text-gray-100 rounded-lg"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div>
                  <FormLabel className="text-sc-ink2 dark:text-gray-300">Email Address</FormLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      value={profile?.email}
                      disabled
                      className="text-base bg-white dark:bg-gray-700 border-sc-line dark:border-gray-600 text-sc-ink dark:text-gray-100 rounded-lg flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="text-sc-green-dark border-sc-green hover:bg-green-500 hover:text-white rounded-lg"
                      onClick={() => setShowChangeEmailDialog(true)}
                      disabled={!canChangeEmail()}
                    >
                      <Mail size={16} className="mr-2" />
                      Change
                    </Button>
                  </div>
                  {!canChangeEmail() && (
                    <p className="text-sm text-sc-ink3 dark:text-gray-400 mt-1">
                      Email change is available again in 30 days from last change.
                    </p>
                  )}
                </div>
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full text-sc-green-dark border-sc-green hover:bg-green-500 hover:text-white rounded-lg"
                    onClick={() => setShowResetPasswordDialog(true)}
                  >
                    <Lock size={16} className="mr-2" />
                    Reset Password
                  </Button>
                </div>
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
                      Save Account Details
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </details>
      </Card>

      <Card className="bg-white dark:bg-gray-800 border-none shadow-card rounded-3xl overflow-hidden">
        <details className="group">
          <summary className="flex items-center justify-between p-4 text-xl font-semibold text-sc-green-dark dark:text-green-400 cursor-pointer bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 hover:bg-green-200 dark:hover:bg-green-700 transition-colors">
            Match Preferences
            <ChevronDown className="w-6 h-6 transition-transform group-open:rotate-180 text-sc-green-dark dark:text-green-400" />
          </summary>
          <CardContent className="p-4 pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sc-ink2 dark:text-gray-300">State</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        className="text-base"
                      >
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
                            "Zamfara", "FCT"
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
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        className="text-base"
                      >
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
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!profile?.is_initial_setup}
                        className="text-base"
                      >
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
                          disabled={!profile?.is_initial_setup}
                          className="text-base bg-white dark:bg-gray-700 border-sc-line dark:border-gray-600 text-sc-ink dark:text-gray-100 rounded-lg"
                        />
                      </FormControl>
                      {profile?.date_of_birth && !profile.is_initial_setup && (
                        <p className="text-sm text-sc-ink3 dark:text-gray-400 mt-1">
                          Age: {calculateAge(profile.date_of_birth)} years
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
        </details>
      </Card>

      <Card className="bg-white dark:bg-gray-800 border-none shadow-card rounded-3xl overflow-hidden">
        <details className="group">
          <summary className="flex items-center justify-between p-4 text-xl font-semibold text-sc-green-dark dark:text-green-400 cursor-pointer bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 hover:bg-green-200 dark:hover:bg-green-700 transition-colors">
            Wallet <span className="text-sm text-sc-ink3 dark:text-gray-400">Coming Soon</span>
            <ChevronDown className="w-6 h-6 transition-transform group-open:rotate-180 text-sc-green-dark dark:text-green-400" />
          </summary>
          <CardContent className="p-4 pt-6">
            <div className="relative bg-gradient-to-br from-green-600 to-green-800 text-white rounded-xl p-6 shadow-2xl max-w-md mx-auto">
              <img
                src="/playarenadark.png"
                alt="PlayArena Logo"
                className="absolute top-4 right-4 w-16 h-16 opacity-80"
              />
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-green-200">Account Name</p>
                  <p className="text-lg font-semibold">Kolapo Imam</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-green-200">Account Number</p>
                  <p className="text-2xl font-bold tracking-wide">**** **** **** 1234</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-green-200">Amount</p>
                  <p className="text-2xl font-bold">NGN 12,345.67</p>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 to-green-400 rounded-b-xl" />
              <p className="text-xs text-green-300 mt-4">
                * Wallet functionality is coming soon. These are placeholder details.
              </p>
            </div>
          </CardContent>
        </details>
      </Card>

      <Card className="bg-white dark:bg-gray-800 border-none shadow-card rounded-3xl overflow-hidden">
        <details className="group">
          <summary className="flex items-center justify-between p-4 text-xl font-semibold text-sc-green-dark dark:text-green-400 cursor-pointer bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 hover:bg-green-200 dark:hover:bg-green-700 transition-colors">
            Manage Venues
            <ChevronDown className="w-6 h-6 transition-transform group-open:rotate-180 text-sc-green-dark dark:text-green-400" />
          </summary>
          <CardContent className="p-4 pt-6">
            <Button
              type="button"
              variant="outline"
              className="w-full text-sc-green-dark border-sc-green hover:bg-green-500 hover:text-white rounded-lg"
              onClick={() => setShowVenueDialog(true)}
            >
              View and Manage Venues
            </Button>
          </CardContent>
        </details>
      </Card>

      <Dialog
        open={showResetPasswordDialog}
        onOpenChange={handleDialogOpenChange(setShowResetPasswordDialog, resetPasswordShouldClose, setResetPasswordShouldClose)}
      >
        <DialogContent className="sm:max-w-md rounded-3xl bg-white dark:bg-gray-800 shadow-2xl border-none">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-sc-green-dark dark:text-green-400 flex items-center">
              <Lock size={20} className="mr-2" />
              Reset Password
            </DialogTitle>
            <DialogDescription className="text-sc-ink3 dark:text-gray-300">
              Enter your email address to receive a password reset link. Please check your inbox and spam folder after submitting.
            </DialogDescription>
          </DialogHeader>
          <Form {...resetPasswordForm}>
            <form onSubmit={resetPasswordForm.handleSubmit(handleResetPassword)} className="space-y-4">
              <FormField
                control={resetPasswordForm.control}
                name="new_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sc-ink2 dark:text-gray-300">Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        className="text-base bg-white dark:bg-gray-700 border-sc-line dark:border-gray-600 text-sc-ink dark:text-gray-100 rounded-lg"
                        placeholder="Enter your email address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setResetPasswordShouldClose(true);
                    setShowResetPasswordDialog(false);
                    resetPasswordForm.reset();
                  }}
                  className="border-sc-line dark:border-gray-600 text-sc-ink2 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  disabled={operationLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-sc-green hover:brightness-95 text-sc-green-ink rounded-full font-bold"
                  disabled={operationLoading}
                >
                  {operationLoading ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showChangeEmailDialog}
        onOpenChange={handleDialogOpenChange(setShowChangeEmailDialog, changeEmailShouldClose, setChangeEmailShouldClose)}
      >
        <DialogContent className="sm:max-w-md rounded-3xl bg-white dark:bg-gray-800 shadow-2xl border-none">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-sc-green-dark dark:text-green-400 flex items-center">
              <Mail size={20} className="mr-2" />
              Change Email
            </DialogTitle>
            <DialogDescription className="text-sc-ink3 dark:text-gray-300">
              Enter your new email address. You'll receive confirmation emails in both your new and old inboxes. Note: Email changes are limited to once every 30 days.
            </DialogDescription>
          </DialogHeader>
          <Form {...emailForm}>
            <form onSubmit={emailForm.handleSubmit(handleChangeEmail)} className="space-y-4">
              <FormField
                control={emailForm.control}
                name="new_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sc-ink2 dark:text-gray-300">New Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        className="text-base bg-white dark:bg-gray-700 border-sc-line dark:border-gray-600 text-sc-ink dark:text-gray-100 rounded-lg"
                        placeholder="Enter new email address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setChangeEmailShouldClose(true);
                    setShowChangeEmailDialog(false);
                    emailForm.reset();
                  }}
                  className="border-sc-line dark:border-gray-600 text-sc-ink2 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  disabled={operationLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-sc-green hover:brightness-95 text-sc-green-ink rounded-full font-bold"
                  disabled={operationLoading}
                >
                  {operationLoading ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Changing...
                    </>
                  ) : (
                    "Change Email"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showVenueDialog}
        onOpenChange={handleDialogOpenChange(setShowVenueDialog, venueShouldClose, setVenueShouldClose)}
      >
        <DialogContent className="sm:max-w-md rounded-3xl bg-white dark:bg-gray-800 shadow-2xl border-none">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-sc-green-dark dark:text-green-400">Manage Venues</DialogTitle>
            <DialogDescription className="text-sc-ink3 dark:text-gray-300">
              Enter a 6-character access pin to link a venue to your profile, or manage existing linked venues.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 space-y-6">
            <Form {...pinForm}>
              <form onSubmit={pinForm.handleSubmit(handleSubmitPin)} className="space-y-4">
                <FormField
                  control={pinForm.control}
                  name="access_pin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sc-ink2 dark:text-gray-300">Access Pin</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="text"
                          maxLength={6}
                          className="text-base bg-white dark:bg-gray-700 border-sc-line dark:border-gray-600 text-sc-ink dark:text-gray-100 rounded-lg"
                          placeholder="Enter 6-character pin"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full bg-sc-green hover:brightness-95 text-sc-green-ink rounded-full font-bold"
                  disabled={operationLoading}
                >
                  {operationLoading ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    "Submit Pin"
                  )}
                </Button>
              </form>
            </Form>
            {venues.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-sc-ink dark:text-gray-100">Linked Venues</h3>
                {venues.map((venue) => (
                  <div key={venue.id} className="border-b border-sc-line dark:border-gray-700 pb-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sc-ink dark:text-gray-100">{venue.name}</p>
                        <p className="text-sm text-sc-ink3 dark:text-gray-400">Pin: {venue.pin}</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleManageVenue(venue.id)}
                        className="text-sc-green-dark border-sc-green hover:bg-green-500 hover:text-white"
                        disabled={operationLoading}
                      >
                        Manage
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setVenueShouldClose(true);
                setShowVenueDialog(false);
                pinForm.reset();
              }}
              className="border-sc-line dark:border-gray-600 text-sc-ink2 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              disabled={operationLoading}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfileSettings;
