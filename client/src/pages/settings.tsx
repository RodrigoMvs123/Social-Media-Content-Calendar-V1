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
import { MessageSquare } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { loadSettings, loadSettingsFromServer, saveSettingsToServer } from '@/lib/localStorage';
import { fetchSettings, saveSettings } from '@/lib/api';

const Settings = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Load initial values from localStorage
  const storedSettings = loadSettings();
  
  const [slackPostScheduled, setSlackPostScheduled] = useState(storedSettings.slackPostScheduled !== undefined ? storedSettings.slackPostScheduled : false);
  const [slackPostPublished, setSlackPostPublished] = useState(storedSettings.slackPostPublished !== undefined ? storedSettings.slackPostPublished : false);
  const [slackPostFailed, setSlackPostFailed] = useState(storedSettings.slackPostFailed !== undefined ? storedSettings.slackPostFailed : false);
  
  // Load settings from server on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const serverSettings = await loadSettingsFromServer();
        
        // Update state with server settings
        setSlackPostScheduled(serverSettings.slackPostScheduled || false);
        setSlackPostPublished(serverSettings.slackPostPublished || false);
        setSlackPostFailed(serverSettings.slackPostFailed || false);
      } catch (error) {
        console.error('Failed to load settings from server', error);
        // Already using localStorage values as fallback
      }
    };
    
    fetchSettings();
  }, []);

  const handleSaveNotifications = async () => {
    setIsLoading(true);
    
    try {
      // In a real app, this would call the API
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      
      // Save to localStorage and server
      await saveSettingsToServer({
        slackPostScheduled,
        slackPostPublished,
        slackPostFailed
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