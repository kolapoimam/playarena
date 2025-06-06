import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Send, Mail, Smartphone, Users, User, Calendar, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { adminOperations, AdminNotification } from '@/lib/admin';
import AdminLayout from '@/components/admin/AdminLayout';
import { format } from 'date-fns';

const NotificationManagement = () => {
  const [notificationType, setNotificationType] = useState<'push' | 'email' | 'both'>('push');
  const [targetType, setTargetType] = useState('all');
  const [message, setMessage] = useState('');
  const [targetId, setTargetId] = useState('');
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [realTimeAlerts, setRealTimeAlerts] = useState<AdminNotification[]>([]);
  const [dateFilter, setDateFilter] = useState<'all' | '7d' | '30d' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [targetFilter, setTargetFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setIsLoading(true);
        const params: any = { limit: 50 };
        if (dateFilter !== 'all') {
          params.dateFilter = dateFilter;
          if (dateFilter === 'custom') {
            params.customStart = customStartDate;
            params.customEnd = customEndDate;
          }
        }
        if (targetFilter !== 'all') {
          params.targetType = targetFilter;
        }
        const data = await adminOperations.getNotifications(params);
        setNotifications(data);
      } catch (err: any) {
        toast.error(`Failed to fetch notifications: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchNotifications();
  }, [dateFilter, customStartDate, customEndDate, targetFilter]);

  // Real-time subscriptions
  useEffect(() => {
    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          setRealTimeAlerts(prev => [
            payload.new as AdminNotification,
            ...prev
          ].slice(0, 10));
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSendNotification = async () => {
    try {
      setIsLoading(true);
      await adminOperations.sendNotification(notificationType, targetType, targetId, message);
      toast.success('Notification sent successfully');
      setMessage('');
      setTargetId('');
      setShowSendDialog(false);
    } catch (err: any) {
      toast.error(`Failed to send notification: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    return type.includes('email') ? <Mail className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />;
  };

  const getTargetIcon = (target: string) => {
    if (target === 'all') return <Users className="h-4 w-4" />;
    if (target === 'event') return <Calendar className="h-4 w-4" />;
    return <User className="h-4 w-4" />;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Notification Management</h1>
            <p className="text-muted-foreground">Send and manage platform notifications</p>
          </div>
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="relative">
                  <Bell className="h-4 w-4 mr-2" />
                  Alerts
                  {realTimeAlerts.length > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0">
                      {realTimeAlerts.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                {realTimeAlerts.length === 0 ? (
                  <DropdownMenuItem disabled>No new alerts</DropdownMenuItem>
                ) : (
                  realTimeAlerts.map(n => (
                    <DropdownMenuItem key={n.id} asChild>
                      <a href={n.link} className="flex flex-col">
                        <span className="font-medium">{n.title}</span>
                        <span className="text-sm text-muted-foreground truncate">{n.message}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(n.sent_at), 'MMM d, yyyy HH:mm')}
                        </span>
                      </a>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Send className="h-4 w-4 mr-2" />
                  Send Notification
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Send Notification</DialogTitle>
                  <DialogDescription>
                    Compose and send a notification to users
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="type">Notification Type</Label>
                      <Select value={notificationType} onValueChange={(value: any) => setNotificationType(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="push">Push Notification</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="target">Target Audience</Label>
                      <Select value={targetType} onValueChange={setTargetType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Users</SelectItem>
                          <SelectItem value="user">Specific User</SelectItem>
                          <SelectItem value="event">Event Participants</SelectItem>
                          <SelectItem value="organizers">Event Organizers</SelectItem>
                          <SelectItem value="venue_owners">Venue Owners</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {targetType !== 'all' && (
                    <div>
                      <Label htmlFor="targetId">Target ID</Label>
                      <Input
                        id="targetId"
                        value={targetId}
                        onChange={(e) => setTargetId(e.target.value)}
                        placeholder={
                          targetType === 'user' ? 'Enter user ID' :
                          targetType === 'event' ? 'Enter event ID' :
                          'Enter target identifier'
                        }
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Enter your notification message..."
                      maxLength={500}
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {message.length}/500 characters
                    </p>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      Preview: This will be sent as a {notificationType} notification to{' '}
                      {targetType === 'all' ? 'all users' : `${targetType} target`}
                    </div>
                    <Button 
                      onClick={handleSendNotification}
                      disabled={!message.trim() || (targetType !== 'all' && !targetId.trim()) || isLoading}
                    >
                      {isLoading ? 'Sending...' : 'Send Notification'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Notification Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {notifications.length}
                </p>
                <p className="text-sm text-muted-foreground">Total Sent</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {notifications.filter(n => n.type === 'push').length}
                </p>
                <p className="text-sm text-muted-foreground">Push Notifications</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {notifications.filter(n => n.type === 'email').length}
                </p>
                <p className="text-sm text-muted-foreground">Email Notifications</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {notifications.reduce((sum, n) => sum + n.recipients, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Recipients</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notification History */}
        <Card>
          <CardHeader>
            <CardTitle>Notification History</CardTitle>
            <CardDescription>All sent notifications and their status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 mb-4">
              <Select value={dateFilter} onValueChange={(value: any) => setDateFilter(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Date Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
              {dateFilter === 'custom' && (
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    placeholder="Start date"
                  />
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    placeholder="End date"
                  />
                </div>
              )}
              <Select value={targetFilter} onValueChange={setTargetFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Target Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Targets</SelectItem>
                  <SelectItem value="user">Specific User</SelectItem>
                  <SelectItem value="event">Event Participants</SelectItem>
                  <SelectItem value="organizers">Event Organizers</SelectItem>
                  <SelectItem value="venue_owners">Venue Owners</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Sent At</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map((notification) => (
                  <TableRow key={notification.id}>
                    <TableCell className="font-mono text-xs">{notification.id.slice(0, 8)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTargetIcon(notification.target_type)}
                        <span className="truncate max-w-32">{notification.target_type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="truncate max-w-64" title={notification.message}>
                        {notification.message}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        {getTypeIcon(notification.type)}
                        {notification.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{notification.receivers}</TableCell>
                    <TableCell>{format(new Date(notification.created_at), 'MMM d, yyyy HH:mm')}</TableCell>
                    <TableCell>
                      <Badge variant={notification.status === 'sent' ? 'success' : 'destructive'}>
                        {notification.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {isLoading && <p className="text-center mt-4">Loading...</p>}
            {!isLoading && notifications.length === 0 && (
              <p className="text-center mt-4 text-muted-foreground">No notifications found</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Templates */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Templates</CardTitle>
            <CardDescription>Pre-defined notification templates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                className="h-auto p-4 text-left"
                onClick={() => {
                  setMessage('Platform maintenance is scheduled. We apologize for any inconvenience.');
                  setShowSendDialog(true);
                }}
              >
                <div>
                  <p className="font-medium">Maintenance Notice</p>
                  <p className="text-sm text-muted-foreground">Inform users about system maintenance</p>
                </div>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto p-4 text-left"
                onClick={() => {
                  setMessage('Your event has been updated. Please check the details.');
                  setTargetType('event'); // FIXED: use function call, not assignment
                  setShowSendDialog(true);
                }}
              >
                <div>
                  <p className="font-medium">Event Update</p>
                  <p className="text-sm text-muted-foreground">Notify participants about event changes</p>
                </div>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto p-4 text-left"
                onClick={() => {
                  setMessage('Welcome to SportCliq! Start exploring events in your area.');
                  setTargetType('user');
                  setShowSendDialog(true);
                }}
              >
                <div>
                  <p className="font-medium">Welcome Message</p>
                  <p className="text-sm text-muted-foreground">Welcome new users to the platform</p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default NotificationManagement;
