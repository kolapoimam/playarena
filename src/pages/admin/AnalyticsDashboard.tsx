import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Download, TrendingUp, Users, Calendar, DollarSign } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { supabase } from '@/lib/supabase';

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
}

const AnalyticsDashboard = () => {
  const [timeRange, setTimeRange] = useState('30d');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const { data: topEvents, error: eventsError } = await supabase
          .from('matches')
          .select(`
            id,
            title,
            participants,
            revenue:tickets(sum(total_price))
          `)
          .order('participants', { ascending: false })
          .limit(5);

        if (eventsError) throw eventsError;

        setAnalytics({
          ...metrics,
          monthly_stats: monthlyStats.map(stat => stat.monthly_stats),
          top_venues: topVenues.map(venue => ({
            id: venue.id,
            name: venue.name,
            events: venue.events?.[0]?.count || 0,
            revenue: venue.revenue?.[0]?.sum || 0
          })),
          top_events: topEvents.map(event => ({
            id: event.id,
            title: event.title,
            participants: event.participants,
            revenue: event.revenue?.[0]?.sum || 0
          }))
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
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
      <div className="space-y-6">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
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
            <TabsTrigger value="events">Top Events</TabsTrigger>
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
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Events</CardTitle>
                <CardDescription>Events with highest participation and revenue</CardDescription>
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
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AnalyticsDashboard;
