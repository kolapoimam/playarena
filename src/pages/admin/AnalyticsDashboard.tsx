import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, TrendingUp, Users, Calendar, DollarSign, Bell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import AdminLayout from '@/components/admin/AdminLayout';
import { adminOperations } from '@/lib/admin';
import { supabase } from '@/integrations/supabase/client';
import { Chart as ChartJS, BarElement, LineElement, PieController, ArcElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend } from 'chart.js';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import 'chart.js/auto';

// Register Chart.js components
ChartJS.register(BarElement, LineElement, PieController, ArcElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

const AnalyticsDashboard = () => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y' | 'custom'>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [analytics, setAnalytics] = useState<adminOperations.AdminMetrics | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userGrowthChartRef = useRef<HTMLCanvasElement>(null);
  const revenueChartRef = useRef<HTMLCanvasElement>(null);
  const sportsChartRef = useRef<HTMLCanvasElement>(null);
  let userGrowthChartInstance: ChartJS | null = null;
  let revenueChartInstance: ChartJS | null = null;
  let sportsChartInstance: ChartJS | null = null;

  // Fetch analytics and set up subscriptions
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await adminOperations.getAnalytics(timeRange, customStart, customEnd);
        setAnalytics(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();

    // Supabase subscriptions
    const subscriptions = [
      supabase
        .channel('profiles')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, () => fetchAnalytics())
        .subscribe(),
      supabase
        .channel('matches')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, () => fetchAnalytics())
        .subscribe(),
      supabase
        .channel('cycling_events')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cycling_events' }, () => fetchAnalytics())
        .subscribe(),
      supabase
        .channel('bookings')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' }, () => fetchAnalytics())
        .subscribe(),
      supabase
        .channel('notifications')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
          setNotifications((prev) => [
            {
              id: payload.new.id,
              title: payload.new.title,
              message: payload.new.message,
              created_at: payload.new.created_at
            },
            ...prev
          ].slice(0, 10));
        })
        .subscribe()
    ];

    return () => {
      subscriptions.forEach(sub => sub.unsubscribe());
    };
  }, [timeRange, customStart, customEnd]);

  // Initialize charts
  useEffect(() => {
    if (!analytics) return;

    // Destroy existing charts
    if (userGrowthChartInstance) userGrowthChartInstance.destroy();
    if (revenueChartInstance) revenueChartInstance.destroy();
    if (sportsChartInstance) sportsChartInstance.destroy();

    // User Growth Chart
    if (userGrowthChartRef.current) {
      userGrowthChartInstance = new ChartJS(userGrowthChartRef.current, {
        type: 'bar',
        data: {
          labels: analytics.user_growth.map(g => g.period),
          datasets: [{
            label: 'New Users',
            data: analytics.user_growth.map(g => g.count),
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: true } },
          scales: {
            y: { beginAtZero: true, title: { display: true, text: 'User Count' } },
            x: { title: { display: true, text: timeRange === '1y' ? 'Month' : 'Week' } }
          }
        }
      });
    }

    // Revenue Trends Chart
    if (revenueChartRef.current) {
      revenueChartInstance = new ChartJS(revenueChartRef.current, {
        type: 'line',
        data: {
          labels: analytics.event_trends.map(t => t.period),
          datasets: [
            {
              label: 'Match Revenue',
              data: analytics.event_trends.map(() => analytics.revenue_breakdown.match / analytics.event_trends.length),
              borderColor: 'rgba(59, 130, 246, 1)',
              fill: false
            },
            {
              label: 'Cycling Revenue',
              data: analytics.event_trends.map(() => analytics.revenue_breakdown.cycling / analytics.event_trends.length),
              borderColor: 'rgba(34, 197, 94, 1)',
              fill: false
            },
            {
              label: 'Venue Revenue',
              data: analytics.event_trends.map(() => analytics.revenue_breakdown.venue / analytics.event_trends.length),
              borderColor: 'rgba(234, 179, 8, 1)',
              fill: false
            }
          ]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: true } },
          scales: {
            y: { beginAtZero: true, title: { display: true, text: 'Revenue (₦)' } },
            x: { title: { display: true, text: timeRange === '1y' ? 'Month' : 'Week' } }
          }
        }
      });
    }

    // Sports Distribution Chart
    if (sportsChartRef.current) {
      sportsChartInstance = new ChartJS(sportsChartRef.current, {
        type: 'pie',
        data: {
          labels: analytics.top_sports.map(s => s.sport),
          datasets: [{
            data: analytics.top_sports.map(s => s.count),
            backgroundColor: [
              'rgba(59, 130, 246, 0.5)',
              'rgba(34, 197, 94, 0.5)',
              'rgba(234, 179, 8, 0.5)',
              'rgba(239, 68, 68, 0.5)',
              'rgba(168, 85, 247, 0.5)'
            ]
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: true, position: 'right' } }
        }
      });
    }

    return () => {
      if (userGrowthChartInstance) userGrowthChartInstance.destroy();
      if (revenueChartInstance) revenueChartInstance.destroy();
      if (sportsChartInstance) sportsChartInstance.destroy();
    };
  }, [analytics]);

  // Export as CSV
  const exportCSV = () => {
    if (!analytics) return;
    const data = [
      ['Metric', 'Value'],
      ['Total Users', analytics.total_users],
      ['Total Events', analytics.total_events],
      ['Total Revenue', `₦${analytics.total_revenue.toLocaleString()}`],
      ['Active Venues', analytics.active_venues],
      ['Match Revenue', `₦${analytics.revenue_breakdown.match.toLocaleString()}`],
      ['Cycling Revenue', `₦${analytics.revenue_breakdown.cycling.toLocaleString()}`],
      ['Venue Revenue', `₦${analytics.revenue_breakdown.venue.toLocaleString()}`],
      ['Match Commission', `₦${analytics.commission_breakdown.match.toLocaleString()}`],
      ['Cycling Commission', `₦${analytics.commission_breakdown.cycling.toLocaleString()}`],
      ['Venue Commission', `₦${analytics.commission_breakdown.venue.toLocaleString()}`],
      ...analytics.user_growth.map(g => ['User Growth', `${g.period}: ${g.count}`]),
      ...analytics.event_trends.map(t => ['Event Trends', `${t.period}: Matches ${t.match_count}, Cycling ${t.cycling_count}`]),
      ...analytics.top_sports.map(s => ['Top Sports', `${s.sport}: ${s.count}`]),
      ...analytics.top_venues.map(v => ['Top Venues', `${v.name}: ${v.bookings} bookings, ₦${v.revenue.toLocaleString()}`])
    ];
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'analytics.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export as PDF
  const exportPDF = () => {
    if (!analytics) return;
    const doc = new jsPDF();
    doc.setFont('Plus Jakarta Sans', 'normal');
    doc.text('Analytics Dashboard Report', 10, 10);
    let y = 20;
    doc.text(`Total Users: ${analytics.total_users}`, 10, y); y += 10;
    doc.text(`Total Events: ${analytics.total_events}`, 10, y); y += 10;
    doc.text(`Total Revenue: ₦${analytics.total_revenue.toLocaleString()}`, 10, y); y += 10;
    doc.text(`Active Venues: ${analytics.active_venues}`, 10, y); y += 10;
    doc.text('Revenue Breakdown:', 10, y); y += 10;
    doc.text(`  Match: ₦${analytics.revenue_breakdown.match.toLocaleString()}`, 10, y); y += 10;
    doc.text(`  Cycling: ₦${analytics.revenue_breakdown.cycling.toLocaleString()}`, 10, y); y += 10;
    doc.text(`  Venue: ₦${analytics.revenue_breakdown.venue.toLocaleString()}`, 10, y); y += 10;
    doc.text('Commission Breakdown:', 10, y); y += 10;
    doc.text(`  Match: ₦${analytics.commission_breakdown.match.toLocaleString()}`, 10, y); y += 10;
    doc.text(`  Cycling: ₦${analytics.commission_breakdown.cycling.toLocaleString()}`, 10, y); y += 10;
    doc.text(`  Venue: ₦${analytics.commission_breakdown.venue.toLocaleString()}`, 10, y); y += 10;
    doc.text('Top Sports:', 10, y); y += 10;
    analytics.top_sports.forEach(s => {
      doc.text(`  ${s.sport}: ${s.count}`, 10, y); y += 10;
    });
    doc.text('Top Venues:', 10, y); y += 10;
    analytics.top_venues.forEach(v => {
      doc.text(`  ${v.name}: ${v.bookings} bookings, ₦${v.revenue.toLocaleString()}`, 10, y); y += 10;
    });
    doc.save('analytics.pdf');
  };

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
      <div className="space-y-6 font-sans">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Platform performance and insights</p>
          </div>
          <div className="flex items-center space-x-4">
            <Select value={timeRange} onValueChange={(value) => setTimeRange(value as any)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
            {timeRange === 'custom' && (
              <div className="flex space-x-2">
                <Input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-40"
                />
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-40"
                />
              </div>
            )}
            <Button variant="outline" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button variant="outline" onClick={exportPDF}>
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="relative">
                  <Bell className="h-4 w-4 mr-2" />
                  Notifications
                  {notifications.length > 0 && (
                    <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-2">
                  <h4 className="font-medium">Notifications</h4>
                  {notifications.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No new notifications</p>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="p-2 border rounded">
                        <p className="font-medium">{n.title}</p>
                        <p className="text-sm">{n.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(n.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
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
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.total_events}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₦{analytics.total_revenue.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Venues</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.active_venues}</div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="venues">Top Venues</TabsTrigger>
            <TabsTrigger value="sports">Sports Distribution</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Growth</CardTitle>
                <CardDescription>New users over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <canvas ref={userGrowthChartRef} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
                <CardDescription>Revenue from matches, cycling, and venues</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <canvas ref={revenueChartRef} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
                <CardDescription>Revenue sources</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Match Revenue</span>
                    <span>₦{analytics.revenue_breakdown.match.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cycling Revenue</span>
                    <span>₦{analytics.revenue_breakdown.cycling.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Venue Revenue</span>
                    <span>₦{analytics.revenue_breakdown.venue.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Commission Breakdown</CardTitle>
                <CardDescription>Platform commissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Match Commission (5%)</span>
                    <span>₦{analytics.commission_breakdown.match.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cycling Commission (5%)</span>
                    <span>₦{analytics.commission_breakdown.cycling.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Venue Commission (10%)</span>
                    <span>₦{analytics.commission_breakdown.venue.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="venues" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Venues</CardTitle>
                <CardDescription>Venues with highest bookings and revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.top_venues.map((venue) => (
                    <div key={venue.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{venue.name}</p>
                        <p className="text-sm text-muted-foreground">{venue.bookings} bookings</p>
                      </div>
                      <p className="font-medium">₦{venue.revenue.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Sports Distribution</CardTitle>
                <CardDescription>Event counts by sport</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <canvas ref={sportsChartRef} />
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
