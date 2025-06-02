
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, DollarSign, Calendar, Building2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  // Mock notifications
  const notifications = [
    {
      id: 1,
      type: 'cashout',
      title: 'New Cashout Request',
      message: 'Lagos Pitch owner requested ₦12,500 cashout',
      timestamp: '2 mins ago',
      icon: DollarSign,
      link: '/admin/cashouts',
      unread: true
    },
    {
      id: 2,
      type: 'booking',
      title: 'New Venue Booking',
      message: 'Victory Sports Complex booked for tomorrow',
      timestamp: '15 mins ago',
      icon: Building2,
      link: '/admin/venues',
      unread: true
    },
    {
      id: 3,
      type: 'event',
      title: 'Event Created',
      message: '5-a-side football match in Abuja',
      timestamp: '1 hour ago',
      icon: Calendar,
      link: '/admin/events',
      unread: false
    },
    {
      id: 4,
      type: 'alert',
      title: 'System Alert',
      message: 'High server load detected',
      timestamp: '2 hours ago',
      icon: AlertCircle,
      link: '/admin/analytics',
      unread: false
    }
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  const handleNotificationClick = (notification: any) => {
    navigate(notification.link);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Notifications</CardTitle>
            <CardDescription>{unreadCount} unread notifications</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-96">
              <div className="space-y-1">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 cursor-pointer hover:bg-muted/50 border-b last:border-b-0 ${
                      notification.unread ? 'bg-muted/20' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="mt-1">
                        <notification.icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium truncate">
                            {notification.title}
                          </p>
                          {notification.unread && (
                            <div className="w-2 h-2 bg-primary rounded-full ml-2 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notification.timestamp}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationDropdown;
