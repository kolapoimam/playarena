import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Copy } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type AccessCode = {
  id: string;
  booking_id: string | null;
  code: string;
  expiry_date: string;
  status: "pending" | "active" | "inactive";
  created_at: string;
};

type VenueAccessCodeProps = {
  venueId: string;
};

const VenueAccessCode = ({ venueId }: VenueAccessCodeProps) => {
  const { toast } = useToast();
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [showAccessCodeDialog, setShowAccessCodeDialog] = useState(false);
  const [accessCodeForm, setAccessCodeForm] = useState({ match_date: "", start_time: "", end_time: "" });
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAccessCodes = useCallback(async () => {
    if (!venueId) {
      setAccessCodes([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("booking_access_codes")
        .select("id, booking_id, code, expiry_date, status, created_at")
        .eq("venue_id", venueId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Client-side expiry check: Update status to inactive if expired
      const now = new Date(); // Current time: 08:27 PM WAT, May 22, 2025
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
    const { match_date, start_time, end_time } = accessCodeForm;
    if (!match_date || !start_time || !end_time) {
      toast({
        title: "Error",
        description: "Please fill in all fields.",
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
        return "bg-green-100 text-green-700 border-green-300";
      case "inactive":
        return "bg-red-100 text-red-700 border-red-300";
      case "pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      default:
        return "bg-gray-500 text-white border-gray-600";
    }
  };

  return (
    <Card className="bg-white dark:bg-gray-800 border-none shadow-lg rounded-xl">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex justify-between items-center">
          Booking Code
          <Button
            onClick={() => setShowAccessCodeDialog(true)}
            className="bg-green-500 hover:bg-green-600 text-white rounded-lg"
            disabled={loading}
          >
            Generate Code
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Collapsible>
          <CollapsibleTrigger className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            {accessCodes.length > 0 ? `View ${accessCodes.length} Access Codes` : "No Access Codes"}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-4">
              {accessCodes.map((code) => (
                <div
                  key={code.id}
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
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
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Expires: {new Date(code.expiry_date).toLocaleString("en-NG", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Created: {new Date(code.created_at).toLocaleString("en-NG", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                    <span
                      className={`inline-block px-3 py-1 text-sm font-medium rounded border ${getStatusStyles(code.status)}`}
                    >
                      {code.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>

      <Dialog open={showAccessCodeDialog} onOpenChange={setShowAccessCodeDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white dark:bg-gray-800 border-none shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">Generate Access Code</DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
              Enter the date and time range for the free booking.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <Input
              type="date"
              value={accessCodeForm.match_date}
              onChange={(e) => setAccessCodeForm({ ...accessCodeForm, match_date: e.target.value })}
              className="text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg"
            />
            <Input
              type="time"
              value={accessCodeForm.start_time}
              onChange={(e) => setAccessCodeForm({ ...accessCodeForm, start_time: e.target.value })}
              className="text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg"
            />
            <Input
              type="time"
              value={accessCodeForm.end_time}
              onChange={(e) => setAccessCodeForm({ ...accessCodeForm, end_time: e.target.value })}
              className="text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg"
            />
            {generatedCode && (
              <div className="text-center">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Generated Code: <span className="text-green-500">{generatedCode}</span>
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Share this code with an organizer to book the venue for free.
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setShowAccessCodeDialog(false);
                setGeneratedCode(null);
                setAccessCodeForm({ match_date: "", start_time: "", end_time: "" });
              }}
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Close
            </Button>
            {!generatedCode && (
              <Button
                onClick={handleGenerateAccessCode}
                className="bg-green-500 hover:bg-green-600 text-white rounded-lg"
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
