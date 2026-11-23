import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus } from "lucide-react";
import VenueForm from "@/components/venueManagement/VenueForm";

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
};

const OrganiserVenue = ({ venueId, onVenueChange, isPreFilled, preSelectedVenueSlug, onVenueCreated }: OrganiserVenueProps) => {
  const { toast } = useToast();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venuesLoading, setVenuesLoading] = useState(true);
  const [venueDialogOpen, setVenueDialogOpen] = useState(false);

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const { data, error } = await supabase
          .from("venues")
          .select("id, slug, name, city, verified_status")
          .order("name");

        if (error) throw error;
        setVenues(data || []);

        if (preSelectedVenueSlug && !isPreFilled) {
          const venue = data?.find(v => v.slug === preSelectedVenueSlug);
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
    };

    fetchVenues();
  }, [toast, preSelectedVenueSlug, isPreFilled, onVenueChange]);

  return (
    <FormItem>
      <div className="flex justify-between items-center">
        <FormLabel className="text-sm font-medium text-sc-ink2 dark:text-gray-300">Venue</FormLabel>
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
      <Select onValueChange={onVenueChange} value={venueId} disabled={isPreFilled}>
        <FormControl>
          <SelectTrigger className="w-full text-base border-sc-line dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white">
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
  );
};

export default OrganiserVenue;
