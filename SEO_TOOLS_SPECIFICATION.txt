# crawlX Enterprise SEO Platform: Complete 14-Tool Technical & Business Specification

This document provides a comprehensive technical and business specification for all **14 core tools** integrated into the crawlX Enterprise SEO Platform. The tools are organized logically, beginning with the core crawl and scanning engines.

---

## SECTION 1: CRAWL & AUDIT ENGINES

### 1. SEO Scanner (`scanner.html`)
* **Location**: [scanner.html](file:///home/ubuntu/seo-audit-platform/scanner.html) | [server.py](/home/ubuntu/seo-audit-platform/server.py#L4779) (Endpoint: `/api/site-crawl`)
* **Properties & Data**: Crawls and indexes site-wide properties including SSL redirection, meta titles, descriptions, canonical tags, heading hierarchies (H1/H2/H3), image asset counts, missing image alt attributes, and link graphs (mapping internal and outgoing external links). It identifies orphan pages and compiles a matrix of all crawled URLs with status codes and latencies.
* **Working Principle**: Recursively crawls up to 20 pages from the seed URL. It prefers the **Ollagraph LLM Clean Scraper API** (20s timeout per page) for structuring clean DOM content but falls back instantly to direct `urllib` fetches upon encountering rate-limiting (429) or gateway errors (502). Scores and numbers are verified via a backend **Validation Engine** (`data_verification.py`) which cross-validates crawler counts against Semrush, Ahrefs, Moz, and Google Search Console metrics, rendering dynamic `✓ high` verification badges.
* **Business Perspective**: Establishes baseline SEO visibility diagnostics. Cross-validation badges provide trust-assurance for marketing stakeholders, confirming crawled results are authentic before teams execute optimization campaigns.

### 2. SEO Analyzer (`analyzer.html`)
* **Location**: [analyzer.html](file:///home/ubuntu/seo-audit-platform/analyzer.html)
* **Properties & Data**: Provides detailed visual analysis cards mapping page-level optimization flags, keyword occurrence frequencies, heading counts, and asset counts. Displays audit checklists detailing meta description lengths, H1 tag counts, and duplicate tag indexes.
* **Working Principle**: Loads the cached live crawl metrics (`real_scan_data`) from localStorage. Dynamically maps on-page SEO factors to specific warning tiers (Critical, Warnings, Good) by evaluating structural page properties.
* **Business Perspective**: Offers immediate action-oriented insights for content writers and designers. Pinpoints low-hanging fruit optimizations (e.g., expanding thin descriptions) to drive swift ranking improvements.

### 3. Page Counter (`counter.html`)
* **Location**: [counter.html](file:///home/ubuntu/seo-audit-platform/counter.html) | [server.py](/home/ubuntu/seo-audit-platform/server.py#L4930) (Endpoint: `/api/page-counter`)
* **Properties & Data**: Parses XML sitemaps to discover total URL counts, sitemap indices, last-modified dates, change frequencies, and relative priorities of all site pathways.
* **Working Principle**: Requests sitemap indexes from `/api/page-counter` which fetches the domain's `/sitemap.xml` file. It parses sitemap locations recursively and compiles lists of discovered URLs.
* **Business Perspective**: Indexation Management. Ensures that search engine bots can discover all published URLs, matching the sitemap structure to actual crawl records to resolve indexing gaps.

---

## SECTION 2: INTELLIGENCE & ANALYTICS

### 4. Competitor Engine & Auto Comparison (`competitor-engine.html`)
* **Location**: [competitor-engine.html](file:///home/ubuntu/seo-audit-platform/competitor-engine.html) | [competitor-engine.js](file:///home/ubuntu/seo-audit-platform/competitor-engine.js)
* **Properties & Data**: Manages competitor mapping dashboards containing:
  1. *On-Page SEO Comparison Window*: Side-by-side comparison of SEO metrics.
  2. *Full Comparison Matrix*: Comparative scores, backlink totals, and domain authorities.
  3. *Market Intelligence*: Overall share of voice and competitor overlaps.
  4. *Business & Traffic Intelligence*: Traffic sources and monetization profiles.
  5. *Competitor Keyword Strategy*: Keyword volume gaps and opportunity weights.
  6. *Competitor Topic Clusters*: Clusters keywords into clusters to identify gaps in topic coverage.
* **Working Principle (Auto Comparison)**: Employs a progressive pipeline (URL -> Competitor Verification -> Business Fingerprinting -> Search API Querying -> Comparative rendering). It processes crawled site metrics alongside mock offsets of key competitors, populating visual glass-cards and lists dynamically.
* **Business Perspective**: Competitor Gap Mapping. Allows brand managers to locate direct competitor traffic sources, identify keyword opportunities, and cluster topic targets to compete in search engine visibility.

### 5. Content Gap Analyzer (`content-gap-analyzer.html`)
* **Location**: [content-gap-analyzer.html](file:///home/ubuntu/seo-audit-platform/content-gap-analyzer.html) | [content-gap-analyzer.js](file:///home/ubuntu/seo-audit-platform/content-gap-analyzer.js)
* **Properties & Data**: Indexes keyword rankings, traffic share estimates, and lists of "intersecting keywords" (keywords competitors rank for but the user's site does not).
* **Working Principle**: Connects to the backend `/api/content-gap` endpoint. It parses sitemaps and text keywords of both domains, compares overlap arrays, and identifies keywords present on competitor pages but missing from the target site.
* **Business Perspective**: Content Strategy Optimization. Directs editorial planning toward high-intent terms currently dominated by competitors, maximizing search market acquisition.

### 6. Intent Analyzer (`intent-analyzer.html`)
* **Location**: [intent-analyzer.html](file:///home/ubuntu/seo-audit-platform/intent-analyzer.html) | [intent-analyzer.js](file:///home/ubuntu/seo-audit-platform/intent-analyzer.js)
* **Properties & Data**: Categorizes crawled page queries into 4 intent classes: Informational, Navigational, Commercial, and Transactional. Reports overall search intent distribution.
* **Working Principle**: Calls the `/api/search-intent` endpoint, which scrapes page text and title elements. Feeds the data through **Ollima Cloud/Ollama Local LLMs** using intent-prompt weights, and falls back to text keyword matching if LLM inference is disabled.
* **Business Perspective**: User Query Alignment. Enhances content conversion rates by ensuring informational landing pages satisfy research intent, while commercial pages drive conversion.

### 7. Internal Links Profiler (`internal-links.html`)
* **Location**: [internal-links.html](file:///home/ubuntu/seo-audit-platform/internal-links.html) | [internal-links.js](file:///home/ubuntu/seo-audit-platform/internal-links.js)
* **Properties & Data**: Analyzes the site's link graph, detailing incoming/outgoing link counts per page, link depth (clicks from homepage), anchor text distributions, and broken links.
* **Working Principle**: Constructs a directional link graph from the cached crawl records in localStorage, calculating PageRank estimates and identifying unlinked orphan pages.
* **Business Perspective**: Crawl Budget Optimization. Maximizes search crawler efficiency by resolving broken internal pathways, streamlining link depth, and distributing internal PageRank to high-converting landing pages.

---

## SECTION 3: TECHNICAL & PERFORMANCE DIAGNOSTICS

### 8. Technical SEO (`technical.html`)
* **Location**: [technical.html](file:///home/ubuntu/seo-audit-platform/technical.html)
* **Properties & Data**: Displays technical health details, indexing directives (robots.txt, meta robots), markup verification (schema, open graph), and URL structures (length, parameters).
* **Working Principle**: Extracts robot headers, canonical paths, and schema structures from the target domain's home page via the cached crawl payload, validating syntax parameters.
* **Business Perspective**: Infrastructure Verification. Prevents search crawler index blocks caused by misconfigured robots directives or syntactic schema errors.

### 9. Technical SEO AutoFix (`technical-autofix.html`)
* **Location**: [technical-autofix.html](file:///home/ubuntu/seo-audit-platform/technical-autofix.html) | [technical-autofix.js](file:///home/ubuntu/seo-audit-platform/technical-autofix.js)
* **Properties & Data**: Dynamically generates ready-to-deploy HTML fixes, code snippets, and structured schema scripts.
* **Working Principle**: Requests fixes from `/api/technical-autofix`. The server evaluates crawl records, identifies issues (e.g., missing canonical or duplicate H1), and compiles remediation code blocks (e.g., canonical tag snippets, JSON-LD Organization schema scripts) ready for injection.
* **Business Perspective**: Decreases developer implementation cycles from weeks to minutes by automating code snippet generation.

### 10. Performance Analyzer (`performance.html`)
* **Location**: [performance.html](file:///home/ubuntu/seo-audit-platform/performance.html)
* **Properties & Data**: Maps Core Web Vitals metrics, page timelines (TTFB, LCP, TBT), and counts/weights of HTML, script, stylesheet, and image assets.
* **Working Principle**: Attempts client-side fetch of **Google PageSpeed Insights API** (v5). If it fails, it falls back to localStorage's `real_crawled_pages` array, mapping out real file weights by counting crawled script elements, stylesheets, and images.
* **Business Perspective**: Bounce Rate Reduction. Visualizes slow loading elements, enabling developers to compress assets and optimize script execution to improve organic rankings.

### 11. Security & Accessibility Audit (`security-a11y.html`)
* **Location**: [security-a11y.html](file:///home/ubuntu/seo-audit-platform/security-a11y.html)
* **Properties & Data**: Evaluates secure pathways (HTTPS, SSL validity), HSTS headers, mixed content resources, WCAG 2.1 AA parameters, ARIA landmark roles, and image alt counts.
* **Working Principle**: Reads `ssl`, `security_score`, `accessibility_score`, and `missing_alt_count` from local storage. If metrics are missing, it triggers `startCrawl()` automatically, updates the database, and reloads the page to populate the checklists.
* **Business Perspective**: Brand Trust & ADA Compliance. Safeguards connections and mitigates legal exposure under accessibility laws (ADA/WCAG).

---

## SECTION 4: AI & COPILOT CHANNELS

### 12. AI Copilot (`ai-copilot.html`)
* **Location**: [ai-copilot.html](file:///home/ubuntu/seo-audit-platform/ai-copilot.html) | [ask-ai.js](file:///home/ubuntu/seo-audit-platform/ask-ai.js)
* **Properties & Data**: Interactive AI conversation logs, custom prompt controls, and crawl context referencing logs.
* **Working Principle**: Links the chat input to `/api/ask-ai` or `/api/chat`. Resolves queries using **Ollima Cloud/Ollama Local LLM inference**, passing the crawled site metrics along with the user's prompt as context.
* **Business Perspective**: Direct Consultation Access. Provides team members with instant, AI-guided SEO explanations, strategies, and implementation workflows, reducing reliance on external consultancies.

### 13. AI Roadmap (`ai-roadmap.html`)
* **Location**: [ai-roadmap.html](file:///home/ubuntu/seo-audit-platform/ai-roadmap.html) | [strategy-engine.js](file:///home/ubuntu/seo-audit-platform/strategy-engine.js)
* **Properties & Data**: Roadmap timelines categorized by priority (Immediate 24h, Short-term 30d, Long-term 90d fixes) tailored to the website's crawl performance.
* **Working Principle**: Requests roadmap metrics from `/api/seo-strategy`. The server checks crawled properties (SSL, canonical presence, schema, alt counts, orphan pages) and dynamically constructs recommendations, falling back to dynamic program-level checklists if LLM inference times out.
* **Business Perspective**: Project Planning Automation. Automatically structures and categorizes work queues for developer and content teams based on actual site deficits.

### 14. Digital Twin (`digital-twin.html`)
* **Location**: [digital-twin.html](file:///home/ubuntu/seo-audit-platform/digital-twin.html) | [digital-twin.js](file:///home/ubuntu/seo-audit-platform/digital-twin.js)
* **Properties & Data**: Googlebot simulation logs, site index rendering previews, crawled page content comparison grids, and bot discovery timelines.
* **Working Principle**: Simulates a search engine crawler (Googlebot) scanning page hierarchies, rendering DOM structures, and identifying crawler-traps or indexing discrepancies.
* **Business Perspective**: Indexation Diagnostics. Simulates how Googlebot views and processes the website, enabling teams to fix crawling blockers before search engines index the site.
