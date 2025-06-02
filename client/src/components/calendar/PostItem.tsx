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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface PostItemProps {
  post: Post;
  viewType: 'grid' | 'list';
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

const PostItem = ({ post, viewType }: PostItemProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const platformIconClass = getPlatformColor(post.platform);
  const formattedTime = format(new Date(post.scheduledTime), 'h:mm a');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const handleEdit = () => {
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
  
  // Grid view layout
  if (viewType === 'grid') {
    return (
      <>
        <Card 
          className="overflow-hidden hover:shadow-md transition-shadow duration-200"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
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
                  onClick={() => setIsDeleteDialogOpen(true)}
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
        className="p-6 hover:bg-gray-50 transition-colors duration-150"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className={`w-10 h-10 ${platformIconClass} rounded-lg flex items-center justify-center shadow-sm`}>
              {getPlatformIcon(post.platform)}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div>
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
                  onClick={() => setIsDeleteDialogOpen(true)}
                  aria-label="Delete post"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
            <p className="mt-1 text-sm text-gray-900">{post.content}</p>
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