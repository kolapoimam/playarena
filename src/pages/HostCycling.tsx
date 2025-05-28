import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, ArrowLeft, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import Navbar from '@/components/Navbar';
import CyclingSuccessDialog from '@/components/CyclingSuccessDialog';
import TimeInput from '@/components/TimeInput';
import CreateLandmarkDialog from '@/components/CreateLandmarkDialog';

const formSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title cannot exceed 100 characters'),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
  event_date: z.date({ required_error: 'Please select a date' }),
  start_time: z.string().regex(/^(0[0-9]|1[0-2]):[0-5][0-9] (AM|PM)$/i, 'Enter a valid time in HH:MM AM/PM format'),
  duration_type: z.enum(['hours', 'minutes', 'distance']),
  duration_value: z.number().int().min(1, 'Duration must be at least 1').max(1000, 'Duration cannot exceed 1000'),
  start_landmark_id: z.string().uuid('Please select a starting landmark').optional().nullable(),
  end_landmark_id: z.string().uuid().optional().nullable(),
  max_attendees: z.number().int().min(1, 'At least 1 attendee').max(100, 'Maximum 100 attendees'),
  is_free: z.boolean().default(true),
  price: z.number()
    .int({ message: 'Price must be a whole number' })
    .min(1000, { message: 'Price must be at least ₦1000' })
    .max(100000, { message: 'Maximum price is ₦100,000' })
    .optional()
    .nullable()
    .refine(val => val === null || val === undefined || val >= 1000, {
      message: 'Price must be at least ₦1000 if provided',
    }),
  is_own_bike: z.boolean().default(false),
  is_rental_available: z.boolean().default(false),
  registration_deadline: z.date().optional().nullable(),
  host_name: z.string().min(3, 'Name must be at least 3 characters').max(50, 'Name cannot exceed 50 characters'),
  host_phone: z.string().regex(/^[0-9]{11}$/, 'Phone number must be exactly 11 digits'),
}).refine(
  (data) => {
    if (data.registration_deadline && data.event_date) {
      return data.registration_deadline <= data.event_date;
    }
    return true;
  },
  {
    message: 'Registration deadline must be before or on event date',
    path: ['registration_deadline'],
  },
).refine(
  (data) => {
    const now = new Date();
    const selectedDateTime = new Date(data.event_date);
    const [hours, minutes] = data.start_time.replace(/ AM|PM/i, '').split(':').map(Number);
    const period = data.start_time.slice(-2).toUpperCase();
    let h = hours;
    if (period === 'PM' && hours !== 12) h += 12;
    if (period === 'AM' && hours === 12) h = 0;
    selectedDateTime.setHours(h, minutes, 0, 0);
    const tenMinutesLater = new Date(now.getTime() + 10 * 60 * 1000);
    return selectedDateTime >= tenMinutesLater;
  },
  {
    message: 'Event must be scheduled at least 10 minutes from now',
    path: ['start_time'],
  },
).refine(
  (data) => {
    if (!data.is_free && (!data.price || data.price < 1000)) {
      return false;
    }
    return true;
  },
  {
    message: 'Price is required and must be at least ₦1000 for a paid event',
    path: ['price'],
  },
);

type FormValues = z.infer<typeof formSchema>;

const HostCycling = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [landmarks, setLandmarks] = useState<{ id: string; name: string; state: string }[]>([]);
  const [loadingLandmarks, setLoadingLandmarks] = useState(true);
  const [landmarksError, setLandmarksError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [supercode, setSupercode] = useState<string | null>(null);
  const [eventSlug, setEventSlug] = useState<string | null>(null);
  const [isEventDetailsOpen, setIsEventDetailsOpen] = useState(true);
  const [isRouteDetailsOpen, setIsRouteDetailsOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [isHostDetailsOpen, setIsHostDetailsOpen] = useState(false);
  const [isCreateLandmarkOpen, setIsCreateLandmarkOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      notes: '',
      duration_type: 'hours',
      duration_value: 1,
      max_attendees: 10,
      is_free: true,
      price: null,
      is_own_bike: false,
      is_rental_available: false,
      host_name: '',
      host_phone: '',
      start_landmark_id: null,
      end_landmark_id: null,
    },
  });

  useEffect(() => {
    const fetchLandmarks = async () => {
      try {
        setLoadingLandmarks(true);
        const { data, error } = await supabase.from('landmarks').select('id, name, state').order('name', { ascending: true });
        if (error) throw new Error(`Failed to fetch landmarks: ${error.message}`);
        setLandmarks(data || []);
        if (!data || data.length === 0) {
          setLandmarksError('No landmarks available. Please create a new landmark.');
        }
      } catch (error: any) {
        console.error('Error fetching landmarks:', error);
        setLandmarksError(error.message || 'Failed to load landmarks.');
        toast({
          title: 'Error',
          description: 'Failed to load landmarks. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoadingLandmarks(false);
      }
    };
    fetchLandmarks();
  }, [toast]);

  const handleCreateLandmark = async (data: {
    new_landmark_name: string;
    new_landmark_state: string;
    new_landmark_description?: string;
    new_landmark_map_link?: string | null;
  }) => {
    try {
      const { data: slugData, error: slugError } = await supabase.rpc('generate_unique_slug', { title: data.new_landmark_name });
      if (slugError || !slugData) throw new Error(`Failed to generate landmark slug: ${slugError?.message || 'No slug returned'}`);

      const { data: newLandmark, error: landmarkError } = await supabase
        .from('landmarks')
        .insert({
          name: data.new_landmark_name,
          state: data.new_landmark_state,
          description: data.new_landmark_description || null,
          map_link: data.new_landmark_map_link || null,
          slug: slugData,
        })
        .select('id, name, state')
        .single();
      if (landmarkError) throw new Error(`Failed to create landmark: ${landmarkError.message}`);

      setLandmarks((prev) => [...prev, newLandmark]);
      setLandmarksError(null); // Clear error if landmarks were previously empty
      form.setValue('start_landmark_id', newLandmark.id); // Automatically select the new landmark as the start landmark
    } catch (error: any) {
      console.error('Error creating landmark:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create landmark. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      if (!data.title || !data.event_date || !data.start_time || !data.host_name) {
        throw new Error('Missing required form fields');
      }
      if (!data.start_landmark_id) {
        throw new Error('Please select a starting landmark');
      }

      const { data: supercodeData, error: codeError } = await supabase.rpc('generate_unique_code', { length: 8 });
      if (codeError || !supercodeData) throw new Error(`Failed to generate supercode: ${codeError?.message || 'No supercode returned'}`);

      const { data: slugData, error: slugError } = await supabase.rpc('generate_unique_slug', { title: data.title });
      if (slugError || !slugData) throw new Error(`Failed to generate slug: ${slugError?.message || 'No slug returned'}`);

      const { data: eventData, error: eventError } = await supabase
        .from('cycling_events')
        .insert({
          title: data.title,
          slug: slugData,
          notes: data.notes || null,
          event_date: format(data.event_date, 'yyyy-MM-dd'),
          start_time: data.start_time,
          duration_type: data.duration_type,
          duration_value: data.duration_value,
          start_landmark_id: data.start_landmark_id,
          end_landmark_id: data.end_landmark_id || null,
          max_attendees: data.max_attendees,
          is_free: data.is_free,
          price: data.is_free ? null : data.price,
          is_own_bike: data.is_own_bike,
          is_rental_available: data.is_rental_available,
          registration_deadline: data.registration_deadline ? format(data.registration_deadline, 'yyyy-MM-dd') : null,
          host_name: data.host_name,
          host_phone: data.host_phone,
          supercode: supercodeData,
        })
        .select('id, slug')
        .single();

      if (eventError || !eventData) throw new Error(`Failed to create event: ${eventError?.message || 'No event data returned'}`);

      setSupercode(supercodeData);
      setEventSlug(slugData);
      setSuccessDialogOpen(true);
    } catch (error: any) {
      console.error('Error creating event:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create event. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (slug: string) => {
    if (slug) {
      navigate(`/cycling/${slug}`);
    } else {
      navigate('/events');
    }
  };

  const handleSectionToggle = (setter: (value: boolean) => void, newValue: boolean) => {
    setter(newValue);
    setTimeout(() => {
      if (formRef.current) {
        const formBottom = formRef.current.getBoundingClientRect().bottom;
        const viewportHeight = window.innerHeight;
        if (formBottom > viewportHeight) {
          window.scrollTo({
            top: window.scrollY + (formBottom - viewportHeight + 100),
            behavior: 'smooth',
          });
        }
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 pb-20">
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
          <h1 className="text-2xl font-bold">Host Cycling Event</h1>
          <div className="w-10"></div>
        </div>
      </header>
      {loadingLandmarks ? (
        <p className="text-center mt-4">Loading landmarks...</p>
      ) : (
        <div className="p-6 max-w-3xl mx-auto">
          <Form {...form}>
            <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
                <div className="flex justify-between items-center cursor-pointer" onClick={() => handleSectionToggle(setIsRouteDetailsOpen, !isRouteDetailsOpen)}>
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Route Details</h2>
                  <span>{isRouteDetailsOpen ? '-' : '+'}</span>
                </div>
                {isRouteDetailsOpen && (
                  <div className="space-y-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex items-center space-x-2"
                      onClick={() => setIsCreateLandmarkOpen(true)}
                    >
                      <Plus size={16} />
                      <span>Create New Landmark</span>
                    </Button>
                    <FormField
                      control={form.control}
                      name="start_landmark_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Starting Landmark</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value === 'null' ? null : value);
                            }}
                            value={field.value || undefined}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a landmark" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {landmarks.length > 0 ? (
                                landmarks.map((landmark) => (
                                  <SelectItem key={landmark.id} value={landmark.id}>
                                    {landmark.name}, {landmark.state}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="null" disabled>
                                  No landmarks available
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="end_landmark_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ending Landmark (Optional)</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value === 'null' ? null : value);
                            }}
                            value={field.value || undefined}
                          >
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
                          <FormDescription className="text-sm text-gray-500 dark:text-gray-400">
                            Select an ending landmark if different from the starting landmark (optional)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
                <div className="flex justify-between items-center cursor-pointer" onClick={() => handleSectionToggle(setIsEventDetailsOpen, !isEventDetailsOpen)}>
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Event Details</h2>
                  <span>{isEventDetailsOpen ? '-' : '+'}</span>
                </div>
                {isEventDetailsOpen && (
                  <>
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Title</FormLabel>
                          <FormControl>
                            <Input placeholder="E.g., Sunday Coastal Ride" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes (Optional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="E.g., Bring water, helmets required" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="event_date"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn('pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                                  >
                                    {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
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
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="start_time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Time</FormLabel>
                            <FormControl>
                              <TimeInput
                                value={field.value || ""}
                                onChange={field.onChange}
                                placeholder="e.g., 08:00 AM"
                              />
                            </FormControl>
                            <FormDescription className="text-sm text-gray-500 dark:text-gray-400">
                              Event start time (12-hour clock, e.g., 08:00 AM)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="duration_type"
                        render={({ field }) => (
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
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="duration_value"
                        render={({ field }) => (
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
                        )}
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
                <div className="flex justify-between items-center cursor-pointer" onClick={() => handleSectionToggle(setIsPreferencesOpen, !isPreferencesOpen)}>
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Event Preferences</h2>
                  <span>{isPreferencesOpen ? '-' : '+'}</span>
                </div>
                {isPreferencesOpen && (
                  <>
                    <FormField
                      control={form.control}
                      name="max_attendees"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Attendees</FormLabel>
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
                      )}
                    />
                    <div className="flex flex-col space-y-4">
                      <FormField
                        control={form.control}
                        name="is_free"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <label className="text-sm font-medium">Free Event</label>
                          </FormItem>
                        )}
                      />
                      {!form.watch("is_free") && (
                        <FormField
                          control={form.control}
                          name="price"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Event Price (₦)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="Enter price (minimum ₦1000)"
                                  min={1000}
                                  className="text-base border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                                  {...field}
                                  value={field.value ?? ""}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    field.onChange(value === "" ? null : parseInt(value, 10));
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      <FormField
                        control={form.control}
                        name="is_own_bike"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <label className="text-sm font-medium">Bring Own Bike</label>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="is_rental_available"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <label className="text-sm font-medium">Rentals Available</label>
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
                <div className="flex justify-between items-center cursor-pointer" onClick={() => handleSectionToggle(setIsRegistrationOpen, !isRegistrationOpen)}>
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Registration Details</h2>
                  <span>{isRegistrationOpen ? '-' : '+'}</span>
                </div>
                {isRegistrationOpen && (
                  <FormField
                    control={form.control}
                    name="registration_deadline"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Registration Deadline (Optional)</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn('pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                              >
                                {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date < new Date(new Date().setHours(0, 0, 0, 0)) ||
                                (form.watch('event_date') && date > form.watch('event_date'))
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
                <div className="flex justify-between items-center cursor-pointer" onClick={() => handleSectionToggle(setIsHostDetailsOpen, !isHostDetailsOpen)}>
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Host Details</h2>
                  <span>{isHostDetailsOpen ? '-' : '+'}</span>
                </div>
                {isHostDetailsOpen && (
                  <>
                    <FormField
                      control={form.control}
                      name="host_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Host Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="host_phone"
                      render={({ field }) => (
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
                      )}
                    />
                  </>
                )}
              </div>
            </form>
            <div className="fixed bottom-16 left-0 right-0 max-w-3xl mx-auto p-4 bg-white dark:bg-gray-800 shadow-lg border-t border-gray-200 dark:border-gray-700">
              <Button
                type="submit"
                form={formRef.current?.id}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-3 text-lg transition-colors"
                disabled={loading || loadingLandmarks || !!landmarksError}
                onClick={() => form.handleSubmit(onSubmit)()}
              >
                {loading ? 'Creating...' : 'Create Event'}
              </Button>
            </div>
          </Form>
        </div>
      )}
      <CyclingSuccessDialog
        open={successDialogOpen}
        onOpenChange={setSuccessDialogOpen}
        formValues={{
          title: form.getValues('title'),
          event_date: form.getValues('event_date')!,
          start_time: form.getValues('start_time'),
          host_name: form.getValues('host_name'),
        }}
        selectedLandmark={landmarks.find((l) => l.id === form.getValues('start_landmark_id')) || { id: '', name: 'Unknown', state: 'Unknown' }}
        supercode={supercode}
        eventSlug={eventSlug || ''}
        onNavigate={() => handleNavigate(eventSlug || '')}
      />
      <CreateLandmarkDialog
        open={isCreateLandmarkOpen}
        onOpenChange={setIsCreateLandmarkOpen}
        onSave={handleCreateLandmark}
      />
      <Navbar />
    </div>
  );
};

export default HostCycling;
