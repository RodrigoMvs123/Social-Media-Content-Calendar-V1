import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Debug logging for user state changes
  React.useEffect(() => {
    console.log('🔍 AUTH STATE CHANGED:', {
      user: user ? `${user.email} (ID: ${user.id})` : 'null',
      isAuthenticated: !!user,
      timestamp: new Date().toISOString()
    });
  }, [user]);

  // Check for existing auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        console.log('🔍 AUTH CHECK ON MOUNT:', { hasToken: !!token, token: token ? `${token.substring(0, 20)}...` : 'none' });
        
        if (token) {
          console.log('🔍 VERIFYING TOKEN WITH BACKEND...');
          // Verify token with backend database
          const response = await fetch('http://localhost:3001/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            console.log('🔍 TOKEN VALID - SETTING USER:', userData);
            setUser(userData);
          } else {
            console.log('🔍 TOKEN INVALID - REMOVING');
            // Token is invalid, remove it
            localStorage.removeItem('auth_token');
          }
        } else {
          console.log('🔍 NO TOKEN FOUND');
        }
      } catch (error) {
        console.error('🔍 AUTH CHECK FAILED:', error);
        localStorage.removeItem('auth_token');
      } finally {
        console.log('🔍 AUTH CHECK COMPLETE - SETTING LOADING FALSE');
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();
      localStorage.setItem('auth_token', data.token);
      setUser(data.user);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, name?: string) => {
    setIsRegistering(true);
    try {
      console.log('Starting registration process...');
      
      // Force clear any authentication state
      localStorage.removeItem('auth_token');
      setUser(null);
      
      const response = await fetch('http://localhost:3001/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.log('Registration failed with status:', response.status);
        console.log('Error details:', error);
        throw new Error(error.error || error.message || 'Registration failed');
      }

      const data = await response.json();
      console.log('Registration response:', data);
      
      // FORCE user to remain null and clear all auth data
      setUser(null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      
      // Double check - if somehow a token was set, remove it
      setTimeout(() => {
        localStorage.removeItem('auth_token');
        setUser(null);
        console.log('Final auth state after registration:', { user: null, token: localStorage.getItem('auth_token') });
      }, 100);
      
      console.log('Registration completed - user should be null');
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsRegistering(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  const isAuthenticated = !!user && !isRegistering;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        setUser,
      }}
    >
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