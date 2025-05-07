/**
 * Environment configuration
 * 
 * This file contains environment-specific configuration settings
 * that can be controlled via environment variables.
 */

interface EnvironmentConfig {
  // Whether to enable subdomain routing for stores
  enableSubdomainRouting: boolean;
  
  // Whether the app is running in development mode
  isDevelopment: boolean;
  
  // Whether on Vercel preview deployment
  isVercelPreview: boolean;
  
  // The current hostname
  hostname: string;
  
  // Whether to use query parameters for store routes (vs subdomains)
  useQueryParamRouting: boolean;
}

// Determine the current environment
export const getEnvironmentConfig = (): EnvironmentConfig => {
  const hostname = window.location.hostname;
  const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
  const isVercelPreview = hostname.endsWith('vercel.app');
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  
  // Allow explicit control via environment variable if set
  const envRouting = import.meta.env.VITE_ENABLE_SUBDOMAIN_ROUTING;
  const enableSubdomainRouting = envRouting !== undefined 
    ? envRouting === 'true' 
    : !isVercelPreview; // Default to disabled on Vercel preview
  
  // Always use query parameters for local dev and Vercel deployments
  const useQueryParamRouting = isLocalhost || isVercelPreview;
  
  return {
    enableSubdomainRouting,
    isDevelopment,
    isVercelPreview,
    hostname,
    useQueryParamRouting
  };
};

// Helper functions for specific environment checks
export const isLocalhost = (): boolean => {
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1';
};

export const isCustomDomain = (): boolean => {
  const { hostname, isVercelPreview } = getEnvironmentConfig();
  return !isVercelPreview && !isLocalhost();
};

/**
 * Generate a store URL based on the current environment
 * @param storeSlug The store slug to use in the URL
 * @param preview Whether this is a preview URL
 * @returns The URL formatted according to environment
 */
export const generateStoreUrl = (storeSlug: string, preview = false): string => {
  const { hostname, useQueryParamRouting, isDevelopment } = getEnvironmentConfig();
  const isLocalEnv = isLocalhost();
  
  // Query parameters to add
  const queryParams = preview ? '?preview=true' : '';
  const storeParam = useQueryParamRouting ? (preview ? '&' : '?') + `store=${storeSlug}` : '';
  
  // Protocol
  const protocol = isDevelopment ? 'http' : 'https';
  
  // For local development
  if (isLocalEnv) {
    const localPort = import.meta.env.VITE_LOCAL_DEV_PORT || '5173';
    return `${protocol}://localhost:${localPort}${storeParam}${queryParams}`;
  }
  
  // For Vercel or environments using query params
  if (useQueryParamRouting) {
    return `${protocol}://${hostname}${storeParam}${queryParams}`;
  }
  
  // For custom domains using subdomains
  const productionDomain = import.meta.env.VITE_PRODUCTION_DOMAIN || hostname.split('.').slice(1).join('.');
  return `${protocol}://${storeSlug}.${productionDomain}${queryParams}`;
};

export default getEnvironmentConfig; 