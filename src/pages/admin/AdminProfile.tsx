import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Shield, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
// import { adminOperations } from '@/lib/admin'; // Assuming functions might be moved or added here later

interface AdminProfileData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
  avatar_url?: string;
  role?: string;
}

const AdminProfile = () => {
  const [profile, setProfile] = useState<AdminProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [adminId, setAdminId] = useState<string | null>(null);

  useEffect(() => {
    const sessionData = localStorage.getItem('adminSession');
    if (sessionData) {
      const parsedSession = JSON.parse(sessionData);
      // Ensure the path to admin ID is correct based on your actual session structure
      // It might be `parsedSession.id` or `parsedSession.user.id` or `parsedSession.user_id`
      setAdminId(parsedSession.id || parsedSession.user?.id || parsedSession.user_id);
    }
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!adminId) {
        // setError('Admin ID not found. Please log in again.');
        // setLoading(false); // Set loading to false if adminId is not yet available
        return; // Wait for adminId to be set
      }
      try {
        setLoading(true);
        setError(null);
        const { data, error: fetchError } = await supabase
          .from('admins')
          .select('id, first_name, last_name, email, created_at, avatar_url, role')
          .eq('id', adminId)
          .single();

        if (fetchError) throw fetchError;
        if (data) {
            setProfile(data as AdminProfileData);
            if (data.avatar_url) {
            setAvatarPreview(data.avatar_url);
            }
        } else {
            setError("Admin profile data not found.");
        }
        
      } catch (err: any) {
        console.error("Error fetching profile:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (adminId) { // Only fetch if adminId is available
        fetchProfile();
    }
  }, [adminId]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setPasswordSuccess('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
      // Optionally, log this action
      // await adminOperations.logAdminAction('password_reset', { adminId });
    } catch (err: any) {
      console.error("Error resetting password:", err);
      setPasswordError(err.message);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile || !adminId) return;
    setUploadingAvatar(true);
    try {
      // Ensure unique file name to prevent overwrites and caching issues
      const fileName = `${adminId}_${Date.now()}.${avatarFile.name.split('.').pop()}`;
      const filePath = `public/${fileName}`; // 'public' is often the default bucket for public avatars
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars') // Ensure 'avatars' bucket exists with appropriate RLS policies
        .upload(filePath, avatarFile, { upsert: true }); // upsert:true to overwrite if exists

      if (uploadError) throw uploadError;

      // Get public URL (ensure the path is correct)
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = urlData?.publicUrl;

      if (!publicUrl) throw new Error('Failed to get public URL for avatar.');

      // Update admin record in 'admins' table
      const { error: dbError } = await supabase
        .from('admins')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', adminId);

      if (dbError) throw dbError;

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      // Update localStorage if avatar_url is stored there for the header
      const sessionData = localStorage.getItem('adminSession');
      if (sessionData) {
        const parsedSession = JSON.parse(sessionData);
        parsedSession.avatar_url = publicUrl; // Or parsedSession.user.avatar_url if nested
        localStorage.setItem('adminSession', JSON.stringify(parsedSession));
        // Trigger a custom event to notify header to update, or use a global state management
        window.dispatchEvent(new CustomEvent('adminSessionUpdated'));
      }

      alert('Avatar updated successfully!');
      // Optionally, log this action
      // await adminOperations.logAdminAction('avatar_update', { adminId });

    } catch (err: any) {
      console.error("Error uploading avatar:", err);
      alert(`Failed to upload avatar: ${err.message}`);
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (!adminId && !loading) { // Show login prompt or redirect if not loading and no adminId
    return (
        <AdminLayout>
            <div className="p-6 text-center">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Session Error</AlertTitle>
                    <AlertDescription>Admin session not found. Please log in.</AlertDescription>
                </Alert>
                <Button onClick={() => window.location.href = '/admin/login'} className="mt-4">
                    Go to Login
                </Button>
            </div>
        </AdminLayout>
    );
  }

  if (loading) return <AdminLayout><div className="p-6">Loading profile...</div></AdminLayout>;
  if (error) return <AdminLayout><div className="p-6 text-red-500">Error: {error}</div></AdminLayout>;
  if (!profile) return <AdminLayout><div className="p-6">Admin profile not found.</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Profile</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>

        {/* Profile Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Your personal and account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
              <div className="relative">
                <Avatar className="h-24 w-24 ring-2 ring-primary ring-offset-2">
                  <AvatarImage src={avatarPreview || undefined} alt={`${profile.first_name || ''} ${profile.last_name || ''}`} />
                  <AvatarFallback className="text-2xl bg-primary/10">
                    {(profile.first_name?.[0] || 'A').toUpperCase()}{(profile.last_name?.[0] || 'D').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0">
                  <Label htmlFor="avatar-upload" className="cursor-pointer">
                    <div className="bg-primary text-primary-foreground rounded-full p-1.5 hover:bg-primary/90">
                      <User className="h-4 w-4" />
                    </div>
                  </Label>
                  <Input
                    id="avatar-upload"
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
              </div>
              <div className="flex-grow">
                {avatarFile && (
                  <Button onClick={handleAvatarUpload} disabled={uploadingAvatar} size="sm" className="mb-2">
                    {uploadingAvatar ? 'Uploading...' : 'Upload New Avatar'}
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">Recommended: Square image, &lt;1MB. Accepts PNG, JPG, WEBP.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" value={profile.first_name || 'N/A'} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" value={profile.last_name || 'N/A'} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={profile.email} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input id="role" value={profile.role || 'Admin'} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="joinedDate">Date Joined</Label>
                <Input id="joinedDate" value={new Date(profile.created_at).toLocaleDateString()} readOnly className="bg-muted" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reset Password Card */}
        <Card>
          <CardHeader>
            <CardTitle>Security Settings</CardTitle>
            <CardDescription>Update your password and security preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input 
                  id="newPassword" 
                  type="password" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  placeholder="Enter new password (min. 6 characters)"
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input 
                  id="confirmPassword" 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  placeholder="Confirm new password"
                  required 
                />
              </div>
              {passwordError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{passwordError}</AlertDescription>
                </Alert>
              )}
              {passwordSuccess && (
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>{passwordSuccess}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full sm:w-auto">Update Password</Button>
            </form>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
          <CardHeader>
            <CardTitle className="text-yellow-800 dark:text-yellow-200">Security Notice</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm text-yellow-700 dark:text-yellow-300">
              <li>Use a strong, unique password that you don't use elsewhere</li>
              <li>Enable two-factor authentication if available</li>
              <li>Keep your session secure and log out when done</li>
              <li>Report any suspicious activity immediately</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminProfile; 