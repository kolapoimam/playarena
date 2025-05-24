import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import UserMatches from "./UserMatches";
import Navbar from "@/components/Navbar";
import { ChevronLeft } from "lucide-react";

const MyMatches = ({ profile }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-brand-light text-foreground font-nunito">
      {/* Header with Back Button */}
      <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700">
        <Button
          variant="ghost"
          onClick={() => navigate("/profile")}
          className="text-brand hover:text-brand-dark transition-colors duration-300"
        >
          <ChevronLeft className="w-5 h-5 mr-2" /> Back
        </Button>
        <h1 className="text-xl font-bold ml-4">My Matches</h1>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="organising" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-100 dark:bg-gray-700 rounded-t-lg">
            <TabsTrigger
              value="organising"
              className="data-[state=active]:bg-brand data-[state=active]:text-white transition-colors duration-300"
            >
              Organising
            </TabsTrigger>
            <TabsTrigger
              value="playing"
              className="data-[state=active]:bg-brand data-[state=active]:text-white transition-colors duration-300"
            >
              Playing
            </TabsTrigger>
            <TabsTrigger
              value="watching"
              disabled
              className="text-gray-400 cursor-not-allowed"
            >
              Watching (Coming Soon)
            </TabsTrigger>
          </TabsList>
          <TabsContent value="organising">
            <UserMatches profile={profile} />
          </TabsContent>
          <TabsContent value="playing">
            <UserMatches profile={profile} />
          </TabsContent>
          <TabsContent value="watching">
            <div className="text-center py-10">
              <h2 className="text-lg text-gray-600 dark:text-gray-400">Coming Soon</h2>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Bottom Navbar */}
      <Navbar />

      {/* Custom Styles */}
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700&display=swap');
        .font-nunito {
          font-family: 'Nunito', sans-serif;
        }
        .text-brand {
          color: #17a34a;
        }
        .bg-brand {
          background-color: #17a34a;
        }
        .bg-brand-light {
          background-color: #e6f4ea;
        }
        .hover\:text-brand-dark:hover {
          color: #13863b;
        }
      `}</style>
    </div>
  );
};

export default MyMatches;
