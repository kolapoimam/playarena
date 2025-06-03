import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Eye, Ban, UserCheck } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { adminOperations } from '@/lib/admin';
import { supabase } from '@/lib/supabase';

const AdminUserManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch users
  useEffect(() => {
    const getUsers = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            *,
            events_organized:matches(count),
            events_participated:cycling_attendees(count),
            user_badges(badge_id!inner(badges(name)))
          `)
          .range(0, 49);

        if (error) throw error;

        // Fetch additional data from cycling_attendees, players, hosts, and organizers
        const { data: cyclingData, error: cyclingError } = await supabase
          .from('cycling_attendees')
          .select('*');

        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('*');

        const { data: hostsData, error: hostsError } = await supabase
          .from('hosts')
          .select('*');

        const { data: organizersData, error: organizersError } = await supabase
          .from('organizers')
          .select('*');

        if (cyclingError) throw cyclingError;
        if (playersError) throw playersError;
        if (hostsError) throw hostsError;
        if (organizersError) throw organizersError;

        // Merge the additional data into the profiles data
        const mergedData = data.map(profile => {
          const cyclingAttendee = cyclingData.find(ca => ca.user_id === profile.id);
          const player = playersData.find(p => p.user_id === profile.id);
          const host = hostsData.find(h => h.user_id === profile.id);
          const organizer = organizersData.find(o => o.user_id === profile.id);

          return {
            ...profile,
            cycling_attendee: cyclingAttendee,
            player: player,
            host: host,
            organizer: organizer
          };
        });

        setUsers(mergedData);
        setError(null);
      } catch (error) {
        console.error('Error fetching users:', error);
        setError('Failed to fetch users: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    getUsers();
  }, [statusFilter]);

  const handleSuspendUser = async (userId: string) => {
    try {
      await adminOperations.updateUserStatus(userId, 'suspended');
      setUsers(users.map(u => 
        u.id === userId ? { ...u, status: 'suspended' } : u
      ));
    } catch (err) {
      console.error('Error suspending user:', err);
      setError('Failed to suspend user');
    }
  };

  const handleActivateUser = async (userId: string) => {
    try {
      await adminOperations.updateUserStatus(userId, 'active');
      setUsers(users.map(u => 
        u.id === userId ? { ...u, status: 'active' } : u
      ));
    } catch (err) {
      console.error('Error activating user:', err);
      setError('Failed to activate user');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <p>Loading users...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-red-500">{error}</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage and monitor user accounts</p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Users</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="md:w-64"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Users ({filteredUsers.length})</CardTitle>
            <CardDescription>View and manage all user accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Matches</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono text-xs">{user.id}</TableCell>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone}</TableCell>
                    <TableCell>
                      <Badge variant={user.status === 'active' ? 'secondary' : 'destructive'}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>{user.matches[0]?.count || 0}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedUser(user)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>User Details</DialogTitle>
                              <DialogDescription>
                                View details for user {selectedUser?.id}
                              </DialogDescription>
                            </DialogHeader>
                            {selectedUser && (
                              <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm font-medium">Events Organized</p>
                                    <p className="text-2xl font-bold">{selectedUser.events_organized[0]?.count || 0}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Events Participated</p>
                                    <p className="text-2xl font-bold">{selectedUser.events_participated[0]?.count || 0}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Matches</p>
                                    <p className="text-2xl font-bold">{selectedUser.matches[0]?.count || 0}</p>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-sm font-medium mb-2">Badges Earned</p>
                                  <div className="flex flex-wrap gap-2">
                                    {selectedUser.badges.map((badge, index) => (
                                      <Badge key={index} variant="outline">{badge}</Badge>
                                    ))}
                                  </div>
                                </div>
                                {selectedUser.status === 'active' ? (
                                  <Button
                                    variant="destructive"
                                    onClick={() => handleSuspendUser(selectedUser.id)}
                                    className="w-full"
                                  >
                                    <Ban className="h-4 w-4 mr-2" />
                                    Suspend User
                                  </Button>
                                ) : (
                                  <Button
                                    variant="secondary"
                                    onClick={() => handleActivateUser(selectedUser.id)}
                                    className="w-full"
                                  >
                                    <UserCheck className="h-4 w-4 mr-2" />
                                    Activate User
                                  </Button>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        {user.status === 'active' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSuspendUser(user.id)}
                            className="text-yellow-600 hover:text-yellow-700"
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleActivateUser(user.id)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <UserCheck className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminUserManagement;
