import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useFormContext } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Copy } from "lucide-react";

const OrganizerDetails = ({ userId }: { userId: string | null }) => {
  const form = useFormContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [organizerPhone, setOrganizerPhone] = useState(form.getValues("organizer_phone") || "");
  const [sellTickets, setSellTickets] = useState(false);
  const [ticketPrice, setTicketPrice] = useState<number | null>(null);
  const isPaid = form.watch("is_paid");
  const isPrivate = form.watch("is_private");

  useEffect(() => {
    const subscription = form.watch((value) => {
      setOrganizerPhone(value.organizer_phone || "");
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (userId) {
        const { data, error } = await supabase
          .from("profiles")
          .select("nickname, first_name")
          .eq("id", userId)
          .single();

        if (error) {
          toast({ title: "Error", description: "Failed to load profile.", variant: "destructive" });
          return;
        }

        const organizerName = data?.nickname || data?.first_name || "";
        form.setValue("organizer_name", organizerName);
      }
    };

    fetchProfile();
  }, [userId, form, toast]);

  const handleCopyPassword = () => {
    const password = form.getValues("access_password");
    if (password) {
      navigator.clipboard.writeText(password);
      toast({
        title: "Password Copied",
        description: "The access password has been copied to your clipboard.",
      });
    }
  };

  const onSubmit = async (data: any) => {
    try {
      const matchData = {
        ...data,
        user_id: userId || null, // Set user_id to null for unauthenticated users
        slug: `${data.title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
        sell_tickets: sellTickets,
        ticket_price: sellTickets ? ticketPrice : null,
        created_at: new Date().toISOString(),
        skill_level: data.skill_level === "All Skills" ? null : data.skill_level,
        match_type: data.match_type === "Select Match Type" ? null : data.match_type,
        gender: data.gender === "All Genders" ? null : data.gender,
      };

      if (!isPaid) {
        matchData.price = null;
      }

      if (!sellTickets) {
        matchData.ticket_price = null;
      }

      const { error } = await supabase.from("matches").insert(matchData);

      if (error) throw error;

      localStorage.removeItem("organizeFormState");
      toast({
        title: "Success",
        description: "Match created successfully!",
      });
      navigate(`/match/${matchData.slug}`);
    } catch (error) {
      console.error("Error creating match:", error);
      toast({
        title: "Error",
        description: "Failed to create match. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div>
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-sc-ink dark:text-gray-200">Organizer Details</h2>

        <FormField
          control={form.control}
          name="organizer_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-sc-ink2 dark:text-gray-300">Your Name</FormLabel>
              <FormControl>
                <Input
                  placeholder={userId ? "" : "Enter your name"}
                  className="text-base border-sc-line dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                  {...field}
                  readOnly={!!userId}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="organizer_phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-sc-ink2 dark:text-gray-300">Phone Number (Optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter your 11-digit phone number"
                  className="text-base border-sc-line dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                  value={organizerPhone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 11);
                    setOrganizerPhone(value);
                    field.onChange(value);
                  }}
                  maxLength={11}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="disclose_phone"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-sm font-medium text-sc-ink2 dark:text-gray-300">
                  Disclose Phone Number
                </FormLabel>
                <FormDescription className="text-sm text-sc-ink3 dark:text-gray-400">
                  Allow players to see your phone number
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-card p-6 space-y-6 mt-6">
        <h2 className="text-xl font-semibold text-sc-ink dark:text-gray-200">Match Privacy</h2>

        <FormField
          control={form.control}
          name="is_private"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-sm font-medium text-sc-ink2 dark:text-gray-300">
                  Private Match
                </FormLabel>
                <FormDescription className="text-sm text-sc-ink3 dark:text-gray-400">
                  Only players with the access password can join
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {isPrivate && (
          <FormField
            control={form.control}
            name="access_password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-sc-ink2 dark:text-gray-300">Access Password</FormLabel>
                <div className="flex items-center gap-2">
                  <FormControl>
                    <Input
                      className="text-base border-sc-line dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                      value={field.value || ""}
                      readOnly
                    />
                  </FormControl>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyPassword}
                    type="button"
                  >
                    <Copy size={16} className="mr-2" />
                    Copy
                  </Button>
                </div>
                <FormDescription className="text-sm text-sc-ink3 dark:text-gray-400">
                  Share this password with players to allow them to join
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-card p-6 space-y-6 mt-6">
        <h2 className="text-xl font-semibold text-sc-ink dark:text-gray-200">Payment Details</h2>

        <FormField
          control={form.control}
          name="is_paid"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-sm font-medium text-sc-ink2 dark:text-gray-300">
                  Paid Match
                </FormLabel>
                <FormDescription className="text-sm text-sc-ink3 dark:text-gray-400">
                  Players will need to pay to join this match
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {isPaid && (
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-sc-ink2 dark:text-gray-300">Price per Player (₦)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    className="text-base border-sc-line dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="player_number_required"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-sm font-medium text-sc-ink2 dark:text-gray-300">
                  Specify Number of Players
                </FormLabel>
                <FormDescription className="text-sm text-sc-ink3 dark:text-gray-400">
                  Allow players to specify how many additional players they are bringing
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-card p-6 space-y-6 mt-6">
        <h2 className="text-xl font-semibold text-sc-ink dark:text-gray-200">Ticket Sales</h2>

        <div className="flex flex-row items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <FormLabel className="text-sm font-medium text-sc-ink2 dark:text-gray-300">
              Sell Tickets to Fans
            </FormLabel>
            <FormDescription className="text-sm text-sc-ink3 dark:text-gray-400">
              Allow fans to purchase tickets to watch the match
            </FormDescription>
          </div>
          <Switch
            checked={sellTickets}
            onCheckedChange={(checked) => {
              setSellTickets(checked);
              if (!checked) setTicketPrice(null);
            }}
          />
        </div>

        {sellTickets && (
          <div>
            <FormLabel className="text-sm font-medium text-sc-ink2 dark:text-gray-300">
              Ticket Price (₦)
            </FormLabel>
            <Input
              type="number"
              min={200}
              value={ticketPrice || ""}
              onChange={(e) => {
                const value = e.target.value ? parseFloat(e.target.value) : null;
                if (value && value < 200) {
                  toast({
                    title: "Invalid Price",
                    description: "Ticket price must be at least ₦200.",
                    variant: "destructive",
                  });
                  return;
                }
                setTicketPrice(value);
              }}
              className="text-base border-sc-line dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              placeholder="Enter ticket price (minimum ₦200)"
            />
          </div>
        )}
      </div>

      <div className="flex gap-4 mt-6">
        <Button
          type="button"
          className="w-full bg-sc-green hover:brightness-95 text-sc-green-ink font-bold rounded-full px-4 py-3 text-lg shadow-card transition-colors"
          onClick={form.handleSubmit(onSubmit)}
        >
          Create Match
        </Button>
      </div>
    </div>
  );
};

export default OrganizerDetails;
