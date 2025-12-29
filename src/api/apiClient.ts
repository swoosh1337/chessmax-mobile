import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { BACKEND_URL } from '../config';
import { createLogger } from '../utils/logger';

const log = createLogger('ApiClient');

// Minimal token helpers; replace with real auth/secure store
let authToken: string | null = null;
let signedUser: { google_id?: string; sub?: string; id?: string } | null = null;

interface AuthData {
  token: string | null;
  user: { google_id?: string; sub?: string; id?: string } | null;
}

export const setAuth = ({ token, user }: AuthData): void => {
  authToken = token || null;
  signedUser = user || null;
};

// Resolve base URL - only add port 3000 for localhost/http
const resolveBaseURL = (rawUrl: string): string => {
  try {
    const ensureScheme = /^https?:\/\//i.test(rawUrl) ? rawUrl : `http://${rawUrl}`;
    const url = new URL(ensureScheme);
    const origin = url.origin.replace(/\/$/, '');

    // If URL already has a port, use it as-is
    if (url.port) {
      return origin;
    }

    // Only add :3000 for localhost and http URLs
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.protocol === 'http:') {
      return `${origin}:3000`;
    }

    // For HTTPS URLs (like production), use origin as-is (default port 443)
    return origin;
  } catch {
    // Fallback: naive check for existing :port at end
    const trimmed = String(rawUrl).replace(/\/$/, '');
    if (/:[0-9]+$/.test(trimmed)) {
      return trimmed;
    }
    // Only add :3000 for localhost
    if (trimmed.includes('localhost') || trimmed.includes('127.0.0.1')) {
      return `${trimmed}:3000`;
    }
    return trimmed;
  }
};

const resolvedURL = resolveBaseURL(BACKEND_URL);
log.info('API Client configured', { baseURL: resolvedURL });

const apiClient = axios.create({
  baseURL: resolvedURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000 // 30 second timeout
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (authToken) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${authToken}`;
  }
  const user = signedUser;
  const protectedEndpoints = [
    '/get-stats',
    '/recent-attempts',
    '/recent-attempts-for-opening',
    '/activity-calendar'
  ];
  if (user && (user.google_id || user.sub) && config.url && protectedEndpoints.some(ep => config.url?.startsWith(ep))) {
    config.params = config.params || {};
    config.params.google_id = user.google_id || user.sub;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res.data,
  (error: AxiosError) => {
    log.error('API request failed', error, {
      url: error.config?.url,
      fullUrl: error.config?.baseURL ? `${error.config.baseURL}${error.config.url}` : error.config?.url,
    });

    if (error.response) {
      // Server responded with error status
      const responseData = error.response.data as { message?: string } | undefined;
      const msg = `API Error: ${error.response.status} ${responseData?.message || ''}`.trim();
      log.error('Server error response', undefined, {
        status: error.response.status,
        data: error.response.data
      });
      throw new Error(msg);
    } else if (error.request) {
      // Request was made but no response received
      log.error('No response received', undefined, {
        possibleCauses: ['Server is down', 'Network connectivity issue', 'CORS issue', 'SSL certificate issue']
      });
      throw new Error(`Network Error: Cannot reach server at ${resolvedURL}`);
    } else {
      // Something else happened
      throw new Error(`Request Error: ${error.message}`);
    }
  }
);

export default apiClient;
