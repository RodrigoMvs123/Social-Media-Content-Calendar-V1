import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Post } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Hash, MessageSquare, Image, Film, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { deletePost } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { usePostContext } from '@/contexts/PostContext';

interface PostDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  posts: Post[];
  date: Date | null;
  onPostDeleted?: () => void;
}

const PostDetailsDialog: React.FC<PostDetailsDialogProps> = ({ 
  open, 
  onOpenChange, 
  posts, 
  date,
  onPostDeleted 
}) => {
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);
  const [currentPostIndex, setCurrentPostIndex] = useState(0);
  const { toast } = useToast();
  const { refreshPosts } = usePostContext();

  // Reset to first post when dialog opens or posts change
  useEffect(() => {
    if (open && posts.length > 0) {
      setCurrentPostIndex(0);
    }
  }, [open, posts]);

  const handleDeletePost = async (postId: number) => {
    setDeletingPostId(postId);
    try {
      await deletePost(postId);
      toast({
        title: "Post deleted",
        description: "The post has been successfully deleted.",
      });
      refreshPosts();
      if (onPostDeleted) onPostDeleted();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: "Error",
        description: "Failed to delete the post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingPostId(null);
    }
  };

  if (!date) return null;
  
  const formattedDate = format(date, 'EEEE, MMMM d, yyyy');
  const totalPosts = posts.length;
  
  if (totalPosts === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-blue-600" />
              Posts for {formattedDate}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-8">
            <p className="text-gray-500 text-center py-4">
              No posts scheduled for this date.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  const currentPost = posts[currentPostIndex] || posts[0];
  
  if (!currentPost) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-blue-600" />
              Posts for {formattedDate}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-8">
            <p className="text-gray-500 text-center py-4">
              No posts available.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  const goToNextPost = () => {
    if (totalPosts > 0) {
      setCurrentPostIndex((prev) => (prev + 1) % totalPosts);
    }
  };
  
  const goToPrevPost = () => {
    if (totalPosts > 0) {
      setCurrentPostIndex((prev) => (prev - 1 + totalPosts) % totalPosts);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5 text-blue-600" />
            Posts for {formattedDate}
          </DialogTitle>
        </DialogHeader>
        
        {totalPosts > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4 mb-4">
            <div className="flex items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPrevPost}
                disabled={totalPosts <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextPost}
                disabled={totalPosts <= 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <span className="text-sm text-gray-500">
              {currentPostIndex + 1} of {totalPosts}
            </span>
          </div>
        )}
        
        <div className="mt-8">
          <div className="border rounded-lg p-4 bg-white">
            <div className="flex justify-between items-start mb-2">
              <Badge 
                className={`
                  ${currentPost.platform === 'Twitter' ? 'bg-blue-100 text-blue-800 border-blue-200' : ''}
                  ${currentPost.platform === 'Facebook' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' : ''}
                  ${currentPost.platform === 'Instagram' ? 'bg-pink-100 text-pink-800 border-pink-200' : ''}
                  ${currentPost.platform === 'LinkedIn' ? 'bg-sky-100 text-sky-800 border-sky-200' : ''}
                `}
              >
                {currentPost.platform}
              </Badge>
              <Badge 
                variant="outline" 
                className={`
                  ${currentPost.status === 'draft' ? 'bg-gray-100 text-gray-800 border-gray-200' : ''}
                  ${currentPost.status === 'scheduled' ? 'bg-blue-100 text-blue-800 border-blue-200' : ''}
                  ${currentPost.status === 'published' ? 'bg-green-100 text-green-800 border-green-200' : ''}
                  ${currentPost.status === 'ready' ? 'bg-amber-100 text-amber-800 border-amber-200' : ''}
                  ${currentPost.status === 'needs_approval' ? 'bg-orange-100 text-orange-800 border-orange-200' : ''}
                `}
              >
                {currentPost.status.replace('_', ' ')}
              </Badge>
            </div>
            
            <div className="mb-3 flex items-center text-sm text-gray-500">
              <Clock className="mr-1 h-4 w-4" />
              {format(new Date(currentPost.scheduledTime), 'HH:mm')}
            </div>
            
            <div className="mb-4">
              <h3 className="font-medium flex items-center">
                <MessageSquare className="mr-1 h-4 w-4 text-gray-500" />
                Content
              </h3>
              <p className="mt-1 text-gray-700 whitespace-pre-wrap">{currentPost.content}</p>
            </div>
            
            {currentPost.media && currentPost.media.length > 0 && (
              <div className="mb-4">
                <h3 className="font-medium flex items-center mb-2">
                  <Image className="mr-1 h-4 w-4 text-gray-500" />
                  Media
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {currentPost.media.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-md overflow-hidden relative">
                      {item.type === 'image' ? (
                        <img 
                          src={item.url} 
                          alt={item.alt || `Media ${index + 1}`} 
                          className="w-full h-32 object-cover"
                          onError={(e) => {
                            console.log('Image failed to load:', item);
                            e.currentTarget.parentElement.innerHTML = `
                              <div class="bg-gray-100 p-4 h-32 flex flex-col items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-8 w-8 text-gray-400 mb-2">
                                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                  <polyline points="21 15 16 10 5 21"></polyline>
                                </svg>
                                <span class="text-sm text-gray-500">Image</span>
                              </div>
                            `;
                          }}
                        />
                      ) : (
                        <div className="bg-gray-100 p-4 h-32 flex flex-col items-center justify-center">
                          <Film className="h-8 w-8 text-gray-400 mb-2" />
                          <span className="text-sm text-gray-500">Video</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeletePost(currentPost.id)}
                disabled={deletingPostId === currentPost.id}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {deletingPostId === currentPost.id ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PostDetailsDialog;