
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Download, Eye, Filter } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';

const AuditLog = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [adminFilter, setAdminFilter] = useState('all');
  const [selectedAction, setSelectedAction] = useState<any>(null);

  // Mock audit log data
  const auditLogs = [
    {
      id: 'AUD-001',
      adminId: 'ADM-001',
      adminEmail: 'admin@sportcliq.com',
      actionType: 'USER_SUSPENDED',
      targetId: 'USR-002',
      targetType: 'user',
      details: {
        reason: 'Policy violation',
        previousStatus: 'active',
        newStatus: 'suspended'
      },
      timestamp: '2024-06-02 14:30:25',
      ipAddress: '192.168.1.100'
    },
    {
      id: 'AUD-002',
      adminId: 'ADM-002',
      adminEmail: 'manager@sportcliq.com',
      actionType: 'CASHOUT_APPROVED',
      targetId: 'CSH-001',
      targetType: 'cashout',
      details: {
        amount: 12500,
        organizer: 'John Doe',
        eventId: 'EVT-001'
      },
      timestamp: '2024-06-02 10:15:42',
      ipAddress: '192.168.1.101'
    },
    {
      id: 'AUD-003',
      adminId: 'ADM-001',
      adminEmail: 'admin@sportcliq.com',
      actionType: 'VENUE_VERIFIED',
      targetId: 'VEN-002',
      targetType: 'venue',
      details: {
        venueName: 'Victory Sports Complex',
        previousStatus: 'pending',
        newStatus: 'verified'
      },
      timestamp: '2024-06-01 16:45:18',
      ipAddress: '192.168.1.100'
    },
    {
      id: 'AUD-004',
      adminId: 'ADM-001',
      adminEmail: 'admin@sportcliq.com',
      actionType: 'EVENT_CANCELLED',
      targetId: 'EVT-003',
      targetType: 'event',
      details: {
        eventTitle: 'Basketball Tournament',
        reason: 'Venue unavailable',
        participantsRefunded: 15,
        refundAmount: 7500
      },
      timestamp: '2024-06-01 12:20:33',
      ipAddress: '192.168.1.100'
    },
    {
      id: 'AUD-005',
      adminId: 'ADM-002',
      adminEmail: 'manager@sportcliq.com',
      actionType: 'NOTIFICATION_SENT',
      targetId: 'NOT-001',
      targetType: 'notification',
      details: {
        type: 'push',
        target: 'all_users',
        message: 'Platform maintenance scheduled',
        recipients: 2847
      },
      timestamp: '2024-05-31 09:30:12',
      ipAddress: '192.168.1.101'
    }
  ];

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = log.actionType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.adminEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.targetId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter === 'all' || log.actionType === actionFilter;
    const matchesAdmin = adminFilter === 'all' || log.adminId === adminFilter;
    return matchesSearch && matchesAction && matchesAdmin;
  });

  const handleExportCSV = () => {
    console.log('Exporting audit logs as CSV');
    // Implementation would generate and download CSV
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'USER_SUSPENDED':
      case 'EVENT_CANCELLED':
        return 'destructive';
      case 'CASHOUT_APPROVED':
      case 'VENUE_VERIFIED':
        return 'default';
      case 'NOTIFICATION_SENT':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const uniqueActions = [...new Set(auditLogs.map(log => log.actionType))];
  const uniqueAdmins = [...new Set(auditLogs.map(log => ({ id: log.adminId, email: log.adminEmail })))];

  // Check if current user is super admin for export functionality
  const adminSession = JSON.parse(localStorage.getItem('adminSession') || '{}');
  const isSuperAdmin = adminSession.role === 'super_admin';

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Audit Log</h1>
            <p className="text-muted-foreground">Track all administrative actions and changes</p>
          </div>
          {isSuperAdmin && (
            <Button onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
        </div>

        {/* Audit Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {auditLogs.length}
                </p>
                <p className="text-sm text-muted-foreground">Total Actions</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {auditLogs.filter(log => log.timestamp.startsWith('2024-06-02')).length}
                </p>
                <p className="text-sm text-muted-foreground">Today</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {uniqueAdmins.length}
                </p>
                <p className="text-sm text-muted-foreground">Active Admins</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {uniqueActions.length}
                </p>
                <p className="text-sm text-muted-foreground">Action Types</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Search & Filter Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by action, admin, or target ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {uniqueActions.map(action => (
                    <SelectItem key={action} value={action}>
                      {action.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={adminFilter} onValueChange={setAdminFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by admin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Admins</SelectItem>
                  {uniqueAdmins.map(admin => (
                    <SelectItem key={admin.id} value={admin.id}>
                      {admin.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Audit Log Table */}
        <Card>
          <CardHeader>
            <CardTitle>Action Log ({filteredLogs.length})</CardTitle>
            <CardDescription>Detailed record of all administrative actions</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">{log.id}</TableCell>
                    <TableCell>{log.adminEmail}</TableCell>
                    <TableCell>
                      <Badge variant={getActionColor(log.actionType)}>
                        {log.actionType.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-mono text-xs">{log.targetId}</span>
                        <span className="text-xs text-muted-foreground">{log.targetType}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.timestamp}</TableCell>
                    <TableCell className="font-mono text-xs">{log.ipAddress}</TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedAction(log)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Action Details</DialogTitle>
                            <DialogDescription>
                              Detailed information about action {selectedAction?.id}
                            </DialogDescription>
                          </DialogHeader>
                          {selectedAction && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm font-medium">Action Type</p>
                                  <p className="text-lg">{selectedAction.actionType.replace('_', ' ')}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Performed By</p>
                                  <p className="text-lg">{selectedAction.adminEmail}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Target</p>
                                  <p className="text-lg">{selectedAction.targetId} ({selectedAction.targetType})</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">IP Address</p>
                                  <p className="text-lg">{selectedAction.ipAddress}</p>
                                </div>
                              </div>
                              
                              <div>
                                <p className="text-sm font-medium mb-2">Action Details</p>
                                <div className="bg-muted p-4 rounded-lg">
                                  <pre className="text-sm whitespace-pre-wrap">
                                    {JSON.stringify(selectedAction.details, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Retention Notice */}
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <CardHeader>
            <CardTitle className="text-blue-800 dark:text-blue-200">Data Retention Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Audit logs are retained for 12 months for security and compliance purposes. 
              Super administrators can export logs for external archival if needed.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AuditLog;
