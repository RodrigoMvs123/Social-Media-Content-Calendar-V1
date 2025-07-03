import { Helmet } from "react-helmet";
import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SlackSettings from "@/components/slack/SlackSettings";
import SlackSettingsFixed from "@/components/slack/SlackSettingsFixed";
import SlackStatus from "@/components/slack/SlackStatus";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, MessageSquare, Mail, BellRing } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { loadSettings, loadSettingsFromServer, saveSettingsToServer } from '@/lib/localStorage';
import { fetchSettings, saveSettings } from '@/lib/api';

const Settings = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Load initial values from localStorage
  const storedSettings = loadSettings();
  
  const [emailDigest, setEmailDigest] = useState(storedSettings.emailDigest !== undefined ? storedSettings.emailDigest : true);
  const [emailPostPublished, setEmailPostPublished] = useState(storedSettings.emailPostPublished !== undefined ? storedSettings.emailPostPublished : true);
  const [emailPostFailed, setEmailPostFailed] = useState(storedSettings.emailPostFailed !== undefined ? storedSettings.emailPostFailed : true);
  const [browserNotifications, setBrowserNotifications] = useState(storedSettings.browserNotifications !== undefined ? storedSettings.browserNotifications : true);
  const [slackPostScheduled, setSlackPostScheduled] = useState(storedSettings.slackPostScheduled !== undefined ? storedSettings.slackPostScheduled : true);
  const [slackPostPublished, setSlackPostPublished] = useState(storedSettings.slackPostPublished !== undefined ? storedSettings.slackPostPublished : true);
  const [slackPostFailed, setSlackPostFailed] = useState(storedSettings.slackPostFailed !== undefined ? storedSettings.slackPostFailed : true);
  const [notificationEmail, setNotificationEmail] = useState('');
  
  // Load settings from server on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const serverSettings = await loadSettingsFromServer();
        
        // Update state with server settings
        setEmailDigest(serverSettings.emailDigest);
        setEmailPostPublished(serverSettings.emailPostPublished);
        setEmailPostFailed(serverSettings.emailPostFailed);
        setBrowserNotifications(serverSettings.browserNotifications);
        setSlackPostScheduled(serverSettings.slackPostScheduled || true);
        setSlackPostPublished(serverSettings.slackPostPublished || true);
        setSlackPostFailed(serverSettings.slackPostFailed || true);
      } catch (error) {
        console.error('Failed to load settings from server', error);
        // Already using localStorage values as fallback
      }
    };
    
    // Get the email from localStorage (set during signup)
    const email = localStorage.getItem('notificationEmail') || localStorage.getItem('user') ? 
      JSON.parse(localStorage.getItem('user') || '{}').email || '' : '';
    setNotificationEmail(email);
    
    fetchSettings();
  }, []);

  const handleSaveNotifications = async () => {
    setIsLoading(true);
    
    try {
      // In a real app, this would call the API
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      
      // Save to localStorage and server
      await saveSettingsToServer({
        emailDigest,
        emailPostPublished,
        emailPostFailed,
        browserNotifications,
        slackPostScheduled,
        slackPostPublished,
        slackPostFailed,
        notificationEmail // Include the email
      });
      
      toast({
        title: "Notification Settings Saved",
        description: "Your notification preferences have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save notification settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Settings - Social Media Content Calendar</title>
        <meta name="description" content="Configure your social media calendar settings" />
      </Helmet>
      
      <Header />
      
      <main className="flex-grow">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
            <p className="text-gray-600 mt-1">Configure your social media calendar app</p>
          </div>
          
          <SlackStatus className="mb-8" />
          
          <Tabs defaultValue="slack" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="slack">Slack Integration</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
            </TabsList>
            
            <TabsContent value="slack">
              <SlackSettingsFixed />
            </TabsContent>
            
            <TabsContent value="notifications">
              <Card className="w-full">
                <CardHeader>
                  <CardTitle>
                    Notification Settings
                  </CardTitle>
                  <CardDescription>
                    Configure how and when you receive notifications about your social media posts.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4 flex items-center">
                        <Mail className="h-5 w-5 mr-2" />
                        Email Notifications
                      </h3>
                      <p className="text-gray-600 mb-2">
                        Notifications will be sent to: <strong>{notificationEmail}</strong>
                      </p>
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="daily-digest" 
                          checked={emailDigest}
                          onChange={(e) => setEmailDigest(e.target.checked)}
                          className="h-4 w-4" 
                        />
                        <label htmlFor="daily-digest" className="text-sm">Daily digest of upcoming posts</label>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <input 
                          type="checkbox" 
                          id="post-published" 
                          checked={emailPostPublished}
                          onChange={(e) => setEmailPostPublished(e.target.checked)}
                          className="h-4 w-4" 
                        />
                        <label htmlFor="post-published" className="text-sm">When a post is published</label>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <input 
                          type="checkbox" 
                          id="post-failed" 
                          checked={emailPostFailed}
                          onChange={(e) => setEmailPostFailed(e.target.checked)}
                          className="h-4 w-4" 
                        />
                        <label htmlFor="post-failed" className="text-sm">When a post fails to publish</label>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-4 flex items-center">
                        <Bell className="h-5 w-5 mr-2" />
                        Browser Notifications
                      </h3>
                      <p className="text-gray-600 mb-2">Receive real-time notifications in your browser</p>
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="browser-notifications" 
                          checked={browserNotifications}
                          onChange={(e) => setBrowserNotifications(e.target.checked)}
                          className="h-4 w-4" 
                        />
                        <label htmlFor="browser-notifications" className="text-sm">Enable browser notifications</label>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-4 flex items-center">
                        <MessageSquare className="h-5 w-5 mr-2" />
                        Slack Notifications
                      </h3>
                      <p className="text-gray-600 mb-2">Send notifications to your connected Slack workspace</p>
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="slack-scheduled" 
                          checked={slackPostScheduled}
                          onChange={(e) => setSlackPostScheduled(e.target.checked)}
                          className="h-4 w-4" 
                        />
                        <label htmlFor="slack-scheduled" className="text-sm">When a post is scheduled</label>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <input 
                          type="checkbox" 
                          id="slack-published" 
                          checked={slackPostPublished}
                          onChange={(e) => setSlackPostPublished(e.target.checked)}
                          className="h-4 w-4" 
                        />
                        <label htmlFor="slack-published" className="text-sm">When a post is published</label>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <input 
                          type="checkbox" 
                          id="slack-failed" 
                          checked={slackPostFailed}
                          onChange={(e) => setSlackPostFailed(e.target.checked)}
                          className="h-4 w-4" 
                        />
                        <label htmlFor="slack-failed" className="text-sm">When a post fails to publish</label>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={handleSaveNotifications} disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Save Notification Settings'}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Settings;