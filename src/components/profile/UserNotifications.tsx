import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ConfirmModal from "@/components/sc/ConfirmModal";
import { getMyVenues } from "@/lib/myVenues";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { withOneSignal } from "@/lib/onesignal";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Loader2, ChevronDown, ChevronUp, Clock, UserPlus, Users, CalendarCheck, Store, Heart, LucideIcon } from "lucide-react";
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
  const navigate = useNavigate();
  // Which settings apply to this user. Reminders and favourite venues apply to everyone.
  const [roles, setRoles] = useState<{ organiser: boolean; venue: boolean; favourites: number } | null>(null);
  const [openCard, setOpenCard] = useState<string | null>(null);
  const [askFavourite, setAskFavourite] = useState(false);
  const toVenues = useRef(false);

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      const [org, rides, fav, venues] = await Promise.all([
        supabase.from("user_organized_matches").select("match_id").eq("user_id", profile.id).limit(1),
        supabase.from("user_hosted_cycling").select("user_id").eq("user_id", profile.id).limit(1),
        supabase.from("user_venue_favourites").select("venue_id").eq("user_id", profile.id),
        getMyVenues(profile.id).catch(() => []),
      ]);
      setRoles({
        organiser: ((org.data as any[]) || []).length > 0 || ((rides.data as any[]) || []).length > 0,
        venue: venues.length > 0,
        favourites: ((fav.data as any[]) || []).length,
      });
    })();
  }, [profile?.id]);

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

  const initPushNotifications = () => {
    withOneSignal((os) => {
      const id = os.User.PushSubscription.id;
      if (id) setSubscriptionId(id);
    });
  };

  const onSubmit = async (data: NotificationSettings) => {
    if (!profile?.id) {
      toast({ title: "Sign in first", description: "Sign in to save your notification settings.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      // Update rows that exist and add the missing ones. This works whether or not
      // the table has a unique rule on user and event, which upsert needs.
      const { data: existing, error: readError } = await supabase
        .from("user_notifications")
        .select("id, event_type")
        .eq("user_id", profile.id);
      if (readError) throw readError;
      const idByEvent = new Map<string, string>((existing || []).map((r: any) => [String(r.event_type), String(r.id)]));

      const rows: any[] = Object.entries(data).map(([event_type, settings]) => ({
        user_id: profile.id,
        event_type,
        notification_type: settings.type,
        frequency: settings.frequency,
        is_enabled: settings.enabled,
        ...(subscriptionId ? { subscription_id: subscriptionId } : {}),
        updated_at: new Date().toISOString(),
      }));

      const updates = rows.filter((r) => idByEvent.has(r.event_type));
      const inserts = rows.filter((r) => !idByEvent.has(r.event_type));

      const results = await Promise.all([
        ...updates.map((r) => (supabase.from("user_notifications") as any).update(r).eq("id", idByEvent.get(r.event_type)!)),
        ...(inserts.length ? [(supabase.from("user_notifications") as any).insert(inserts)] : []),
      ]);
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;

      // Push needs this device to be allowed and linked to the account
      const wantsPush = rows.some((r) => r.is_enabled && (r.notification_type === "push" || r.notification_type === "both"));
      if (wantsPush) {
        withOneSignal(async (os) => {
          try {
            if (typeof Notification !== "undefined" && Notification.permission === "default") await os.Notifications.requestPermission();
            if (!os.User.PushSubscription.optedIn) await os.User.PushSubscription.optIn();
            if (os.User.externalId !== profile.id) await os.login(profile.id);
          } catch (e) { console.warn("Push setup", e); }
        });
      }

      toast({ title: "Settings saved", description: wantsPush && typeof Notification !== "undefined" && Notification.permission === "denied" ? "Push is blocked on this device. Allow notifications for SportCliq in your phone or browser settings to get push alerts." : "We will notify you the way you chose." });
      // Favourite venue alerts need at least one favourite venue to be useful
      if (data.venue_favourite_match?.enabled && roles && roles.favourites === 0) setAskFavourite(true);
      else setShowNotifications(false);
    } catch (error: any) {
      console.error("Saving notification settings failed", error);
      toast({ title: "Settings not saved", description: error?.message ? `${error.message}` : "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const EVENTS: { event: string; label: string; sub: string; icon: LucideIcon; sport: Sport; show: boolean }[] = [
    { event: "match_playing_time", label: "Match reminders", sub: "Before a match you joined kicks off", icon: Clock, sport: "football", show: true },
    { event: "venue_favourite_match", label: "Favourite venues", sub: "New matches at venues you love", icon: Heart, sport: "red", show: true },
    { event: "match_organizing_registration", label: "New players", sub: "When someone joins your match", icon: UserPlus, sport: "guide", show: !!roles?.organiser },
    { event: "match_organizing_slot_filled", label: "Match full", sub: "When every slot in your match is taken", icon: Users, sport: "tennis", show: !!roles?.organiser },
    { event: "booking_confirmation", label: "Venue bookings", sub: "When someone books a slot at your venue", icon: CalendarCheck, sport: "venue", show: !!roles?.venue },
    { event: "venue_match_created", label: "Matches at my venue", sub: "New matches set up at your venue", icon: Store, sport: "pink", show: !!roles?.venue },
  ];
  const chip = (on: boolean) => `h-9 px-3.5 rounded-full text-[13px] font-bold capitalize ${on ? "bg-sc-ink text-white" : "bg-sc-soft text-sc-ink"}`;
  const typeLabel: Record<string, string> = { push: "Push", email: "Email", both: "Push and email" };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
        {EVENTS.filter((e) => e.show).map(({ event, label, sub, icon, sport }) => {
          const enabled = form.watch(`${event}.enabled` as any);
          const type = form.watch(`${event}.type` as any);
          const freq = form.watch(`${event}.frequency` as any);
          const isOpen = openCard === event && enabled;
          return (
            <div key={event} className="bg-white rounded-3xl px-4 py-3.5 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => enabled && setOpenCard(isOpen ? null : event)}
                  aria-expanded={isOpen}
                  className="flex-1 min-w-0 flex items-center gap-3 text-left"
                >
                  <Bubble icon={icon} sport={sport} size={42} radius={14} />
                  <span className="flex-1 min-w-0 flex flex-col">
                    <span className="text-[15px] font-extrabold text-sc-ink">{label}</span>
                    <span className="text-xs text-sc-ink3">{sub}</span>
                    {enabled && (
                      <span className="mt-1 text-[12px] font-bold text-sc-ink2 inline-flex items-center gap-1">
                        {typeLabel[type] || "Push"}, {freq || "immediate"}
                        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </span>
                    )}
                  </span>
                </button>
                <FormField
                  control={form.control}
                  name={`${event}.enabled` as any}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={(v) => { field.onChange(v); if (!v && openCard === event) setOpenCard(null); }}
                      className="data-[state=checked]:bg-sc-green shrink-0"
                      aria-label={label}
                    />
                  )}
                />
              </div>
              {isOpen && (
                <div className="flex flex-col gap-2.5 pl-[54px] pb-1">
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-sc-ink3">How</span>
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
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-sc-ink3 pt-1">When</span>
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
        {roles && !roles.organiser && !roles.venue && (
          <p className={cn("m-0 px-1 text-[12.5px] text-sc-ink3")}>More settings show up once you organise a match or manage a venue.</p>
        )}
        <ScButton type="submit" icon={CheckCircle} disabled={loading}>{loading ? "Saving..." : "Save settings"}</ScButton>
      </form>
      <ConfirmModal
        open={askFavourite}
        onOpenChange={(v) => { setAskFavourite(v); if (!v && !toVenues.current) setShowNotifications(false); }}
        icon={Heart}
        title="Pick your favourite venues"
        description="Your settings are saved. Tap the heart on any venue and we will tell you when new matches are set up there."
        confirmLabel="Browse venues"
        cancelLabel="Later"
        onConfirm={() => { toVenues.current = true; navigate("/venues"); }}
      />
    </Form>
  );
};

export default UserNotifications;
