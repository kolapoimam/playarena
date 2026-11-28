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
// Name and phone are read only here, so only the display name is checked
const profileSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  nickname: z
    .string()
    .trim()
    .min(3, "Use at least 3 characters")
    .max(30, "Keep it to 30 characters")
    .regex(/^[a-zA-Z0-9\s]+$/, "Use letters, numbers and spaces only")
    .optional(),
  phone_number: z.string().optional(),
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
        .update({ nickname: data.nickname?.trim() || null, updated_at: new Date().toISOString() })
        .eq("id", profile?.id);

      if (error) throw error;

      setProfile({ ...profile, ...data, updated_at: new Date().toISOString() });
      if (setInitialProfile) setInitialProfile({ ...profile, ...data, updated_at: new Date().toISOString() });
      form.reset(data);
      toast({ title: "Profile saved", description: "Your changes are live across SportCliq." });
    } catch (error) {
      toast({ title: "Not saved", description: "Check your connection and try again.", variant: "destructive" });
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

  const dirty = form.formState.isDirty;
  const nick = form.watch("nickname") || "";

  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  if (loading && !profile) {
    return <PageSkeleton />;
  }

  const ReadOnly = ({ label, value, hint }: { label: string; value?: string | null; hint?: string }) => (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-bold text-sc-ink2">{label}</span>
      <div className="h-12 rounded-2xl bg-sc-bg px-4 flex items-center justify-between gap-3">
        <span className={`text-[15px] font-semibold truncate ${value ? "text-sc-ink" : "text-sc-ink3"}`}>{value || "Not added"}</span>
        <Lock size={14} className="text-sc-ink3 shrink-0" aria-hidden="true" />
      </div>
      {hint && <span className="text-xs text-sc-ink3">{hint}</span>}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-sc-bg font-sans text-sc-ink">
      <header className="sticky top-0 z-20 bg-sc-bg/95 backdrop-blur-xl px-5 pb-2 pt-[max(env(safe-area-inset-top),1rem)]">
        <div className="pt-3 flex items-center justify-between gap-3">
          <BackButton to="/profile" />
          <h1 className="m-0 flex-1 text-center text-[17px] font-extrabold truncate">Profile details</h1>
          <div className="min-w-11" />
        </div>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow px-5 pt-2 pb-44 max-w-md mx-auto w-full flex flex-col gap-4" noValidate>
          <div className="bg-white rounded-3xl p-5 flex items-center gap-4">
            <Avatar seed={nick || form.watch("first_name") || "SportCliq"} gender={myGender()} initials={initialsOf(`${form.watch("first_name") || ""} ${form.watch("last_name") || ""}`.trim() || "SC")} size={64} />
            <span className="flex flex-col min-w-0">
              <span className="text-[20px] leading-7 font-extrabold tracking-[-0.02em] truncate">{nick || "Add a display name"}</span>
              <span className="text-sm text-sc-ink3 truncate">{[form.watch("first_name"), form.watch("last_name")].filter(Boolean).join(" ") || "Your name"}</span>
            </span>
          </div>

          <section className="bg-white rounded-3xl p-[18px] flex flex-col gap-4" aria-labelledby="sec-public">
            <h2 id="sec-public" className="m-0 text-base font-extrabold">How others see you</h2>
            <FormField
              control={form.control}
              name="nickname"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-[13px] font-bold text-sc-ink2">Display name</FormLabel>
                    <span className="text-xs text-sc-ink3 tabular-nums">{(field.value || "").length}/30</span>
                  </div>
                  <FormControl>
                    <Input {...field} maxLength={30} autoComplete="nickname" placeholder="What players call you" className="h-12 rounded-2xl text-[15px] font-semibold" />
                  </FormControl>
                  <p className="m-0 text-xs text-sc-ink3">Shown on match lists, team sheets and leaderboards. Letters, numbers and spaces.</p>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </section>

          <section className="bg-white rounded-3xl p-[18px] flex flex-col gap-4" aria-labelledby="sec-personal">
            <h2 id="sec-personal" className="m-0 text-base font-extrabold">Personal details</h2>
            <div className="grid grid-cols-2 gap-3">
              <ReadOnly label="First name" value={form.watch("first_name")} />
              <ReadOnly label="Last name" value={form.watch("last_name")} />
            </div>
            <ReadOnly label="Phone number" value={form.watch("phone_number")} hint="Your name and phone are used for check in. Contact support to change them." />
          </section>

          <section className="bg-white rounded-3xl p-[18px] flex flex-col gap-3" aria-labelledby="sec-account">
            <h2 id="sec-account" className="m-0 text-base font-extrabold">Sign in and security</h2>
            <div className="flex items-center gap-3 py-1">
              <span className="w-10 h-10 rounded-xl bg-sc-green-bg text-sc-green-dark flex items-center justify-center shrink-0"><Mail size={18} /></span>
              <span className="flex-1 min-w-0 flex flex-col">
                <span className="text-[13px] font-bold text-sc-ink2">Email</span>
                <span className="text-[15px] font-semibold truncate">{profile?.email || "Not added"}</span>
              </span>
              <button type="button" onClick={() => setShowChangeEmailDialog(true)} disabled={!canChangeEmail()} className="h-10 px-4 rounded-full bg-sc-soft text-sm font-extrabold disabled:opacity-40">Change</button>
            </div>
            {!canChangeEmail() && <p className="m-0 text-xs text-sc-ink3">You can change your email once every 30 days.</p>}
            <div className="h-px bg-sc-line" />
            <div className="flex items-center gap-3 py-1">
              <span className="w-10 h-10 rounded-xl bg-sc-soft text-sc-ink flex items-center justify-center shrink-0"><Lock size={18} /></span>
              <span className="flex-1 min-w-0 flex flex-col">
                <span className="text-[13px] font-bold text-sc-ink2">Password</span>
                <span className="text-[13px] text-sc-ink3">We email you a secure link to set a new one</span>
              </span>
              <button type="button" onClick={() => setShowResetPasswordDialog(true)} className="h-10 px-4 rounded-full bg-sc-soft text-sm font-extrabold">Reset</button>
            </div>
          </section>

          <div className="fixed left-0 right-0 bottom-0 z-30 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+92px)] bg-sc-bg/95 backdrop-blur-xl">
            <div className="max-w-md mx-auto flex gap-2.5">
              {dirty && (
                <button type="button" onClick={() => form.reset()} disabled={loading} className="h-[54px] px-5 rounded-full bg-white text-sm font-extrabold">Undo</button>
              )}
              <button type="submit" disabled={loading || !dirty} className="flex-1 h-[54px] rounded-full bg-sc-green text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <><Loader2 size={18} className="animate-spin" /> Saving</> : dirty ? <><CheckCircle size={18} /> Save changes</> : "All changes saved"}
              </button>
            </div>
          </div>
        </form>
      </Form>
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
