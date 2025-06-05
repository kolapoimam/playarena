import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { adminOperations } from '@/lib/admin';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  event_name: string | null;
  venue_name: string | null;
  value: string;
  slots_paid_for: number;
  event_status: 'Registered' | 'Checked In' | 'Absent' | null;
  total_earned: number;
  total_spent: number;
  super_code: string | null;
  confirmation_code: string | null;
  access_pin: string | null;
  last_cashout: string | null;
  last_activity: string;
  category: 'Organizer' | 'Host' | 'Cycler' | 'Player' | 'Venue Owner';
  events_organized: number;
  events_participated: number;
  badges: string[];
  event_id: string | null;
  event_type: 'match' | 'cycling' | null;
}

const AdminUserManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'Organizer' | 'Host' | 'Cycler' | 'Player' | 'Venue Owner' | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'last_7_days' | 'custom' | ''>('');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const usersPerPage = 20;

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const { users, total } = await adminOperations.getUsers(
          currentPage,
          usersPerPage,
          categoryFilter === 'all' ? undefined : categoryFilter,
          dateFilter || undefined,
          customDateStart || undefined,
          customDateEnd || undefined
        );
        setUsers(users);
        setTotalUsers(total);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch users.');
        console.error('Error fetching users:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [currentPage, categoryFilter, dateFilter, customDateStart, customDateEnd]);

  // Handle status update
  const handleStatusUpdate = async (userId: string, eventType: 'match' | 'cycling' | null, eventId: string | null, newStatus: 'Registered' | 'Checked In' | 'Absent') => {
    if (!eventType || !eventId) {
      setError('Event type or ID missing for status update.');
      return;
    }
    try {
      await adminOperations.updateUserStatus(userId, eventType, eventId, newStatus);
      setUsers(users.map(u =>
        u.id === userId && u.event_id === eventId ? { ...u, event_status: newStatus } : u
      ));
      if (selectedUser?.id === userId && selectedUser.event_id === eventId) {
        setSelectedUser({ ...selectedUser, event_status: newStatus });
      }
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update user status');
    }
  };

  // Handle custom action
  const handleCustomAction = async (userId: string, actionType: string, targetTable: string) => {
    try {
      await adminOperations.performCustomAction(userId, actionType, { targetTable });
      console.log(`Performed ${actionType} for user ${userId} on ${targetTable}`);
    } catch (err) {
      console.error('Error performing custom action:', err);
      setError('Failed to perform action');
    }
  };

  // Filter users by search term
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.super_code && user.super_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.confirmation_code && user.confirmation_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.access_pin && user.access_pin.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const totalPages = Math.ceil(totalUsers / usersPerPage);

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
                placeholder="Search by name, super code, or confirmation code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="md:w-64"
              />
              <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as any)}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Organizer">Organizer</SelectItem>
                  <SelectItem value="Host">Host</SelectItem>
                  <SelectItem value="Cycler">Cycler</SelectItem>
                  <SelectItem value="Player">Player</SelectItem>
                  <SelectItem value="Venue Owner">Venue Owner</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={(value) => setDateFilter(value as any)}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Date Filter</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                  <SelectItem value="custom">Custom Date</SelectItem>
                </SelectContent>
              </Select>
              {dateFilter === 'custom' && (
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={customDateStart}
                    onChange={(e) => setCustomDateStart(e.target.value)}
                    className="w-full md:w-48"
                  />
                  <Input
                    type="date"
                    value={customDateEnd}
                    onChange={(e) => setCustomDateEnd(e.target.value)}
                    className="w-full md:w-48"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Users ({filteredUsers.length} of {totalUsers})</CardTitle>
            <CardDescription>View and manage all user accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Venue/Landmark</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Slots Paid For</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Earned</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>Super Code</TableHead>
                  <TableHead>Last Cashout</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={`${user.id}-${user.event_id}`}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.event_name || 'N/A'}</TableCell>
                    <TableCell>{user.venue_name || 'N/A'}</TableCell>
                    <TableCell>{user.value}</TableCell>
                    <TableCell>{user.slots_paid_for}</TableCell>
                    <TableCell>
                      {user.event_status ? (
                        <Select
                          value={user.event_status}
                          onValueChange={(value) => handleStatusUpdate(user.id, user.event_type, user.event_id, value as 'Registered' | 'Checked In' | 'Absent')}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Registered">Registered</SelectItem>
                            <SelectItem value="Checked In">Checked In</SelectItem>
                            <SelectItem value="Absent">Absent</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : 'N/A'}
                    </TableCell>
                    <TableCell>₦{user.total_earned.toLocaleString()}</TableCell>
                    <TableCell>₦{user.total_spent.toLocaleString()}</TableCell>
                    <TableCell>{user.super_code || user.confirmation_code || user.access_pin || 'N/A'}</TableCell>
                    <TableCell>{user.last_cashout ? new Date(user.last_cashout).toLocaleString() : 'N/A'}</TableCell>
                    <TableCell>{new Date(user.last_activity).toLocaleString()}</TableCell>
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
                          <DialogContent className="max-w-3xl rounded-xl">
                            <DialogHeader>
                              <DialogTitle>User Details</DialogTitle>
                              <DialogDescription>
                                View and manage details for {selectedUser?.name}
                              </DialogDescription>
                            </DialogHeader>
                            {selectedUser && (
                              <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm font-medium">Name</p>
                                    <p className="text-lg">{selectedUser.name}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Email</p>
                                    <p className="text-lg">{selectedUser.email}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Phone</p>
                                    <p className="text-lg">{selectedUser.phone || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Category</p>
                                    <p className="text-lg">{selectedUser.category}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Events Organized</p>
                                    <p className="text-lg">{selectedUser.events_organized}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Events Participated</p>
                                    <p className="text-lg">{selectedUser.events_participated}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Total Earned</p>
                                    <p className="text-lg">₦{selectedUser.total_earned.toLocaleString()}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Total Spent</p>
                                    <p className="text-lg">₦{selectedUser.total_spent.toLocaleString()}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Super Code</p>
                                    <p className="text-lg">{selectedUser.super_code || selectedUser.confirmation_code || selectedUser.access_pin || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Last Cashout</p>
                                    <p className="text-lg">{selectedUser.last_cashout ? new Date(selectedUser.last_cashout).toLocaleString() : 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Last Activity</p>
                                    <p className="text-lg">{new Date(selectedUser.last_activity).toLocaleString()}</p>
                                  </div>
                                  {selectedUser.event_status && (
                                    <div>
                                      <p className="text-sm font-medium">Event Status</p>
                                      <Select
                                        value={selectedUser.event_status}
                                        onValueChange={(value) => handleStatusUpdate(selectedUser.id, selectedUser.event_type, selectedUser.event_id, value as 'Registered' | 'Checked In' | 'Absent')}
                                      >
                                        <SelectTrigger className="w-[120px]">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="Registered">Registered</SelectItem>
                                          <SelectItem value="Checked In">Checked In</SelectItem>
                                          <SelectItem value="Absent">Absent</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-medium mb-2">Badges Earned</p>
                                  <div className="flex flex-wrap gap-2">
                                    {selectedUser.badges.map((badge, index) => (
                                      <Badge key={index} variant="outline">{badge}</Badge>
                                    ))}
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <Select
                                    onValueChange={(value) => handleCustomAction(selectedUser.id, value, selectedUser.event_type === 'match' ? 'user_joined_matches' : selectedUser.event_type === 'cycling' ? 'user_joined_cycling' : 'profiles')}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Select Custom Action" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="suspend">Suspend User</SelectItem>
                                      <SelectItem value="activate">Activate User</SelectItem>
                                      <SelectItem value="reset_password">Reset Password</SelectItem>
                                      <SelectItem value="send_notification">Send Notification</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    variant="outline"
                                    onClick={() => handleCustomAction(selectedUser.id, 'custom_action', selectedUser.event_type === 'match' ? 'user_joined_matches' : selectedUser.event_type === 'cycling' ? 'user_joined_cycling' : 'profiles')}
                                  >
                                    Perform Action
                                  </Button>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {/* Pagination Controls */}
            <div className="flex justify-between items-center mt-4">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <span>Page {currentPage} of {totalPages}</span>
              <Button
                variant="outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminUserManagement;
