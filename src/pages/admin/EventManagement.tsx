
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Eye, Ban, Trash2, Edit } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';

const EventManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sportFilter, setSportFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  // Mock event data
  const events = [
    {
      id: 'EVT-001',
      title: '5-a-side Football Match',
      sport: 'Football',
      organizer: 'John Doe',
      date: '2024-06-15',
      status: 'upcoming',
      participants: 8,
      venue: 'Lagos Pitch',
      ticketsSold: 15,
      feedback: 4.5
    },
    {
      id: 'EVT-002',
      title: 'Basketball Tournament',
      sport: 'Basketball',
      organizer: 'Jane Smith',
      date: '2024-06-20',
      status: 'active',
      participants: 12,
      venue: 'Victory Sports Complex',
      ticketsSold: 25,
      feedback: 4.2
    },
    {
      id: 'EVT-003',
      title: 'Tennis Singles',
      sport: 'Tennis',
      organizer: 'Mike Johnson',
      date: '2024-06-10',
      status: 'completed',
      participants: 2,
      venue: 'Elite Tennis Club',
      ticketsSold: 8,
      feedback: 4.8
    }
  ];

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.organizer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
    const matchesSport = sportFilter === 'all' || event.sport === sportFilter;
    return matchesSearch && matchesStatus && matchesSport;
  });

  const handleCancelEvent = (eventId: string) => {
    console.log('Cancelling event:', eventId);
    // Implementation would cancel event and process refunds
  };

  const handleDeleteEvent = (eventId: string) => {
    console.log('Deleting event:', eventId);
    // Implementation would delete event from database
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'default';
      case 'active': return 'secondary';
      case 'completed': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'default';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Event Management</h1>
          <p className="text-muted-foreground">Manage events and ensure policy compliance</p>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Search Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title or organizer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={sportFilter} onValueChange={setSportFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by sport" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sports</SelectItem>
                  <SelectItem value="Football">Football</SelectItem>
                  <SelectItem value="Basketball">Basketball</SelectItem>
                  <SelectItem value="Tennis">Tennis</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Events Table */}
        <Card>
          <CardHeader>
            <CardTitle>Events ({filteredEvents.length})</CardTitle>
            <CardDescription>All events on the platform</CardDescription>
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
                    <TableCell>{event.date}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(event.status)}>
                        {event.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{event.participants}</TableCell>
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
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Event Details</DialogTitle>
                              <DialogDescription>
                                Detailed information about {selectedEvent?.title}
                              </DialogDescription>
                            </DialogHeader>
                            {selectedEvent && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm font-medium">Venue</p>
                                    <p className="text-lg">{selectedEvent.venue}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Tickets Sold</p>
                                    <p className="text-lg">{selectedEvent.ticketsSold}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Participants</p>
                                    <p className="text-lg">{selectedEvent.participants}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Feedback Rating</p>
                                    <p className="text-lg">{selectedEvent.feedback}/5</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>

                        {event.status !== 'cancelled' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelEvent(event.id)}
                            className="text-yellow-600 hover:text-yellow-700"
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEvent(event.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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

export default EventManagement;
