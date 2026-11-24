import { Avatar, initialsOf, myGender } from "@/components/sc/ui";
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
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, CheckCircle, ChevronDown, Mail, Lock } from "lucide-react";
import Navbar from "@/components/Navbar";
import { ArrowLeft } from "lucide-react";

import { BackButton } from "@/components/sc/ui";
import { PageSkeleton } from "@/components/sc/skeletons";
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
});

const emailSchema = z.object({
  new_email: z.string().email("Invalid email address"),
});

const AccountDetails = ({ profile: initialProfile, setProfile: setInitialProfile }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState(initialProfile || null);
  const [loading, setLoading] = useState(true);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [showChangeEmailDialog, setShowChangeEmailDialog] = useState(false);
  const [operationLoading, setOperationLoading] = useState(false);
  const [resetPasswordShouldClose, setResetPasswordShouldClose] = useState(false);
  const [changeEmailShouldClose, setChangeEmailShouldClose] = useState(false);

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: profile?.first_name || "",
      last_name: profile?.last_name || "",
      nickname: profile?.nickname || "",
      phone_number: profile?.phone_number || "",
    },
  });

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      new_email: profile?.email || "",
    },
  });

  const resetPasswordForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      new_email: profile?.email || "",
    },
  });

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        navigate("/login");
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
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        nickname: data.nickname || "",
        phone_number: data.phone_number || "",
      });
      emailForm.reset({ new_email: data.email || "" });
      resetPasswordForm.reset({ new_email: data.email || "" });
      setLoading(false);
    };

    fetchProfile();
  }, [navigate, toast, form, emailForm, resetPasswordForm]);

  const onSubmit = async (data: z.infer<typeof profileSchema>) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", profile?.id);

      if (error) throw error;

      setProfile({ ...profile, ...data, updated_at: new Date().toISOString() });
      if (setInitialProfile) setInitialProfile({ ...profile, ...data, updated_at: new Date().toISOString() });
      toast({ title: "Success", description: "Profile updated successfully!" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" });
      console.error("Error updating profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (data: z.infer<typeof emailSchema>) => {
    setOperationLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.new_email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Password reset email sent! Check your inbox and spam folder.",
        variant: "default",
      });
      setResetPasswordShouldClose(true);
      setShowResetPasswordDialog(false);
      resetPasswordForm.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send reset password email. Please try again.",
        variant: "destructive",
      });
      console.error("Error resetting password:", error);
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

      if (error) throw error;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ email: data.new_email, last_email_change: new Date().toISOString() })
        .eq("id", profile?.id);

      if (profileError) throw profileError;

      setProfile({ ...profile, email: data.new_email, last_email_change: new Date().toISOString() });
      if (setInitialProfile) setInitialProfile({ ...profile, email: data.new_email, last_email_change: new Date().toISOString() });
      toast({
        title: "Success",
        description: "Email change initiated! Check your new and old email inboxes to confirm.",
        variant: "default",
      });
      setChangeEmailShouldClose(true);
      setShowChangeEmailDialog(false);
      emailForm.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initiate email change. Please try again.",
        variant: "destructive",
      });
      console.error("Error changing email:", error);
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
            <h1 className="m-0 flex-1 text-center text-[17px] font-extrabold truncate">Account details</h1>
            <div className="min-w-11 flex justify-end"></div>
          </div>
        </header>

      <div className="flex-grow overflow-y-auto">
        <div className="px-5 pt-3 pb-6 max-w-md mx-auto w-full flex flex-col gap-4">
          <div className="relative rounded-[28px] p-5 text-white overflow-hidden flex items-center gap-4" style={{ background: "#16A34A" }}>
            <span aria-hidden="true" className="absolute -right-10 -top-10 w-36 h-36 rounded-full border-[18px] border-white/15" />
            <span className="rounded-full border-4 border-white/70 shrink-0">
              <Avatar seed={form.watch("nickname") || form.watch("first_name") || "SportCliq"} gender={myGender()} initials={initialsOf(`${form.watch("first_name") || ""} ${form.watch("last_name") || ""}`.trim() || "SC")} size={64} />
            </span>
            <span className="relative flex flex-col min-w-0">
              <span className="text-[22px] leading-7 font-extrabold tracking-[-0.02em] truncate">{form.watch("nickname") || "Your profile"}</span>
              <span className="text-sm opacity-85 truncate">{[form.watch("first_name"), form.watch("last_name")].filter(Boolean).join(" ") || "Add your name below"}</span>
            </span>
          </div>
          <Card className="bg-white border-none shadow-none rounded-3xl">
            <CardContent className="p-[18px]">
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
                              disabled
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
                              disabled
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
                            disabled
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
                        value={profile?.email || "user@example.com"}
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
          </Card>
        </div>
      </div>

      <Dialog
        open={showResetPasswordDialog}
        onOpenChange={(open) => {
          if (!open && resetPasswordShouldClose && !operationLoading) {
            setShowResetPasswordDialog(false);
            setResetPasswordShouldClose(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-3xl bg-white dark:bg-gray-800 shadow-2xl border-none">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-sc-green-dark dark:text-green-400 flex items-center">
              <Lock size={20} className="mr-2" />
              Reset Password
            </DialogTitle>
            <DialogDescription className="text-sc-ink3 dark:text-gray-300">
              Enter your email address to receive a password reset link. Check your inbox and spam folder.
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
        onOpenChange={(open) => {
          if (!open && changeEmailShouldClose && !operationLoading) {
            setShowChangeEmailDialog(false);
            setChangeEmailShouldClose(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-3xl bg-white dark:bg-gray-800 shadow-2xl border-none">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-sc-green-dark dark:text-green-400 flex items-center">
              <Mail size={20} className="mr-2" />
              Change Email
            </DialogTitle>
            <DialogDescription className="text-sc-ink3 dark:text-gray-300">
              Enter your new email address. You'll receive confirmation emails in both inboxes. Limited to once every 30 days.
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

      <div className="pb-28">
        <Navbar />
      </div>
    </div>
  );
};

export default AccountDetails;
