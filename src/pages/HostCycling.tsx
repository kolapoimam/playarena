import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Bicycle, MapPin } from "lucide-react";
import { format } from "date-fns";
import TimeInput from "@/components/TimeInput";
import { cn } from "@/lib/utils";
import CyclingSuccessDialog from "@/components/CyclingSuccessDialog";

// Nigerian states including FCT
const nigerianStates = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", 
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", 
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", 
  "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", 
  "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
];

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title cannot exceed 100 characters"),
  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional(),
  event_date: z.date({ required_error: "Please select a date" }),
  start_time: z.string().regex(/^(0[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/i, "Enter a valid time in HH:MM AM/PM format"),
  duration_type: z.enum(["hours", "minutes", "distance"]),
  duration_value: z.number().int().min(1, "Duration must be at least 1").max(1000, "Duration cannot exceed 1000"),
  start_landmark_id: z.string().uuid("Please select a starting landmark"),
  end_landmark_id: z.string().uuid().optional().nullable(),
  new_landmark_name: z.string().optional(),
  new_landmark_state: z.string().optional(),
  new_landmark_description: z.string().max(200, "Description cannot exceed 200 characters").optional(),
  new_landmark_map_link: z.string().url("Enter a valid URL").optional().nullable(),
  max_attendees: z.number().int().min(1, "At least 1 attendee").max(100, "Maximum 100 attendees"),
  is_free: z.boolean().default(true),
  is_own_bike: z.boolean().default(false),
  is_rental_available: z.boolean().default(false),
  registration_deadline: z.date().optional().nullable(),
  host_name: z.string().min(3, "Name must be at least 3 characters").max(50, "Name cannot exceed 50 characters"),
  host_phone: z.string().regex(/^[0-9]{11}$/, "Phone number must be exactly 11 digits"),
}).refine(data => !data.new_landmark_name || (data.new_landmark_name && data.new_landmark_state), {
  message: "State is required when creating a new landmark",
  path: ["new_landmark_state"],
}).refine(data => {
  if (data.registration_deadline && data.event_date) {
    return data.registration_deadline <= data.event_date;
  }
  return true;
}, {
  message: "Registration deadline must be before or on event date",
  path: ["registration_deadline"],
}).refine(data => {
  const now = new Date();
  const selectedDateTime = new Date(data.event_date);
  const [hours, minutes] = data.start_time.replace(/ AM|PM/i, "").split(':').map(Number);
  const period = data.start_time.slice(-2).toUpperCase();
  let h = hours;
  if (period === "PM" && hours !== 12) h += 12;
  if (period === "AM" && hours === 12) h = 0;
  selectedDateTime.setHours(h, minutes, 0, 0);
  const tenMinutesLater = new Date(now.getTime() + 10 * 60 * 1000);
  return selectedDateTime >= tenMinutesLater;
}, {
  message: "Event must be scheduled at least 10 minutes from now",
  path: ["start_time"],
});

type FormValues = z.infer<typeof formSchema>;

const HostCycling = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [landmarks, setLandmarks] = useState<{ id: string; name: string; state: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [createLandmark, setCreateLandmark] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [supercode, setSupercode] = useState<string | null>(null);
  const [eventSlug, setEventSlug] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      notes: "",
      duration_type: "hours",
      duration_value: 1,
      max_attendees: 10,
      is_free: true,
      is_own_bike: false,
      is_rental_available: false,
      host_name: "",
      host_phone: "",
      start_landmark_id: "",
      end_landmark_id: null,
      new_landmark_name: "",
      new_landmark_state: "",
      new_landmark_description: "",
      new_landmark_map_link: "",
    },
  });

  useEffect(() => {
    const fetchLandmarks = async () => {
      const { data, error } = await supabase.from("landmarks").select("id, name, state").order("name", { ascending: true });
      if (!error) setLandmarks(data);
    };
    fetchLandmarks();
  }, []);

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      let startLandmarkId = data.start_landmark_id;
      let endLandmarkId = data.end_landmark_id;

      // Create new landmark if specified
      if (createLandmark && data.new_landmark_name && data.new_landmark_state) {
        const { data: newLandmark, error: landmarkError } = await supabase
          .from("landmarks")
          .insert({
            name: data.new_landmark_name,
            state: data.new_landmark_state,
            description: data.new_landmark_description || null,
            map_link: data.new_landmark_map_link || null,
            slug: await supabase.rpc("generate_unique_slug", { title: data.new_landmark_name }).then(res => res.data),
          })
          .select("id")
          .single();
        if (landmarkError) throw landmarkError;
        startLandmarkId = newLandmark.id;
        setLandmarks([...landmarks, { id: newLandmark.id, name: data.new_landmark_name, state: data.new_landmark_state }]);
      }

      // Generate supercode and slug
      const { data: supercodeData, error: codeError } = await supabase.rpc("generate_unique_code", { length: 8 });
      if (codeError) throw codeError;

      const { data: slugData, error: slugError } = await supabase.rpc("generate_unique_slug", { title: data.title });
      if (slugError) throw slugError;

      const { data: eventData, error } = await supabase.from("cycling_events").insert({
        title: data.title,
        slug: slugData,
        notes: data.notes || null,
        event_date: format(data.event_date, "yyyy-MM-dd"),
        start_time: data.start_time,
        duration_type: data.duration_type,
        duration_value: data.duration_value,
        start_landmark_id: startLandmarkId,
        end_landmark_id: endLandmarkId || null,
        max_attendees: data.max_attendees,
        is_free: data.is_free,
        is_own_bike: data.is_own_bike,
        is_rental_available: data.is_rental_available,
        registration_deadline: data.registration_deadline ? format(data.registration_deadline, "yyyy-MM-dd") : null,
        host_name: data.host_name,
        host_phone: data.host_phone,
        supercode: supercodeData,
      }).select("id, slug").single();

      if (error) throw error;

      setSupercode(supercodeData);
      setEventSlug(slugData);
      setSuccessDialogOpen(true);
    } catch (error) {
      console.error("Error creating event:", error);
      toast({ title: "Error", description: "Failed to create event. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (slug: string) => {
    navigate(`/cycling/${slug}`);
  };

  return (
    <div className="container mx-auto p-4 min-h-screen">
      <header className="p-4 bg-gradient-to-r from-green-500 to-green-700 text-white rounded-b-2xl shadow-lg">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)} className="text-white hover:bg-green-600">
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Host Cycling Event</h1>
          <div className="w-10"></div>
        </div>
      </header>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mt-4">
          <FormField control={form.control} name="title" render={({ field }) => (
            <FormItem>
              <FormLabel>Event Title</FormLabel>
              <FormControl>
                <Input placeholder="E.g., Sunday Coastal Ride" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="E.g., Bring water, helmets required" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="event_date" render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                      >
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="start_time" render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time</FormLabel>
                <FormControl>
                  <TimeInput value={field.value} onChange={field.onChange} placeholder="e.g., 08:00 AM" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="duration_type" render={({ field }) => (
              <FormItem>
                <FormLabel>Duration Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="minutes">Minutes</SelectItem>
                    <SelectItem value="distance">Distance (km)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="duration_value" render={({ field }) => (
              <FormItem>
                <FormLabel>Duration Value</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={1000}
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox id="createLandmark" checked={createLandmark} onCheckedChange={(checked) => setCreateLandmark(!!checked)} />
              <label htmlFor="createLandmark" className="text-sm font-medium">Create New Starting Landmark</label>
            </div>
            {createLandmark ? (
              <>
                <FormField control={form.control} name="new_landmark_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Landmark Name</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., Central Park" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="new_landmark_state" render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a state" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {nigerianStates.map((state) => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="new_landmark_description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="E.g., Near the main entrance" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="new_landmark_map_link" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Map Link (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., https://maps.google.com/..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </>
            ) : (
              <FormField control={form.control} name="start_landmark_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Starting Landmark</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a landmark" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {landmarks.map((landmark) => (
                        <SelectItem key={landmark.id} value={landmark.id}>
                          {landmark.name}, {landmark.state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            )}
            <FormField control={form.control} name="end_landmark_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Ending Landmark (Optional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a landmark" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="null">None</SelectItem>
                    {landmarks.map((landmark) => (
                      <SelectItem key={landmark.id} value={landmark.id}>
                        {landmark.name}, {landmark.state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <FormField control={form.control} name="max_attendees" render={({ field }) => (
            <FormItem>
              <FormLabel>Max Attendees</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <div className="flex items-center space-x-4">
            <FormField control={form.control} name="is_free" render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <label className="text-sm font-medium">Free Event</label>
              </FormItem>
            )} />
            <FormField control={form.control} name="is_own_bike" render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <label className="text-sm font-medium">Bring Own Bike</label>
              </FormItem>
            )} />
            <FormField control={form.control} name="is_rental_available" render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <label className="text-sm font-medium">Rentals Available</label>
              </FormItem>
            )} />
          </div>
          <FormField control={form.control} name="registration_deadline" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Registration Deadline (Optional)</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                    >
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0)) || (form.watch("event_date") && date > form.watch("event_date"))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="host_name" render={({ field }) => (
            <FormItem>
              <FormLabel>Host Name</FormLabel>
              <FormControl>
                <Input placeholder="Your name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="host_phone" render={({ field }) => (
            <FormItem>
              <FormLabel>Host Phone Number</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  inputMode="numeric"
                  placeholder="Enter 11-digit phone number"
                  {...field}
                  onChange={(e) => {
                    const numericValue = e.target.value.replace(/\D/g, '').slice(0, 11);
                    field.onChange(numericValue);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <Button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white" disabled={loading}>
            {loading ? "Creating..." : "Create Event"}
          </Button>
        </form>
      </Form>
      <CyclingSuccessDialog
        open={successDialogOpen}
        onOpenChange={setSuccessDialogOpen}
        formValues={{
          title: form.getValues("title"),
          event_date: form.getValues("event_date"),
          start_time: form.getValues("start_time"),
          host_name: form.getValues("host_name"),
        }}
        selectedLandmark={landmarks.find(l => l.id === form.getValues("start_landmark_id"))}
        supercode={supercode}
        eventSlug={eventSlug}
        onNavigate={handleNavigate}
      />
    </div>
  );
};

export default HostCycling;
