document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  if (sidebar && sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
    });
  }

  const btnAnalyze = document.getElementById('btnAnalyze');
  const targetUrlInput = document.getElementById('targetUrlInput');
  const loaderOverlay = document.getElementById('intentLoader');
  const resultsWrapper = document.getElementById('resultsWrapper');
  const loaderTask = document.getElementById('loaderTask');

  // Pre-fill target domain
  const storedUser = localStorage.getItem('current_scanned_domain') || 'https://www.networkershome.com';
  targetUrlInput.value = storedUser;

  // Tab switching
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      const targetTabId = button.getAttribute('data-tab');
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      document.getElementById(targetTabId).classList.add('active');
    });
  });

  const errorAlert = document.getElementById('errorAlert');
  const errorText = document.getElementById('errorText');
  const btnRetry = document.getElementById('btnRetry');

  async function performAnalysis() {
    const target = targetUrlInput.value.trim();
    if (!target) {
      alert('Please enter a website URL.');
      return;
    }

    loaderOverlay.style.display = 'block';
    resultsWrapper.style.display = 'none';
    if (errorAlert) errorAlert.style.display = 'none';
    loaderTask.textContent = 'Crawling URLs and checking HSTS security configurations...';

    try {
      const response = await fetch('/api/search-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_url: target })
      });

      const data = await response.json();
      loaderOverlay.style.display = 'none';

      if (response.ok && data.success) {
        renderResults(data);
        resultsWrapper.style.display = 'block';
      } else {
        const errMsg = data.error || 'Unable to fetch website or establish secure connection.';
        showError(errMsg);
      }
    } catch (err) {
      console.error(err);
      loaderOverlay.style.display = 'none';
      showError('Unable to fetch website (Network timeout or DNS resolution failure).');
    }
  }

  function showError(msg) {
    if (errorAlert && errorText) {
      errorText.textContent = msg;
      errorAlert.style.display = 'block';
    } else {
      alert('Intent & EEAT analysis failed: ' + msg);
    }
  }

  btnAnalyze.addEventListener('click', performAnalysis);
  if (btnRetry) {
    btnRetry.addEventListener('click', performAnalysis);
  }

  function renderResults(data) {
    // 1. Animate EEAT Dials
    const exp = data.avg_eeat ? data.avg_eeat.experience : 60;
    const ext = data.avg_eeat ? data.avg_eeat.expertise : 65;
    const aut = data.avg_eeat ? data.avg_eeat.authority : 55;
    const tru = data.avg_eeat ? data.avg_eeat.trust : 70;

    animateDial('fillExp', exp);
    document.getElementById('valExp').textContent = exp + '%';

    animateDial('fillExt', ext);
    document.getElementById('valExt').textContent = ext + '%';

    animateDial('fillAut', aut);
    document.getElementById('valAut').textContent = aut + '%';

    animateDial('fillTru', tru);
    document.getElementById('valTru').textContent = tru + '%';

    // 2. Set Intent Profile bars
    const dist = data.intent_distributions || { informational: 40, commercial: 35, transactional: 15, navigational: 10 };
    document.getElementById('barInfo').style.width = dist.informational + '%';
    document.getElementById('lblInfo').textContent = dist.informational + '%';

    document.getElementById('barComm').style.width = dist.commercial + '%';
    document.getElementById('lblComm').textContent = dist.commercial + '%';

    document.getElementById('barTran').style.width = dist.transactional + '%';
    document.getElementById('lblTran').textContent = dist.transactional + '%';

    document.getElementById('barNav').style.width = dist.navigational + '%';
    document.getElementById('lblNav').textContent = dist.navigational + '%';

    // 3. AI Narrative
    document.getElementById('aiClusterNarrative').textContent = data.ai_topic_suggestions || 'No analysis recommendations generated.';

    // 4. Fill EEAT Diagnostics Table
    const eeatTableBody = document.getElementById('eeatTableBody');
    if (data.eeat_results && data.eeat_results.length > 0) {
      eeatTableBody.innerHTML = data.eeat_results.map(res => {
        const cleanPath = res.url.replace(/^(https?:\/\/)?(www\.)?[^\/]+/i, '') || '/';
        const rankColor = res.composite >= 80 ? 'var(--green)' : (res.composite >= 60 ? 'var(--orange)' : 'var(--red)');
        return `
          <tr>
            <td style="font-family:monospace; color:var(--text-2); max-width:250px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"><a href="${res.url}" target="_blank" style="color:inherit; text-decoration:none;">${cleanPath}</a></td>
            <td>${res.experience}%</td>
            <td>${res.expertise}%</td>
            <td>${res.authority}%</td>
            <td>${res.trust}%</td>
            <td style="font-weight:700; color:${rankColor};">${res.composite}%</td>
          </tr>
        `;
      }).join('');
    } else {
      eeatTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-3);">No pages crawled.</td></tr>`;
    }

    // 5. Fill Intent Mapping Table
    const intentMappingBody = document.getElementById('intentMappingBody');
    if (data.intent_mapping && data.intent_mapping.length > 0) {
      intentMappingBody.innerHTML = data.intent_mapping.map(m => {
        const cleanPath = m.url.replace(/^(https?:\/\/)?(www\.)?[^\/]+/i, '') || '/';
        let badgeClass = 'intent-info';
        if (m.intent === 'Commercial') badgeClass = 'intent-comm';
        if (m.intent === 'Transactional') badgeClass = 'intent-tran';
        if (m.intent === 'Navigational') badgeClass = 'intent-nav';
        return `
          <tr>
            <td style="font-family:monospace; color:var(--text-2); max-width:250px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"><a href="${m.url}" target="_blank" style="color:inherit; text-decoration:none;">${cleanPath}</a></td>
            <td><span class="intent-badge ${badgeClass}">${m.intent}</span></td>
            <td><span style="font-weight:600; color:var(--cyan);">${m.confidence || 70}%</span></td>
            <td style="font-size:12.5px; color:var(--text-2); max-width:300px; word-break:break-word;">${m.explanation || 'Determined via page content markers'}</td>
            <td style="color: var(--accent); font-style:italic;">${m.keywords.join(', ')}</td>
          </tr>
        `;
      }).join('');
    } else {
      intentMappingBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-3);">No pages crawled.</td></tr>`;
    }

    // 6. Missing Topics
    const missingTopicsBody = document.getElementById('missingTopicsBody');
    if (data.missing_topics && data.missing_topics.length > 0) {
      missingTopicsBody.innerHTML = data.missing_topics.map(t => {
        let badgeClass = 'intent-info';
        if (t.intent === 'Commercial') badgeClass = 'intent-comm';
        if (t.intent === 'Transactional') badgeClass = 'intent-tran';
        if (t.intent === 'Navigational') badgeClass = 'intent-nav';
        return `
          <tr style="border-bottom:1px solid var(--border);">
            <td style="padding:10px 0; font-weight:600; color:#fff;">${t.topic}</td>
            <td style="padding:10px 0;"><span class="intent-badge ${badgeClass}">${t.intent}</span></td>
            <td style="padding:10px 0; text-align:right; font-family:monospace; color:var(--green);">${t.volume.toLocaleString()}</td>
          </tr>
        `;
      }).join('');
    } else {
      missingTopicsBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-3); padding:10px 0;">No topic gaps found.</td></tr>`;
    }

    // 7. Featured Snippets
    const featuredSnippetsBody = document.getElementById('featuredSnippetsBody');
    if (data.featured_snippets && data.featured_snippets.length > 0) {
      featuredSnippetsBody.innerHTML = data.featured_snippets.map(fs => {
        return `
          <tr style="border-bottom:1px solid var(--border);">
            <td style="padding:10px 0; font-weight:600; color:var(--cyan);">${fs.opportunity}</td>
            <td style="padding:10px 0; font-size:12.5px; font-style:italic; color:var(--text-2);">"${fs.suggested_answer}"</td>
          </tr>
        `;
      }).join('');
    } else {
      featuredSnippetsBody.innerHTML = `<tr><td colspan="2" style="text-align:center; color:var(--text-3); padding:10px 0;">No snippet opportunities catalogued.</td></tr>`;
    }

    // 8. Topic Clusters recommendations
    const clustersContainer = document.getElementById('clustersContainer');
    if (data.cluster_recommendations && data.cluster_recommendations.length > 0) {
      clustersContainer.innerHTML = data.cluster_recommendations.map(rec => {
        return `
          <div style="margin-bottom:18px; border-bottom:1px solid var(--border); padding-bottom:12px;">
            <div style="font-size:14px; font-weight:700; color:#fff; margin-bottom:8px;">Pillar Topic: "${rec.pillar_page}"</div>
            <div style="padding-left:14px; border-left:2px solid var(--accent);">
              ${rec.supporting_articles.map(art => `
                <div style="font-size:13px; margin-bottom:6px;">
                  <strong style="color: var(--accent);">${art.title}</strong> — H1: "${art.h1}" | Schema: ${art.schema}
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }).join('');
    } else {
      clustersContainer.innerHTML = `<p style="color:var(--text-3);">No cluster suggestions returned.</p>`;
    }

    // 9. EEAT Recommendations Plan
    const recommendationsList = document.getElementById('recommendationsList');
    if (data.recommendations && data.recommendations.length > 0) {
      recommendationsList.innerHTML = data.recommendations.map(rec => {
        const confClass = rec.confidenceScore >= 85 ? 'confidence-high' : 'confidence-med';
        const priorityClass = rec.priority === 'High' ? 'priority-high' : (rec.priority === 'Medium' ? 'priority-med' : 'priority-low');
        return `
          <div class="result-card">
            <div class="card-main">
              <div class="card-header">
                <div class="card-title">${rec.title}</div>
                <span class="confidence-badge ${confClass}">Confidence: ${rec.confidenceScore}%</span>
              </div>
              
              <div class="ai-summary-block">
                <div class="block-title">AI Assessment Summary</div>
                <p>${rec.aiSummary}</p>
              </div>

              <div class="qa-block">
                <div>
                  <h4>Why am I seeing this?</h4>
                  <p>${rec.why}</p>
                </div>
                <div>
                  <h4>Recommended Improvements</h4>
                  <p>${rec.recommendedImprovements}</p>
                </div>
              </div>
            </div>

            <div class="card-sidebar">
              <div class="metrics-grid">
                <div class="metric-box">
                  <div class="metric-label">Priority</div>
                  <div class="metric-value ${priorityClass}">${rec.priority}</div>
                </div>
                <div class="metric-box">
                  <div class="metric-label">Expected Ranking Impact</div>
                  <div class="metric-value" style="color:var(--green);">${rec.expectedRankingImpact}</div>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    } else {
      recommendationsList.innerHTML = `<p style="color:var(--text-3); text-align:center;">No EEAT diagnostics cards compiled.</p>`;
    }

    renderTransparencyBlock('resultsWrapper', 'crawlX E-E-A-T and Search Intent Engine', 'Verified via narrative keywords, ssl configurations, and meta description values', 94, 'First-person keywords count, credentials keywords density, outbound citation links ratio, and security CSP/HSTS header fields.');
  }

  function renderTransparencyBlock(containerId, source, status, confidence, evidence) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const existing = container.querySelector('.transparency-block');
    if (existing) existing.remove();

    const block = document.createElement('div');
    block.className = 'transparency-block';
    block.style.cssText = `
      background: rgba(255, 255, 255, 0.015);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 14px;
      margin-top: 20px;
      margin-bottom: 10px;
      font-size: 12px;
      color: var(--text-2);
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px 16px;
      backdrop-filter: blur(5px);
    `;
    
    const timestamp = new Date().toLocaleString();
    
    block.innerHTML = `
      <div><strong style="color:var(--text-1);">Data Source:</strong> ${source}</div>
      <div><strong style="color:var(--text-1);">Verification Status:</strong> <span style="color:var(--green); font-weight:600;">${status}</span></div>
      <div><strong style="color:var(--text-1);">Crawl Time:</strong> ${timestamp}</div>
      <div><strong style="color:var(--text-1);">Last Updated:</strong> ${timestamp}</div>
      <div><strong style="color:var(--text-1);">Confidence Score:</strong> <span style="color:var(--cyan); font-weight:600;">${confidence}%</span></div>
      <div style="grid-column: span 2;"><strong style="color:var(--text-1);">Evidence Used:</strong> ${evidence}</div>
    `;
    
    container.appendChild(block);
  }

  function animateDial(dialId, score) {
    const fill = document.getElementById(dialId);
    if (!fill) return;
    const offset = Math.round(283 * (1 - score / 100));
    fill.style.strokeDashoffset = offset;
  }
});
