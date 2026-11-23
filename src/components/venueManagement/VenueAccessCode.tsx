import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Copy, Repeat } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import TimeInput from "@/components/TimeInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type AccessCode = {
  id: string;
  booking_id: string | null;
  code: string;
  expiry_date: string;
  status: "pending" | "active" | "inactive";
  created_at: string;
  booker_name: string | null;
  booker_phone: string | null;
  match_date: string;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  recurring_frequency: string | null;
  recurring_occurrences: number | null;
};

type VenueAccessCodeProps = {
  venueId: string;
};

const VenueAccessCode = ({ venueId }: VenueAccessCodeProps) => {
  const { toast } = useToast();
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [showAccessCodeDialog, setShowAccessCodeDialog] = useState(false);
  const [accessCodeForm, setAccessCodeForm] = useState({
    match_date: "",
    start_time: "",
    end_time: "",
    is_recurring: false,
    recurring_frequency: "",
    recurring_occurrences: "",
  });
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (session.session) {
        setUserId(session.session.user.id);
      }
    };
    checkAuth();
  }, []);

  const fetchAccessCodes = useCallback(async () => {
    if (!venueId) {
      setAccessCodes([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("booking_access_codes")
        .select(`
          id, booking_id, code, expiry_date, status, created_at, booker_name, booker_phone,
          match_date, start_time, end_time, is_recurring, recurring_frequency, recurring_occurrences
        `)
        .eq("venue_id", venueId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Client-side expiry check: Update status to inactive if expired
      const now = new Date();
      const updatedCodes = await Promise.all(
        (data || []).map(async (code) => {
          const expiryDate = new Date(code.expiry_date);
          if (expiryDate < now && code.status !== "inactive") {
            const { error: updateError } = await supabase
              .from("booking_access_codes")
              .update({ status: "inactive" })
              .eq("id", code.id);
            if (updateError) {
              console.error("Error updating expired code:", updateError);
            }
            return { ...code, status: "inactive" };
          }
          return code;
        })
      );

      setAccessCodes(updatedCodes);
    } catch (error) {
      console.error("Error fetching access codes:", error);
      toast({
        title: "Error",
        description: "Failed to load access codes.",
        variant: "destructive",
      });
      setAccessCodes([]);
    }
  }, [venueId, toast]);

  useEffect(() => {
    fetchAccessCodes();

    const channel = supabase
      .channel(`access_codes_${venueId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "booking_access_codes",
          filter: `venue_id=eq.${venueId}`,
        },
        () => {
          fetchAccessCodes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [venueId, fetchAccessCodes]);

  const handleGenerateAccessCode = async () => {
    const { match_date, start_time, end_time, is_recurring, recurring_frequency, recurring_occurrences } = accessCodeForm;
    if (!match_date || !start_time || !end_time) {
      toast({
        title: "Error",
        description: "Please fill in date and time fields.",
        variant: "destructive",
      });
      return;
    }
    if (is_recurring && (!recurring_frequency || !recurring_occurrences || parseInt(recurring_occurrences) < 1)) {
      toast({
        title: "Error",
        description: "Please specify valid recurring frequency and occurrences.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: user, error: userError } = await supabase.auth.getUser();
      if (userError || !user.user) {
        throw new Error("User not authenticated");
      }

      const code = Math.random().toString(36).slice(-6).toUpperCase();
      const createdAt = new Date().toISOString();

      const { error } = await supabase
        .from("booking_access_codes")
        .insert({
          venue_id: venueId,
          code,
          expiry_date: new Date(new Date(createdAt).getTime() + 48 * 60 * 60 * 1000).toISOString(),
          status: "pending",
          created_at: createdAt,
          booking_id: null,
          match_date,
          start_time,
          end_time,
          is_recurring: is_recurring || false,
          recurring_frequency: is_recurring ? recurring_frequency : null,
          recurring_occurrences: is_recurring ? parseInt(recurring_occurrences) : null,
        });

      if (error) {
        console.error("Access code error:", error);
        throw error;
      }

      setGeneratedCode(code);
      toast({
        title: "Success",
        description: `Access code ${code} generated successfully.`,
      });
      await fetchAccessCodes();
    } catch (error: any) {
      console.error("Access code error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate access code.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied",
      description: `Access code ${code} copied to clipboard.`,
    });
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "active":
        return "bg-sc-green-bg text-sc-green-dark border-green-300";
      case "inactive":
        return "bg-red-100 text-red-700 border-red-300";
      case "pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      default:
        return "bg-sc-soft text-sc-ink2 border-transparent";
    }
  };

  const capitalizeStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <Card className="bg-white dark:bg-gray-800 border-none shadow-card rounded-3xl">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-sc-ink dark:text-gray-100 flex justify-between items-center">
          Booking Code
          <Button
            onClick={() => setShowAccessCodeDialog(true)}
            className="bg-sc-green hover:brightness-95 text-sc-green-ink rounded-full font-bold"
            disabled={loading}
          >
            Generate Code
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Collapsible>
          <CollapsibleTrigger className="text-sm font-medium text-sc-ink3 dark:text-gray-400 mb-2">
            {accessCodes.length > 0 ? `View ${accessCodes.length} Access Codes` : "No Access Codes"}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-4">
              {accessCodes.map((code) => (
                <div
                  key={code.id}
                  className="p-4 bg-sc-bg rounded-2xl"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-lg font-medium text-sc-ink dark:text-gray-100 flex items-center">
                        Code: {code.code}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyCode(code.code)}
                          className="ml-2 p-1"
                          title="Copy Code"
                        >
                          <Copy size={16} />
                        </Button>
                      </p>
                      <p className="text-sm text-sc-ink3 dark:text-gray-400">
                        Date: {new Date(code.match_date).toLocaleDateString("en-NG", { dateStyle: "medium" })}
                      </p>
                      <p className="text-sm text-sc-ink3 dark:text-gray-400">
                        Time: {code.start_time} - {code.end_time}
                      </p>
                      {userId && code.is_recurring && (
                        <p className="text-sm text-sc-ink3 dark:text-gray-400 flex items-center">
                          <Repeat className="w-4 h-4 mr-1" />
                          Repeats {code.recurring_frequency} for {code.recurring_occurrences} times
                        </p>
                      )}
                      <p className="text-sm text-sc-ink3 dark:text-gray-400">
                        Expires: {new Date(code.expiry_date).toLocaleString("en-NG", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                      <p className="text-sm text-sc-ink3 dark:text-gray-400">
                        Created: {new Date(code.created_at).toLocaleString("en-NG", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                      <p className="text-sm text-sc-ink3 dark:text-gray-400">
                        Booker Name: {code.booker_name || "N/A"}
                      </p>
                      <p className="text-sm text-sc-ink3 dark:text-gray-400">
                        Phone Number: {code.booker_phone || "N/A"}
                      </p>
                    </div>
                    <span
                      className={`inline-block px-3 py-1 text-xs font-bold rounded-full border ${getStatusStyles(code.status)}`}
                    >
                      {capitalizeStatus(code.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>

      <Dialog open={showAccessCodeDialog} onOpenChange={setShowAccessCodeDialog}>
        <DialogContent className="w-auto bg-white dark:bg-gray-800 border-none shadow-card rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-sc-ink dark:text-gray-100">Generate Access Code</DialogTitle>
            <DialogDescription className="text-sm text-sc-ink3 dark:text-gray-400">
              Enter the date, time range, and recurring details for the free booking.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="date"
              value={accessCodeForm.match_date}
              onChange={(e) => setAccessCodeForm({ ...accessCodeForm, match_date: e.target.value })}
              className="text-base bg-white dark:bg-gray-700 border-sc-line dark:border-gray-600 text-sc-ink dark:text-gray-100 rounded-lg"
            />
            <TimeInput
              value={accessCodeForm.start_time}
              onChange={(value) => setAccessCodeForm({ ...accessCodeForm, start_time: value })}
              placeholder="e.g., 01:00 PM"
            />
            <TimeInput
              value={accessCodeForm.end_time}
              onChange={(value) => setAccessCodeForm({ ...accessCodeForm, end_time: value })}
              placeholder="e.g., 03:00 PM"
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={accessCodeForm.is_recurring}
                onChange={(e) => setAccessCodeForm({ ...accessCodeForm, is_recurring: e.target.checked })}
                className="h-4 w-4 text-sc-green-dark border-sc-line rounded"
              />
              <label className="text-sm text-sc-ink3 dark:text-gray-400">Recurring Booking</label>
            </div>
            {accessCodeForm.is_recurring && (
              <>
                <Select
                  value={accessCodeForm.recurring_frequency}
                  onValueChange={(value) => setAccessCodeForm({ ...accessCodeForm, recurring_frequency: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="1"
                  value={accessCodeForm.recurring_occurrences}
                  onChange={(e) => setAccessCodeForm({ ...accessCodeForm, recurring_occurrences: e.target.value })}
                  placeholder="Number of occurrences"
                  className="text-base bg-white dark:bg-gray-700 border-sc-line dark:border-gray-600 text-sc-ink dark:text-gray-100 rounded-lg"
                />
              </>
            )}
            {generatedCode && (
              <div className="text-center">
                <p className="text-sm font-medium text-sc-ink dark:text-gray-100">
                  Generated Code: <span className="text-sc-green-dark">{generatedCode}</span>
                </p>
                <p className="text-xs text-sc-ink3 dark:text-gray-400">
                  Share this code with an organizer to book the venue for free.
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="flex gap-3 justify-center mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowAccessCodeDialog(false);
                setGeneratedCode(null);
                setAccessCodeForm({
                  match_date: "",
                  start_time: "",
                  end_time: "",
                  is_recurring: false,
                  recurring_frequency: "",
                  recurring_occurrences: "",
                });
              }}
              className="border-sc-line dark:border-gray-600 text-sc-ink2 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Close
            </Button>
            {!generatedCode && (
              <Button
                onClick={handleGenerateAccessCode}
                className="bg-sc-green hover:brightness-95 text-sc-green-ink rounded-full font-bold"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default VenueAccessCode;
