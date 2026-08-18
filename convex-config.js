// Convex Backend Configuration for SEO Audit Platform
// This file provides the connection to the existing Convex backend

class ConvexConfig {
    constructor() {
        this.convexUrl = this.getConvexUrl();
        this.isConfigured = !!this.convexUrl;
    }

    getConvexUrl() {
        // Try to get from environment variable first
        if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_CONVEX_URL) {
            return process.env.NEXT_PUBLIC_CONVEX_URL;
        }
        
        // Try to get from localStorage (for development)
        if (typeof localStorage !== 'undefined') {
            const storedUrl = localStorage.getItem('CONVEX_BACKEND_URL');
            if (storedUrl) return storedUrl;
        }

        // Default to the known backend URL
        return 'http://localhost:3210';
    }

    setCustomUrl(url) {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('CONVEX_BACKEND_URL', url);
        }
        this.convexUrl = url;
        this.isConfigured = true;
    }

    getApiUrl(endpoint = '') {
        if (!this.convexUrl) {
            throw new Error('Convex backend URL not configured');
        }
        return `${this.convexUrl}${endpoint}`;
    }

    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };
    }
}

// Create global instance
export const convexConfig = new ConvexConfig();

export default convexConfig;