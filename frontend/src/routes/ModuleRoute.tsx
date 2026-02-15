import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ModuleRouteProps {
  module: string;
  children: React.ReactNode;
}

export default function ModuleRoute({ module, children }: ModuleRouteProps) {
  const { hasModule } = useAuth();

  if (!hasModule(module)) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}
