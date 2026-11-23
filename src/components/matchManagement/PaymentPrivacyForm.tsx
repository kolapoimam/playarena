import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Copy } from "lucide-react";
import { FormValues } from "../MatchFormTypes";

const PaymentPrivacyForm = () => {
  const form = useFormContext<FormValues>();
  const { toast } = useToast();
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-card p-6 space-y-6">
      <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsPaymentOpen(!isPaymentOpen)}>
        <h2 className="text-xl font-semibold text-sc-ink dark:text-gray-200">Payment & Privacy</h2>
        <span>{isPaymentOpen ? '-' : '+'}</span>
      </div>
      {isPaymentOpen && (
        <>
          <FormField
            control={form.control}
            name="is_paid"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 dark:border-gray-600">
                <div className="space-y-0.5">
                  <FormLabel className="text-base font-medium text-sc-ink2 dark:text-gray-300">
                    Paid Match
                  </FormLabel>
                  <FormDescription className="text-sm text-sc-ink3 dark:text-gray-400">
                    Toggle if players need to pay to join this match
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
          {form.watch("is_paid") && (
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-sc-ink2 dark:text-gray-300">Price per Player (₦)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0.00"
                      min={0}
                      step="0.01"
                      className="text-base border-sc-line dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value === "" ? null : parseFloat(value));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          {form.watch("is_paid") && (
            <FormField
              control={form.control}
              name="allow_bulk_tickets"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 dark:border-gray-600">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base font-medium text-sc-ink2 dark:text-gray-300">
                      Allow Bulk Ticket Purchase
                    </FormLabel>
                    <FormDescription className="text-sm text-sc-ink3 dark:text-gray-400">
                      Toggle to allow players to purchase multiple slots (up to 5 or available slots)
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
          )}
          <FormField
            control={form.control}
            name="is_private"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 dark:border-gray-600">
                <div className="space-y-0.5">
                  <FormLabel className="text-base font-medium text-sc-ink2 dark:text-gray-300">
                    Private Match
                  </FormLabel>
                  <FormDescription className="text-sm text-sc-ink3 dark:text-gray-400">
                    Toggle to restrict access to invited players only
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
          {form.watch("is_private") && (
            <FormField
              control={form.control}
              name="access_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-sc-ink2 dark:text-gray-300">Access Password</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Input
                        value={field.value || ''}
                        readOnly
                        className="font-mono text-base border-sc-line dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      className="text-sm font-medium hover:bg-green-50 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => {
                        navigator.clipboard.writeText(field.value || '');
                        toast({
                          title: "Copied!",
                          description: "Password copied to clipboard",
                        });
                      }}
                    >
                      <Copy size={16} className="mr-2" />
                      Copy
                    </Button>
                  </div>
                  <FormDescription className="text-sm text-sc-ink3 dark:text-gray-400">
                    Share this password with players you want to invite
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </>
      )}
    </div>
  );
};

export default PaymentPrivacyForm;
