
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import OrganiserVenue from "@/components/OrganiserVenue";

const requiredFieldsSchema = z.object({
  player_name: z.boolean().default(false),
  player_phone: z.boolean().default(false),
});

const formSchema = z.object({
  title: z.string().min(2, {
    message: "Title must be at least 2 characters.",
  }),
  venueId: z.string().min(1, {
    message: "Please select a venue.",
  }),
  matchDate: z.string().min(1, {
    message: "Please select a match date.",
  }),
  matchTime: z.string().min(1, {
    message: "Please select a match time.",
  }),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  totalSlots: z.string().refine((val) => Number(val) > 0, {
    message: "Total slots must be greater than 0.",
  }),
  isPaid: z.boolean().default(false),
  price: z.string().optional(),
  notes: z.string().optional(),
  organizerName: z.string().optional(),
  organizerPhone: z.string().optional(),
  gender: z.string().optional(),
  skillLevel: z.string().optional(),
  matchType: z.string().optional(),
  sellTickets: z.boolean().default(false),
  ticketPrice: z.string().optional(),
  maxTickets: z.string().optional(),
  allowBulkTickets: z.boolean().default(false),
  isPrivate: z.boolean().default(false),
  accessPassword: z.string().optional(),
  disclosePhone: z.boolean().default(false),
  playerNumberRequired: z.boolean().default(false),
  requiredFields: requiredFieldsSchema.default({
    player_name: false,
    player_phone: false,
  }),
});

type MatchFormValues = z.infer<typeof formSchema>;

interface MatchFormProps {
  isPreFilled?: boolean;
  preSelectedVenueSlug?: string;
}

const MatchForm = ({ isPreFilled = false, preSelectedVenueSlug = "" }: MatchFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [venueId, setVenueId] = useState("");
  const [title, setTitle] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [matchTime, setMatchTime] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [totalSlots, setTotalSlots] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [organizerName, setOrganizerName] = useState("");
  const [organizerPhone, setOrganizerPhone] = useState("");
  const [gender, setGender] = useState("");
  const [skillLevel, setSkillLevel] = useState("");
  const [matchType, setMatchType] = useState("");
  const [sellTickets, setSellTickets] = useState(false);
  const [ticketPrice, setTicketPrice] = useState("");
  const [maxTickets, setMaxTickets] = useState("");
  const [allowBulkTickets, setAllowBulkTickets] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [accessPassword, setAccessPassword] = useState("");
  const [disclosePhone, setDisclosePhone] = useState(false);
  const [playerNumberRequired, setPlayerNumberRequired] = useState(false);
  const [requiredFields, setRequiredFields] = useState({
    player_name: false,
    player_phone: false,
  });
  const [isVenueCreateOpen, setIsVenueCreateOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<MatchFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      venueId: "",
      matchDate: "",
      matchTime: "",
      totalSlots: "",
      isPaid: false,
      sellTickets: false,
      allowBulkTickets: false,
      isPrivate: false,
      disclosePhone: false,
      playerNumberRequired: false,
      requiredFields: {
        player_name: false,
        player_phone: false,
      },
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !venueId || !matchDate || !matchTime || !totalSlots) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: slugData, error: slugError } = await supabase
        .rpc('generate_unique_slug', { 
          p_text_input: title,
          p_table_name: 'matches'
        });

      if (slugError) throw slugError;
      
      const slug = slugData;

      const { data, error } = await supabase
        .from("matches")
        .insert({
          title,
          slug,
          venue_id: venueId,
          match_date: matchDate,
          match_time: matchTime,
          start_time: startTime || null,
          end_time: endTime || null,
          total_slots: parseInt(totalSlots),
          is_paid: isPaid,
          price: isPaid ? parseFloat(price) : null,
          notes,
          organizer_name: organizerName,
          organizer_phone: organizerPhone,
          gender,
          skill_level: skillLevel,
          match_type: matchType,
          sell_tickets: sellTickets,
          ticket_price: sellTickets ? parseFloat(ticketPrice) : null,
          max_tickets: sellTickets ? parseInt(maxTickets) : null,
          allow_bulk_tickets: allowBulkTickets,
          access_password: isPrivate ? accessPassword : null,
          is_private: isPrivate,
          disclose_phone: disclosePhone,
          player_number_required: playerNumberRequired,
          required_fields: requiredFields,
          total_tickets_available: sellTickets ? parseInt(maxTickets) : 0,
        })
        .select("id, slug")
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Match created successfully!",
      });

      navigate(`/match/${data.slug}/team-management`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVenueCreated = (newVenueId: string) => {
    setVenueId(newVenueId);
    form.setValue("venueId", newVenueId);
  };

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-4">Create a Match</h1>
      <Form {...form}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Match Title"
                    {...field}
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      field.onChange(e);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <OrganiserVenue
            venueId={venueId}
            onVenueChange={setVenueId}
            isPreFilled={isPreFilled}
            preSelectedVenueSlug={preSelectedVenueSlug}
            onVenueCreated={handleVenueCreated}
          />

          <FormField
            control={form.control}
            name="matchDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Match Date</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    value={matchDate}
                    onChange={(e) => {
                      setMatchDate(e.target.value);
                      field.onChange(e);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="matchTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Match Time</FormLabel>
                <FormControl>
                  <Input
                    type="time"
                    {...field}
                    value={matchTime}
                    onChange={(e) => {
                      setMatchTime(e.target.value);
                      field.onChange(e);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Time (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="time"
                      {...field}
                      value={startTime}
                      onChange={(e) => {
                        setStartTime(e.target.value);
                        field.onChange(e);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Time (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="time"
                      {...field}
                      value={endTime}
                      onChange={(e) => {
                        setEndTime(e.target.value);
                        field.onChange(e);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="totalSlots"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Slots</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Total Slots"
                    {...field}
                    value={totalSlots}
                    onChange={(e) => {
                      setTotalSlots(e.target.value);
                      field.onChange(e);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isPaid"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel>Is Paid</FormLabel>
                  <FormDescription>
                    Do you want to charge for this match?
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={isPaid}
                    onCheckedChange={(checked) => {
                      setIsPaid(checked);
                      field.onChange(checked);
                    }}
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
                  <FormLabel>Price</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Price"
                      {...field}
                      value={price}
                      onChange={(e) => {
                        setPrice(e.target.value);
                        field.onChange(e);
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
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Notes"
                    {...field}
                    value={notes}
                    onChange={(e) => {
                      setNotes(e.target.value);
                      field.onChange(e);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="organizerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organizer Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Organizer Name"
                      {...field}
                      value={organizerName}
                      onChange={(e) => {
                        setOrganizerName(e.target.value);
                        field.onChange(e);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="organizerPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organizer Phone</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Organizer Phone"
                      {...field}
                      value={organizerPhone}
                      onChange={(e) => {
                        setOrganizerPhone(e.target.value);
                        field.onChange(e);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <Select
                    value={gender}
                    onValueChange={(value) => {
                      setGender(value);
                      field.onChange(value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer_not_to_say">
                        Prefer not to say
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="skillLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Skill Level</FormLabel>
                  <Select
                    value={skillLevel}
                    onValueChange={(value) => {
                      setSkillLevel(value);
                      field.onChange(value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select skill level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="matchType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Match Type</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Match Type"
                    {...field}
                    value={matchType}
                    onChange={(e) => {
                      setMatchType(e.target.value);
                      field.onChange(e);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sellTickets"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel>Sell Tickets</FormLabel>
                  <FormDescription>
                    Do you want to sell tickets for this match?
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={sellTickets}
                    onCheckedChange={(checked) => {
                      setSellTickets(checked);
                      field.onChange(checked);
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {sellTickets && (
            <>
              <FormField
                control={form.control}
                name="ticketPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ticket Price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Ticket Price"
                        {...field}
                        value={ticketPrice}
                        onChange={(e) => {
                          setTicketPrice(e.target.value);
                          field.onChange(e);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxTickets"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Tickets</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Max Tickets"
                        {...field}
                        value={maxTickets}
                        onChange={(e) => {
                          setMaxTickets(e.target.value);
                          field.onChange(e);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="allowBulkTickets"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Allow Bulk Tickets</FormLabel>
                      <FormDescription>
                        Allow users to purchase multiple tickets?
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={allowBulkTickets}
                        onCheckedChange={(checked) => {
                          setAllowBulkTickets(checked);
                          field.onChange(checked);
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </>
          )}

          <FormField
            control={form.control}
            name="isPrivate"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel>Private Match</FormLabel>
                  <FormDescription>
                    Require a password to join this match?
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={isPrivate}
                    onCheckedChange={(checked) => {
                      setIsPrivate(checked);
                      field.onChange(checked);
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {isPrivate && (
            <FormField
              control={form.control}
              name="accessPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Access Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Access Password"
                      {...field}
                      value={accessPassword}
                      onChange={(e) => {
                        setAccessPassword(e.target.value);
                        field.onChange(e);
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
            name="disclosePhone"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel>Disclose Phone</FormLabel>
                  <FormDescription>
                    Show your phone number to match participants?
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={disclosePhone}
                    onCheckedChange={(checked) => {
                      setDisclosePhone(checked);
                      field.onChange(checked);
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="playerNumberRequired"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel>Player Number Required</FormLabel>
                  <FormDescription>
                    Require players to provide their jersey number?
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={playerNumberRequired}
                    onCheckedChange={(checked) => {
                      setPlayerNumberRequired(checked);
                      field.onChange(checked);
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="space-y-4">
            <FormLabel>Required Fields</FormLabel>
            <FormField
              control={form.control}
              name="requiredFields.player_name"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={requiredFields.player_name}
                      onCheckedChange={(checked) => {
                        const newValue = checked === true;
                        setRequiredFields(prev => ({ ...prev, player_name: newValue }));
                        field.onChange(newValue);
                      }}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Player Name Required
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requiredFields.player_phone"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={requiredFields.player_phone}
                      onCheckedChange={(checked) => {
                        const newValue = checked === true;
                        setRequiredFields(prev => ({ ...prev, player_phone: newValue }));
                        field.onChange(newValue);
                      }}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Player Phone Required
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Creating..." : "Create Match"}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default MatchForm;
