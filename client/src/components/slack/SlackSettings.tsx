import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { slackEvents } from '@/lib/slackEvents';

interface SlackChannel {
  id: string;
  name: string;
  type: 'dm' | 'channel';
}

interface SlackSettings {
  configured: boolean;
  channelId?: string;
  channelName?: string;
  isActive?: boolean;
  hasToken?: boolean;
}

const SlackSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);

  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [botToken, setBotToken] = useState('');
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [validationResult, setValidationResult] = useState<any>(null);

  const { data: slackSettings, isLoading, refetch } = useQuery({
    queryKey: ['/api/slack/settings'],
    queryFn: async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('/api/slack/settings', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          console.error('Slack settings fetch failed:', response.status);
          return { configured: false };
        }
        return response.json() as Promise<SlackSettings>;
      } catch (error) {
        console.error('Slack settings error:', error);
        return { configured: false };
      }
    },
    retry: false
  });

  // Load existing settings when component mounts
  useEffect(() => {
    if (slackSettings?.configured) {
      setSelectedChannelId(slackSettings.channelId || '');
      // Load token from environment if configured (for persistence)
      if (slackSettings.hasToken) {
        const envToken = process.env.SLACK_BOT_TOKEN || localStorage.getItem('slack_bot_token');
        if (envToken) {
          setBotToken(envToken);
          setValidationResult({ valid: true, botInfo: { team: 'Your Workspace', user: 'Bot' } });
          loadChannels(envToken);
        }
      }
    }
  }, [slackSettings]);

  // Validate bot token
  const validateBotToken = async (token: string) => {
    if (!token) {
      setValidationResult(null);
      return;
    }

    setIsValidating(true);
    try {
      const authToken = localStorage.getItem('auth_token');
      const cleanToken = token.trim();
      
      const response = await fetch('/api/slack/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ botToken: cleanToken })
      });
      
      const data = await response.json();
      setValidationResult(data);
      
      if (data.valid) {
        // Save token to localStorage for persistence
        localStorage.setItem('slack_bot_token', cleanToken);
        
        toast({
          title: "Bot Token Valid!",
          description: `Connected to ${data.botInfo.team} as ${data.botInfo.user}`,
        });
        // Load channels after successful validation
        await loadChannels(cleanToken);
        // Notify status change
        slackEvents.emitStatusChange();
      } else {
        toast({
          title: "Invalid Bot Token",
          description: data.error || "Please check your Slack bot token.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Validation error:', error);
      setValidationResult({ valid: false, error: 'Network error' });
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      toast({
        title: "Error",
        description: `Failed to validate bot token: ${message}`,
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  // Load channels when bot token changes
  const loadChannels = async (token: string) => {
    if (!token) {
      setChannels([]);
      return;
    }

    setIsLoadingChannels(true);
    try {
      const authToken = localStorage.getItem('auth_token');
      const response = await fetch('/api/slack/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ botToken: token })
      });
      
      if (response.ok) {
        const data = await response.json();
        setChannels(data.channels || []);
        
        if (data.message) {
          toast({
            title: "Bot Token Valid",
            description: data.message,
            variant: "default",
          });
        }
      } else {
        const errorData = await response.json();
        setChannels([]);
        toast({
          title: "Error Loading Channels",
          description: errorData.details || "Please check your bot token.",
          variant: "destructive",
        });
      }
    } catch (error) {
      setChannels([]);
      toast({
        title: "Error",
        description: "Failed to load Slack channels.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingChannels(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!botToken || !selectedChannelId) {
      toast({
        title: "Validation Error",
        description: "Please enter bot token and select a channel.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSaving(true);
    try {
      const selectedChannel = channels.find(c => c.id === selectedChannelId);
      const authToken = localStorage.getItem('auth_token');
      
      const response = await fetch('/api/slack/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          botToken: botToken.trim(),
          channelId: selectedChannelId,
          channelName: selectedChannel?.name
        })
      });
      
      if (response.ok) {
        toast({
          title: "Settings Saved",
          description: "Your Slack integration settings have been updated successfully.",
        });
        // Invalidate both settings and status queries
        queryClient.invalidateQueries({ queryKey: ['/api/slack/settings'] });
        queryClient.invalidateQueries({ queryKey: ['/api/slack/status'] });
        await refetch();
        // Notify status change
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
      setIsSaving(false);
    }
  };



  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            <p>Error loading Slack settings: {error}</p>
            <button 
              onClick={() => {
                setError(null);
                refetch();
              }}
              className="mt-2 text-blue-600 underline"
            >
              Try again
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

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
          <Label htmlFor="bot-token">Bot Token</Label>
          <p className="text-xs text-gray-500 mb-2">
            Enter your Slack bot token (starts with xoxb-). This allows the app to send messages to your Slack workspace.
          </p>
          <div className="flex gap-2">
            <Input
              id="bot-token"
              type="password"
              placeholder="xoxb-..."
              value={botToken}
              onChange={(e) => {
                const value = e.target.value.trim();
                setBotToken(value);
                setValidationResult(null);
                setChannels([]);
                setSelectedChannelId('');
              }}
              onPaste={(e) => {
                e.preventDefault();
                const pastedText = e.clipboardData.getData('text').trim();
                setBotToken(pastedText);
                setValidationResult(null);
                setChannels([]);
                setSelectedChannelId('');
              }}
              className="flex-1"
            />
            <Button 
              variant="outline" 
              onClick={() => validateBotToken(botToken)}
              disabled={!botToken || isValidating}
            >
              {isValidating ? 'Validating...' : 'Validate'}
            </Button>
          </div>
          {validationResult && (
            <div className={`text-xs p-2 rounded ${validationResult.valid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {validationResult.valid ? (
                `✓ Valid token for ${validationResult.botInfo?.team} (${validationResult.botInfo?.user})`
              ) : (
                `✗ ${validationResult.error}`
              )}
            </div>
          )}
        </div>

        {validationResult?.valid && (
          <div className="space-y-2">
            <Label htmlFor="channel-select">Channel</Label>
            <p className="text-xs text-gray-500 mb-2">
              Select where you want to receive notifications.
            </p>
            <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
              <SelectTrigger>
                <SelectValue placeholder={isLoadingChannels ? "Loading channels..." : "Select a channel"} />
              </SelectTrigger>
              <SelectContent>
                {channels.map((channel) => (
                  <SelectItem key={channel.id} value={channel.id}>
                    {channel.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {channels.length === 0 && botToken && !isLoadingChannels && (
              <p className="text-xs text-red-600">No channels found. Please check your bot token.</p>
            )}
          </div>
        )}

        <div className="pt-2">
          <a
            href="https://api.slack.com/apps"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ExternalLink className="mr-1 h-3 w-3" />
            Open Slack API Dashboard
          </a>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end items-center">
        <Button 
          onClick={handleSaveSettings} 
          disabled={isSaving || !botToken || !selectedChannelId}
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SlackSettings;