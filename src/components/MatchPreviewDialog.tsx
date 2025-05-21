import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, CalendarIcon, Clock, User, Trophy } from "lucide-react";
import { format } from "date-fns";

type FormValues = {
  title: string;
  venue_id: string;
  match_date: Date | undefined;
  start_time: string;
  end_time: string;
  total_slots: number | undefined;
  is_paid: boolean;
  price: number | null | undefined;
  notes: string | undefined;
  organizer_name: string;
  skill_level: string | null | undefined;
  match_type: string | null | undefined;
  gender: string | null | undefined;
  is_private: boolean;
  access_password: string | null | undefined;
  sell_tickets: boolean;
  ticket_price: number | null | undefined;
  max_tickets: number | null | undefined;
};

type Venue = {
  id: string;
  name: string;
};

type MatchPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formValues: FormValues;
  selectedVenue: Venue | undefined;
};

const MatchPreviewDialog = ({ open, onOpenChange, formValues, selectedVenue }: MatchPreviewDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[375px] rounded-2xl">
        <DialogTitle className="text-xl font-bold text-gray-800 dark:text-gray-200">Match Preview</DialogTitle>
        <DialogDescription>
          <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <img 
                src="/playarenadark.png" 
                alt="PlayArena Logo" 
                className="h-8 w-auto"
              />
              <Trophy className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold mb-2">{formValues.title || "Your Match"}</h2>
            <div className="space-y-2 mb-4 text-sm">
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                <span>{selectedVenue?.name || "Venue"}</span>
              </div>
              <div className="flex items-center">
                <CalendarIcon className="h-4 w-4 mr-2" />
                <span>{formValues.match_date ? format(formValues.match_date, "PPP") : "Date"}</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                <span>From {formValues.start_time || "Start"} to {formValues.end_time || "End"}</span>
              </div>
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2" />
                <span>Organized by {formValues.organizer_name || "Organizer"}</span>
              </div>
              <div className="flex items-center">
                <span className="font-semibold">Players: </span>
                <span className="ml-2">{formValues.total_slots || "N/A"}</span>
              </div>
              {formValues.is_paid && (
                <div className="flex items-center">
                  <span className="font-semibold">Price: </span>
                  <span className="ml-2">₦{formValues.price?.toFixed(2) || "0.00"}</span>
                </div>
              )}
              {formValues.sell_tickets && (
                <div className="flex items-center">
                  <span className="font-semibold">Ticket Price: </span>
                  <span className="ml-2">₦{formValues.ticket_price?.toFixed(2) || "N/A"}</span>
                </div>
              )}
              {formValues.max_tickets && (
                <div className="flex items-center">
                  <span className="font-semibold">Max Tickets: </span>
                  <span className="ml-2">{formValues.max_tickets}</span>
                </div>
              )}
              {formValues.notes && (
                <div className="flex items-center">
                  <span className="font-semibold">Notes: </span>
                  <span className="ml-2">{formValues.notes}</span>
                </div>
              )}
              {formValues.skill_level && formValues.skill_level !== "" && (
                <div className="flex items-center">
                  <span className="font-semibold">Skill Level: </span>
                  <span className="ml-2">{formValues.skill_level}</span>
                </div>
              )}
              {formValues.match_type && formValues.match_type !== "" && (
                <div className="flex items-center">
                  <span className="font-semibold">Match Type: </span>
                  <span className="ml-2">{formValues.match_type}</span>
                </div>
              )}
              {formValues.gender && formValues.gender !== "" && (
                <div className="flex items-center">
                  <span className="font-semibold">Gender: </span>
                  <span className="ml-2">{formValues.gender}</span>
                </div>
              )}
              {formValues.is_private && (
                <div className="flex items-center">
                  <span className="font-semibold">Access Password: </span>
                  <span className="ml-2 font-mono">{formValues.access_password || "N/A"}</span>
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              className="bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-2 transition-colors"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
};

export default MatchPreviewDialog;
