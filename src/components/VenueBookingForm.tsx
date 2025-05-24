import { useState, useRef } from “react”; import { useForm } from “react-hook-form”; import { z } from “zod”; import { zodResolver } from “@hookform/resolvers/zod”; import { supabase } from “@/integrations/supabase/client”; import { useToast } from “@/hooks/use-toast”; import { Button } from “@/components/ui/button”; import { Input } from “@/components/ui/input”; import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, } from “@/components/ui/form”; import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from “@/components/ui/select”; import { ChevronDown, ChevronUp, Trash2 } from “lucide-react”; import ReactQuill from “react-quill”; import “react-quill/dist/quill.snow.css”;
// Nigerian states including FCT const nigerianStates = [ “Abia”, “Adamawa”, “Akwa Ibom”, “Anambra”, “Bauchi”, “Bayelsa”, “Benue”, “Borno”, “Cross River”, “Delta”, “Ebonyi”, “Edo”, “Ekiti”, “Enugu”, “FCT”, “Gombe”, “Imo”, “Jigawa”, “Kaduna”, “Kano”, “Katsina”, “Kebbi”, “Kogi”, “Kwara”, “Lagos”, “Nasarawa”, “Niger”, “Ogun”, “Ondo”, “Osun”, “Oyo”, “Plateau”, “Rivers”, “Sokoto”, “Taraba”, “Yobe”, “Zamfara” ];
// Form schema using zod const formSchema = z.object({ name: z.string().min(3, { message: “Name must be at least 3 characters” }), address: z.string().min(5, { message: “Address must be at least 5 characters” }), city: z.string().min(2, { message: “City must be at least 2 characters” }), state: z.enum(nigerianStates as [string, …string[]], { message: “Please select a valid state” }), venue_phone: z.string() .regex(/^[0-9]+$/, { message: “Phone number must contain only numbers” }) .length(11, { message: “Phone number must be exactly 11 digits” }) .transform(val => val.slice(0, 11)), description: z.string().optional(), map_link: z.string().url({ message: “Please enter a valid URL” }).or(z.literal(””)), opening_hours: z.string().optional(), booking_fee: z.number().optional().refine((val) => val === undefined || (Number.isFinite(val) && val >= 0), { message: “Booking fee must be a valid number (NGN per hour)”, }), });
// File schema for single image validation const fileSchema = z .instanceof(File) .refine( (file) => file.type.startsWith(“image/”), { message: “Only image files are allowed” } ) .refine( (file) => file.size <= 5 * 1024 * 1024, { message: “Image must be less than 5MB” } );
type FormValues = z.infer;
interface VenueFormProps { onSuccess?: (venueId: string, venueSlug: string, venueName: string) => void; onCancel?: () => void; }
interface CollapsibleSectionProps { title: string; children: React.ReactNode; defaultOpen?: boolean; }
const CollapsibleSection: React.FC = ({ title, children, defaultOpen = false }) => { const [isOpen, setIsOpen] = useState(defaultOpen);
return (
setIsOpen(!isOpen)} className=“flex justify-between items-center w-full py-3 text-xl font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500” > {title}
{isOpen ? : }
transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-screen py-4' : 'max-h-0 py-0'}} >
{children}
); };
const VenueForm = ({ onSuccess, onCancel }: VenueFormProps) => { const { toast } = useToast(); const [loading, setLoading] = useState(false); const [fileError, setFileError] = useState(null); const [selectedFile, setSelectedFile] = useState(null); const fileInputRef = useRef(null);
const form = useForm({ resolver: zodResolver(formSchema), defaultValues: { name: “”, address: “”, city: “”, state: undefined, venue_phone: “”, description: “”, map_link: “”, opening_hours: “”, booking_fee: undefined, }, });
// Quill toolbar configuration const quillModules = { toolbar: [ [{ ‘header’: [1, 2, false] }], [‘bold’, ‘italic’, ‘underline’], [{ ‘list’: ‘ordered’}, { ‘list’: ‘bullet’ }], [‘clean’] ], };
const handleFileChange = (files: FileList | null) => { setFileError(null); if (!files || files.length === 0) return;
const file = files[0];
const result = fileSchema.safeParse(file);

if (!result.success) {
  setFileError(result.error.errors[0].message);
  return;
}

setSelectedFile(file);

};
const removeSelectedFile = () => { setSelectedFile(null); if (fileInputRef.current) { fileInputRef.current.value = “”; } };
const onSubmit = async (data: FormValues) => { setLoading(true); setFileError(null);
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

    const { data: publicUrlData } = supabase.storage
      .from("venue-images")
      .getPublicUrl(fileName);

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
Create New Venue
{/* Venue Details Section */}
( Venue Name )} /> ( Address )} />
( City )} /> ( State {nigerianStates.map((state) => ( {state} ))} )} />
     {/* Contact & Location Section */}
      
       

          (
              
                Venue Phone Number
                
                  {
                      const numericValue = e.target.value.replace(/\D/g, '');
                      field.onChange(numericValue.slice(0, 11));
                    }}
                    className="w-full border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white rounded-md"
                  />
                
                
                  Provide a valid phone number of the Venue owner or Manager (numbers only)
                
                
              
            )}
          />
          (
              
                Google Maps Link (Optional)
                
                  
                
                
                  Add a Google Maps link to help players find the venue easily
                
                
              
            )}
          />
          (
              
                Booking Fee (NGN per hour, Optional)
                
                  field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-full border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white rounded-md"
                  />
                
                
                  Enter the hourly booking fee in NGN (numbers only)
                
                
              
            )}
          />
       

      

      {/* Additional Info Section */}
      
       

          (
              
                Description (Optional)
                
                  field.onChange(content === "
" ? "" : content)}
                    modules={quillModules}
                    className="w-full min-h-[200px] border-2 border-gray-400 dark:border-gray-500 bg-white dark:bg-gray-700 dark:text-white rounded-md p-2"
                  />
                
                
                  Use the rich text editor to describe the venue, facilities, etc.
                
                
              
            )}
          />
          (
              
                Opening Hours (Optional)
                
                  
                
                
                  Specify the venue's operating hours
                
                
              
            )}
          />
          
            Image (Optional)
           

              {selectedFile ? (
               

                  
                    {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)}MB)
                  
                  
                    
                  
               

              ) : (
                
                  handleFileChange(e.target.files)}
                    className="w-full border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white rounded-md"
                  />
                
              )}
           

            
              Upload 1 image (max 5MB) to showcase the venue
            
            {fileError &&
{fileError}
}
          
       

      

     

        
          {loading ? "Creating..." : "Create Venue"}
        
        {onCancel && (
          
            Cancel
          
        )}
     

    
  

); };
export default VenueForm;