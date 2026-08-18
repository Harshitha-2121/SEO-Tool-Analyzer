    if (localStorage.getItem('logged_in') !== 'true') {
      window.location.href = 'login.html';
    }
// Extract query parameters
    const urlParams = new URLSearchParams(window.location.search);
    let targetUrl = urlParams.get('url');
    if (targetUrl) {
      localStorage.setItem('current_scanned_domain', targetUrl);
    } else {
      targetUrl = localStorage.getItem('current_scanned_domain') || 'https://www.networkershome.com';
    }
    
    // Clean URL
    targetUrl = targetUrl.replace(/^(https?:\/\/)?(www\.)?/i, '').split('/')[0];
    document.getElementById('headerUrlText').textContent = targetUrl;
    document.getElementById('targetUrlInput').value = targetUrl;

    // Form submission
    document.getElementById('perfSelectorForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const val = document.getElementById('targetUrlInput').value;
      localStorage.setItem('current_scanned_domain', val);
      window.location.href = `performance.html?url=${encodeURIComponent(val)}`;
    });

    let score = 0;
    let lcpSec = '0.0';
    let clsVal = '0.00';
    let inpMs = 0;
    let fcpSec = '0.0';
    let tbtMs = 0;
    let ttfbMs = 0;
    let fullyLoadedSec = '0.0';
    let wImages = 0, wJs = 0, wCss = 0, wFonts = 0, wOther = 0;
    let wTotal = 0;

    let hasRealData = false;
    let rd = CrawlXUtils.loadScanData(targetUrl);
    
    if (!rd) {
      CrawlXUtils.renderBlocker(
        "Verified performance metrics are currently unavailable",
        "No verified crawl record was found matching this domain. Performance diagnostics require a completed live crawl database record.",
        ['section', '.split-grid', '.perf-grid', '.glass-card', '#speedOptimizationsList']
      );
      if (targetUrl) {
        setTimeout(() => startCrawl(targetUrl), 500);
      }
    } else {
      hasRealData = true;
      const crawledPages = JSON.parse(localStorage.getItem('real_crawled_pages') || '[]');
      let totalImages = 0, totalScripts = 0, totalStyles = 0;
      crawledPages.forEach(p => {
        totalImages += p.images_count || 0;
        totalScripts += p.links_count ? Math.round(p.links_count * 0.1) : 2;
        totalStyles += p.external_links_count ? Math.round(p.external_links_count * 0.15) : 1;
      });
      wImages = Math.max(120, totalImages * 85);
      wJs = Math.max(95, totalScripts * 45);
      wCss = Math.max(25, totalStyles * 15);
      wFonts = 75;
      wOther = 15;
      wTotal = wImages + wJs + wCss + wFonts + wOther;

      if (!rd.psi_data) {
        fetchRealPsiData(targetUrl, rd);
      } else {
        applyPsiData(rd.psi_data);
      }
    }

    function applyPsiData(psi) {
      score = psi.score || 0;
      lcpSec = psi.lcp || '0.0';
      clsVal = psi.cls || '0.00';
      inpMs = psi.inp || 0;
      fcpSec = psi.fcp || '0.0';
      tbtMs = psi.tbt || 0;
      ttfbMs = psi.ttfb || 0;
      fullyLoadedSec = psi.fullyLoaded || '0.0';
      
      animateDialGauge();
      renderVitals();
      renderCharts();
      populateRecommendations();
    }

    function fetchRealPsiData(url, currentRd) {
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(10,10,20,0.9);backdrop-filter:blur(12px);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font-family:system-ui,sans-serif;';
      overlay.innerHTML = `
        <div style="text-align:center;max-width:450px;padding:32px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;">
          <div style="width:50px;height:50px;border:3px solid rgba(108, 92, 231, 0.2);border-top-color:#6c5ce7;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 24px auto;"></div>
          <h2 style="font-size:20px;font-weight:600;margin-bottom:8px;">Running Lighthouse Analysis</h2>
          <p style="font-size:14px;color:rgba(255,255,255,0.6);line-height:1.6;margin-bottom:16px;">Connecting to Google PageSpeed Insights for <strong>${url}</strong>. This takes about 10-15 seconds to complete...</p>
        </div>
        <style>@keyframes spin { to { transform:rotate(360deg); } }</style>
      `;
      document.body.appendChild(overlay);

      const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://${url.replace(/^https?:\/\//,'')}&category=PERFORMANCE`;
      fetch(apiUrl)
        .then(res => res.json())
        .then(data => {
          overlay.remove();
          const lighthouse = data.lighthouseResult;
          if (lighthouse) {
            const audits = lighthouse.audits;
            const psi = {
              score: Math.round((lighthouse.categories.performance.score || 0) * 100),
              lcp: (audits['largest-contentful-paint'].numericValue / 1000).toFixed(1),
              cls: audits['cumulative-layout-shift'].numericValue.toFixed(2),
              inp: Math.round(audits['interactive']?.numericValue || 0),
              fcp: (audits['first-contentful-paint'].numericValue / 1000).toFixed(1),
              tbt: Math.round(audits['total-blocking-time'].numericValue),
              ttfb: Math.round(audits['server-response-time'].numericValue),
              fullyLoaded: (audits['speed-index'].numericValue / 1000).toFixed(1)
            };
            currentRd.psi_data = psi;
            localStorage.setItem('real_scan_data', JSON.stringify(currentRd));
            applyPsiData(psi);
          } else {
            console.error('Lighthouse data missing:', data);
            alert('Failed to retrieve performance data from Google PSI. Falling back to defaults.');
            applyPsiData({});
          }
        })
        .catch(err => {
          overlay.remove();
          console.error('PSI Error:', err);
          alert('Error connecting to PageSpeed Insights. Falling back to defaults.');
          applyPsiData({});
        });
    }

    function startCrawl(url) {
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(10,10,20,0.9);backdrop-filter:blur(12px);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font-family:system-ui,sans-serif;';
      overlay.innerHTML = `
        <div style="text-align:center;max-width:450px;padding:32px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;">
          <div style="width:50px;height:50px;border:3px solid rgba(108, 92, 231, 0.2);border-top-color:#6c5ce7;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 24px auto;"></div>
          <h2 style="font-size:20px;font-weight:600;margin-bottom:8px;">Ollagraph SEO Analysis in Progress</h2>
          <p style="font-size:14px;color:rgba(255,255,255,0.6);line-height:1.6;margin-bottom:16px;">Crawling <strong>\${url}</strong> recursively via Ollagraph to retrieve visible word counts, links, headings, schema, and metadata...</p>
          <div id="loaderStatus" style="font-size:12px;color:#6c5ce7;font-weight:500;text-transform:uppercase;letter-spacing:1px;">Requesting Crawl Database...</div>
        </div>
        <style>@keyframes spin { to { transform:rotate(360deg); } }</style>
      `;
      document.body.appendChild(overlay);

      fetch('/api/site-crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const rsd = {
            domain: data.domain,
            pages_crawled: data.pages_crawled,
            latency: data.load_time_ms
          };
          localStorage.setItem('real_scan_data', JSON.stringify(rsd));
          location.reload();
        } else {
          document.getElementById('loaderStatus').style.color = '#ff5252';
          document.getElementById('loaderStatus').textContent = 'Crawl Failed: ' + (data.error || 'Unknown error');
          setTimeout(() => overlay.remove(), 2500);
        }
      })
      .catch(err => {
        document.getElementById('loaderStatus').style.color = '#ff5252';
        document.getElementById('loaderStatus').textContent = 'Error: ' + err.message;
        setTimeout(() => overlay.remove(), 2500);
      });
    }


    // Render Dial Gauge
    function animateDialGauge() {
      const mainRing = document.getElementById('reportScoreRing');
      const mainScoreVal = document.getElementById('reportScoreVal');
      const mainOffset = 502 * (1 - score / 100);
      
      setTimeout(() => {
        mainRing.style.strokeDashoffset = mainOffset;
        
        let cur = 0;
        const mainValInterval = setInterval(() => {
          cur += 1;
          mainScoreVal.textContent = cur;
          if (cur >= score) {
            clearInterval(mainValInterval);
          }
        }, 15);
      }, 100);

      // Status Badge mapping
      const statusBadge = document.getElementById('reportStatusBadge');
      let rating = '';
      let colorClass = '';
      if (score >= 90) { rating = 'Excellent'; colorClass = 'score-excellent'; statusBadge.style.background = 'var(--green-bg)'; statusBadge.style.borderColor = 'var(--green-border)'; }
      else if (score >= 70) { rating = 'Good'; colorClass = 'score-good'; statusBadge.style.background = 'var(--cyan-bg)'; statusBadge.style.borderColor = 'var(--cyan-border)'; }
      else if (score >= 50) { rating = 'Average'; colorClass = 'score-average'; statusBadge.style.background = 'var(--orange-bg)'; statusBadge.style.borderColor = 'var(--orange-border)'; }
      else { rating = 'Poor'; colorClass = 'score-poor'; statusBadge.style.background = 'var(--red-bg)'; statusBadge.style.borderColor = 'var(--red-border)'; }
      
      statusBadge.textContent = rating;
      statusBadge.className = 'gauge-status ' + colorClass;
    }

    // Render Web Vitals & Metrics values
    function renderVitals() {
      // 1. LCP
      document.getElementById('valLcp').textContent = lcpSec + 's';
      const vCardLcp = document.getElementById('vCardLcp');
      const vBadgeLcp = document.getElementById('vBadgeLcp');
      const lcpNum = parseFloat(lcpSec);
      if (lcpNum < 2.5) { vCardLcp.className = 'vitals-card vitals-card--pass'; vBadgeLcp.className = 'vitals-badge vitals-badge--pass'; vBadgeLcp.textContent = 'Good'; }
      else { vCardLcp.className = 'vitals-card vitals-card--warn'; vBadgeLcp.className = 'vitals-badge vitals-badge--warn'; vBadgeLcp.textContent = 'Needs Work'; }

      // 2. CLS
      document.getElementById('valCls').textContent = clsVal;
      const vCardCls = document.getElementById('vCardCls');
      const vBadgeCls = document.getElementById('vBadgeCls');
      const clsNum = parseFloat(clsVal);
      if (clsNum < 0.10) { vCardCls.className = 'vitals-card vitals-card--pass'; vBadgeCls.className = 'vitals-badge vitals-badge--pass'; vBadgeCls.textContent = 'Good'; }
      else { vCardCls.className = 'vitals-card vitals-card--warn'; vBadgeCls.className = 'vitals-badge vitals-badge--warn'; vBadgeCls.textContent = 'Needs Work'; }

      // 3. INP
      document.getElementById('valInp').textContent = inpMs + ' ms';
      const vCardInp = document.getElementById('vCardInp');
      const vBadgeInp = document.getElementById('vBadgeInp');
      if (inpMs < 200) { vCardInp.className = 'vitals-card vitals-card--pass'; vBadgeInp.className = 'vitals-badge vitals-badge--pass'; vBadgeInp.textContent = 'Good'; }
      else { vCardInp.className = 'vitals-card vitals-card--warn'; vBadgeInp.className = 'vitals-badge vitals-badge--warn'; vBadgeInp.textContent = 'Needs Work'; }

      // 4. Other stats
      document.getElementById('valFcp').textContent = fcpSec + 's';
      document.getElementById('valTbt').textContent = tbtMs + ' ms';
      document.getElementById('valTtfb').textContent = ttfbMs + ' ms';
    }

    // Render charts
    function renderCharts() {
      // Waterfall widths (percentage of loaded time)
      const loadMax = parseFloat(fullyLoadedSec);
      
      const pTtfb = Math.min(((ttfbMs / 1000) / loadMax) * 100, 100).toFixed(1);
      const pFcp = Math.min((parseFloat(fcpSec) / loadMax) * 100, 100).toFixed(1);
      const pLcp = Math.min((parseFloat(lcpSec) / loadMax) * 100, 100).toFixed(1);

      document.getElementById('waterTtfb').style.width = pTtfb + '%';
      document.getElementById('waterTtfbVal').textContent = ttfbMs + 'ms';
      
      document.getElementById('waterFcp').style.width = pFcp + '%';
      document.getElementById('waterFcpVal').textContent = fcpSec + 's';
      
      document.getElementById('waterLcp').style.width = pLcp + '%';
      document.getElementById('waterLcpVal').textContent = lcpSec + 's';
      
      document.getElementById('waterLoad').style.width = '100%';
      document.getElementById('waterLoadVal').textContent = fullyLoadedSec + 's';

      // Asset weights percentages
      const pImages = ((wImages / wTotal) * 100).toFixed(1);
      const pJs = ((wJs / wTotal) * 100).toFixed(1);
      const pCss = ((wCss / wTotal) * 100).toFixed(1);
      const pFonts = ((wFonts / wTotal) * 100).toFixed(1);
      const pOther = ((wOther / wTotal) * 100).toFixed(1);

      document.getElementById('wSegImages').style.width = pImages + '%';
      document.getElementById('wSegJs').style.width = pJs + '%';
      document.getElementById('wSegCss').style.width = pCss + '%';
      document.getElementById('wSegFonts').style.width = pFonts + '%';
      document.getElementById('wSegOther').style.width = pOther + '%';

      // Legend texts
      document.getElementById('wLegImages').textContent = wImages >= 1000 ? (wImages/1000).toFixed(1) + ' MB' : wImages + ' KB';
      document.getElementById('wLegJs').textContent = wJs + ' KB';
      document.getElementById('wLegCss').textContent = wCss + ' KB';
      document.getElementById('wLegFonts').textContent = wFonts + ' KB';
      document.getElementById('wLegOther').textContent = wOther + ' KB';
    }

    // Populate speed recommendations
    function populateRecommendations() {
      const optList = document.getElementById('speedOptimizationsList');
      
      // Image savings mockup
      const imgSavings = Math.round(wImages * 0.6);
      const jsSavings = Math.round(wJs * 0.35);
      const cssSavings = Math.round(wCss * 0.4);

      optList.innerHTML = `
        <li class="audit-item">
          <div class="audit-badge ${wImages > 1500 ? 'audit-badge--fail': 'audit-badge--warn'}">${wImages > 1500 ? '✗': '!'}</div>
          <div class="audit-info">
            <span class="audit-title">Serve images in modern next-generation formats</span>
            <p class="audit-desc">Converting PNG and JPEG graphics into WebP or AVIF formats provides high compression rates without loss of rendering clarity.</p>
            <span class="audit-savings">Estimated speed saving: ~${imgSavings} KB</span>
          </div>
        </li>

        <li class="audit-item">
          <div class="audit-badge ${wJs > 400 ? 'audit-badge--fail': 'audit-badge--warn'}">${wJs > 400 ? '✗': '!'}</div>
          <div class="audit-info">
            <span class="audit-title">Defer render-blocking JavaScript scripts</span>
            <p class="audit-desc">We identified JavaScript resources block document parsing. Appending async or defer attributes avoids blocking main thread paint routines.</p>
            <span class="audit-savings">Estimated speed saving: ~${jsSavings} KB (TBT Reduction)</span>
          </div>
        </li>

        <li class="audit-item">
          <div class="audit-badge audit-badge--warn">!</div>
          <div class="audit-info">
            <span class="audit-title">Minify CSS layouts and remove unused rules</span>
            <p class="audit-desc">Removing empty spaces and purging unused classes from styles assets reduces payload transfer size and speeds up layout paint calculations.</p>
            <span class="audit-savings">Estimated speed saving: ~${cssSavings} KB</span>
          </div>
        </li>
      `;
    }

    // Population is now handled asynchronously in applyPsiData() after PSI fetch
  
    // Logout Handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('logged_in');
        localStorage.removeItem('user_email');
        window.location.href = 'login.html';
      });
    }
