import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, Copy } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { format, parse } from "date-fns";
import { cn } from "@/lib/utils";
import TimeInput from "@/components/TimeInput";
import OrganiserVenue from "@/components/OrganiserVenue";

const skillLevels = ["Beginner", "Amateur", "Intermediate", "Advanced", "Professional", "All", "None"] as const;
const matchTypes = ["4-a-side", "5-a-side", "7-a-side", "11-a-side (Regular)", "Double", "Friendly", "All", "None"] as const;
const genders = ["Male", "Female", "All", "None"] as const;

const timePattern = /^(0[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/i;
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
  start_time: z.string()
    .regex(timePattern, { 
      message: "Please enter a valid start time in HH:MM AM/PM format (12-hour clock)" 
    }),
  end_time: z.string()
    .regex(timePattern, { 
      message: "Please enter a valid end time in HH:MM AM/PM format (12-hour clock)" 
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
  skill_level: z.enum(skillLevels).optional().nullable()
    .transform(val => {
      if (val === "All") return null;
      if (val === "None") return "";
      return val;
    }),
  match_type: z.enum(matchTypes).optional().nullable()
    .transform(val => {
      if (val === "All") return null;
      if (val === "None") return "";
      return val;
    }),
  gender: z.enum(genders).optional().nullable()
    .transform(val => {
      if (val === "All") return null;
      if (val === "None") return "";
      return val;
    }),
  sell_tickets: z.boolean().default(false),
  ticket_price: z.number()
    .min(200, { message: "Ticket price must be at least ₦200" })
    .max(100000, { message: "Maximum ticket price is ₦100,000" })
    .optional()
    .nullable()
    .refine(val => val === null || val === undefined || val >= 200, {
      message: "Ticket price must be at least ₦200 if provided"
    }),
  max_tickets: z.number()
    .int({ message: "Must be a whole number" })
    .min(1, { message: "At least 1 ticket is required" })
    .max(5000, { message: "Maximum 5000 tickets allowed" })
    .optional()
    .nullable(),
}).refine(data => {
  const startDateTime = new Date(data.match_date);
  const [startHours, startMinutes] = data.start_time.replace(/ AM|PM/i, "").split(':').map(Number);
  const startPeriod = data.start_time.slice(-2).toUpperCase();
  let startH = startHours;
  if (startPeriod === "PM" && startHours !== 12) startH += 12;
  if (startPeriod === "AM" && startHours === 12) startH = 0;
  startDateTime.setHours(startH, startMinutes, 0, 0);

  const endDateTime = new Date(data.match_date);
  const [endHours, endMinutes] = data.end_time.replace(/ AM|PM/i, "").split(':').map(Number);
  const endPeriod = data.end_time.slice(-2).toUpperCase();
  let endH = endHours;
  if (endPeriod === "PM" && endHours !== 12) endH += 12;
  if (endPeriod === "AM" && endHours === 12) endH = 0;
  endDateTime.setHours(endH, endMinutes, 0, 0);

  const sameDayEarlier = endH < startH || (endH === startH && endMinutes <= startMinutes);
  if (sameDayEarlier) {
    endDateTime.setDate(endDateTime.getDate() + 1);
  }

  return startDateTime < endDateTime;
}, {
  message: "Start time must be before end time",
  path: ["end_time"],
}).refine(data => {
  const now = new Date();
  const selectedDateTime = new Date(data.match_date);
  const [startHours, startMinutes] = data.start_time.replace(/ AM|PM/i, "").split(':').map(Number);
  const period = data.start_time.slice(-2).toUpperCase();
  let hours = startHours;
  if (period === "PM" && startHours !== 12) hours += 12;
  if (period === "AM" && startHours === 12) hours = 0;
  selectedDateTime.setHours(hours, startMinutes, 0, 0);

  // Adjust for WAT (UTC+1)
  const watOffset = 1 * 60 * 60 * 1000;
  const nowWAT = new Date(now.getTime() + watOffset);
  const tenMinutesLater = new Date(nowWAT.getTime() + 10 * 60 * 1000);

  return selectedDateTime.getTime() >= tenMinutesLater.getTime();
}, {
  message: "Match must be scheduled at least 10 minutes from now",
  path: ["start_time"],
}).refine(data => {
  if (data.sell_tickets && !data.ticket_price) {
    return false;
  }
  return true;
}, {
  message: "Ticket price is required when selling tickets",
  path: ["ticket_price"],
});

const convertTo24Hour = (time12: string): string => {
  const [time, period] = time12.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (period.toUpperCase() === 'PM' && hours !== 12) hours += 12;
  if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

type FormValues = z.infer<typeof formSchema>;

type MatchFormProps = {
  userId: string | null;
  isPreFilled: boolean;
  preSelectedVenueSlug: string | null;
  accessCode: string | null;
  onSubmitSuccess: (supercode: string, matchSlug: string) => void;
  onPreview: () => void;
  onPrefill: (values: { match_date: Date; start_time: string; end_time: string }) => void;
  onFormReady: (formMethods: {
    watch: () => FormValues;
    setValue: (name: keyof FormValues, value: any) => void;
  }) => void;
  onVenuesFetched: (venues: Venue[]) => void;
};

type Venue = {
  id: string;
  slug: string;
  name: string;
  city: string;
  verified_status: 'True' | 'False';
};

const MatchForm = ({ userId, isPreFilled, preSelectedVenueSlug, accessCode, onSubmitSuccess, onPreview, onPrefill, onFormReady, onVenuesFetched }: MatchFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isTicketSalesOpen, setIsTicketSalesOpen] = useState(false);

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
      sell_tickets: false,
      ticket_price: null,
      max_tickets: null,
      start_time: "",
      end_time: "",
    },
  });

  useEffect(() => {
    onFormReady({
      watch: form.watch,
      setValue: form.setValue,
    });
  }, [form, onFormReady]);

  useEffect(() => {
    if (!isPreFilled) {
      const savedForm = localStorage.getItem("organizeFormState");
      if (savedForm) {
        const parsed = JSON.parse(savedForm);
        if (parsed.match_date) {
          parsed.match_date = new Date(parsed.match_date);
        }
        if (parsed.start_time) {
          parsed.start_time = parsed.start_time.replace(/^(0[1-9]|1[0-2]):([0-5][0-9]) (AM|PM)$/, "$1:$2 $3");
        }
        if (parsed.end_time) {
          parsed.end_time = parsed.start_time.replace(/^(0[1-9]|1[0-2]):([0-5][0-9]) (AM|PM)$/, "$1:$2 $3");
        }
        form.reset(parsed);
      }
    }
  }, [form, isPreFilled]);

  useEffect(() => {
    const subscription = form.watch((value) => {
      if (!isPreFilled) {
        localStorage.setItem("organizeFormState", JSON.stringify(value));
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch, isPreFilled]);

  useEffect(() => {
    if (form.watch("is_private") && !form.watch("access_password")) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let password = '';
      for (let i = 0; i < 6; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      form.setValue('access_password', password);
    } else if (!form.watch("is_private")) {
      form.setValue('access_password', null);
    }
  }, [form]);

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      // Validate required fields
      if (!data.venue_id || !data.match_date || !data.start_time || !data.end_time) {
        throw new Error("Venue, date, and times are required.");
      }

      const superCode = Math.floor(100000 + Math.random() * 900000).toString();
      // Generate a more unique slug
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const matchSlug = `${data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${timestamp}-${randomStr}`;

      const matchData = {
        title: data.title,
        venue_id: data.venue_id,
        match_date: format(data.match_date, "yyyy-MM-dd"),
        match_time: convertTo24Hour(data.start_time),
        start_time: convertTo24Hour(data.start_time),
        end_time: convertTo24Hour(data.end_time),
        total_slots: data.total_slots,
        is_paid: data.is_paid,
        price: data.is_paid ? data.price : null,
        notes: data.notes || null,
        organizer_name: data.organizer_name,
        organizer_phone: data.organizer_phone || null,
        disclose_phone: data.disclose_phone,
        player_number_required: data.player_number_required,
        is_private: data.is_private,
        access_password: data.is_private ? data.access_password : null,
        allow_bulk_tickets: data.allow_bulk_tickets,
        skill_level: data.skill_level || null,
        match_type: data.match_type || null,
        gender: data.gender || null,
        super_code: superCode,
        sell_tickets: data.sell_tickets,
        ticket_price: data.sell_tickets ? data.ticket_price : null,
        max_tickets: data.sell_tickets ? data.max_tickets : null,
        total_tickets_available: data.sell_tickets && data.max_tickets ? data.max_tickets : 0,
        slug: matchSlug,
        organizer_id: userId || null,
        created_at: new Date().toISOString(),
      };

      console.log("Submitting match data:", matchData);

      const { data: match, error } = await supabase
        .from("matches")
        .insert(matchData)
        .select('id, slug, super_code')
        .single();

      if (error) {
        console.error("Match insert error:", error);
        if (error.code === '23503') {
          throw new Error("Invalid venue selected. Please choose a valid venue.");
        } else if (error.code === '23505') {
          throw new Error("A match with this title already exists. Please modify the title.");
        }
        throw new Error(`Failed to create match: ${error.message}`);
      }

      if (!match || !match.id || !match.slug) {
        console.error("Invalid match data returned:", match);
        throw new Error("Failed to retrieve match details");
      }

      if (userId) {
        const { error: linkError } = await supabase
          .from("user_organized_matches")
          .insert({
            user_id: userId,
            match_id: match.id,
          });

        if (linkError) {
          console.error("User organized match insert error:", linkError);
          throw new Error(`Failed to link user to match: ${linkError.message}`);
        }
      }

      if (accessCode && preSelectedVenueSlug) {
        try {
          const { data: venue, error: venueError } = await supabase
            .from("venues")
            .select("id")
            .eq("slug", preSelectedVenueSlug)
            .single();

          if (venueError || !venue) {
            console.error("Venue fetch error:", venueError || "No venue found");
            toast({
              title: "Warning",
              description: "Match created, but failed to link booking due to invalid venue. Contact support.",
              variant: "destructive",
            });
          } else {
            const paymentReference = new URLSearchParams(window.location.search).get("reference");
            console.log("Linking booking:", { venue_id: venue.id, paymentReference, accessCode });

            const { data: booking, error: bookingError } = await supabase
              .from("bookings")
              .select("id")
              .eq("venue_id", venue.id)
              .eq("payment_reference", paymentReference)
              .single();

            if (bookingError || !booking) {
              console.warn("No booking found for payment reference:", paymentReference);
              toast({
                title: "Warning",
                description: "Match created, but no booking found for the provided payment reference. Contact support.",
                variant: "destructive",
              });
            } else {
              const { error: bookingUpdateError } = await supabase
                .from("bookings")
                .update({ match_id: match.id })
                .eq("id", booking.id);

              if (bookingUpdateError) {
                console.error("Booking update error:", bookingUpdateError);
                toast({
                  title: "Warning",
                  description: "Match created, but failed to link booking. Contact support.",
                  variant: "destructive",
                });
              } else {
                console.log("Booking linked successfully:", booking.id);
              }
            }
          }
        } catch (bookingError) {
          console.error("Error in booking update block:", bookingError);
          toast({
            title: "Warning",
            description: "Match created, but failed to link booking due to an error. Contact support.",
            variant: "destructive",
          });
        }
      }

      localStorage.removeItem("organizeFormState");
      toast({
        title: "Success",
        description: "Match created successfully!",
      });
      onSubmitSuccess(match.super_code || "N/A", match.slug);
    } catch (error: any) {
      console.error("Error creating match:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create match. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
          <OrganiserVenue
            venueId={form.watch("venue_id")}
            onVenueChange={(value) => form.setValue("venue_id", value)}
            isPreFilled={isPreFilled}
            preSelectedVenueSlug={preSelectedVenueSlug}
            onVenueCreated={(venueId, venueSlug, venueName) => {
              form.setValue("venue_id", venueId);
              toast({
                title: "Venue created",
                description: `${venueName} has been added to venues.`,
              });
            }}
            onPrefill={onPrefill}
            onVenuesFetched={onVenuesFetched}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="match_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild disabled={isPreFilled}>
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
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="start_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Start Time</FormLabel>
                  <FormControl>
                    <TimeInput
                      value={field.value || ""}
                      onChange={field.onChange}
                      disabled={isPreFilled}
                      placeholder="e.g., 01:00 PM"
                    />
                  </FormControl>
                  <FormDescription className="text-sm text-gray-500 dark:text-gray-400">
                    Match start time (12-hour clock, e.g., 01:00 PM)
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
                  <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">End Time</FormLabel>
                  <FormControl>
                    <TimeInput
                      value={field.value || ""}
                      onChange={field.onChange}
                      disabled={isPreFilled}
                      placeholder="e.g., 03:00 PM"
                    />
                  </FormControl>
                  <FormDescription className="text-sm text-gray-500 dark:text-gray-400">
                    Match end time (12-hour clock, e.g., 03:00 PM)
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
                <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Number of Players</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={2}
                    max={100}
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
                <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="E.g., Bring boots, parking available, etc."
                    className="text-base border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsPreferencesOpen(!isPreferencesOpen)}>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Preferences (Optional)</h2>
            <span>{isPreferencesOpen ? '-' : '+'}</span>
          </div>
          {isPreferencesOpen && (
            <>
              <FormField
                control={form.control}
                name="skill_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Skill Level</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger className="w-full text-base border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white">
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
                    <FormDescription className="text-sm text-gray-500 dark:text-gray-400">
                      Select the preferred gender for this match (optional)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsPaymentOpen(!isPaymentOpen)}>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Payment & Privacy</h2>
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
                      <FormLabel className="text-base font-medium text-gray-700 dark:text-gray-300">
                        Paid Match
                      </FormLabel>
                      <FormDescription className="text-sm text-gray-500 dark:text-gray-400">
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
                      <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Price per Player (₦)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0.00"
                          min={0}
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
                        <FormLabel className="text-base font-medium text-gray-700 dark:text-gray-300">
                          Allow Bulk Ticket Purchase
                        </FormLabel>
                        <FormDescription className="text-sm text-gray-500 dark:text-gray-400">
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
                      <FormLabel className="text-base font-medium text-gray-700 dark:text-gray-300">
                        Private Match
                      </FormLabel>
                      <FormDescription className="text-sm text-gray-500 dark:text-gray-400">
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
                      <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Access Password</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Input
                            value={field.value || ''}
                            readOnly
                            className="font-mono text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
                      <FormDescription className="text-sm text-gray-500 dark:text-gray-400">
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Organizer Details</h2>
          <FormField
            control={form.control}
            name="organizer_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Your Name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Your name" 
                    className="text-base border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white" 
                    {...field} 
                  />
                </FormControl>
                <FormDescription className="text-sm text-gray-500 dark:text-gray-400">
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
                <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Your Phone Number (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Enter 11-digit phone number"
                    className="text-base border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value === "" ? null : value);
                    }}
                  />
                </FormControl>
                <FormDescription className="text-sm text-gray-500 dark:text-gray-400">
                  Provide a contact number for players (optional)
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
                  <FormLabel className="text-base font-medium text-gray-700 dark:text-gray-300">
                    Disclose Phone Number
                  </FormLabel>
                  <FormDescription className="text-sm text-gray-500 dark:text-gray-400">
                    Toggle to share your phone number with players
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
          <FormField
            control={form.control}
            name="player_number_required"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 dark:border-gray-600">
                <div className="space-y-0.5">
                  <FormLabel className="text-base font-medium text-gray-700 dark:text-gray-300">
                    Require Player Phone Numbers
                  </FormLabel>
                  <FormDescription className="text-sm text-gray-500 dark:text-gray-400">
                    Toggle to require players to provide phone numbers
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
        </div>
        <div className="flex justify-between gap-4">
          <Button
            type="button"
            onClick={onPreview}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white font-medium rounded-lg px-4 py-2 transition-colors"
            disabled={loading}
          >
            Preview Match
          </Button>
          <Button
            type="submit"
            className="bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-2 transition-colors"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Match"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default MatchForm;
