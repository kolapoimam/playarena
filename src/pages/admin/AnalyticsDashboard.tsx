import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Download, TrendingUp, Users, Calendar, DollarSign } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { supabase } from '@/lib/supabase';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend);

interface AnalyticsData {
  total_users: number;
  total_events: number;
  total_revenue: number;
  active_venues: number;
  user_growth: number;
  event_growth: number;
  revenue_growth: number;
  venue_growth: number;
  monthly_stats: {
    month: string;
    users: number;
    events: number;
    revenue: number;
  }[];
  top_venues: {
    id: string;
    name: string;
    events: number;
    revenue: number;
  }[];
  top_events: {
    id: string;
    title: string;
    participants: number;
    revenue: number;
  }[];
  total_cycling_events: number;
  cycling_event_growth: number;
  top_cycling_events: {
    id: string;
    title: string;
    participants: number;
    revenue: number;
  }[];
}

const AnalyticsDashboard = () => {
  const [timeRange, setTimeRange] = useState('30d');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topSports, setTopSports] = useState<{ sport: string; count: number }[]>([]);
  const [topCyclingEvents, setTopCyclingEvents] = useState<AnalyticsData['top_cycling_events']>([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch metrics from admin_metrics
        const { data: metrics, error: metricsError } = await supabase
          .from('admin_metrics')
          .select('*')
          .single();

        if (metricsError) throw metricsError;

        // Fetch monthly stats
        const { data: monthlyStats, error: statsError } = await supabase
          .from('admin_metrics')
          .select('monthly_stats')
          .order('created_at', { ascending: false })
          .limit(12);

        if (statsError) throw statsError;

        // Fetch top venues
        const { data: topVenues, error: venuesError } = await supabase
          .from('venues')
          .select(`
            id,
            name,
            events:matches(count),
            revenue:venue_booking_cashout(sum(amount))
          `)
          .order('events', { ascending: false })
          .limit(5);

        if (venuesError) throw venuesError;

        // Fetch top events
        const { data: topMatchEvents, error: matchEventsError } = await supabase
          .from('matches')
          .select(`
            id,
            title,
            participants,
            revenue:tickets(sum(total_price))
          `)
          .order('participants', { ascending: false })
          .limit(5);

        if (matchEventsError) throw matchEventsError;

        // Fetch top cycling events
        const { data: cyclingEventsData, error: cyclingEventsError } = await supabase
          .from('cycling_events')
          .select('id, title, participants:cycling_attendees(count), revenue:cycling_event_transactions(sum(amount))')
          .order('participants', { ascending: false, foreignTable: 'cycling_attendees' })
          .limit(5);
        if (cyclingEventsError) {
          console.error("Error fetching top cycling events:", cyclingEventsError);
          // Set to empty array or handle error as needed
          setTopCyclingEvents([]); 
        } else {
          setTopCyclingEvents((cyclingEventsData || []).map((event: any) => ({
            id: event.id,
            title: event.title,
            participants: event.participants?.[0]?.count || 0,
            revenue: event.revenue?.[0]?.sum || 0,
          })));
        }

        // Fetch top sports by event count (revised)
        const { data: sportsData, error: sportsQueryError } = await supabase
          .from('matches')
          .select('sport');
        if (sportsQueryError) throw sportsQueryError;

        const sportCounts: Record<string, number> = {};
        (sportsData || []).forEach((row: any) => {
          if (row.sport) {
            sportCounts[row.sport] = (sportCounts[row.sport] || 0) + 1;
          }
        });
        const sortedSportsData = Object.entries(sportCounts)
          .map(([sport, count]) => ({ sport, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        setTopSports(sortedSportsData);

        setAnalytics({
          ...(metrics as AnalyticsData), // Cast metrics to AnalyticsData
          total_cycling_events: metrics?.total_cycling_events || 0, 
          cycling_event_growth: metrics?.cycling_event_growth || 0,
          monthly_stats: (monthlyStats || []).map((stat: any) => stat.monthly_stats).flat(), // Ensure monthly_stats is an array
          top_venues: (topVenues || []).map((venue: any) => ({ 
            id: venue.id,
            name: venue.name,
            events: venue.events?.[0]?.count || 0,
            revenue: venue.revenue?.[0]?.sum || 0
          })),
          top_events: (topMatchEvents || []).map((event: any) => ({ 
            id: event.id,
            title: event.title,
            participants: event.participants,
            revenue: event.revenue?.[0]?.sum || 0
          })),
          top_cycling_events: [], // This will be handled by topCyclingEvents state
        });

      } catch (err: any) {
        console.error("Failed to fetch analytics:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();

    // Real-time updates via Supabase subscriptions (revised)
    const channel = supabase
      .channel('admin_metrics_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_metrics' }, () => {
        fetchAnalytics();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [timeRange]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <p>Loading analytics...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error || !analytics) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-red-500">{error || 'Failed to load analytics'}</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 font-[\'Plus Jakarta Sans\'],sans-serif">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Platform performance and insights</p>
          </div>
          <div className="flex items-center space-x-4">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => {
              console.log('Exporting analytics as CSV');
              // Implementation would generate and download CSV
            }}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button variant="outline" onClick={() => {
              console.log('Exporting analytics as PDF');
              // Implementation would generate and download PDF
            }}>
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.total_users.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.user_growth > 0 ? '+' : ''}{analytics.user_growth}% from last period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Match Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.total_events}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.event_growth > 0 ? '+' : ''}{analytics.event_growth}% from last period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cycling Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.total_cycling_events}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.cycling_event_growth > 0 ? '+' : ''}{analytics.cycling_event_growth}% from last period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₦{analytics.total_revenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.revenue_growth > 0 ? '+' : ''}{analytics.revenue_growth}% from last period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Venues</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.active_venues}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.venue_growth > 0 ? '+' : ''}{analytics.venue_growth}% from last period
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="venues">Top Venues</TabsTrigger>
            <TabsTrigger value="events">Top Match Events</TabsTrigger>
            <TabsTrigger value="cycling_events">Top Cycling Events</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Statistics</CardTitle>
                <CardDescription>Platform performance over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  {/* Add your chart component here */}
                  <p className="text-muted-foreground">Chart visualization coming soon</p>
                </div>
              </CardContent>
            </Card>

            {/* User Growth Chart */}
            <Card>
              <CardHeader>
                <CardTitle>User Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <Bar
                  data={{
                    labels: analytics.monthly_stats.map(stat => stat.month),
                    datasets: [{
                      label: 'New Users',
                      data: analytics.monthly_stats.map(stat => stat.users),
                      backgroundColor: '#4CAF50',
                      borderColor: '#388E3C',
                      borderWidth: 1
                    }]
                  }}
                  options={{
                    scales: {
                      y: { beginAtZero: true, title: { display: true, text: 'Users' } },
                      x: { title: { display: true, text: 'Month' } }
                    },
                    plugins: { title: { display: true, text: 'User Growth by Month', font: { family: 'Plus Jakarta Sans' } } }
                  }}
                />
              </CardContent>
            </Card>

            {/* Event Creation Trends Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Match Event Creation Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <Line
                  data={{
                    labels: analytics.monthly_stats.map(stat => stat.month),
                    datasets: [{
                      label: 'Match Events',
                      data: analytics.monthly_stats.map(stat => stat.events),
                      borderColor: '#2196F3',
                      tension: 0.1
                    }]
                  }}
                  options={{
                    scales: {
                      y: { beginAtZero: true, title: { display: true, text: 'Match Events' } },
                      x: { title: { display: true, text: 'Month' } }
                    },
                    plugins: { title: { display: true, text: 'Match Event Creation Trends', font: { family: 'Plus Jakarta Sans' } } }
                  }}
                />
              </CardContent>
            </Card>

            {/* Revenue Breakdown Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <Pie
                  data={{
                    labels: ['Tickets', 'Venue Bookings', 'Commissions'],
                    datasets: [{
                      data: [analytics.total_revenue * 0.6, analytics.total_revenue * 0.3, analytics.total_revenue * 0.1],
                      backgroundColor: ['#FFC107', '#FF5722', '#9C27B0']
                    }]
                  }}
                  options={{
                    plugins: { title: { display: true, text: 'Revenue Breakdown', font: { family: 'Plus Jakarta Sans' } } }
                  }}
                />
              </CardContent>
            </Card>

            {/* Top Sports by Event Count Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Top Sports by Event Count</CardTitle>
              </CardHeader>
              <CardContent>
                <Pie
                  data={{
                    labels: topSports.map(s => s.sport),
                    datasets: [{
                      data: topSports.map(s => s.count),
                      backgroundColor: ['#4CAF50', '#2196F3', '#FFC107', '#FF5722', '#9C27B0']
                    }]
                  }}
                  options={{
                    plugins: { title: { display: true, text: 'Top Sports', font: { family: 'Plus Jakarta Sans' } } }
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="venues" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Venues</CardTitle>
                <CardDescription>Venues with highest engagement and revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.top_venues.map((venue) => (
                    <div key={venue.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{venue.name}</p>
                        <p className="text-sm text-muted-foreground">{venue.events} events</p>
                      </div>
                      <p className="font-medium">₦{venue.revenue.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Venues by Bookings */}
            <Card>
              <CardHeader>
                <CardTitle>Top Venues by Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                <Bar
                  data={{
                    labels: analytics.top_venues.map(venue => venue.name),
                    datasets: [{
                      label: 'Bookings',
                      data: analytics.top_venues.map(venue => venue.events),
                      backgroundColor: '#FF9800'
                    }]
                  }}
                  options={{
                    scales: {
                      y: { beginAtZero: true, title: { display: true, text: 'Bookings' } },
                      x: { title: { display: true, text: 'Venue' } }
                    },
                    plugins: { title: { display: true, text: 'Top Venues by Bookings', font: { family: 'Plus Jakarta Sans' } } }
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Match Events</CardTitle>
                <CardDescription>Match events with highest participation and revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.top_events.map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{event.title}</p>
                        <p className="text-sm text-muted-foreground">{event.participants} participants</p>
                      </div>
                      <p className="font-medium">₦{event.revenue.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cycling_events" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Cycling Events</CardTitle>
                <CardDescription>Cycling events with highest participation and revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topCyclingEvents.map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{event.title}</p>
                        <p className="text-sm text-muted-foreground">{event.participants} participants</p>
                      </div>
                      <p className="font-medium">₦{event.revenue.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AnalyticsDashboard;
