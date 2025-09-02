import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { PostProvider } from '@/contexts/PostContext';
import { queryClient } from '@/lib/queryClient';


// Pages
import Home from '@/pages/home';
import Connect from '@/pages/connect';
import Calendar from '@/pages/calendar';
import Reports from '@/pages/reports';
import Settings from '@/pages/settings';
import AuthPage from '@/pages/auth/AuthPage';
import OAuthSetupPage from '@/pages/oauth-setup';
import SocialSetup from '@/pages/social-setup';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Using the configured queryClient from lib/queryClient.ts

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <PostProvider>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/oauth-setup" element={<OAuthSetupPage />} />
              <Route path="/social-setup" element={<SocialSetup />} />
              
              <Route path="/" element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              } />
              
              <Route path="/connect" element={
                <ProtectedRoute>
                  <Connect />
                </ProtectedRoute>
              } />
              
              <Route path="/calendar" element={
                <ProtectedRoute>
                  <Calendar />
                </ProtectedRoute>
              } />
              
              <Route path="/reports" element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              } />
              
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } />
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Toaster />

          </PostProvider>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;