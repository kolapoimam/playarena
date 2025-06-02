import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { Shield, Users, Calendar, DollarSign, AlertTriangle, BarChart, Settings, Bell } from 'lucide-react';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // First, sign in with Supabase auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // Then verify if the user is an admin
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('user_id', authData.user.id)
        .single();

      if (adminError || !adminData) {
        throw new Error('Unauthorized: Not an admin user');
      }

      // Store admin session
      const adminSession = {
        id: adminData.id,
        email: authData.user.email,
        role: adminData.role,
        permissions: adminData.permissions,
      };
      localStorage.setItem('adminSession', JSON.stringify(adminSession));

      // Log admin action
      await supabase.from('admin_actions').insert({
        admin_id: adminData.id,
        action: 'login',
        details: 'Admin logged in',
        ip_address: window.location.hostname,
      });

      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: <Users className="h-5 w-5" />,
      title: 'User Management',
      description: 'Manage user accounts, verify identities, and handle user-related issues.'
    },
    {
      icon: <Calendar className="h-5 w-5" />,
      title: 'Event Management',
      description: 'Oversee all events, handle disputes, and ensure smooth event operations.'
    },
    {
      icon: <DollarSign className="h-5 w-5" />,
      title: 'Financial Oversight',
      description: 'Monitor transactions, handle cashouts, and manage financial operations.'
    },
    {
      icon: <BarChart className="h-5 w-5" />,
      title: 'Analytics Dashboard',
      description: 'Access comprehensive analytics and insights about platform performance.'
    },
    {
      icon: <Settings className="h-5 w-5" />,
      title: 'System Settings',
      description: 'Configure platform settings, manage permissions, and system parameters.'
    },
    {
      icon: <Bell className="h-5 w-5" />,
      title: 'Notification Center',
      description: 'Send and manage system-wide notifications and alerts.'
    }
  ];

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      {/* Left Side - Feature Showcase */}
      <div className="hidden lg:flex lg:w-1/2 p-8">
        <Card className="w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-none shadow-xl">
          <CardHeader className="space-y-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <CardTitle className="text-2xl font-bold">Admin Dashboard</CardTitle>
            </div>
            <CardDescription className="text-lg">
              Welcome to the PlayArena Admin Portal. Access powerful tools to manage and monitor the platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{feature.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Warning Section */}
            <div className="mt-8 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-300">Important Notice</h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                    This is a restricted area. All actions are logged and monitored. Please ensure you have proper authorization before proceeding.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <Card className="w-full max-w-md bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-none shadow-xl">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <CardTitle className="text-2xl font-bold">Admin Login</CardTitle>
            </div>
            <CardDescription className="text-center">
              Enter your credentials to access the admin dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white dark:bg-gray-900"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white dark:bg-gray-900"
                />
              </div>
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600" 
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
