import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const Confirm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get("token");
      const type = searchParams.get("type");

      if (!token || type !== "signup") {
        toast({
          title: "Invalid Confirmation Link",
          description: "The link is invalid or expired. Please try signing up again.",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      try {
        const { error } = await supabase.auth.verifyOtp({
          token,
          type: "signup",
          email: searchParams.get("email") || undefined,
        });

        if (error) throw error;

        toast({
          title: "Email Verified!",
          description: "Your email has been confirmed. You can now sign in.",
        });
        navigate("/auth");
      } catch (error) {
        toast({
          title: "Error Verifying Email",
          description: error.message,
          variant: "destructive",
        });
        navigate("/auth");
      }
    };

    verifyEmail();
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" />
      <span className="ml-2">Verifying your email...</span>
    </div>
  );
};

export default Confirm;
