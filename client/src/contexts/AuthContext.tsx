import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, registerUser, logoutUser, getCurrentUser } from '@/lib/api';

interface User {
  id?: string | number;
  name?: string;
  email: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<User>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Check if user is already authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log("AuthContext: Checking authentication status");
        
        try {
          // Try to get current user from server
          const userData = await getCurrentUser();
          console.log("Auth check - User authenticated from server:", userData);
          setIsAuthenticated(true);
          setUser(userData);
          
          // Store in localStorage as backup
          localStorage.setItem('isAuthenticated', 'true');
          localStorage.setItem('user', JSON.stringify(userData));
          
          // Don't redirect if already on auth page
          if (window.location.pathname === '/auth') {
            console.log("Auth check - Redirecting from /auth to / because user is authenticated");
            navigate('/');
          }
          return;
        } catch (err) {
          console.log("Auth check - Server authentication failed, checking localStorage");
        }
        
        // Fall back to localStorage if server check fails
        const auth = localStorage.getItem('isAuthenticated');
        const localUserData = localStorage.getItem('user');
        
        console.log("Auth check - localStorage auth:", auth);
        console.log("Auth check - localStorage user:", localUserData);
        
        if (auth === 'true' && localUserData) {
          console.log("Auth check - User is authenticated from localStorage");
          setIsAuthenticated(true);
          setUser(JSON.parse(localUserData));
          
          // Don't redirect if already on auth page
          if (window.location.pathname === '/auth') {
            console.log("Auth check - Redirecting from /auth to / because user is authenticated");
            navigate('/');
          }
        } else {
          console.log("Auth check - User is not authenticated");
          // If not authenticated, redirect to auth page
          if (window.location.pathname !== '/auth') {
            console.log("Auth check - Redirecting to /auth because user is not authenticated");
            navigate('/auth');
          }
        }
      } catch (err) {
        console.error("Auth check error:", err);
        // If error, redirect to auth page
        if (window.location.pathname !== '/auth') {
          navigate('/auth');
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [navigate]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    console.log("AuthContext: Login attempt with email:", email);
    
    try {
      // Call the login API
      const userData = await loginUser({ email, password });
      console.log("Login successful, user data:", userData);
      
      // Store auth state
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('notificationEmail', email);
      
      setIsAuthenticated(true);
      setUser(userData);
      
      console.log("Login - isAuthenticated set to:", true);
      console.log("Login - user set to:", userData);
      
      // Navigate to home after login
      navigate('/');
    } catch (err) {
      console.error("Login error:", err);
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    console.log("AuthContext: Signup attempt with email:", email);
    
    try {
      // Call the signup API
      const userData = await registerUser({ name, email, password });
      console.log("Signup successful, user data:", userData);
      
      // Don't set authentication state after signup
      // User should log in explicitly
      console.log("Signup successful - user will be redirected to login");
      
      return userData;
    } catch (err) {
      console.error("Signup error:", err);
      setError(err instanceof Error ? err.message : 'Signup failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    
    console.log("AuthContext: Logout attempt");
    
    try {
      // Call the logout API
      await logoutUser();
      console.log("Logout API call successful");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      // Always clear local state even if API call fails
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('user');
      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);
      
      console.log("Logout - isAuthenticated set to:", false);
      
      // Navigate to auth page after logout
      navigate('/auth', { replace: true });
    }
  };

  if (isLoading && !isAuthenticated) {
    console.log("AuthContext: Rendering loading state");
    return <div>Loading...</div>;
  }

  const contextValue = {
    isAuthenticated,
    user,
    login,
    signup,
    logout,
    isLoading
  };
  
  console.log("AuthContext - providing value:", contextValue);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};