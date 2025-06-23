import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCalendarPosts } from "@/lib/api";
import { Post, FilterOptions } from "@/lib/types";
import { Helmet } from "react-helmet";


import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CalendarView from "@/components/calendar/CalendarView";
import MonthCalendarView from "@/components/calendar/MonthCalendarView";
import SearchBar from "@/components/filters/SearchBar";
import AddPostDialog from "@/components/dialogs/AddPostDialog";
import PostDetailsDialog from "@/components/calendar/PostDetailsDialog";
import AIContentDialog from "@/components/dialogs/AIContentDialog";
import EmptyState from "@/components/calendar/EmptyState";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Plus, CalendarDays } from "lucide-react";
import { usePostContext } from "@/contexts/PostContext";

const Calendar = () => {
  const { 
    openAddPostDialog, 
    openAIDialog, 
    resetState 
  } = usePostContext();

  const [filters, setFilters] = useState<FilterOptions>({
    platform: '',
    dateRange: 'upcoming',
    status: '',
    searchQuery: '',
  });
  
  // State for post details dialog
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDatePosts, setSelectedDatePosts] = useState<Post[]>([]);
  const [isPostDetailsDialogOpen, setIsPostDetailsDialogOpen] = useState(false);
  


  const { data: posts, isLoading, isError, refetch } = useQuery({
    queryKey: ['/api/calendar'],
    queryFn: fetchCalendarPosts,
  });



  const handleFilterChange = (newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };
  
  const handleDateClick = (date: Date, postsOnDate: Post[]) => {
    setSelectedDate(date);
    setSelectedDatePosts(postsOnDate);
    setIsPostDetailsDialogOpen(true);
  };

  // Apply filters to posts (only search filter)
  const filteredPosts = posts?.filter((post: Post) => {
    // Filter by search query
    if (filters.searchQuery && !post.content.toLowerCase().includes(filters.searchQuery.toLowerCase())) {
      return false;
    }
    
    return true;
  }) || [];

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Calendar - Social Media Content Calendar</title>
        <meta name="description" content="View and manage your social media content calendar" />
      </Helmet>
      
      <Header />
      
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header with Actions */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div className="mb-4 md:mb-0">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <CalendarDays className="mr-2 h-6 w-6 text-blue-600" />
                  Content Calendar
                </h2>
                <p className="text-gray-600 mt-1">View and manage your scheduled social media posts</p>
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
                    resetState();
                    openAddPostDialog();
                  }}
                  className="border border-gray-300 text-gray-800"
                >
                  <Plus className="h-5 w-5 mr-2 text-blue-600" />
                  Add New Post
                </Button>
              </div>
            </div>
          </div>

          {/* Search */}
          <SearchBar filters={filters} onFilterChange={handleFilterChange} />

          {/* View Label */}
          <div className="flex justify-end mb-6">
            <div className="flex items-center text-sm font-medium text-gray-700">
              <CalendarDays size={16} className="mr-1" />
              Month
            </div>
          </div>
          
          {/* Calendar Content */}
          {isLoading ? (
            <div className="text-center py-10">
              <p className="text-gray-500">Loading posts...</p>
            </div>
          ) : isError ? (
            <div className="text-center py-20">
              <div className="max-w-md mx-auto">
                <div className="mb-6">
                  <CalendarDays className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Unable to load your content</h3>
                  <p className="text-gray-600">We're having trouble connecting to your calendar. Let's get you started with creating your first post!</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={() => setIsAddPostDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Post
                  </Button>
                  <Button variant="outline" onClick={() => refetch()}>
                    Try Again
                  </Button>
                </div>
              </div>
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
            <MonthCalendarView 
              posts={filteredPosts} 
              onDateClick={handleDateClick}
            />
          )}
        </div>
      </main>
      
      <Footer />
      
      <AddPostDialog />
      
      <PostDetailsDialog
        open={isPostDetailsDialogOpen}
        onOpenChange={setIsPostDetailsDialogOpen}
        posts={selectedDatePosts}
        date={selectedDate}
        onPostDeleted={() => refetch()}
      />
      
      <AIContentDialog />
    </div>
  );
};

export default Calendar;