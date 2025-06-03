import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Home, 
  Calendar, 
  BarChart3, 
  Settings, 
  Link as LinkIcon, 
  Menu, 
  X,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  
  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Connect', href: '/connect', icon: LinkIcon },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  const handleLogout = () => {
    logout();
  };
  
  const userInitials = user?.name 
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || 'U';
  
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Desktop Navigation */}
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <span className="ml-2 text-xl font-bold text-gray-900">Content Calendar</span>
              </Link>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:ml-6 md:flex md:space-x-4">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                      isActive(item.href)
                        ? 'text-blue-700 bg-blue-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-1.5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
          
          {/* User Menu */}
          <div className="flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-8 w-8 bg-blue-500 text-white cursor-pointer">
                  <AvatarFallback className="bg-blue-500 text-white">{userInitials}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white border border-gray-200 shadow-md">
                <div className="flex items-center justify-start gap-2 p-2 bg-white">
                  <div className="flex flex-col space-y-1 leading-none">
                    {user?.name && <p className="font-medium">{user.name}</p>}
                    {user?.email && <p className="w-[200px] truncate text-sm text-gray-500">{user.email}</p>}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 cursor-pointer bg-white hover:bg-gray-100">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Mobile menu button */}
            <div className="flex items-center md:hidden ml-4">
              <button
                type="button"
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <span className="sr-only">Open main menu</span>
                {isMobileMenuOpen ? (
                  <X className="block h-6 w-6" />
                ) : (
                  <Menu className="block h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-3 py-2 text-base font-medium ${
                    isActive(item.href)
                      ? 'text-blue-700 bg-blue-50 border-l-4 border-blue-500'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;