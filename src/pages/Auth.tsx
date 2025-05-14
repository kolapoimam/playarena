import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

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
              first_name: firstName,
              last_name: lastName,
            },
          },
        });
        if (error) throw error;

        // Save first_name and last_name to profiles table
        if (data.user) {
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert({
              id: data.user.id,
              first_name: firstName,
              last_name: lastName,
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
    } catch (error: any) {
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
    } catch (error: any) {
      toast({ title: "Oops, Out of Bounds!", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 bg-[url('https://images.unsplash.com/photo-1518609878373-06d740f60d8b?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center relative">
      {/* Overlay for text readability */}
      <div className="absolute inset-0 bg-black/60 z-0"></div>

      <div className="relative max-w-md w-full bg-white/95 dark:bg-gray-800/95 rounded-xl shadow-xl p-8 border border-gray-200 dark:border-gray-700 z-10">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img
            src="/playarenadark.png"
            alt="PlayArena Logo"
            className="h-12 w-auto"
          />
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-6">
          <div className="flex w-full max-w-xs border-b border-gray-300 dark:border-gray-600">
            <button
              className={`flex-1 py-2 text-center text-lg font-semibold transition-colors duration-200 ${
                !isSignUp
                  ? "text-green-600 border-b-2 border-green-500"
                  : "text-gray-500 dark:text-gray-400 hover:text-green-500"
              }`}
              onClick={() => setIsSignUp(false)}
            >
              Sign In
            </button>
            <button
              className={`flex-1 py-2 text-center text-lg font-semibold transition-colors duration-200 ${
                isSignUp
                  ? "text-green-600 border-b-2 border-green-500"
                  : "text-gray-500 dark:text-gray-400 hover:text-green-500"
              }`}
              onClick={() => setIsSignUp(true)}
            >
              Sign Up
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-gray-200">
            {isSignUp ? "Join the PlayArena Squad! ⚽" : "Welcome Back, Champ!"}
          </h2>
          <div className="space-y-4">
            {isSignUp && (
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="text"
                  placeholder="Your First Name (e.g., Messi)"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="text-base border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                />
                <Input
                  type="text"
                  placeholder="Your Last Name (e.g., Ronaldo)"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="text-base border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            )}
            <Input
              type="email"
              placeholder="Your Email (e.g., star@playarena.com)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-base border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
            />
            <Input
              type="password"
              placeholder="Your Secret Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-base border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
            />
            <Button
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-lg"
              onClick={handleEmailAuth}
              disabled={loading || (isSignUp && (!firstName || !lastName))}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : isSignUp ? (
                "Kick Off Your Journey!"
              ) : (
                "Jump Into the Game!"
              )}
            </Button>
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center"
              onClick={handleGoogleAuth}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M12.24 10.4V14h-1.2v-3.6H8.4v-1.2h2.64V5.6h1.2v3.6h2.64v1.2h-2.64zM12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm0 22.8c-6.63 0-12-5.37-12-12s5.37-12 12-12 12 5.37 12 12-5.37 12-12 12z"
                    />
                  </svg>
                  Sign in with Google
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Navbar */}
      <Navbar />
    </div>
  );
};

export default Auth;
