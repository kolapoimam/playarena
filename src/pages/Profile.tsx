import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, CheckCircle, Calendar, Trophy, Users, ArrowLeft, LogOut } from "lucide-react";
import Navbar from "@/components/Navbar";

type Profile = {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  nickname?: string;
  phone_number?: string;
  state?: string;
  skill_level?: string;
  gender?: "male" | "female";
  age?: number;
  is_initial_setup: boolean;
};

type Match = {
  id: string;
  title: string;
  match_date: string;
  super_code?: string;
  confirmation_code?: string;
  status: string;
};

type Analytics = {
  total_organized: number;
  total_joined: number;
  total_spent: number;
  total_cashout: number;
  total_venues: number;
};

const profileSchema = z.object({
  first_name: z.string().min(1, "First name is required").optional(),
  last_name: z.string().min(1, "Last name is required").optional(),
  nickname: z.string().min(1, "Nickname is required"),
  phone_number: z.string().regex(/^[0-9]{10,15}$/, "Phone number must be 10-15 digits").optional(),
  state: z.string().min(1, "State is required"),
  skill_level: z.string().optional(),
  gender: z.enum(["male", "female"]).optional(),
  age: z.number().min(13, "Must be at least 13").optional(),
});

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organizedMatches, setOrganizedMatches] = useState<Match[]>([]);
  const [joinedMatches, setJoinedMatches] = useState<Match[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({
    total_organized: 0,
    total_joined: 0,
    total_spent: 0,
    total_cashout: 0,
    total_venues: 0,
  });
  const [analyticsFilter, setAnalyticsFilter] = useState<"all" | "month" | "week">("all");
  const [loading, setLoading] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      nickname: "",
      phone_number: "",
      state: "",
      skill_level: "",
      gender: undefined,
      age: undefined,
    },
  });

  useEffect(() => {
    fetchProfile();
    fetchMatches();
    fetchAnalytics();
  }, [analyticsFilter]);

  const fetchProfile = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      navigate("/login");
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.session.user.id)
      .single();

    if (error) {
      toast({ title: "Error", description: "Failed to load profile.", variant: "destructive" });
      return;
    }

    setProfile(data);
    form.reset({
      first_name: data.first_name || "",
      last_name: data.last_name || "",
      nickname: data.nickname || "",
      phone_number: data.phone_number || "",
      state: data.state || "",
      skill_level: data.skill_level || "",
      gender: data.gender,
      age: data.age,
    });
  };

  const fetchMatches = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;

    // Fetch organized matches
    const { data: orgData, error: orgError } = await supabase
      .from("user_organized_matches")
      .select(`
        match_id,
        matches(id, title, match_date, super_code, status)
      `)
      .eq("user_id", session.session.user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (orgError) {
      toast({ title: "Error", description: "Failed to load organized matches.", variant: "destructive" });
      return;
    }

    setOrganizedMatches(
      orgData.map((item) => ({
        ...item.matches,
        super_code: item.matches.super_code,
      }))
    );

    // Fetch joined matches
    const { data: joinData, error: joinError } = await supabase
      .from("user_joined_matches")
      .select(`
        match_id,
        player_id,
        matches(id, title, match_date, status),
        players(confirmation_code)
      `)
      .eq("user_id", session.session.user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (joinError) {
      toast({ title: "Error", description: "Failed to load joined matches.", variant: "destructive" });
      return;
    }

    setJoinedMatches(
      joinData.map((item) => ({
        ...item.matches,
        confirmation_code: item.players.confirmation_code,
      }))
    );
  };

  const fetchAnalytics = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;

    let query = supabase
      .from("user_transactions")
      .select("amount, transaction_type, created_at")
      .eq("user_id", session.session.user.id);

    if (analyticsFilter === "month") {
      query = query.gte(
        "created_at",
        new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString()
      );
    } else if (analyticsFilter === "week") {
      query = query.gte(
        "created_at",
        new Date(new Date().setDate(new Date().getDate() - 7)).toISOString()
      );
    }

    const { data: transactions, error: transError } = await query;

    if (transError) {
      toast({ title: "Error", description: "Failed to load analytics.", variant: "destructive" });
      return;
    }

    const analyticsData: Analytics = {
      total_organized: await supabase
        .from("user_organized_matches")
        .select("id", { count: "exact" })
        .eq("user_id", session.session.user.id)
        .then(({ count }) => count || 0),
      total_joined: await supabase
        .from("user_joined_matches")
        .select("id", { count: "exact" })
        .eq("user_id", session.session.user.id)
        .then(({ count }) => count || 0),
      total_spent: transactions
        .filter((t) => t.transaction_type === "payment")
        .reduce((sum, t) => sum + t.amount, 0),
      total_cashout: transactions
        .filter((t) => t.transaction_type === "cashout")
        .reduce((sum, t) => sum + t.amount, 0),
      total_venues: await supabase
        .from("venues")
        .select("id", { count: "exact" })
        .eq("user_id", session.session.user.id) // Changed from owner_id to user_id
        .then(({ count }) => count || 0),
    };

    setAnalytics(analyticsData);
  };

  const onSubmit = async (data: z.infer<typeof profileSchema>) => {
    setLoading(true);
    const updates = profile?.is_initial_setup
      ? data
      : {
          nickname: data.nickname,
          state: data.state,
          skill_level: data.skill_level,
          age: data.age,
        };

    const { error } = await supabase
      .from("profiles")
      .update({ ...updates, is_initial_setup: false })
      .eq("id", profile?.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Profile updated successfully!" });
      setProfile({ ...profile!, ...updates, is_initial_setup: false });
    }
    setLoading(false);
  };

  const cancelMatch = async (matchId: string, isJoined: boolean) => {
    const now = new Date();
    const { data: match } = await supabase
      .from("matches")
      .select("match_date")
      .eq("id", matchId)
      .single();

    if (new Date(match!.match_date) < now) {
      toast({ title: "Error", description: "Cannot cancel past matches.", variant: "destructive" });
      return;
    }

    if (isJoined) {
      const { error: playerError } = await supabase
        .from("user_joined_matches")
        .delete()
        .eq("user_id", profile!.id)
        .eq("match_id", matchId);

      if (playerError) {
        toast({ title: "Error", description: "Failed to cancel match.", variant: "destructive" });
        return;
      }
    } else {
      const { error: matchError } = await supabase
        .from("matches")
        .update({ status: "cancelled" })
        .eq("id", matchId);

      if (matchError) {
        toast({ title: "Error", description: "Failed to cancel match.", variant: "destructive" });
        return;
      }
    }

    toast({ title: "Success", description: "Match cancelled successfully!" });
    fetchMatches();
  };

  const handleLogout = () => {
    supabase.auth.signOut().then(() => navigate("/"));
    setShowLogout(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 relative">
      {/* Gradient Header with Avatar */}
      <div className="bg-gradient-to-r from-green-600 to-green-800 text-white p-4 flex items-center justify-between shadow-lg">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="text-white hover:text-gray-200 text-sm flex items-center"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-center flex-1">My Profile</h1>
        <div className="relative">
          <img
            src={
              profile?.gender === "male"
                ? "https://via.placeholder.com/40?text=Male"
                : profile?.gender === "female"
                ? "https://via.placeholder.com/40?text=Female"
                : "https://via.placeholder.com/40?text=User"
            }
            alt="User Avatar"
            className="w-10 h-10 rounded-full cursor-pointer"
            onClick={() => setShowLogout(!showLogout)}
          />
          {showLogout && (
            <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10">
              <Button
                variant="ghost"
                className="w-full text-red-500 hover:text-red-700 flex items-center justify-start px-4 py-2 text-sm"
                onClick={handleLogout}
              >
                <LogOut size={16} className="mr-2" />
                Log Out
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6 bg-[url('https://images.unsplash.com/photo-1518609878373-06d740f60d8b?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center relative">
        {/* Overlay for readability */}
        <div className="absolute inset-0 bg-black/40 z-0"></div>

        <div className="relative z-10 space-y-6">
          {/* Collapsible Account Details */}
          <Card className="bg-white/90 dark:bg-gray-800/90 border-none shadow-xl rounded-xl">
            <details className="group">
              <summary className="flex items-center justify-between p-4 text-xl font-semibold text-green-700 dark:text-green-400 cursor-pointer">
                Account Details
                <span className="transition-transform group-open:rotate-180">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </span>
              </summary>
              <CardContent className="p-4 pt-0">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="first_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700 dark:text-gray-300">First Name</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                disabled={!profile?.is_initial_setup}
                                className="text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="last_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700 dark:text-gray-300">Last Name</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                disabled={!profile?.is_initial_setup}
                                className="text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="nickname"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 dark:text-gray-300">Nickname</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className="text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 dark:text-gray-300">Phone Number</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              disabled={!profile?.is_initial_setup}
                              inputMode="numeric"
                              className="text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 dark:text-gray-300">State</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            className="text-base"
                          >
                            <FormControl>
                              <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                                <SelectValue placeholder="Select state" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {[
                                "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
                                "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa",
                                "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger",
                                "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe",
                                "Zamfara", "FCT"
                              ].map((state) => (
                                <SelectItem
                                  key={state}
                                  value={state}
                                  className="text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                >
                                  {state}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="skill_level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 dark:text-gray-300">Skill Level</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            className="text-base"
                          >
                            <FormControl>
                              <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                                <SelectValue placeholder="Select skill level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {["Beginner", "Amateur", "Intermediate", "Advanced", "Professional"].map((level) => (
                                <SelectItem
                                  key={level}
                                  value={level}
                                  className="text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                >
                                  {level}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 dark:text-gray-300">Gender</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={!profile?.is_initial_setup}
                            className="text-base"
                          >
                            <FormControl>
                              <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem
                                value="male"
                                className="text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              >
                                Male
                              </SelectItem>
                              <SelectItem
                                value="female"
                                className="text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              >
                                Female
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="age"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 dark:text-gray-300">Age</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              className="text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div>
                      <FormLabel className="text-gray-700 dark:text-gray-300">Email Address</FormLabel>
                      <Input
                        value={profile?.email}
                        disabled
                        className="text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-2 text-sm flex items-center justify-center"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 size={16} className="mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={16} className="mr-2" />
                          Save Profile
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </details>
          </Card>

          <Card className="bg-white/90 dark:bg-gray-800/90 border-none shadow-xl rounded-xl">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-green-700 dark:text-green-400 flex items-center">
                <Users className="mr-2 h-6 w-6" />
                My Matches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="organizing" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-700 rounded-t-lg">
                  <TabsTrigger
                    value="organizing"
                    className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
                  >
                    Organizing
                  </TabsTrigger>
                  <TabsTrigger
                    value="playing"
                    className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
                  >
                    Playing
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="organizing">
                  {organizedMatches.length > 0 ? (
                    organizedMatches.map((match) => (
                      <div
                        key={match.id}
                        className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 rounded-lg shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                      >
                        <div>
                          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{match.title}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            <Calendar size={14} className="inline mr-1" />
                            {new Date(match.match_date).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Super Code: {match.super_code}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {new Date(match.match_date) > new Date() ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
                              onClick={() => cancelMatch(match.id, false)}
                            >
                              Cancel
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="bg-green-500 hover:bg-green-600 text-white"
                              onClick={() => navigate(`/feedback?matchId=${match.id}`)}
                              disabled={
                                (new Date().getTime() - new Date(match.match_date).getTime()) /
                                  (1000 * 60 * 60) >
                                48
                              }
                            >
                              Give Feedback
                            </Button>
                          )}
                          <Button
                            size="sm"
                            className="bg-green-500 hover:bg-green-600 text-white"
                            onClick={() => navigate(`/matches/${match.id}`)}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-400 p-4">
                      No organized matches found.
                    </p>
                  )}
                </TabsContent>
                <TabsContent value="playing">
                  {joinedMatches.length > 0 ? (
                    joinedMatches.map((match) => (
                      <div
                        key={match.id}
                        className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 rounded-lg shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                      >
                        <div>
                          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{match.title}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            <Calendar size={14} className="inline mr-1" />
                            {new Date(match.match_date).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Confirmation Code: {match.confirmation_code}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {new Date(match.match_date) > new Date() ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
                              onClick={() => cancelMatch(match.id, true)}
                            >
                              Cancel
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="bg-green-500 hover:bg-green-600 text-white"
                              onClick={() => navigate(`/feedback?matchId=${match.id}`)}
                              disabled={
                                (new Date().getTime() - new Date(match.match_date).getTime()) /
                                  (1000 * 60 * 60) >
                                48
                              }
                            >
                              Give Feedback
                            </Button>
                          )}
                          <Button
                            size="sm"
                            className="bg-green-500 hover:bg-green-600 text-white"
                            onClick={() => navigate(`/matches/${match.id}`)}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-400 p-4">
                      No joined matches found.
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="bg-white/90 dark:bg-gray-800/90 border-none shadow-xl rounded-xl">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-green-700 dark:text-green-400 flex items-center">
                <Trophy className="mr-2 h-6 w-6" />
                Analytics
              </CardTitle>
              <Select
                value={analyticsFilter}
                onValueChange={(value) => setAnalyticsFilter(value as "all" | "month" | "week")}
                className="w-[180px]"
              >
                <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                  <SelectValue placeholder="Select filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                    All Time
                  </SelectItem>
                  <SelectItem value="month" className="text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                    This Month
                  </SelectItem>
                  <SelectItem value="week" className="text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                    This Week
                  </SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/50 rounded-lg flex items-center gap-3 shadow-md">
                  <Users className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Matches Organized</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{analytics.total_organized}</p>
                  </div>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/50 rounded-lg flex items-center gap-3 shadow-md">
                  <Users className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Matches Joined</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{analytics.total_joined}</p>
                  </div>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/50 rounded-lg flex items-center gap-3 shadow-md">
                  <Trophy className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Spent</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">₦{analytics.total_spent.toFixed(2)}</p>
                  </div>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/50 rounded-lg flex items-center gap-3 shadow-md">
                  <Trophy className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Cashout</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">₦{analytics.total_cashout.toFixed(2)}</p>
                  </div>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/50 rounded-lg flex items-center gap-3 shadow-md">
                  <MapPin className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Venues Listed</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{analytics.total_venues}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Navbar />
    </div>
  );
};

export default Profile;
