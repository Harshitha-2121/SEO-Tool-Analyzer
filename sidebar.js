/**
 * crawlX — Global Persistent Sidebar Component
 * Single source of truth for all navigation sidebar UI and behaviour.
 *
 * How it works:
 *   1. Injects CSS into <head> once.
 *   2. Injects <aside id="sidebar"> into the page.
 *   3. Detects current page and marks the correct nav item as active.
 *   4. Handles collapse/expand (localStorage-persisted), hover-expand, mobile drawer.
 *
 * Supports two layout models:
 *   A) <div class="app"> → sidebar + <div class="main"> (flexbox children)
 *   B) <body> as flex container → sidebar + <main class="main">
 */
  // Apply theme immediately to avoid flash of dark mode
  (function() {
    try {
      var savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'light') {
        document.documentElement.classList.add('light-mode');
        document.body.classList.add('light-mode');
      }
    } catch(e) {}
  })();

  (function () {
    'use strict';

    // Load GSAP CDN dynamically if not present
    if (!window.gsap && !document.getElementById('gsap-cdn-script')) {
      var gsapScript = document.createElement('script');
      gsapScript.id = 'gsap-cdn-script';
      gsapScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js';
      document.head.appendChild(gsapScript);
    }


  /* ─── CONSTANTS ─── */

  var SIDEBAR_W          = 280;
  var SIDEBAR_W_COLLAPSED = 68;
  var SIDEBAR_ID         = 'sidebar';
  var OVERLAY_ID         = 'sidebarOverlay';
  var STORAGE_KEY        = 'crawlx_sidebar_collapsed';

  /* ─── NAVIGATION STRUCTURE ─── */
  var NAV = [
    {
      section: null,
      items: [
        {
          label : 'Dashboard',
          href  : 'dashboard.html',
          key   : 'dashboard.html',
          icon  : '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'
        }
      ]
    },
    {
      section: 'Crawl & Audit',
      items: [
        {
          label : 'SEO Scanner',
          href  : 'scanner.html',
          key   : 'scanner.html',
          icon  : '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>'
        },
        {
          label : 'SEO Analyzer',
          href  : 'analyzer.html',
          key   : 'analyzer.html',
          icon  : '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>'
        },
        {
          label : 'Page Counter',
          href  : 'counter.html',
          key   : 'counter.html',
          icon  : '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>'
        }
      ]
    },
    {
      section: 'Intelligence',
      items: [
        {
          label : 'Competitor Engine',
          href  : 'competitor-engine.html',
          key   : 'competitor-engine.html',
          icon  : '<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7M11 18H8a2 2 0 0 1-2-2V9"/>'
        },
        {
          label : 'Content Gap',
          href  : 'content-gap-analyzer.html',
          key   : 'content-gap-analyzer.html',
          icon  : '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>'
        },
        {
          label : 'Intent Analyzer',
          href  : 'intent-analyzer.html',
          key   : 'intent-analyzer.html',
          icon  : '<circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>'
        },
        {
          label : 'Internal Links',
          href  : 'internal-links.html',
          key   : 'internal-links.html',
          icon  : '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'
        }
      ]
    },
    {
      section: 'Technical',
      items: [
        {
          label : 'Technical SEO',
          href  : 'technical.html',
          key   : 'technical.html',
          icon  : '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>'
        },
        {
          label : 'AutoFix',
          href  : 'technical-autofix.html',
          key   : 'technical-autofix.html',
          icon  : '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>'
        },
        {
          label : 'Performance',
          href  : 'performance.html',
          key   : 'performance.html',
          icon  : '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>'
        },
        {
          label : 'Security & A11y',
          href  : 'security-a11y.html',
          key   : 'security-a11y.html',
          icon  : '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'
        }
      ]
    },
    {
      section: 'AI Tools',
      items: [
        {
          label : 'AI Copilot',
          href  : 'ai-copilot.html',
          key   : 'ai-copilot.html',
          icon  : '<path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2z"/><path d="M8 12h.01M12 12h.01M16 12h.01" stroke-width="2.5"/>'
        },
        {
          label : 'AI Roadmap',
          href  : 'ai-roadmap.html',
          key   : 'ai-roadmap.html',
          icon  : '<path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="m13 13 6 6"/>'
        },
        {
          label : 'Digital Twin',
          href  : 'digital-twin.html',
          key   : 'digital-twin.html',
          icon  : '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>'
        }
      ]
    },
    {
      section: 'Analytics',
      items: [
        {
          label : 'Reports',
          href  : 'report.html',
          key   : 'report.html',
          icon  : '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>'
        },
        {
          label : 'History',
          href  : 'history.html',
          key   : 'history.html',
          icon  : '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/>'
        }
      ]
    }
  ];

  /* ─── CSS ─── */
  var CSS = [
    "@import url('https://fonts.googleapis.com/css2?family=Bruno+Ace&family=DynaPuff:wdth,wght@86.3,400..700&display=swap');",
    ':root {',
    '  --sb-bg: #09090b;',
    '  --sb-border: rgba(255,255,255,0.065);',
    '  --sb-accent: #10b981;',
    '  --sb-accent-light: #34d399;',
    '  --sb-text: #f4f4f5;',
    '  --sb-text-muted: rgba(244,244,245,0.45);',
    '}',
    
    /* Layout & Centering Overrides */
    'body {',
    '  overflow-y: auto !important;',
    '  height: auto !important;',
    '}',
    '.app {',
    '  display: block !important;',
    '  height: auto !important;',
    '  overflow: visible !important;',
    '}',
    '.app .main, .app main.main, body:not(:has(.app)) .main, body:not(:has(.app)) main.main {',
    '  margin-left: 0 !important;',
    '  width: 100% !important;',
    '  max-width: 1200px !important;',
    '  margin: 0 auto !important;',
    '  padding: 72px 40px 40px 40px !important;',
    '  box-sizing: border-box !important;',
    '  transition: none !important;',
    '  overflow: visible !important;',
    '}',

    /* Header element */
    '#sidebar {',
    '  position: fixed;',
    '  top: 0; left: 0; right: 0;',
    '  height: 72px;',
    '  background: rgba(11, 13, 20, 0.85);',
    '  backdrop-filter: blur(16px);',
    '  -webkit-backdrop-filter: blur(16px);',
    '  border-bottom: 1px solid var(--sb-border);',
    '  box-shadow: 0 4px 30px rgba(0,0,0,0.4);',
    '  display: flex;',
    '  flex-direction: row;',
    '  align-items: center;',
    '  justify-content: space-between;',
    '  padding: 0 40px;',
    '  z-index: 1000;',
    '  box-sizing: border-box;',
    '}',

    /* Logo elements */
    '.sb-logo {',
    '  display: flex; align-items: center; gap: 10px;',
    '  text-decoration: none; cursor: pointer;',
    '}',
    '.sb-logo__icon {',
    '  width: 44px; height: 44px;',
    '  display: flex; align-items: center; justify-content: center;',
    '  flex-shrink: 0;',
    '}',
    'body.light-mode .sb-logo__icon img {',
    '  filter: invert(1) brightness(0.2);',
    '}',
    '.sb-logo__wordmark {',
    '  display: flex; flex-direction: column; line-height: 1.1;',
    '  white-space: nowrap;',
    '}',
    '.sb-logo__name {',
    '  font-family: "Bruno Ace", sans-serif;',
    '  font-size: 24px; font-weight: 400; letter-spacing: -0.4px; color: var(--sb-text);',
    '}',
    '.sb-logo__name span {',
    '  background: linear-gradient(135deg,#10b981,#34d399);',
    '  -webkit-background-clip: text;',
    '  background-clip: text;',
    '  -webkit-text-fill-color: transparent;',
    '}',
    '.sb-logo__tagline {',
    '  display: none !important;',
    '}',

    /* Center Pill Nav */
    '.pill-nav {',
    '  display: flex;',
    '  align-items: center;',
    '  background: rgba(255, 255, 255, 0.03);',
    '  border: 1px solid rgba(255, 255, 255, 0.06);',
    '  border-radius: 9999px;',
    '  padding: 4px 6px;',
    '  gap: 4px;',
    '}',
    '.pill-nav__item {',
    '  color: rgba(240, 240, 245, 0.6);',
    '  text-decoration: none;',
    '  font-size: 13.5px;',
    '  font-weight: 500;',
    '  padding: 8px 16px;',
    '  border-radius: 9999px;',
    '  transition: all 0.2s ease;',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 6px;',
    '  cursor: pointer;',
    '  position: relative;',
    '  box-sizing: border-box;',
    '}',
    '.pill-nav__item:hover {',
    '  color: #fff;',
    '  background: rgba(255, 255, 255, 0.05);',
    '}',
    '.pill-nav__item.active {',
    '  color: #fff;',
    '  background: rgba(16, 185, 129, 0.15);',
    '  border: 1px solid rgba(16, 185, 129, 0.25);',
    '  font-weight: 600;',
    '}',
    '.pill-nav__item svg.chevron {',
    '  opacity: 0.7;',
    '  transition: transform 0.2s ease;',
    '}',
    '.pill-nav__item:hover svg.chevron {',
    '  transform: rotate(180deg);',
    '}',

    /* Dropdown Mega Menu */
    '.pill-nav__item.dropdown {',
    '  position: relative;',
    '}',
    '.pill-nav__item.dropdown:hover .dropdown-menu {',
    '  opacity: 1;',
    '  transform: translateX(-50%) translateY(0) scale(1);',
    '  pointer-events: auto;',
    '}',
    '.dropdown-menu {',
    '  position: absolute;',
    '  top: 100%;',
    '  left: 50%;',
    '  transform: translateX(-50%) translateY(10px) scale(0.95);',
    '  opacity: 0;',
    '  pointer-events: none;',
    '  background: rgba(11, 13, 20, 0.98);',
    '  border: 1px solid rgba(255, 255, 255, 0.08);',
    '  border-radius: 16px;',
    '  padding: 16px;',
    '  box-shadow: 0 10px 40px rgba(0,0,0,0.6), 0 0 30px rgba(16, 185, 129, 0.1);',
    '  backdrop-filter: blur(20px);',
    '  -webkit-backdrop-filter: blur(20px);',
    '  z-index: 1000;',
    '  display: grid;',
    '  grid-template-columns: repeat(2, 260px);',
    '  gap: 8px;',
    '  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);',
    '  margin-top: 10px;',
    '}',
    '.dropdown-menu::before {',
    '  content: "";',
    '  position: absolute;',
    '  top: -16px;',
    '  left: 0;',
    '  right: 0;',
    '  height: 16px;',
    '  background: transparent;',
    '}',
    '.dropdown-item {',
    '  display: flex;',
    '  align-items: flex-start;',
    '  gap: 12px;',
    '  padding: 10px;',
    '  border-radius: 10px;',
    '  text-decoration: none;',
    '  color: rgba(240, 240, 245, 0.7);',
    '  transition: all 0.2s ease;',
    '  box-sizing: border-box;',
    '}',
    '.dropdown-item:hover {',
    '  background: rgba(255,255,255,0.04);',
    '  color: #fff;',
    '}',
    '.dropdown-item .icon {',
    '  width: 32px;',
    '  height: 32px;',
    '  border-radius: 8px;',
    '  background: rgba(16, 185, 129, 0.1);',
    '  border: 1px solid rgba(16, 185, 129, 0.2);',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  color: #34d399;',
    '  flex-shrink: 0;',
    '  transition: all 0.2s ease;',
    '}',
    '.dropdown-item:hover .icon {',
    '  background: rgba(16, 185, 129, 0.2);',
    '  border-color: rgba(16, 185, 129, 0.4);',
    '  transform: scale(1.05);',
    '}',
    '.dropdown-item .icon svg {',
    '  width: 16px;',
    '  height: 16px;',
    '}',
    '.dropdown-item .text {',
    '  display: flex;',
    '  flex-direction: column;',
    '  gap: 2px;',
    '  text-align: left;',
    '}',
    '.dropdown-item .title {',
    '  font-size: 13px;',
    '  font-weight: 600;',
    '  color: #fff;',
    '}',
    '.dropdown-item .desc {',
    '  font-size: 10.5px;',
    '  color: rgba(240, 240, 245, 0.4);',
    '  line-height: 1.3;',
    '}',

    /* Sign Out button */
    '.header-nav-right {',
    '  display: flex;',
    '  align-items: center;',
    '}',
    '.sb-footer-btn {',
    '  display: flex; align-items: center; justify-content: center; gap: 6px;',
    '  padding: 8px 16px; border-radius: 20px;',
    '  border: 1px solid var(--sb-border); background: transparent;',
    '  color: var(--sb-text-muted); font-size: 12.5px; font-weight: 600;',
    '  font-family: "Inter", system-ui, sans-serif;',
    '  cursor: pointer; transition: all 0.18s; white-space: nowrap; text-decoration: none;',
    '}',
    '.sb-footer-btn:hover {',
    '  background: rgba(255,82,82,0.08); border-color: rgba(255,82,82,0.25); color: #ff5252;',
    '}',
    
    /* Dropdown User Menu */
    '.sm-dropdown-container {',
    '  position: relative;',
    '  display: inline-block;',
    '}',
    '.sm-dropdown-menu {',
    '  position: absolute;',
    '  top: calc(100% + 8px);',
    '  right: 0;',
    '  width: 280px;',
    '  background: rgba(11, 13, 20, 0.85);',
    '  border: 1px solid var(--sb-border);',
    '  border-radius: 14px;',
    '  box-shadow: 0 10px 30px rgba(0,0,0,0.5), 0 0 20px rgba(16,185,129,0.05);',
    '  backdrop-filter: blur(16px);',
    '  -webkit-backdrop-filter: blur(16px);',
    '  padding: 8px;',
    '  display: flex;',
    '  flex-direction: column;',
    '  gap: 4px;',
    '  z-index: 10002;',
    '  opacity: 0;',
    '  transform: scale(0.95);',
    '  transform-origin: top right;',
    '  pointer-events: none;',
    '  transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);',
    '}',
    '.sm-dropdown-menu.open {',
    '  opacity: 1;',
    '  transform: scale(1);',
    '  pointer-events: auto;',
    '}',
    '.sm-dropdown-item {',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 12px;',
    '  padding: 10px 14px;',
    '  border-radius: 10px;',
    '  text-decoration: none;',
    '  color: rgba(240, 240, 245, 0.8);',
    '  font-size: 13.5px;',
    '  font-weight: 500;',
    '  transition: all 0.2s ease;',
    '  box-sizing: border-box;',
    '}',
    '.sm-dropdown-item:hover, .sm-dropdown-item:focus {',
    '  background: rgba(255, 255, 255, 0.05);',
    '  color: #fff;',
    '  outline: none;',
    '}',
    '.sm-dropdown-icon {',
    '  color: var(--sb-accent);',
    '  flex-shrink: 0;',
    '  width: 16px;',
    '  height: 16px;',
    '}',
    '.sm-dropdown-divider {',
    '  height: 1px;',
    '  background: var(--sb-border);',
    '  margin: 6px 0;',
    '}',
    '.sm-dropdown-theme {',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: space-between;',
    '  padding: 6px 14px;',
    '}',
    '.sm-dropdown-signout {',
    '  color: rgba(255, 82, 82, 0.8);',
    '}',
    '.sm-dropdown-signout:hover, .sm-dropdown-signout:focus {',
    '  background: rgba(255, 82, 82, 0.08);',
    '  color: #ff5252;',
    '}',
    
    /* Toggle Button */
    '.sm-toggle {',
    '  display: inline-flex; align-items: center; gap: 8px; background: transparent; border: none; cursor: pointer; color: var(--sb-text); font-weight: 600; font-size: 13.5px;',
    '  font-family: "Inter", system-ui, sans-serif; position: relative; z-index: 10001; padding: 8px 16px; border-radius: 20px; border: 1px solid var(--sb-border); transition: all 0.2s;',
    '}',
    '.sm-toggle:hover, .sm-toggle:focus {',
    '  background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.12); outline: none;',
    '}',
    '.sm-toggle-textWrap {',
    '  position: relative; display: inline-block; height: 1.1em; overflow: hidden; white-space: nowrap; width: 45px; text-align: left;',
    '}',
    '.sm-toggle-textInner {',
    '  display: flex; flex-direction: column; transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);',
    '}',
    '.sm-toggle.open .sm-toggle-textInner {',
    '  transform: translateY(-50%);',
    '}',
    '.sm-toggle-line {',
    '  display: block; height: 1.1em; line-height: 1.1;',
    '}',
    '.sm-icon {',
    '  position: relative; width: 14px; height: 14px; display: inline-flex; align-items: center; justify-content: center; transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);',
    '}',
    '.sm-toggle.open .sm-icon {',
    '  transform: rotate(225deg);',
    '}',
    '.sm-icon-line {',
    '  position: absolute; width: 100%; height: 2px; background: currentColor; border-radius: 2px;',
    '}',
    '.sm-icon-line-v {',
    '  transform: rotate(90deg);',
    '}',
    
    /* Light Mode Overrides for Dropdown */
    '.light-mode .sm-dropdown-menu {',
    '  background: rgba(255, 255, 255, 0.98);',
    '  border: 1px solid rgba(0, 0, 0, 0.08);',
    '  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06), 0 0 20px rgba(16, 185, 129, 0.02);',
    '}',
    '.light-mode .sm-dropdown-item {',
    '  color: rgba(15, 17, 21, 0.8);',
    '}',
    '.light-mode .sm-dropdown-item:hover, .light-mode .sm-dropdown-item:focus {',
    '  background: rgba(0, 0, 0, 0.03);',
    '  color: #000;',
    '}',
    
    /* Landing page theme-switch styles */
    '.theme-switch {',
    '  --toggle-size: 11px;',
    '  --container-width: 5.625em;',
    '  --container-height: 2.5em;',
    '  --container-radius: 6.25em;',
    '  --container-light-bg: #3D7EAE;',
    '  --container-night-bg: #1D1F2C;',
    '  --circle-container-diameter: 3.375em;',
    '  --sun-moon-diameter: 2.125em;',
    '  --sun-bg: #ECCA2F;',
    '  --moon-bg: #C4C9D1;',
    '  --spot-color: #959DB1;',
    '  --circle-container-offset: calc((var(--circle-container-diameter) - var(--container-height)) / 2 * -1);',
    '  --stars-color: #fff;',
    '  --clouds-color: #F3FDFF;',
    '  --back-clouds-color: #AACADF;',
    '  --transition: .5s cubic-bezier(0, -0.02, 0.4, 1.25);',
    '  --circle-transition: .3s cubic-bezier(0, -0.02, 0.35, 1.17);',
    '  display: inline-block;',
    '  vertical-align: middle;',
    '}',
    '.theme-switch, .theme-switch *, .theme-switch *::before, .theme-switch *::after {',
    '  box-sizing: border-box; margin: 0; padding: 0; font-size: var(--toggle-size);',
    '}',
    '.theme-switch__container {',
    '  width: var(--container-width); height: var(--container-height); background-color: var(--container-light-bg); border-radius: var(--container-radius); overflow: hidden; cursor: pointer; box-shadow: 0em -0.062em 0.062em rgba(0, 0, 0, 0.25), 0em 0.062em 0.125em rgba(255, 255, 255, 0.94); transition: var(--transition); position: relative; display: block;',
    '}',
    '.theme-switch__container::before {',
    '  content: ""; position: absolute; z-index: 1; inset: 0; box-shadow: 0em 0.05em 0.187em rgba(0, 0, 0, 0.25) inset, 0em 0.05em 0.187em rgba(0, 0, 0, 0.25) inset; border-radius: var(--container-radius);',
    '}',
    '.theme-switch__checkbox {',
    '  display: none !important;',
    '}',
    '.theme-switch__circle-container {',
    '  width: var(--circle-container-diameter); height: var(--circle-container-diameter); background-color: rgba(255, 255, 255, 0.1); position: absolute; left: var(--circle-container-offset); top: var(--circle-container-offset); border-radius: var(--container-radius); box-shadow: inset 0 0 0 3.375em rgba(255, 255, 255, 0.1), inset 0 0 0 3.375em rgba(255, 255, 255, 0.1), 0 0 0 0.625em rgba(255, 255, 255, 0.1), 0 0 0 1.25em rgba(255, 255, 255, 0.1); display: flex; transition: var(--circle-transition); pointer-events: none;',
    '}',
    '.theme-switch__sun-moon-container {',
    '  pointer-events: auto; position: relative; z-index: 2; width: var(--sun-moon-diameter); height: var(--sun-moon-diameter); margin: auto; border-radius: var(--container-radius); background-color: var(--sun-bg); box-shadow: 0.062em 0.062em 0.062em 0em rgba(254, 255, 239, 0.61) inset, 0em -0.062em 0.062em 0em #a1872a inset; filter: drop-shadow(0.062em 0.125em 0.125em rgba(0, 0, 0, 0.25)) drop-shadow(0em 0.062em 0.125em rgba(0, 0, 0, 0.25)); overflow: hidden; transition: var(--transition);',
    '}',
    '.theme-switch__moon {',
    '  transform: translateX(100%); width: 100%; height: 100%; background-color: var(--moon-bg); border-radius: inherit; box-shadow: 0.062em 0.062em 0.062em 0em rgba(254, 255, 239, 0.61) inset, 0em -0.062em 0.062em 0em #969696 inset; transition: var(--transition); position: relative;',
    '}',
    '.theme-switch__spot {',
    '  position: absolute; top: 0.75em; left: 0.312em; width: 0.75em; height: 0.75em; border-radius: var(--container-radius); background-color: var(--spot-color); box-shadow: 0em 0.0312em 0.062em rgba(0, 0, 0, 0.25) inset;',
    '}',
    '.theme-switch__spot:nth-of-type(2) {',
    '  width: 0.375em; height: 0.375em; top: 0.937em; left: 1.375em;',
    '}',
    '.theme-switch__spot:nth-last-of-type(3) {',
    '  width: 0.25em; height: 0.25em; top: 0.312em; left: 0.812em;',
    '}',
    '.theme-switch__clouds {',
    '  width: 1.25em; height: 1.25em; background-color: var(--clouds-color); border-radius: var(--container-radius); position: absolute; bottom: -0.625em; left: 0.312em; box-shadow: 0.937em 0.312em var(--clouds-color), -0.312em -0.312em var(--back-clouds-color), 1.437em 0.375em var(--clouds-color), 0.5em -0.125em var(--back-clouds-color), 2.187em 0 var(--clouds-color), 1.25em -0.062em var(--back-clouds-color), 2.937em 0.312em var(--clouds-color), 2em -0.312em var(--back-clouds-color), 3.625em -0.062em var(--clouds-color), 2.625em 0em var(--back-clouds-color), 4.5em -0.312em var(--clouds-color), 3.375em -0.437em var(--back-clouds-color), 4.625em -1.75em 0 0.437em var(--clouds-color), 4em -0.625em var(--back-clouds-color), 4.125em -2.125em 0 0.437em var(--clouds-color); transition: 0.5s cubic-bezier(0, -0.02, 0.4, 1.25);',
    '}',
    '.theme-switch__stars-container {',
    '  position: absolute; color: var(--stars-color); top: -100%; left: 0.312em; width: 2.75em; height: auto; transition: var(--transition);',
    '}',
    '.theme-switch__checkbox:checked + .theme-switch__container {',
    '  background-color: var(--container-night-bg);',
    '}',
    '.theme-switch__checkbox:checked + .theme-switch__container .theme-switch__circle-container {',
    '  left: calc(100% - var(--circle-container-offset) - var(--circle-container-diameter));',
    '}',
    '.theme-switch__checkbox:checked + .theme-switch__container .theme-switch__circle-container:hover {',
    '  left: calc(100% - var(--circle-container-offset) - var(--circle-container-diameter) - 0.187em);',
    '}',
    '.theme-switch__circle-container:hover {',
    '  left: calc(var(--circle-container-offset) + 0.187em);',
    '}',
    '.theme-switch__checkbox:checked + .theme-switch__container .theme-switch__moon {',
    '  transform: translate(0);',
    '}',
    '.theme-switch__checkbox:checked + .theme-switch__container .theme-switch__clouds {',
    '  bottom: -4.062em;',
    '}',
    '.theme-switch__checkbox:checked + .theme-switch__container .theme-switch__stars-container {',
    '  top: 50%; transform: translateY(-50%);',
    '}',

    /* Hide redundant elements */
    '.sb-mobile-toggle, #sidebarOverlay, .sb-toggle-btn {',
    '  display: none !important;',
    '}',

    /* Light Mode Overrides */
    ':root.light-mode {',
    '  --bg-base: #FAF8F2;',
    '  --bg-topbar: rgba(250, 248, 242, 0.8);',
    '  --bg-card: rgba(26, 26, 26, 0.03);',
    '  --bg-card-hover: rgba(26, 26, 26, 0.06);',
    '  --bg-input: rgba(26, 26, 26, 0.05);',
    '  --border: rgba(26, 26, 26, 0.08);',
    '  --border-hover: rgba(26, 26, 26, 0.15);',
    '  --text-1: #1A1A1A;',
    '  --text-2: rgba(26, 26, 26, 0.7);',
    '  --text-3: rgba(26, 26, 26, 0.4);',
    '  --sb-bg: #FAF8F2;',
    '  --sb-border: rgba(26, 26, 26, 0.08);',
    '  --sb-hover: rgba(26, 26, 26, 0.05);',
    '  --sb-text: #1A1A1A;',
    '  --sb-text-muted: rgba(26, 26, 26, 0.55);',
    '}',
    '.light-mode #sidebar {',
    '  background: rgba(250, 248, 242, 0.85);',
    '  box-shadow: 0 4px 30px rgba(0,0,0,0.06);',
    '  border-bottom: 1px solid var(--sb-border);',
    '}',
    '.light-mode .pill-nav {',
    '  background: rgba(0, 0, 0, 0.03);',
    '  border: 1px solid rgba(0, 0, 0, 0.06);',
    '}',
    '.light-mode .pill-nav__item {',
    '  color: rgba(15, 17, 21, 0.6);',
    '}',
    '.light-mode .pill-nav__item:hover {',
    '  color: #000;',
    '  background: rgba(0, 0, 0, 0.04);',
    '}',
    '.light-mode .pill-nav__item.active {',
    '  color: #10b981;',
    '  background: rgba(16, 185, 129, 0.08);',
    '  border-color: rgba(16, 185, 129, 0.2);',
    '}',
    '.light-mode .dropdown-menu {',
    '  background: rgba(255, 255, 255, 0.98);',
    '  border: 1px solid rgba(0, 0, 0, 0.08);',
    '  box-shadow: 0 10px 40px rgba(0,0,0,0.1), 0 0 30px rgba(16, 185, 129, 0.05);',
    '}',
    '.light-mode .dropdown-item {',
    '  color: rgba(15, 17, 21, 0.7);',
    '}',
    '.light-mode .dropdown-item:hover {',
    '  background: rgba(0,0,0,0.03);',
    '  color: #000;',
    '}',
    '.light-mode .dropdown-item .title {',
    '  color: #0f1115;',
    '}',
    '.light-mode .dropdown-item .desc {',
    '  color: rgba(15, 17, 21, 0.5);',
    '}',
    '.light-mode .stat-card,',
    '.light-mode .card,',
    '.light-mode .panel,',
    '.light-mode .audit-card,',
    '.light-mode .feature-card,',
    '.light-mode .tool-card {',
    '  background: #ffffff !important;',
    '  border: 1px solid rgba(0, 0, 0, 0.06) !important;',
    '  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02) !important;',
    '}',
    '.light-mode .main-header h1, .light-mode .page-header__title {',
    '  color: #0f1115 !important;',
    '}',
    '.light-mode .main-header p {',
    '  color: rgba(15, 17, 21, 0.7) !important;',
    '}',
    '.light-mode .stat-num {',
    '  color: #0f1115 !important;',
    '}',
    '.light-mode .audit-title {',
    '  color: #0f1115 !important;',
    '}'
  ].join('\n');


  /* ─── BUILD HTML ─── */
  function buildSidebarHTML(activeKey) {
    var html = '';

    // Left Logo part
    html += '<div class="header-nav-left">';
    html += '<a class="sb-logo" href="index.html">';
    html += '    <div class="sb-logo__icon" style="background: none; box-shadow: none; width: 44px; height: 44px;">';
    html += '      <img src="logo_tree.png" alt="RADIX Logo" style="width: 100%; height: 100%; object-fit: contain;" />';
    html += '</div>';
    html += '<div class="sb-logo__wordmark">';
    html += '<span class="sb-logo__name" style="font-size: 24px;">RADI<span>X</span></span>';
    html += '</div></a>';
    html += '</div>';

    // Center Pill Navigation
    html += '<div class="header-nav-center">';
    html += '<div class="pill-nav">';
    
    // Dashboard item (single link)
    var isDashboardActive = activeKey === 'dashboard.html';
    html += '<a href="dashboard.html" class="pill-nav__item' + (isDashboardActive ? ' active' : '') + '">';
    html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>';
    html += 'Dashboard</a>';

    // Dropdown Mega Menus for other categories
    var categories = [
      {
        name: 'Crawl & Audit',
        keys: ['scanner.html', 'analyzer.html', 'counter.html'],
        items: [
          { title: 'SEO Scanner', href: 'scanner.html', icon: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>', desc: 'Deep crawler for sitemaps and URLs' },
          { title: 'SEO Analyzer', href: 'analyzer.html', icon: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>', desc: 'Audit pages for critical errors' },
          { title: 'Page Counter', href: 'counter.html', icon: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/>', desc: 'Discover and count indexable URLs' }
        ]
      },
      {
        name: 'Intelligence',
        keys: ['competitor-engine.html', 'content-gap-analyzer.html', 'intent-analyzer.html', 'internal-links.html'],
        items: [
          { title: 'Competitor Engine', href: 'competitor-engine.html', icon: '<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7M11 18H8a2 2 0 0 1-2-2V9"/>', desc: 'Compare site performance with rivals' },
          { title: 'Content Gap', href: 'content-gap-analyzer.html', icon: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/>', desc: 'Find opportunities in search visibility' },
          { title: 'Intent Analyzer', href: 'intent-analyzer.html', icon: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>', desc: 'Understand user query semantics' },
          { title: 'Internal Links', href: 'internal-links.html', icon: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>', desc: 'Optimize anchor structure & PageRank' }
        ]
      },
      {
        name: 'Technical',
        keys: ['technical.html', 'technical-autofix.html', 'performance.html', 'security-a11y.html'],
        items: [
          { title: 'Technical SEO', href: 'technical.html', icon: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>', desc: 'Validate canonicals and redirect chains' },
          { title: 'AutoFix', href: 'technical-autofix.html', icon: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77"/>', desc: 'Automate code-level SEO fixes' },
          { title: 'Performance', href: 'performance.html', icon: '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>', desc: 'Optimize LCP, FID, and web vitals' },
          { title: 'Security & A11y', href: 'security-a11y.html', icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>', desc: 'Check HTTPS & accessibility compliance' }
        ]
      },
      {
        name: 'AI Tools',
        keys: ['ai-copilot.html', 'ai-roadmap.html', 'digital-twin.html'],
        items: [
          { title: 'AI Copilot', href: 'ai-copilot.html', icon: '<path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2z"/>', desc: 'Expert chat assistant for SEO tips' },
          { title: 'AI Roadmap', href: 'ai-roadmap.html', icon: '<path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>', desc: 'Custom prioritized execution list' },
          { title: 'Digital Twin', href: 'digital-twin.html', icon: '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>', desc: 'Simulate search bot indexing behavior' }
        ]
      },
      {
        name: 'Analytics',
        keys: ['report.html', 'history.html'],
        items: [
          { title: 'Reports', href: 'report.html', icon: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>', desc: 'Export executive PDF summaries' },
          { title: 'History', href: 'history.html', icon: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>', desc: 'Track crawl job history and logs' }
        ]
      }
    ];

    categories.forEach(function (cat) {
      var isCatActive = cat.keys.indexOf(activeKey) >= 0;
      html += '<div class="pill-nav__item dropdown' + (isCatActive ? ' active' : '') + '">';
      html += '<span>' + cat.name + ' <svg class="chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></span>';
      html += '<div class="dropdown-menu">';
      cat.items.forEach(function (sub) {
        var isSubActive = sub.href === activeKey;
        html += '<a href="' + sub.href + '" class="dropdown-item' + (isSubActive ? ' active' : '') + '">';
        html += '<span class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' + sub.icon + '</svg></span>';
        html += '<div class="text">';
        html += '<span class="title">' + sub.title + '</span>';
        html += '<span class="desc">' + sub.desc + '</span>';
        html += '</div></a>';
      });
      html += '</div></div>';
    });

    html += '</div>';
    html += '</div>';

    // Right Sign Out / Menu Toggle part
    html += '<div class="header-nav-right">';
    html += '  <div class="sm-dropdown-container">';
    html += '    <button class="sm-toggle" id="smToggleBtn" aria-haspopup="true" aria-expanded="false">';
    html += '      <span class="sm-toggle-textWrap">';
    html += '        <span class="sm-toggle-textInner">';
    html += '          <span class="sm-toggle-line">Menu</span>';
    html += '          <span class="sm-toggle-line">Close</span>';
    html += '        </span>';
    html += '      </span>';
    html += '      <span class="sm-icon">';
    html += '        <span class="sm-icon-line"></span>';
    html += '        <span class="sm-icon-line sm-icon-line-v"></span>';
    html += '      </span>';
    html += '    </button>';
    html += '    <div class="sm-dropdown-menu" id="smDropdownMenu" role="menu" aria-label="User menu" aria-hidden="true">';
    html += '      <a class="sm-dropdown-item" href="profile.html" role="menuitem" tabindex="-1">';
    html += '        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sm-dropdown-icon"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    html += '        <span>Profile</span>';
    html += '      </a>';
    html += '      <a class="sm-dropdown-item" href="about.html" role="menuitem" tabindex="-1">';
    html += '        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sm-dropdown-icon"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
    html += '        <span>About</span>';
    html += '      </a>';
    html += '      <a class="sm-dropdown-item" href="settings.html" role="menuitem" tabindex="-1">';
    html += '        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sm-dropdown-icon"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
    html += '        <span>Settings</span>';
    html += '      </a>';
    html += '      <div class="sm-dropdown-divider"></div>';
    html += '      <div class="sm-dropdown-theme">';
    html += '        <label class="theme-switch">';
    html += '          <input type="checkbox" class="theme-switch__checkbox" id="menuThemeSwitchCheckbox" tabindex="-1" />';
    html += '          <div class="theme-switch__container">';
    html += '            <div class="theme-switch__clouds"></div>';
    html += '            <div class="theme-switch__stars-container">';
    html += '              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 55" fill="none" style="width: 100%; height: auto;">';
    html += '                <path fill-rule="evenodd" clip-rule="evenodd" d="M135.831 3.00688C135.055 3.85027 134.111 4.29946 133 4.35447C134.111 4.40947 135.055 4.85867 135.831 5.71123C136.607 6.55462 136.996 7.56303 136.996 8.72727C136.996 7.95722 137.172 7.25134 137.525 6.59129C137.886 5.93124 138.372 5.39954 138.98 5.00535C139.598 4.60199 140.268 4.39114 141 4.35447C139.88 4.2903 138.936 3.85027 138.16 3.00688C137.384 2.16348 136.996 1.16425 136.996 0C136.996 1.16425 136.607 2.16348 135.831 3.00688ZM31 23.3545C32.1114 23.2995 33.0551 22.8503 33.8313 22.0069C34.6075 21.1635 34.9956 20.1642 34.9956 19C34.9956 20.1642 35.3837 21.1635 36.1599 22.0069C36.9361 22.0069 37.8798 23.2903 39 23.3545C38.2679 23.3911 37.5976 23.602 36.9802 24.0053C36.3716 24.3995 35.8864 24.9312 35.5248 25.5913C35.172 26.2513 34.9956 26.9572 34.9956 27.7273C34.9956 26.563 34.6075 25.5546 33.8313 24.7112C33.0551 23.8587 32.1114 23.4095 31 23.3545ZM0 36.3545C1.11136 36.2995 2.05513 35.8503 2.83131 35.0069C3.6075 34.1635 3.99559 33.1642 3.99559 32C3.99559 33.1642 4.38368 34.1635 5.15987 35.0069C5.93605 35.8503 6.87982 36.2903 8 36.3545C7.26792 36.3911 6.59757 36.602 5.98015 37.0053C5.37155 37.3995 4.88644 37.9312 4.52481 38.5913C4.172 39.2513 3.99559 39.9572 3.99559 40.7273C3.99559 39.563 3.6075 38.5546 2.83131 37.7112C2.05513 36.8587 1.11136 36.4095 0 36.3545ZM56.8313 24.0069C56.0551 24.8503 55.1114 25.2995 54 25.3545C55.1114 25.4095 56.0551 25.8587 56.8313 26.7112C57.6075 27.5546 57.9956 28.563 57.9956 29.7273C57.9956 28.9572 58.172 28.2513 58.5248 27.5913C58.8864 26.9312 59.3716 26.3995 59.9802 26.0053C60.5976 25.602 61.2679 25.3911 62 25.3545C60.8798 25.2903 59.9361 24.8503 59.1599 24.0069C58.3837 23.1635 57.9956 22.1642 57.9956 21C57.9956 22.1642 57.6075 23.1635 56.8313 24.0069ZM81 25.3545C82.1114 25.2995 83.0551 24.8503 83.8313 24.0069C84.6075 23.1635 84.9956 22.1642 84.9956 21C84.9956 22.1642 85.3837 23.1635 86.1599 24.0069C86.9361 24.8503 87.8798 25.2903 89 25.3545C88.2679 25.3911 87.5976 25.602 86.9802 26.0053C86.3716 26.3995 85.8864 26.9312 85.5248 27.5913C85.172 28.2513 84.9956 28.9572 84.9956 29.7273C84.9956 28.563 84.6075 27.5546 83.8313 26.7112C83.0551 25.8587 82.1114 25.4095 81 25.3545ZM136 36.3545C137.111 36.2995 138.055 35.8503 138.831 35.0069C139.607 34.1635 139.996 33.1642 139.996 32C139.996 33.1642 140.384 34.1635 141.16 35.0069C141.936 35.8503 142.88 36.2903 144 36.3545C143.268 36.3911 142.598 36.602 141.98 37.0053C141.372 37.3995 140.886 37.9312 140.525 38.5913C140.172 39.2513 139.996 39.9572 139.996 40.7273C139.996 39.563 139.607 38.5546 138.831 37.7112C138.055 36.8587 137.111 36.4095 136 36.3545ZM101.831 49.0069C101.055 49.8503 100.111 50.2995 99 50.3545C100.111 50.4095 101.055 50.8587 101.831 51.7112C102.607 52.5546 102.996 53.563 102.996 54.7273C102.996 53.9572 103.172 53.2513 103.525 52.5913C103.886 51.9312 104.372 51.3995 104.98 51.0053C105.598 50.602 106.268 50.3911 107 50.3545C105.88 50.2903 104.936 49.8503 104.16 49.0069C103.384 48.1635 102.996 47.1642 102.996 46C102.996 47.1642 102.607 48.1635 101.831 49.0069Z" fill="currentColor"></path>';
    html += '              </svg>';
    html += '            </div>';
    html += '            <div class="theme-switch__circle-container">';
    html += '              <div class="theme-switch__sun-moon-container">';
    html += '                <div class="theme-switch__moon">';
    html += '                  <div class="theme-switch__spot"></div>';
    html += '                  <div class="theme-switch__spot"></div>';
    html += '                  <div class="theme-switch__spot"></div>';
    html += '                </div>';
    html += '              </div>';
    html += '            </div>';
    html += '          </div>';
    html += '        </label>';
    html += '      </div>';
    html += '      <div class="sm-dropdown-divider"></div>';
    html += '      <a class="sm-dropdown-item sm-dropdown-signout" href="#" id="smSignOutBtn" role="menuitem" tabindex="-1">';
    html += '        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sm-dropdown-icon"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>';
    html += '        <span>Sign Out</span>';
    html += '      </a>';
    html += '    </div>';
    html += '  </div>';
    html += '</div>';

    return html;
  }


  /* ─── DETECT ACTIVE PAGE ─── */
  function getActiveKey() {
    var path = window.location.pathname;
    var filename = path.split('/').pop();
    if (!filename || filename === '') filename = 'dashboard.html';
    return filename;
  }

  /* ─── INJECT CSS ─── */
  function injectCSS() {
    if (document.getElementById('sb-global-styles')) return;
    var style = document.createElement('style');
    style.id = 'sb-global-styles';
    style.textContent = CSS;
    document.head.insertBefore(style, document.head.firstChild);
  }

  /* ─── INJECT SIDEBAR ─── */
  function injectSidebar() {
    if (document.getElementById(SIDEBAR_ID)) return null;

    /* Mobile overlay */
    var existingOverlay = document.getElementById(OVERLAY_ID);
    if (!existingOverlay) {
      var overlay = document.createElement('div');
      overlay.id = OVERLAY_ID;
      document.body.appendChild(overlay);
    }

    /* Mobile toggle */
    var mobileToggle = document.createElement('button');
    mobileToggle.className = 'sb-mobile-toggle';
    mobileToggle.id = 'sbMobileToggle';
    mobileToggle.setAttribute('aria-label', 'Open navigation');
    mobileToggle.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
    document.body.appendChild(mobileToggle);

    /* Sidebar */
    var aside = document.createElement('aside');
    aside.id = SIDEBAR_ID;
    aside.setAttribute('role', 'navigation');
    aside.setAttribute('aria-label', 'Main navigation');
    aside.innerHTML = buildSidebarHTML(getActiveKey());

    /* Find insertion point */
    var appContainer = document.querySelector('.app');
    if (appContainer) {
      appContainer.insertBefore(aside, appContainer.firstChild);
    } else {
      var mainEl = document.querySelector('main.main, div.main, main, .main');
      if (mainEl) {
        document.body.insertBefore(aside, mainEl);
      } else {
        document.body.insertBefore(aside, document.body.firstChild);
      }
    }



    return aside;
  }

  /* ─── COLLAPSE STATE ─── */
  function isCollapsed() {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch (e) { return false; }
  }

  function applyCollapsed(collapsed) {
    var sb = document.getElementById(SIDEBAR_ID);
    if (!sb) return;
    if (collapsed) {
      sb.classList.add('collapsed');
      document.body.classList.add('sidebar-collapsed');
    } else {
      sb.classList.remove('collapsed');
      document.body.classList.remove('sidebar-collapsed');
    }
    try { localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0'); } catch (e) {}
  }

  /* ─── BIND EVENTS ─── */
  function bindEvents(sidebar) {
    var overlay = document.getElementById(OVERLAY_ID);
    var mobileToggle = document.getElementById('sbMobileToggle');
    var collapseToggle = document.getElementById('sbCollapseToggle');

    if (collapseToggle) {
      collapseToggle.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var collapsed = !sidebar.classList.contains('collapsed');
        applyCollapsed(collapsed);
      });
    }

    function openMobile() {
      sidebar.classList.add('mobile-open');
      if (overlay) { overlay.style.display = 'block'; setTimeout(function() { overlay.classList.add('visible'); }, 10); }
    }
    function closeMobile() {
      sidebar.classList.remove('mobile-open');
      if (overlay) { overlay.classList.remove('visible'); setTimeout(function() { if (!overlay.classList.contains('visible')) overlay.style.display = ''; }, 260); }
    }

    if (mobileToggle) {
      mobileToggle.addEventListener('click', function () {
        sidebar.classList.contains('mobile-open') ? closeMobile() : openMobile();
      });
    }
    if (overlay) { overlay.addEventListener('click', closeMobile); }

    /* Close on nav click (mobile) */
    sidebar.querySelectorAll('.sb-item').forEach(function (item) {
      item.addEventListener('click', function () { closeMobile(); });
    });

    /* Dropdown Menu Events & Focus Management */
    (function() {
      var menuOpen = false;
      var smToggle = document.getElementById('smToggleBtn');
      var smDropdownMenu = document.getElementById('smDropdownMenu');

      if (smToggle && smDropdownMenu) {
        var focusableItems = smDropdownMenu.querySelectorAll('.sm-dropdown-item, input');
        var firstFocusable = focusableItems[0];
        var lastFocusable = focusableItems[focusableItems.length - 1];

        function toggleMenu(open) {
          menuOpen = open;
          if (menuOpen) {
            smToggle.classList.add('open');
            smToggle.setAttribute('aria-expanded', 'true');
            smDropdownMenu.classList.add('open');
            smDropdownMenu.setAttribute('aria-hidden', 'false');
            focusableItems.forEach(function(item) { item.setAttribute('tabindex', '0'); });
            
            // Focus first item with small delay for transition
            setTimeout(function() {
              if (firstFocusable) firstFocusable.focus();
            }, 100);
          } else {
            smToggle.classList.remove('open');
            smToggle.setAttribute('aria-expanded', 'false');
            smDropdownMenu.classList.remove('open');
            smDropdownMenu.setAttribute('aria-hidden', 'true');
            focusableItems.forEach(function(item) { item.setAttribute('tabindex', '-1'); });
            smToggle.focus();
          }
        }

        smToggle.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          toggleMenu(!menuOpen);
        });

        // Close on Escape key
        document.addEventListener('keydown', function(e) {
          if (e.key === 'Escape' && menuOpen) {
            toggleMenu(false);
          }
        });

        // Trap focus inside dropdown
        smDropdownMenu.addEventListener('keydown', function(e) {
          if (e.key === 'Tab') {
            if (e.shiftKey) { // Shift + Tab
              if (document.activeElement === firstFocusable) {
                e.preventDefault();
                lastFocusable.focus();
              }
            } else { // Tab
              if (document.activeElement === lastFocusable) {
                e.preventDefault();
                firstFocusable.focus();
              }
            }
          }
        });

        // Close on clicking outside
        document.addEventListener('click', function(e) {
          if (menuOpen && !smDropdownMenu.contains(e.target) && !smToggle.contains(e.target)) {
            toggleMenu(false);
          }
        });

        // Bind sign out inside dropdown menu
        var smSignOut = document.getElementById('smSignOutBtn');
        if (smSignOut) {
          smSignOut.addEventListener('click', function(e) {
            e.preventDefault();
            try { localStorage.removeItem('logged_in'); localStorage.removeItem('user_email'); } catch (ex) {}
            window.location.href = 'login.html';
          });
        }
      }

      /* Theme Switcher Logic */
      var checkbox = document.getElementById('sidebarThemeSwitchCheckbox');
      var menuCheckbox = document.getElementById('menuThemeSwitchCheckbox');
      var root = document.documentElement;

      var savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'light') {
        root.classList.add('light-mode');
        document.body.classList.add('light-mode');
        if (checkbox) checkbox.checked = false;
        if (menuCheckbox) menuCheckbox.checked = false;
      } else {
        root.classList.remove('light-mode');
        document.body.classList.remove('light-mode');
        if (checkbox) checkbox.checked = true;
        if (menuCheckbox) menuCheckbox.checked = true;
      }

      function handleThemeChange(dark) {
        if (dark) {
          root.classList.remove('light-mode');
          document.body.classList.remove('light-mode');
          localStorage.setItem('theme', 'dark');
          if (checkbox) checkbox.checked = true;
          if (menuCheckbox) menuCheckbox.checked = true;
        } else {
          root.classList.add('light-mode');
          document.body.classList.add('light-mode');
          localStorage.setItem('theme', 'light');
          if (checkbox) checkbox.checked = false;
          if (menuCheckbox) menuCheckbox.checked = false;
        }
      }

      if (checkbox) {
        checkbox.addEventListener('change', function() {
          handleThemeChange(checkbox.checked);
        });
      }
      if (menuCheckbox) {
        menuCheckbox.addEventListener('change', function() {
          handleThemeChange(menuCheckbox.checked);
        });
      }
    })();

    /* Resize */
    window.addEventListener('resize', function () {
      if (window.innerWidth > 768) closeMobile();
    });
  }


  /* ─── REMOVE STALE SCRIPTS / STYLES ─── */
  function removeStale() {
    ['sidebar-active-highlight-script', 'sidebar-active-script', 'sidebar-redesign-overrides'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.remove();
    });
  }

  function checkCrawlDataBlocker() {
    return; // Temporarily disabled so user can access all tools
  }

  window.createVerificationBadge = function (metadata) {
    return '';
  };

  /* ─── INIT ─── */
  function init() {
    injectCSS();
    checkCrawlDataBlocker();
    var sidebar = injectSidebar();
    if (!sidebar) return;

    /* Auto-collapse on tablet width */
    var shouldCollapse = isCollapsed() || (window.innerWidth <= 1024 && window.innerWidth > 768);
    applyCollapsed(shouldCollapse);

    bindEvents(sidebar);
    removeStale();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
