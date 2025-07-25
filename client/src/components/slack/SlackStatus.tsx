import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Slack as LucideSlackIcon, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { slackEvents } from '@/lib/slackEvents';

// Official Slack Icon Component
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
  const queryClient = useQueryClient();
  
  // Effect to refresh status when component mounts or when status changes
  useEffect(() => {
    // Invalidate the query cache to force a fresh fetch
    queryClient.invalidateQueries({ queryKey: ['/api/slack/status'] });
    
    // Subscribe to status change events
    const unsubscribe = slackEvents.subscribe(() => {
      console.log('SlackStatus: Received status change event, refetching...');
      queryClient.invalidateQueries({ queryKey: ['/api/slack/status'] });
      refetch();
    });
    
    // Cleanup subscription
    return () => unsubscribe();
  }, [queryClient]);
  
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['/api/slack/status'],
    queryFn: async () => {
      try {
        console.log('Fetching Slack status...');
        const token = localStorage.getItem('auth_token');
        const response = await fetch('/api/slack/status', {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          // Add cache busting parameter
          cache: 'no-store'
        });
        if (!response.ok) {
          throw new Error('Failed to fetch Slack status');
        }
        const result = await response.json();
        console.log('Slack status result:', result);
        return result as SlackStatusResponse;
      } catch (error) {
        console.error('Slack status error:', error);
        // Always return default state instead of throwing
        return { connected: false, channelConfigured: false, tokenConfigured: false };
      }
    },
    // Don't show error on initial load
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: 5000, // Refresh every 5 seconds
    staleTime: 0 // Consider data always stale
  });

  // Function to manually check connection and show errors
  const checkConnection = () => {
    setErrorShown(true);
    queryClient.invalidateQueries({ queryKey: ['/api/slack/status'] });
    refetch();
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <LucideSlackIcon className="h-5 w-5 text-slate-400 animate-pulse" />
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
              <SlackIcon />
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

  // Show disconnected status
  return (
    <Card className={className}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <SlackIcon />
            <span className="text-sm font-medium">Slack Integration</span>
          </div>
          <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
            Disconnected
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default SlackStatus;