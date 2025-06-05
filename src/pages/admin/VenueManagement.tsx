import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Search, Eye, Check, X, MapPin, Phone, Mail, Trash2, ToggleRight } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { adminOperations, Venue } from '@/lib/admin';

const VenueManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [cities, setCities] = useState<string[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminRole, setAdminRole] = useState<'admin' | 'super_admin' | null>(null);

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

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        setLoading(true);
        setError(null);

        const { venues, total } = await adminOperations.getVenues(
          1,
          50,
          statusFilter,
          cityFilter
        );

        setVenues(venues);

        // Fetch unique cities for filter
        const { data: cityData } = await supabase
          .from('venues')
          .select('city')
          .distinct();
        setCities(cityData?.map(c => c.city) || []);
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching venues:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVenues();
  }, [statusFilter, cityFilter]);

  const handleVerifyVenue = async (venueId: string) => {
    try {
      const adminId = await getAdminId();
      await adminOperations.toggleVenueStatus(venueId, 'pending', adminId);
      setVenues(venues.map(v => 
        v.id === venueId ? { ...v, status: 'verified' } : v
      ));
    } catch (err: any) {
      setError(err.message);
      console.error('Error verifying venue:', err);
    }
  };

  const handleRejectVenue = async (venueId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('venues')
        .update({ status: 'rejected' })
        .eq('id', venueId);

      if (updateError) throw updateError;

      setVenues(venues.map(v => 
        v.id === venueId ? { ...v, status: 'rejected' } : v
      ));
    } catch (err: any) {
      setError(err.message);
      console.error('Error rejecting venue:', err);
    }
  };

  const handleToggleVenueStatus = async (venue: Venue) => {
    try {
      const adminId = await getAdminId();
      await adminOperations.toggleVenueStatus(venue.id, venue.status, adminId);
      setVenues(venues.map(v => 
        v.id === venue.id ? { ...v, status: v.status === 'verified' ? 'pending' : 'verified' } : v
      ));
    } catch (err: any) {
      setError(err.message);
      console.error('Error toggling venue status:', err);
    }
  };

  const handleDeleteVenue = async (venueId: string) => {
    try {
      const adminId = await getAdminId();
      await adminOperations.deleteVenue(venueId, adminId);
      setVenues(venues.filter(v => v.id !== venueId));
    } catch (err: any) {
      setError(err.message);
      console.error('Error deleting venue:', err);
    }
  };

  const filteredVenues = venues.filter(venue => {
    const matchesSearch = 
      venue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      venue.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      venue.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
      venue.owner_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <p>Loading venues...</p>
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
          <h1 className="text-3xl font-bold">Venue Management</h1>
          <p className="text-muted-foreground">Manage and verify sports venues</p>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {venues.filter(v => v.status === 'pending').length}
                </p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {venues.filter(v => v.status === 'verified').length}
                </p>
                <p className="text-sm text-muted-foreground">Verified</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {venues.filter(v => v.status === 'rejected').length}
                </p>
                <p className="text-sm text-muted-foreground">Rejected</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {venues.length}
                </p>
                <p className="text-sm text-muted-foreground">Total Venues</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Venues</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <Input
                placeholder="Search venues..."
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
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by city" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {cities.map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Venues Table */}
        <Card>
          <CardHeader>
            <CardTitle>Venues ({filteredVenues.length})</CardTitle>
            <CardDescription>View and manage all sports venues</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Booking Fee</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVenues.map((venue) => (
                  <TableRow key={venue.id}>
                    <TableCell className="font-mono text-xs">{venue.id}</TableCell>
                    <TableCell className="font-medium">{venue.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{venue.city}, {venue.state}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p>{venue.owner_name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span>{venue.owner_phone}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span>{venue.owner_email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          venue.status === 'verified'
                            ? 'default'
                            : venue.status === 'rejected'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {venue.status}
                      </Badge>
                    </TableCell>
                    <TableCell>₦{venue.booking_fee.toLocaleString()}</TableCell>
                    <TableCell>{venue.events_count}</TableCell>
                    <TableCell>₦{venue.revenue.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedVenue(venue)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl">
                            <DialogHeader>
                              <DialogTitle>Venue Details</DialogTitle>
                              <DialogDescription>
                                View details for {selectedVenue?.name}
                              </DialogDescription>
                            </DialogHeader>
                            {selectedVenue && (
                              <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm font-medium">Address</p>
                                    <p className="text-lg">{selectedVenue.address}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Location</p>
                                    <p className="text-lg">{selectedVenue.city}, {selectedVenue.state}</p>
                                  </div>
                                </div>

                                <div>
                                  <p className="text-sm font-medium mb-2">Owner Details</p>
                                  <div className="bg-muted p-4 rounded-lg space-y-2">
                                    <p><span className="font-medium">Name:</span> {selectedVenue.owner_name}</p>
                                    <p><span className="font-medium">Email:</span> {selectedVenue.owner_email}</p>
                                    <p><span className="font-medium">Phone:</span> {selectedVenue.owner_phone}</p>
                                  </div>
                                </div>

                                <div>
                                  <p className="text-sm font-medium mb-2">Booking History</p>
                                  {selectedVenue.booking_history.length > 0 ? (
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>ID</TableHead>
                                          <TableHead>Date</TableHead>
                                          <TableHead>Amount</TableHead>
                                          <TableHead>Status</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {selectedVenue.booking_history.map(booking => (
                                          <TableRow key={booking.id}>
                                            <TableCell>{booking.id}</TableCell>
                                            <TableCell>{new Date(booking.created_at).toLocaleDateString()}</TableCell>
                                            <TableCell>₦{booking.amount.toLocaleString()}</TableCell>
                                            <TableCell>{booking.status}</TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  ) : (
                                    <p className="text-muted-foreground">No booking history available</p>
                                  )}
                                </div>

                                <div>
                                  <p className="text-sm font-medium mb-2">Verification Documents</p>
                                  {selectedVenue.documents.length > 0 ? (
                                    <div className="space-y-2">
                                      {selectedVenue.documents.map(doc => (
                                        <div key={doc.id} className="flex items-center justify-between bg-muted p-2 rounded">
                                          <span>{doc.document_type}</span>
                                          <a href={doc.document_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                            View Document
                                          </a>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-muted-foreground">No documents uploaded</p>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm font-medium">Total Events</p>
                                    <p className="text-2xl font-bold">{selectedVenue.events_count}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Total Revenue</p>
                                    <p className="text-2xl font-bold">₦{selectedVenue.revenue.toLocaleString()}</p>
                                  </div>
                                </div>

                                <div className="flex space-x-4">
                                  {selectedVenue.status === 'pending' && (
                                    <>
                                      <Button
                                        onClick={() => handleVerifyVenue(selectedVenue.id)}
                                        className="flex-1"
                                      >
                                        <Check className="h-4 w-4 mr-2" />
                                        Verify Venue
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        onClick={() => handleRejectVenue(selectedVenue.id)}
                                        className="flex-1"
                                      >
                                        <X className="h-4 w-4 mr-2" />
                                        Reject Venue
                                      </Button>
                                    </>
                                  )}
                                  {selectedVenue.status !== 'rejected' && (
                                    <Button
                                      variant="outline"
                                      onClick={() => handleToggleVenueStatus(selectedVenue)}
                                      className="flex-1"
                                    >
                                      <ToggleRight className="h-4 w-4 mr-2" />
                                      Toggle Status
                                    </Button>
                                  )}
                                  {adminRole === 'super_admin' && (
                                    <Button
                                      variant="destructive"
                                      onClick={() => handleDeleteVenue(selectedVenue.id)}
                                      className="flex-1"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete Venue
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>

                        {venue.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleVerifyVenue(venue.id)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRejectVenue(venue.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {venue.status !== 'rejected' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleVenueStatus(venue)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <ToggleRight className="h-4 w-4" />
                          </Button>
                        )}
                        {adminRole === 'super_admin' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteVenue(venue.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
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

export default VenueManagement;
