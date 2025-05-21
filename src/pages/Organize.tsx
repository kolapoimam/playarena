import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import ThemeToggle from "@/components/ThemeToggle";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarIcon, Clock, MapPin, ArrowLeft, Plus, User, Trophy, Copy } from "lucide-react";
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
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format, parse, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import VenueForm from "@/components/VenueForm";
import Navbar from "@/components/Navbar";
import html2canvas from "html2canvas";

// Define enums for dropdown options
const skillLevels = ["Beginner", "Amateur", "Intermediate", "Advanced", "Professional", "All", "None"] as const;
const matchTypes = ["4-a-side", "5-a-side", "7-a-side", "11-a-side (Regular)", "Double", "Friendly", "All", "None"] as const;
const genders = ["Male", "Female", "All", "None"] as const;

// Custom 12-hour format validation
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
  const [startHours, startMinutes] = data.start_time.replace(" AM|PM", "").split(':').map(Number);
  const startPeriod = data.start_time.slice(-2).toUpperCase();
  let startH = startHours;
  if (startPeriod === "PM" && startHours !== 12) startH += 12;
  if (startPeriod === "AM" && startHours === 12) startH = 0;
  startDateTime.setHours(startH, startMinutes, 0, 0);

  const endDateTime = new Date(data.match_date);
  const [endHours, endMinutes] = data.end_time.replace(" AM|PM", "").split(':').map(Number);
  const endPeriod = data.end_time.slice(-2).toUpperCase();
  let endH = endHours;
  if (endPeriod === "PM" && endHours !== 12) endH += 12;
  if (endPeriod === "AM" && endHours === 12) endH = 0;
  endDateTime.setHours(endH, endMinutes, 0, 0);

  // If end time appears earlier on the same day, assume it’s the next day (e.g., 11:00 PM to 01:00 AM)
  if (endH < startH || (endH === startH && endMinutes <= startMinutes)) {
    endDateTime.setDate(endDateTime.getDate() + 1);
  }

  return startDateTime < endDateTime;
}, {
  message: "Start time must be before end time",
  path: ["end_time"],
}).refine(data => {
  const now = new Date();
  const selectedDateTime = new Date(data.match_date);
  const [startHours, startMinutes] = data.start_time.replace(" AM|PM", "").split(':').map(Number);
  const period = data.start_time.slice(-2).toUpperCase();
  let hours = startHours;
  if (period === "PM" && startHours !== 12) hours += 12;
  if (period === "AM" && startHours === 12) hours = 0;
  selectedDateTime.setHours(hours, startMinutes, 0, 0);

  const tenMinutesLater = new Date(now.getTime() + 10 * 60 * 1000);
  return selectedDateTime >= tenMinutesLater;
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
}).refine(data => {
  const startDateTime = new Date(data.match_date);
  const [startHours, startMinutes] = data.start_time.replace(" AM|PM", "").split(':').map(Number);
  const startPeriod = data.start_time.slice(-2).toUpperCase();
  let startH = startHours;
  if (startPeriod === "PM" && startHours !== 12) startH += 12;
  if (startPeriod === "AM" && startHours === 12) startH = 0;
  startDateTime.setHours(startH, startMinutes, 0, 0);

  const endDateTime = new Date(data.match_date);
  const [endHours, endMinutes] = data.end_time.replace(" AM|PM", "").split(':').map(Number);
  const endPeriod = data.end_time.slice(-2).toUpperCase();
  let endH = endHours;
  if (endPeriod === "PM" && endHours !== 12) endH += 12;
  if (endPeriod === "AM" && endHours === 12) endH = 0;
  endDateTime.setHours(endH, endMinutes, 0, 0);

  // Handle cases where end time is on the next day (e.g., 11:00 PM to 01:00 AM)
  if (endH < startH || (endH === startH && endMinutes <= startMinutes)) {
    endDateTime.setDate(endDateTime.getDate() + 1);
  }

  return startDateTime < endDateTime;
}, {
  message: "Start time must be before end time",
  path: ["end_time"],
});

const formatTimeTo12Hour = (time24: string): string => {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const adjustedHours = hours % 12 || 12;
  return `${adjustedHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
};

const convertTo24Hour = (time12: string): string => {
  const [time, period] = time12.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (period.toUpperCase() === 'PM' && hours !== 12) hours += 12;
  if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

type FormValues = z.infer<typeof formSchema>;

type Venue = {
  id: string;
  slug: string;
  name: string;
  city: string;
};

const Organize = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const preSelectedVenueSlug = searchParams.get('venue');
  const accessCode = searchParams.get('code');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);
  const [venuesLoading, setVenuesLoading] = useState(true);
  const [venueDialogOpen, setVenueDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isTicketSalesOpen, setIsTicketSalesOpen] = useState(false);
  const [supercode, setSupercode] = useState<string | null>(null);
  const [matchSlug, setMatchSlug] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isPreFilled, setIsPreFilled] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

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

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (session.session) {
        setUserId(session.session.user.id);
      }
    };
    checkAuth();
  }, []);

  // Handle venue and access code from query parameters
  useEffect(() => {
    const handlePreFill = async () => {
      if (preSelectedVenueSlug && accessCode) {
        try {
          // Fetch venue by slug
          const { data: venue, error: venueError } = await supabase
            .from("venues")
            .select("id, slug, name, city")
            .eq("slug", preSelectedVenueSlug)
            .single();

          if (venueError || !venue) {
            throw new Error("Venue not found");
          }

          // Validate access code
          const { data: accessCodeData, error: accessCodeError } = await supabase
            .from("venue_access_codes")
            .select("match_date, start_time, end_time")
            .eq("code", accessCode)
            .eq("venue_id", venue.id)
            .single();

          if (accessCodeError || !accessCodeData) {
            throw new Error("Invalid or expired access code");
          }

          // Pre-fill form with 12-hour format
          form.setValue("venue_id", venue.id);
          form.setValue("match_date", new Date(accessCodeData.match_date));
          form.setValue("start_time", formatTimeTo12Hour(accessCodeData.start_time));
          form.setValue("end_time", formatTimeTo12Hour(accessCodeData.end_time));
          setIsPreFilled(true);

          toast({
            title: "Venue Booking Loaded",
            description: `Form pre-filled with booking details for ${venue.name}.`,
          });
        } catch (error: any) {
          console.error("Error pre-filling form:", error);
          toast({
            title: "Error",
            description: error.message || "Failed to load booking details.",
            variant: "destructive",
          });
          navigate("/organize"); // Clear invalid query params
        }
      }
    };

    handlePreFill();
  }, [preSelectedVenueSlug, accessCode, form, toast, navigate]);

  // Fetch venues
  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const { data, error } = await supabase
          .from("venues")
          .select("id, slug, name, city")
          .order("name");

        if (error) throw error;
        setVenues(data || []);

        // Set venue from query param if not pre-filled
        if (preSelectedVenueSlug && !accessCode) {
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
  }, [toast, form, preSelectedVenueSlug, accessCode]);

  // Persist form state to localStorage
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
          parsed.end_time = parsed.end_time.replace(/^(0[1-9]|1[0-2]):([0-5][0-9]) (AM|PM)$/, "$1:$2 $3");
        }
        form.reset(parsed);
      }
    }
  }, [form, isPreFilled]);

  // Save form state to localStorage on change
  useEffect(() => {
    const subscription = form.watch((value) => {
      if (!isPreFilled) {
        localStorage.setItem("organizeFormState", JSON.stringify(value));
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch, isPreFilled]);

  // Handle private match password
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
  }, [form.watch("is_private"), form.watch("access_password"), form]);

  const onSubmit = async (data: FormValues) => {
    setLoading(true);

    try {
      const superCode = Math.floor(100000 + Math.random() * 900000).toString();

      const { data: match, error } = await supabase
        .from("matches")
        .insert({
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
        })
        .select('id, slug, super_code')
        .single();

      if (error) throw error;

      if (userId) {
        const { error: linkError } = await supabase
          .from("user_organized_matches")
          .insert({
            user_id: userId,
            match_id: match.id,
          });

        if (linkError) throw linkError;
      }

      // Update booking with match_id if coming from venue booking
      if (accessCode && preSelectedVenueSlug) {
        const { data: venue } = await supabase
          .from("venues")
          .select("id")
          .eq("slug", preSelectedVenueSlug)
          .single();

        const { error: bookingUpdateError } = await supabase
          .from("bookings")
          .update({ match_id: match.id })
          .eq("venue_id", venue.id)
          .eq("payment_reference", searchParams.get("reference")); // Use payment_reference to match booking

        if (bookingUpdateError) {
          console.error("Error updating booking with match_id:", bookingUpdateError);
          toast({
            title: "Warning",
            description: "Match created, but failed to link booking. Contact support.",
            variant: "destructive",
          });
        }
      }

      setSupercode(match.super_code || "N/A");
      setMatchSlug(match.slug);
      setSuccessDialogOpen(true);

      localStorage.removeItem("organizeFormState");

      toast({
        title: "Success!",
        description: "Your match has been created.",
      });
    } catch (error) {
      console.error("Error creating match:", error);
      toast({
        title: "Error",
        description: "Failed to create match. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVenueCreated = (venueId: string, venueSlug: string, venueName: string) => {
    setVenues(prev => [{ id: venueId, slug: venueSlug, name: venueName, city: "" }, ...prev]);
    form.setValue("venue_id", venueId);
    setVenueDialogOpen(false);
    toast({
      title: "Venue created",
      description: `${venueName} has been added to venues.`,
    });
  };

  const handleDownload = async () => {
    if (!cardRef.current) {
      toast({
        title: "Error",
        description: "Card element is not ready. Please try again.",
        variant: "destructive",
      });
      return;
    }
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 2 });
      const link = document.createElement('a');
      link.download = `SportCliq-Supercode-${form.watch("title").replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error("Error generating image:", error);
      toast({
        title: "Error",
        description: "Failed to download supercode card.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const selectedVenue = venues.find(venue => venue.id === form.watch("venue_id"));

  return (
    <div className="min-h-screen pb-20 bg-gray-100 dark:bg-gray-900">
      <header className="sticky top-0 z-50 bg-gradient-to-r from-green-500 to-green-700 text-white shadow-lg">
        <div className="p-4 flex items-center justify-between max-w-7xl mx-auto">
          <Button 
            variant="ghost" 
            className="text-white hover:bg-green-600 transition-colors"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Organize a Match</h1>
          <div className="w-10"></div>
        </div>
      </header>

      <div className="p-6 max-w-3xl mx-auto">
        {isPreFilled && (
          <div className="mb-4 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 p-4 rounded-lg">
            <p className="font-medium">Venue Booking Pre-Filled</p>
            <p className="text-sm">The venue, date, and time are set based on your booking. These fields are locked to match your reservation.</p>
          </div>
        )}
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

              <FormField
                control={form.control}
                name="venue_id"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center">
                      <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Venue</FormLabel>
                      {!isPreFilled && (
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
                      )}
                    </div>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isPreFilled}>
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
                        <div className="relative">
                          <Input
                            type="text"
                            placeholder="e.g., 01:00 PM"
                            className="text-base border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => {
                              const value = e.target.value.toUpperCase();
                              if (timePattern.test(value) || value === "") {
                                field.onChange(value);
                              }
                            }}
                            disabled={isPreFilled}
                          />
                          <Clock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        </div>
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
                        <div className="relative">
                          <Input
                            type="text"
                            placeholder="e.g., 03:00 PM"
                            className="text-base border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => {
                              const value = e.target.value.toUpperCase();
                              if (timePattern.test(value) || value === "") {
                                field.onChange(value);
                              }
                            }}
                            disabled={isPreFilled}
                          />
                          <Clock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        </div>
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
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Preferences Section (Collapsible) */}
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

            {/* Payment & Privacy Section (Collapsible) */}
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

            {/* Ticket Sales Section (Collapsible) */}
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

            {/* Organizer Details Section (Expanded by default) */}
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
                          const numericValue = e.target.value.replace(/\D/g, '');
                          const truncatedValue = numericValue.slice(0, 11);
                          field.onChange(truncatedValue || null);
                        }}
                      />
                    </FormControl>
                    <FormDescription className="text-sm text-gray-500 dark:text-gray-400">
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
                        disabled={!form.watch("organizer_phone") || form.watch("organizer_phone")?.length !== 11}
                        className="data-[state=checked]:bg-green-500"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg px-4 py-3 text-lg shadow-md transition-colors"
                onClick={() => setPreviewDialogOpen(true)}
                disabled={loading || !form.watch("title") || !form.watch("venue_id") || !form.watch("match_date") || !form.watch("start_time") || !form.watch("end_time") || !form.watch("total_slots") || !form.watch("organizer_name")}
              >
                Preview Match
              </Button>
              <Button 
                type="submit" 
                className="w-full bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-3 text-lg shadow-md transition-colors" 
                disabled={loading}
              >
                {loading ? "Creating..." : "Create Match"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
      <Navbar />

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="sm:max-w-[375px] rounded-2xl">
          <DialogTitle className="text-xl font-bold text-gray-800 dark:text-gray-200">Match Preview</DialogTitle>
          <DialogDescription>
            <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <img 
                  src="/playarenadark.png" 
                  alt="PlayArena Logo" 
                  className="h-8 w-auto"
                />
                <Trophy className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold mb-2">{form.watch("title") || "Your Match"}</h2>
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>{selectedVenue?.name || "Venue"}</span>
                </div>
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  <span>{form.watch("match_date") ? format(form.watch("match_date")!, "PPP") : "Date"}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>From {form.watch("start_time") || "Start"} to {form.watch("end_time") || "End"}</span>
                </div>
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  <span>Organized by {form.watch("organizer_name") || "Organizer"}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold">Players: </span>
                  <span className="ml-2">{form.watch("total_slots") || "N/A"}</span>
                </div>
                {form.watch("is_paid") && (
                  <div className="flex items-center">
                    <span className="font-semibold">Price: </span>
                    <span className="ml-2">₦{form.watch("price")?.toFixed(2) || "0.00"}</span>
                  </div>
                )}
                {form.watch("sell_tickets") && (
                  <div className="flex items-center">
                    <span className="font-semibold">Ticket Price: </span>
                    <span className="ml-2">₦{form.watch("ticket_price")?.toFixed(2) || "N/A"}</span>
                  </div>
                )}
                {form.watch("max_tickets") && (
                  <div className="flex items-center">
                    <span className="font-semibold">Max Tickets: </span>
                    <span className="ml-2">{form.watch("max_tickets")}</span>
                  </div>
                )}
                {form.watch("notes") && (
                  <div className="flex items-center">
                    <span className="font-semibold">Notes: </span>
                    <span className="ml-2">{form.watch("notes")}</span>
                  </div>
                )}
                {form.watch("skill_level") && form.watch("skill_level") !== "" && (
                  <div className="flex items-center">
                    <span className="font-semibold">Skill Level: </span>
                    <span className="ml-2">{form.watch("skill_level")}</span>
                  </div>
                )}
                {form.watch("match_type") && form.watch("match_type") !== "" && (
                  <div className="flex items-center">
                    <span className="font-semibold">Match Type: </span>
                    <span className="ml-2">{form.watch("match_type")}</span>
                  </div>
                )}
                {form.watch("gender") && form.watch("gender") !== "" && (
                  <div className="flex items-center">
                    <span className="font-semibold">Gender: </span>
                    <span className="ml-2">{form.watch("gender")}</span>
                  </div>
                )}
                {form.watch("is_private") && (
                  <div className="flex items-center">
                    <span className="font-semibold">Access Password: </span>
                    <span className="ml-2 font-mono">{form.watch("access_password") || "N/A"}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                className="bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-2 transition-colors"
                onClick={() => setPreviewDialogOpen(false)}
              >
                Close
              </Button>
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={successDialogOpen} onOpenChange={(open) => {
        if (!open && matchSlug) {
          navigate(`/match/${matchSlug}`);
        }
        setSuccessDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-[375px] rounded-2xl">
          <DialogTitle className="text-xl font-bold text-gray-800 dark:text-gray-200">Match Created Successfully!</DialogTitle>
          <DialogDescription>
            <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">
              Your match has been created. Below is your unique 6-digit supercode for check-ins on match day.
              {form.watch("is_private") && " Also, note the access password to share with invited players."}
            </p>
            <div 
              ref={cardRef}
              className="bg-gradient-to-br from-green-500 to-green-700 rounded-xl p-6 text-white shadow-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <img 
                  src="/playarenadark.png" 
                  alt="PlayArena Logo" 
                  className="h-8 w-auto"
                />
                <Trophy className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold mb-2">{form.watch("title") || "Your Match"}</h2>
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>{selectedVenue?.name || "Venue"}</span>
                </div>
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  <span>{form.watch("match_date") ? format(form.watch("match_date")!, "PPP") : "Date"}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>From {form.watch("start_time") || "Start"} to {form.watch("end_time") || "End"}</span>
                </div>
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  <span>Organized by {form.watch("organizer_name") || "Organizer"}</span>
                </div>
                {form.watch("is_private") && (
                  <div className="flex items-center">
                    <span className="font-semibold">Access Password: </span>
                    <span className="ml-2 font-mono">{form.watch("access_password") || "N/A"}</span>
                  </div>
                )}
              </div>
              <div className="bg-white text-green-600 rounded-md p-4 text-center shadow-inner">
                <p className="text-sm font-medium">Supercode</p>
                <p className="text-3xl font-bold tracking-wider">{supercode || "N/A"}</p>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 my-4">
              <strong>Note:</strong> Save or download this code. You'll need it to confirm and check in players on match day.
              {form.watch("is_private") && " Share the access password with invited players to allow them to join."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-2 transition-colors"
                onClick={handleDownload}
                disabled={isDownloading}
              >
                {isDownloading ? "Downloading..." : "Download Supercode"}
              </Button>
              <Button 
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-2 transition-colors"
                onClick={() => {
                  if (!isDownloading) {
                    setSuccessDialogOpen(false);
                    if (matchSlug) {
                      navigate(`/match/${matchSlug}`);
                    }
                  }
                }}
                disabled={isDownloading}
              >
                Go to Match Details
              </Button>
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Organize;
