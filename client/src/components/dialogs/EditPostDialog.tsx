import { useState, useEffect, useRef } from 'react';
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
import { Image, Film, X } from 'lucide-react';

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
  const [media, setMedia] = useState<{ url: string; type: string; alt?: string }[]>([]);
  
  // Media upload state
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
      
      // Set media if available
      setMedia(post.media || []);
      setMediaFiles([]);
      setMediaPreviews([]);
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
  
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const newFiles: File[] = [];
    const newPreviews: string[] = [];
    
    // Process each file
    Array.from(files).forEach(file => {
      // Check if it's an image or video
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        newFiles.push(file);
        
        // Create preview URL
        const previewUrl = URL.createObjectURL(file);
        newPreviews.push(previewUrl);
      }
    });
    
    // Update state with new files and previews
    setMediaFiles(prev => [...prev, ...newFiles]);
    setMediaPreviews(prev => [...prev, ...newPreviews]);
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const removeMedia = (index: number) => {
    // Remove from existing media
    setMedia(prev => prev.filter((_, i) => i !== index));
  };
  
  const removeNewMedia = (index: number) => {
    // Revoke the object URL to avoid memory leaks
    URL.revokeObjectURL(mediaPreviews[index]);
    
    // Remove the file and preview
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!post) return;
    
    const scheduledDate = new Date(`${date}T${time}`);
    
    // Process new media files
    const newMediaItems = await Promise.all(
      mediaFiles.map(async (file, index) => {
        return {
          url: mediaPreviews[index],
          type: file.type.startsWith('image/') ? 'image' : 'video',
          alt: file.name
        };
      })
    );
    
    // Combine existing media with new media
    const updatedMedia = [...media, ...newMediaItems];
    
    const updates: Partial<Post> = {
      content,
      platform,
      scheduledTime: scheduledDate.toISOString(),
      status: status as Post['status'],
      media: updatedMedia.length > 0 ? updatedMedia : undefined
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
          
          {/* Media Section */}
          <div>
            <Label>Media</Label>
            
            {/* Existing Media */}
            {media.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {media.map((item, index) => (
                  <div key={`existing-${index}`} className="relative w-20 h-20 border rounded overflow-hidden">
                    {item.type === 'image' ? (
                      <img 
                        src={item.url} 
                        alt={item.alt || `Media ${index + 1}`} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <Film className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeMedia(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* New Media Previews */}
            {mediaPreviews.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {mediaPreviews.map((preview, index) => (
                  <div key={`new-${index}`} className="relative w-20 h-20 border rounded overflow-hidden">
                    {mediaFiles[index]?.type.startsWith('image/') ? (
                      <img 
                        src={preview} 
                        alt={`New Media ${index + 1}`} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <Film className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeNewMedia(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Upload Buttons */}
            <div className="flex gap-2 mt-2">
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1"
              >
                <Image className="h-4 w-4" />
                Add Image
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1"
              >
                <Film className="h-4 w-4" />
                Add Video
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleMediaUpload}
                className="hidden"
                multiple
              />
            </div>
            
            {(media.length > 0 || mediaPreviews.length > 0) && (
              <p className="text-xs text-gray-500 mt-1">
                {media.length + mediaPreviews.length} {media.length + mediaPreviews.length === 1 ? 'file' : 'files'} attached
              </p>
            )}
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