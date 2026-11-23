import { useFormContext } from "react-hook-form";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FormValues } from "../MatchFormTypes";

const OrganizerDetailsForm = () => {
  const form = useFormContext<FormValues>();

  return (
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
                placeholder="Your name" 
                className="text-base border-sc-line dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white" 
                {...field} 
              />
            </FormControl>
            <FormDescription className="text-sm text-sc-ink3 dark:text-gray-400">
              This will be displayed as the organizer of the match
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="organizer_phone"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium text-sc-ink2 dark:text-gray-300">Your Phone Number (Optional)</FormLabel>
            <FormControl>
              <Input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Enter 11-digit phone number"
                className="text-base border-sc-line dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                {...field}
                value={field.value ?? ""}
                onChange={(e) => {
                  const numericValue = e.target.value.replace(/\D/g, '');
                  const truncatedValue = numericValue.slice(0, 11);
                  field.onChange(truncatedValue || null);
                }}
              />
            </FormControl>
            <FormDescription className="text-sm text-sc-ink3 dark:text-gray-400">
              Provide your phone number for contact purposes (numbers only)
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="disclose_phone"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 dark:border-gray-600">
            <div className="space-y-0.5">
              <FormLabel className="text-base font-medium text-sc-ink2 dark:text-gray-300">
                Disclose Phone Number
              </FormLabel>
              <FormDescription className="text-sm text-sc-ink3 dark:text-gray-400">
                Toggle to share your phone number with players
              </FormDescription>
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={!form.watch("organizer_phone") || form.watch("organizer_phone")?.length !== 11}
                className="data-[state=checked]:bg-green-500"
              />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
};

export default OrganizerDetailsForm;
