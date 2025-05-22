import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus } from "lucide-react";
import VenueForm from "@/components/VenueForm";
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
  onVenuesFetched: (venues: Venue[]) => void;
};

const OrganiserVenue = ({ venueId, onVenueChange, isPreFilled, preSelectedVenueSlug, onVenueCreated, onPrefill, onVenuesFetched }: OrganiserVenueProps) => {
  const { toast } = useToast();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venuesLoading, setVenuesLoading] = useState(true);
  const [venueDialogOpen, setVenueDialogOpen] = useState(false);
  const selectedVenue = venues.find((venue) => venue.id === venueId);

  const fetchVenues = debounce(async () => {
    setVenuesLoading(true);
    try {
      // Check cache
      const cachedVenues = localStorage.getItem("venues");
      const cacheTime = localStorage.getItem("venues_cache_time");
      if (cachedVenues && cacheTime && Date.now() - parseInt(cacheTime) < 3600000) {
        try {
          const parsed = JSON.parse(cachedVenues);
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log("Using cached venues:", parsed.length);
            setVenues(parsed);
            onVenuesFetched(parsed);
            if (preSelectedVenueSlug && !isPreFilled) {
              const venue = parsed.find((v: Venue) => v.slug === preSelectedVenueSlug);
              if (venue) {
                onVenueChange(venue.id);
              } else {
                console.warn("Preselected venue not in cache:", preSelectedVenueSlug);
              }
            }
            return;
          }
        } catch (e) {
          console.error("Invalid cache data:", e);
          localStorage.removeItem("venues");
          localStorage.removeItem("venues_cache_time");
        }
      }

      // Fetch from Supabase
      const { data, error } = await supabase
        .from("venues")
        .select("id, slug, name, city, verified_status")
        .order("name")
        .limit(50);

      if (error) {
        console.error("Supabase venues query error:", error);
        throw new Error(`Failed to fetch venues: ${error.message}`);
      }

      const fetchedVenues = data || [];
      console.log("Fetched venues from Supabase:", fetchedVenues.length);
      setVenues(fetchedVenues);
      onVenuesFetched(fetchedVenues);
      localStorage.setItem("venues", JSON.stringify(fetchedVenues));
      localStorage.setItem("venues_cache_time", Date.now().toString());

      if (preSelectedVenueSlug && !isPreFilled) {
        const venue = fetchedVenues.find((v) => v.slug === preSelectedVenueSlug);
        if (venue) {
          onVenueChange(venue.id);
        } else {
          console.warn("Preselected venue not found:", preSelectedVenueSlug);
          toast({
            title: "Warning",
            description: "Preselected venue not found. Please select a venue.",
            variant: "destructive",
          });
        }
      }

      if (fetchedVenues.length === 0) {
        console.warn("No venues returned from Supabase");
        toast({
          title: "No Venues Available",
          description: "No venues found. Please add a new venue.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error fetching venues:", error);
      setVenues([]);
      onVenuesFetched([]);
      toast({
        title: "Error",
        description: error.message || "Failed to load venues. Please try again or add a new venue.",
        variant: "destructive",
      });
    } finally {
      setVenuesLoading(false);
    }
  }, 500);

  useEffect(() => {
    fetchVenues();
    return () => fetchVenues.cancel();
  }, [preSelectedVenueSlug, isPreFilled, onVenueChange, onVenuesFetched]);

  return (
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
              onSuccess={onVenueCreated} 
              onCancel={() => setVenueDialogOpen(false)} 
            />
          </DialogContent>
        </Dialog>
      </div>
      <div className="space-y-2">
        <Select onValueChange={onVenueChange} value={venueId} disabled={isPreFilled && !!selectedVenue}>
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
        {isPreFilled && selectedVenue && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Venue is prefilled from your booking. Contact support to change.
          </p>
        )}
        {!venuesLoading && venues.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No venues found. Please add a new venue using the button above.
          </p>
        )}
      </div>
      <FormMessage />
    </FormItem>
  );
};

export default OrganiserVenue;
