import { Helmet } from "react-helmet";
import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SlackSettings from "@/components/slack/SlackSettings";
import SlackStatus from "@/components/slack/SlackStatus";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, User, Lock } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { loadSettings, loadSettingsFromServer, saveSettingsToServer } from '@/lib/localStorage';
import { fetchSettings, saveSettings } from '@/lib/api';

const Settings = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Load initial values from localStorage
  const storedSettings = loadSettings();
  
  const [name, setName] = useState(storedSettings.name || "Demo User");
  const [email, setEmail] = useState(storedSettings.email || "user@example.com");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [emailDigest, setEmailDigest] = useState(storedSettings.emailDigest !== undefined ? storedSettings.emailDigest : true);
  const [emailPostPublished, setEmailPostPublished] = useState(storedSettings.emailPostPublished !== undefined ? storedSettings.emailPostPublished : true);
  const [emailPostFailed, setEmailPostFailed] = useState(storedSettings.emailPostFailed !== undefined ? storedSettings.emailPostFailed : true);
  const [browserNotifications, setBrowserNotifications] = useState(storedSettings.browserNotifications !== undefined ? storedSettings.browserNotifications : true);
  
  // Load settings from server on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const serverSettings = await loadSettingsFromServer();
        
        // Update state with server settings
        setName(serverSettings.name);
        setEmail(serverSettings.email);
        setEmailDigest(serverSettings.emailDigest);
        setEmailPostPublished(serverSettings.emailPostPublished);
        setEmailPostFailed(serverSettings.emailPostFailed);
        setBrowserNotifications(serverSettings.browserNotifications);
      } catch (error) {
        console.error('Failed to load settings from server', error);
        // Already using localStorage values as fallback
      }
    };
    
    fetchSettings();
  }, []);

  const handleSaveProfile = async () => {
    if (!name || !email) {
      toast({
        title: "Error",
        description: "Name and email are required.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // In a real app, this would call the API
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      
      // Save to localStorage and server
      await saveSettingsToServer({
        name,
        email
      });
      
      toast({
        title: "Profile Saved",
        description: "Your account information has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "All password fields are required.",
        variant: "destructive",
      });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New password and confirmation do not match.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // In a real app, this would call the API
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully.",
      });
      
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to change password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
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
        browserNotifications
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
              <TabsTrigger value="account">Account</TabsTrigger>
            </TabsList>
            
            <TabsContent value="slack">
              <SlackSettings />
            </TabsContent>
            
            <TabsContent value="notifications">
              <Card className="w-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notification Settings
                  </CardTitle>
                  <CardDescription>
                    Configure how and when you receive notifications about your social media posts.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Email Notifications</h3>
                      <p className="text-gray-600 mb-2">Receive updates about your scheduled posts via email</p>
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
                      <h3 className="text-lg font-medium mb-4">Browser Notifications</h3>
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
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={handleSaveNotifications} disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Save Notification Settings'}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="account">
              <Card className="w-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Account Settings
                  </CardTitle>
                  <CardDescription>
                    Manage your account information and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Profile Information</h3>
                      <div className="space-y-3">
                        <div>
                          <label htmlFor="name" className="block text-sm font-medium mb-1">Name</label>
                          <input 
                            type="text" 
                            id="name" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
                          <input 
                            type="email" 
                            id="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-4">Password</h3>
                      <div className="space-y-3">
                        <div>
                          <label htmlFor="current-password" className="block text-sm font-medium mb-1">Current Password</label>
                          <input 
                            type="password" 
                            id="current-password" 
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label htmlFor="new-password" className="block text-sm font-medium mb-1">New Password</label>
                          <input 
                            type="password" 
                            id="new-password" 
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label htmlFor="confirm-password" className="block text-sm font-medium mb-1">Confirm New Password</label>
                          <input 
                            type="password" 
                            id="confirm-password" 
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <div className="flex gap-3">
                    <Button onClick={handleSaveProfile} disabled={isLoading}>
                      {isLoading ? 'Saving...' : 'Save Profile'}
                    </Button>
                    <Button variant="outline" onClick={handleChangePassword} disabled={isLoading}>
                      {isLoading ? 'Saving...' : 'Change Password'}
                    </Button>
                  </div>
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