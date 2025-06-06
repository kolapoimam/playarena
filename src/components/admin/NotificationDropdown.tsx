import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, DollarSign, Calendar, Building2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { adminOperations } from "@/lib/admin";

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<
    adminOperations["AdminNotification"][]
  >([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch initial notifications
    const fetchNotifications = async () => {
      try {
        const data = await adminOperations.getNotifications(10);
        setNotifications(data);
      } catch (err) {
        console.error("Error fetching notifications:", err);
      }
    };

    fetchNotifications();

    // Supabase subscription
    const subscription = supabase
      .channel('notifications')
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          setNotifications((prev) => [
            {
              id: payload.new.id,
              target_type: payload.new.target_type,
              category: payload.new.category,
              title: payload.new.title,
              message: payload.new.message,
              sent_at: payload.new.sent_at,
              link: payload.new.link || "/admin",
              unread: payload.new.unread,
            },
            ...prev,
          ].slice(0, 10));
        }
      )
      .subscribe();

    return () => {
      subscription.cancel();
    };
  }, []);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const handleNotificationClick = (notification: any) => {
    navigate(notification.link);
    setIsOpen(false);
    // Mark as read
    supabase
      .from("notifications")
        .update({ unread: false })
        .eq("id", notification.id)
        .then(() => {
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === notification.id ? { ...n, unread: false } : n
            )
          );
        });
  };

  const getIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "cashout":
        return <DollarSign className="h-4 w-4 text-muted-foreground" />;
      case "booking":
        return <Building2 className="h-4 w-4 text-muted-foreground" />;
      case "event":
        return <Calendar className="h-4 w-4 text-muted-foreground" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  }; // <-- Add this closing brace for getIcon

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
            <CardDescription>
              {unreadCount} unread notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-96">
              <div className="space-y-1">
                {notifications.length === 0 ? (
                  <p className="p-3 text-center text-muted-foreground">
                    No notifications
                  </p>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 cursor-pointer hover:bg-muted/50 border-b last:border-b-0 ${
                        notification.unread ? "bg-muted/20" : ""
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="mt-1">
                          {getIcon(notification.target_type)}
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
                            {new Date(notification.sent_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationDropdown;
