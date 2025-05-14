import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarIcon, Clock, MapPin, Plus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import VenueForm from "@/components/VenueForm";

const skillLevels = ["Beginner", "Amateur", "Intermediate", "Advanced", "Professional"] as const;
const matchTypes = ["4-a-side", "5-a-side", "7-a-side", "11-a-side (Regular)", "Double", "Friendly"] as const;
const genders = ["Male", "Female"] as const;

const formSchema = z.object({
  title: z.string()
    .min(3, { message: "Title must be at least 3 characters" })
    .max(100, { message: "Title cannot exceed 100 characters" }),
  venue_id: z.string()
    .uuid({ message: "Please select a valid venue" }),
  match_date: z.date({ 
    required_error: "Please select a date",
    invalid_type_error: "Please select a valid date" 
  }),
  match_time: z.string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { 
      message: "Please enter a valid time in HH:MM format (24-hour clock)" 
    }),
  total_slots: z.number()
    .int({ message: "Must be a whole number" })
    .min(2, { message: "At least 2 players are required" })
    .max(100, { message: "Maximum 100 players allowed" }),
  is_paid: z.boolean().default(false),
  price: z.number()
    .min(0, { message: "Price cannot be negative" })
    .max(100000, { message: "Maximum price is ₦100,000" })
    .optional()
    .nullable()
    .refine(val => val === null || val === undefined || val >= 0, {
      message: "Price must be positive if provided"
    }),
  notes: z.string()
    .max(500, { message: "Notes cannot exceed 500 characters" })
    .optional(),
  organizer_name: z.string()
    .min(3, { message: "Name must be at least 3 characters" })
    .max(50, { message: "Name cannot exceed 50 characters" }),
  organizer_phone: z.string()
    .regex(/^[0-9]+$/, { message: "Must contain only numbers" })
    .length(11, { message: "Must be exactly 11 digits" })
    .optional()
    .nullable()
    .transform(val => val === "" ? null : val),
  disclose_phone: z.boolean().default(false),
  player_number_required: z.boolean().default(false),
  is_private: z.boolean().default(false),
  access_password: z.string().nullable().optional(),
  allow_bulk_tickets: z.boolean().default(false),
  skill_level: z.enum(skillLevels).optional().nullable(),
  match_type: z.enum(matchTypes).optional().nullable(),
  gender: z.enum(genders).optional().nullable(),
}).refine(data => {
  const now = new Date();
  const selectedDateTime = new Date(data.match_date);
  const [hours, minutes] = data.match_time.split(':').map(Number);
  selectedDateTime.setHours(hours, minutes, 0, 0);

  if (selectedDateTime < now) {
    return false;
  }

  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  if (selectedDateTime.toDateString() === now.toDateString() && selectedDateTime < oneHourLater) {
    return false;
  }

  return true;
}, {
  message: "Match must be scheduled at least 1 hour from now",
  path: ["match_time"],
});

type FormValues = z.infer<typeof formSchema>;

type Venue = {
  id: string;
  slug: string;
  name: string;
  city: string;
};

const MatchForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venuesLoading, setVenuesLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const preSelectedVenueSlug = searchParams.get('venue');
  const [venueDialogOpen, setVenueDialogOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      total_slots: 10,
      is_paid: false,
      price: null,
      notes: "",
      organizer_name: "",
      organizer_phone: null,
      disclose_phone: false,
      player_number_required: false,
      is_private: false,
      access_password: null,
      allow_bulk_tickets: false,
      skill_level: null,
      match_type: null,
      gender: null,
    },
  });

  useEffect(() => {
    const savedForm = localStorage.getItem("organizeFormState");
    if (savedForm) {
      const parsed = JSON.parse(savedForm);
      if (parsed.match_date) {
        parsed.match_date = new Date(parsed.match_date);
      }
      form.reset(parsed);
    }
  }, [form]);

  useEffect(() => {
    const subscription = form.watch((value) => {
      localStorage.setItem("organizeFormState", JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  const isPaid = form.watch("is_paid");
  const isPrivate = form.watch("is_private");

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const { data, error } = await supabase
          .from("venues")
          .select("id, slug, name, city")
          .order("name");

        if (error) throw error;
        setVenues(data || []);

        if (preSelectedVenueSlug) {
          const venue = data?.find(v => v.slug === preSelectedVenueSlug);
          if (venue) {
            form.setValue("venue_id", venue.id);
          }
        }
      } catch (error) {
        console.error("Error fetching venues:", error);
        toast({
          title: "Error",
          description: "Failed to load venues. Please try again.",
          variant: "destructive",
        });
      } finally {
        setVenuesLoading(false);
      }
    };

    fetchVenues();
  }, [toast, form, preSelectedVenueSlug]);

  useEffect(() => {
    if (isPrivate && !form.getValues("access_password")) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let password = '';
      for (let i = 0; i < 6; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      form.setValue('access_password', password);
    } else if (!isPrivate) {
      form.setValue('access_password', null);
    }
  }, [isPrivate, form]);

  return (
    <Form {...form}>
      <form className="space-y-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Match Details</h2>

          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Match Title</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="E.g., Saturday Friendly" 
                    className="text-base border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="venue_id"
            render={({ field }) => (
              <FormItem>
                <div className="flex justify-between items-center">
                  <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Venue</FormLabel>
                  <Dialog open={venueDialogOpen} onOpenChange={setVenueDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" type="button" className="text-sm font-medium hover:bg-green-50 dark:hover:bg-gray-700 transition-colors">
                        <Plus size={16} className="mr-1" /> Add New Venue
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
                      <VenueForm 
                        onSuccess={handleVenueCreated} 
                        onCancel={() => setVenueDialogOpen(false)} 
                      />
                    </DialogContent>
                  </Dialog>
                </div>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full text-base border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white">
                      <SelectValue placeholder="Select a venue" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {venuesLoading ? (
                      <SelectItem value="loading" disabled>
                        Loading venues...
                      </SelectItem>
                    ) : venues.length > 0 ? (
                      venues.map((venue) => (
                        <SelectItem key={venue.id} value={venue.id} className="text-base">
                          {venue.name}{venue.city ? `, ${venue.city}` : ''}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        No venues available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="match_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "pl-3 text-left text-base font-normal border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white",
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

            <FormField
              control={form.control}
              name="match_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Time</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="time"
                        placeholder="HH:MM"
                        className="text-base border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                        {...field}
                      />
                      <Clock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    </div>
                  </FormControl>
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
                <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Number of Players</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={2}
                    className="text-base border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    {...field}
                    onChange={(e) => {
                      const value = parseInt(e.target.value, 10);
                      field.onChange(isNaN(value) ? 2 : value);
                    }}
                  />
                </FormControl>
                <FormDescription className="text-sm text-gray-500 dark:text-gray-400">
                  Total number of players needed for this match
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
                <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="E.g., Bring boots, parking available, etc."
                    className="text-base border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Preferences (Optional)</h2>

          <FormField
            control={form.control}
            name="skill_level"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Skill Level</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger className="w-full text-base border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white">
                      <SelectValue placeholder="All Skills" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="All Skills">All Skills</SelectItem>
                    {skillLevels.map((level) => (
                      <SelectItem key={level} value={level} className="text-base">
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription className="text-sm text-gray-500 dark:text-gray-400">
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
                <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Match Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger className="w-full text-base border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white">
                      <SelectValue placeholder="Select Match Type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Select Match Type">Select Match Type</SelectItem>
                    {matchTypes.map((type) => (
                      <SelectItem key={type} value={type} className="text-base">
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription className="text-sm text-gray-500 dark:text-gray-400">
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
                <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Gender Preference</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger className="w-full text-base border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white">
                      <SelectValue placeholder="All Genders" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="All Genders">All Genders</SelectItem>
                    {genders.map((gender) => (
                      <SelectItem key={gender} value={gender} className="text-base">
                        {gender}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription className="text-sm text-gray-500 dark:text-gray-400">
                  Select the preferred gender for this match (optional)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg px-4 py-3 text-lg shadow-md transition-colors"
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );

  const handleVenueCreated = (venueId: string, venueSlug: string, venueName: string) => {
    setVenues(prev => [{ id: venueId, slug: venueSlug, name: venueName, city: "" }, ...prev]);
    form.setValue("venue_id", venueId);
    setVenueDialogOpen(false);
    toast({
      title: "Venue created",
      description: `${venueName} has been added to venues.`,
    });
  };
};

export default MatchForm;
