import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Eye, EyeOff, Trophy } from "lucide-react";
import { BrandMark, Segmented } from "@/components/sc/ui";
import Navbar from "@/components/Navbar";
import { useTheme } from "next-themes";
import { NavLink } from "react-router-dom";
import { Seo } from "@/components/Seo";

const Auth = () => {
  // Where to go after signing in. Only paths inside the app are allowed.
  const nextPath = (() => {
    const n = new URLSearchParams(window.location.search).get("next") || "";
    return n.startsWith("/") && !n.startsWith("//") ? n : "/profile";
  })();
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
            throw error; // Handle all other errors generically
          }
        } else {
          navigate(nextPath);
        }
      }
    } catch (error) {
      toast({
        title: "Authentication Error",
        description: "Unable to complete login. Please try again later or contact support.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      // Attempt to initiate Google OAuth
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      // If no error, the browser will redirect to Google's OAuth page
      // No toast should be shown here, as this is the expected behavior
      if (error) {
        console.error("Google OAuth error:", error.message); // Log for debugging
        throw error;
      }

      // Note: Code below this point executes only after OAuth redirect callback
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error("User data error:", userError.message); // Log for debugging
        throw userError;
      }

      if (userData.user) {
        const identity = userData.user.identities?.find(id => id.provider === 'google');
        const firstName = identity?.identity_data?.first_name || identity?.identity_data?.name || userData.user.email?.split('@')[0] || 'Unknown';
        const lastName = identity?.identity_data?.last_name || identity?.identity_data?.family_name || 'User';

        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({
            id: userData.user.id,
            email: userData.user.email,
            first_name: firstName,
            last_name: lastName,
            is_initial_setup: true,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'id',
          });

        if (profileError) {
          console.error("Profile upsert error:", profileError.message); // Log for debugging
          // Continue to navigate to profile even if upsert fails
        }

        navigate("/profile");
      }
    } catch (error) {
      // Suppress toast for errors that occur during redirect initiation
      if (error.message.includes("redirect") || error.code === "user_cancelled") {
        console.warn("OAuth redirect initiated or user cancelled, no toast displayed:", error.message);
        // No toast for redirect-related errors or user cancellation
      } else if (error.message.includes("network")) {
        console.error("Network error during Google OAuth:", error.message);
        toast({
          title: "Network Error",
          description: "Unable to connect to the server. Please check your internet connection and try again.",
          variant: "destructive",
        });
      } else {
        console.error("Unexpected Google OAuth error:", error.message);
        toast({
          title: "Authentication Error",
          description: "Unable to complete Google login. Please try again later or contact support.",
          variant: "destructive",
        });
      }
    } finally {
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
        description: "Unable to send reset link. Please try again later or contact support.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Seo
        title="Sign In or Register | Sport Cliq Nigeria"
        description="Sign in or create an account to join football matches, cycling events, and sports activities in Nigeria. Football in Nigeria, Sports in Nigeria, Sportstech, Nigeria Startup."
        url={window.location.href}
        image={undefined}
        children={null}
      />
      <div className="min-h-screen bg-sc-bg text-sc-ink font-sans pb-36">
        <div className="relative h-[250px] overflow-hidden rounded-b-[40px] bg-sc-green px-6 flex flex-col justify-end gap-[18px] pb-7" style={{ paddingTop: "max(env(safe-area-inset-top), 3rem)" }}>
          <Trophy aria-hidden="true" className="absolute text-white/15" size={220} strokeWidth={1.1} style={{ right: -40, bottom: -60 }} />
          <BrandMark size={52} />
          <h1 className="relative m-0 text-[34px] leading-[38px] font-extrabold tracking-[-0.04em] text-sc-green-ink">
            {isSignUp ? (
              <>
                Join the squad,
                <br />
                let&apos;s play.
              </>
            ) : (
              <>
                Welcome back,
                <br />
                let&apos;s play.
              </>
            )}
          </h1>
        </div>

        <div className="w-full px-5 pt-[22px]">
          <div>
            <div className="mb-4">
              <Segmented
                value={isSignUp ? "up" : "in"}
                onChange={(v) => setIsSignUp(v === "up")}
                options={[
                  { value: "in", label: "Sign in" },
                  { value: "up", label: "Sign up" },
                ]}
              />
            </div>

            <div className="space-y-4">
              {isSignUp && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-bold text-sc-ink2 mb-2">
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
                    <label className="block text-[13px] font-bold text-sc-ink2 mb-2">
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
                <label className="block text-[13px] font-bold text-sc-ink2 mb-2">
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
                <label className="block text-[13px] font-bold text-sc-ink2 mb-2">
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
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-sc-ink3 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {!isSignUp && (
                <div className="text-right">
                  <button
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm font-bold text-sc-green-dark"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <Button
                  size="lg"
                  className="w-full bg-sc-green hover:brightness-95 text-sc-green-ink font-bold"
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

                <div className="flex items-center gap-3 text-sc-ink3 text-[13px] font-semibold">
                  <span className="flex-1 h-px bg-sc-line" />
                  or
                  <span className="flex-1 h-px bg-sc-line" />
                </div>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full flex items-center justify-center gap-2.5"
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
              </div>

              {isSignUp && (
                <p className="text-xs text-sc-ink3 dark:text-gray-400 text-center">
                  By signing up, you agree to our{' '}
                  <NavLink
                    to="/terms-privacy"
                    className="text-sc-green-dark hover:text-green-600 underline transition-colors"
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
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-[18px] w-full max-w-xs">
              <div className="text-center mb-5">
                <h2 className="text-xl font-bold text-sc-ink dark:text-white">
                  Reset Password
                </h2>
                <p className="text-sm text-sc-ink3 dark:text-gray-400 mt-2">
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
                  className="bg-sc-green hover:brightness-95 text-sc-green-ink px-4 rounded-full font-bold"
                  onClick={handleForgotPassword}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Send Link"}
                </Button>
              </div>
            </div>
          </div>
        )}


        <Navbar />
      </div>
    </>
  );
};

export default Auth;
