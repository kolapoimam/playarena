
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, Eye, Clock } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';

const CashoutManagement = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCashout, setSelectedCashout] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Mock cashout data
  const cashouts = [
    {
      id: 'CSH-001',
      organizerName: 'John Doe',
      organizerType: 'Event Organizer',
      amount: 12500,
      status: 'pending',
      requestedAt: '2024-06-02 10:30',
      eventDetails: '5-a-side Football Match',
      checkedInParticipants: 8,
      bankDetails: {
        accountName: 'John Doe',
        bankName: 'First Bank',
        accountNumber: '1234567890'
      }
    },
    {
      id: 'CSH-002',
      organizerName: 'Victory Sports Complex',
      organizerType: 'Venue Owner',
      amount: 25000,
      status: 'approved',
      requestedAt: '2024-06-01 14:20',
      eventDetails: 'Venue Booking Revenue',
      checkedInParticipants: 15,
      bankDetails: {
        accountName: 'Victory Sports Ltd',
        bankName: 'GTBank',
        accountNumber: '0987654321'
      }
    },
    {
      id: 'CSH-003',
      organizerName: 'Jane Smith',
      organizerType: 'Event Organizer',
      amount: 8750,
      status: 'rejected',
      requestedAt: '2024-05-30 16:45',
      eventDetails: 'Basketball Tournament',
      checkedInParticipants: 6,
      rejectionReason: 'Insufficient checked-in participants',
      bankDetails: {
        accountName: 'Jane Smith',
        bankName: 'UBA',
        accountNumber: '5678901234'
      }
    }
  ];

  const filteredCashouts = cashouts.filter(cashout => {
    return statusFilter === 'all' || cashout.status === statusFilter;
  });

  const handleApproveCashout = (cashoutId: string) => {
    console.log('Approving cashout:', cashoutId);
    // Implementation would approve cashout and initiate Paystack payout
  };

  const handleRejectCashout = (cashoutId: string, reason: string) => {
    console.log('Rejecting cashout:', cashoutId, 'Reason:', reason);
    // Implementation would reject cashout and send notification
    setRejectionReason('');
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
            <CardTitle>Cashout Requests ({filteredCashouts.length})</CardTitle>
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
                {filteredCashouts.map((cashout) => (
                  <TableRow key={cashout.id}>
                    <TableCell className="font-mono text-xs">{cashout.id}</TableCell>
                    <TableCell className="font-medium">{cashout.organizerName}</TableCell>
                    <TableCell>{cashout.organizerType}</TableCell>
                    <TableCell className="font-mono">₦{cashout.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(cashout.status)} className="flex items-center gap-1 w-fit">
                        {getStatusIcon(cashout.status)}
                        {cashout.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{cashout.requestedAt}</TableCell>
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
                                    <p className="text-lg">{selectedCashout.eventDetails}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Checked-in Participants</p>
                                    <p className="text-lg">{selectedCashout.checkedInParticipants}</p>
                                  </div>
                                </div>
                                
                                <div>
                                  <p className="text-sm font-medium mb-2">Bank Details</p>
                                  <div className="bg-muted p-4 rounded-lg space-y-2">
                                    <p><span className="font-medium">Account Name:</span> {selectedCashout.bankDetails.accountName}</p>
                                    <p><span className="font-medium">Bank:</span> {selectedCashout.bankDetails.bankName}</p>
                                    <p><span className="font-medium">Account Number:</span> {selectedCashout.bankDetails.accountNumber}</p>
                                  </div>
                                </div>

                                {selectedCashout.rejectionReason && (
                                  <div>
                                    <p className="text-sm font-medium mb-2">Rejection Reason</p>
                                    <p className="text-sm text-muted-foreground bg-destructive/10 p-3 rounded-lg">
                                      {selectedCashout.rejectionReason}
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
