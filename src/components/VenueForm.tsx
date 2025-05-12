import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

// Nigerian states including FCT
const nigerianStates = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", 
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", 
  "FCT", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", 
  "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", 
  "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
];

// Form schema using zod
const formSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters" }),
  address: z.string().min(5, { message: "Address must be at least 5 characters" }),
  city: z.string().min(2, { message: "City must be at least 2 characters" }),
  state: z.enum(nigerianStates as [string, ...string[]], { message: "Please select a valid state" }),
  description: z.string().optional(),
  map_link: z.string().optional(),
  images: z
    .instanceof(FileList)
    .optional()
    .refine((files) => !files || files.length <= 5, { message: "Maximum 5 images allowed" })
    .refine(
      (files) =>
        !files ||
        Array.from(files).every(
          (file) =>
            file.type.startsWith("image/") &&
            file.size <= 5 * 1024 * 1024 // 5MB max per image
        ),
      { message: "Only images up to 5MB each are allowed" }
    ),
});

type FormValues = z.infer<typeof formSchema>;

interface VenueFormProps {
  onSuccess?: (venueId: string, venueSlug: string, venueName: string) => void;
  onCancel?: () => void;
}

const VenueForm = ({ onSuccess, onCancel }: VenueFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Initialize the form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      address: "",
      city: "",
      state: undefined,
      description: "",
      map_link: "",
      images: undefined,
    },
  });

  const onSubmit = async (data: FormValues) => {
    setLoading(true);

    try {
      // Handle image uploads
      let imageUrls: string[] = [];
      if (data.images && data.images.length > 0) {
        for (const file of Array.from(data.images)) {
          const fileName = `${Date.now()}-${file.name}`;
          const { error: uploadError, data: uploadData } = await supabase.storage
            .from("venue-images")
            .upload(fileName, file, {
              cacheControl: "3600",
              upsert: false,
            });

          if (uploadError) throw uploadError;

          // Get public URL
          const { data: publicUrlData } = supabase.storage
            .from("venue-images")
            .getPublicUrl(fileName);

          if (publicUrlData) {
            imageUrls.push(publicUrlData.publicUrl);
          }
        }
      }

      // Create the venue in the database
      const { data: venue, error } = await supabase
        .from("venues")
        .insert({
          name: data.name,
          address: data.address,
          city: data.city,
          state: data.state,
          description: data.description || null,
          map_link: data.map_link || null,
          image_urls: imageUrls.length > 0 ? imageUrls : null,
        })
        .select("id, slug, name")
        .single();

      if (error) throw error;

      // Success! Show toast
      toast({
        title: "Venue created!",
        description: "Your venue has been successfully added.",
      });

      // Call onSuccess if provided
      if (onSuccess && venue) {
        onSuccess(venue.id, venue.slug, venue.name);
      }
    } catch (error) {
      console.error("Error creating venue:", error);
      toast({
        title: "Error",
        description: "Failed to create venue. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background p-4 rounded-lg border">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-playarena-800">Create New Venue</h2>
        {onCancel && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-playarena-600 hover:text-playarena-700"
          >
            <X size={18} />
          </Button>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-playarena-700">Venue Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="E.g., National Stadium"
                    {...field}
                    className="focus-visible:ring-playarena-500"
                  />
                </FormControl>
                <FormMessage className="text-playarena-600" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-playarena-700">Address</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Full street address"
                    {...field}
                    className="focus-visible:ring-playarena-500"
                  />
                </FormControl>
                <FormMessage className="text-playarena-600" />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-playarena-700">City</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="E.g., Lagos"
                      {...field}
                      className="focus-visible:ring-playarena-500"
                    />
                  </FormControl>
                  <FormMessage className="text-playarena-600" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-playarena-700">State</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <SelectTrigger className="focus:ring-playarena-500">
                        <SelectValue placeholder="Select a state" />
                      </SelectTrigger>
                      <SelectContent>
                        {nigerianStates.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage className="text-playarena-600" />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-playarena-700">Description (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe the venue, facilities, etc."
                    {...field}
                    className="focus-visible:ring-playarena-500"
                  />
                </FormControl>
                <FormMessage className="text-playarena-600" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="map_link"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-playarena-700">Google Maps Link (Optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Paste Google Maps URL here"
                    {...field}
                    className="focus-visible:ring-playarena-500"
                  />
                </FormControl>
                <FormDescription className="text-playarena-500">
                  Add a Google Maps link to help players find the venue easily
                </FormDescription>
                <FormMessage className="text-playarena-600" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="images"
            render={({ field: { onChange, ref, ...field } }) => (
              <FormItem>
                <FormLabel className="text-playarena-700">Images (Optional, up to 5)</FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => onChange(e.target.files)}
                    className="focus-visible:ring-playarena-500"
                    {...field}
                  />
                </FormControl>
                <FormDescription className="text-playarena-500">
                  Upload up to 5 images (max 5MB each) to showcase the venue
                </FormDescription>
                <FormMessage className="text-playarena-600" />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full bg-playarena-600 hover:bg-playarena-700 text-white"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Venue"}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default VenueForm;
