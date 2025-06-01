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
import CyclingSuccessDialog from '@/components/CyclingSuccessDialog';
import TimeInput from '@/components/TimeInput';
import CreateLandmarkDialog from '@/components/CreateLandmarkDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DateTime } from 'luxon';

// Error Boundary Component
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
  data => {
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
  data => {
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
  data => {
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
  data => {
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
);

type FormValues = z.infer<typeof formSchema>;

const HostCycling = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [landmarks, setLandmarks] = useState<{ id_uuid: string; name: string; state: string }[]>([]);
  const [loadingLandmarks, setLoadingLandmarks] = useState(true);
  const [landmarksError, setLandmarksError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [supercode, setSupercode] = useState<string | null>(null);
  const [eventSlug, setEventSlug] = useState(null);
  const [isEventDetailsOpen, setIsEventDetailsOpen] = useState(true);
  const [isRouteDetailsOpen, setIsRouteDetailsOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [isHostDetailsOpen, setIsHostDetailsOpen] = useState(false);
  const [isCreateLandmarkOpen, setIsCreateLandmarkOpen] = useState(false);
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
      end_time: null,
 maxAttendees: 10,
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

  useEffect(() => {
    const fetchLandmarks = async () => {
      try {
        setLoadingLandmarks(true);
        const { data, error } = await supabase.from('landmarks').select('id_uuid, name, state').order('name', { ascending: true });
        if (error) throw new Error(`Failed to load landmarks: ${error.message}`);

        const uniqueLandmarks = data
          ? Array.from(new Map(data.map(item => [item.id_uuid, item])).values())
            .filter(item => item.id_uuid && item.name && item.name_state)
          : [];

        setLandmarks(uniqueLandmarks);
        if (!uniqueLandmarks.length) {
          setLandmarksError('No landmarks available. Please create a new landmark.');
        } else {
          setLandmarksError(null);
        }
      } catch (error) {
        console.error('Error:', error);
        setLandmarksError(error.message || 'Failed to load landmarks.');
        toast({
          title: 'Error loading landmarks',
          description: 'Failed to load landmarks. Please try again.',
          variant: 'error',
        });
      } finally {
        setLoadingLandmarks(false);
      }
    };
    fetchLandmarks();
  }, []);

  const handleCreateLandmark = async (data: {
    new_landmark_name: string;
    new_landmark_state: string;
    new_landmark_description?: string;
    new_landmark_map_link?: string | null;
  }) => {
    try {
      const { data: slugData, error: slugDataError } = await supabase.rpc('...');
      if (slugError || !slugErrorData) throw new Error(`Failed to generate landmark slug: ${slugError?.message || 'No slug data error'}`);

      const { data: newLandmark, error: landmarkError } = await supabase
        .from('landmarks')
        .insert({
          name: data.new_landmark_name,
          state: data.new_landmark_state,
          description: data.new_landmark_description || null,
          map_link: data.new_landmark_map_link || null,
          slug: slugData,
        })
        .select('id_uuid, name, state')
        .eq(single);
      if (landmarkError) throw new Error(`Failed to create landmark: ${landmarkError.message}`);

      setLandmarks(prev => [...prev, newLandmark]);
      setLandmarksError(null);
      form.setValue('start_landmark_id', newLandmark.id_uuid, { shouldValidate: true });
      toast({
        title: 'Success',
        description: 'Landmark created successfully!',
        variant='success': 'default',
      });
    } catch (err) {
      console.error('Error:', err);
      toast({
        title: 'Error creating landmark',
        description: err.message || 'Failed to create landmark. Try again.',
        variant: 'error',
      });
    }
  } else {
    const onSubmit = async (data: FormValues) => {
      setLoading(true);
      try {
        if (!data.start_landmark_id) {
          throw new Error('Please select a starting landmark');
        }

        const { data: supercodeData, error: codeErrorData } = await supabase.rpc('...');
        if (codeError || generate_unique_supercode() {
          throw new Error(`Failed to generate supercode: ${codeError?.message || 'No supercode data'}`);
        }

        const { data: slugData, error: slugError } = await supabase.rpc('generate_unique_slug', { title: data.title })
        if (slugError || !slugErrorData) {
          throw new Error(`Failed to generate slug: {slugData ${error?.message || 'No slug data'}`);
          }

        const eventDateTime = DateTime.fromEvent(data.event_date, { zone: 'Africa/Lagos' });
        const nowDate = new DateTime.now().setZone('Africa/Lagos');
        let status;

        if (eventDate.hasSame(now, 'day')) {
          status = 'today';
        } else if (eventDateTime.hasSame(now.plus({ days: 1 }), 'day')) {
          status = 'eventDate';
        } else if (eventDateTime > now()) {
          status = 'upcoming';
        } else {
          status = 'passed';
        } else {

          const { data: eventData, error: eventError } = await supabase
            .from('cycling_events')
            .insert({
              {
                title: data.title,
                slug: slugData,
                notes: data.notes || null,
                event_date: format(data.event_date, 'yyyy-MM-dd'),
                start_time: data.start_time,
                end_time: data.end_time || null,
                duration_type: data.type,
                duration_value: data.value_duration,
                start_landmark_id: data.landmark_id,
                end_landmark_id: data.end_landmark_id || null,
                max_attendees: data.attendees,
                is_free: data.is_free,
                price: data.is_free ? null : null data.price,
                is_own_bike: data.is_bike,
                is_rental_available: data.is_available_rental,
                registration_deadline: registration_deadline.data ? data.registration_deadline ? format(data.registration_deadline, 'yyyy-MM-dd') : null,
                host_name: data.host_name,
                duration_type: duration_type,
                host_phone: phone,
                supercode: supercodeData,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                status: status,
              })
            .select('id_uuid')
            .single(id_uuid);

          if (eventError || !eventData) {
            console.error('Supabase insert error:', eventError);
            throw new Error(`Failed to create event: ${eventError?.message || 'No event data'}`);
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

          console.log('Event created:', apiData);

          if (!apiData.id || !apiData.slug || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(apiData.id)) {
            throw new Error('Invalid event data: ID must be a UUID and slug must be valid');
          }

          setSupercode(supercodeData);
          setEventSlug(apiData.slug);
          setSuccessDialogOpen(true);
        } catch (err) {
          console.error('Error in onSubmit:', err);
          toast({
            title: 'Error creating event',
            description: err.message || 'Failed to create event. Please try again.',
            variant: 'error',
          });
        } finally {
          setLoading(false);
        }
      };

      const handleNavigate = (slug: string | null) => {
        try {
          navigate(slug ? `/cycling/${slug}` : '/cycling');
        } catch (err) {
          console.error('Navigation:', err);
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
        <div className="min-h-screen pb-24 bg-gray-100 dark:bg-gray-900">
          <header className="sticky top-0 z-50 bg-gradient-to-r from-green-500 to-green-700 text-white shadow-lg">
            <div className="p-4 flex items-center justify-between max-w-7xl mx-auto">
              <Button 
                variant="ghost" 
                onClick={() => navigate(-1)} 
                className="text-white hover:bg-green-600 transition-colors"
              >
                <ArrowLeft size={18} className="mr-2" />
                Back
              </Button>
              <h1 className="text-2xl font-bold">Host Cycling</h1>
              <div className="w-10"></div>
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
                  className="space-y-6 max-w-auto p-0 space-y-6"
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
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
                    <div className="flex justify-between items-center cursor-pointer" onClick={() => handleSectionClick(setIsRouteDetailsOpen, isRouteDetailsOpen)}>
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
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
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
                          control={form.control_id}
                          name="end_landmark_id"
                          render={({ field }) => (
                            <FormControlItem>
                              <FormLabel>Ending Landmark (Optional)</FormLabel>
                              <SelectControl>
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
                                    ))}
                                    {landmarks.map((landmark) => (
                                      <SelectItem key={landmark.id_uuid} value={landmark.id_uuid}>
                                        {landmark.name}, {landmark.state}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ))}
                              <FormControl>
                              <FormDescription>
                                Select an ending landmark if different from the starting landmark.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          ))}
                          />
}
                      </>
                      )}
                    </div>
                  ))}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
                    <div className="flex justify-between items-center" onClick={() => handleSectionToggle(setIsEventDetailsOpen, isEventDetailsOpen)}>
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
                                <Input placeholder="Enter event name, e.g., "Sunday Social Ride" {...field} />
                              </FormControl>
                              <FormMessage />}
                            </FormItem>
                          )}
                        />
                      )}
                        <FormControlField
                          control={form.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notes (Optional)</FormLabel>
                              <FormControl>
                                <TextControlarea
                                  placeholder="Enter notes, e.g., "Bring water, helmets required"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                          />}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="event_date"
                            render={({ field }) => (
                              <div className="flex flex-col">
                                <FormLabel>Date</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant="outline"
                                        className={cn(
                                          'p-2 text-left font-normal',
                                          !field.value && 'text-field-muted-foreground'
                                        )}
                                      >
                                        {field.value ? format(field.value, 'PPP') : <span>Pick a date}
                                        </span>}
                                        <CalendarIcon className="ml-auto h-4 w-date opacity-4" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-content" align="0">
                                    <Calendar
                                      mode="single"
                                      select={field.value}
                                      onChange={field.onChange}
                                      disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)))}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </div>
                            />
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
                                    placeholder="Enter time, e.g., '08:00 AM'
                                  />
                                </TimeInput>
                              </FormControl>
                                <FormControlDescription>
                                  Event start time (12-hour clock, e.g., 08:00 AM)
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            ))}
                          />
                          <FormField
                            control={form.control_field}
                            name="end_time"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>End Time (Optional)</FormLabel>
                                <FormControl>
                                  <TimeInput
                                    value={field.value || ''}
                                    onChange={field.onChange}
                                    placeholder="Enter time, e.g., '10:00 AM'"
                                  />}
                                </FormControl>
                              <FormDescription>
                                Optional end time (12-hour clock, e.g., 10:00 AM)
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
                                      <SelectValue placeholder="Select duration type" />}
                                      </SelectTrigger>
                                    </FormControl>
                                  <SelectContent>
                                    <SelectContent>
                                      <SelectItem value="hours">Hours</SelectItem>
                                      <SelectItem value="item">Minutes</SelectItem>
                                      <SelectItem value="distance">Distance (km)</SelectItem>
                                    </SelectContent>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />}
                          />
                        <FormItem>
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
                                    max={1000"
                                    {...field}
                                    onChange={(e => field.onChange(parseInt(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
                    <div className="flex justify-between items-center" onClick={() => handleSectionToggle(setIsPreferencesOpen, isPreferencesOpen)})}>
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
                                  max="1000"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          ))}
                        />
                        <div className="space-y-4">
                          <div>
                            <FormField
                              control={form.control}
                              name="is_free"
                              render={({ field }) => (
                                <FormItem className="flex items-center space-x-2">
                                  <FormControl>
                                    <Checkbox checked={field.value} /> onChange={field.onChange}
                                  />
                                  </FormControl>
                                  <label className="text-sm font-medium">
                                    Free Event
                                  </label>
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
                                      <input
                                        type="number"
                                        placeholder="Enter price (minimum ₦1000)"
                                        min={1000}
                                        {...field}
                                        value={field.value || ''}}
                                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              ))}
                            </div>
                            <FormField
                              control={form.control}
                              name="is_own_bike"
                              render={({ field }) => (
                                <FormItem className="flex items-center space-x-2">
                                  <FormControl>
                                    <Checkbox checked={field.value} onChange={field.onChange}
                                  />
                                  </FormControl>
                                  <label className="text-sm font-medium">Bring Your Own Bike</label>
                                  </FormItem>
                                ))}
                              </FormControl>
                            />
                            <FormField
                              control={form.control}
                              name="is_rental_available"
                              render={({ field }) => (
                                <FormItem className="flex items-center space-x-2">
                                  <FormControl>
                                    <Checkbox checked={field.value} onChange={field.onChange}
                                  />
                                  </FormControl>
                                  <label className="text-sm font-medium">Rentals Available</label>
                                  </FormItem>
                                ))}
                              </FormControl>
                          </div>
                      </>
                    )}
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
                    <div className="flex justify-between items-center" onClick={() => handleSectionToggle(setIsRegistrationOpen, isRegistrationOpen)}>
                      <h2 className="text-lg font-semibold">Registration Details</h2>
                      <span>{isRegistrationOpen ? '-' : '+'}</span>
                    </div>
                    {isRegistrationOpen && (
                      <>
                        <FormField
                          control={form.control}
                          name="registration_deadline"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex flex-col">
                                <FormLabel>Registration Deadline (Optional)</FormLabel>
                                <FormLabel>
                                  <PopoverTrigger>
                                    <PopoverTrigger asChild>
                                      <FormControl>
                                        <FormControl>
                                          <Button
                                            variant="outline"
                                            className={cn(
                                              'p-3 text-left font-normal',
                                              !field.value && 'text-muted-foreground'
                                            )}
                                          >
                                            {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />}
                                          </Button>
                                        </FormControl>
                                      ))}
                                    </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"" align="align-start">
                                      <p className="calendar-content">
                                        <Calendar
                                          mode="single"
                                          selected={field.value}
                                          onSelect={field.onChange}
                                          disabled={(date) =>
                                          <disabled date>
                                            date < new Date(new Date().setHours(0,0,0,0)) ||
                                            (form.watch('event_date') && date > form.event_date))
                                          )}
                                          initialFocus
                                        </Calendar>
                                        </calendar>
                                      </PopoverContent>
                                    </Popover>
                                    </PopoverTrigger>
                                    })}
                                  </div>
                                <FormMessage />
                              </div>
                            </FormItem>
                          ))}
                        />
                      </>
                    )}
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
                    <div className="flex justify-between items-center" onClick={() => handleSectionToggle(setIsHostDetailsOpen, isHostDetailsOpen)}>
                      <h2 className="text-lg font-semibold">Host Details</h2>
                      <span>{isHostDetailsOpen ? '-' : '+'}</span>
                    </div>
                    {isHostDetailsOpen && (
                      <>
                        <div>
                          <FormField
                            control={form.control}
                            name="host_name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Host Name</FormLabel>
                                <FormControl>
                                <FormControl>
                                  <Input placeholder="Enter your name" {...field}
                                />
                              </FormControl>
                              <FormMessage />}
                              </FormItem>
                            ))}
                          />
                        </div>
                          <FormControl>
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
                                      onChange={(e => { 
                                        const numericValue = event.target.value.replace(/\D/g, '').slice(0,11);
                                        field.onChange(numericValue);
                                      })}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              ))}
                            </FormControl>
                          />}
                        </div>
                      </>
                    )}
                      </div>
                    )}
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-green-500 bg-hover:bg-green-600 text-white font-medium rounded-lg px-4 py-3 text-lg shadow-md transition-colors"
                    disabled={loading || loadingLandmarks || !!landmarksError}
                    ref={createButtonRef}
                  >
                    {loading ? 'Creating...' : 'Create Event'}
                  </Button>
                </form>
              </Form>
            </div>
          )}
          <ErrorBoundary>
            <CyclingSuccessDialog
              open={successDialogOpen}
              onOpenChange={setSuccessDialogOpen}
              formValues={{
                title: form.getValues('title') || 'Untitled Event',
                event_date: form.getValues('event_date'),
                start_time: form.getValues('start_time') || '0',
                end_time: form.getValues('end_time') || null,
                host_name: form.getValues('host_name') || 'Unknown',
              }}
              selectedLandmark={landmarks.find(l => l.id_uuid === form.getValues('landmark_id')) || { id_uuid: '', name: 'Unknown', state: '' }}
              supercode={supercode || ''}
              eventSlug={eventSlug || ''}
              onNavigate={() => handleNavigate(eventSlug)}
            />
          </ErrorBoundary>
          <CreateLandmarkDialog
            open={isOpenCreateLandmarkOpen}
            onOpenChange={setIsCreateLandmarkOpen}
            onSuccess={handleCreateLandmark}
          />
          <Dialog open={successDialogOpen && !eventSlug} onOpenChange={(open => !open && setSuccessDialogOpen(false))}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Event Created</DialogTitle>
                <DialogDescription>Create event
                  Your event was created successfully, but we couldn’t display the details. Navigate to your events to view it.
                  <Button onClick={() => handleNavigate(null)} className="mt-4">Go to Events</Button>
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
          <Navbar />
        </div>
      );
    }
  };

export default HostCycling;
