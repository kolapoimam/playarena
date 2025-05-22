import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus } from "lucide-react";
import VenueForm from "@/components/VenueForm";
import { parse, isValid } from "date-fns";
import { debounce } from "lodash";

type Venue = {
  id: string;
  slug: string;
  name: string;
  city: string;
  verified_status: 'True' | 'False';
};

type OrganiserVenueProps = {
  venueId: string | undefined;
  onVenueChange: (value: string) => void;
  isPreFilled: boolean;
  preSelectedVenueSlug: string | null;
  onVenueCreated: (venueId: string, venueSlug: string, venueName: string) => void;
  onPrefill: (values: { match_date: Date; start_time: string; end_time: string }) => void;
};

const convertTo12Hour = (time24: string): string => {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
};

const OrganiserVenue = ({ venueId, onVenueChange, isPreFilled, preSelectedVenueSlug, onVenueCreated, onPrefill }: OrganiserVenueProps) => {
  const { toast } = useToast();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [filteredVenues, setFilteredVenues] = useState<Venue[]>([]);
  const [venuesLoading, setVenuesLoading] = useState(true);
  const [venueDialogOpen, setVenueDialogOpen] = useState(false);
  const [bookingCode, setBookingCode] = useState("");
  const [bookingCodeError, setBookingCodeError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const selectedVenue = venues.find((venue) => venue.id === venueId);

  const fetchVenues = debounce(async () => {
    const cachedVenues = localStorage.getItem("venues");
    const cacheTime = localStorage.getItem("venues_cache_time");
    if (cachedVenues && cacheTime && Date.now() - parseInt(cacheTime) < 3600000) {
      const parsed = JSON.parse(cachedVenues);
      setVenues(parsed);
      setFilteredVenues(parsed);
      setVenuesLoading(false);

      if (preSelectedVenueSlug && !isPreFilled) {
        const venue = parsed.find((v: Venue) => v.slug === preSelectedVenueSlug);
        if (venue) {
          onVenueChange(venue.id);
        }
      }
      return;
    }

    try {
      const { data, error } = await supabase
        .from("venues")
        .select("id, slug, name, city, verified_status")
        .order("name")
        .limit(50);

      if (error) throw error;
      setVenues(data || []);
      setFilteredVenues(data || []);
      localStorage.setItem("venues", JSON.stringify(data || []));
      localStorage.setItem("venues_cache_time", Date.now().toString());

      if (preSelectedVenueSlug && !isPreFilled) {
        const venue = data?.find((v) => v.slug === preSelectedVenueSlug);
        if (venue) {
          onVenueChange(venue.id);
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
  }, 500);

  useEffect(() => {
    fetchVenues();
    return () => fetchVenues.cancel();
  }, [preSelectedVenueSlug, isPreFilled, onVenueChange]);

  useEffect(() => {
    const filtered = venues.filter((venue) =>
      `${venue.name} ${venue.city}`.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredVenues(filtered);
  }, [searchQuery, venues]);

  const handleBookingCodeChange = async (code: string) => {
    setBookingCode(code);
    setBookingCodeError(null);

    if (!code || !selectedVenue) return;

    try {
      const normalizedCode = code.toUpperCase();
      const { data: accessCodeData, error: accessCodeError } = await supabase
        .from("booking_access_codes")
        .select("match_date, start_time, end_time, access_code_status")
        .eq("code", normalizedCode)
        .eq("venue_id", selectedVenue.id)
        .single();

      if (accessCodeError || !accessCodeData) {
        console.error("Booking code fetch error:", accessCodeError);
        setBookingCodeError("Booking code not found");
        return;
      }

      if (accessCodeData.access_code_status !== "Pending") {
        console.error("Invalid booking code status:", accessCodeData.access_code_status);
        setBookingCodeError("Booking code is expired or already used");
        return;
      }

      const matchDate = parse(accessCodeData.match_date, "yyyy-MM-dd", new Date());
      if (!isValid(matchDate)) {
        console.error("Invalid match_date:", accessCodeData.match_date);
        setBookingCodeError("Invalid date in booking code");
        return;
      }

      const startTime = convertTo12Hour(accessCodeData.start_time);
      const endTime = convertTo12Hour(accessCodeData.end_time);

      onPrefill({
        match_date: matchDate,
        start_time: startTime,
        end_time: endTime,
      });

      toast({
        title: "Booking Code Valid",
        description: "Date and time have been pre-filled based on your booking code.",
      });
    } catch (error) {
      console.error("Error validating booking code:", error);
      setBookingCodeError("Failed to validate booking code. Please try again.");
    }
  };

  return (
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
                onSuccess={onVenueCreated} 
                onCancel={() => setVenueDialogOpen(false)} 
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
      <div className="space-y-2">
        <Input
          placeholder="Search venues by name or city"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="text-base border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
          disabled={isPreFilled}
        />
        <Select onValueChange={(value) => {
          onVenueChange(value);
          setBookingCode("");
          setBookingCodeError(null);
        }} value={venueId} disabled={isPreFilled}>
          <FormControl>
            <SelectTrigger className="w-full text-base border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white">
              <SelectValue placeholder="Select a venue" />
            </SelectTrigger>
          </FormControl>
          <SelectContent className="max-h-[300px] overflow-y-auto">
            {venuesLoading ? (
              <SelectItem value="loading" disabled>
                Loading venues...
              </SelectItem>
            ) : filteredVenues.length > 0 ? (
              filteredVenues.map((venue) => (
                <SelectItem key={venue.id} value={venue.id} className="text-base">
                  {venue.name}{venue.city ? `, ${venue.city}` : ''}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="none" disabled>
                No venues found
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
      {selectedVenue?.verified_status === "True" && !isPreFilled && (
        <div className="mt-4 space-y-2">
          <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Booking Access Code</FormLabel>
          <FormControl>
            <Input
              placeholder="Enter booking access code"
              value={bookingCode}
              onChange={(e) => handleBookingCodeChange(e.target.value)}
              className="text-base border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
            />
          </FormControl>
          {bookingCodeError && (
            <p className="text-sm text-red-500 mt-1">{bookingCodeError}</p>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Enter a valid access code to prefill data.
          </p>
        </div>
      )}
      <FormMessage />
    </FormItem>
  );
};

export default OrganiserVenue;
