
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, UserCheck, UserX, RotateCcw, Shield, ShieldCheck } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';

const AdminManagement = () => {
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('admin');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Mock admin data
  const admins = [
    {
      id: 'ADM-001',
      email: 'admin@sportcliq.com',
      role: 'super_admin',
      status: 'active',
      lastLogin: '2024-06-02 10:30',
      createdAt: '2024-01-01'
    },
    {
      id: 'ADM-002',
      email: 'manager@sportcliq.com',
      role: 'admin',
      status: 'active',
      lastLogin: '2024-06-01 15:45',
      createdAt: '2024-02-15'
    },
    {
      id: 'ADM-003',
      email: 'support@sportcliq.com',
      role: 'admin',
      status: 'inactive',
      lastLogin: '2024-05-20 09:15',
      createdAt: '2024-03-10'
    }
  ];

  const handleCreateAdmin = () => {
    console.log('Creating new admin:', { email: newAdminEmail, role: newAdminRole });
    // Implementation would create admin in database and send temporary password
    setNewAdminEmail('');
    setNewAdminPassword('');
    setNewAdminRole('admin');
    setShowCreateDialog(false);
  };

  const handleToggleStatus = (adminId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    console.log('Toggling admin status:', adminId, 'to:', newStatus);
    // Implementation would update admin status in database
  };

  const handleResetPassword = (adminId: string, email: string) => {
    console.log('Resetting password for admin:', adminId);
    // Implementation would generate temporary password and send via email
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'default' : 'destructive';
  };

  const getRoleIcon = (role: string) => {
    return role === 'super_admin' ? <ShieldCheck className="h-4 w-4" /> : <Shield className="h-4 w-4" />;
  };

  // Check if current user is super admin
  const adminSession = JSON.parse(localStorage.getItem('adminSession') || '{}');
  const isSuperAdmin = adminSession.role === 'super_admin';

  if (!isSuperAdmin) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold">Access Denied</h2>
            <p className="text-muted-foreground">You need super admin privileges to access this page.</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Admin Management</h1>
            <p className="text-muted-foreground">Manage administrator accounts and permissions</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Admin
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Admin</DialogTitle>
                <DialogDescription>
                  Add a new administrator to the system
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="admin@sportcliq.com"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Temporary Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    placeholder="Generate temporary password"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={newAdminRole} onValueChange={setNewAdminRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleCreateAdmin}
                  disabled={!newAdminEmail || !newAdminPassword}
                  className="w-full"
                >
                  Create Admin
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Admin Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {admins.filter(a => a.role === 'super_admin').length}
                </p>
                <p className="text-sm text-muted-foreground">Super Admins</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {admins.filter(a => a.status === 'active').length}
                </p>
                <p className="text-sm text-muted-foreground">Active Admins</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {admins.length}
                </p>
                <p className="text-sm text-muted-foreground">Total Admins</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admins Table */}
        <Card>
          <CardHeader>
            <CardTitle>Administrator Accounts</CardTitle>
            <CardDescription>Manage administrator access and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-mono text-xs">{admin.id}</TableCell>
                    <TableCell className="font-medium">{admin.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        {getRoleIcon(admin.role)}
                        {admin.role.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(admin.status)}>
                        {admin.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{admin.lastLogin}</TableCell>
                    <TableCell>{admin.createdAt}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(admin.id, admin.status)}
                          className={admin.status === 'active' ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                          disabled={admin.email === adminSession.email} // Can't deactivate self
                        >
                          {admin.status === 'active' ? (
                            <UserX className="h-4 w-4" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResetPassword(admin.id, admin.email)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
          <CardHeader>
            <CardTitle className="text-yellow-800 dark:text-yellow-200">Security Notice</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm text-yellow-700 dark:text-yellow-300">
              <li>All admin actions are logged and tracked for security purposes</li>
              <li>Temporary passwords should be changed upon first login</li>
              <li>Super admin privileges should be granted sparingly</li>
              <li>Inactive admins are automatically logged out of all sessions</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminManagement;
