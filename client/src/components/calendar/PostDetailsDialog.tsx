import React from 'react';
import { format } from 'date-fns';
import { Post } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Hash, MessageSquare, Image, Film } from 'lucide-react';

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
                
                {post.media && post.media.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-medium flex items-center mb-2">
                      <Image className="mr-1 h-4 w-4 text-gray-500" />
                      Media
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {post.media.map((item, index) => (
                        <div key={index} className="border border-gray-200 rounded-md overflow-hidden relative">
                          {item.type === 'image' ? (
                            <img 
                              src={item.url} 
                              alt={item.alt || `Media ${index + 1}`} 
                              className="w-full h-32 object-cover"
                              onError={(e) => {
                                console.log('Image failed to load:', item);
                                // Replace with a placeholder when image fails to load
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