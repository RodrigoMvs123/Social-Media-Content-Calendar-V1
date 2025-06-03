import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated } = useAuth();
  
  console.log("Protected route - isAuthenticated:", isAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};

export default ProtectedRoute;