import { useEffect } from 'react';
import { Link } from 'wouter';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileMenu = ({ isOpen, onClose }: MobileMenuProps) => {
  // Prevent scrolling when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 gap-0">
        <DialogTitle className="sr-only">Mobile Navigation Menu</DialogTitle>
        <div className="py-2">
          <Link 
            href="/" 
            onClick={onClose} 
            className="block px-4 py-3 text-base font-medium text-gray-900 hover:bg-gray-100 hover:text-blue-700"
          >
            Dashboard
          </Link>
          <Link 
            href="/calendar" 
            onClick={onClose} 
            className="block px-4 py-3 text-base font-medium text-gray-900 hover:bg-gray-100 hover:text-blue-700"
          >
            Calendar
          </Link>
          <Link 
            href="/connect" 
            onClick={onClose} 
            className="block px-4 py-3 text-base font-medium text-gray-900 hover:bg-gray-100 hover:text-blue-700"
          >
            Connect
          </Link>
          <Link 
            href="/reports" 
            onClick={onClose} 
            className="block px-4 py-3 text-base font-medium text-gray-900 hover:bg-gray-100 hover:text-blue-700"
          >
            Reports
          </Link>
          <Link 
            href="/settings" 
            onClick={onClose} 
            className="block px-4 py-3 text-base font-medium text-gray-900 hover:bg-gray-100 hover:text-blue-700"
          >
            Settings
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MobileMenu;