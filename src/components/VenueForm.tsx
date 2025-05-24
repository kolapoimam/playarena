import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

// Nigerian states including FCT
const nigerianStates = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River",
  "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano",
  "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun",
  "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
];

// Form schema using zod
const formSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters" }),
  address: z.string().min(5, { message: "Address must be at least 5 characters" }),
  city: z.string().min(2, { message: "City must be at least 2 characters" }),
  state: z.enum(nigerianStates as [string, ...string[]], { message: "Please select a valid state" }),
  venue_phone: z
    .string()
    .regex(/^[0-9]+$/, { message: "Phone number must contain only numbers" })
    .length(11, { message: "Phone number must be exactly 11 digits" })
    .transform((val) => val.slice(0, 11)),
  description: z.string().optional(),
  map_link: z.string().url({ message: "Please enter a valid URL" }).or(z.literal("")),
  opening_hours: z.string().optional(),
  booking_fee: z
    .number()
    .optional()
    .refine((val) => val === undefined || (Number.isFinite(val) && val >= 0), {
      message: "Booking fee must be a valid number (NGN per hour)",
    }),
  facilities: z.string().optional(),
});

// File schema for single image validation
const fileSchema = z
  .instanceof(File)
  .refine((file) => file.type.startsWith("image/"), { message: "Only image files are allowed" })
  .refine((file) => file.size <= 5 * 1024 * 1024, { message: "Image must be less than 5MB" });

type FormValues = z.infer<typeof formSchema>;

interface VenueFormProps {
  onSuccess?: (venueId: string, venueSlug: string, venueName: string) => void;
  onCancel?: () => void;
}

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  isOpen: boolean;
  setOpenSection: (section: string) => void;
  sectionId: string;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, children, defaultOpen = false, isOpen, setOpenSection, sectionId }) => {
  const handleToggle = () => {
    setOpenSection(isOpen ? "" : sectionId);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 w-full">
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={handleToggle}
      >
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{title}</h2>
        <span className="text-gray-800 dark:text-gray-200">{isOpen ? "-" : "+"}</span>
      </div>
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? "max-h-screen py-2" : "max-h-0"
        }`}
      >
        {children}
      </div>
    </div>
  );
};

const VenueForm: React.FC<VenueFormProps> = ({ onSuccess, onCancel }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [openSection, setOpenSection] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues: {
      name: "",
      address: "",
      city: "",
      state: undefined,
      venue_phone: "",
      description: "",
      map_link: "",
      opening_hours: "",
      booking_fee: undefined,
      facilities: "",
    },
  });

  // Quill toolbar configuration
  const quillModules = {
    toolbar: [
      [{ header: [1, 2, false] }],
      ["bold", "italic", "underline"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["clean"],
    ],
  };

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

        if (uploadError) throw new Error(uploadError.message || "Failed to upload image.");

        const { data: publicUrlData } = supabase.storage.from("venue-images").getPublicUrl(fileName);

        if (publicUrlData) {
          imageUrl = publicUrlData.publicUrl;
        } else {
          throw new Error("Failed to retrieve image URL.");
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
          opening_hours: data.opening_hours || null,
          booking_fee: data.booking_fee || null,
          image_urls: imageUrl ? [imageUrl] : null,
          facilities: data.facilities || null,
        })
        .select("id, slug, name")
        .single();

      if (error) throw new Error(error.message || "Failed to create venue.");

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
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
      console.error("Error creating venue:", errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-6">New Venue</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Venue Details Section */}
          <CollapsibleSection
            title="Venue Details"
            defaultOpen={false}
            isOpen={openSection === "venue-details"}
            setOpenSection={setOpenSection}
            sectionId="venue-details"
          >
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Venue Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="w-full border-gray-300 dark:border-gray-600 focus:ring-0 focus:shadow-md dark:bg-gray-700 dark:text-white rounded-md"
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
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="w-full border-gray-300 dark:border-gray-600 focus:ring-0 focus:shadow-md dark:bg-gray-700 dark:text-white rounded-md"
                      />
                    </FormControl>
                    <FormMessage className="text-red-500" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="w-full border-gray-300 dark:border-gray-600 focus:ring-0 focus:shadow-md dark:bg-gray-700 dark:text-white rounded-md"
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
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger className="w-full border-gray-300 dark:border-gray-600 focus:ring-0 focus:shadow-md dark:bg-gray-700 dark:text-white rounded-md">
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
          </CollapsibleSection>

          {/* Contact & Location Section */}
          <CollapsibleSection
            title="Contact & Location"
            defaultOpen={false}
            isOpen={openSection === "contact-location"}
            setOpenSection={setOpenSection}
            sectionId="contact-location"
          >
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="venue_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Venue Phone Number</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          const numericValue = e.target.value.replace(/\D/g, "");
                          field.onChange(numericValue.slice(0, 11));
                        }}
                        className="w-full border-gray-300 dark:border-gray-600 focus:ring-0 focus:shadow-md dark:bg-gray-700 dark:text-white rounded-md"
                      />
                    </FormControl>
                    <FormDescription>Provide a valid phone number of the Venue owner or Manager (numbers only)</FormDescription>
                    <FormMessage className="text-red-500" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="map_link"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Google Maps Link (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="w-full border-gray-300 dark:border-gray-600 focus:ring-0 focus:shadow-md dark:bg-gray-700 dark:text-white rounded-md"
                      />
                    </FormControl>
                    <FormDescription>Add a Google Maps link to help players find the venue easily</FormDescription>
                    <FormMessage className="text-red-500" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="booking_fee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Booking Fee (NGN per hour, Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        className="w-full border-gray-300 dark:border-gray-600 focus:ring-0 focus:shadow-md dark:bg-gray-700 dark:text-white rounded-md"
                      />
                    </FormControl>
                    <FormDescription>Enter the hourly booking fee in NGN (numbers only)</FormDescription>
                    <FormMessage className="text-red-500" />
                  </FormItem>
                )}
              />
            </div>
          </CollapsibleSection>

          {/* Additional Info Section */}
          <CollapsibleSection
            title="Additional Info"
            defaultOpen={false}
            isOpen={openSection === "additional-info"}
            setOpenSection={setOpenSection}
            sectionId="additional-info"
          >
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <ReactQuill
                        value={field.value}
                        onChange={(content) => field.onChange(content === "<p><br></p>" ? "" : content)}
                        modules={quillModules}
                        className="w-full min-h-[200px] border-2 border-gray-400 dark:border-gray-500 bg-white dark:bg-gray-700 dark:text-white rounded-md p-2"
                      />
                    </FormControl>
                    <FormDescription>Describe the venue in more details.</FormDescription>
                    <FormMessage className="text-red-500" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="facilities"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facilities (Optional)</FormLabel>
                    <FormControl>
                      <ReactQuill
                        value={field.value}
                        onChange={(content) => field.onChange(content === "<p><br></p>" ? "" : content)}
                        modules={quillModules}
                        className="w-full min-h-[200px] border-2 border-gray-400 dark:border-gray-500 bg-white dark:bg-gray-700 dark:text-white rounded-md p-2"
                      />
                    </FormControl>
                    <FormDescription>Describe the facilities available at the venue (e.g., changing rooms, parking)</FormDescription>
                    <FormMessage className="text-red-500" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="opening_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opening Hours (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="w-full border-gray-300 dark:border-gray-600 focus:ring-0 focus:shadow-md dark:bg-gray-700 dark:text-white rounded-md"
                      />
                    </FormControl>
                    <FormDescription>Specify the venue's operating hours</FormDescription>
                    <FormMessage className="text-red-500" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="image"
                render={() => (
                  <FormItem>
                    <FormLabel>Image (Optional)</FormLabel>
                    <FormControl>
                      {selectedFile ? (
                        <div className="flex items-center space-x-2">
                          <p>
                            {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)}MB)
                          </p>
                          <Button variant="ghost" size="icon" onClick={removeSelectedFile}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e.target.files)}
                          ref={fileInputRef}
                          className="w-full border-gray-300 dark:border-gray-600 focus:ring-0 focus:shadow-md dark:bg-gray-700 dark:text-white rounded-md"
                        />
                      )}
                    </FormControl>
                    <FormDescription>Upload 1 image (max 5MB) to showcase the venue</FormDescription>
                    {fileError && <FormMessage className="text-red-500">{fileError}</FormMessage>}
                  </FormItem>
                )}
              />
            </div>
          </CollapsibleSection>

          <div className="flex flex-col items-center gap-4">
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-3 text-lg shadow-md transition-colors"
            >
              {loading ? "Creating..." : "Create Venue"}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg px-4 py-3 text-lg shadow-md transition-colors"
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
