import { format } from 'date-fns';
import { Post } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Bookmark, 
  TrendingUp, 
  Send, 
  Clock,
  Calendar as CalendarIcon
} from 'lucide-react';

interface PostDetailsDialogProps {
  post: Post | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getPlatformIcon = (platform: string) => {
  switch (platform.toLowerCase()) {
    case 'twitter':
      return <MessageSquare className="h-6 w-6" />;
    case 'linkedin':
      return <Bookmark className="h-6 w-6" />;
    case 'instagram':
      return <Send className="h-6 w-6" />;
    case 'facebook':
      return <TrendingUp className="h-6 w-6" />;
    default:
      return <MessageSquare className="h-6 w-6" />;
  }
};

const getPlatformColor = (platform: string) => {
  switch (platform.toLowerCase()) {
    case 'twitter':
      return 'bg-blue-100 text-blue-700';
    case 'linkedin':
      return 'bg-indigo-100 text-indigo-800';
    case 'instagram':
      return 'bg-pink-100 text-pink-800';
    case 'facebook':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-purple-100 text-purple-800';
  }
};

const getStatusBadge = (status?: string) => {
  switch (status) {
    case 'draft':
      return <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-200">Draft</Badge>;
    case 'scheduled':
      return <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-200">Scheduled</Badge>;
    case 'published':
      return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-200">Published</Badge>;
    case 'needs_approval':
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Needs approval</Badge>;
    case 'ready':
      return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-200">Ready to publish</Badge>;
    default:
      return <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-200">Scheduled</Badge>;
  }
};

const PostDetailsDialog = ({ post, open, onOpenChange }: PostDetailsDialogProps) => {
  if (!post) return null;
  
  const platformIconClass = getPlatformColor(post.platform);
  const formattedDate = format(new Date(post.scheduledTime), 'MMMM d, yyyy');
  const formattedTime = format(new Date(post.scheduledTime), 'h:mm a');
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <div className={`w-8 h-8 ${platformIconClass} rounded-lg flex items-center justify-center mr-2`}>
              {getPlatformIcon(post.platform)}
            </div>
            Post Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Platform</h3>
            <div className="flex items-center">
              <Badge variant="outline">
                {post.platform}
              </Badge>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
            <div>
              {getStatusBadge(post.status)}
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Scheduled for</h3>
            <div className="flex items-center">
              <CalendarIcon className="h-4 w-4 mr-2 text-gray-500" />
              <span>{formattedDate}</span>
              <Clock className="h-4 w-4 mx-2 text-gray-500" />
              <span>{formattedTime}</span>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Content</h3>
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <p className="whitespace-pre-wrap">{post.content}</p>
            </div>
          </div>
          
          {post.media && post.media.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Media</h3>
              <div className="grid grid-cols-2 gap-2">
                {post.media.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-md overflow-hidden">
                    <img src={item.url} alt={`Media ${index + 1}`} className="w-full h-auto" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PostDetailsDialog;