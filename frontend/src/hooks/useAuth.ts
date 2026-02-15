import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/api/auth.api';

export function useAuth() {
  const { user, isAuthenticated, isLoading, setUser, setTokens, logout, setLoading } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await authApi.getMe();
        setUser(data);
      } catch {
        logout();
      }
    };
    initAuth();
  }, [setUser, logout, setLoading]);

  const login = async (email: string, password: string) => {
    const { data } = await authApi.login({ email, password });
    setTokens(data.access_token, data.refresh_token);
    const { data: userData } = await authApi.getMe();
    setUser(userData);
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
