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
    // Clear any old mock data on first load
    const savedAccounts = localStorage.getItem('socialMediaAccounts');
    if (savedAccounts) {
      try {
        const accounts = JSON.parse(savedAccounts);
        // Only keep accounts that have real OAuth tokens (not mock tokens)
        const realAccounts = accounts.filter((account: SocialMediaAccount) => 
          account.accessToken && !account.accessToken.startsWith('mock_token_') && !account.accessToken.startsWith('oauth_token_')
        );
        setConnectedAccounts(realAccounts);
        if (realAccounts.length !== accounts.length) {
          // Update localStorage to remove mock accounts
          localStorage.setItem('socialMediaAccounts', JSON.stringify(realAccounts));
        }
      } catch (error) {
        // Clear corrupted data
        localStorage.removeItem('socialMediaAccounts');
      }
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
    // Redirect to our OAuth initiation endpoint
    const platformMap: { [key: string]: string } = {
      'X': 'twitter',
      'LinkedIn': 'linkedin', 
      'Facebook': 'facebook',
      'Instagram': 'instagram'
    };
    
    const oauthPlatform = platformMap[platform];
    if (oauthPlatform) {
      // Redirect to our OAuth endpoint which will handle the flow
      window.location.href = `/api/oauth/${oauthPlatform}`;
    }
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
              className="w-full py-3 px-4 text-sm"
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
            <AlertTitle>Connect Your Social Media Accounts</AlertTitle>
            <AlertDescription>
              <p className="mb-3">
                First time connecting? We'll guide you through the setup process.
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/social-setup'}
                className="mb-2"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Setup Guide for New Users
              </Button>
              <p className="text-xs text-gray-600">
                Already have OAuth credentials? Click "Connect" below to authenticate.
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
              <svg className="h-5 w-5 text-blue-700" fill="#0077B5" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
              "Share professional updates"
            )}
            
            {renderSocialMediaCard(
              "Instagram",
              <Instagram className="h-5 w-5 text-pink-600" />,
              "Schedule photo and video posts"
            )}
            
            {renderSocialMediaCard(
              "Facebook",
              <svg className="h-5 w-5 text-blue-600" fill="#1877F2" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
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