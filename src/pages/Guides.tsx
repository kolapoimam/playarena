import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";

const Guides = () => {
  const [activeTab, setActiveTab] = useState("organiser");
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-20">
      <header className="p-4 bg-gradient-to-r from-green-500 to-green-700 text-white rounded-b-2xl shadow-lg">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)} 
            className="text-white hover:bg-green-600"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <div className="text-center">
            <h1 className="text-2xl font-bold">Guides</h1>
          </div>
          <div className="w-10"></div>
        </div>
      </header>

        <Card className="bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-lg rounded-xl border border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-gray-900 dark:text-gray-100">
              User Guides
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-gray-200 dark:bg-gray-700 rounded-lg p-1 mb-6">
                <TabsTrigger
                  value="organiser"
                  className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-gray-600 data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-green-500 hover:bg-green-50 dark:hover:bg-gray-700 transition-all"
                >
                  Organiser
                </TabsTrigger>
                <TabsTrigger
                  value="players"
                  className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-gray-600 data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-green-500 hover:bg-green-50 dark:hover:bg-gray-700 transition-all"
                >
                  Players
                </TabsTrigger>
                <TabsTrigger
                  value="venueOwner"
                  className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-gray-600 data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-green-500 hover:bg-green-50 dark:hover:bg-gray-700 transition-all"
                >
                  Venue Owner
                </TabsTrigger>
              </TabsList>

              <TabsContent value="organiser">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="createMatch" className="border-b border-gray-200 dark:border-gray-700">
                    <AccordionTrigger className="text-xl font-semibold hover:bg-green-50 dark:hover:bg-gray-700 py-3 px-2 data-[state=open]:border-l-4 data-[state=open]:border-green-500">
                      Creating a Match
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 dark:text-gray-300 px-2 py-2">
                      To create a match, navigate to the "Organize Match" section, enter the match title, date, time, venue, and pricing details. Save to publish a public match or retrieve a password for a private match.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="privateMatch" className="border-b border-gray-200 dark:border-gray-700">
                    <AccordionTrigger className="text-xl font-semibold hover:bg-green-50 dark:hover:bg-gray-700 py-3 px-2 data-[state=open]:border-l-4 data-[state=open]:border-green-500">
                      Creating a Private Match
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 dark:text-gray-300 px-2 py-2">
                      For a private match, check the "Private Match" option during creation, copy an access password, and share it with invited players.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="publicMatch" className="border-b border-gray-200 dark:border-gray-700">
                    <AccordionTrigger className="text-xl font-semibold hover:bg-green-50 dark:hover:bg-gray-700 py-3 px-2 data-[state=open]:border-l-4 data-[state=open]:border-green-500">
                      Creating a Public Match
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 dark:text-gray-300 px-2 py-2">
                      Leave the "Private Match" option unchecked to create a public match. It will be visible to all users for joining.
                    </AccordionContent一体>
                  </AccordionItem>
                  <AccordionItem value="bulkPayment" className="border-b border-gray-200 dark:border-gray-700">
                    <AccordionTrigger className="text-xl font-semibold hover:bg-green-50 dark:hover:bg-gray-700 py-3 px-2 data-[state=open]:border-l-4 data-[state=open]:border-green-500">
                      Bulk Payment on Paid Match
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 dark:text-gray-300 px-2 py-2">
                      For paid matches, use the "Bulk Payment" feature to collect fees from multiple players. Navigate to the match management page and process payments securely.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="manageMatches" className="border-b border-gray-200 dark:border-gray-700">
                    <AccordionTrigger className="text-xl font-semibold hover:bg-green-50 dark:hover:bg-gray-700 py-3 px-2 data-[state=open]:border-l-4 data-[state=open]:border-green-500">
                      Managing Matches
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 dark:text-gray-300 px-2 py-2">
                      Access the "Manage Matches" section to edit details, view players, and update statuses. Use the dashboard for an overview.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="confirmAttendance" className="border-b border-gray-200 dark:border-gray-700">
                    <AccordionTrigger className="text-xl font-semibold hover:bg-green-50 dark:hover:bg-gray-700 py-3 px-2 data-[state=open]:border-l-4 data-[state=open]:border-green-500">
                      Confirming Attendance
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 dark:text-gray-300 px-2 py-2">
                      Confirm player attendance via the match management page. Players must check in before the match starts.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="cashout" className="border-b border-gray-200 dark:border-gray-700">
                    <AccordionTrigger className="text-xl font-semibold hover:bg-green-50 dark:hover:bg-gray-700 py-3 px-2 data-[state=open]:border-l-4 data-[state=open]:border-green-500">
                      Cashout
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 dark:text-gray-300 px-2 py-2">
                      Request a cashout from earned match fees via the "Manage" section. A 2% platform fee applies after your first 5 free matches.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </TabsContent>

              <TabsContent value="players">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="joinMatch" className="border-b border-gray-200 dark:border-gray-700">
                    <AccordionTrigger className="text-xl font-semibold hover:bg-green-50 dark:hover:bg-gray-700 py-3 px-2 data-[state=open]:border-l-4 data-[state=open]:border-green-500">
                      Joining a Match
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 dark:text-gray-300 px-2 py-2">
                      Search for a match, view details, and click "Join" if slots are available. Enter a password for private matches if required and save your code.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="refund" className="border-b border-gray-200 dark:border-gray-700">
                    <AccordionTrigger className="text-xl font-semibold hover:bg-green-50 dark:hover:bg-gray-700 py-3 px-2 data-[state=open]:border-l-4 data-[state=open]:border-green-500">
                      Refund Policy
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 dark:text-gray-300 px-2 py-2">
                      Cancel your participation 1 hour before match start for a full refund. Cancellations within 1 hour attract a 50% refund. No refunds after the match starts for checkedin players.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="noShow" className="border-b border-gray-200 dark:border-gray-700">
                    <AccordionTrigger className="text-xl font-semibold hover:bg-green-50 dark:hover:bg-gray-700 py-3 px-2 data-[state=open]:border-l-4 data-[state=open]:border-green-500">
                      No Show Policy
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 dark:text-gray-300 px-2 py-2">
                      Full refund for no shows if player is unconfirmed, but organizers may ban repeat offenders. Check in on time to avoid issues.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </TabsContent>

              <TabsContent value="venueOwner">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="createVenue" className="border-b border-gray-200 dark:border-gray-700">
                    <AccordionTrigger className="text-xl font-semibold hover:bg-green-50 dark:hover:bg-gray-700 py-3 px-2 data-[state=open]:border-l-4 data-[state=open]:border-green-500">
                      Creating a Venue
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 dark:text-gray-300 px-2 py-2">
                      Register your venue by providing name, location, and availability details in the "Add Venue" section.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="bookVenue" className="border-b border-gray-200 dark:border-gray-700">
                    <AccordionTrigger className="text-xl font-semibold hover:bg-green-50 dark:hover:bg-gray-700 py-3 px-2 data-[state=open]:border-l-4 data-[state=open]:border-green-500">
                      Booking a Venue
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 dark:text-gray-300 px-2 py-2">
                      Organizers can book your venue through the site. You’ll be notified and can confirm or decline.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="referralFee" className="border-b border-gray-200 dark:border-gray-700">
                    <AccordionTrigger className="text-xl font-semibold hover:bg-green-50 dark:hover:bg-gray-700 py-3 px-2 data-[state=open]:border-l-4 data-[state=open]:border-green-500">
                      Venue Referral Fee
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 dark:text-gray-300 px-2 py-2">
                      A 10% referral fee is deducted from your earnings when your venue is booked through the site, payable by you.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="mt-6 bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-lg rounded-xl border border-gray-200 dark:border-gray-700">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              Need help? Reach out to us on Twitter!
            </p>
            <Button
              asChild
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-full transition-colors"
            >
              <a href="https://twitter.com/PiousGeek" target="_blank" rel="noopener noreferrer">
                Contact Us
              </a>
            </Button>
          </CardContent>
        </Card>

        <Navbar />
      </div>
  );
};

export default Guides;
