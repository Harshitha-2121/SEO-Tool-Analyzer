// Convex API Service for SEO Audit Platform
// Uses ConvexHttpClient for vanilla JS (no React needed)

import { ConvexHttpClient } from 'convex/browser';

class ConvexApiError extends Error {
    constructor(message, status = 0, details = null) {
        super(message);
        this.name = 'ConvexApiError';
        this.status = status;
        this.details = details;
    }
}

class ConvexApiService {
    constructor() {
        this.convexUrl = this._getConvexUrl();
        this.client = new ConvexHttpClient(this.convexUrl);
        this._token = localStorage.getItem('convex_token') || null;
    }

    _getConvexUrl() {
        if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CONVEX_URL) {
            return import.meta.env.VITE_CONVEX_URL;
        }
        const stored = localStorage.getItem('CONVEX_URL');
        if (stored) return stored;
        return 'http://localhost:3210';
    }

    get token() { return this._token; }

    setToken(token) {
        this._token = token;
        if (token) {
            localStorage.setItem('convex_token', token);
        } else {
            localStorage.removeItem('convex_token');
        }
    }

    isLoggedIn() { return !!this._token; }

    // --- Auth ---

    async register(email, password, name) {
        const result = await this.client.mutation('auth:register', { email, password, name });
        this.setToken(result.token);
        return result;
    }

    async login(email, password) {
        const result = await this.client.mutation('auth:login', { email, password });
        this.setToken(result.token);
        return result;
    }

    async logout() {
        if (this._token) {
            try { await this.client.mutation('auth:logout', { token: this._token }); } catch { }
        }
        this.setToken(null);
        localStorage.removeItem('logged_in');
        localStorage.removeItem('user_email');
    }

    async getMe() {
        if (!this._token) return null;
        try { return await this.client.query('auth:getMe', { token: this._token }); } catch { return null; }
    }

    // --- SEO Audits ---

    async startSeoAudit(url) {
        if (!this._token) throw new ConvexApiError('Not authenticated');
        return await this.client.mutation('seoAudits:start', { token: this._token, url });
    }

    async getSeoAudit(auditId) {
        if (!this._token) throw new ConvexApiError('Not authenticated');
        return await this.client.query('seoAudits:get', { token: this._token, auditId });
    }

    async listSeoAudits() {
        if (!this._token) return [];
        return await this.client.query('seoAudits:list', { token: this._token });
    }

    async updateAuditResults(auditId, status, results) {
        if (!this._token) throw new ConvexApiError('Not authenticated');
        return await this.client.mutation('seoAudits:updateResults', { token: this._token, auditId, status, results });
    }

    async deleteAudit(auditId) {
        if (!this._token) throw new ConvexApiError('Not authenticated');
        return await this.client.mutation('seoAudits:remove', { token: this._token, auditId });
    }

    // --- User Profile ---

    async updateProfile(name) {
        if (!this._token) throw new ConvexApiError('Not authenticated');
        return await this.client.mutation('users:updateProfile', { token: this._token, name });
    }

    async deleteAccount() {
        if (!this._token) throw new ConvexApiError('Not authenticated');
        await this.client.mutation('users:deleteAccount', { token: this._token });
        this.setToken(null);
    }
}

export const convexApi = new ConvexApiService();
export default convexApi;