import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, DollarSign, AlertCircle, TrendingUp, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { adminOperations, AdminMetrics } from '@/lib/admin';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<AdminMetrics>({
    total_users: 0,
    total_events: 0,
    pending_cashouts: 0,
    total_revenue: 0,
    active_venues: 0,
    new_notifications: 0
  });

  // Fetch metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await adminOperations.getMetrics();
        if (data) {
          setMetrics(data);
        } else {
          // Fallback to default metrics if no data is returned
          setMetrics({
            total_users: 0,
            total_events: 0,
            pending_cashouts: 0,
            total_revenue: 0,
            active_venues: 0,
            new_notifications: 0
          });
        }
      } catch (error) {
        console.error('Error fetching metrics:', error);
        // Set default metrics on error to prevent UI from breaking
        setMetrics({
          total_users: 0,
          total_events: 0,
          pending_cashouts: 0,
          total_revenue: 0,
          active_venues: 0,
          new_notifications: 0
        });
      }
    };

    fetchMetrics();
    // Refresh metrics every 5 minutes
    const interval = setInterval(fetchMetrics, 300000);

    return () => clearInterval(interval);
  }, []);

  const quickActions = [
    { label: 'View Users', path: '/admin/users', icon: Users, color: 'bg-blue-500' },
    { label: 'View Events', path: '/admin/events', icon: Calendar, color: 'bg-primary-light' },
    { label: 'Review Cashouts', path: '/admin/cashouts', icon: DollarSign, color: 'bg-yellow-500' },
    { label: 'View Analytics', path: '/admin/analytics', icon: TrendingUp, color: 'bg-purple-500' },
    { label: 'Manage Venues', path: '/admin/venues', icon: Building2, color: 'bg-indigo-500' }
  ];

  const adminSession = JSON.parse(localStorage.getItem('adminSession') || '{}');
  const isSuperAdmin = adminSession.role === 'super_admin';

  if (isSuperAdmin) {
    quickActions.push({ 
      label: 'Manage Admins', 
      path: '/admin/admins', 
      icon: Users, 
      color: 'bg-red-500' 
    });
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {adminSession.email || 'Admin'}</p>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.total_users.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Active users</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.total_events}</div>
              <p className="text-xs text-muted-foreground">Active events</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Cashouts</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.pending_cashouts}</div>
              <p className="text-xs text-muted-foreground">Requires attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-primary-light" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₦{metrics.total_revenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total platform revenue</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Venues</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.active_venues}</div>
              <p className="text-xs text-muted-foreground">Verified venues</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className={`h-auto p-4 flex flex-col items-center justify-center space-y-2 ${action.color}`}
              onClick={() => navigate(action.path)}
            >
              <action.icon className="h-6 w-6" />
              <span>{action.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
