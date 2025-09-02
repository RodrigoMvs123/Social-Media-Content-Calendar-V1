import { Helmet } from "react-helmet";
import { useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, ExternalLink, CheckCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

const SocialSetup = () => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  // Get current domain for callback URLs
  const currentDomain = window.location.origin.replace(':3000', ':3001'); // Use server port
  
  const platforms = {
    twitter: {
      name: 'X (Twitter)',
      color: 'bg-black',
      developerUrl: 'https://developer.twitter.com/',
      callbackUrl: `${currentDomain}/api/oauth/callback/twitter`,
      steps: [
        'Go to X Developer Portal',
        'Create a new App',
        'In App Settings → Authentication settings',
        'Add the callback URL below',
        'Copy your Client ID and Secret',
        'Paste them in the form below'
      ]
    },
    linkedin: {
      name: 'LinkedIn',
      color: 'bg-blue-600',
      developerUrl: 'https://developer.linkedin.com/',
      callbackUrl: `${currentDomain}/api/oauth/callback/linkedin`,
      steps: [
        'Go to LinkedIn Developer Portal',
        'Create a new App',
        'In Auth tab → OAuth 2.0 settings',
        'Add the redirect URL below',
        'Copy your Client ID and Secret',
        'Paste them in the form below'
      ]
    },
    facebook: {
      name: 'Facebook',
      color: 'bg-blue-500',
      developerUrl: 'https://developers.facebook.com/',
      callbackUrl: `${currentDomain}/api/oauth/callback/facebook`,
      steps: [
        'Go to Meta for Developers',
        'Create a new App',
        'Add Facebook Login product',
        'In Facebook Login → Settings',
        'Add the redirect URI below',
        'Copy your App ID and Secret'
      ]
    },
    instagram: {
      name: 'Instagram',
      color: 'bg-pink-500',
      developerUrl: 'https://developers.facebook.com/',
      callbackUrl: `${currentDomain}/api/oauth/callback/instagram`,
      steps: [
        'Go to Meta for Developers',
        'Create a new App',
        'Add Instagram Basic Display',
        'In Instagram Basic Display → Settings',
        'Add the redirect URI below',
        'Copy your App ID and Secret'
      ]
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "URL copied to clipboard",
    });
  };

  const handlePlatformSelect = (platform: string) => {
    setSelectedPlatform(platform);
    setCurrentStep(2);
  };

  const handleOpenDeveloper = () => {
    if (selectedPlatform) {
      window.open(platforms[selectedPlatform as keyof typeof platforms].developerUrl, '_blank');
      setCurrentStep(3);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Social Media Setup - Social Media Content Calendar</title>
        <meta name="description" content="Connect your social media accounts" />
      </Helmet>
      
      <Header />
      
      <main className="flex-grow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Connect Social Media Accounts</h2>
            <p className="text-gray-600 mt-1">Follow these simple steps to connect your accounts</p>
          </div>

          {/* Step 1: Choose Platform */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Step 1: Choose a Platform</CardTitle>
                <CardDescription>Select which social media platform you want to connect first</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(platforms).map(([key, platform]) => (
                    <Button
                      key={key}
                      variant="outline"
                      className="h-20 flex flex-col items-center justify-center"
                      onClick={() => handlePlatformSelect(key)}
                    >
                      <div className={`w-8 h-8 ${platform.color} rounded mb-2`}></div>
                      <span className="text-sm">{platform.name}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Instructions */}
          {currentStep === 2 && selectedPlatform && (
            <Card>
              <CardHeader>
                <CardTitle>Step 2: Set Up {platforms[selectedPlatform as keyof typeof platforms].name}</CardTitle>
                <CardDescription>Follow these steps to create your developer app</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">What you'll need to do:</h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    {platforms[selectedPlatform as keyof typeof platforms].steps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                </div>
                
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">📋 Callback URL (you'll need this):</h3>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={platforms[selectedPlatform as keyof typeof platforms].callbackUrl}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(platforms[selectedPlatform as keyof typeof platforms].callbackUrl)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Copy this URL and paste it in the platform's redirect/callback URL field
                  </p>
                </div>

                <Button onClick={handleOpenDeveloper} className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open {platforms[selectedPlatform as keyof typeof platforms].name} Developer Portal
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Enter Credentials */}
          {currentStep === 3 && selectedPlatform && (
            <Card>
              <CardHeader>
                <CardTitle>Step 3: Enter Your Credentials</CardTitle>
                <CardDescription>
                  Copy your Client ID and Secret from the developer portal and paste them here
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client-id">Client ID / App ID</Label>
                  <Input 
                    id="client-id"
                    placeholder="Paste your Client ID here"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="client-secret">Client Secret / App Secret</Label>
                  <Input 
                    id="client-secret"
                    type="password"
                    placeholder="Paste your Client Secret here"
                  />
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800">Almost done!</span>
                  </div>
                  <p className="text-sm text-green-700">
                    Once you save these credentials, you'll be able to connect your {platforms[selectedPlatform as keyof typeof platforms].name} account
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setCurrentStep(1)}>
                    Back to Platforms
                  </Button>
                  <Button className="flex-1">
                    Save & Connect Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default SocialSetup;