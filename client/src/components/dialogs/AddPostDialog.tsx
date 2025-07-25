import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, AlertCircle, Image, X, Film, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { socialAccountsApi, createPost } from '@/lib/api';
import { SocialMediaAccount } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { usePostContext } from '@/contexts/PostContext';
import { useQueryClient } from '@tanstack/react-query';
import { notificationService } from '@/lib/notifications';

// Check if token is valid
const isTokenValid = (account: SocialMediaAccount): boolean => {
  if (!account.accessToken || !account.tokenExpiry) return false;
  return new Date(account.tokenExpiry) > new Date();
};

const AddPostDialog = () => {
  const { 
    isAddPostDialogOpen, 
    closeAddPostDialog, 
    aiGeneratedContent, 
    selectedPlatform,
    resetState,
    navigateToDashboardAfterPost
  } = usePostContext();
  
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [platform, setPlatform] = useState('');
  const [status, setStatus] = useState('scheduled');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState('12:00');
  const [connectedAccounts, setConnectedAccounts] = useState<SocialMediaAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  // Media upload state
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Update content when aiGeneratedContent changes
  useEffect(() => {
    if (aiGeneratedContent) {
      setContent(aiGeneratedContent);
    }
  }, [aiGeneratedContent]);
  
  // Update platform when selectedPlatform changes
  useEffect(() => {
    if (selectedPlatform) {
      setPlatform(selectedPlatform);
    }
  }, [selectedPlatform]);
  
  // Reset form when dialog opens
  useEffect(() => {
    if (isAddPostDialogOpen) {
      // Only set these if they're not already set by the context
      if (!content && aiGeneratedContent) setContent(aiGeneratedContent);
      if (!platform && selectedPlatform) setPlatform(selectedPlatform);
      
      // Always reset these
      setDate(new Date());
      setTime('12:00');
      setStatus('ready'); // Will be auto-adjusted by date effect
      setMediaFiles([]);
      setMediaPreviews([]);
    }
  }, [isAddPostDialogOpen, aiGeneratedContent, selectedPlatform, content, platform]);
  
  // Auto-adjust status when date changes
  useEffect(() => {
    if (!date) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);
    
    const isPast = selectedDate < today;
    const isFuture = selectedDate > today;
    
    if (isPast) {
      // Past dates: auto-set to published
      setStatus('published');
    } else {
      // Today and future: default to ready if current status is not valid
      if (status === 'published' || status === 'scheduled' || status === 'needs_approval') {
        setStatus('ready');
      }
    }
  }, [date, status]);
  
  // Load connected accounts on mount
  useEffect(() => {
    const loadAccounts = async () => {
      if (!isAddPostDialogOpen) return;
      
      try {
        // Use a safer approach to get accounts
        const accounts = await socialAccountsApi.getAll().catch(() => []);
        setConnectedAccounts(accounts || []);
      } catch (error) {
        console.error('Failed to load accounts:', error);
        // Don't show toast to avoid potential errors
        setConnectedAccounts([]);
      }
    };
    
    if (isAddPostDialogOpen) {
      loadAccounts();
    }
  }, [isAddPostDialogOpen]);
  
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Process each file and convert to data URL immediately
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          setMediaFiles(prev => [...prev, file]);
          setMediaPreviews(prev => [...prev, dataUrl]);
        };
        reader.readAsDataURL(file);
      }
    });
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const removeMedia = (index: number) => {
    // Remove the file and preview (no need to revoke data URLs)
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleSubmit = async () => {
    if (!content || !platform || !date) return;
    
    try {
      setIsLoading(true);
      
      // Combine date and time in local timezone
      const [hours, minutes] = time.split(':').map(Number);
      
      // Get the date components from the selected date
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();
      
      // Create a new date in local timezone
      const scheduledTime = new Date(year, month, day, hours, minutes);
      
      console.log('Creating post for date:', date.toISOString());
      console.log('With time:', time);
      console.log('Final scheduled time:', scheduledTime.toISOString());
      
      // Use the data URLs we already created
      const mediaUrls = mediaFiles.map((file, index) => ({
        url: mediaPreviews[index],
        type: file.type.startsWith('image/') ? 'image' : 'video'
      }));
      
      await createPost({
        content,
        platform,
        scheduledTime: scheduledTime.toISOString(),
        status,
        media: mediaUrls.length > 0 ? mediaUrls : undefined
      });
      
      toast({
        title: status === 'scheduled' ? "Post scheduled" : "Post created",
        description: status === 'scheduled' 
          ? "Your post has been scheduled successfully." 
          : `Your post has been created with status: ${status}.`,
      });
      
      // Show browser notification only for published posts
      // Scheduled posts will get notifications when actually published
      try {
        const token = localStorage.getItem('auth_token');
        const notifResponse = await fetch('/api/notifications', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (notifResponse.ok) {
          const preferences = await notifResponse.json();
          if (preferences.browserNotifications && status === 'published') {
            await notificationService.notifyPostPublished(platform, content);
          }
        }
      } catch (error) {
        console.log('Browser notification failed:', error);
      }
      
      // Reset form and context
      setContent('');
      setPlatform('');
      setDate(new Date());
      setTime('12:00');
      setStatus('scheduled');
      
      // Clean up media previews (no cleanup needed for data URLs)
      setMediaFiles([]);
      setMediaPreviews([]);
      
      // Close dialog and reset context
      closeAddPostDialog();
      resetState();
      
      // Force refetch posts data to show the new post in both Dashboard and Calendar
      queryClient.invalidateQueries({ queryKey: ['/api/calendar'] });
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      
      // Navigate to dashboard if created from calendar
      navigateToDashboardAfterPost();
      
      // Add a small delay and invalidate again to ensure data is updated
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/calendar'] });
        queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
        queryClient.invalidateQueries({ queryKey: ['posts'] });
      }, 500);
      
    } catch (error) {
      console.error('Failed to create post:', error);
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Simplified platform selection - avoid complex filtering that might cause issues
  const platforms = ['X', 'LinkedIn', 'Instagram', 'Facebook'];
  
  // Smart status options based on selected date
  const getStatusOptions = () => {
    if (!date) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0); // Start of selected date
    
    const isPast = selectedDate < today;
    const isFuture = selectedDate > today;
    const isToday = selectedDate.getTime() === today.getTime();
    
    if (isPast) {
      // Past dates: only published makes sense
      return [{ value: 'published', label: 'Published' }];
    } else {
      // Today and future: only Draft and Ready to Publish
      return [
        { value: 'draft', label: 'Draft' },
        { value: 'ready', label: 'Ready to Publish' }
      ];
    }
  };
  
  const statusOptions = getStatusOptions();

  return (
    <Dialog open={isAddPostDialogOpen} onOpenChange={closeAddPostDialog}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Post</DialogTitle>
          <DialogDescription>
            Create a new post to schedule across your social media platforms.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="platform">Platform</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {platforms.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What do you want to share?"
              className="min-h-[100px]"
            />
          </div>
          
          {/* Media Upload Section */}
          <div className="grid gap-2">
            <Label>Media</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {mediaPreviews.map((preview, index) => (
                <div key={index} className="relative w-20 h-20 border rounded overflow-hidden">
                  {mediaFiles[index]?.type.startsWith('image/') ? (
                    <img 
                      src={preview} 
                      alt={`Media ${index + 1}`} 
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
            <div className="flex gap-2">
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
            {mediaPreviews.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {mediaPreviews.length} {mediaPreviews.length === 1 ? 'file' : 'files'} selected
              </p>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <div className="relative w-full" onClick={() => (document.getElementById('date-input') as HTMLInputElement | null)?.showPicker()}>
                <div className="w-full px-3 py-2 border rounded-md flex justify-between items-center cursor-pointer">
                  <span>{date ? format(date, "MM/dd/yyyy") : "Pick a date"}</span>
                  <CalendarIcon className="h-4 w-4" />
                </div>
                <input
                  id="date-input"
                  type="date"
                  value={date ? format(date, "yyyy-MM-dd") : ''}
                  onChange={(e) => {
                    if (!e.target.value) {
                      setDate(undefined);
                      return;
                    }
                    // Fix timezone issue by parsing the date parts directly
                    const [year, month, day] = e.target.value.split('-').map(Number);
                    // Create date at noon to avoid timezone issues
                    const newDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
                    console.log('Selected date:', e.target.value);
                    console.log('Created date object:', newDate.toISOString());
                    setDate(newDate);
                  }}
                  className="sr-only"
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="time">Time</Label>
              <div className="relative w-full" onClick={() => (document.getElementById('time-input') as HTMLInputElement | null)?.showPicker()}>
                <div className="w-full px-3 py-2 border rounded-md flex justify-between items-center cursor-pointer">
                  <span>{time || "Select time"}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                </div>
                <input
                  id="time-input"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="sr-only"
                />
              </div>
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            {statusOptions.length === 1 ? (
              <div className="px-3 py-2 border rounded-md bg-gray-50 text-gray-700">
                {statusOptions[0].label}
                <p className="text-xs text-gray-500 mt-1">
                  Past dates are automatically marked as published
                </p>
              </div>
            ) : (
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={closeAddPostDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!content || !platform || !date || isLoading}
          >
            {isLoading ? 'Creating...' : status === 'scheduled' ? 'Schedule Post' : 'Create Post'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddPostDialog;