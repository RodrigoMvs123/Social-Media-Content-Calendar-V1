import { useState } from 'react';
import { format } from 'date-fns';
import { Post } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Bookmark, 
  TrendingUp, 
  Send, 
  Edit, 
  Trash2,
  Clock
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { deletePost } from '@/lib/api';
import { publishToSocialMedia } from '@/lib/socialMediaApi';
import { useQueryClient } from '@tanstack/react-query';
import EditPostDialog from '@/components/dialogs/EditPostDialog';
import PostDetailsDialog from '@/components/dialogs/PostDetailsDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface PostItemProps {
  post: Post;
  viewType: 'grid' | 'list';
}

const getPlatformIcon = (platform: string) => {
  switch (platform.toLowerCase()) {
    case 'x':
      return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M4 4l11.733 16h4.267l-11.733 -16z"/><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"/></svg>;
    case 'twitter':
      return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M4 4l11.733 16h4.267l-11.733 -16z"/><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"/></svg>;
    case 'linkedin':
      return <svg className="h-6 w-6" fill="#0077B5" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>;
    case 'instagram':
      return <svg className="h-6 w-6" fill="#E4405F" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>;
    case 'facebook':
      return <svg className="h-6 w-6" fill="#1877F2" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>;
    default:
      return <MessageSquare className="h-6 w-6" />;
  }
};

const getPlatformColor = (platform: string) => {
  switch (platform.toLowerCase()) {
    case 'x':
      return 'bg-gray-100 text-gray-900';
    case 'twitter':
      return 'bg-gray-100 text-gray-900';
    case 'linkedin':
      return 'bg-blue-100 text-blue-800';
    case 'instagram':
      return 'bg-pink-100 text-pink-800';
    case 'facebook':
      return 'bg-blue-100 text-blue-700';
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

const PostItem = ({ post, viewType }: PostItemProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const platformIconClass = getPlatformColor(post.platform);
  const formattedTime = format(new Date(post.scheduledTime), 'HH:mm');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditDialogOpen(true);
  };
  
  const handleDelete = async () => {
    try {
      await deletePost(post.id);
      // Invalidate all post-related queries to sync Dashboard and Calendar
      queryClient.invalidateQueries({ queryKey: ['/api/calendar'] });
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast({
        title: "Post deleted",
        description: "The post has been successfully deleted.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete the post. Please try again.",
        variant: "destructive",
      });
    }
    setIsDeleteDialogOpen(false);
  };
  
  const handleShowDetails = () => {
    setIsDetailsDialogOpen(true);
  };
  
  const handlePublish = async () => {
    try {
      setIsLoading(true);
      
      // Get user ID from token
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.userId || payload.id;
      
      const result = await publishToSocialMedia(
        post.id,
        userId,
        post.platform,
        post.content,
        post.media
      );
      
      if (result.success) {
        toast({
          title: "Post published!",
          description: `Your post has been published to ${post.platform}.`,
        });
        
        // Refresh posts data
        queryClient.invalidateQueries({ queryKey: ['/api/calendar'] });
        queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
        queryClient.invalidateQueries({ queryKey: ['posts'] });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Publishing error:', error);
      toast({
        title: "Publishing failed",
        description: error.message || "Failed to publish post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const hasMedia = post.media && post.media.length > 0;
  
  // Grid view layout
  if (viewType === 'grid') {
    return (
      <>
        <Card 
          className="overflow-hidden hover:shadow-md transition-shadow duration-200 cursor-pointer"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={handleShowDetails}
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <div className="mr-2">
                  {getPlatformIcon(post.platform)}
                </div>
                <Badge variant="outline">
                  {post.platform}
                </Badge>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="h-3 w-3 mr-1" />
                {formattedTime}
              </div>
            </div>
            
            <div className="mb-3">
              <p className="text-sm text-gray-900 line-clamp-3">{post.content}</p>
            </div>
            
            {hasMedia && (
              <div className="mb-3">
                <div className="flex gap-1 overflow-x-auto">
                  {post.media.slice(0, 3).map((item, index) => (
                    <div key={index} className="flex-shrink-0 w-12 h-12 rounded border overflow-hidden">
                      {item.type === 'image' ? (
                        <img 
                          src={item.url} 
                          alt={`Media ${index + 1}`} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                            <polygon points="23 7 16 12 23 17 23 7"></polygon>
                            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                          </svg>
                        </div>
                      )}
                    </div>
                  ))}
                  {post.media.length > 3 && (
                    <div className="flex-shrink-0 w-12 h-12 rounded border bg-gray-100 flex items-center justify-center">
                      <span className="text-xs text-gray-500">+{post.media.length - 3}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div>
                {getStatusBadge(post.status)}
              </div>
              <div className="flex space-x-2">
                {(post.status === 'ready' || post.status === 'draft') && (
                  <button 
                    className="text-green-600 hover:text-green-700 disabled:opacity-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePublish();
                    }}
                    aria-label="Publish post"
                    disabled={isLoading}
                  >
                    <Send className="h-4 w-4" />
                  </button>
                )}
                
                <button 
                  className="text-gray-400 hover:text-gray-500"
                  onClick={handleEdit}
                  aria-label="Edit post"
                >
                  <Edit className="h-4 w-4" />
                </button>
                
                <button 
                  className="text-gray-400 hover:text-gray-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDeleteDialogOpen(true);
                  }}
                  aria-label="Delete post"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </Card>
        
        <EditPostDialog 
          open={isEditDialogOpen} 
          onOpenChange={setIsEditDialogOpen} 
          post={post}
          onPostUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/calendar'] });
            queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
            queryClient.invalidateQueries({ queryKey: ['posts'] });
          }}
        />
        
        <PostDetailsDialog
          post={post}
          open={isDetailsDialogOpen}
          onOpenChange={setIsDetailsDialogOpen}
        />
        
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the post.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }
  
  // List view layout
  return (
    <>
      <div 
        className="p-6 hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleShowDetails}
      >
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className={`w-10 h-10 ${platformIconClass} rounded-lg flex items-center justify-center shadow-sm`}>
              {getPlatformIcon(post.platform)}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Badge variant="outline">
                  {post.platform}
                </Badge>
                <span className="ml-2 text-sm text-gray-500">{formattedTime}</span>
              </div>
              <div className="flex">
                {(post.status === 'ready' || post.status === 'draft') && (
                  <button 
                    className="text-green-600 hover:text-green-700 mr-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePublish();
                    }}
                    aria-label="Publish post"
                    disabled={isLoading}
                  >
                    <Send className="h-5 w-5" />
                  </button>
                )}
                
                <button 
                  className="text-gray-400 hover:text-gray-500 mr-2"
                  onClick={handleEdit}
                  aria-label="Edit post"
                >
                  <Edit className="h-5 w-5" />
                </button>
                
                <button 
                  className="text-gray-400 hover:text-gray-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDeleteDialogOpen(true);
                  }}
                  aria-label="Delete post"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
            <p className="mt-1 text-sm text-gray-900">{post.content}</p>
            
            {hasMedia && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {post.media.slice(0, 4).map((item, index) => (
                    <div key={index} className="w-8 h-8 rounded border overflow-hidden">
                      {item.type === 'image' ? (
                        <img 
                          src={item.url} 
                          alt={`Media ${index + 1}`} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                            <polygon points="23 7 16 12 23 17 23 7"></polygon>
                            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                          </svg>
                        </div>
                      )}
                    </div>
                  ))}
                  {post.media.length > 4 && (
                    <div className="w-8 h-8 rounded border bg-gray-100 flex items-center justify-center">
                      <span className="text-xs text-gray-500">+{post.media.length - 4}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="mt-2">
              {getStatusBadge(post.status)}
            </div>
          </div>
        </div>
      </div>
      
      <EditPostDialog 
        open={isEditDialogOpen} 
        onOpenChange={setIsEditDialogOpen} 
        post={post}
        onPostUpdated={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/calendar'] });
          queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
          queryClient.invalidateQueries({ queryKey: ['posts'] });
        }}
      />
      
      <PostDetailsDialog
        post={post}
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
      />
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the post.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PostItem;