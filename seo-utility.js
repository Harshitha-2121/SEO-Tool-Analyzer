/**
 * CrawlX Shared SEO Utility Library
 * Centralizes target URL retrieval, domain extraction, localStorage matching,
 * and page-blocking UI wrappers for dynamic dashboard screens.
 */

(function(window) {
  'use strict';

  const CrawlXUtils = {
    /**
     * Extracts query parameter value from current page URL.
     * @param {string} param Name of parameter.
     * @returns {string|null}
     */
    getQueryParam(param) {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get(param);
    },

    /**
     * Standardizes a domain string by stripping protocols and subpaths.
     * @param {string} url 
     * @returns {string}
     */
    cleanDomain(url) {
      if (!url) return '';
      return url.replace(/^(https?:\/\/)?(www\.)?/i, '').split('/')[0].toLowerCase();
    },

    /**
     * Verifies that the current target matches the saved crawl record domain.
     * @param {string} targetUrl 
     * @returns {boolean}
     */
    verifyCrawlData(targetUrl) {
      if (!targetUrl) return false;
      const realDataStr = localStorage.getItem('real_scan_data');
      if (!realDataStr) return false;
      try {
        const rd = JSON.parse(realDataStr);
        if (rd && rd.domain) {
          const cleanTarget = this.cleanDomain(targetUrl);
          const cleanScan = this.cleanDomain(rd.domain);
          return cleanTarget === cleanScan;
        }
      } catch (e) {
        console.error("Error parsing real_scan_data in utility:", e);
      }
      return false;
    },

    /**
     * Loads the validated scan data if domain matches.
     * @param {string} targetUrl 
     * @returns {object|null}
     */
    loadScanData(targetUrl) {
      if (this.verifyCrawlData(targetUrl)) {
        return JSON.parse(localStorage.getItem('real_scan_data'));
      }
      return null;
    },

    /**
     * Dynamic warning blocker layout builder.
     * @param {string} title 
     * @param {string} description 
     * @param {Array<string>} hideSelectors Selectors to hide.
     */
    renderBlocker(title, description, hideSelectors = []) {
      return; // Temporarily disabled so user can access all tools
      // Hide matching UI elements
      hideSelectors.forEach(selector => {
        const els = document.querySelectorAll(selector);
        els.forEach(el => el.style.display = 'none');
      });

      // Construct warning banner
      const main = document.querySelector('main.main');
      if (main) {
        const banner = document.createElement('div');
        banner.className = 'glass-card';
        banner.style.margin = '40px auto';
        banner.style.maxWidth = '600px';
        banner.style.textAlign = 'center';
        banner.style.padding = '40px';
        banner.innerHTML = `
          <div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(255, 145, 0, 0.1); border: 1px solid rgba(255, 145, 0, 0.3); display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto; color: #ff9100;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h2 style="font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 12px;">${title}</h2>
          <p style="font-size: 13.5px; color: var(--text-3); line-height: 1.6; margin-bottom: 24px;">${description}</p>
          <a href="scanner.html" class="btn btn--primary" style="display: inline-flex;">Go to SEO Scanner</a>
        `;
        main.appendChild(banner);
      }
    }
  };

  window.CrawlXUtils = CrawlXUtils;
})(window);
