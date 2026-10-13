import axios from 'axios';

const API_BASE_URL = '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// One refresh at a time: when several requests hit an expired token together they all wait for the same
// refresh. (Refresh tokens are single-use, so parallel refreshes would fail and sign the user out.)
let refreshing: Promise<string> | null = null;

function refreshAccessToken(refreshToken: string): Promise<string> {
  refreshing ??= axios
    .post(`${API_BASE_URL}/auth/refresh`, { refresh_token: refreshToken })
    .then((response) => {
      const { access_token, refresh_token: newRefreshToken } = response.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', newRefreshToken);
      return access_token as string;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

// Response interceptor: handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        try {
          const accessToken = await refreshAccessToken(refreshToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          // Only a rejected refresh token ends the session. A rate limit, server error or dropped
          // connection fails this request but keeps the user signed in.
          const status = (refreshError as { response?: { status?: number } }).response?.status;
          if (status === 401 || status === 403) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
          }
        }
      }
    }

    return Promise.reject(error);
  }
);

/** The server's error message (FastAPI's `detail` string) from a failed request, if there is one */
export function apiErrorDetail(err: unknown): string | undefined {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof detail === 'string' ? detail : undefined;
}

export default apiClient;
