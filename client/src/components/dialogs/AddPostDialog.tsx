import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { socialAccountsApi, createPost } from '@/lib/api';
import { SocialMediaAccount } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { usePostContext } from '@/contexts/PostContext';
import { useQueryClient } from '@tanstack/react-query';

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
    resetState
  } = usePostContext();
  
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [platform, setPlatform] = useState('');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState('12:00');
  const [connectedAccounts, setConnectedAccounts] = useState<SocialMediaAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
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
    }
  }, [isAddPostDialogOpen, aiGeneratedContent, selectedPlatform, content, platform]);
  
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
  
  const handleSubmit = async () => {
    if (!content || !platform || !date) return;
    
    try {
      setIsLoading(true);
      
      // Combine date and time
      const [hours, minutes] = time.split(':').map(Number);
      const scheduledTime = new Date(date);
      scheduledTime.setHours(hours, minutes);
      
      await createPost({
        content,
        platform,
        scheduledTime: scheduledTime.toISOString(),
        status: 'scheduled',
      });
      
      toast({
        title: "Post scheduled",
        description: "Your post has been scheduled successfully.",
      });
      
      // Reset form and context
      setContent('');
      setPlatform('');
      setDate(new Date());
      setTime('12:00');
      
      // Close dialog and reset context
      closeAddPostDialog();
      resetState();
      
      // Force refetch posts data to show the new post
      queryClient.invalidateQueries(['/api/calendar']);
      
      // Add a small delay and refetch again to ensure data is updated
      setTimeout(() => {
        queryClient.refetchQueries(['/api/calendar']);
      }, 500);
      
    } catch (error) {
      console.error('Failed to create post:', error);
      toast({
        title: "Error",
        description: "Failed to schedule post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Simplified platform selection - avoid complex filtering that might cause issues
  const platforms = ['Twitter', 'LinkedIn', 'Instagram', 'Facebook'];

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
          
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <div className="relative w-full" onClick={() => document.getElementById('date-input')?.showPicker()}>
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
                    const newDate = new Date(year, month - 1, day, 12, 0, 0);
                    setDate(newDate);
                  }}
                  className="sr-only"
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="time">Time</Label>
              <div className="relative w-full" onClick={() => document.getElementById('time-input')?.showPicker()}>
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
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={closeAddPostDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!content || !platform || !date || isLoading}
          >
            {isLoading ? 'Scheduling...' : 'Schedule Post'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddPostDialog;