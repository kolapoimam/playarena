import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import MatchForm from "@/components/MatchForm";
import OrganizerDetails from "@/components/OrganizerDetails";
import Navbar from "@/components/Navbar";

const Organize = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        const { data: session, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Auth error:", error);
          // Don't set error state; allow unauthenticated access
        }
        if (session.session) {
          setUserId(session.session.user.id);
        }
      } catch (err) {
        console.error("Unexpected auth error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-lg text-gray-700 dark:text-gray-300">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-gray-100 dark:bg-gray-900">
      <header className="sticky top-0 z-50 bg-gradient-to-r from-green-500 to-green-700 text-white shadow-lg">
        <div className="p-4 flex items-center justify-between max-w-7xl mx-auto">
          <Button
            variant="ghost"
            className="text-white hover:bg-green-600 transition-colors"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Organize a Match</h1>
          <div className="w-10"></div>
        </div>
      </header>
      <div className="p-6 max-w-3xl mx-auto">
        {!userId && (
          <div className="mb-6 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 p-4 rounded-lg">
            <p className="text-sm">
              You're not logged in. You can still organize a match, but logging in will associate it with your profile.
              <Button
                variant="link"
                className="ml-2 text-yellow-700 dark:text-yellow-300"
                onClick={() => navigate("/login")}
              >
                Log in now
              </Button>
            </p>
          </div>
        )}
        <MatchForm />
        <OrganizerDetails userId={userId} />
      </div>
      <Navbar />
    </div>
  );
};

export default Organize;
