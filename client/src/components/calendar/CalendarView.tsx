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
    
    // Always group posts by Today, Tomorrow, This Week, Next Week, Later
    // regardless of the filter, but respect the filter for which posts are shown
    const todayPosts: Post[] = [];
    const tomorrowPosts: Post[] = [];
    const thisWeekPosts: Post[] = [];
    const nextWeekPosts: Post[] = [];
    const laterPosts: Post[] = [];
    
    sortedPosts.forEach(post => {
      const postDate = safeParseDate(post.scheduledTime);
      
      // Debug log to help identify issues
      console.log(`Categorizing post: ${post.id}, date: ${post.scheduledTime}, parsed: ${postDate}`);
      
      if (isToday(postDate)) {
        console.log(`Post ${post.id} categorized as Today`);
        todayPosts.push(post);
      } else if (isTomorrow(postDate)) {
        console.log(`Post ${post.id} categorized as Tomorrow`);
        tomorrowPosts.push(post);
      } else if (isThisWeek(postDate, { weekStartsOn: 1 }) && isAfter(postDate, tomorrow)) {
        console.log(`Post ${post.id} categorized as This Week`);
        thisWeekPosts.push(post);
      } else if (
        // Check if date is in next week (between next week start and end)
        (isAfter(postDate, nextWeekStart) || postDate.getTime() === nextWeekStart.getTime()) && 
        (isBefore(postDate, nextWeekEnd) || postDate.getTime() === nextWeekEnd.getTime())
      ) {
        console.log(`Post ${post.id} categorized as Next Week`);
        nextWeekPosts.push(post);
      } else if (isAfter(postDate, nextWeekEnd)) {
        console.log(`Post ${post.id} categorized as Later (after next week)`);
        laterPosts.push(post);
      } else {
        console.warn(`Post ${post.id} has unexpected date categorization:`, post.scheduledTime);
        laterPosts.push(post);
      }
    });
    
    // Always add all groups, even if empty, to maintain consistent UI
    groups.push({ date: format(today, 'yyyy-MM-dd'), title: 'Today', posts: todayPosts });
    groups.push({ date: format(tomorrow, 'yyyy-MM-dd'), title: 'Tomorrow', posts: tomorrowPosts });
    groups.push({ date: 'this-week', title: 'This Week', posts: thisWeekPosts });
    groups.push({ date: 'next-week', title: 'Next Week', posts: nextWeekPosts });
    groups.push({ date: 'later', title: 'Later', posts: laterPosts });
    
    return groups;
  }, [posts, filters]);


  return (
    <div className="space-y-5 mb-8">
      {groupedPosts
        .filter(group => group.posts.length > 0) // Only include groups with posts
        .map((group) => (
          <DateSection 
            key={group.date} 
            dateTitle={group.title} 
            posts={group.posts} 
            viewType={viewType}
          />
        ))
      }
      
      {/* Show message if no posts in any category */}
      {groupedPosts.every(group => group.posts.length === 0) && (
        <div className="text-center py-10">
          <p className="text-gray-500">No posts scheduled for any time period.</p>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
