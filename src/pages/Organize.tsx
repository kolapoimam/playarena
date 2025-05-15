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
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import VenueForm from "@/components/VenueForm";
import Navbar from "@/components/Navbar";
import html2canvas from "html2canvas";

// Define enums for dropdown options
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
}).refine(data => {
  if (data.sell_tickets && !data.ticket_price) {
    return false;
  }
  return true;
}, {
  message: "Ticket price is required when selling tickets",
  path: ["ticket_price"],
});

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
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);
  const [venuesLoading, setVenuesLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const preSelectedVenueSlug = searchParams.get('venue');
  const [venueDialogOpen, setVenueDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [supercode, setSupercode] = useState<string | null>(null);
  const [matchSlug, setMatchSlug] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
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

  // Persist form state to localStorage
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

  // Save form state to localStorage on change
  useEffect(() => {
    const subscription = form.watch((value) => {
      localStorage.setItem("organizeFormState", JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  const isPaid = form.watch("is_paid");
  const isPrivate = form.watch("is_private");
  const selectedVenueId = form.watch("venue_id");
  const matchTitle = form.watch("title");
  const matchDate = form.watch("match_date");
  const matchTime = form.watch("match_time");
  const organizerName = form.watch("organizer_name");
  const accessPassword = form.watch("access_password");
  const organizerPhone = form.watch("organizer_phone");
  const totalSlots = form.watch("total_slots");
  const notes = form.watch("notes");
  const skillLevel = form.watch("skill_level");
  const matchType = form.watch("match_type");
  const gender = form.watch("gender");
  const sellTickets = form.watch("sell_tickets");
  const ticketPrice = form.watch("ticket_price");
  const maxTickets = form.watch("max_tickets");

  // Determine if preview button should be enabled
  const isPreviewEnabled = matchTitle && selectedVenueId && matchDate && matchTime && totalSlots && organizerName;

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
    if (isPrivate && !accessPassword) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let password = '';
      for (let i = 0; i < 6; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      form.setValue('access_password', password);
    } else if (!isPrivate) {
      form.setValue('access_password', null);
    }
  }, [isPrivate, accessPassword, form]);

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
          match_time: data.match_time,
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
      link.download = `PlayArena-Supercode-${matchTitle.replace(/\s+/g, '-')}.png`;
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

  const selectedVenue = venues.find(venue => venue.id === selectedVenueId);

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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Match Details Section */}
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

            {/* Preferences (Optional) Section */}
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

            {/* Payment and Privacy Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Payment & Privacy</h2>

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

              {isPaid && (
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

              {isPaid && (
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

              {isPrivate && (
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
            </div>

            {/* Organizer Details Section */}
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
                        disabled={!organizerPhone || organizerPhone.length !== 11}
                        className="data-[state=checked]:bg-green-500"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Ticket Sales Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Ticket Sales</h2>

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

              {sellTickets && (
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
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg px-4 py-3 text-lg shadow-md transition-colors"
                onClick={() => setPreviewDialogOpen(true)}
                disabled={loading || !isPreviewEnabled}
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
              <h2 className="text-xl font-bold mb-2">{matchTitle || "Your Match"}</h2>
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>{selectedVenue?.name || "Venue"}</span>
                </div>
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  <span>{matchDate ? format(matchDate, "PPP") : "Date"} at {matchTime || "Time"}</span>
                </div>
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  <span>Organized by {organizerName || "Organizer"}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold">Players: </span>
                  <span className="ml-2">{totalSlots || "N/A"}</span>
                </div>
                {isPaid && (
                  <div className="flex items-center">
                    <span className="font-semibold">Price: </span>
                    <span className="ml-2">₦{form.watch("price")?.toFixed(2) || "0.00"}</span>
                  </div>
                )}
                {sellTickets && (
                  <div className="flex items-center">
                    <span className="font-semibold">Ticket Price: </span>
                    <span className="ml-2">₦{ticketPrice?.toFixed(2) || "N/A"}</span>
                  </div>
                )}
                {maxTickets && (
                  <div className="flex items-center">
                    <span className="font-semibold">Max Tickets: </span>
                    <span className="ml-2">{maxTickets}</span>
                  </div>
                )}
                {notes && (
                  <div className="flex items-center">
                    <span className="font-semibold">Notes: </span>
                    <span className="ml-2">{notes}</span>
                  </div>
                )}
                {skillLevel && (
                  <div className="flex items-center">
                    <span className="font-semibold">Skill Level: </span>
                    <span className="ml-2">{skillLevel}</span>
                  </div>
                )}
                {matchType && (
                  <div className="flex items-center">
                    <span className="font-semibold">Match Type: </span>
                    <span className="ml-2">{matchType}</span>
                  </div>
                )}
                {gender && (
                  <div className="flex items-center">
                    <span className="font-semibold">Gender: </span>
                    <span className="ml-2">{gender}</span>
                  </div>
                )}
                {isPrivate && (
                  <div className="flex items-center">
                    <span className="font-semibold">Access Password: </span>
                    <span className="ml-2 font-mono">{accessPassword || "N/A"}</span>
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
              {isPrivate && " Also, note the access password to share with invited players."}
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
              <h2 className="text-xl font-bold mb-2">{matchTitle}</h2>
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>{selectedVenue?.name || "Venue"}</span>
                </div>
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  <span>{matchDate ? format(matchDate, "PPP") : "Date"} at {matchTime || "Time"}</span>
                </div>
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  <span>Organized by {organizerName}</span>
                </div>
                {isPrivate && (
                  <div className="flex items-center">
                    <span className="font-semibold">Access Password: </span>
                    <span className="ml-2 font-mono">{accessPassword || "N/A"}</span>
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
              {isPrivate && " Share the access password with invited players to allow them to join."}
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
