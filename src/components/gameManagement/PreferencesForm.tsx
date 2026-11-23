import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormValues } from "../MatchFormTypes";

const skillLevels = ["Beginner", "Amateur", "Intermediate", "Advanced", "Professional", "All", "None"] as const;
const matchTypes = ["4-a-side", "5-a-side", "7-a-side", "11-a-side (Regular)", "Double", "Friendly", "All", "None"] as const;
const genders = ["Male", "Female", "All", "None"] as const;

const PreferencesForm = () => {
  const form = useFormContext<FormValues>();
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-card p-6 space-y-6">
      <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsPreferencesOpen(!isPreferencesOpen)}>
        <h2 className="text-xl font-semibold text-sc-ink dark:text-gray-200">Preferences (Optional)</h2>
        <span>{isPreferencesOpen ? '-' : '+'}</span>
      </div>
      {isPreferencesOpen && (
        <>
          <FormField
            control={form.control}
            name="skill_level"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-sc-ink2 dark:text-gray-300">Skill Level</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger className="w-full text-base border-sc-line dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white">
                      <SelectValue placeholder="Select Skill Level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {skillLevels.map((level) => (
                      <SelectItem key={level} value={level} className="text-base">
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription className="text-sm text-sc-ink3 dark:text-gray-400">
                  Select the preferred skill level for this match (optional)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="match_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-sc-ink2 dark:text-gray-300">Match Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger className="w-full text-base border-sc-line dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white">
                      <SelectValue placeholder="Select Match Type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {matchTypes.map((type) => (
                      <SelectItem key={type} value={type} className="text-base">
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription className="text-sm text-sc-ink3 dark:text-gray-400">
                  Select the type of match (optional)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-sc-ink2 dark:text-gray-300">Gender Preference</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger className="w-full text-base border-sc-line dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white">
                      <SelectValue placeholder="Select Gender" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {genders.map((gender) => (
                      <SelectItem key={gender} value={gender} className="text-base">
                        {gender}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription className="text-sm text-sc-ink3 dark:text-gray-400">
                  Select the preferred gender for this match (optional)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}
    </div>
  );
};

export default PreferencesForm;
