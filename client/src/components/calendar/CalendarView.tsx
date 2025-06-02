import { useEffect, useMemo } from 'react';
import { Post, PostsGroupedByDate } from '@/lib/types';
import DateSection from './DateSection';
import { format, isToday, isTomorrow, addDays, isThisWeek, isAfter } from 'date-fns';

interface CalendarViewProps {
  posts: Post[];
  viewType: 'grid' | 'list';
}

const CalendarView = ({ posts, viewType }: CalendarViewProps) => {
  // Group posts by date
  const groupedPosts = useMemo(() => {
    const groups: PostsGroupedByDate[] = [];
    const today = new Date();
    const tomorrow = addDays(today, 1);
    const nextWeekStart = addDays(today, 7);
    const nextWeekEnd = addDays(today, 14);
    
    // Sort posts by scheduled time
    const sortedPosts = [...posts].sort((a, b) => {
      return new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime();
    });
    
    const todayPosts: Post[] = [];
    const tomorrowPosts: Post[] = [];
    const thisWeekPosts: Post[] = [];
    const nextWeekPosts: Post[] = [];
    const laterPosts: Post[] = [];
    
    sortedPosts.forEach(post => {
      const postDate = new Date(post.scheduledTime);
      
      if (isToday(postDate)) {
        todayPosts.push(post);
      } else if (isTomorrow(postDate)) {
        tomorrowPosts.push(post);
      } else if (isThisWeek(postDate) && isAfter(postDate, tomorrow)) {
        thisWeekPosts.push(post);
      } else if (isAfter(postDate, nextWeekStart) && !isAfter(postDate, nextWeekEnd)) {
        nextWeekPosts.push(post);
      } else if (isAfter(postDate, nextWeekEnd)) {
        laterPosts.push(post);
      }
    });
    
    if (todayPosts.length > 0) {
      groups.push({ date: format(today, 'yyyy-MM-dd'), title: 'Today', posts: todayPosts });
    }
    
    if (tomorrowPosts.length > 0) {
      groups.push({ date: format(tomorrow, 'yyyy-MM-dd'), title: 'Tomorrow', posts: tomorrowPosts });
    }
    
    if (thisWeekPosts.length > 0) {
      groups.push({ date: 'this-week', title: 'This Week', posts: thisWeekPosts });
    }
    
    if (nextWeekPosts.length > 0) {
      groups.push({ date: 'next-week', title: 'Next Week', posts: nextWeekPosts });
    }
    
    if (laterPosts.length > 0) {
      groups.push({ date: 'later', title: 'Later', posts: laterPosts });
    }
    
    return groups;
  }, [posts]);

  return (
    <div className="space-y-5 mb-8">
      {groupedPosts.map((group) => (
        <DateSection 
          key={group.date} 
          dateTitle={group.title} 
          posts={group.posts} 
          viewType={viewType}
        />
      ))}
    </div>
  );
};

export default CalendarView;
