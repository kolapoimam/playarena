import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, AlertTriangle, Users, Calendar, DollarSign, Settings, Bell } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const features = [
  {
    icon: Users,
    title: 'User Management',
    description: 'Manage user accounts, permissions, and access levels'
  },
  {
    icon: Calendar,
    title: 'Event Management',
    description: 'Oversee all sporting events and activities'
  },
  {
    icon: DollarSign,
    title: 'Financial Oversight',
    description: 'Monitor transactions, cashouts, and revenue'
  },
  {
    icon: Settings,
    title: 'System Settings',
    description: 'Configure platform settings and preferences'
  },
  {
    icon: Bell,
    title: 'Notification Center',
    description: 'Manage system notifications and alerts'
  }
];

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
      // Check if admin exists and password matches
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('email', email)
        .single();

      if (adminError || !adminData) {
        throw new Error('Invalid login credentials');
      }

      // Verify password using Supabase's built-in crypto functions
      const { data: verifyData, error: verifyError } = await supabase
        .rpc('verify_admin_password', {
          admin_email: email,
          provided_password: password
        });

      if (verifyError || !verifyData) {
        throw new Error('Invalid login credentials');
      }

      // Store admin session
      localStorage.setItem('adminSession', JSON.stringify({
        id: adminData.id,
        email: adminData.email,
        role: adminData.role,
        status: adminData.status
      }));

      // Log admin action
      await supabase.from('audit_logs').insert({
        admin_id: adminData.id,
        action: 'login',
        details: 'Admin login successful',
        ip_address: window.location.hostname
      });

      // Update last_login timestamp
      await supabase
        .from('admins')
        .update({ last_login: new Date().toISOString() })
        .eq('id', adminData.id);

      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-playarena-50 to-playarena-100 dark:from-gray-900 dark:to-gray-800">
      {/* Left side - Feature showcase */}
      <div className="hidden lg:flex w-1/2 p-12 flex-col justify-between">
        <div className="space-y-8">
          <div className="flex items-center space-x-3">
            <img src="/playarenalight.png" alt="Sport Cliq" className="h-12" />
            <h1 className="text-2xl font-bold text-playarena-600 dark:text-playarena-400">Sport Cliq Admin</h1>
          </div>
          
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Welcome to Sport Cliq Admin Portal
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Manage your sports platform with powerful administrative tools
            </p>
          </div>

          <div className="grid gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex items-start space-x-4 p-4 rounded-lg bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-gray-800/80 transition-colors"
              >
                <feature.icon className="h-6 w-6 text-playarena-500 dark:text-playarena-400 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{feature.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div>
              <h4 className="font-semibold text-yellow-800 dark:text-yellow-300">Restricted Access</h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                This area is restricted to authorized administrators only. Unauthorized access attempts will be logged and reported.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <Card className="w-full max-w-md bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-none shadow-xl">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <img src="/playarenalight.png" alt="Sport Cliq" className="h-12" />
            </div>
            <CardTitle className="text-2xl font-bold text-center text-gray-900 dark:text-white">
              Admin Login
            </CardTitle>
            <CardDescription className="text-center text-gray-600 dark:text-gray-300">
              Sign in to access the Sport Cliq admin dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@sportcliq.com"
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
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button 
                type="submit" 
                className="w-full bg-playarena-500 hover:bg-playarena-600 dark:bg-playarena-400 dark:hover:bg-playarena-500" 
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
