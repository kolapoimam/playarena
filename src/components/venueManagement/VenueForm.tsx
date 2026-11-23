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
import { Trash2, Store, Phone, Sparkles, ImagePlus, LucideIcon } from "lucide-react";
import { Bubble, Cover, ScButton } from "@/components/sc/ui";
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

const SECTION_META: Record<string, { icon: LucideIcon; sport: "venue" | "guide" | "tennis"; sub: string }> = {
  "venue-details": { icon: Store, sport: "venue", sub: "Name and where to find it" },
  "contact-location": { icon: Phone, sport: "guide", sub: "How players reach you and what it costs" },
  "additional-info": { icon: Sparkles, sport: "tennis", sub: "Facilities, hours and a great photo" },
};

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, children, sectionId }) => {
  const meta = SECTION_META[sectionId];
  return (
    <section className="bg-white rounded-3xl p-[18px] w-full flex flex-col gap-4">
      <div className="flex items-center gap-3">
        {meta && <Bubble icon={meta.icon} sport={meta.sport} size={44} radius={14} />}
        <div className="flex flex-col">
          <h3 className="m-0 text-base font-extrabold text-sc-ink">{title}</h3>
          {meta && <span className="text-[13px] text-sc-ink3">{meta.sub}</span>}
        </div>
      </div>
      {children}
    </section>
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
    <div className="w-full max-w-3xl mx-auto">
      <div className="relative h-[150px] rounded-[28px] overflow-hidden mb-4">
        <Cover kind="venue" alt="" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
        <div className="absolute left-5 bottom-4 right-5 text-white flex flex-col">
          <span className="text-xs font-bold tracking-[0.12em] opacity-85">LIST A VENUE</span>
          <span className="text-[24px] leading-7 font-extrabold tracking-[-0.02em]">Put your pitch on the map</span>
        </div>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3.5">
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
                        <SelectTrigger>
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
                    <FormDescription>Use the rich text editor to describe the venue, facilities, etc.</FormDescription>
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
                      />
                    </FormControl>
                    <FormDescription>Specify the venue's operating hours</FormDescription>
                    <FormMessage className="text-red-500" />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel>Image (Optional)</FormLabel>
                <FormControl>
                  {selectedFile ? (
                    <div className="flex items-center gap-2 rounded-2xl bg-sc-bg px-4 py-3">
                      <ImagePlus size={18} className="text-sc-green-dark shrink-0" />
                      <p className="m-0 flex-1 text-sm font-semibold truncate">
                        {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)}MB)
                      </p>
                      <Button variant="ghost" size="icon" onClick={removeSelectedFile}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
<label className="flex flex-col items-center justify-center gap-2 h-[132px] rounded-3xl border-2 border-dashed border-sc-line bg-sc-bg text-center cursor-pointer active:scale-[0.99] transition-transform">
                      <span className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center text-sc-ink"><ImagePlus size={22} /></span>
                      <span className="text-sm font-bold text-sc-ink">Add a photo of the pitch</span>
                      <span className="text-xs text-sc-ink3">JPG or PNG, up to 5MB</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => handleFileChange(e.target.files)}
                        ref={fileInputRef}
                      />
                    </label>
                  )}
                </FormControl>
                <FormDescription>Upload 1 image (max 5MB) to showcase the venue</FormDescription>
                {fileError && <FormMessage className="text-red-500">{fileError}</FormMessage>}
              </FormItem>
            </div>
          </CollapsibleSection>

          <div className="flex flex-col gap-2.5 pt-1">
            <ScButton type="submit" kind="venue" icon={Store} disabled={loading}>{loading ? "Listing your venue..." : "List venue"}</ScButton>
            {onCancel && <ScButton kind="soft" onClick={onCancel}>Cancel</ScButton>}
          </div>
        </form>
      </Form>
    </div>
  );
};

export default VenueForm;
