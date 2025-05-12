import { useState, useEffect, useRef, useCallback } from "react";
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
import { Calendar as CalendarIcon, Clock, MapPin, ArrowLeft, Plus, User, Trophy } from "lucide-react";
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
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import VenueForm from "@/components/VenueForm";
import Navbar from "@/components/Navbar";
import html2canvas from "html2canvas";

// Form schema using zod
const formSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters" }),
  venue_id: z.string().uuid({ message: "Please select a venue" }),
  match_date: z.date({ required_error: "Please select a date" }),
  match_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { 
    message: "Please enter a valid time (HH:MM)" 
  }),
  total_slots: z.number().int().min(2, { message: "At least 2 players are required" }),
  is_paid: z.boolean().default(false),
  price: z.number().optional().nullable(),
  notes: z.string().optional(),
  organizer_name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  player_number_required: z.boolean().default(false),
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
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Initialize the form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      total_slots: 10,
      is_paid: false,
      price: null,
      notes: "",
      organizer_name: "",
      player_number_required: false,
    },
  });

  // Watch the is_paid field to conditionally show price input
  const isPaid = form.watch("is_paid");
  const selectedVenueId = form.watch("venue_id");
  const matchTitle = form.watch("title");
  const matchDate = form.watch("match_date");
  const matchTime = form.watch("match_time");
  const organizerName = form.watch("organizer_name");

  // Load venues from Supabase
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
          player_number_required: data.player_number_required,
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

  const handleImageLoad = () => {
    setIsImageLoaded(true);
  };

  const handleDownload = useCallback(async () => {
    if (!cardRef.current || !isImageLoaded) {
      toast({
        title: "Error",
        description: "Card is not ready for download. Please try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Ensure the dialog is fully rendered by waiting for the next tick
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true, // Helps with cross-origin images
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `PlayArena-Supercode-${matchTitle.replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error("Error generating image:", error);
      toast({
        title: "Error",
        description: "Failed to download supercode card. Please try again.",
        variant: "destructive",
      });
    }
  }, [isImageLoaded, matchTitle, toast]);

  // Trigger download automatically when dialog opens and image is loaded
  useEffect(() => {
    if (successDialogOpen && isImageLoaded) {
      handleDownload();
    }
  }, [successDialogOpen, isImageLoaded, handleDownload]);

  const selectedVenue = venues.find(venue => venue.id === selectedVenueId);

  return (
    <div className="min-h-screen pb-20">
      <div className="p-4">
        <Button 
          variant="ghost" 
          className="mb-4" 
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
        
        <h1 className="text-2xl font-bold mb-6">Organize a Match</h1>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Match Title</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., Saturday Friendly" {...field} />
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
                    <FormLabel>Venue</FormLabel>
                    <Dialog open={venueDialogOpen} onOpenChange={setVenueDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" type="button">
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
                      <SelectTrigger className="w-full">
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
                          <SelectItem key={venue.id} value={venue.id}>
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
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
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
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="time"
                          placeholder="HH:MM"
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
                  <FormLabel>Number of Players</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={2}
                      {...field}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        field.onChange(isNaN(value) ? 2 : value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Total number of players needed for this match
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="player_number_required"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Require Phone Number
                    </FormLabel>
                    <FormDescription>
                      Toggle if players need to provide their phone number when joining
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

            <FormField
              control={form.control}
              name="is_paid"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Paid Match
                    </FormLabel>
                    <FormDescription>
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
                    <FormLabel>Price per Player (₦)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0.00"
                        min={0}
                        step="0.01"
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

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="E.g., Bring boots, parking available, etc."
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
                  <FormLabel>Your Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your name" {...field} />
                  </FormControl>
                  <FormDescription>
                    This will be displayed as the organizer of the match
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white" disabled={loading}>
              {loading ? "Creating..." : "Create Match"}
            </Button>
          </form>
        </Form>
      </div>
      <Navbar />
      
      <Dialog open={successDialogOpen} onOpenChange={(open) => {
        setSuccessDialogOpen(open);
        if (!open && matchSlug) {
          navigate(`/match/${matchSlug}`);
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogTitle>Match Created Successfully!</DialogTitle>
          <DialogDescription>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Your match has been created. Below is your unique 6-digit supercode for check-ins on match day.
            </p>
            <div 
              ref={cardRef}
              className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <img 
                  src="/playarenadark.png" 
                  alt="PlayArena Logo" 
                  className="h-8 w-auto"
                  onLoad={handleImageLoad}
                  onError={() => {
                    toast({
                      title: "Error",
                      description: "Failed to load logo image.",
                      variant: "destructive",
                    });
                    setIsImageLoaded(true); // Proceed anyway
                  }}
                />
                <Trophy className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold mb-2">{matchTitle}</h2>
              <div className="space-y-2 mb-4">
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
              </div>
              <div className="bg-white text-green-600 rounded-md p-4 text-center">
                <p className="text-sm font-medium">Supercode</p>
                <p className="text-3xl font-bold tracking-wider">{supercode || "N/A"}</p>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 my-4">
              <strong>Note:</strong> Save or download this code. You'll need it to confirm and check in players on match day.
            </p>
            <div className="flex gap-2">
              <Button 
                className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                onClick={handleDownload}
                disabled={!isImageLoaded}
              >
                Download Supercode
              </Button>
              <Button 
                className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                onClick={() => {
                  setSuccessDialogOpen(false);
                  if (matchSlug) {
                    navigate(`/match/${matchSlug}`);
                  }
                }}
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
