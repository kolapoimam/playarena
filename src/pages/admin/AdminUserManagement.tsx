import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Eye, Ban, UserCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { adminOperations, AdminUser } from '@/lib/admin';

const AdminUserManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'last_7_days' | 'custom' | ''>('');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'Organizer' | 'Host' | 'Cycler' | 'Player' | 'Venue Owner' | 'User' | 'all'>('all');
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
          statusFilter === 'all' ? undefined : statusFilter,
          dateFilter || undefined,
          customDateStart || undefined,
          customDateEnd || undefined,
          categoryFilter === 'all' ? undefined : categoryFilter
        );
        setUsers(users);
        setTotalUsers(total);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch users. Please check the database schema and try again.');
        console.error('Error fetching users:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [currentPage, statusFilter, dateFilter, customDateStart, customDateEnd, categoryFilter]);

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
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.super_code && user.super_code.toLowerCase().includes(searchTerm.toLowerCase()));
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
                  <SelectItem value="User">User</SelectItem>
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
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.event_name || 'N/A'}</TableCell>
                    <TableCell>{user.venue_name || 'N/A'}</TableCell>
                    <TableCell>{user.value}</TableCell>
                    <TableCell>{user.slots_paid_for}</TableCell>
                    <TableCell>
                      {user.event_status ? (
                        <Badge variant={user.event_status === 'Checked In' ? 'secondary' : user.event_status === 'Registered' ? 'default' : 'destructive'}>
                          {user.event_status}
                        </Badge>
                      ) : 'N/A'}
                    </TableCell>
                    <TableCell>₦{user.total_earned.toLocaleString()}</TableCell>
                    <TableCell>₦{user.total_spent.toLocaleString()}</TableCell>
                    <TableCell>{user.super_code || 'N/A'}</TableCell>
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
                                View details for user {selectedUser?.name}
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
                                  <Button
                                    variant={selectedUser.status === 'active' ? 'destructive' : 'secondary'}
                                    onClick={() => selectedUser.status === 'active' ? handleSuspendUser(selectedUser.id) : handleActivateUser(selectedUser.id)}
                                    className="w-full"
                                  >
                                    {selectedUser.status === 'active' ? (
                                      <>
                                        <Ban className="h-4 w-4 mr-2" />
                                        Suspend User
                                      </>
                                    ) : (
                                      <>
                                        <UserCheck className="h-4 w-4 mr-2" />
                                        Activate User
                                      </>
                                    )}
                                  </Button>
                                  {/* Placeholder for additional actions */}
                                  <Button variant="outline" className="w-full">
                                    Custom Action
                                  </Button>
                                </div>
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
