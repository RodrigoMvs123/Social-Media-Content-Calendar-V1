import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const SlackIntegrationTab = () => {
  const [botToken, setBotToken] = useState('');
  const [channelId, setChannelId] = useState('');
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
        description: "Your Slack integration settings have been saved.",
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
        <h3 className="text-lg font-medium">Slack Integration</h3>
        <p className="text-sm text-gray-500">
          Connect your Slack workspace to receive notifications about your scheduled posts.
        </p>
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
    </div>
  );
};

export default SlackIntegrationTab;