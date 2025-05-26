import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExternalLink } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { loadSettings, saveSettingsToServer } from '@/lib/localStorage';

interface SlackStatusResponse {
  connected: boolean;
  channelConfigured: boolean;
  tokenConfigured: boolean;
}

const SlackSettings = () => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  // Load initial values from localStorage
  const storedSettings = loadSettings();
  const [botToken, setBotToken] = useState(storedSettings.botToken || '');
  const [channelId, setChannelId] = useState(storedSettings.channelId || '');

  const { data: slackStatus, isLoading, refetch } = useQuery({
    queryKey: ['/api/slack/status'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/slack/status');
        if (!response.ok) {
          throw new Error('Failed to fetch Slack status');
        }
        return response.json() as Promise<SlackStatusResponse>;
      } catch (error) {
        // Provide a mock response for demo purposes
        return {
          connected: false,
          channelConfigured: false,
          tokenConfigured: false
        } as SlackStatusResponse;
      }
    }
  });

  // This would be a real API call in production
  const handleSaveSettings = async () => {
    if (!botToken && !channelId) {
      toast({
        title: "Validation Error",
        description: "Please enter either a Bot Token or Channel ID to save.",
        variant: "destructive",
      });
      return;
    }
    
    // In a real app, this would be a POST request to save the settings
    setIsSaving(true);
    try {
      // Simulating API request
      await new Promise(resolve => setTimeout(resolve, 500)); // Add delay for better UX
      
      // Save to localStorage and server
      await saveSettingsToServer({
        botToken,
        channelId
      });
      
      toast({
        title: "Settings Saved",
        description: "Your Slack integration settings have been updated successfully.",
      });
      await refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" width="20" height="20" className="h-5 w-5">
            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52z" fill="#E01E5A"/>
            <path d="M6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/>
            <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834z" fill="#36C5F0"/>
            <path d="M8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/>
            <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834z" fill="#2EB67D"/>
            <path d="M17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D"/>
            <path d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52z" fill="#ECB22E"/>
            <path d="M15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#ECB22E"/>
          </svg>
          Slack Integration
        </CardTitle>
        <CardDescription>
          Connect your calendar to Slack for notifications when posts are scheduled.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center">
            <Label htmlFor="bot-token" className="flex-grow">Bot Token</Label>
            <div className="ml-4">
              <p className="text-xs text-gray-500">
                A Bot Token allows this app to send messages to your Slack workspace.
              </p>
            </div>
          </div>
          <Input
            id="bot-token"
            type="password"
            placeholder="xoxb-..."
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
          />
          {slackStatus?.tokenConfigured && (
            <p className="text-xs text-green-600">✓ Token configured in environment</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center">
            <Label htmlFor="channel-id" className="flex-grow">Channel ID</Label>
            <div className="ml-4">
              <p className="text-xs text-gray-500">
                The Channel ID is where notifications will be sent.
              </p>
            </div>
          </div>
          <Input
            id="channel-id"
            placeholder="C04HL619LG"
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
          />
          {slackStatus?.channelConfigured && (
            <p className="text-xs text-green-600">✓ Channel configured in environment</p>
          )}
        </div>

        <div className="pt-2">
          <Button
            asChild
            variant="link"
            className="h-auto p-0 text-sm text-gray-500"
          >
            <a
              href="https://api.slack.com/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center"
            >
              <ExternalLink className="mr-1 h-3 w-3" />
              Open Slack API Dashboard
            </a>
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <div>
          {slackStatus?.connected && (
            <span className="text-sm text-green-600">✓ Connected to Slack</span>
          )}
        </div>
        <Button onClick={handleSaveSettings} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SlackSettings;