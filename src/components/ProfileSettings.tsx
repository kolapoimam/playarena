import { useState } from "react";
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
    .regex(/^[a-zA-Z0-9]+$/, "Nickname must be alphanumeric")
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
      const today = new Date("2025-05-14T17:37:00+01:00");
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
  const [operationLoading, setOperationLoading] = useState(false);

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

    const { error } = await supabase
      .from("profiles")
      .update({ ...updates, is_initial_setup: false, updated_at: new Date().toISOString() })
      .eq("id", profile?.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Profile updated successfully!" });
      setProfile({ ...profile!, ...updates, is_initial_setup: false, updated_at: new Date().toISOString() });
      setShowSettings(false);
    }
    setLoading(false);
  };

  const handleResetPassword = async () => {
    if (!profile?.email) {
      toast({ title: "Error", description: "No email associated with this account.", variant: "destructive" });
      setShowResetPasswordDialog(false);
      return;
    }

    setOperationLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
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
      setShowResetPasswordDialog(false);
    } catch (error: any) {
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
      setShowChangeEmailDialog(false);
      emailForm.reset();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to initiate email change. Please try again.",
        variant: "destructive",
      });
    } finally {
      setOperationLoading(false);
    }
  };

  const canChangeEmail = () => {
    if (!profile?.last_email_change) return true;
    const lastChange = new Date(profile.last_email_change);
    const now = new Date("2025-05-14T17:37:00+01:00");
    const diffDays = (now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 30;
  };

  const calculateAge = (dob?: string) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date("2025-05-14T17:37:00+01:00");
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white dark:bg-gray-800 border-none shadow-lg rounded-xl overflow-hidden">
        <details className="group">
          <summary className="flex items-center justify-between p-4 text-xl font-semibold text-green-700 dark:text-green-400 cursor-pointer bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 hover:bg-green-200 dark:hover:bg-green-700 transition-colors">
            Account Details
            <ChevronDown className="w-6 h-6 transition-transform group-open:rotate-180 text-green-600 dark:text-green-400" />
          </summary>
          <CardContent className="p-4 pt-0">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 dark:text-gray-300">First Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={!profile?.is_initial_setup}
                            className="text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg"
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
                        <FormLabel className="text-gray-700 dark:text-gray-300">Last Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={!profile?.is_initial_setup}
                            className="text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg"
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
                      <FormLabel className="text-gray-700 dark:text-gray-300">Nickname</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg"
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
                      <FormLabel className="text-gray-700 dark:text-gray-300">Phone Number</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={!profile?.is_initial_setup}
                          inputMode="numeric"
                          maxLength={11}
                          className="text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div>
                  <FormLabel className="text-gray-700 dark:text-gray-300">Email Address</FormLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      value={profile?.email}
                      disabled
                      className="text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg flex-1"
                    />
                    <Button
                      variant="outline"
                      className="text-green-500 border-green-500 hover:bg-green-500 hover:text-white rounded-lg"
                      onClick={() => setShowChangeEmailDialog(true)}
                      disabled={!canChangeEmail()}
                    >
                      <Mail size={16} className="mr-2" />
                      Change
                    </Button>
                  </div>
                  {!canChangeEmail() && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Email change is available again in 30 days from last change.
                    </p>
                  )}
                </div>
                <div>
                  <Button
                    variant="outline"
                    className="w-full text-green-500 border-green-500 hover:bg-green-500 hover:text-white rounded-lg"
                    onClick={() => setShowResetPasswordDialog(true)}
                  >
                    <Lock size={16} className="mr-2" />
                    Reset Password
                  </Button>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-2 text-sm flex items-center justify-center"
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

      <Card className="bg-white dark:bg-gray-800 border-none shadow-lg rounded-xl overflow-hidden">
        <details className="group">
          <summary className="flex items-center justify-between p-4 text-xl font-semibold text-green-700 dark:text-green-400 cursor-pointer bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 hover:bg-green-200 dark:hover:bg-green-700 transition-colors">
            Match Preferences
            <ChevronDown className="w-6 h-6 transition-transform group-open:rotate-180 text-green-600 dark:text-green-400" />
          </summary>
          <CardContent className="p-4 pt-0">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 dark:text-gray-300">State</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        className="text-base"
                      >
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
                            "Zamfara", "FCT"
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
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        className="text-base"
                      >
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
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!profile?.is_initial_setup}
                        className="text-base"
                      >
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
                          disabled={!profile?.is_initial_setup}
                          className="text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg"
                        />
                      </FormControl>
                      {profile?.date_of_birth && !profile.is_initial_setup && (
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
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-2 text-sm flex items-center justify-center"
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

      <Card className="bg-white dark:bg-gray-800 border-none shadow-lg rounded-xl overflow-hidden">
        <details className="group">
          <summary className="flex items-center justify-between p-4 text-xl font-semibold text-green-700 dark:text-green-400 cursor-pointer bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 hover:bg-green-200 dark:hover:bg-green-700 transition-colors">
            Wallet <span className="text-sm text-gray-500 dark:text-gray-400">Coming Soon</span>
            <ChevronDown className="w-6 h-6 transition-transform group-open:rotate-180 text-green-600 dark:text-green-400" />
          </summary>
          <CardContent className="p-4 pt-0">
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

      <Dialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white dark:bg-gray-800 shadow-2xl border-none">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-green-700 dark:text-green-400 flex items-center">
              <Lock size={20} className="mr-2" />
              Reset Password
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300">
              A password reset link will be sent to <span className="font-medium">{profile?.email}</span>. Please check your inbox and spam folder.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowResetPasswordDialog(false)}
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              className="bg-green-500 hover:bg-green-600 text-white rounded-lg"
              onClick={handleResetPassword}
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
        </DialogContent>
      </Dialog>

      <Dialog open={showChangeEmailDialog} onOpenChange={setShowChangeEmailDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white dark:bg-gray-800 shadow-2xl border-none">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-green-700 dark:text-green-400 flex items-center">
              <Mail size={20} className="mr-2" />
              Change Email
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300">
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
                    <FormLabel className="text-gray-700 dark:text-gray-300">New Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        className="text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg"
                        placeholder="Enter new email address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowChangeEmailDialog(false)}
                  className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-green-500 hover:bg-green-600 text-white rounded-lg"
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
    </div>
  );
};

export default ProfileSettings;
