import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updatePost } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Post } from '@/lib/types';
import { format } from 'date-fns';

interface EditPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: Post | null;
  onPostUpdated?: () => void;
}

const EditPostDialog = ({ open, onOpenChange, post, onPostUpdated }: EditPostDialogProps) => {
  const [content, setContent] = useState('');
  const [platform, setPlatform] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [status, setStatus] = useState('');
  const [charCount, setCharCount] = useState(0);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (post) {
      setContent(post.content);
      setPlatform(post.platform);
      setCharCount(post.content.length);
      
      const scheduledDate = new Date(post.scheduledTime);
      setDate(format(scheduledDate, 'yyyy-MM-dd'));
      setTime(format(scheduledDate, 'HH:mm'));
      
      setStatus(post.status || 'scheduled');
    }
  }, [post]);

  const updatePostMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number, updates: Partial<Post> }) => 
      updatePost(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar'] });
      
      toast({
        title: 'Post updated',
        description: 'Your post has been updated successfully.',
      });
      
      onOpenChange(false);
      
      if (onPostUpdated) {
        onPostUpdated();
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update post: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });

  const handleContentChange = (value: string) => {
    setContent(value);
    setCharCount(value.length);
  };

  const handleSubmit = () => {
    if (!post) return;
    
    const scheduledDate = new Date(`${date}T${time}`);
    
    const updates: Partial<Post> = {
      content,
      platform,
      scheduledTime: scheduledDate.toISOString(),
      status: status as Post['status'],
    };
    
    updatePostMutation.mutate({ id: post.id, updates });
  };

  if (!post) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <div>
            <Label htmlFor="platform">Platform</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Twitter">Twitter</SelectItem>
                <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                <SelectItem value="Instagram">Instagram</SelectItem>
                <SelectItem value="Facebook">Facebook</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <div className="text-xs text-gray-500 mt-1">
              {charCount}/280 characters
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="ready">Ready to publish</SelectItem>
                <SelectItem value="needs_approval">Needs approval</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={updatePostMutation.isPending}>
            {updatePostMutation.isPending ? 'Updating...' : 'Update Post'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditPostDialog;