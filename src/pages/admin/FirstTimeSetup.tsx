import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, AlertTriangle } from 'lucide-react';
import { adminOperations } from '@/lib/admin';
import { supabase } from '@/lib/supabase';

const FirstTimeSetup = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSetupAvailable, setIsSetupAvailable] = useState(false);

  useEffect(() => {
    const checkSetupAvailability = async () => {
      try {
        const { data: existingAdmins } = await supabase
          .from('admins')
          .select('id')
          .limit(1);

        setIsSetupAvailable(!existingAdmins || existingAdmins.length === 0);
      } catch (err) {
        setIsSetupAvailable(false);
      }
    };

    checkSetupAvailability();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      await adminOperations.createFirstAdmin(email, password, secretKey);
      navigate('/admin/login');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isSetupAvailable) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-playarena-50 to-playarena-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-none shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-center space-x-3 mb-4">
              <img src="/playarenalight.png" alt="Sport Cliq" className="h-12" />
              <CardTitle className="text-2xl font-bold text-playarena-600 dark:text-playarena-400">
                Setup Not Available
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Access Denied</AlertTitle>
              <AlertDescription>
                The admin setup has already been completed. Please use the regular admin login page.
              </AlertDescription>
            </Alert>
            <Button 
              className="w-full mt-4 bg-playarena-500 hover:bg-playarena-600 dark:bg-playarena-400 dark:hover:bg-playarena-500" 
              onClick={() => navigate('/admin/login')}
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-playarena-50 to-playarena-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-none shadow-xl">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <img src="/playarenalight.png" alt="Sport Cliq" className="h-12" />
            <CardTitle className="text-2xl font-bold text-playarena-600 dark:text-playarena-400">
              First-Time Setup
            </CardTitle>
          </div>
          <CardDescription className="text-center text-gray-600 dark:text-gray-300">
            Create the first admin account for the Sport Cliq platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="bg-white dark:bg-gray-900"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secretKey">Setup Secret Key</Label>
              <Input
                id="secretKey"
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
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
              {loading ? 'Creating Admin...' : 'Create Admin Account'}
            </Button>
          </form>

          <div className="mt-6 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div>
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-300">Important</h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                  This page is only accessible during the initial setup. Make sure to use a strong password and keep the secret key secure.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FirstTimeSetup; 