import axios from 'axios';
import { apiCache } from './cache';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8002/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: true, // For Sanctum CSRF and session cookies
});

const NO_CACHE_URLS = [
  '/me',
  '/dashboard',
  '/profile',
  '/attendance',
  '/notifications',
  '/direct-chat',
  '/employees',
  '/users',
  '/teams',
  '/wfh-requests',
  '/leave-requests',
  '/leaves'
];

function getScopedCacheKey(baseURL: string | undefined, url: string | undefined, params: any, token: string | null): string | null {
  if (!url) return null;
  if (NO_CACHE_URLS.some((pattern) => url.includes(pattern))) {
    return null;
  }
  const queryStr = params ? (typeof params === 'string' ? params : new URLSearchParams(params).toString()) : '';
  const scope = token ? token.slice(-16) : 'guest';
  return `${scope}:${baseURL || ''}${url}${queryStr ? `?${queryStr}` : ''}`;
}

// Request interceptor for adding auth token and caching GET requests
api.interceptors.request.use((config) => {
  // If you use token-based auth instead of cookies, attach it here
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Selectively invalidate cache for the mutated domain
    if (config.method && config.method.toLowerCase() !== 'get') {
      const url = config.url || '';
      if (url.includes('/direct-chat')) {
        apiCache.clearPattern('/direct-chat');
      } else if (url.includes('/leaves') || url.includes('/leave-requests') || url.includes('/wfh-requests')) {
        apiCache.clearPattern(/leave|wfh/i);
      } else if (url.includes('/attendance')) {
        apiCache.clearPattern('/attendance');
      } else if (url.includes('/employees') || url.includes('/teams')) {
        apiCache.clearPattern(/employees|teams/i);
      } else if (url.includes('/notifications')) {
        apiCache.clearPattern('/notifications');
      } else if (url.includes('/project-tasks') || url.match(/\/projects\/\d+\/tasks/)) {
        // Clear both project-tasks list cache AND projects cache when tasks are mutated
        apiCache.clearPattern(/project-tasks|projects/i);
      } else {
        // Fallback for general resource mutations
        const rootPath = url.split('/')[1];
        if (rootPath) {
          apiCache.clearPattern(rootPath);
        }
      }
    }

    // Cache GET requests only for safe, static, token-scoped endpoints
    if (config.method?.toLowerCase() === 'get') {
      const cacheKey = getScopedCacheKey(config.baseURL, config.url, config.params, token);
      if (cacheKey) {
        const cachedData = apiCache.get(cacheKey);
        if (cachedData) {
          return Promise.reject({
            config,
            response: { data: cachedData, status: 200, statusText: 'OK (cached)' },
            isFromCache: true,
          });
        }
      }
    }
  }
  return config;
});

// Response interceptor for handling common errors and caching responses
api.interceptors.response.use(
  (response) => {
    // Cache successful GET responses only if safe and scoped
    if (typeof window !== 'undefined' && response.config.method?.toLowerCase() === 'get') {
      const token = localStorage.getItem('token');
      const cacheKey = getScopedCacheKey(response.config.baseURL, response.config.url, response.config.params, token);
      if (cacheKey) {
        apiCache.set(cacheKey, response.data, 2 * 60 * 1000);
      }
    }
    return response;
  },
  (error) => {
    // Handle cached responses
    if (error.isFromCache) {
      return Promise.resolve(error.response);
    }

    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        const isAuthPage =
          currentPath.startsWith('/login') ||
          currentPath.startsWith('/forgot-password') ||
          currentPath.startsWith('/reset-password');
        const isLoginRequest = error.config?.url?.includes('/login');

        // Never force-reload if we are already on an auth page or it is a login request
        if (!isAuthPage && !isLoginRequest) {
          apiCache.clearAll();
          localStorage.removeItem('token');
          localStorage.removeItem('auth-storage');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
export { apiCache };
