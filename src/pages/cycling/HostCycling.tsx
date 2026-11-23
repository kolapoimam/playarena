import { useState, useEffect, useRef, Component, ReactNode } from 'react';
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
import CyclingSuccessDialog from "@/components/cycling/CyclingSuccessDialog";
import TimeInput from '@/components/TimeInput';
import CreateLandmarkDialog from "@/components/cycling/CreateLandmarkDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DateTime } from 'luxon';

import { BackButton } from "@/components/sc/ui";
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div>Error rendering dialog. Event created successfully.</div>;
    }
    return this.props.children;
  }
}

const formSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title cannot exceed 100 characters'),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
  event_date: z.date({ required_error: 'Please select a date' }).refine(
    date => date >= new Date(new Date().setHours(0, 0, 0, 0)),
    { message: 'Event date must be today or in the future' }
  ),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().optional(),
  duration_type: z.enum(['hours', 'minutes', 'distance']),
  duration_value: z.number().int().min(1, 'Duration must be at least 1').max(1000, 'Duration cannot exceed 1000'),
  start_landmark_id: z.string().uuid('Please select a starting landmark'),
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
  }
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
  }
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
  }
).refine(
  (data) => {
    if (data.end_time) {
      const startDateTime = DateTime.fromFormat(
        `${format(data.event_date, 'yyyy-MM-dd')} ${data.start_time}`,
        'yyyy-MM-dd hh:mm a',
        { zone: 'Africa/Lagos' }
      );
      const endDateTime = DateTime.fromFormat(
        `${format(data.event_date, 'yyyy-MM-dd')} ${data.end_time}`,
        'yyyy-MM-dd hh:mm a',
        { zone: 'Africa/Lagos' }
      );
      return endDateTime > startDateTime;
    }
    return true;
  },
  {
    message: 'End time must be after start time',
    path: ['end_time'],
  }
).refine(
  (data) => data.is_own_bike || data.is_rental_available,
  {
    message: "You must select at least one option: 'Bring your bike' or 'Rentals Available'.",
    path: ["is_rental_available"],
  }
);

type FormValues = z.infer<typeof formSchema>;

const LOCAL_STORAGE_KEY = "hostCyclingFormState";

const HostCycling = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [landmarks, setLandmarks] = useState<{ id_uuid: string; name: string; state: string }[]>([]);
  const [loadingLandmarks, setLoadingLandmarks] = useState(true);
  const [landmarksError, setLandmarksError] = useState<string | null>(null);
  const [isLoading, setFormIsLoading] = useState(false);
  const [successDialogIsOpen, setIssuccessDialogIsOpen] = useState(false);
  const [supercode, setSupercode] = useState<string | null>(null);
  const [eventSlug, setEventSlug] = useState<string | null>(null);
  const [isEventDetailsOpen, setIsEventDetailsOpen] = useState(true);
  const [isRouteDetailsOpen, setIsRouteDetailsOpen] = useState(true);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [isHostDetailsOpen, setIsHostDetailsOpen] = useState(false);
  const [isCreateLandmarkOpen, setIsCreateLandmarkOpen] = useState(false);
  const [isEndTimeEnabled, setIsEndTimeEnabled] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      notes: '',
      duration_type: 'hours',
      duration_value: 1,
      start_time: '',
      end_time: '',
      max_attendees: 10,
      is_free: true,
      price: null,
      is_own_bike: false,
      is_rental_available: false,
      host_name: '',
      host_phone: '',
      start_landmark_id: '',
      end_landmark_id: null,
    },
  });

  // Restore from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Convert date strings back to Date objects
        if (parsed.event_date) parsed.event_date = new Date(parsed.event_date);
        if (parsed.registration_deadline) parsed.registration_deadline = new Date(parsed.registration_deadline);
        form.reset(parsed);
      } catch {}
    }
  }, [form]);

  // Save to localStorage on every change
  useEffect(() => {
    const subscription = form.watch((value) => {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [form]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (session.session) {
          setUserId(session.session.user.id);
        }
      } catch (err: any) {
        console.error('Auth error:', err);
        // No redirect; allow non-logged-in users to proceed
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const fetchLandmarks = async () => {
      try {
        setLoadingLandmarks(true);
        const { data, error } = await supabase.from('landmarks').select('id_uuid, name, state').order('name', { ascending: true });
        if (error) throw new Error(`Failed to load landmarks: ${error.message}`);

        const uniqueLandmarks = data
          ? Array.from(new Map(data.map(item => [item.id_uuid, item])).values())
            .filter(item => item.id_uuid && item.name && item.state)
          : [];

        setLandmarks(uniqueLandmarks);
        if (!uniqueLandmarks.length) {
          setLandmarksError('No landmarks available. Please create a new landmark.');
        } else {
          setLandmarksError(null);
        }
      } catch (error: any) {
        console.error('Error:', error);
        setLandmarksError(error.message || 'Failed to load landmarks.');
        toast({
          title: 'Error loading landmarks',
          description: 'Failed to load landmarks. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoadingLandmarks(false);
      }
    };
    fetchLandmarks();
  }, [toast]);

  useEffect(() => {
    if (!isEndTimeEnabled) {
      form.setValue('end_time', '', { shouldValidate: true });
    }
  }, [isEndTimeEnabled, form]);

  const handleCreateLandmark = async (data: {
    new_landmark_name: string;
    new_landmark_state: string;
    new_landmark_description?: string;
    new_landmark_map_link?: string | null;
  }) => {
    try {
      const trimmedName = data.new_landmark_name.trim();
      if (!trimmedName) throw new Error('Landmark name cannot be empty');

      const { data: slugData, error: slugDataError } = await supabase.rpc('generate_unique_slug', {
        p_text_input: trimmedName,
        p_table_name: 'landmarks',
        p_id_uuid: null,
      });

      if (slugDataError) {
        throw new Error(`Failed to generate landmark slug: ${slugDataError.message}`);
      }
      if (typeof slugData !== 'string' || !slugData) {
        throw new Error('Invalid slug response from server');
      }

      const { data: newLandmark, error: landmarkError } = await supabase
        .from('landmarks')
        .insert({
          name: trimmedName,
          state: data.new_landmark_state,
          description: data.new_landmark_description || null,
          map_link: data.new_landmark_map_link || null,
          slug: slugData,
        })
        .select('id_uuid, name, state')
        .single();

      if (landmarkError) {
        throw new Error(`Failed to create landmark: ${landmarkError.message}`);
      }
      if (!newLandmark) {
        throw new Error('No landmark data returned');
      }

      setLandmarks(prev => [...prev, newLandmark]);
      setLandmarksError(null);
      form.setValue('start_landmark_id', newLandmark.id_uuid, { shouldValidate: true });
      toast({
        title: 'Success',
        description: 'Landmark created successfully!',
        variant: 'default',
      });
    } catch (error: any) {
      console.error('Error creating landmark:', error);
      toast({
        title: 'Error creating landmark',
        description: error.message || 'Failed to create landmark. Try again.',
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (data: FormValues) => {
    setFormIsLoading(true);
    try {
      if (!data.start_landmark_id) {
        throw new Error('Please select a starting landmark');
      }

      const { data: supercodeData, error: supercodeError } = await supabase.rpc('generate_unique_supercode');
      if (supercodeError || !supercodeData) {
        throw new Error(`Failed to generate supercode: ${supercodeError?.message || 'No supercode data'}`);
      }

      const { data: slugData, error: slugError } = await supabase.rpc('generate_unique_slug', {
        p_text_input: data.title,
        p_table_name: 'cycling_events',
        p_id_uuid: null,
      });
      if (slugError || !slugData) {
        throw new Error(`Failed to generate slug: ${slugError?.message || 'No slug data'}`);
      }

      const eventDateTime = DateTime.fromJSDate(data.event_date, { zone: 'Africa/Lagos' });
      const now = DateTime.now().setZone('Africa/Lagos');
      let status: string;

      if (eventDateTime.hasSame(now, 'day')) {
        status = 'today';
      } else if (eventDateTime.hasSame(now.plus({ days: 1 }), 'day')) {
        status = 'tomorrow';
      } else if (eventDateTime > now) {
        status = 'upcoming';
      } else {
        status = 'passed';
      }

      const { data: eventData, error: eventError } = await supabase
        .from('cycling_events')
        .insert({
          title: data.title,
          slug: slugData,
          notes: data.notes || null,
          event_date: format(data.event_date, 'yyyy-MM-dd'),
          start_time: data.start_time,
          end_time: data.end_time || null,
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
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status,
        })
        .select('id_uuid')
        .single();

      if (eventError || !eventData) {
        console.error('Supabase insert error:', eventError);
        throw new Error(`Failed to create event: ${eventError?.message || 'No event data'}`);
      }

      // Only insert into user_hosted_cycling if user is logged in
      if (userId) {
        const { error: userHostedError } = await supabase
          .from('user_hosted_cycling')
          .insert({
            user_id: userId,
            cycling_event_id: eventData.id_uuid,
          });

        if (userHostedError) {
          console.error('Error inserting into user_hosted_cycling:', userHostedError);
          throw new Error(`Failed to record hosted event: ${userHostedError.message}`);
        }
      }

      const { data: apiData, error: apiError } = await supabase
        .from('cycling_events_api')
        .select('id, slug')
        .eq('id', eventData.id_uuid)
        .single();

      if (apiError || !apiData) {
        console.error('API view fetch error:', apiError);
        throw new Error(`Failed to fetch API view data: ${apiError?.message || 'No API data'}`);
      }

      if (!apiData.id || !apiData.slug || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(apiData.id)) {
        throw new Error('Invalid event data: ID must be a UUID and slug must be valid');
      }

      setSupercode(supercodeData);
      setEventSlug(apiData.slug);
      setIssuccessDialogIsOpen(true);
      // Clear localStorage after successful submit
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (err: any) {
      console.error('Error in onSubmit:', err);
      toast({
        title: 'Error creating event',
        description: err.message || 'Failed to create event. Please try again.',
        variant: 'error',
      });
    } finally {
      setFormIsLoading(false);
    }
  };

  const handleNavigate = (slug: string | null) => {
    try {
      navigate(slug ? `/cycling/${slug}` : '/cycling');
    } catch (err: any) {
      console.error('Navigation error:', err);
      toast({
        title: 'Error navigating',
        description: 'Failed to navigate.',
        variant: 'error',
      });
    }
  };

  const handleSectionToggle = (setter: (value: boolean) => void, currentValue: boolean) => {
    setter(!currentValue);
  };

  return (
    <div className="min-h-screen pb-32 bg-sc-bg dark:bg-gray-900">
      <header className="px-5 pt-[max(env(safe-area-inset-top),1rem)] sticky top-0 z-20 bg-sc-bg/95 backdrop-blur-xl pb-3">
          <div className="pt-3 flex items-center justify-between gap-3">
            <BackButton />
            <h1 className="m-0 flex-1 text-center text-[17px] font-extrabold truncate">Host a ride</h1>
            <div className="min-w-11 flex justify-end"></div>
          </div>
        </header>
      {loadingLandmarks ? (
        <p className="text-center mt-4">Loading landmarks...</p>
      ) : (
        <div className="p-6 max-w-md space-y-6 mx-auto">
          {landmarksError && (
            <p className="text-red-400 text-center mt-4">{landmarksError}</p>
          )}
          <Form {...form}>
            <form
              ref={formRef}
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6 max-w-auto p-0"
            >
              <style>
                {`
                  .no-scrollbar::-webkit-scrollbar {
                    display: none;
                  }
                  .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                  }
                `}
              </style>
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-card p-6 space-y-6">
                <div
                  className="flex justify-between items-center cursor-pointer"
                  onClick={() => handleSectionToggle(setIsRouteDetailsOpen, isRouteDetailsOpen)}
                >
                  <h2 className="text-lg font-semibold mb-4">Route Details</h2>
                  <span>{isRouteDetailsOpen ? '-' : '+'}</span>
                </div>
                {isRouteDetailsOpen && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex items-center justify-between mb-4"
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
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a landmark" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {landmarks.length > 0 ? (
                                landmarks.map((landmark) => (
                                  <SelectItem key={landmark.id_uuid} value={landmark.id_uuid}>
                                    {landmark.name}, {landmark.state}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="none" disabled>
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
                            onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                            value={field.value || 'none'}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a landmark" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {landmarks.map((landmark) => (
                                <SelectItem key={landmark.id_uuid} value={landmark.id_uuid}>
                                  {landmark.name}, {landmark.state}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Select an ending landmark if different from the starting landmark.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-card p-6 space-y-6">
                <div
                  className="flex justify-between items-center"
                  onClick={() => handleSectionToggle(setIsEventDetailsOpen, isEventDetailsOpen)}
                >
                  <h2 className="text-lg font-semibold mb-2">Event Details</h2>
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
                            <Input placeholder='Enter event name, e.g., "Sunday Social Ride"' {...field} />
                          </FormControl>
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
                            <Textarea
                              placeholder='Enter notes, e.g., "Bring water, helmets required"'
                              {...field}
                            />
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
                                    className={cn(
                                      'p-2 text-left font-normal',
                                      !field.value && 'text-muted-foreground'
                                    )}
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
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Enter time, e.g., '08:00 AM'"
                              />
                            </FormControl>
                            <FormDescription>Event start time (12-hour clock, e.g., 08:00 AM)</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="isEndTimeEnabled"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox
                              checked={isEndTimeEnabled}
                              onCheckedChange={(checked) => {
                                setIsEndTimeEnabled(!!checked);
                                field.onChange(checked);
                              }}
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-medium">Set End Time</FormLabel>
                        </FormItem>
                      )}
                    />
                    {isEndTimeEnabled && (
                      <FormField
                        control={form.control}
                        name="end_time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Time (Optional)</FormLabel>
                            <FormControl>
                              <TimeInput
                                value={field.value || ''}
                                onChange={field.onChange}
                                placeholder="Enter time, e.g., '10:00 AM'"
                              />
                            </FormControl>
                            <FormDescription>Optional end time (12-hour clock, e.g., 10:00 AM)</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
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
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-card p-6 space-y-6">
                <div
                  className="flex justify-between items-center"
                  onClick={() => handleSectionToggle(setIsPreferencesOpen, isPreferencesOpen)}
                >
                  <h2 className="text-lg font-semibold">Event Preferences</h2>
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
                              min="1"
                              max="100"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="is_free"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Checkbox 
                                checked={field.value} 
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-medium">Free Event</FormLabel>
                          </FormItem>
                        )}
                      />
                      {!form.watch('is_free') && (
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
                                  {...field}
                                  value={field.value || ''}
                                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
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
                              <Checkbox 
                                checked={field.value} 
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-medium">Bring your bike</FormLabel>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="is_rental_available"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Checkbox 
                                checked={field.value} 
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-medium">Rentals Available</FormLabel>
                          </FormItem>
                        )}
                      />
                      <FormMessage className="text-red-500" />
                    </div>
                  </>
                )}
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-card p-6 space-y-6">
                <div
                  className="flex justify-between items-center"
                  onClick={() => handleSectionToggle(setIsRegistrationOpen, isRegistrationOpen)}
                >
                  <h2 className="text-lg font-semibold">Registration Details</h2>
                  <span>{isRegistrationOpen ? '-' : '+'}</span>
                </div>
                {isRegistrationOpen && (
                  <>
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
                                  className={cn(
                                    'p-3 text-left font-normal',
                                    !field.value && 'text-muted-foreground'
                                  )}
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
                  </>
                )}
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-card p-6 space-y-6">
                <div
                  className="flex justify-between items-center"
                  onClick={() => handleSectionToggle(setIsHostDetailsOpen, isHostDetailsOpen)}
                >
                  <h2 className="text-lg font-semibold">Host Details</h2>
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
                            <Input placeholder="Enter your name" {...field} />
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
              <Button
                type="submit"
                className="w-full bg-sc-green hover:brightness-95 text-sc-green-ink font-bold rounded-full px-4 py-3 text-lg shadow-card transition-colors"
                disabled={isLoading || loadingLandmarks || !!landmarksError}
                ref={createButtonRef}
              >
                {isLoading ? 'Creating...' : 'Create Event'}
              </Button>
            </form>
          </Form>
        </div>
      )}
      <ErrorBoundary>
        <CyclingSuccessDialog
          open={successDialogIsOpen}
          onOpenChange={setIssuccessDialogIsOpen}
          formValues={{
            title: form.getValues('title') || 'Untitled Event',
            event_date: form.getValues('event_date'),
            start_time: form.getValues('start_time') || '',
            end_time: form.getValues('end_time') || null,
            host_name: form.getValues('host_name') || 'Unknown',
          }}
          selectedLandmark={
            landmarks.find((l) => l.id_uuid === form.getValues('start_landmark_id')) || {
              id_uuid: '',
              name: 'Unknown',
              state: '',
            }
          }
          supercode={supercode || ''}
          eventSlug={eventSlug || ''}
          onNavigate={() => handleNavigate(eventSlug)}
        />
      </ErrorBoundary>
      <CreateLandmarkDialog
        open={isCreateLandmarkOpen}
        onOpenChange={setIsCreateLandmarkOpen}
        onSave={handleCreateLandmark}
      />
      <Dialog open={successDialogIsOpen && !eventSlug} onOpenChange={(open) => !open && setIssuccessDialogIsOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Event Created</DialogTitle>
            <DialogDescription>
              Your event was created successfully, but we couldn't display the details. Navigate to your events to view it.
              <Button onClick={() => handleNavigate(null)} className="mt-4">
                Go to Events
              </Button>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
      <Navbar />
    </div>
  );
};

export default HostCycling;
