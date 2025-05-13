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

const formSchema = z.object({
  title: z.string()
    .min(3, { message: "Title must be at least 3 characters" })
    .max(100, { message: "Title cannot exceed 100 characters" }),
    
  venue_id: z.string()
    .uuid({ message: "Please select a valid venue" }),
    
  match_date: z.date({ 
    required_error: "Please select a date",
    invalid_type_error: "Please select a valid date" 
  }).min(new Date(), { message: "Date cannot be in the past" }),
    
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
    .max(10000, { message: "Maximum price is ₦10,000" })
    .optional()
    .nullable()
    .refine(val => val === null || val === undefined || val >= 0, {
      message: "Price must be positive if provided"
    }),
    
  notes: z.string()
    .max(500, { message: "Notes cannot exceed 500 characters" })
    .optional(),
    
  organizer_name: z.string()
    .min(2, { message: "Name must be at least 2 characters" })
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
  const [supercode, setSupercode] = useState<string | null>(null);
  const [matchSlug, setMatchSlug] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
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
    },
  });

  const isPaid = form.watch("is_paid");
  const isPrivate = form.watch("is_private");
  const selectedVenueId = form.watch("venue_id");
  const matchTitle = form.watch("title");
  const matchDate = form.watch("match_date");
  const matchTime = form.watch("match_time");
  const organizerName = form.watch("organizer_name");
  const accessPassword = form.watch("access_password");

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
        })
        .select('id, slug, super_code')
        .single();

      if (error) throw error;

      setSupercode(match.super_code || "N/A");
      setMatchSlug(match.slug);
      setSuccessDialogOpen(true);

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
    <div className="min-h-screen pb-20 bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-50 bg-green-500 text-white shadow-md">
        <div className="p-4 flex items-center justify-between">
          <Button 
            variant="ghost" 
            className="text-white hover:text-gray-200"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Organize a Match</h1>
        </div>
      </header>

      <div className="p-6 max-w-2xl mx-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Match Title</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., Saturday Friendly" className="text-base" {...field} />
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
                    <FormLabel className="text-sm font-medium">Venue</FormLabel>
                    <Dialog open={venueDialogOpen} onOpenChange={setVenueDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" type="button" className="text-sm font-medium">
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
                      <SelectTrigger className="w-full text-base">
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
                    <FormLabel className="text-sm font-medium">Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left text-base font-normal",
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
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
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
                    <FormLabel className="text-sm font-medium">Time</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="time"
                          placeholder="HH:MM"
                          className="text-base"
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
                  <FormLabel className="text-sm font-medium">Number of Players</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={2}
                      className="text-base"
                      {...field}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        field.onChange(isNaN(value) ? 2 : value);
                      }}
                    />
                  </FormControl>
                  <FormDescription className="text-sm">
                    Total number of players needed for this match
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_paid"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base font-medium">
                      Paid Match
                    </FormLabel>
                    <FormDescription className="text-sm">
                      Toggle if players need to pay to join this match
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
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
                    <FormLabel className="text-sm font-medium">Price per Player (₦)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0.00"
                        min={0}
                        step="0.01"
                        className="text-base"
                        {...field}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          field.onChange(isNaN(value) ? 0 : value);
                        }}
                        value={field.value ?? ""}
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
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base font-medium">
                        Allow Bulk Ticket Purchase
                      </FormLabel>
                      <FormDescription className="text-sm">
                        Toggle to allow players to purchase multiple slots (up to 5 or available slots)
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
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
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base font-medium">
                      Private Match
                    </FormLabel>
                    <FormDescription className="text-sm">
                      Toggle to restrict access to invited players only
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
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
                    <FormLabel className="text-sm font-medium">Access Password</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input
                          value={field.value || ''}
                          readOnly
                          className="font-mono text-base"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        className="text-sm font-medium"
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
                    <FormDescription className="text-sm">
                      Share this password with players you want to invite
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="E.g., Bring boots, parking available, etc."
                      className="text-base"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="organizer_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Your Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your name" className="text-base" {...field} />
                  </FormControl>
                  <FormDescription className="text-sm">
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
      <FormLabel className="text-sm font-medium">Your Phone Number (Optional)</FormLabel>
      <FormControl>
        <Input
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="Enter 11-digit phone number"
          className="text-base"
          {...field}
          value={field.value ?? ""}
          onChange={(e) => {
            // Only allow numbers and limit to 11 digits
            const numericValue = e.target.value.replace(/\D/g, '');
            const truncatedValue = numericValue.slice(0, 11);
            field.onChange(truncatedValue || null);
          }}
        />
      </FormControl>
      <FormDescription className="text-sm">
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
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base font-medium">
                      Disclose Phone Number
                    </FormLabel>
                    <FormDescription className="text-sm">
                      Toggle to share your phone number with players
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-2" 
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Match"}
            </Button>
          </form>
        </Form>
      </div>
      <Navbar />
      
      <Dialog open={successDialogOpen} onOpenChange={(open) => {
        if (!open && matchSlug) {
          navigate(`/match/${matchSlug}`);
        }
        setSuccessDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogTitle className="text-xl font-bold">Match Created Successfully!</DialogTitle>
          <DialogDescription>
            <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">
              Your match has been created. Below is your unique 6-digit supercode for check-ins on match day.
              {isPrivate && " Also, note the access password to share with invited players."}
            </p>
            <div 
              ref={cardRef}
              className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <img 
                  src="/playarenalight.png" 
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
              <div className="bg-white text-green-600 rounded-md p-4 text-center">
                <p className="text-sm font-medium">Supercode</p>
                <p className="text-3xl font-bold tracking-wider">{supercode || "N/A"}</p>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 my-4">
              <strong>Note:</strong> Save or download this code. You'll need it to confirm and check in players on match day.
              {isPrivate && " Share the access password with invited players to allow them to join."}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-2"
                onClick={handleDownload}
                disabled={isDownloading}
              >
                {isDownloading ? "Downloading..." : "Download Supercode"}
              </Button>
              <Button 
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-2"
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
