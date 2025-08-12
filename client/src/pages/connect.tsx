import { useState, useEffect } from 'react';
import { Helmet } from "react-helmet";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Linkedin, Instagram, Facebook, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Social Media Account interface
interface SocialMediaAccount {
  id: number;
  platform: string;
  username: string;
  connected: boolean;
  connectedAt: string;
  accessToken?: string;
  tokenExpiry?: string;
}



const ConnectPage = () => {
  const [connectedAccounts, setConnectedAccounts] = useState<SocialMediaAccount[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);


  // Load accounts from localStorage on mount
  useEffect(() => {
    const savedAccounts = localStorage.getItem('socialMediaAccounts');
    if (savedAccounts) {
      setConnectedAccounts(JSON.parse(savedAccounts));
    }
  }, []);

  // Save accounts to localStorage when they change
  useEffect(() => {
    if (connectedAccounts.length > 0) {
      localStorage.setItem('socialMediaAccounts', JSON.stringify(connectedAccounts));
    }
  }, [connectedAccounts]);

  const handleConnect = (account: SocialMediaAccount) => {
    setConnectedAccounts((prev) => {
      // Replace if already exists, otherwise add
      const exists = prev.findIndex((a) => a.platform === account.platform);
      if (exists >= 0) {
        const updated = [...prev];
        updated[exists] = account;
        return updated;
      }
      return [...prev, account];
    });
  };

  const handleDisconnect = (platform: string) => {
    setConnectedAccounts((prev) => prev.filter((account) => account.platform !== platform));
    setSelectedPlatforms((prev) => prev.filter(p => p !== platform));
  };

  const getAccountByPlatform = (platform: string) => {
    return connectedAccounts.find((account) => account.platform === platform);
  };

  const togglePlatformSelection = (platform: string) => {
    setSelectedPlatforms(prev => {
      if (prev.includes(platform)) {
        return prev.filter(p => p !== platform);
      } else {
        return [...prev, platform];
      }
    });
  };

  const handleOAuthConnect = (platform: string) => {
    // Redirect to the appropriate developer portal based on the platform
    let developerUrl = '';
    
    switch(platform) {
      case 'X':
        developerUrl = 'https://developer.twitter.com/';
        break;
      case 'LinkedIn':
        developerUrl = 'https://developer.linkedin.com/';
        break;
      case 'Facebook':
      case 'Instagram':
        developerUrl = 'https://developers.facebook.com/';
        break;
      default:
        developerUrl = '';
    }
    
    if (developerUrl) {
      window.open(developerUrl, '_blank');
    }
    
    // For demo purposes, we'll simulate a successful OAuth connection
    const mockAccount: SocialMediaAccount = {
      id: Math.floor(Math.random() * 1000),
      platform,
      username: `${platform.toLowerCase()}_user${Math.floor(Math.random() * 1000)}`,
      connected: true,
      connectedAt: new Date().toISOString(),
      accessToken: `oauth_token_${Math.random().toString(36).substring(2)}`,
      tokenExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    
    handleConnect(mockAccount);
  };

  const renderSocialMediaCard = (
    platform: string,
    icon: React.ReactNode,
    description: string
  ) => {
    const account = getAccountByPlatform(platform);
    const isSelected = selectedPlatforms.includes(platform);
    
    return (
      <Card className={isSelected ? 'border-blue-500 ring-2 ring-blue-200' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {icon}
            {platform}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {account ? (
            <div className="text-sm">
              <p className="font-medium text-green-600 flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-green-600"></span>
                Connected
              </p>
              <p className="text-gray-500 mt-1">Username: {account.username}</p>
              <p className="text-gray-500 text-xs mt-1">
                Connected on {new Date(account.connectedAt).toLocaleDateString()}
              </p>
              {account.tokenExpiry && (
                <p className="text-gray-500 text-xs mt-1">
                  Token expires: {new Date(account.tokenExpiry).toLocaleDateString()}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Not connected</p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          {account ? (
            <>
              <Button 
                variant="outline" 
                onClick={() => togglePlatformSelection(platform)}
                className="w-full"
              >
                {isSelected ? 'Deselect' : 'Select for Publishing'}
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => handleDisconnect(platform)}
                className="w-full"
              >
                Disconnect
              </Button>
            </>
          ) : (
            <Button 
              variant="outline" 
              onClick={() => handleOAuthConnect(platform)}
              className="w-full"
            >
              Connect with {platform} <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Connect Social Media - Social Media Content Calendar</title>
        <meta name="description" content="Connect your social media accounts" />
      </Helmet>
      
      <Header />
      
      <main className="flex-grow">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Connect Social Media</h2>
            <p className="text-gray-600 mt-1">Connect your social media accounts to schedule and publish content</p>
          </div>
          
          <Alert className="mb-6">
            <AlertTitle>OAuth Social Media Integration</AlertTitle>
            <AlertDescription>
              <p className="mb-2">
                To connect your social media accounts, you need to register as a developer on each platform and configure OAuth credentials.
              </p>
              <p className="text-sm">
                Click "Connect" to be redirected to the platform's developer portal to set up OAuth integration.
              </p>
            </AlertDescription>
          </Alert>
          
          {selectedPlatforms.length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Selected Platforms</h3>
              <div className="flex flex-wrap gap-2">
                {selectedPlatforms.map(platform => (
                  <Badge key={platform} className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                    {platform}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-blue-600 mt-2">
                Posts will be published to these platforms when scheduled
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {renderSocialMediaCard(
              "X",
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-gray-700"><path d="M4 4l11.733 16h4.267l-11.733 -16z"/><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"/></svg>,
              "Schedule and publish posts on X"
            )}
            
            {renderSocialMediaCard(
              "LinkedIn",
              <Linkedin className="h-5 w-5 text-blue-700" />,
              "Share professional updates"
            )}
            
            {renderSocialMediaCard(
              "Instagram",
              <Instagram className="h-5 w-5 text-pink-600" />,
              "Schedule photo and video posts"
            )}
            
            {renderSocialMediaCard(
              "Facebook",
              <Facebook className="h-5 w-5 text-blue-600" />,
              "Manage page posts and updates"
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ConnectPage;