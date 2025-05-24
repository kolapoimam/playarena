import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, MapPin, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import VenueManagerDashboard from "@/pages/VenueManagerDashboard";

const pinSchema = z.object({
  access_code: z
    .string()
    .length(6, "Access code must be 6 characters")
    .regex(/^[a-zA-Z0-9]{6}$/, "Access code must be 6 characters and contain only letters and numbers"),
});

type PinFormData = z.infer<typeof pinSchema>;

const MyVenue = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isVenueLinked, setIsVenueLinked] = useState(false);
  const [venueId, setVenueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [operationLoading, setOperationLoading] = useState(false);

  const form = useForm<PinFormData>({
    resolver: zodResolver(pinSchema),
    defaultValues: {
      access_code: "",
    },
  });

  useEffect(() => {
    const fetchVenue = async () => {
      setLoading(true);
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          toast({
            title: "Error",
            description: "User not authenticated",
            variant: "destructive",
          });
          navigate("/login");
          return;
        }

        const { data: venueData } = await supabase
          .from("venues")
          .select("id")
          .eq("manager_id", userData.user.id)
          .single();

        if (venueData) {
          setIsVenueLinked(true);
          setVenueId(venueData.id);
        }
      } catch (err) {
        console.error("Error fetching venue:", err);
        toast({
          title: "Error",
          description: "Failed to check venue status",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchVenue();
  }, [navigate, toast]);

  const handleLinkVenue = async (data: PinFormData) => {
    setOperationLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast({
          title: "Error",
          description: "User not authenticated",
          variant: "destructive",
        });
        return;
      }

      const { data: venueData, error: venueError } = await supabase
        .from("venues")
        .select("id, manager_id")
        .eq("access_code", data.access_code)
        .single();

      if (venueError || !venueData) {
        throw new Error("Invalid access code");
      }

      if (venueData.manager_id) {
        throw new Error("Venue already linked to another user");
      }

      const { error: updateError } = await supabase
        .from("venues")
        .update({ manager_id: userData.user.id, updated_at: new Date().toISOString() })
        .eq("id", venueData.id);

      if (updateError) {
        throw new Error("Failed to link venue");
      }

      setIsVenueLinked(true);
      setVenueId(venueData.id);
      setShowLinkDialog(false);
      form.reset();
      toast({
        title: "Success",
        description: "Venue successfully linked!",
      });
    } catch (err: any) {
      console.error("Error linking venue:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to link venue",
        variant: "destructive",
      });
    } finally {
      setOperationLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-light text-foreground font-nunito flex flex-col">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-20">
        <Button
          variant="ghost"
          onClick={() => navigate("/profile")}
          className="text-brand hover:text-brand-dark transition-colors duration-300"
        >
          <ChevronLeft className="w-5 h-5 mr-2" /> Back
        </Button>
        <h1 className="text-xl font-bold ml-4 text-gray-900 dark:text-gray-100">My Venue</h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand"></div>
          </div>
        ) : isVenueLinked && venueId ? (
          <VenueManagerDashboard />
        ) : (
          <Card className="border-none shadow-lg bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                Link Your Venue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setShowLinkDialog(true)}
                className="w-full bg-brand hover:bg-brand-dark text-white transition-colors duration-300"
              >
                <MapPin className="w-5 h-5 mr-2" />
                Link Venue
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog for Linking Venue */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white dark:bg-gray-800 shadow-2xl border-none">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-green-700 dark:text-green-400 flex items-center">
              <MapPin size={20} className="mr-2" />
              Link Venue
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300">
              Enter the 6-character access code to link a venue to your profile.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleLinkVenue)} className="space-y-4">
              <FormField
                control={form.control}
                name="access_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-300">Access Code</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        maxLength={6}
                        className="text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg"
                        placeholder="Enter 6-character code"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowLinkDialog(false);
                    form.reset();
                  }}
                  className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  disabled={operationLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-green-500 hover:bg-green-600 text-white rounded-lg"
                  disabled={operationLoading}
                >
                  {operationLoading ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Linking...
                    </>
                  ) : (
                    "Link Venue"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Bottom Navbar */}
      <div className="sticky bottom-0 z-20">
        <Navbar />
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700&display=swap');
        .font-nunito {
          font-family: 'Nunito', sans-serif;
        }
        .text-brand {
          color: #17a34a;
        }
        .bg-brand-light {
          background-color: #e6f4ea;
        }
        .hover\:text-brand-dark:hover {
          color: #13863b;
        }
        .bg-brand-dark {
          background-color: #13863b;
        }
      `}</style>
    </div>
  );
};

export default MyVenue;
