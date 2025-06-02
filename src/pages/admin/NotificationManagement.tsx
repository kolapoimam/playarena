
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Send, Mail, Smartphone, Users, User, Calendar } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';

const NotificationManagement = () => {
  const [notificationType, setNotificationType] = useState('push');
  const [targetType, setTargetType] = useState('all');
  const [message, setMessage] = useState('');
  const [targetId, setTargetId] = useState('');
  const [showSendDialog, setShowSendDialog] = useState(false);

  // Mock notification history
  const notificationHistory = [
    {
      id: 'NOT-001',
      target: 'All Users',
      message: 'Platform maintenance scheduled for tonight at 11 PM',
      type: 'push',
      sentAt: '2024-06-02 14:30',
      status: 'sent',
      recipients: 2847
    },
    {
      id: 'NOT-002',
      target: 'Event Participants (EVT-001)',
      message: 'Your football match has been rescheduled to tomorrow',
      type: 'email',
      sentAt: '2024-06-01 16:45',
      status: 'sent',
      recipients: 12
    },
    {
      id: 'NOT-003',
      target: 'User: john@example.com',
      message: 'Your cashout request has been approved',
      type: 'push',
      sentAt: '2024-06-01 10:20',
      status: 'sent',
      recipients: 1
    }
  ];

  const handleSendNotification = () => {
    console.log('Sending notification:', {
      type: notificationType,
      target: targetType,
      targetId,
      message
    });
    // Implementation would send notification via OneSignal or Resend
    setMessage('');
    setTargetId('');
    setShowSendDialog(false);
  };

  const getTypeIcon = (type: string) => {
    return type === 'email' ? <Mail className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />;
  };

  const getTargetIcon = (target: string) => {
    if (target.includes('All Users')) return <Users className="h-4 w-4" />;
    if (target.includes('Event')) return <Calendar className="h-4 w-4" />;
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
                    <Select value={notificationType} onValueChange={setNotificationType}>
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
                        targetType === 'user' ? 'Enter user email or ID' :
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
                    disabled={!message.trim() || (targetType !== 'all' && !targetId.trim())}
                  >
                    Send Notification
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Notification Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {notificationHistory.length}
                </p>
                <p className="text-sm text-muted-foreground">Total Sent</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {notificationHistory.filter(n => n.type === 'push').length}
                </p>
                <p className="text-sm text-muted-foreground">Push Notifications</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {notificationHistory.filter(n => n.type === 'email').length}
                </p>
                <p className="text-sm text-muted-foreground">Email Notifications</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {notificationHistory.reduce((sum, n) => sum + n.recipients, 0)}
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
                {notificationHistory.map((notification) => (
                  <TableRow key={notification.id}>
                    <TableCell className="font-mono text-xs">{notification.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTargetIcon(notification.target)}
                        <span className="truncate max-w-32">{notification.target}</span>
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
                    <TableCell>{notification.recipients}</TableCell>
                    <TableCell>{notification.sentAt}</TableCell>
                    <TableCell>
                      <Badge variant="default">
                        {notification.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Quick Templates */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Templates</CardTitle>
            <CardDescription>Pre-defined notification templates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  setTargetType('event');
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
