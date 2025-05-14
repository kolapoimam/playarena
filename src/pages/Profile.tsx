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
import { Loader2, CheckCircle, Calendar, DollarSign, MapPin, Users, ArrowLeft } from "lucide-react";
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
        .eq("owner_id", session.session.user.id)
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
      toast({ title: "Success", description: "Profile updated successfully." });
      setProfile({ ...profile!, ...updates, is_initial_setup: false });
    }
    setLoading(false);
  };

  const cancelMatch = async (matchId: string, isJoined: boolean) => {
    const now = new Date();
    const match = await supabase
      .from("matches")
      .select("match_date")
      .eq("id", matchId)
      .single();

    if (new Date(match.data!.match_date) < now) {
      toast({ title: "Error", description: "Cannot cancel past matches.", variant: "destructive" });
      return;
    }

    if (isJoined) {
      // Remove player from match
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
      // Cancel organized match
      const { error: matchError } = await supabase
        .from("matches")
        .update({ status: "cancelled" })
        .eq("id", matchId);

      if (matchError) {
        toast({ title: "Error", description: "Failed to cancel match.", variant: "destructive" });
        return;
      }
    }

    toast({ title: "Success", description: "Match cancelled successfully." });
    fetchMatches();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <header className="sticky top-0 z-50 bg-green-500 text-white shadow-md">
        <div className="p-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-white hover:text-gray-200 text-sm flex items-center"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">My Profile</h1>
          <Button
            variant="ghost"
            onClick={() => supabase.auth.signOut().then(() => navigate("/"))}
            className="text-white hover:text-gray-200 text-sm"
          >
            Sign Out
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Account Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={!profile?.is_initial_setup}
                            className="text-base"
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
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={!profile?.is_initial_setup}
                            className="text-base"
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
                      <FormLabel>Nickname</FormLabel>
                      <FormControl>
                        <Input {...field} className="text-base" />
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
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={!profile?.is_initial_setup}
                          inputMode="numeric"
                          className="text-base"
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
                      <FormLabel>State</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="text-base">
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {["Lagos", "Abuja", "Kano", "Oyo", "Rivers"].map((state) => (
                            <SelectItem key={state} value={state} className="text-base">
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
                      <FormLabel>Skill Level</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="text-base">
                            <SelectValue placeholder="Select skill level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {["Beginner", "Intermediate", "Advanced"].map((level) => (
                            <SelectItem key={level} value={level} className="text-base">
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
                      <FormLabel>Gender</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!profile?.is_initial_setup}
                      >
                        <FormControl>
                          <SelectTrigger className="text-base">
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male" className="text-base">Male</SelectItem>
                          <SelectItem value="female" className="text-base">Female</SelectItem>
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
                      <FormLabel>Age</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          className="text-base"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div>
                  <FormLabel>Email Address</FormLabel>
                  <Input value={profile?.email} disabled className="text-base" />
                </div>
                <Button
                   type="submit"
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-2 text-sm"
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
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">My Matches</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="organizing" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="organizing">Organizing</TabsTrigger>
                <TabsTrigger value="playing">Playing</TabsTrigger>
              </TabsList>
              <TabsContent value="organizing">
                {organizedMatches.length > 0 ? (
                  organizedMatches.map((match) => (
                    <div
                      key={match.id}
                      className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                    >
                      <div>
                        <h3 className="text-base font-semibold">{match.title}</h3>
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
                            onClick={() => cancelMatch(match.id, false)}
                          >
                            Cancel
                          </Button>
                        ) : (
                          <Button
                            size="sm"
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
                          onClick={() => navigate(`/matches/${match.id}`)}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    No organized matches found.
                  </p>
                )}
              </TabsContent>
              <TabsContent value="playing">
                {joinedMatches.length > 0 ? (
                  joinedMatches.map((match) => (
                    <div
                      key={match.id}
                      className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                    >
                      <div>
                        <h3 className="text-base font-semibold">{match.title}</h3>
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
                            onClick={() => cancelMatch(match.id, true)}
                          >
                            Cancel
                          </Button>
                        ) : (
                          <Button
                            size="sm"
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
                          onClick={() => navigate(`/matches/${match.id}`)}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    No joined matches found.
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Analytics</CardTitle>
            <Select
              value={analyticsFilter}
              onValueChange={(value) => setAnalyticsFilter(value as "all" | "month" | "week")}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center gap-3">
                <Users className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Matches Organized</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{analytics.total_organized}</p>
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center gap-3">
                <Users className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Matches Joined</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{analytics.total_joined}</p>
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Spent</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">₦{analytics.total_spent.toFixed(2)}</p>
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Cashout</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">₦{analytics.total_cashout.toFixed(2)}</p>
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center gap-3">
                <MapPin className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Venues Listed</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{analytics.total_venues}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <Navbar />
    </div>
  );
};

export default Profile;
