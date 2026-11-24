import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import TimeInput from "@/components/TimeInput";
import OrganiserVenue from "@/components/venueManagement/OrganiserVenue";
import { FormValues } from "./MatchFormTypes";

type MatchDetailsFormProps = {
  isPreFilled: boolean;
  preSelectedVenueSlug: string | null;
  onPrefill: (values: { match_date: Date; start_time: string; end_time: string }) => void;
  onVenueCreated: (venueId: string, venueSlug: string, venueName: string) => void;
};

const MatchDetailsForm = ({ isPreFilled, preSelectedVenueSlug, onPrefill, onVenueCreated }: MatchDetailsFormProps) => {
  const form = useFormContext<FormValues>();

  // Call onPrefill on mount if isPreFilled and values exist
  useEffect(() => {
    if (isPreFilled && form.watch("match_date") && form.watch("start_time") && form.watch("end_time")) {
      onPrefill({
        match_date: form.watch("match_date"),
        start_time: form.watch("start_time"),
        end_time: form.watch("end_time"),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreFilled]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-[18px] space-y-6">
      <h2 className="text-xl font-semibold text-sc-ink dark:text-gray-200">Match Details</h2>
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium text-sc-ink2 dark:text-gray-300">Match Title</FormLabel>
            <FormControl>
              <Input 
                placeholder="E.g., Saturday Friendly" 
                className="text-base border-sc-line dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white" 
                {...field} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <OrganiserVenue
        venueId={form.watch("venue_id")}
        onVenueChange={(value) => form.setValue("venue_id", value)}
        isPreFilled={isPreFilled}
        preSelectedVenueSlug={preSelectedVenueSlug}
        onVenueCreated={onVenueCreated}
        onPrefill={onPrefill}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="match_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel className="text-sm font-medium text-sc-ink2 dark:text-gray-300">Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild disabled={isPreFilled}>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "pl-3 text-left text-base font-normal border-sc-line dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => {
                      const now = new Date();
                      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                      return date < today;
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="start_time"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-sc-ink2 dark:text-gray-300">Start Time</FormLabel>
              <FormControl>
                <TimeInput
                  value={field.value || ""}
                  onChange={field.onChange}
                  disabled={isPreFilled}
                  placeholder="e.g., 01:00 PM"
                />
              </FormControl>
              <FormDescription className="text-sm text-sc-ink3 dark:text-gray-400">
                {isPreFilled ? "Locked to your booking" : "When the match kicks off"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="end_time"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-sc-ink2 dark:text-gray-300">End Time</FormLabel>
              <FormControl>
                <TimeInput
                  value={field.value || ""}
                  onChange={field.onChange}
                  disabled={isPreFilled}
                  placeholder="e.g., 03:00 PM"
                />
              </FormControl>
              <FormDescription className="text-sm text-sc-ink3 dark:text-gray-400">
                {isPreFilled ? "Locked to your booking" : "When the match ends"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="total_slots"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium text-sc-ink2 dark:text-gray-300">Number of Players</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={2}
                max={100}
                className="text-base border-sc-line dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                {...field}
                value={field.value ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  field.onChange(value === "" ? null : parseInt(value, 10));
                }}
              />
            </FormControl>
            <FormDescription className="text-sm text-sc-ink3 dark:text-gray-400">
              Total number of players needed for this match (2-100)
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium text-sc-ink2 dark:text-gray-300">Notes (Optional)</FormLabel>
            <FormControl>
              <Textarea
                placeholder="E.g., Bring boots, parking available, etc."
                className="text-base border-sc-line dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

export default MatchDetailsForm;
