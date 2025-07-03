import { useEffect, useRef } from 'react';
import { FilterOptions } from '@/lib/types';
import { 
  Card, 
  CardContent 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';

interface SearchBarProps {
  filters: FilterOptions;
  onFilterChange: (filters: Partial<FilterOptions>) => void;
}

const SearchBar = ({ filters, onFilterChange }: SearchBarProps) => {
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce search input
  const handleSearchChange = (value: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      onFilterChange({ searchQuery: value });
    }, 300);
  };

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Card className="mb-6">
      <CardContent className="pt-4 pb-4">
        <div className="max-w-md">
          {/* Search */}
          <div>
            <Label htmlFor="search-posts" className="text-sm mb-1">Search posts</Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                id="search-posts"
                type="text"
                placeholder="Search posts..."
                className="pl-10 pr-4 py-2 bg-gray-50"
                defaultValue={filters.searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SearchBar;