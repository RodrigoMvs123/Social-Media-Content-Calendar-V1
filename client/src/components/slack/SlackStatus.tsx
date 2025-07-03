import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Slack as SlackIcon, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface SlackStatusProps {
  className?: string;
}

interface SlackStatusResponse {
  connected: boolean;
  channelConfigured: boolean;
  tokenConfigured: boolean;
}

const SlackStatus = ({ className }: SlackStatusProps) => {
  // Set errorShown to false initially to hide the error message
  const [errorShown, setErrorShown] = useState(false);
  
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['/api/slack/status'],
    queryFn: async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('http://localhost:3001/api/slack/status', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch Slack status');
        }
        return response.json() as Promise<SlackStatusResponse>;
      } catch (error) {
        console.error('Slack status error:', error);
        // Always return default state instead of throwing
        return { connected: false, channelConfigured: false, tokenConfigured: false };
      }
    },
    // Don't show error on initial load
    retry: false,
    refetchOnWindowFocus: false
  });

  // Function to manually check connection and show errors
  const checkConnection = () => {
    setErrorShown(true);
    refetch();
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <SlackIcon className="h-5 w-5 text-slate-400 animate-pulse" />
            <span className="text-sm text-slate-500">Checking Slack connection...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Only show error if errorShown is true
  if (isError && errorShown) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Connection Error</AlertTitle>
        <AlertDescription>
          Unable to check Slack integration status. 
          <Button variant="link" onClick={() => refetch()} className="p-0 h-auto text-xs font-normal underline">
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return null;
  }

  if (data.connected) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <SlackIcon className="h-5 w-5 text-[#4A154B]" />
              <span className="text-sm font-medium">Slack Integration</span>
            </div>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle className="mr-1 h-3 w-3" />
              Connected
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Alert className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Slack Integration Incomplete</AlertTitle>
      <AlertDescription>
        {!data.tokenConfigured && !data.channelConfigured ? (
          "Slack bot token and channel ID are missing. Configure them in the settings below."
        ) : !data.tokenConfigured ? (
          "Slack bot token is missing. Configure it in the settings below."
        ) : (
          "Slack channel ID is missing. Configure it in the settings below."
        )}
      </AlertDescription>
    </Alert>
  );
};

export default SlackStatus;