import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { 
  Home, 
  Users, 
  Calendar, 
  DollarSign, 
  Building2, 
  BarChart, 
  Bell, 
  FileText, 
  Settings,
  Menu,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import NotificationDropdown from './NotificationDropdown';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const adminSession = JSON.parse(localStorage.getItem('adminSession') || '{}');
  const isSuperAdmin = adminSession.role === 'super_admin';

  const menuItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: Home },
    { label: 'Users', path: '/admin/users', icon: Users },
    { label: 'Events', path: '/admin/events', icon: Calendar },
    { label: 'Cashouts', path: '/admin/cashouts', icon: DollarSign },
    { label: 'Venues', path: '/admin/venues', icon: Building2 },
    { label: 'Analytics', path: '/admin/analytics', icon: BarChart },
    { label: 'Notifications', path: '/admin/notifications', icon: Bell },
    { label: 'Audit Log', path: '/admin/audit', icon: FileText },
    { label: 'Profile', path: '/admin/profile', icon: User },
  ];

  if (isSuperAdmin) {
    menuItems.push({ label: 'Admins', path: '/admin/admins', icon: Settings });
  }

  const mobileMenuItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: Home },
    { label: 'Users', path: '/admin/users', icon: Users },
    { label: 'Events', path: '/admin/events', icon: Calendar },
    { label: 'Cashouts', path: '/admin/cashouts', icon: DollarSign },
    { label: 'Notifications', path: '/admin/notifications', icon: Bell },
    { label: 'Profile', path: '/admin/profile', icon: User },
  ];

  const handleLogout = () => {
    localStorage.removeItem('adminSession');
    navigate('/admin/login');
  };

  const Sidebar = ({ className }: { className?: string }) => (
    <div className={cn("bg-white dark:bg-gray-800 border-r h-full flex flex-col", className)}>
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          {!sidebarCollapsed && (
            <div className="flex items-center space-x-2">
              <img src="/playarenalight.png" alt="PlayArena" className="h-8 w-auto" />
              <span className="text-lg font-bold text-primary-light">Admin</span>
            </div>
          )}
          {sidebarCollapsed && (
            <img src="/playarenalight.png" alt="PlayArena" className="h-8 w-auto mx-auto" />
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden md:flex"
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </Button>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Button
                key={item.path}
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  sidebarCollapsed && "px-2",
                  isActive && "bg-primary-light text-white hover:bg-primary-light/90"
                )}
                onClick={() => {
                  navigate(item.path);
                  setMobileMenuOpen(false);
                }}
              >
                <item.icon className={cn("h-4 w-4", !sidebarCollapsed && "mr-2")} />
                {!sidebarCollapsed && item.label}
              </Button>
            );
          })}
        </div>
      </nav>

      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10",
            sidebarCollapsed && "px-2"
          )}
          onClick={handleLogout}
        >
          <LogOut className={cn("h-4 w-4", !sidebarCollapsed && "mr-2")} />
          {!sidebarCollapsed && "Logout"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Layout */}
      <div className="hidden md:block">
        <div className="flex">
          <div className={cn(
            "transition-all duration-300 fixed top-0 left-0 h-screen z-30",
            sidebarCollapsed ? "w-16" : "w-64"
          )}>
            <Sidebar />
          </div>
          <div className={cn(
            "flex-1 transition-all duration-300",
            sidebarCollapsed ? "ml-16" : "ml-64"
          )}>
            <header className="bg-white dark:bg-gray-800 border-b px-6 py-4 flex items-center justify-between sticky top-0 z-20">
              <h1 className="text-xl font-semibold">Admin Panel</h1>
              <div className="flex items-center space-x-4">
                <NotificationDropdown />
                <div className="text-sm text-muted-foreground">
                  {adminSession.email}
                </div>
              </div>
            </header>
            <main className="p-6">
              {children}
            </main>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden">
        <header className="bg-white dark:bg-gray-800 border-b px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <Sidebar />
            </SheetContent>
          </Sheet>
          
          <div className="flex items-center space-x-2">
            <img src="/playarenalight.png" alt="PlayArena" className="h-6 w-auto" />
            <span className="text-lg font-bold text-primary-light">Admin</span>
          </div>
          <NotificationDropdown />
        </header>

        <main className="p-4 pb-20">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t z-30">
          <div className="flex items-center justify-around py-2">
            {mobileMenuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Button
                  key={item.path}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "flex flex-col items-center justify-center h-12 w-12 p-0",
                    isActive && "text-primary-light"
                  )}
                  onClick={() => navigate(item.path)}
                >
                  <item.icon className="h-5 w-5" />
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
