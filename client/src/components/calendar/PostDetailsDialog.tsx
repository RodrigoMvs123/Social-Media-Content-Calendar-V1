import React from 'react';
import { format } from 'date-fns';
import { Post } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Hash, MessageSquare } from 'lucide-react';

interface PostDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  posts: Post[];
  date: Date | null;
}

const PostDetailsDialog: React.FC<PostDetailsDialogProps> = ({ 
  open, 
  onOpenChange, 
  posts, 
  date 
}) => {
  if (!date) return null;
  
  const formattedDate = format(date, 'EEEE, MMMM d, yyyy');
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5 text-blue-600" />
            Posts for {formattedDate}
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 space-y-4">
          {posts.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No posts scheduled for this date.
            </p>
          ) : (
            posts.map(post => (
              <div key={post.id} className="border rounded-lg p-4 bg-white">
                <div className="flex justify-between items-start mb-2">
                  <Badge 
                    className={`
                      ${post.platform === 'Twitter' ? 'bg-blue-100 text-blue-800 border-blue-200' : ''}
                      ${post.platform === 'Facebook' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' : ''}
                      ${post.platform === 'Instagram' ? 'bg-pink-100 text-pink-800 border-pink-200' : ''}
                      ${post.platform === 'LinkedIn' ? 'bg-sky-100 text-sky-800 border-sky-200' : ''}
                    `}
                  >
                    {post.platform}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={`
                      ${post.status === 'draft' ? 'bg-gray-100 text-gray-800 border-gray-200' : ''}
                      ${post.status === 'scheduled' ? 'bg-green-100 text-green-800 border-green-200' : ''}
                      ${post.status === 'ready' ? 'bg-amber-100 text-amber-800 border-amber-200' : ''}
                      ${post.status === 'needs_approval' ? 'bg-orange-100 text-orange-800 border-orange-200' : ''}
                    `}
                  >
                    {post.status.replace('_', ' ')}
                  </Badge>
                </div>
                
                <div className="mb-3 flex items-center text-sm text-gray-500">
                  <Clock className="mr-1 h-4 w-4" />
                  {format(new Date(post.scheduledTime), 'h:mm a')}
                </div>
                
                <div className="mb-4">
                  <h3 className="font-medium flex items-center">
                    <MessageSquare className="mr-1 h-4 w-4 text-gray-500" />
                    Content
                  </h3>
                  <p className="mt-1 text-gray-700 whitespace-pre-wrap">{post.content}</p>
                </div>
                
                <div className="text-xs text-gray-500 flex items-center">
                  <Hash className="mr-1 h-3 w-3" />
                  ID: {post.id}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PostDetailsDialog;