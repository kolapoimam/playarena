import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { FormValues } from "../MatchFormTypes";

const frequencies = ["Daily", "Weekly", "Bi-Weekly", "Monthly", "Bi-Monthly", "Quarterly", "Yearly"] as const;

type RecurringFormProps = {
  userId: string | null;
};

const RecurringForm = ({ userId }: RecurringFormProps) => {
  const form = useFormContext<FormValues>();
  const [isRecurringOpen, setIsRecurringOpen] = useState(false);

  if (!userId) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-card p-6 space-y-6">
      <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsRecurringOpen(!isRecurringOpen)}>
        <h2 className="text-xl font-semibold text-sc-ink dark:text-gray-200">Recurring Match (Optional)</h2>
        <span>{isRecurringOpen ? '-' : '+'}</span>
      </div>
      {isRecurringOpen && (
        <>
          <FormField
            control={form.control}
            name="is_recurring"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 dark:border-gray-600">
                <div className="space-y-0.5">
                  <FormLabel className="text-base font-medium text-sc-ink2 dark:text-gray-300">
                    Recurring Match
                  </FormLabel>
                  <FormDescription className="text-sm text-sc-ink3 dark:text-gray-400">
                    Toggle to make this match repeat on a schedule
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="data-[state=checked]:bg-green-500"
                  />
                </FormControl>
              </FormItem>
            )}
          />
          {form.watch("is_recurring") && (
            <>
              <FormField
                control={form.control}
                name="recurring_frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-sc-ink2 dark:text-gray-300">Frequency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger className="w-full text-base border-sc-line dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white">
                          <SelectValue placeholder="Select Frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {frequencies.map((frequency) => (
                          <SelectItem key={frequency} value={frequency} className="text-base">
                            {frequency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-sm text-sc-ink3 dark:text-gray-400">
                      Select how often the match should repeat
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="recurring_occurrences"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-sc-ink2 dark:text-gray-300">Number of Occurrences</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter number of occurrences"
                        min={1}
                        max={52}
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
                      Number of times the match should repeat (1–52)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
        </>
      )}
    </div>
  );
};

export default RecurringForm;
