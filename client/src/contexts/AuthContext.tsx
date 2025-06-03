import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

interface User {
  name?: string;
  email: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already authenticated on mount
  useEffect(() => {
    const checkAuth = () => {
      const auth = localStorage.getItem('isAuthenticated');
      const userData = localStorage.getItem('user');
      
      console.log("Auth check - localStorage auth:", auth);
      console.log("Auth check - localStorage user:", userData);
      
      if (auth === 'true' && userData) {
        setIsAuthenticated(true);
        setUser(JSON.parse(userData));
      }
      
      setIsLoading(false);
    };
    
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    // In a real app, you would validate credentials with your backend
    // For now, we'll just simulate a successful login
    const user = { email };
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('user', JSON.stringify(user));
    
    // Also store the email for notifications
    localStorage.setItem('notificationEmail', email);
    
    setIsAuthenticated(true);
    setUser(user);
    
    console.log("Login - isAuthenticated set to:", true);
    console.log("Login - user set to:", user);
  };

  const signup = async (name: string, email: string, password: string) => {
    // In a real app, you would create a new user in your backend
    // For now, we'll just simulate a successful signup
    const user = { name, email };
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('user', JSON.stringify(user));
    
    // Also store the email for notifications
    localStorage.setItem('notificationEmail', email);
    
    setIsAuthenticated(true);
    setUser(user);
    
    console.log("Signup - isAuthenticated set to:", true);
    console.log("Signup - user set to:", user);
  };

  const logout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
    
    console.log("Logout - isAuthenticated set to:", false);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const contextValue = {
    isAuthenticated,
    user,
    login,
    signup,
    logout
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