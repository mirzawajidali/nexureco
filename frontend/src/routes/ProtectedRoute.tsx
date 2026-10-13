import { Navigate, useLocation } from 'react-router-dom';
import { retryAccountLoad, useAuth } from '@/hooks/useAuth';
import Spinner from '@/components/ui/Spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, authError } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  // The account couldn't be loaded (server busy or offline): keep the session and offer a retry
  if (authError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
        <p className="text-sm text-gray-700">We couldn’t load your account right now.</p>
        <button
          onClick={retryAccountLoad}
          className="px-5 py-2.5 bg-brand-black text-white text-xs font-heading font-bold uppercase tracking-wider hover:bg-gray-800"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
