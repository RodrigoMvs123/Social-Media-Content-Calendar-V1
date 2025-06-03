import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { PostProvider } from '@/contexts/PostContext';

// Pages
import Home from '@/pages/home';
import Connect from '@/pages/connect';
import Calendar from '@/pages/calendar';
import Reports from '@/pages/reports';
import Settings from '@/pages/settings';
import AuthPage from '@/pages/auth/AuthPage';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Create a client
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PostProvider>
          <Router>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              
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
          </Router>
        </PostProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;