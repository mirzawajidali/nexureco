import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ModuleRouteProps {
  module: string;
  children: React.ReactNode;
}

// Each admin module's first page, in sidebar order: where a team member lands when they can't open a page
const MODULE_HOME: [string, string][] = [
  ['dashboard', '/admin'],
  ['orders', '/admin/orders'],
  ['products', '/admin/products'],
  ['inventory', '/admin/inventory'],
  ['categories', '/admin/categories'],
  ['collections', '/admin/collections'],
  ['customers', '/admin/customers'],
  ['coupons', '/admin/coupons'],
  ['reviews', '/admin/reviews'],
  ['content', '/admin/pages'],
  ['media', '/admin/media'],
  ['contact_messages', '/admin/contact-messages'],
  ['newsletter', '/admin/newsletter'],
  ['analytics', '/admin/analytics'],
  ['settings', '/admin/settings'],
];

/** The first admin page this team member may open, or null when their role has no modules */
export function firstAllowedAdminPage(hasModule: (module: string) => boolean): string | null {
  return MODULE_HOME.find(([module]) => hasModule(module))?.[1] ?? null;
}

export default function ModuleRoute({ module, children }: ModuleRouteProps) {
  const { hasModule } = useAuth();

  if (!hasModule(module)) {
    // Not "/admin": without the dashboard module that page would send them back here, in a loop
    const fallback = firstAllowedAdminPage(hasModule);
    if (fallback) return <Navigate to={fallback} replace />;
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-2 text-center px-4">
        <p className="text-sm font-medium text-gray-900">Your role doesn’t include any admin sections yet.</p>
        <p className="text-sm text-gray-500">Ask the store owner to give your role access in Admin → Roles.</p>
      </div>
    );
  }

  return <>{children}</>;
}
