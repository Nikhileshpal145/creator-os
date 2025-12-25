/**
 * Creator OS Extension Configuration
 * 
 * For production: Update API_BASE to your production API URL
 * For development: Leave as localhost
 */

// API Configuration
export const API_BASE = 'http://localhost:8000/api/v1';

// Feature flags
export const CONFIG = {
    // Enable debug logging
    DEBUG: false,

    // Health check interval (ms)
    HEALTH_CHECK_INTERVAL: 30000,

    // Sync retry delay (ms)
    SYNC_RETRY_DELAY: 5000,

    // Scrape interval (ms)  
    SCRAPE_INTERVAL: 30000,
};

// For production builds, you can override via environment:
// Set VITE_API_BASE during build: VITE_API_BASE=https://api.creatoros.ai npm run build
if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE) {
    (window as any).__CREATOR_OS_API_BASE = (import.meta as any).env.VITE_API_BASE;
}

export function getApiBase(): string {
    return (window as any).__CREATOR_OS_API_BASE || API_BASE;
}
