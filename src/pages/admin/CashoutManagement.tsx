import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, Eye, Clock } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { adminOperations, AdminCashout } from '@/lib/admin';

const CashoutManagement = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCashout, setSelectedCashout] = useState<AdminCashout | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [cashouts, setCashouts] = useState<AdminCashout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch cashouts
  useEffect(() => {
    const fetchCashouts = async () => {
      try {
        setLoading(true);
        const { cashouts } = await adminOperations.getCashouts(1, 50, statusFilter === 'all' ? undefined : statusFilter);
        setCashouts(cashouts);
        setError(null);
      } catch (err) {
        setError('Failed to fetch cashouts');
        console.error('Error fetching cashouts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCashouts();
  }, [statusFilter]);

  const handleApproveCashout = async (cashoutId: string) => {
    try {
      await adminOperations.updateCashoutStatus(cashoutId, 'approved');
      setCashouts(cashouts.map(c => 
        c.id === cashoutId ? { ...c, status: 'approved' } : c
      ));
    } catch (err) {
      console.error('Error approving cashout:', err);
      setError('Failed to approve cashout');
    }
  };

  const handleRejectCashout = async (cashoutId: string, reason: string) => {
    try {
      await adminOperations.updateCashoutStatus(cashoutId, 'rejected', reason);
      setCashouts(cashouts.map(c => 
        c.id === cashoutId ? { ...c, status: 'rejected', rejection_reason: reason } : c
      ));
      setRejectionReason('');
    } catch (err) {
      console.error('Error rejecting cashout:', err);
      setError('Failed to reject cashout');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'default';
      case 'approved': return 'secondary';
      case 'rejected': return 'destructive';
      case 'processed': return 'outline';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'approved': return <Check className="h-4 w-4" />;
      case 'rejected': return <X className="h-4 w-4" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <p>Loading cashouts...</p>
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
          <h1 className="text-3xl font-bold">Cashout Management</h1>
          <p className="text-muted-foreground">Review and process cashout requests</p>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {cashouts.filter(c => c.status === 'pending').length}
                </p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {cashouts.filter(c => c.status === 'approved').length}
                </p>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {cashouts.filter(c => c.status === 'rejected').length}
                </p>
                <p className="text-sm text-muted-foreground">Rejected</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold">
                  ₦{cashouts.reduce((sum, c) => sum + c.amount, 0).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Total Amount</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Cashouts</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Cashouts Table */}
        <Card>
          <CardHeader>
            <CardTitle>Cashout Requests ({cashouts.length})</CardTitle>
            <CardDescription>Manage cashout requests from organizers and venue owners</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Organizer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cashouts.map((cashout) => (
                  <TableRow key={cashout.id}>
                    <TableCell className="font-mono text-xs">{cashout.id}</TableCell>
                    <TableCell className="font-medium">{cashout.organizer_name}</TableCell>
                    <TableCell>{cashout.organizer_type}</TableCell>
                    <TableCell className="font-mono">₦{cashout.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(cashout.status)} className="flex items-center gap-1 w-fit">
                        {getStatusIcon(cashout.status)}
                        {cashout.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(cashout.requested_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedCashout(cashout)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Cashout Details</DialogTitle>
                              <DialogDescription>
                                Review cashout request {selectedCashout?.id}
                              </DialogDescription>
                            </DialogHeader>
                            {selectedCashout && (
                              <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm font-medium">Event/Venue Details</p>
                                    <p className="text-lg">{selectedCashout.event_details}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Checked-in Participants</p>
                                    <p className="text-lg">{selectedCashout.checked_in_participants}</p>
                                  </div>
                                </div>
                                
                                <div>
                                  <p className="text-sm font-medium mb-2">Bank Details</p>
                                  <div className="bg-muted p-4 rounded-lg space-y-2">
                                    <p><span className="font-medium">Account Name:</span> {selectedCashout.bank_details.account_name}</p>
                                    <p><span className="font-medium">Bank:</span> {selectedCashout.bank_details.bank_name}</p>
                                    <p><span className="font-medium">Account Number:</span> {selectedCashout.bank_details.account_number}</p>
                                  </div>
                                </div>

                                {selectedCashout.rejection_reason && (
                                  <div>
                                    <p className="text-sm font-medium mb-2">Rejection Reason</p>
                                    <p className="text-sm text-muted-foreground bg-destructive/10 p-3 rounded-lg">
                                      {selectedCashout.rejection_reason}
                                    </p>
                                  </div>
                                )}

                                {selectedCashout.status === 'pending' && (
                                  <div className="flex space-x-4">
                                    <Button
                                      onClick={() => handleApproveCashout(selectedCashout.id)}
                                      className="flex-1"
                                    >
                                      <Check className="h-4 w-4 mr-2" />
                                      Approve
                                    </Button>
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button variant="destructive" className="flex-1">
                                          <X className="h-4 w-4 mr-2" />
                                          Reject
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent>
                                        <DialogHeader>
                                          <DialogTitle>Reject Cashout</DialogTitle>
                                          <DialogDescription>
                                            Please provide a reason for rejecting this cashout request
                                          </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                          <Textarea
                                            placeholder="Enter rejection reason..."
                                            value={rejectionReason}
                                            onChange={(e) => setRejectionReason(e.target.value)}
                                          />
                                          <div className="flex space-x-2">
                                            <Button
                                              variant="destructive"
                                              onClick={() => handleRejectCashout(selectedCashout.id, rejectionReason)}
                                              disabled={!rejectionReason.trim()}
                                            >
                                              Reject Cashout
                                            </Button>
                                          </div>
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>

                        {cashout.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApproveCashout(cashout.id)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Reject Cashout</DialogTitle>
                                  <DialogDescription>
                                    Provide a reason for rejecting cashout {cashout.id}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <Textarea
                                    placeholder="Enter rejection reason..."
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                  />
                                  <Button
                                    variant="destructive"
                                    onClick={() => handleRejectCashout(cashout.id, rejectionReason)}
                                    disabled={!rejectionReason.trim()}
                                  >
                                    Reject Cashout
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
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
      </div>
    </AdminLayout>
  );
};

export default CashoutManagement;
