
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Download, TrendingUp, Users, Calendar, DollarSign } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';

const AnalyticsDashboard = () => {
  const [dateRange, setDateRange] = useState('30days');

  // Mock analytics data
  const userGrowthData = [
    { name: 'Week 1', users: 100 },
    { name: 'Week 2', users: 150 },
    { name: 'Week 3', users: 200 },
    { name: 'Week 4', users: 250 },
  ];

  const revenueData = [
    { name: 'Jan', tickets: 15000, venues: 25000, total: 40000 },
    { name: 'Feb', tickets: 18000, venues: 30000, total: 48000 },
    { name: 'Mar', tickets: 22000, venues: 28000, total: 50000 },
    { name: 'Apr', tickets: 25000, venues: 35000, total: 60000 },
    { name: 'May', tickets: 28000, venues: 32000, total: 60000 },
    { name: 'Jun', tickets: 30000, venues: 38000, total: 68000 },
  ];

  const sportsData = [
    { name: 'Football', value: 45, color: '#0088FE' },
    { name: 'Basketball', value: 25, color: '#00C49F' },
    { name: 'Tennis', value: 15, color: '#FFBB28' },
    { name: 'Volleyball', value: 10, color: '#FF8042' },
    { name: 'Others', value: 5, color: '#8884D8' },
  ];

  const topVenues = [
    { name: 'Lagos Pitch', bookings: 45, revenue: 225000 },
    { name: 'Victory Sports Complex', bookings: 38, revenue: 304000 },
    { name: 'Elite Tennis Club', bookings: 25, revenue: 87500 },
    { name: 'Abuja Football Center', bookings: 22, revenue: 176000 },
    { name: 'Port Harcourt Arena', bookings: 18, revenue: 108000 },
  ];

  const handleExportCSV = () => {
    console.log('Exporting analytics as CSV');
    // Implementation would generate and download CSV
  };

  const handleExportPDF = () => {
    console.log('Exporting analytics as PDF');
    // Implementation would generate and download PDF
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Platform performance and insights</p>
          </div>
          <div className="flex items-center space-x-4">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="90days">Last 90 days</SelectItem>
                <SelectItem value="1year">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button variant="outline" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2,847</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+12%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">156</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+8%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₦68,000</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+15%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+12.5%</div>
              <p className="text-xs text-muted-foreground">
                User growth this month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Growth Chart */}
          <Card>
            <CardHeader>
              <CardTitle>User Growth</CardTitle>
              <CardDescription>New users registered over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={userGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="users" fill="#4CAF50" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Revenue Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
              <CardDescription>Monthly revenue breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="tickets" stroke="#8884d8" name="Tickets" />
                  <Line type="monotone" dataKey="venues" stroke="#82ca9d" name="Venues" />
                  <Line type="monotone" dataKey="total" stroke="#ffc658" name="Total" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Sports Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Sports Distribution</CardTitle>
              <CardDescription>Events by sport type</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={sportsData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {sportsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Venues */}
          <Card>
            <CardHeader>
              <CardTitle>Top Venues</CardTitle>
              <CardDescription>Highest performing venues by bookings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topVenues.map((venue, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{venue.name}</p>
                      <p className="text-sm text-muted-foreground">{venue.bookings} bookings</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">₦{venue.revenue.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">revenue</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Conversion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">67.8%</div>
              <p className="text-sm text-muted-foreground">Users who join events</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Average Event Size</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">12.4</div>
              <p className="text-sm text-muted-foreground">Participants per event</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Platform Commission</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">₦8,450</div>
              <p className="text-sm text-muted-foreground">This month</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AnalyticsDashboard;
