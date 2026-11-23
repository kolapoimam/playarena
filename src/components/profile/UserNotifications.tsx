import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Loader2, ChevronDown, Clock, UserPlus, Users, CalendarCheck, Store, Heart, LucideIcon } from "lucide-react";
import { Bubble, ScButton, Sport } from "@/components/sc/ui";

const notificationSchema = z.object({
  match_playing_time: z.object({
    enabled: z.boolean(),
    type: z.enum(["push", "email", "both"]),
    frequency: z.enum(["immediate", "daily", "weekly"]),
  }),
  match_organizing_registration: z.object({
    enabled: z.boolean(),
    type: z.enum(["push", "email", "both"]),
    frequency: z.enum(["immediate", "daily", "weekly"]),
  }),
  match_organizing_slot_filled: z.object({
    enabled: z.boolean(),
    type: z.enum(["push", "email", "both"]),
    frequency: z.enum(["immediate", "daily", "weekly"]),
  }),
  booking_confirmation: z.object({
    enabled: z.boolean(),
    type: z.enum(["push", "email", "both"]),
    frequency: z.enum(["immediate", "daily", "weekly"]),
  }),
  venue_match_created: z.object({
    enabled: z.boolean(),
    type: z.enum(["push", "email", "both"]),
    frequency: z.enum(["immediate", "daily", "weekly"]),
  }),
  venue_favourite_match: z.object({
    enabled: z.boolean(),
    type: z.enum(["push", "email", "both"]),
    frequency: z.enum(["immediate", "daily", "weekly"]),
  }),
});

type NotificationSettings = z.infer<typeof notificationSchema>;

const UserNotifications = ({ profile, setShowNotifications }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);

  const form = useForm<NotificationSettings>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      match_playing_time: { enabled: true, type: "push", frequency: "immediate" },
      match_organizing_registration: { enabled: true, type: "push", frequency: "immediate" },
      match_organizing_slot_filled: { enabled: true, type: "push", frequency: "immediate" },
      booking_confirmation: { enabled: true, type: "push", frequency: "immediate" },
      venue_match_created: { enabled: true, type: "push", frequency: "immediate" },
      venue_favourite_match: { enabled: true, type: "push", frequency: "immediate" },
    },
  });

  useEffect(() => {
    fetchNotificationSettings();
    initPushNotifications();
  }, [profile?.id]);

  const fetchNotificationSettings = async () => {
    if (!profile?.id) return;
    const { data, error } = await supabase
      .from("user_notifications")
      .select("*")
      .eq("user_id", profile.id);
    if (error) {
      toast({ title: "Error", description: "Failed to load notification settings.", variant: "destructive" });
      return;
    }
    if (data) {
      const settings = data.reduce((acc, setting) => ({
        ...acc,
        [setting.event_type]: {
          enabled: setting.is_enabled,
          type: setting.notification_type,
          frequency: setting.frequency,
        },
      }), {});
      form.reset({ ...form.getValues(), ...settings });
    }
  };

  const initPushNotifications = async () => {
    if (!window.OneSignal) return;
    const userId = await OneSignal.getUserId();
    if (userId) setSubscriptionId(userId);
  };

  const onSubmit = async (data: NotificationSettings) => {
    setLoading(true);
    try {
      const updates = Object.entries(data).map(([event_type, settings]) => ({
        user_id: profile?.id,
        event_type,
        notification_type: settings.type,
        frequency: settings.frequency,
        is_enabled: settings.enabled,
        subscription_id: subscriptionId,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("user_notifications")
        .upsert(updates, { onConflict: ["user_id", "event_type"] });
      if (error) throw error;

      toast({ title: "Success", description: "Notification settings saved!" });
      setShowNotifications(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const EVENTS: { event: string; label: string; sub: string; icon: LucideIcon; sport: Sport }[] = [
    { event: "match_playing_time", label: "Match reminders", sub: "Before a match you joined kicks off", icon: Clock, sport: "football" },
    { event: "match_organizing_registration", label: "New players", sub: "When someone joins your match", icon: UserPlus, sport: "guide" },
    { event: "match_organizing_slot_filled", label: "Match full", sub: "When every slot in your match is taken", icon: Users, sport: "tennis" },
    { event: "booking_confirmation", label: "Venue bookings", sub: "For venue owners, when a slot is booked", icon: CalendarCheck, sport: "venue" },
    { event: "venue_match_created", label: "Matches at my venue", sub: "For venue owners, new matches at your venue", icon: Store, sport: "pink" },
    { event: "venue_favourite_match", label: "Favourite venues", sub: "New matches at venues you love", icon: Heart, sport: "red" },
  ];
  const chip = (on: boolean) => `h-9 px-3.5 rounded-full text-[13px] font-bold capitalize ${on ? "bg-sc-ink text-white" : "bg-sc-soft text-sc-ink"}`;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
        {EVENTS.map(({ event, label, sub, icon, sport }) => {
          const enabled = form.watch(`${event}.enabled` as any);
          return (
            <div key={event} className="bg-white rounded-3xl p-4 flex flex-col gap-3">
              <FormField
                control={form.control}
                name={`${event}.enabled` as any}
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 space-y-0">
                    <Bubble icon={icon} sport={sport} size={42} radius={14} />
                    <span className="flex-1 min-w-0 flex flex-col">
                      <FormLabel className="text-[15px] font-extrabold text-sc-ink">{label}</FormLabel>
                      <span className="text-xs text-sc-ink3">{sub}</span>
                    </span>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-sc-green" aria-label={label} />
                    </FormControl>
                  </FormItem>
                )}
              />
              {enabled && (
                <div className="flex flex-col gap-2.5 pl-[54px]">
                  <FormField
                    control={form.control}
                    name={`${event}.type` as any}
                    render={({ field }) => (
                      <div className="flex gap-1.5 flex-wrap" role="radiogroup" aria-label={`${label} channel`}>
                        {["push", "email", "both"].map((t) => (
                          <button key={t} type="button" role="radio" aria-checked={field.value === t} onClick={() => field.onChange(t)} className={chip(field.value === t)}>{t}</button>
                        ))}
                      </div>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`${event}.frequency` as any}
                    render={({ field }) => (
                      <div className="flex gap-1.5 flex-wrap" role="radiogroup" aria-label={`${label} frequency`}>
                        {["immediate", "daily", "weekly"].map((t) => (
                          <button key={t} type="button" role="radio" aria-checked={field.value === t} onClick={() => field.onChange(t)} className={chip(field.value === t)}>{t}</button>
                        ))}
                      </div>
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
        <ScButton type="submit" icon={CheckCircle} disabled={loading}>{loading ? "Saving..." : "Save settings"}</ScButton>
      </form>
    </Form>
  );
};

export default UserNotifications;
