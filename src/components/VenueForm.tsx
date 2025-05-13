import { useState, useRef } from "react";
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
import { Trash2 } from "lucide-react";
import { RichTextEditor } from "@mantine/tiptap";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

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
  venue_phone: z.string()
    .regex(/^[0-9]+$/, { message: "Phone number must contain only numbers" })
    .length(11, { message: "Phone number must be exactly 11 digits" })
    .transform(val => val.slice(0, 11)),
  description: z.string().optional(),
  map_link: z.string().url({ message: "Please enter a valid URL" }).or(z.literal("")),
  facilities: z.string().optional(),
  opening_hours: z.string().optional(),
  pricing: z.string().optional(),
  booking_fee: z.number().optional().refine((val) => val === undefined || (Number.isFinite(val) && val >= 0), {
    message: "Booking fee must be a valid number (NGN per hour)",
  }),
});

// File schema for single image validation
const fileSchema = z
  .instanceof(File)
  .refine(
    (file) => file.type.startsWith("image/"),
    { message: "Only image files are allowed" }
  )
  .refine(
    (file) => file.size <= 5 * 1024 * 1024,
    { message: "Image must be less than 5MB" }
  );

type FormValues = z.infer<typeof formSchema>;

interface VenueFormProps {
  onSuccess?: (venueId: string, venueSlug: string, venueName: string) => void;
  onCancel?: () => void;
}

const VenueForm = ({ onSuccess, onCancel }: VenueFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      address: "",
      city: "",
      state: undefined,
      venue_phone: "",
      description: "",
      map_link: "",
      facilities: "",
      opening_hours: "",
      pricing: "",
      booking_fee: undefined,
    },
  });

  const handleFileChange = (files: FileList | null) => {
    setFileError(null);
    if (!files || files.length === 0) return;

    const file = files[0];
    const result = fileSchema.safeParse(file);
    
    if (!result.success) {
      setFileError(result.error.errors[0].message);
      return;
    }

    setSelectedFile(file);
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setFileError(null);

    try {
      let imageUrl: string | null = null;
      
      if (selectedFile) {
        const fileName = `${Date.now()}-${selectedFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("venue-images")
          .upload(fileName, selectedFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("venue-images")
          .getPublicUrl(fileName);

        if (publicUrlData) {
          imageUrl = publicUrlData.publicUrl;
        }
      }

      const { data: venue, error } = await supabase
        .from("venues")
        .insert({
          name: data.name,
          address: data.address,
          city: data.city,
          state: data.state,
          venue_phone: data.venue_phone,
          description: data.description || null,
          map_link: data.map_link || null,
          facilities: data.facilities || null,
          opening_hours: data.opening_hours || null,
          pricing: data.pricing || null,
          booking_fee: data.booking_fee || null,
          image_urls: imageUrl ? [imageUrl] : null,
        })
        .select("id, slug, name")
        .single();

      if (error) throw error;

      toast({
        title: "Venue created!",
        description: "Your venue has been successfully added.",
      });

      form.reset();
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

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

  // Initialize editor for facilities field
  const editor = useEditor({
    extensions: [StarterKit],
    content: form.watch("facilities") || "",
    onUpdate: ({ editor }) => form.setValue("facilities", editor.getHTML()),
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-6">Create New Venue</h2>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Venue Details Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Venue Details</h3>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Venue Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="E.g., National Stadium"
                      {...field}
                      className="border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    />
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Full street address"
                      {...field}
                      className="border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    />
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">City</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="E.g., Lagos"
                        {...field}
                        className="border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                      />
                    </FormControl>
                    <FormMessage className="text-red-500" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">State</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger className="border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white">
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
                    <FormMessage className="text-red-500" />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Contact & Location Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Contact & Location</h3>

            <FormField
              control={form.control}
              name="venue_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Venue Phone Number</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="Enter 11-digit phone number"
                      {...field}
                      value={field.value}
                      onChange={(e) => {
                        const numericValue = e.target.value.replace(/\D/g, '');
                        field.onChange(numericValue.slice(0, 11));
                      }}
                      className="border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    />
                  </FormControl>
                  <FormDescription className="text-sm text-gray-500 dark:text-gray-400">
                    Provide a WhatsApp-enabled phone number for booking inquiries (numbers only)
                  </FormDescription>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="map_link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Google Maps Link (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Paste Google Maps URL here"
                      {...field}
                      className="border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    />
                  </FormControl>
                  <FormDescription className="text-sm text-gray-500 dark:text-gray-400">
                    Add a Google Maps link to help players find the venue easily
                  </FormDescription>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="booking_fee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Booking Fee (NGN per hour, Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter fee per hour"
                      {...field}
                      value={field.value === undefined ? "" : field.value}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    />
                  </FormControl>
                  <FormDescription className="text-sm text-gray-500 dark:text-gray-400">
                    Enter the hourly booking fee in NGN (optional)
                  </FormDescription>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />
          </div>

          {/* Additional Info Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Additional Info</h3>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the venue, facilities, etc."
                      {...field}
                      className="border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    />
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="facilities"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Facilities (Optional)</FormLabel>
                  <FormControl>
                    <RichTextEditor editor={editor} />
                  </FormControl>
                  <FormDescription className="text-sm text-gray-500 dark:text-gray-400">
                    Add details about facilities (e.g., pitches, seating) using rich text
                  </FormDescription>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="opening_hours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Opening Hours (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="E.g., 8:00 AM - 6:00 PM"
                      {...field}
                      className="border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    />
                  </FormControl>
                  <FormDescription className="text-sm text-gray-500 dark:text-gray-400">
                    Specify the venue's operating hours
                  </FormDescription>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pricing"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Pricing (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="E.g., General admission: NGN 500"
                      {...field}
                      className="border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    />
                  </FormControl>
                  <FormDescription className="text-sm text-gray-500 dark:text-gray-400">
                    Describe pricing details (e.g., admission fees)
                  </FormDescription>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Image (Optional)</FormLabel>
              <div className="space-y-2">
                {selectedFile ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)}MB)
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeSelectedFile}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ) : (
                  <FormControl>
                    <Input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={(e) => handleFileChange(e.target.files)}
                      className="border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    />
                  </FormControl>
                )}
              </div>
              <FormDescription className="text-sm text-gray-500 dark:text-gray-400">
                Upload 1 image (max 5MB) to showcase the venue
              </FormDescription>
              {fileError && <p className="text-red-500 text-sm">{fileError}</p>}
            </FormItem>
          </div>

          <div className="flex gap-4">
            <Button
              type="submit"
              className="w-full bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-3 text-lg shadow-md transition-colors"
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Venue"}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg px-4 py-3 text-lg shadow-md transition-colors"
                onClick={onCancel}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
};

export default VenueForm;
