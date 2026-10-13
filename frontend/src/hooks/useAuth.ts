import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/api/auth.api';
import { trackLogin, trackSignUp } from '@/utils/analytics';

// The signed-in account is loaded once per page load and shared by every component using this hook
// (header, route guards, admin layout, ...), instead of one /auth/me request per component.
let accountLoad: Promise<void> | null = null;

async function loadAccount(): Promise<void> {
  const store = useAuthStore.getState();
  if (!localStorage.getItem('access_token')) {
    store.setLoading(false);
    return;
  }
  for (let attempt = 0; ; attempt++) {
    try {
      const { data } = await authApi.getMe();
      store.setUser(data);
      return;
    } catch (err) {
      // Only "not signed in" (the API client has already tried refreshing the token) ends the session.
      // A rate limit, server error or dropped connection is retried, then reported with the session kept.
      if ((err as { response?: { status?: number } }).response?.status === 401) {
        store.logout();
        return;
      }
      if (attempt >= 3) {
        store.setAuthError(true);
        store.setLoading(false);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
    }
  }
}

/** Try loading the account again after a failure (the "Retry" button on the error screen) */
export function retryAccountLoad() {
  const store = useAuthStore.getState();
  store.setAuthError(false);
  store.setLoading(true);
  accountLoad = loadAccount();
}

export function useAuth() {
  const { user, isAuthenticated, isLoading, authError, setUser, setTokens, logout } = useAuthStore();

  useEffect(() => {
    accountLoad ??= loadAccount();
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await authApi.login({ email, password });
    setTokens(data.access_token, data.refresh_token);
    const { data: userData } = await authApi.getMe();
    setUser(userData);
    trackLogin();
    return userData;
  };

  const register = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    phone?: string
  ) => {
    const { data } = await authApi.register({
      email,
      password,
      first_name: firstName,
      last_name: lastName,
      phone,
    });
    setTokens(data.access_token, data.refresh_token);
    const { data: userData } = await authApi.getMe();
    setUser(userData);
    trackSignUp();
    return userData;
  };

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // ignore
      }
    }
    logout();
  };

  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'staff';
  const isAdminOrStaff = isAdmin || isStaff;
  const permissions = user?.permissions ?? [];

  const hasModule = (module: string): boolean => {
    if (isAdmin) return true;
    if (isStaff) return permissions.includes(module);
    return false;
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    authError,
    login,
    register,
    logout: handleLogout,
    isAdmin,
    isStaff,
    isAdminOrStaff,
    permissions,
    hasModule,
  };
}
