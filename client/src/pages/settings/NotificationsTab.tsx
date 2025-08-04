import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const NotificationsTab = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);
  const [slackScheduled, setSlackScheduled] = useState(true);
  const [slackPublished, setSlackPublished] = useState(true);
  const [slackFailed, setSlackFailed] = useState(true);
  const { toast } = useToast();
  
  console.log('🔧 NotificationsTab component rendered');

  // Load Slack notification preferences on component mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('/api/slack/settings', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const settings = await response.json();
          if (settings.configured) {
            setSlackScheduled(settings.slackScheduled ?? true);
            setSlackPublished(settings.slackPublished ?? true);
            setSlackFailed(settings.slackFailed ?? true);
          }
        }
      } catch (error) {
        console.error('Failed to load Slack preferences:', error);
      } finally {
        setIsLoadingPreferences(false);
      }
    };
    
    loadPreferences();
  }, []);

  const handleSave = async () => {
    console.log('🔧 SAVE BUTTON CLICKED!');
    console.log('🔧 Current state:', { slackScheduled, slackPublished, slackFailed });
    console.log('🔧 About to make fetch request to /api/slack/preferences');
    setIsLoading(true);
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/slack/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          slackScheduled,
          slackPublished,
          slackFailed
        })
      });
      
      console.log('🔧 Response received:', response.status);
      
      if (response.ok) {
        console.log('✅ Save successful!');
        toast({
          title: "Settings saved",
          description: "Your Slack notification preferences have been saved.",
        });
      } else {
        console.log('❌ Save failed:', response.status);
        throw new Error('Failed to save preferences');
      }
    } catch (error) {
      console.log('❌ Error in save function:', error);
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
              checked={slackScheduled}
              onCheckedChange={setSlackScheduled}
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
              checked={slackPublished}
              onCheckedChange={setSlackPublished}
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
              checked={slackFailed}
              onCheckedChange={setSlackFailed}
            />
          </div>
        </div>
        
        <Button 
          onClick={async () => {
            console.log('🔧 SAVE BUTTON CLICKED DIRECTLY!');
            setIsLoading(true);
            try {
              const token = localStorage.getItem('auth_token');
              const response = await fetch('/api/slack/preferences', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  slackScheduled,
                  slackPublished,
                  slackFailed
                })
              });
              
              if (response.ok) {
                toast({ title: "Settings saved", description: "Your Slack notification preferences have been saved." });
              } else {
                throw new Error('Failed to save');
              }
            } catch (error) {
              toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
            } finally {
              setIsLoading(false);
            }
          }} 
          disabled={isLoading}
        >
          {isLoading ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </div>
  );
};

export default NotificationsTab;