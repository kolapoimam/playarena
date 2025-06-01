import { format, differenceInMinutes } from "date-fns";
import { Bike, MapPin, Calendar, Clock, Users, DollarSign, Wallet, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import html2canvas from "html2canvas";
import { Loader2 } from "lucide-react";

type CyclingEvent = {
  id_uuid: string;
  slug: string;
  title: string;
  event_date: string;
  start_time: string;
  event_start_time?: string | null;
  event_end_time?: string | null;
  max_attendees: number;
  host_id: string;
  host_name: string;
  host_phone: string;
  supercode: string;
  is_free: boolean;
  price?: number;
  cancellation_status: boolean;
  status: string;
  start_landmark_id: string;
  location: {
    name?: string;
    city?: string;
  } | null;
  attendees: {
    id_uuid: string;
    attendee_name: string;
    attendee_phone: string;
    attendee_status: string;
    confirmation_code: string;
    details: { phone: string } | null;
    number_of_slots?: number;
  }[] | null;
};

type Cashout = {
  id: string;
  cycling_event_id_uuid: string;
  super_code: string;
  bank_account_number: string;
  bank_name: string;
  account_name: string;
  status: "Review" | "Processed" | "Failed" | "Successful";
  temp_identifier?: string;
};

type CyclingDetailsProps = {
  event: CyclingEvent | null;
  cashout: Cashout | null;
  loading: boolean;
  isEventPast: boolean;
  walletBalance: number;
};

const CyclingDetails = ({
  event,
  cashout,
  loading,
  isEventPast,
  walletBalance,
}: CyclingDetailsProps) => {
  const { toast } = useToast();
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [backgroundOption, setBackgroundOption] = useState<"cycle" | "white" | "green">("cycle");
  const [isDownloading, setIsDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  if (!event) return null;

  const formattedDate = event.event_date
    ? new Date(event.event_date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Unknown Date";

  const formattedTime = event.start_time
    ? new Date(`2000-01-01T${event.start_time}`).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "Unknown Time";

  const totalAttendees = event.attendees?.length || 0;
  const checkedInAttendees = event.attendees?.filter(
    (a) => a.attendee_status === "checked_in"
  ).length || 0;
  const absentAttendees = event.attendees?.filter(
    (a) => a.attendee_status === "absent"
  ).length || 0;

  const handleDownload = async () => {
    if (!cardRef.current) return;

    setIsDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: backgroundOption === "white" ? "#ffffff" : "transparent",
      });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `cycling-event-${event.slug}.png`;
      link.href = image;
      link.click();
    } catch (error) {
      console.error("Error downloading image:", error);
      toast({
        title: "Error",
        description: "Failed to download event card. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {event.title}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {formattedDate} at {formattedTime}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setIsDownloadDialogOpen(true)}
            className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
          >
            <Download size={16} className="mr-2" />
            Download Card
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Location
              </h3>
              <p className="mt-1 text-gray-900 dark:text-gray-100">
                {event.location?.name || "Unknown Location"}
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                {event.location?.city || "Unknown City"}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Host
              </h3>
              <p className="mt-1 text-gray-900 dark:text-gray-100">
                {event.host_name}
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                {event.host_phone}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Event Type
              </h3>
              <p className="mt-1 text-gray-900 dark:text-gray-100">
                {event.is_free ? "Free Event" : `Paid Event - ₦${event.price}`}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Attendees
              </h3>
              <div className="mt-2 grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {totalAttendees}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Total
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {checkedInAttendees}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Checked In
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {absentAttendees}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Absent
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {event.max_attendees}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Max Slots
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Status
              </h3>
              <div className="mt-2 flex items-center">
                <div
                  className={`h-2.5 w-2.5 rounded-full mr-2 ${
                    event.cancellation_status
                      ? "bg-red-500"
                      : isEventPast
                      ? "bg-gray-500"
                      : "bg-green-500"
                  }`}
                />
                <p className="text-gray-900 dark:text-gray-100">
                  {event.cancellation_status
                    ? "Cancelled"
                    : isEventPast
                    ? "Past Event"
                    : "Upcoming"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isDownloadDialogOpen} onOpenChange={setIsDownloadDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-lg">
          <DialogTitle>Event Details</DialogTitle>
          <DialogDescription>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Download or share this card to invite friends to your cycling event.
            </p>
            <div className="mb-4">
              <label className="text-sm font-medium">Background:</label>
              <div className="flex items-center space-x-4 mt-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="cycle"
                    checked={backgroundOption === "cycle"}
                    onChange={() => setBackgroundOption("cycle")}
                    disabled={isDownloading}
                  />
                  <span>Default</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="white"
                    checked={backgroundOption === "white"}
                    onChange={() => setBackgroundOption("white")}
                    disabled={isDownloading}
                  />
                  <span>White</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="green"
                    checked={backgroundOption === "green"}
                    onChange={() => setBackgroundOption("green")}
                    disabled={isDownloading}
                  />
                  <span>Green</span>
                </label>
              </div>
            </div>
            <div
              ref={cardRef}
              className={`relative rounded-lg overflow-hidden ${
                backgroundOption === "white"
                  ? "bg-white"
                  : backgroundOption === "green"
                  ? "bg-green-500"
                  : "bg-gradient-to-br from-green-400 to-green-600"
              }`}
            >
              <div
                className={`p-6 ${
                  backgroundOption === "green" ? "text-white" : "text-gray-900"
                }`}
              >
                <h3 className="text-xl font-bold mb-2">{event.title}</h3>
                <p className="text-sm mb-4">
                  {formattedDate} at {formattedTime}
                </p>
                <div className="space-y-2">
                  <p className="text-sm">
                    <strong>Location:</strong> {event.location?.name}
                  </p>
                  <p className="text-sm">
                    <strong>Host:</strong> {event.host_name}
                  </p>
                  <p className="text-sm">
                    <strong>Type:</strong>{" "}
                    {event.is_free ? "Free Event" : `Paid Event - ₦${event.price}`}
                  </p>
                </div>
                <div className="mt-4 text-center">
                  <p className="text-sm font-medium">Super Code: {event.supercode}</p>
                </div>
              </div>
            </div>
          </DialogDescription>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDownloadDialogOpen(false)}
              disabled={isDownloading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {isDownloading ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Downloading...
                </>
              ) : (
                "Download"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CyclingDetails;
