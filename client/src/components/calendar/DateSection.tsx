import { Post } from '@/lib/types';
import PostItem from './PostItem';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

interface DateSectionProps {
  dateTitle: string;
  posts: Post[];
  viewType: 'grid' | 'list';
}

const DateSection = ({ dateTitle, posts, viewType }: DateSectionProps) => {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-4 px-6 bg-blue-50 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{dateTitle}</h3>
      </CardHeader>
      <CardContent className={`p-0 ${viewType === 'list' ? 'divide-y divide-gray-100' : 'p-4'}`}>
        <div className={viewType === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : ''}>
          {posts.map((post, index) => (
            <PostItem key={post.id || index} post={post} viewType={viewType} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default DateSection;