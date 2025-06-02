import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Eye, EyeOff } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useTheme } from "next-themes";
import { NavLink } from "react-router-dom";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { theme } = useTheme();

  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email);
  };

  const handleEmailAuth = async () => {
    if (!validateEmail(email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    if (isSignUp) {
      if (!firstName.trim() || !lastName.trim()) {
        toast({
          title: "Missing Information",
          description: "Please provide both first name and last name.",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/confirm`,
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
            },
          },
        });
        if (error) throw error;

        if (data.user) {
          toast({
            title: "Success! Check Your Email",
            description: "We've sent a confirmation link to your email. Please verify your email to complete registration.",
          });
          setEmail("");
          setPassword("");
          setFirstName("");
          setLastName("");
          setIsSignUp(false);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.code === "email_not_confirmed") {
            toast({
              title: "Email Not Confirmed",
              description: "Please check your email and click the confirmation link to verify your account.",
              variant: "destructive",
            });
          } else {
            throw error;
          }
        } else {
          navigate("/profile");
        }
      }
    } catch (error) {
      toast({
        title: "Oops, Something Went Wrong!",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) throw error;
      
      // The OAuth flow will handle the redirect
      // The callback route will handle profile creation
    } catch (error) {
      toast({
        title: "Oops, Out of Bounds!",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!validateEmail(resetEmail)) {
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
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-[#e6f3f5] to-[#d1e8eb] dark:from-gray-900 dark:to-gray-800 relative pb-20">
      <div className="absolute top-10 left-1/2 transform -translate-x-1/2">
        <img src="/navlogo.png" alt="PlayArena Logo" className="h-16 w-auto" />
      </div>

      <div className="w-full max-w-md mt-12 mb-32">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-8">
          <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
            <button
              className={`flex-1 py-2 text-center text-sm font-medium ${
                !isSignUp
                  ? "border-b-2 border-[#17a34a] text-[#17a34a]"
                  : "text-gray-500 dark:text-gray-400"
              }`}
              onClick={() => setIsSignUp(false)}
            >
              Sign In
            </button>
            <button
              className={`flex-1 py-2 text-center text-sm font-medium ${
                isSignUp
                  ? "border-b-2 border-[#17a34a] text-[#17a34a]"
                  : "text-gray-500 dark:text-gray-400"
              }`}
              onClick={() => setIsSignUp(true)}
            >
              Sign Up
            </button>
          </div>

          <div className="space-y-4">
            {isSignUp && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    First Name
                  </label>
                  <Input
                    type="text"
                    placeholder="Your First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Name
                  </label>
                  <Input
                    type="text"
                    placeholder="Your Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full"
                  />
                </div>
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
                required
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isSignUp ? "Create Password" : "Password"}
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Your Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
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

            <div className="flex gap-2">
              <Button
                className="flex-1 bg-[#17a34a] hover:bg-[#138d3a] text-white font-medium py-2"
                onClick={handleEmailAuth}
                disabled={loading || (isSignUp && (!firstName.trim() || !lastName.trim()))}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : isSignUp ? (
                  "Join Sport Cliq"
                ) : (
                  "Sign In"
                )}
              </Button>

              <Button
                variant="outline"
                className="flex-1 flex items-center justify-center gap-2"
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
                Google
              </Button>
            </div>

            {isSignUp && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                By signing up, you agree to our{' '}
                <NavLink
                  to="/terms-privacy"
                  className="text-green-500 hover:text-green-600 underline transition-colors"
                >
                  Terms & Privacy Policy
                </NavLink>
              </p>
            )}
          </div>
        </div>
      </div>

      {showForgotPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-xs">
            <div className="text-center mb-5">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                Reset Password
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Enter your email to receive a password reset link.
              </p>
            </div>

            <Input
              type="email"
              placeholder="Your Email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="w-full mb-5"
            />

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                className="px-4 rounded-lg"
                onClick={() => setShowForgotPassword(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                className="bg-[#17a34a] hover:bg-[#138d3a] text-white px-4 rounded-lg"
                onClick={handleForgotPassword}
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Send Link"}
              </Button>
            </div>
          </div>
        </div>
      )}

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
