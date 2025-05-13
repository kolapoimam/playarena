import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Navbar from "@/components/Navbar";

const Guides = () => {
  const [activeTab, setActiveTab] = useState("organiser");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="p-4 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">
          Comprehensive Guide
        </h1>

        <Card className="bg-white dark:bg-gray-800 shadow-md rounded-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-gray-900 dark:text-gray-100">
              User Guides
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-gray-200 dark:bg-gray-700 rounded-lg p-1 mb-4">
                <TabsTrigger
                  value="organiser"
                  className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-gray-600 data-[state=active]:shadow-sm"
                >
                  Organiser
                </TabsTrigger>
                <TabsTrigger
                  value="players"
                  className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-gray-600 data-[state=active]:shadow-sm"
                >
                  Players
                </TabsTrigger>
                <TabsTrigger
                  value="venueOwner"
                  className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-gray-600 data-[state=active]:shadow-sm"
                >
                  Venue Owner
                </TabsTrigger>
              </TabsList>

              <TabsContent value="organiser">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="createMatch">
                    <AccordionTrigger className="text-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-700">
                      Creating a Match
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 dark:text-gray-400">
                      To create a match, navigate to the "Create Match" section, enter the match title, date, time, venue, and pricing details. Save to publish a public match or set a password for a private match.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="privateMatch">
                    <AccordionTrigger className="text-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-700">
                      Creating a Private Match
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 dark:text-gray-400">
                      For a private match, check the "Private Match" option during creation, set an access password, and share it with invited players.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="publicMatch">
                    <AccordionTrigger className="text-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-700">
                      Creating a Public Match
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 dark:text-gray-400">
                      Leave the "Private Match" option unchecked to create a public match. It will be visible to all users for joining.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="bulkPayment">
                    <AccordionTrigger className="text-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-700">
                      Bulk Payment on Paid Match
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 dark:text-gray-400">
                      For paid matches, use the "Bulk Payment" feature to collect fees from multiple players. Navigate to the match management page and process payments securely.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="manageMatches">
                    <AccordionTrigger className="text-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-700">
                      Managing Matches
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 dark:text-gray-400">
                      Access the "Manage Matches" section to edit details, view players, and update statuses. Use the dashboard for an overview.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="confirmAttendance">
                    <AccordionTrigger className="text-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-700">
                      Confirming Attendance
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 dark:text-gray-400">
                      Confirm player attendance via the match management page. Players must check in before the match starts.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="cashout">
                    <AccordionTrigger className="text-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-700">
                      Cashout
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 dark:text-gray-400">
                      Request a cashout from earned match fees via the "Earnings" section. A 2% platform fee applies after your first 10 free matches.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </TabsContent>

              <TabsContent value="players">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="joinMatch">
                    <AccordionTrigger className="text-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-700">
                      Joining a Match
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 dark:text-gray-400">
                      Search for a match, view details, and click "Join" if slots are available. Enter a password for private matches if required.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="refund">
                    <AccordionTrigger className="text-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-700">
                      Refund Policy
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 dark:text-gray-400">
                      Cancel your participation 1 hour before match start for a full refund. Cancellations within 1 hour attract a 50% refund. No refunds after the match starts.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="noShow">
                    <AccordionTrigger className="text-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-700">
                      No Show Policy
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 dark:text-gray-400">
                      No refunds or penalties for no-shows, but organizers may ban repeat offenders. Check in on time to avoid issues.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </TabsContent>

              <TabsContent value="venueOwner">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="createVenue">
                    <AccordionTrigger className="text-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-700">
                      Creating a Venue
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 dark:text-gray-400">
                      Register your venue by providing name, location, and availability details in the "Add Venue" section.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="bookVenue">
                    <AccordionTrigger className="text-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-700">
                      Booking a Venue
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 dark:text-gray-400">
                      Organizers can book your venue through the site. You’ll be notified and can confirm or decline.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="referralFee">
                    <AccordionTrigger className="text-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-700">
                      Venue Referral Fee
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 dark:text-gray-400">
                      A 10% referral fee is deducted from your earnings when your venue is booked through the site, payable by you.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      <Navbar />
    </div>
  );
};

export default Guides;
