import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

// Slack Icon Component
const SlackIcon = () => (
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
);

const SlackSettingsFixed = () => {
  const { toast } = useToast();
  const [botToken, setBotToken] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);

  // Load existing settings
  const { data: slackSettings, refetch } = useQuery({
    queryKey: ['/api/slack/settings'],
    queryFn: async () => {
      try {
        const token = localStorage.getItem('auth_token');
        console.log('Loading Slack settings...');
        const response = await fetch('http://localhost:3001/api/slack/settings', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          console.log('Settings not found or error:', response.status);
          return { configured: false };
        }
        const data = await response.json();
        console.log('Loaded settings:', data);
        return data;
      } catch (error) {
        console.error('Error loading settings:', error);
        return { configured: false };
      }
    },
    retry: false
  });

  // Show if settings are configured
  useEffect(() => {
    if (slackSettings?.configured) {
      // Show that settings are saved, but don't show validation details
      setValidationResult({ 
        valid: true, 
        configured: true,
        botInfo: { team: 'Saved', user: 'Configuration loaded from database' }
      });
      // Show placeholder in input to indicate token is saved
      setBotToken('••••••••••••••••••••••••••••••••••••••••••••••••••••');
    } else {
      setValidationResult(null);
      setBotToken('');
    }
  }, [slackSettings]);

  const validateBotToken = async () => {
    if (!botToken.trim()) {
      toast({
        title: "Error",
        description: "Please enter a bot token",
        variant: "destructive",
      });
      return;
    }

    setIsValidating(true);
    try {
      const authToken = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3001/api/slack/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ botToken: botToken.trim() })
      });
      
      const data = await response.json();
      setValidationResult(data);
      
      if (data.valid) {
        toast({
          title: "Bot Token Valid!",
          description: `Connected to ${data.botInfo.team} as ${data.botInfo.user}`,
        });
      } else {
        toast({
          title: "Invalid Bot Token",
          description: data.error || "Please check your Slack bot token.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Validation error:', error);
      toast({
        title: "Error",
        description: "Failed to validate bot token",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    if (!botToken.trim()) {
      toast({
        title: "Error",
        description: "Please enter a bot token",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const authToken = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3001/api/slack/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          botToken: botToken.trim(),
          channelId: 'DM_PLACEHOLDER',
          channelName: 'Direct Messages'
        })
      });
      
      if (response.ok) {
        toast({
          title: "Settings Saved",
          description: "Your Slack integration settings have been saved.",
        });
        // Refresh the settings query to show updated state
        refetch();
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
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
          <SlackIcon />
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
              placeholder={slackSettings?.configured ? "Token saved (enter new token to update)" : "xoxb-..."}
              value={botToken}
              onChange={(e) => {
                setBotToken(e.target.value);
                setValidationResult(null);
              }}
              onFocus={() => {
                if (slackSettings?.configured && botToken.includes('•')) {
                  setBotToken('');
                }
              }}
              className="flex-1"
            />
            <Button 
              variant="outline" 
              onClick={validateBotToken}
              disabled={!botToken || isValidating}
            >
              {isValidating ? 'Validating...' : 'Validate'}
            </Button>
          </div>
          {validationResult && (
            <div className={`text-xs p-2 rounded ${
              validationResult.valid 
                ? 'bg-green-50 text-green-700' 
                : 'bg-red-50 text-red-700'
            }`}>
              {validationResult.valid ? (
                validationResult.configured 
                  ? `✓ Slack integration configured and saved`
                  : `✓ Valid token for ${validationResult.botInfo?.team || 'Unknown'} (${validationResult.botInfo?.user || 'Unknown'})`
              ) : (
                `✗ ${validationResult.error}`
              )}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSave} 
          disabled={isSaving || !botToken.trim()}
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SlackSettingsFixed;