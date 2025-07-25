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
      return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
        <rect x="2" y="9" width="4" height="12"></rect>
        <circle cx="4" cy="4" r="2"></circle>
      </svg>;
    case 'instagram':
      return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>;
    case 'facebook':
      return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>;
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
      return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-200">Ready to publish</Badge>;
    default:
      return <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-200">Scheduled</Badge>;
  }
};

const PostItem = ({ post, viewType }: PostItemProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const platformIconClass = getPlatformColor(post.platform);
  const formattedTime = format(new Date(post.scheduledTime), 'h:mm a');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditDialogOpen(true);
  };
  
  const handleDelete = async () => {
    try {
      await deletePost(post.id);
      queryClient.invalidateQueries({ queryKey: ['/api/calendar'] });
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
                <div className={`w-8 h-8 ${platformIconClass} rounded-lg flex items-center justify-center mr-2`}>
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
          onPostUpdated={() => queryClient.invalidateQueries({ queryKey: ['/api/calendar'] })}
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
        onPostUpdated={() => queryClient.invalidateQueries({ queryKey: ['/api/calendar'] })}
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