// API Configuration - Centralized API base URL from environment variables
// Vite requires VITE_ prefix for environment variables to be exposed to the client

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173';

// Export the base URL for axios calls
export const apiBaseUrl = API_BASE_URL;

// Export full URL helper functions
export const getApiUrl = (endpoint) => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

// Export frontend URL for redirects
export const frontendUrl = FRONTEND_URL;

// Helper to get full frontend URL with path
export const getFrontendUrl = (path = '') => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${FRONTEND_URL}${cleanPath}`;
};

// Export default API configuration
export default {
  apiBaseUrl: API_BASE_URL,
  frontendUrl: FRONTEND_URL,
  getApiUrl,
  getFrontendUrl,
};

