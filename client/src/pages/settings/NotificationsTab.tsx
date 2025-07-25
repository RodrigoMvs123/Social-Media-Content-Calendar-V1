import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { notificationService } from '@/lib/notifications';

const NotificationsTab = () => {
  const [emailDigest, setEmailDigest] = useState(false);
  const [emailPostPublished, setEmailPostPublished] = useState(false);
  const [emailPostFailed, setEmailPostFailed] = useState(false);
  const [browserNotifications, setBrowserNotifications] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);
  const { toast } = useToast();

  // Load notification preferences on component mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('/api/notifications', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const preferences = await response.json();
          setEmailDigest(preferences.emailDigest);
          setEmailPostPublished(preferences.emailPostPublished);
          setEmailPostFailed(preferences.emailPostFailed);
          setBrowserNotifications(preferences.browserNotifications);
        }
      } catch (error) {
        console.error('Failed to load notification preferences:', error);
      } finally {
        setIsLoadingPreferences(false);
      }
    };
    
    loadPreferences();
  }, []);

  const handleSave = async () => {
    setIsLoading(true);
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          emailDigest,
          emailPostPublished,
          emailPostFailed,
          browserNotifications
        })
      });
      
      if (response.ok) {
        toast({
          title: "Settings saved",
          description: "Your notification preferences have been updated.",
        });
      } else {
        throw new Error('Failed to save preferences');
      }
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

  if (isLoadingPreferences) {
    return (
      <div className="space-y-6">
        <div className="text-center py-4">
          <p className="text-gray-500">Loading notification preferences...</p>
        </div>
      </div>
    );
  }

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
              {!notificationService.isSupported() && (
                <p className="text-xs text-red-500">
                  Browser notifications not supported
                </p>
              )}
            </div>
            <Switch
              id="browser-notifications"
              checked={browserNotifications}
              onCheckedChange={async (checked) => {
                if (checked) {
                  const granted = await notificationService.requestPermission();
                  if (granted) {
                    setBrowserNotifications(true);
                    toast({
                      title: "Notifications enabled",
                      description: "You'll now receive browser notifications.",
                    });
                  } else {
                    toast({
                      title: "Permission denied",
                      description: "Please enable notifications in your browser settings.",
                      variant: "destructive",
                    });
                  }
                } else {
                  setBrowserNotifications(false);
                }
              }}
              disabled={!notificationService.isSupported()}
            />
          </div>
        </div>
        
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Slack Notifications</h4>
          <p className="text-xs text-gray-500 mb-3">
            Send notifications to your connected Slack workspace
          </p>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="slack-scheduled">When a post is scheduled</Label>
              <p className="text-xs text-gray-500">
                Get notified when a new post is scheduled.
              </p>
            </div>
            <Switch
              id="slack-scheduled"
              checked={true}
              disabled
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="slack-published">When a post is published</Label>
              <p className="text-xs text-gray-500">
                Get notified when a post is successfully published.
              </p>
            </div>
            <Switch
              id="slack-published"
              checked={false}
              disabled
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="slack-failed">When a post fails to publish</Label>
              <p className="text-xs text-gray-500">
                Get notified when a post fails to publish.
              </p>
            </div>
            <Switch
              id="slack-failed"
              checked={false}
              disabled
            />
          </div>
          
          <p className="text-xs text-gray-400 italic">
            Note: Slack notifications are currently configured in the Slack Integration tab.
          </p>
        </div>
        
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </div>
  );
};

export default NotificationsTab;