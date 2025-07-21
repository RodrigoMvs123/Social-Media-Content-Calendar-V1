import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCalendarPosts } from "@/lib/api";
import { Post, FilterOptions } from "@/lib/types";
import { Helmet } from "react-helmet";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, addWeeks, isAfter, isBefore, parseISO, isToday, isTomorrow, isThisWeek, addDays } from "date-fns";

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
    dateRange: 'all', // Changed from 'upcoming' to 'all' to show all posts by default
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

  // We'll pass all posts to CalendarView and let it handle the filtering
  const filteredPosts = posts || [];

  // We'll handle this in the CalendarView component
  const hasPostsButFiltered = false;

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
            <CalendarView posts={filteredPosts} viewType={activeView} filters={filters} />
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