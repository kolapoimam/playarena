import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FormValues } from "../MatchFormTypes";

const TicketSalesForm = () => {
  const form = useFormContext<FormValues>();
  const [isTicketSalesOpen, setIsTicketSalesOpen] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
      <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsTicketSalesOpen(!isTicketSalesOpen)}>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Ticket Sales</h2>
        <span>{isTicketSalesOpen ? '-' : '+'}</span>
      </div>
      {isTicketSalesOpen && (
        <>
          <FormField
            control={form.control}
            name="sell_tickets"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 dark:border-gray-600">
                <div className="space-y-0.5">
                  <FormLabel className="text-base font-medium text-gray-700 dark:text-gray-300">
                    Sell Tickets to Fans
                  </FormLabel>
                  <FormDescription className="text-sm text-gray-500 dark:text-gray-400">
                    Toggle to allow fans to purchase tickets to watch the match
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
          {form.watch("sell_tickets") && (
            <>
              <FormField
                control={form.control}
                name="ticket_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Ticket Price (₦)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="200.00"
                        min={200}
                        step="0.01"
                        className="text-base border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === "" ? null : parseFloat(value));
                        }}
                      />
                    </FormControl>
                    <FormDescription className="text-sm text-gray-500 dark:text-gray-400">
                      Set the price for each ticket (minimum ₦200)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="max_tickets"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Maximum Tickets (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter maximum number of tickets"
                        min={1}
                        max={1000}
                        className="text-base border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === "" ? null : parseInt(value, 10));
                        }}
                      />
                    </FormControl>
                    <FormDescription className="text-sm text-gray-500 dark:text-gray-400">
                      Limit the total number of tickets available for purchase (1-1000)
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

export default TicketSalesForm;
