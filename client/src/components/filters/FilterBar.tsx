import { useEffect, useRef } from 'react';
import { FilterOptions } from '@/lib/types';
import { 
  Card, 
  CardContent 
} from '@/components/ui/card';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';

interface FilterBarProps {
  filters: FilterOptions;
  onFilterChange: (filters: Partial<FilterOptions>) => void;
}

const FilterBar = ({ filters, onFilterChange }: FilterBarProps) => {
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Platform Filter */}
          <div>
            <Label htmlFor="platform-filter" className="text-sm mb-1">Platform</Label>
            <Select 
              value={filters.platform} 
              onValueChange={(value) => onFilterChange({ platform: value })}
            >
              <SelectTrigger id="platform-filter" className="bg-gray-50">
                <SelectValue placeholder="All Platforms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="X">X</SelectItem>
                <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                <SelectItem value="Instagram">Instagram</SelectItem>
                <SelectItem value="Facebook">Facebook</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Date Range Filter */}
          <div>
            <Label htmlFor="date-filter" className="text-sm mb-1">Date Range</Label>
            <Select 
              value={filters.dateRange} 
              onValueChange={(value) => onFilterChange({ dateRange: value })}
            >
              <SelectTrigger id="date-filter" className="bg-gray-50">
                <SelectValue placeholder="Upcoming" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Posts</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="tomorrow">Tomorrow</SelectItem>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="next-week">Next Week</SelectItem>
                <SelectItem value="later">Later</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Status Filter */}
          <div>
            <Label htmlFor="status-filter" className="text-sm mb-1">Status</Label>
            <Select 
              value={filters.status} 
              onValueChange={(value) => onFilterChange({ status: value })}
            >
              <SelectTrigger id="status-filter" className="bg-gray-50">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="needs_approval">Needs Approval</SelectItem>
                <SelectItem value="ready">Ready to Publish</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Search */}
          <div>
            <Label htmlFor="search-posts" className="text-sm mb-1">Search for keyword</Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                id="search-posts"
                type="text"
                placeholder="Search for keyword..."
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

export default FilterBar;