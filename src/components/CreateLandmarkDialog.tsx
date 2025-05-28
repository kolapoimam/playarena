import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Nigerian states including FCT
const nigerianStates = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

const landmarkSchema = z.object({
  new_landmark_name: z.string().min(3, 'Landmark name must be at least 3 characters').max(100, 'Landmark name cannot exceed 100 characters'),
  new_landmark_state: z.string({ required_error: 'State is required' }),
  new_landmark_description: z.string().max(200, 'Description cannot exceed 200 characters').optional(),
  new_landmark_map_link: z.string().url('Enter a valid URL').optional().nullable(),
}).refine(
  (data) => data.new_landmark_name && data.new_landmark_state,
  {
    message: 'State is required when creating a new landmark',
    path: ['new_landmark_state'],
  },
);

type LandmarkFormValues = z.infer<typeof landmarkSchema>;

interface CreateLandmarkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: LandmarkFormValues) => void;
}

const CreateLandmarkDialog = ({ open, onOpenChange, onSave }: CreateLandmarkDialogProps) => {
  const form = useForm<LandmarkFormValues>({
    resolver: zodResolver(landmarkSchema),
    defaultValues: {
      new_landmark_name: '',
      new_landmark_state: '',
      new_landmark_description: '',
      new_landmark_map_link: '',
    },
  });

  const onSubmit = async (data: LandmarkFormValues) => {
    try {
      onSave(data);
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      console.error('Error creating landmark:', error);
      form.setError('root', { message: 'Failed to create landmark. Please try again.' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-lg">
        <DialogHeader>
          <DialogTitle>Create New Landmark</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="new_landmark_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Landmark Name</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., Central Park" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="new_landmark_state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a state" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {nigerianStates.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="new_landmark_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="E.g., Near the main entrance" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="new_landmark_map_link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Map Link (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., https://maps.google.com/..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.formState.errors.root && (
              <p className="text-red-500 text-sm">{form.formState.errors.root.message}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-green-500 hover:bg-green-600 text-white">
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateLandmarkDialog;
