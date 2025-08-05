import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import SlackStatus from '@/components/slack/SlackStatus';
import { slackEvents } from '@/lib/slackEvents';

const SlackIntegrationTab = () => {
  const [botToken, setBotToken] = useState('');
  const [channelId, setChannelId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [slackScheduled, setSlackScheduled] = useState(true);
  const [slackPublished, setSlackPublished] = useState(true);
  const [slackFailed, setSlackFailed] = useState(true);
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  console.log('🔧 SlackIntegrationTab loaded with notification prefs');
  
  // Load notification preferences on mount
  useEffect(() => {
    const loadNotificationPrefs = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('/api/slack/settings', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const settings = await response.json();
          console.log('🔧 Loaded notification settings:', settings);
          if (settings.configured) {
            setSlackScheduled(settings.slackScheduled !== false);
            setSlackPublished(settings.slackPublished !== false);
            setSlackFailed(settings.slackFailed !== false);
          }
        }
      } catch (error) {
        console.error('Failed to load notification preferences:', error);
      }
    };
    
    loadNotificationPrefs();
  }, []);

  const handleDisconnect = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/slack/disconnect', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        toast({
          title: "Disconnected",
          description: "Slack integration has been disconnected.",
        });
        
        // Clear form fields
        setBotToken('');
        setChannelId('');
        
        // Invalidate queries and emit event
        queryClient.invalidateQueries({ queryKey: ['/api/slack/status'] });
        slackEvents.emitStatusChange();
      } else {
        throw new Error('Failed to disconnect');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect Slack integration.",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/slack/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          botToken: botToken.trim(),
          channelId,
          channelName: channelId // Using channelId as name for simplicity
        })
      });
      
      if (response.ok) {
        toast({
          title: "Settings saved",
          description: "Your Slack integration settings have been saved.",
        });
        
        // Invalidate queries to refresh status
        queryClient.invalidateQueries({ queryKey: ['/api/slack/status'] });
        slackEvents.emitStatusChange();
      } else {
        throw new Error('Failed to save settings');
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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Slack Integration</h3>
        <p className="text-sm text-gray-500">
          Connect your Slack workspace to receive notifications about your scheduled posts.
        </p>
      </div>
      
      <div className="flex justify-between items-center mb-4">
        <SlackStatus className="flex-grow" />
        <Button 
          variant="outline" 
          onClick={handleDisconnect} 
          className="ml-4"
        >
          Disconnect
        </Button>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="bot-token">Bot Token</Label>
          <Input
            id="bot-token"
            placeholder="xoxb-your-token"
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
          />
          <p className="text-xs text-gray-500">
            You can find this in your Slack App's settings under "OAuth & Permissions".
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="channel-id">Channel ID</Label>
          <Input
            id="channel-id"
            placeholder="C12345"
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
          />
          <p className="text-xs text-gray-500">
            The ID of the channel where notifications should be sent.
          </p>
        </div>
        
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Settings"}
        </Button>
      </div>
      
      <div className="mt-8 pt-8 border-t">
        <h3 className="text-lg font-medium mb-4">Notification Preferences</h3>
        <p className="text-sm text-gray-500 mb-6">
          Choose when you want to receive Slack notifications for your posts.
        </p>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="slack-scheduled"
              checked={slackScheduled}
              onChange={(e) => setSlackScheduled(e.target.checked)}
              className="h-4 w-4"
            />
            <div>
              <label htmlFor="slack-scheduled" className="text-sm font-medium">When a post is scheduled</label>
              <p className="text-xs text-gray-500">Get notified when a new post is scheduled.</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="slack-published"
              checked={slackPublished}
              onChange={(e) => setSlackPublished(e.target.checked)}
              className="h-4 w-4"
            />
            <div>
              <label htmlFor="slack-published" className="text-sm font-medium">When a post is published</label>
              <p className="text-xs text-gray-500">Get notified when a post is successfully published.</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="slack-failed"
              checked={slackFailed}
              onChange={(e) => setSlackFailed(e.target.checked)}
              className="h-4 w-4"
            />
            <div>
              <label htmlFor="slack-failed" className="text-sm font-medium">When a post fails to publish</label>
              <p className="text-xs text-gray-500">Get notified when a post fails to publish.</p>
            </div>
          </div>
        </div>
        
        <Button 
          onClick={async () => {
            console.log('🔧 Saving notification preferences:', { slackScheduled, slackPublished, slackFailed });
            setIsLoadingPrefs(true);
            
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
              
              const result = await response.json();
              console.log('🔧 Notification preferences save result:', result);
              
              if (response.ok) {
                toast({
                  title: "Notification preferences saved",
                  description: "Your Slack notification settings have been updated.",
                });
              } else {
                throw new Error('Failed to save preferences');
              }
            } catch (error) {
              console.error('🔧 Error saving preferences:', error);
              toast({
                title: "Error",
                description: "Failed to save notification preferences.",
                variant: "destructive",
              });
            } finally {
              setIsLoadingPrefs(false);
            }
          }}
          disabled={isLoadingPrefs}
          className="mt-4"
        >
          {isLoadingPrefs ? 'Saving...' : 'Save Notification Preferences'}
        </Button>
      </div>
    </div>
  );
};

export default SlackIntegrationTab;