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
}

// Determine the current environment
export const getEnvironmentConfig = (): EnvironmentConfig => {
  const hostname = window.location.hostname;
  const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
  const isVercelPreview = hostname.endsWith('vercel.app');
  
  // Allow explicit control via environment variable if set
  const envRouting = import.meta.env.VITE_ENABLE_SUBDOMAIN_ROUTING;
  const enableSubdomainRouting = envRouting !== undefined 
    ? envRouting === 'true' 
    : !isVercelPreview; // Default to disabled on Vercel preview
  
  return {
    enableSubdomainRouting,
    isDevelopment,
    isVercelPreview,
    hostname
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

export default getEnvironmentConfig; 