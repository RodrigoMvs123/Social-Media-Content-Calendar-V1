import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from "react-helmet";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ExternalLink, CheckCircle, XCircle } from 'lucide-react';

const OAuthSetupPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [platform, setPlatform] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get platform from URL
    const platformParam = searchParams.get('platform') || '';
    setPlatform(platformParam);

    // Check if OAuth is configured for this platform
    checkOAuthConfiguration(platformParam);
  }, [searchParams]);

  const checkOAuthConfiguration = async (platformName: string) => {
    try {
      const response = await fetch(`/api/oauth/check/${platformName}`);
      const data = await response.json();
      setIsConfigured(data.configured);
    } catch (error) {
      setIsConfigured(false);
    } finally {
      setIsLoading(false);
    }
  };

  const getDeveloperPortalUrl = (platformName: string) => {
    const urls: { [key: string]: string } = {
      'twitter': 'https://developer.twitter.com/',
      'linkedin': 'https://developer.linkedin.com/',
      'facebook': 'https://developers.facebook.com/',
      'instagram': 'https://developers.facebook.com/'
    };
    return urls[platformName] || '';
  };

  const getPlatformDisplayName = (platformName: string) => {
    const names: { [key: string]: string } = {
      'twitter': 'X (Twitter)',
      'linkedin': 'LinkedIn',
      'facebook': 'Facebook',
      'instagram': 'Instagram'
    };
    return names[platformName] || platformName;
  };

  const handleConnect = () => {
    if (isConfigured) {
      // Proceed with OAuth flow
      window.location.href = `/api/oauth/${platform}`;
    }
  };

  const handleGoToDeveloperPortal = () => {
    const url = getDeveloperPortalUrl(platform);
    if (url) {
      window.open(url, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>{getPlatformDisplayName(platform)} OAuth Setup - Social Media Content Calendar</title>
      </Helmet>
      
      <Header />
      
      <main className="flex-grow flex items-center justify-center py-12">
        <div className="max-w-2xl mx-auto px-4">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">
                {getPlatformDisplayName(platform)} Integration
              </CardTitle>
              <CardDescription>
                Connect your {getPlatformDisplayName(platform)} account to schedule posts
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {isConfigured ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>OAuth Credentials Configured</AlertTitle>
                  <AlertDescription>
                    Your {getPlatformDisplayName(platform)} OAuth credentials are properly configured. 
                    Click the button below to connect your account.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>OAuth Setup Required</AlertTitle>
                  <AlertDescription>
                    To connect {getPlatformDisplayName(platform)}, you need to:
                    <ol className="list-decimal list-inside mt-2 space-y-1">
                      <li>Create a developer app on {getPlatformDisplayName(platform)}</li>
                      <li>Get your OAuth credentials (Client ID and Secret)</li>
                      <li>Add them to your .env file</li>
                      <li>Restart the application</li>
                    </ol>
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="flex flex-col gap-3">
                {isConfigured ? (
                  <Button onClick={handleConnect} className="w-full">
                    Connect with {getPlatformDisplayName(platform)}
                  </Button>
                ) : (
                  <Button onClick={handleGoToDeveloperPortal} variant="outline" className="w-full">
                    Go to {getPlatformDisplayName(platform)} Developer Portal
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                )}
                
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/connect')}
                  className="w-full"
                >
                  Back to Social Media Connections
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default OAuthSetupPage;