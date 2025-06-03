import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const NotificationsTab = () => {
  const [emailDigest, setEmailDigest] = useState(true);
  const [emailPostPublished, setEmailPostPublished] = useState(true);
  const [emailPostFailed, setEmailPostFailed] = useState(false);
  const [browserNotifications, setBrowserNotifications] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setIsLoading(true);
    
    try {
      // In a real app, you would save these settings to your backend
      // For now, we'll just simulate a successful save
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Settings saved",
        description: "Your notification preferences have been updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Notification Preferences</h3>
        <p className="text-sm text-gray-500">
          Choose how and when you want to be notified about your scheduled posts.
        </p>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Email Notifications</h4>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-digest">Daily Digest</Label>
              <p className="text-xs text-gray-500">
                Receive a daily summary of your scheduled posts.
              </p>
            </div>
            <Switch
              id="email-digest"
              checked={emailDigest}
              onCheckedChange={setEmailDigest}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-published">Post Published</Label>
              <p className="text-xs text-gray-500">
                Receive an email when a post is successfully published.
              </p>
            </div>
            <Switch
              id="email-published"
              checked={emailPostPublished}
              onCheckedChange={setEmailPostPublished}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-failed">Post Failed</Label>
              <p className="text-xs text-gray-500">
                Receive an email when a post fails to publish.
              </p>
            </div>
            <Switch
              id="email-failed"
              checked={emailPostFailed}
              onCheckedChange={setEmailPostFailed}
            />
          </div>
        </div>
        
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Browser Notifications</h4>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="browser-notifications">Enable Notifications</Label>
              <p className="text-xs text-gray-500">
                Receive browser notifications for important events.
              </p>
            </div>
            <Switch
              id="browser-notifications"
              checked={browserNotifications}
              onCheckedChange={setBrowserNotifications}
            />
          </div>
        </div>
        
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </div>
  );
};

export default NotificationsTab;