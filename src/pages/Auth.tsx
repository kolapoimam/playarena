import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useTheme } from "next-themes";
import { Link } from "react-router-dom";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const { theme } = useTheme();

  const handleEmailAuth = async () => {
    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/profile`,
            data: {
              name,
            },
          },
        });
        if (error) throw error;

        // Save name to profiles table
        if (data.user) {
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert({
              id: data.user.id,
              name,
            });

          if (profileError) throw profileError;
        }

        toast({
          title: "You're In the Game! ⚽",
          description: "Check your email to confirm your PlayArena account!",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/profile");
      }
    } catch (error) {
      toast({ title: "Oops, Out of Bounds!", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/profile` },
      });
      if (error) throw error;
    } catch (error) {
      toast({ title: "Oops, Out of Bounds!", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;

      toast({
        title: "Email Sent!",
        description: "Check your email for the password reset link.",
      });
      setShowForgotPassword(false);
      setResetEmail("");
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-[#e6f3f5] to-[#d1e8eb] dark:from-gray-900 dark:to-gray-800 relative pb-20">
      {/* Logo in center above the form */}
      <div className="absolute top-10 left-1/2 transform -translate-x-1/2">
        <img src="/navlogo.png" alt="PlayArena Logo" className="h-16 w-auto" />
      </div>

      <div className="w-full max-w-md mt-20 mb-20">
        <div className="max-h-[60vh] overflow-y-auto scrollbar-hide rounded-2xl">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-8">
            <h1 className="text-2xl font-bold text-center mb-6 text-gray-800 dark:text-white">
              {isSignUp ? "Join Play Arena" : "Welcome Back, Champ!"}
            </h1>

            <div className="space-y-4">
              {isSignUp && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name
                  </label>
                  <Input
                    type="text"
                    placeholder="Your Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="Your Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isSignUp ? "Create Password" : "Password"}
                </label>
                <Input
                  type="password"
                  placeholder="Your Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full"
                />
              </div>

              {!isSignUp && (
                <div className="text-right">
                  <button
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-[#17a34a] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <Button
                className="w-full bg-[#17a34a] hover:bg-[#138d3a] text-white font-medium py-2"
                onClick={handleEmailAuth}
                disabled={loading || (isSignUp && !name)}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : isSignUp ? (
                  "Join Play Arena"
                ) : (
                  "Sign In"
                )}
              </Button>

              {isSignUp && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  By signing up, you agree to our Terms & Privacy Policy
                </p>
              )}
            </div>

            <div className="my-6 flex items-center">
              <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
              <span className="mx-4 text-sm text-gray-500 dark:text-gray-400">or</span>
              <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
            </div>

            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
              onClick={handleGoogleAuth}
              disabled={loading}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </Button>

            <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
              {isSignUp ? (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => setIsSignUp(false)}
                    className="text-[#17a34a] hover:underline font-medium"
                  >
                    Login
                  </button>
                </>
              ) : (
                <>
                  Don't have an account?{" "}
                  <button
                    onClick={() => setIsSignUp(true)}
                    className="text-[#17a34a] hover:underline font-medium"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Dialog */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
              Reset Password
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Enter your email to receive a password reset link.
            </p>
            <Input
              type="email"
              placeholder="Your Email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="w-full mb-4"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowForgotPassword(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                className="bg-[#17a34a] hover:bg-[#138d3a] text-white"
                onClick={handleForgotPassword}
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Send Reset Link"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Image with Gradient Background */}
      <div className="absolute bottom-16 left-0 w-full">
        <div className="w-full h-48 bg-gradient-to-t from-[#e6f3f5] to-[#d1e8eb] dark:from-gray-900 dark:to-gray-800 flex justify-center items-center">
          <img src="/AuthFooter.png" alt="Auth Footer" className="w-full h-full object-contain" />
        </div>
      </div>

      <Navbar />
    </div>
  );
};

export default Auth;
