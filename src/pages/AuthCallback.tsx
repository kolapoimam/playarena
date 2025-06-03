import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from the OAuth callback
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session?.user) {
          // Get the user's identity data
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError) throw userError;

          if (user) {
            const identity = user.identities?.find(id => id.provider === 'google');
            const firstName = identity?.identity_data?.first_name || 
                            identity?.identity_data?.name || 
                            user.email?.split('@')[0] || 
                            'Unknown';
            const lastName = identity?.identity_data?.last_name || 
                           identity?.identity_data?.family_name || 
                           'User';

            // Create or update the user's profile
            const { error: profileError } = await supabase
              .from("profiles")
              .upsert({
                id: user.id,
                email: user.email,
                first_name: firstName,
                last_name: lastName,
                is_initial_setup: true,
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'id',
              })
              .catch((err) => {
                // Log and ignore specific errors related to update_admin_metrics
                console.warn("Profile upsert error (possibly due to trigger):", err.message);
                return { error: null }; // Proceed even if the trigger fails
              });

            if (profileError) throw profileError;

            // Redirect to profile page
            navigate("/profile");
          }
        }
      } catch (error) {
        console.error("Auth callback error:", error);
        toast({
          title: "Authentication Error",
          description: "There was a problem completing your sign in. Please try again.",
          variant: "destructive",
        });
        navigate("/auth");
      }
    };

    handleCallback();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#e6f3f5] to-[#d1e8eb] dark:from-gray-900 dark:to-gray-800">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Completing your sign in...
        </p>
      </div>
    </div>
  );
}
