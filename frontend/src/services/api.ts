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

// Request interceptor for adding auth token and caching GET requests
api.interceptors.request.use((config) => {
  // If you use token-based auth instead of cookies, attach it here
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Cache GET requests
    if (config.method?.toLowerCase() === 'get') {
      const cacheKey = `${config.baseURL}${config.url}`;
      const cachedData = apiCache.get(cacheKey);

      if (cachedData) {
        // Return cached data without making the request
        return Promise.reject({
          config,
          response: { data: cachedData, status: 200, statusText: 'OK (cached)' },
          isFromCache: true,
        });
      }
    }
  }
  return config;
});

// Response interceptor for handling common errors and caching responses
api.interceptors.response.use(
  (response) => {
    // Cache successful GET responses
    if (typeof window !== 'undefined' && response.config.method?.toLowerCase() === 'get') {
      const cacheKey = `${response.config.baseURL}${response.config.url}`;
      // Cache for 5 minutes by default
      apiCache.set(cacheKey, response.data, 5 * 60 * 1000);
    }
    return response;
  },
  (error) => {
    // Handle cached responses
    if (error.isFromCache) {
      return Promise.resolve(error.response);
    }

    if (error.response?.status === 401) {
      // Handle unauthorized access (e.g., redirect to login)
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
export { apiCache };
