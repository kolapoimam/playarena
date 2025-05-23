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
import { CheckCircle, Loader2, ChevronDown } from "lucide-react";

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

  return (
    <div className="space-y-8">
      <Card className="bg-white dark:bg-gray-800 border-none shadow-lg rounded-xl overflow-hidden">
        <details className="group">
          <summary className="flex items-center justify-between p-4 text-xl font-semibold text-green-700 dark:text-green-400 cursor-pointer bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 hover:bg-green-200 dark:hover:bg-green-700 transition-colors">
            Notification Settings
            <ChevronDown className="w-6 h-6 transition-transform group-open:rotate-180 text-green-600 dark:text-green-400" />
          </summary>
          <CardContent className="p-4 pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {[
                  { event: "match_playing_time", label: "Match Playing Time" },
                  { event: "match_organizing_registration", label: "Match Organizing - Player Registration" },
                  { event: "match_organizing_slot_filled", label: "Match Organizing - Slot Filled" },
                  { event: "booking_confirmation", label: "Booking Confirmation (Venue Owner)" },
                  { event: "venue_match_created", label: "New Match at Venue (Venue Owner)" },
                  { event: "venue_favourite_match", label: "Match at Favorited Venue" },
                ].map(({ event, label }) => (
                  <div key={event} className="border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
                    <FormField
                      control={form.control}
                      name={`${event}.enabled`}
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <FormLabel className="text-gray-700 dark:text-gray-300">{label}</FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="bg-gray-200 dark:bg-gray-700 data-[state=checked]:bg-green-500"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    {form.getValues(`${event}.enabled`) && (
                      <div className="mt-4 space-y-4">
                        <FormField
                          control={form.control}
                          name={`${event}.type`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700 dark:text-gray-300">Notification Type</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg">
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {["push", "email", "both"].map((type) => (
                                    <SelectItem key={type} value={type}>
                                      {type}
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
                          name={`${event}.frequency`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700 dark:text-gray-300">Frequency</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg">
                                    <SelectValue placeholder="Select frequency" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {["immediate", "daily", "weekly"].map((freq) => (
                                    <SelectItem key={freq} value={freq}>
                                      {freq}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>
                ))}
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
                      Save Notification Settings
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </details>
      </Card>
    </div>
  );
};

export default UserNotifications;
