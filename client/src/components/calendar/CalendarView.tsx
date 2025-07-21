import { useEffect, useMemo } from 'react';
import { Post, PostsGroupedByDate, FilterOptions } from '@/lib/types';
import DateSection from './DateSection';
import { format, isToday, isTomorrow, addDays, isThisWeek, isAfter, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addWeeks, isBefore, isPast } from 'date-fns';

interface CalendarViewProps {
  posts: Post[];
  viewType: 'grid' | 'list';
  filters?: FilterOptions;
}

const CalendarView = ({ posts, viewType, filters }: CalendarViewProps) => {
  // Check if we're in the calendar view or dashboard view
  const isCalendarView = window.location.pathname.includes('/calendar');
  // Helper function to safely parse dates
  const safeParseDate = (dateString: string): Date => {
    try {
      return parseISO(dateString);
    } catch (error) {
      console.error('Error parsing date:', dateString, error);
      return new Date(); // Fallback to current date
    }
  };

  // Group posts by date based on filters
  const groupedPosts = useMemo(() => {
    const groups: PostsGroupedByDate[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    const tomorrow = addDays(today, 1);
    
    // Calculate this week's start and end (Monday to Sunday)
    const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    const thisWeekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Sunday
    
    // Next week starts the day after this week ends
    const nextWeekStart = startOfWeek(addWeeks(today, 1), { weekStartsOn: 1 });
    const nextWeekEnd = endOfWeek(addWeeks(today, 1), { weekStartsOn: 1 });
    
    // Filter out past posts if we're in dashboard view
    const filteredByDatePosts = isCalendarView 
      ? [...posts] // Show all posts in calendar view
      : posts.filter(post => {
          const postDate = safeParseDate(post.scheduledTime);
          // Keep posts that are today or in the future
          return isToday(postDate) || isAfter(postDate, today);
        });
    
    // Sort posts by scheduled time
    const sortedPosts = [...filteredByDatePosts].sort((a, b) => {
      return safeParseDate(a.scheduledTime).getTime() - safeParseDate(b.scheduledTime).getTime();
    });
    
    // Group posts by Today, Tomorrow, This Week, Next Week, Later
    const todayPosts: Post[] = [];
    const tomorrowPosts: Post[] = [];
    const thisWeekPosts: Post[] = [];
    const nextWeekPosts: Post[] = [];
    const laterPosts: Post[] = [];
    
    sortedPosts.forEach(post => {
      const postDate = safeParseDate(post.scheduledTime);
      
      if (isToday(postDate)) {
        todayPosts.push(post);
      } else if (isTomorrow(postDate)) {
        tomorrowPosts.push(post);
      } else if (isThisWeek(postDate, { weekStartsOn: 1 }) && isAfter(postDate, tomorrow)) {
        thisWeekPosts.push(post);
      } else if (
        // Check if date is in next week (between next week start and end)
        (isAfter(postDate, nextWeekStart) || postDate.getTime() === nextWeekStart.getTime()) && 
        (isBefore(postDate, nextWeekEnd) || postDate.getTime() === nextWeekEnd.getTime())
      ) {
        nextWeekPosts.push(post);
      } else if (isAfter(postDate, nextWeekEnd)) {
        laterPosts.push(post);
      } else {
        laterPosts.push(post);
      }
    });
    
    // Check if a specific date filter is selected
    const dateRange = filters?.dateRange || 'all';
    
    // Create sections based on date filter
    let sections = [];
    
    // If a specific date filter is selected, only include that section
    if (dateRange === 'today') {
      sections = [{ date: format(today, 'yyyy-MM-dd'), title: 'Today', posts: todayPosts }];
    } else if (dateRange === 'tomorrow') {
      sections = [{ date: format(tomorrow, 'yyyy-MM-dd'), title: 'Tomorrow', posts: tomorrowPosts }];
    } else if (dateRange === 'this-week') {
      sections = [{ date: 'this-week', title: 'This Week', posts: thisWeekPosts }];
    } else if (dateRange === 'next-week') {
      sections = [{ date: 'next-week', title: 'Next Week', posts: nextWeekPosts }];
    } else if (dateRange === 'later') {
      sections = [{ date: 'later', title: 'Later', posts: laterPosts }];
    } else {
      // For 'all' or any other date filter, include all sections
      sections = [
        { date: format(today, 'yyyy-MM-dd'), title: 'Today', posts: todayPosts },
        { date: format(tomorrow, 'yyyy-MM-dd'), title: 'Tomorrow', posts: tomorrowPosts },
        { date: 'this-week', title: 'This Week', posts: thisWeekPosts },
        { date: 'next-week', title: 'Next Week', posts: nextWeekPosts },
        { date: 'later', title: 'Later', posts: laterPosts }
      ];
    }
    
    // Apply platform filter to each section's posts
    if (filters?.platform && filters.platform !== 'all') {
      sections.forEach(section => {
        section.posts = section.posts.filter(post => post.platform === filters.platform);
      });
    }
    
    // Apply status filter to each section's posts
    if (filters?.status && filters.status !== 'all') {
      sections.forEach(section => {
        section.posts = section.posts.filter(post => post.status === filters.status);
      });
    }
    
    // Apply search filter to each section's posts
    if (filters?.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      sections.forEach(section => {
        section.posts = section.posts.filter(post => 
          post.content.toLowerCase().includes(query)
        );
      });
    }
    
    // Remove empty sections
    return sections.filter(section => section.posts.length > 0);
  }, [posts, filters]);


  return (
    <div className="space-y-5 mb-8">
      {groupedPosts.length > 0 ? (
        groupedPosts.map((group) => (
          <DateSection 
            key={group.date} 
            dateTitle={group.title} 
            posts={group.posts} 
            viewType={viewType}
          />
        ))
      ) : (
        <div className="text-center py-10">
          <p className="text-gray-500">No posts match your current filters.</p>
          {(filters?.platform || filters?.dateRange !== 'all' || filters?.status || filters?.searchQuery) && (
            <button 
              onClick={() => window.location.href = '/'}
              className="mt-4 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CalendarView;
