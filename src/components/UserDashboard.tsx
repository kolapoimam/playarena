import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Profile = {
  nickname?: string;
  first_name?: string;
};

type UserDashboardProps = {
  profile: Profile | null;
};

const UserDashboard = ({ profile }: UserDashboardProps) => {
  const username = profile?.nickname || profile?.first_name || "User";

  return (
    <Card className="bg-white dark:bg-gray-800 border-none shadow-xl rounded-xl">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-green-700 dark:text-green-400">
          Welcome, {username}!
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700 dark:text-gray-300">
          Explore your dashboard, manage matches, or check your performance stats.
        </p>
      </CardContent>
    </Card>
  );
};

export default UserDashboard;
