import React, { useState } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay,
  addMonths,
  subMonths,
  getDay
} from 'date-fns';
import { Post } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthCalendarViewProps {
  posts: Post[];
  onDateClick?: (date: Date, posts: Post[]) => void;
}

const MonthCalendarView: React.FC<MonthCalendarViewProps> = ({ posts, onDateClick }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const firstDayOfMonth = getDay(monthStart);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleDateClick = (day: Date) => {
    setSelectedDate(day);
    const postsOnDay = posts.filter(post => 
      isSameDay(new Date(post.scheduledTime), day)
    );
    
    if (onDateClick) {
      onDateClick(day, postsOnDay);
    }
  };

  // Group posts by date
  const postsByDate = posts.reduce((acc, post) => {
    const date = format(new Date(post.scheduledTime), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(post);
    return acc;
  }, {} as Record<string, Post[]>);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2 border-b">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {[...Array(firstDayOfMonth)].map((_, index) => (
          <div key={`empty-${index}`} className="min-h-[80px] p-2" />
        ))}
        {daysInMonth.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayPosts = postsByDate[dateKey] || [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = isSameDay(day, selectedDate);
          
          return (
            <div
              key={day.toString()}
              onClick={() => handleDateClick(day)}
              className={`
                min-h-[80px] p-2 border rounded-md cursor-pointer transition-colors
                ${isCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'}
                ${isSelected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'}
                hover:bg-gray-50
              `}
            >
              <div className="flex justify-between items-start">
                <span className={`text-sm font-medium ${isSelected ? 'text-blue-600' : ''}`}>
                  {format(day, 'd')}
                </span>
                {dayPosts.length > 0 && (
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                    {dayPosts.length}
                  </Badge>
                )}
              </div>
              
              <div className="mt-1 space-y-1">
                {dayPosts.slice(0, 2).map(post => (
                  <div 
                    key={post.id} 
                    className="text-xs truncate p-1 rounded bg-gray-50 border border-gray-100"
                    title={post.content}
                  >
                    {post.platform}: {post.content.substring(0, 15)}...
                  </div>
                ))}
                {dayPosts.length > 2 && (
                  <div className="text-xs text-gray-500">
                    +{dayPosts.length - 2} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MonthCalendarView;