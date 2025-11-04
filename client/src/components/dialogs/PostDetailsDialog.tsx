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
  Calendar as CalendarIcon,
  Film,
  X
} from 'lucide-react';
import { useState } from 'react';
import { updatePost } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

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
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Ready to publish</Badge>;
    case 'failed':
      return <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-200">❌ Failed</Badge>;
    default:
      return <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-200">Scheduled</Badge>;
  }
};

const PostDetailsDialog = ({ post, open, onOpenChange }: PostDetailsDialogProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  if (!post) return null;
  
  // Safe date parsing for Unix timestamps and date strings
  const safeParseDate = (dateString: string): Date => {
    try {
      const numericValue = parseFloat(dateString);
      if (!isNaN(numericValue) && numericValue > 1000000000) {
        const timestamp = numericValue > 1000000000000 ? numericValue : numericValue * 1000;
        const date = new Date(timestamp);
        return !isNaN(date.getTime()) ? date : new Date();
      }
      const date = new Date(dateString);
      return !isNaN(date.getTime()) ? date : new Date();
    } catch {
      return new Date();
    }
  };
  
  const platformIconClass = getPlatformColor(post.platform);
  const scheduledDate = safeParseDate(post.scheduledTime);
  const formattedDate = format(scheduledDate, 'MMMM d, yyyy');
  const formattedTime = format(scheduledDate, 'HH:mm');
  const hasMedia = post.media && post.media.length > 0;
  
  const handleRemoveMedia = async (index: number) => {
    if (!post || !post.media) return;
    
    try {
      setIsUpdating(true);
      
      // Create a new media array without the removed item
      const updatedMedia = [...post.media];
      updatedMedia.splice(index, 1);
      
      // Update the post with the new media array
      await updatePost(post.id, {
        media: updatedMedia.length > 0 ? updatedMedia : undefined
      });
      
      // Refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/calendar'] });
      
      toast({
        title: "Media removed",
        description: "The media has been removed from the post.",
      });
    } catch (error) {
      console.error('Failed to remove media:', error);
      toast({
        title: "Error",
        description: "Failed to remove media. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
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
          
          {hasMedia && post.media && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Media</h3>
              <div className="grid grid-cols-2 gap-2">
                {post.media.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-md overflow-hidden relative">
                    {item.type === 'image' ? (
                      <img 
                        src={item.url} 
                        alt={item.alt || `Media ${index + 1}`} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.log('Image failed to load:', item);
                          // Replace with a placeholder when image fails to load
                          if (e.currentTarget.parentElement) {
                            e.currentTarget.parentElement.innerHTML = `
                            <div class="bg-gray-100 p-4 flex flex-col items-center justify-center h-full">
                              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-8 w-8 text-gray-400 mb-2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21 15 16 10 5 21"></polyline>
                              </svg>
                              <span class="text-sm text-gray-500">Image</span>
                            </div>
                          `;
                          }
                        }}
                      />
                    ) : (
                      <div className="bg-gray-100 p-4 flex flex-col items-center justify-center">
                        <Film className="h-8 w-8 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-500">Video</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                      disabled={isUpdating}
                    >
                      <X className="h-3 w-3" />
                    </button>
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