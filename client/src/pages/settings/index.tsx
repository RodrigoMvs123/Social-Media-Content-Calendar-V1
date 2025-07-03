import { useState } from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SlackIntegrationTab from './SlackIntegrationTab';
import NotificationsTab from './NotificationsTab';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('slack');

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Settings - Social Media Content Calendar</title>
      </Helmet>
      
      <Header />
      
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
            <p className="text-gray-600 mt-1">Manage your account and preferences</p>
          </div>
          
          <div className="bg-white shadow rounded-lg">
            <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="border-b border-gray-200">
                <TabsList className="flex">
                  <TabsTrigger 
                    value="slack" 
                    className="px-6 py-3 text-sm font-medium"
                  >
                    Slack Integration
                  </TabsTrigger>
                  <TabsTrigger 
                    value="notifications" 
                    className="px-6 py-3 text-sm font-medium"
                  >
                    Notifications
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <div className="p-6">
                <TabsContent value="slack">
                  <SlackIntegrationTab />
                </TabsContent>
                
                <TabsContent value="notifications">
                  <NotificationsTab />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Settings;