import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Search, Eye, Ban, Trash2, Edit } from 'lucide-react';
import { Label } from '@/components/ui/label';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import AdminLayout from '@/components/admin/AdminLayout';
import { adminOperations, AdminEvent } from '@/lib/admin';
import { supabase } from '@/integrations/supabase/client';

const EventManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sportFilter, setSportFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [customDateFrom, setCustomDateFrom] = useState<Date | null>(null);
  const [customDateTo, setCustomDateTo] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<AdminEvent | null>(null);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<{ title: string; date: string }>({ title: '', date: '' });
  const [adminRole, setAdminRole] = useState<'admin' | 'super_admin' | null>(null);

  // Fetch admin role
  const getAdminId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || 'placeholder-admin-id'; // Replace with actual auth logic
  };

  useEffect(() => {
    const fetchAdminRole = async () => {
      try {
        const adminId = await getAdminId();
        const { data, error } = await supabase
          .from('admins')
          .select('role')
          .eq('id', adminId)
          .single();
        if (error) throw error;
        setAdminRole(data.role);
      } catch (err) {
        console.error('Error fetching admin role:', err);
        setError('Failed to fetch admin role');
      }
    };
    fetchAdminRole();
  }, []);

  // Fetch events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        let dateFrom, dateTo;
        const now = new Date();
        if (dateFilter === 'today') {
          dateFrom = new Date(now.setHours(0, 0, 0, 0)).toISOString().split('T')[0];
          dateTo = dateFrom;
        } else if (dateFilter === 'last_7_days') {
          dateFrom = new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0];
          dateTo = new Date().toISOString().split('T')[0];
        } else if (dateFilter === 'custom' && customDateFrom && customDateTo) {
          dateFrom = customDateFrom.toISOString().split('T')[0];
          dateTo = customDateTo.toISOString().split('T')[0];
        }

        const { events } = await adminOperations.getEvents(
          1,
          50,
          statusFilter === 'all' ? undefined : statusFilter,
          sportFilter === 'all' ? undefined : sportFilter,
          dateFrom,
          dateTo
        );
        setEvents(events);
        setError(null);
      } catch (err) {
        setError('Failed to fetch events');
        console.error('Error fetching events:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [statusFilter, sportFilter, dateFilter, customDateFrom, customDateTo]);

  const handleCancelEvent = async (event: AdminEvent) => {
    try {
      await adminOperations.updateEventStatus(event.id, 'cancelled', event.type);
      setEvents(events.map(e => e.id === event.id ? { ...e, status: 'cancelled' } : e));
    } catch (err) {
      console.error('Error cancelling event:', err);
      setError('Failed to cancel event');
    }
  };

  const handleDeleteEvent = async (event: AdminEvent) => {
    try {
      const adminId = await getAdminId();
      await adminOperations.deleteEvent(event.id, event.type, adminId);
      setEvents(events.filter(e => e.id !== event.id));
    } catch (err) {
      console.error('Error deleting event:', err);
      setError('Failed to delete event');
    }
  };

  const handleEditEvent = async () => {
    if (!selectedEvent) return;
    try {
      const adminId = await getAdminId();
      await adminOperations.updateEvent(
        selectedEvent.id,
        selectedEvent.type,
        { title: editForm.title, date: editForm.date },
        adminId
      );
      setEvents(events.map(e =>
        e.id === selectedEvent.id ? { ...e, title: editForm.title, date: editForm.date } : e
      ));
      setIsEditDialogOpen(false);
    } catch (err) {
      console.error('Error editing event:', err);
      setError('Failed to edit event');
    }
  };

  const openEditDialog = (event: AdminEvent) => {
    setSelectedEvent(event);
    setEditForm({ title: event.title, date: event.date });
    setIsEditDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'default';
      case 'live':
      case 'active': return 'secondary';
      case 'completed':
      case 'passed': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'default';
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.organizer.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <p>Loading events...</p>
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
          <h1 className="text-3xl font-bold">Event Management</h1>
          <p className="text-muted-foreground">Manage and monitor all events</p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <Input
                placeholder="Search events..."
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
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="passed">Passed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sportFilter} onValueChange={setSportFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by sport" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sports</SelectItem>
                  <SelectItem value="Football">Football</SelectItem>
                  <SelectItem value="Basketball">Basketball</SelectItem>
                  <SelectItem value="Tennis">Tennis</SelectItem>
                  <SelectItem value="Volleyball">Volleyball</SelectItem>
                  <SelectItem value="Cycling">Cycling</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {dateFilter === 'custom' && (
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Label>From Date</Label>
                  <DatePicker
                    selected={customDateFrom}
                    onChange={(date: Date) => setCustomDateFrom(date)}
                    placeholderText="Select start date"
                  />
                </div>
                <div className="flex-1">
                  <Label>To Date</Label>
                  <DatePicker
                    selected={customDateTo}
                    onChange={(date: Date) => setCustomDateTo(date)}
                    placeholderText="Select end date"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Events Table */}
        <Card>
          <CardHeader>
            <CardTitle>Events ({filteredEvents.length})</CardTitle>
            <CardDescription>View and manage all events on the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Sport</TableHead>
                  <TableHead>Organizer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Participants</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-mono text-xs">{event.id}</TableCell>
                    <TableCell className="font-medium">{event.title}</TableCell>
                    <TableCell>{event.sport}</TableCell>
                    <TableCell>{event.organizer}</TableCell>
                    <TableCell>{new Date(event.date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(event.status)}>
                        {event.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{event.participants}</TableCell>
                    <TableCell>{event.venue}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedEvent(event)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Event Details</DialogTitle>
                              <DialogDescription>
                                View details for event {selectedEvent?.id}
                              </DialogDescription>
                            </DialogHeader>
                            {selectedEvent && (
                              <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm font-medium">Type</p>
                                    <p className="text-lg">{selectedEvent.type === 'match' ? 'Match' : 'Cycling Event'}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Venue</p>
                                    <p className="text-lg">{selectedEvent.venue}</p>
                                  </div>
                                  {selectedEvent.type === 'cycling_event' && (
                                    <>
                                      <div>
                                        <p className="text-sm font-medium">Start Landmark</p>
                                        <p className="text-lg">{selectedEvent.landmark || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium">End Landmark</p>
                                        <p className="text-lg">{selectedEvent.end_landmark || 'N/A'}</p>
                                      </div>
                                    </>
                                  )}
                                  <div>
                                    <p className="text-sm font-medium">Participants</p>
                                    <p className="text-2xl font-bold">{selectedEvent.participants}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Tickets Sold</p>
                                    <p className="text-2xl font-bold">{selectedEvent.tickets_sold}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Average Rating</p>
                                    <p className="text-2xl font-bold">{selectedEvent.feedback.toFixed(1)}</p>
                                  </div>
                                </div>

                                {selectedEvent.status === 'upcoming' && (
                                  <div className="flex space-x-4">
                                    <Button
                                      variant="outline"
                                      onClick={() => openEditDialog(selectedEvent)}
                                      className="flex-1"
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit Event
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      onClick={() => handleCancelEvent(selectedEvent)}
                                      className="flex-1"
                                    >
                                      <Ban className="h-4 w-2 mr-2" />
                                      Cancel Event
                                    </Button>
                                    {adminRole === 'super_admin' && (
                                      <Button
                                        variant="destructive"
                                        onClick={() => handleDeleteEvent(selectedEvent)}
                                        className="flex-1"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete Event
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>

                        {event.status === 'upcoming' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(event)}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelEvent(event)}
                              className="text-yellow-600 hover:text-yellow-700"
                            >
                              <Ban className="h-4 w-2" />
                            </Button>
                            {adminRole === 'super_admin' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteEvent(event)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Event Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Event</DialogTitle>
              <DialogDescription>
                Update details for {selectedEvent?.title}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-date">Date</Label>
                <DatePicker
                  selected={editForm.date ? new Date(editForm.date) : null}
                  onChange={(date: Date) => setEditForm({ ...editForm, date: date.toISOString().split('T')[0] })}
                  placeholderText="Select event date"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditEvent}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default EventManagement;
