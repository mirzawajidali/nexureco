import { Navigate, useLocation } from 'react-router-dom';
import { retryAccountLoad, useAuth } from '@/hooks/useAuth';
import Spinner from '@/components/ui/Spinner';

interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { isAuthenticated, isAdminOrStaff, isLoading, authError } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  // The account couldn't be loaded (server busy or offline): keep the session and offer a retry
  if (authError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4 text-center">
        <p className="text-sm text-gray-700">Couldn’t reach the server to load your account.</p>
        <button
          onClick={retryAccountLoad}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800"
        >
          Retry
        </button>
      </div>
    );
  }

  // Signed out (e.g. the session expired): sign in and come back to this page
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdminOrStaff) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
