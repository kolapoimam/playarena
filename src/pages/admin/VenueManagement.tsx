
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Eye, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';

const VenueManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedVenue, setSelectedVenue] = useState<any>(null);

  // Mock venue data
  const venues = [
    {
      id: 'VEN-001',
      name: 'Lagos Pitch',
      location: 'Lagos, Nigeria',
      owner: 'John Doe',
      ownerContact: '+234-801-234-5678',
      verifiedStatus: 'verified',
      bookingFee: 5000,
      totalBookings: 45,
      lastBooking: '2024-06-01',
      rating: 4.5,
      documents: ['Certificate', 'Insurance', 'Photos']
    },
    {
      id: 'VEN-002',
      name: 'Victory Sports Complex',
      location: 'Abuja, Nigeria',
      owner: 'Jane Smith',
      ownerContact: '+234-802-345-6789',
      verifiedStatus: 'pending',
      bookingFee: 8000,
      totalBookings: 12,
      lastBooking: '2024-05-28',
      rating: 4.2,
      documents: ['Certificate', 'Photos']
    },
    {
      id: 'VEN-003',
      name: 'Elite Tennis Club',
      location: 'Port Harcourt, Nigeria',
      owner: 'Mike Johnson',
      ownerContact: '+234-803-456-7890',
      verifiedStatus: 'unverified',
      bookingFee: 3500,
      totalBookings: 8,
      lastBooking: '2024-05-25',
      rating: 3.8,
      documents: ['Photos']
    }
  ];

  const filteredVenues = venues.filter(venue => {
    const matchesSearch = venue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         venue.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         venue.owner.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || venue.verifiedStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleToggleVerification = (venueId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'verified' ? 'unverified' : 'verified';
    console.log('Toggling verification for venue:', venueId, 'to:', newStatus);
    // Implementation would update venue verification status
  };

  const handleDeleteVenue = (venueId: string) => {
    console.log('Deleting venue:', venueId);
    // Implementation would delete venue from database
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'default';
      case 'pending': return 'secondary';
      case 'unverified': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return <CheckCircle className="h-4 w-4" />;
      case 'unverified': return <XCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Venue Management</h1>
          <p className="text-muted-foreground">Verify and manage venue listings</p>
        </div>

        {/* Venue Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {venues.filter(v => v.verifiedStatus === 'verified').length}
                </p>
                <p className="text-sm text-muted-foreground">Verified</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {venues.filter(v => v.verifiedStatus === 'pending').length}
                </p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {venues.filter(v => v.verifiedStatus === 'unverified').length}
                </p>
                <p className="text-sm text-muted-foreground">Unverified</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {venues.reduce((sum, v) => sum + v.totalBookings, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Bookings</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Search Venues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, location, or owner..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="unverified">Unverified</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Venues Table */}
        <Card>
          <CardHeader>
            <CardTitle>Venues ({filteredVenues.length})</CardTitle>
            <CardDescription>All venue listings on the platform</CardDescription>
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
                  <TableHead>Bookings</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVenues.map((venue) => (
                  <TableRow key={venue.id}>
                    <TableCell className="font-mono text-xs">{venue.id}</TableCell>
                    <TableCell className="font-medium">{venue.name}</TableCell>
                    <TableCell>{venue.location}</TableCell>
                    <TableCell>{venue.owner}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(venue.verifiedStatus)} className="flex items-center gap-1 w-fit">
                        {getStatusIcon(venue.verifiedStatus)}
                        {venue.verifiedStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">₦{venue.bookingFee.toLocaleString()}</TableCell>
                    <TableCell>{venue.totalBookings}</TableCell>
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
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Venue Details</DialogTitle>
                              <DialogDescription>
                                Detailed information about {selectedVenue?.name}
                              </DialogDescription>
                            </DialogHeader>
                            {selectedVenue && (
                              <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm font-medium">Owner Contact</p>
                                    <p className="text-lg">{selectedVenue.ownerContact}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Total Bookings</p>
                                    <p className="text-lg">{selectedVenue.totalBookings}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Last Booking</p>
                                    <p className="text-lg">{selectedVenue.lastBooking}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Rating</p>
                                    <p className="text-lg">{selectedVenue.rating}/5</p>
                                  </div>
                                </div>
                                
                                <div>
                                  <p className="text-sm font-medium mb-2">Verification Documents</p>
                                  <div className="flex flex-wrap gap-2">
                                    {selectedVenue.documents.map((doc: string, index: number) => (
                                      <Badge key={index} variant="outline">{doc}</Badge>
                                    ))}
                                  </div>
                                </div>

                                <div className="flex space-x-4">
                                  <Button
                                    onClick={() => handleToggleVerification(selectedVenue.id, selectedVenue.verifiedStatus)}
                                    variant={selectedVenue.verifiedStatus === 'verified' ? 'destructive' : 'default'}
                                    className="flex-1"
                                  >
                                    {selectedVenue.verifiedStatus === 'verified' ? (
                                      <>
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Unverify
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Verify
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleVerification(venue.id, venue.verifiedStatus)}
                          className={venue.verifiedStatus === 'verified' ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                        >
                          {venue.verifiedStatus === 'verified' ? (
                            <XCircle className="h-4 w-4" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteVenue(venue.id)}
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

export default VenueManagement;
