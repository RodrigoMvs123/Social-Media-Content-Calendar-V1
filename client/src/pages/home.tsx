import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCalendarPosts } from "@/lib/api";
import { Post, FilterOptions } from "@/lib/types";
import { Helmet } from "react-helmet";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, addWeeks, isAfter, isBefore, parseISO } from "date-fns";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CalendarView from "@/components/calendar/CalendarView";
import FilterBar from "@/components/filters/FilterBar";
import AddPostDialog from "@/components/dialogs/AddPostDialog";
import AIContentDialog from "@/components/dialogs/AIContentDialog";
import EmptyState from "@/components/calendar/EmptyState";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Plus, LayoutGrid, List } from "lucide-react";
import { usePostContext } from "@/contexts/PostContext";

const Home = () => {
  const { 
    openAddPostDialog, 
    openAIDialog, 
    resetState 
  } = usePostContext();
  
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<FilterOptions>({
    platform: '',
    dateRange: 'upcoming',
    status: '',
    searchQuery: '',
  });

  const { data: posts, isLoading, isError, refetch } = useQuery({
    queryKey: ['/api/calendar'],
    queryFn: fetchCalendarPosts,
  });

  // Force refetch posts when component mounts or becomes visible
  useEffect(() => {
    const refetchPosts = () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar'] });
      refetch();
    };

    // Refetch when component mounts
    refetchPosts();

    // Refetch when window gains focus
    window.addEventListener('focus', refetchPosts);
    
    return () => {
      window.removeEventListener('focus', refetchPosts);
    };
  }, [queryClient, refetch]);

  const handleFilterChange = (newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // Apply filters to posts
  const filteredPosts = posts?.filter((post: Post) => {
    // Filter by platform
    if (filters.platform && filters.platform !== 'all' && post.platform !== filters.platform) {
      return false;
    }
    
    // Filter by status
    if (filters.status && filters.status !== 'all' && post.status !== filters.status) {
      return false;
    }
    
    // Filter by search query
    if (filters.searchQuery && !post.content.toLowerCase().includes(filters.searchQuery.toLowerCase())) {
      return false;
    }
    
    // Filter by date range (but allow past posts if filtering by published status)
    if (filters.dateRange && filters.status !== 'published') {
      const postDate = parseISO(post.scheduledTime);
      const now = new Date();
      
      switch (filters.dateRange) {
        case 'upcoming':
          // Show posts scheduled for today or in the future
          // Fix: Create a new Date object to avoid modifying the original now variable
          const today = new Date(now);
          today.setHours(0, 0, 0, 0);
          return isAfter(postDate, today) || postDate.getTime() === today.getTime();
          
        case 'this-week':
          // Show posts scheduled for this week
          const thisWeekStart = startOfWeek(new Date(now), { weekStartsOn: 1 }); // Monday
          const thisWeekEnd = endOfWeek(new Date(now), { weekStartsOn: 1 });
          return (isAfter(postDate, thisWeekStart) || postDate.getTime() === thisWeekStart.getTime()) && 
                 (isBefore(postDate, thisWeekEnd) || postDate.getTime() === thisWeekEnd.getTime());
          
        case 'next-week':
          // Show posts scheduled for next week
          const nextWeekStart = startOfWeek(addWeeks(new Date(now), 1), { weekStartsOn: 1 });
          const nextWeekEnd = endOfWeek(addWeeks(new Date(now), 1), { weekStartsOn: 1 });
          return (isAfter(postDate, nextWeekStart) || postDate.getTime() === nextWeekStart.getTime()) && 
                 (isBefore(postDate, nextWeekEnd) || postDate.getTime() === nextWeekEnd.getTime());
          
        case 'this-month':
          // Show posts scheduled for this month
          const thisMonthStart = startOfMonth(new Date(now));
          const thisMonthEnd = endOfMonth(new Date(now));
          return (isAfter(postDate, thisMonthStart) || postDate.getTime() === thisMonthStart.getTime()) && 
                 (isBefore(postDate, thisMonthEnd) || postDate.getTime() === thisMonthEnd.getTime());
      }
    }
    
    return true;
  }) || [];

  // Check if we have posts but they're all filtered out
  const hasPostsButFiltered = posts && posts.length > 0 && filteredPosts.length === 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Social Media Content Calendar</title>
        <meta name="description" content="Plan and schedule your social media content with our calendar app" />
      </Helmet>
      
      <Header />
      
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header with Actions */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div className="mb-4 md:mb-0">
                <p className="text-xl font-medium text-gray-900">Plan and schedule your social media content</p>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={openAIDialog}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  Generate AI Content
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    resetState(); // Reset any previous state
                    openAddPostDialog(); // Open empty dialog
                  }}
                  className="border border-gray-300 text-gray-800"
                >
                  <Plus className="h-5 w-5 mr-2 text-blue-600" />
                  Add New Post
                </Button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <FilterBar filters={filters} onFilterChange={handleFilterChange} />

          {/* View Toggle */}
          <div className="flex justify-end mb-6">
            <Tabs defaultValue={activeView} onValueChange={(value) => setActiveView(value as 'grid' | 'list')}>
              <TabsList>
                <TabsTrigger value="list" className="flex items-center">
                  <List size={16} className="mr-1" />
                  List
                </TabsTrigger>
                <TabsTrigger value="grid" className="flex items-center">
                  <LayoutGrid size={16} className="mr-1" />
                  Grid
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          {/* Calendar Content */}
          {isLoading ? (
            <div className="text-center py-10">
              <p className="text-gray-500">Loading posts...</p>
            </div>
          ) : isError ? (
            <div className="text-center py-10">
              <p className="text-red-500">Error loading calendar. Try again later.</p>
              <Button variant="outline" onClick={() => refetch()} className="mt-4">
                Retry
              </Button>
            </div>
          ) : hasPostsButFiltered ? (
            <div className="text-center py-10">
              <p className="text-gray-500">No posts match your current filters.</p>
              <Button 
                variant="outline" 
                onClick={() => setFilters({
                  platform: '',
                  dateRange: 'upcoming',
                  status: '',
                  searchQuery: '',
                })} 
                className="mt-4"
              >
                Clear Filters
              </Button>
            </div>
          ) : filteredPosts.length === 0 ? (
            <EmptyState 
              onCreatePost={() => {
                resetState();
                openAddPostDialog();
              }}
              onGenerateWithAI={() => {
                resetState();
                openAIDialog();
              }}
            />
          ) : (
            <CalendarView posts={filteredPosts} viewType={activeView} />
          )}
        </div>
      </main>
      
      <Footer />
      
      {/* Dialogs are now controlled by context */}
      <AddPostDialog />
      <AIContentDialog />
    </div>
  );
};

export default Home;