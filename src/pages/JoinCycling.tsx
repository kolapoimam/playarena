import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ArrowLeft, Calendar, Clock, MapPin, Users, DollarSign, Loader2 } from "lucide-react";
import { PaystackButton } from "react-paystack";
import CyclingSuccessDialog from "@/components/CyclingSuccessDialog";
import Navbar from "@/components/Navbar";

type Landmark = {
  name: string;
  state: string;
};

type Attendee = {
  id: string;
  attendee_name: string;
  attendee_phone: string;
  confirmation_code: string;
  payment_status: boolean;
  cycling_event_id: string;
};

type CyclingEvent = {
  id: string;
  slug: string;
  title: string;
  event_date: string;
  start_time: string;
  max_attendees: number;
  is_free: boolean;
  price?: number;
  host_name: string;
  host_phone: string;
  start_landmark: Landmark;
};

const formSchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(50, "Name cannot exceed 50 characters"),
  phone: z.string().regex(/^[0-9]{11}$/, "Phone number must be exactly 11 digits"),
});

type FormValues = z.infer<typeof formSchema>;

const JoinCycling = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [event, setEvent] = useState<CyclingEvent | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", phone: "" },
  });

  useEffect(() => {
    if (!slug) return;
    const fetchEvent = async () => {
      try {
        const { data, error } = await supabase
          .from("cycling_events")
          .select(`
            *,
            start_landmark:landmarks!start_landmark_id(name, state)
          `)
          .eq("slug", slug)
          .single();
        if (error) throw error;
        setEvent(data);

        const { data: attendeesData, error: attendeesError } = await supabase
          .from("cycling_attendees")
          .select("*")
          .eq("cycling_event_id", data.id);
        if (!attendeesError) setAttendees(attendeesData || []);

        setLoading(false);
      } catch (error: any) {
        console.error("Error fetching event:", error);
        toast({
          title: "Error",
          description: "Failed to load event.",
          variant: "destructive",
        });
        navigate("/cycling-activities");
      }
    };
    fetchEvent();
  }, [slug, navigate, toast]);

  const handlePaymentSuccess = async (reference: any) => {
    setJoining(true);
    try {
      const { data: confirmationCodeData, error: codeError } = await supabase.rpc(
        "generate_unique_code",
        { length: 6 }
      );
      if (codeError) throw codeError;

      const { error } = await supabase.from("cycling_attendees").insert({
        cycling_event_id: event!.id,
        attendee_name: form.getValues("name"),
        attendee_phone: form.getValues("phone"),
        confirmation_code: confirmationCodeData,
        payment_status: true,
      });

      if (error) throw error;

      setConfirmationCode(confirmationCodeData);
      setPaymentReference(reference.reference);
      setSuccessDialogOpen(true);
    } catch (error: any) {
      console.error("Error joining event:", error);
      toast({
        title: "Error",
        description: "Failed to join event.",
        variant: "destructive",
      });
    } finally {
      setJoining(false);
    }
  };

  const handlePaymentClose = () => {
    toast({
      title: "Payment Cancelled",
      description: "You cancelled the payment process.",
    });
  };

  const paystackConfig = {
    reference: `sportcliq_${Date.now()}_${Math.floor(Math.random() * 1000000)}`,
    email: `${form.getValues("phone")}@sportcliq.com`,
    amount: event?.price ? event.price * 100 : 50000, // Convert to kobo
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
    channels: ["card", "bank", "ussd", "mobile_money"],
    metadata: {
      event_id: event?.id,
      attendee_name: form.getValues("name"),
      attendee_phone: form.getValues("phone"),
    },
  };

  const onSubmit = async (data: FormValues) => {
    if (!event) return;

    if (attendees.length >= event.max_attendees) {
      toast({
        title: "Error",
        description: "Event is full.",
        variant: "destructive",
      });
      return;
    }

    if (event.is_free) {
      setJoining(true);
      try {
        const { data: confirmationCodeData, error: codeError } = await supabase.rpc(
          "generate_unique_code",
          { length: 6 }
        );
        if (codeError) throw codeError;

        const { error } = await supabase.from("cycling_attendees").insert({
          cycling_event_id: event.id,
          attendee_name: data.name,
          attendee_phone: data.phone,
          confirmation_code: confirmationCodeData,
          payment_status: true,
        });

        if (error) throw error;

        setConfirmationCode(confirmationCodeData);
        setSuccessDialogOpen(true);
      } catch (error: any) {
        console.error("Error joining event:", error);
        toast({
          title: "Error",
          description: "Failed to join event.",
          variant: "destructive",
        });
      } finally {
        setJoining(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="animate-spin h-8 w-8 text-green-500" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold mb-2">Event Not Found</h2>
          <p className="text-gray-500 dark:text-gray-400">
            The event doesn't exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <header className="p-4 bg-gradient-to-r from-green-500 to-green-700 text-white rounded-b-2xl shadow-lg">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-green-600"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <h1 className="text-xl font-bold">Join Cycling Event</h1>
          <div className="w-10"></div>
        </div>
      </header>
      <div className="p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-2">{event.title}</h2>
          <div className="text-gray-600 dark:text-gray-300 space-y-2">
            <div className="flex items-center gap-2">
              <Calendar size={16} />
              <span>
                {new Date(event.event_date).toLocaleDateString("en-NG", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} />
              <span>{event.start_time}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={16} />
              <span>
                {event.start_landmark.name}, {event.start_landmark.state}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users size={16} />
              <span>
                Spots: {event.max_attendees - attendees.length} /{" "}
                {event.max_attendees}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign size={16} />
              <span>
                {event.is_free ? "Free" : `Paid (₦${(event.price || 500) / 100})`}
              </span>
            </div>
          </div>
        </div>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      inputMode="numeric"
                      placeholder="Enter 11-digit phone number"
                      {...field}
                      onChange={(e) => {
                        const numericValue = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 11);
                        field.onChange(numericValue);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {event.is_free ? (
              <Button
                type="submit"
                className="w-full bg-green-500 hover:bg-green-600 text-white rounded-md"
                disabled={joining}
              >
                {joining ? "Joining..." : "Join Event"}
              </Button>
            ) : (
              <PaystackButton
                {...paystackConfig}
                text={joining ? "Processing..." : "Pay to Join Event"}
                onSuccess={handlePaymentSuccess}
                onClose={handlePaymentClose}
                disabled={
                  joining || !form.getValues("name") || !form.getValues("phone")
                }
                className="w-full bg-green-500 hover:bg-green-600 text-white rounded-md py-3 font-medium"
              />
            )}
          </form>
        </Form>
        <CyclingSuccessDialog
          open={successDialogOpen}
          onOpenChange={setSuccessDialogOpen}
          formValues={{
            title: event?.title || "",
            event_date: event ? new Date(event.event_date) : null,
            start_time: event?.start_time || "",
            host_name: event?.host_name || "",
          }}
          selectedLandmark={event?.start_landmark}
          confirmationCode={confirmationCode}
          eventSlug={slug ?? ""}
          onNavigate={() => navigate("/cycling-activities")}
        />
        <Navbar />
      </div>
    </div>
  );
};

export default JoinCycling;
