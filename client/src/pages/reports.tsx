import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAnalyticsData } from "@/lib/api";
import { Helmet } from "react-helmet";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Reports = () => {
  const [reportType, setReportType] = useState<'platform' | 'status'>('platform');
  
  const { data: analytics, isLoading, isError } = useQuery({
    queryKey: ['/api/analytics'],
    queryFn: fetchAnalyticsData,
  });

  // Colors for pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#83a6ed'];

  // Transform data for platform report
  const platformData = analytics?.postsByPlatform?.map(item => ({
    name: item.platform,
    value: item.count
  })) || [];

  // Transform data for status report
  const statusData = analytics?.postsByStatus?.map(item => ({
    name: item.status,
    value: item.count
  })) || [];

  // Calculate total posts
  const totalPosts = analytics?.postsByPlatform?.reduce((sum, item) => sum + item.count, 0) || 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Reports - Social Media Content Calendar</title>
        <meta name="description" content="View reports and analytics about your social media content" />
      </Helmet>
      
      <Header />
      
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Content Reports</h2>
          
          <Tabs defaultValue="platform" onValueChange={(value) => setReportType(value as 'platform' | 'status')}>
            <TabsList className="mb-6">
              <TabsTrigger value="platform">By Platform</TabsTrigger>
              <TabsTrigger value="status">By Status</TabsTrigger>
            </TabsList>
            
            <TabsContent value="platform">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Posts by Platform</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="text-center py-10">Loading data...</div>
                    ) : isError ? (
                      <div className="text-center py-10 text-red-500">Error loading data</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={platformData}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="value" name="Posts" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="text-center py-10">Loading data...</div>
                    ) : isError ? (
                      <div className="text-center py-10 text-red-500">Error loading data</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={platformData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {platformData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="status">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Posts by Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="text-center py-10">Loading data...</div>
                    ) : isError ? (
                      <div className="text-center py-10 text-red-500">Error loading data</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={statusData}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="value" name="Posts" fill="#82ca9d" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="text-center py-10">Loading data...</div>
                    ) : isError ? (
                      <div className="text-center py-10 text-red-500">Error loading data</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#82ca9d"
                            dataKey="value"
                          >
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Social Media Content Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p><strong>Total Posts:</strong> {totalPosts}</p>
                  <p><strong>Platforms:</strong> {platformData.map(p => p.name).join(', ')}</p>
                  <p><strong>Status Overview:</strong> {statusData.map(s => `${s.name} (${s.value})`).join(', ')}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Reports;