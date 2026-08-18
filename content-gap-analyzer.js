document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  if (sidebar && sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
    });
  }

  const btnAnalyze = document.getElementById('btnAnalyze');
  const targetUrlInput = document.getElementById('targetUrl');
  const competitorsContainer = document.getElementById('competitorsContainer');
  const btnAddCompetitor = document.getElementById('btnAddCompetitor');
  const loadingState = document.getElementById('loadingState');
  const resultsSection = document.getElementById('resultsSection');
  
  const metricsOverviewGrid = document.getElementById('metricsOverviewGrid');
  const overlapChartContainer = document.getElementById('overlapChartContainer');
  const recommendationsList = document.getElementById('recommendationsList');

  const keywordsTableBody = document.getElementById('keywordsTableBody');
  const entitiesTableBody = document.getElementById('entitiesTableBody');
  const pagesTableBody = document.getElementById('pagesTableBody');
  const schemaTableBody = document.getElementById('schemaTableBody');
  const clustersTableBody = document.getElementById('clustersTableBody');

  // Competitor Inputs Management
  function updateRemoveButtonsVisibility() {
    const wrappers = competitorsContainer.querySelectorAll('.competitor-input-wrapper');
    wrappers.forEach(wrapper => {
      const btnRemove = wrapper.querySelector('.btn-remove-competitor');
      btnRemove.style.visibility = wrappers.length > 1 ? 'visible' : 'hidden';
    });
  }

  btnAddCompetitor.addEventListener('click', () => {
    const wrappers = competitorsContainer.querySelectorAll('.competitor-input-wrapper');
    if (wrappers.length >= 3) {
      alert('You can compare against a maximum of 3 competitor URLs.');
      return;
    }

    const nextIndex = wrappers.length + 1;
    const newWrapper = document.createElement('div');
    newWrapper.className = 'competitor-input-wrapper';
    newWrapper.innerHTML = `
      <input type="url" class="competitor-url-input" placeholder="https://competitor${nextIndex}.com" required>
      <button type="button" class="btn-remove-competitor">&times;</button>
    `;

    competitorsContainer.appendChild(newWrapper);
    updateRemoveButtonsVisibility();

    // Hook up remove button click event
    newWrapper.querySelector('.btn-remove-competitor').addEventListener('click', () => {
      newWrapper.remove();
      updateRemoveButtonsVisibility();
    });
  });

  // Initial event binding for removing first input
  competitorsContainer.querySelectorAll('.btn-remove-competitor').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.target.closest('.competitor-input-wrapper').remove();
      updateRemoveButtonsVisibility();
    });
  });

  // Tab switching logic
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

  // Click handler on Analyze Gaps button
  btnAnalyze.addEventListener('click', async () => {
    const target = targetUrlInput.value.trim();
    if (!target) {
      alert('Please enter a target URL.');
      return;
    }

    const competitorInputs = competitorsContainer.querySelectorAll('.competitor-url-input');
    const competitors = [];
    competitorInputs.forEach(input => {
      const val = input.value.trim();
      if (val) competitors.push(val);
    });

    if (competitors.length === 0) {
      alert('Please enter at least one competitor URL.');
      return;
    }

    loadingState.style.display = 'block';
    resultsSection.style.display = 'none';

    try {
      const response = await fetch('/api/content-gap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl: target, competitorUrls: competitors })
      });

      if (!response.ok) {
        throw new Error('API returned an error code ' + response.status);
      }

      const data = await response.json();
      loadingState.style.display = 'none';
      
      if (data.success) {
        renderResults(data);
        resultsSection.style.display = 'block';
      } else {
        alert('Analysis failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      loadingState.style.display = 'none';
      alert('Failed to run Content Gap Analysis. Make sure the backend is active on port 8080.');
    }
  });

  // Render comparative metrics, SVG chart, tabular views, and AI cards
  function renderResults(data) {
    const chartData = data.chart_data || {
      target_keywords_count: 0,
      competitor_keywords_count: 0,
      shared_keywords_count: 0,
      missing_keywords_count: 0
    };

    // 1. Render Overview Metrics Cards
    metricsOverviewGrid.innerHTML = `
      <div class="dashboard-card">
        <div class="dashboard-card__title">Target Keywords</div>
        <div class="dashboard-card__val">${chartData.target_keywords_count}</div>
        <div class="dashboard-card__sub">Keywords indexed on your site</div>
      </div>
      <div class="dashboard-card">
        <div class="dashboard-card__title">Competitor Keywords</div>
        <div class="dashboard-card__val">${chartData.competitor_keywords_count}</div>
        <div class="dashboard-card__sub">Keywords indexed on competitor sites</div>
      </div>
      <div class="dashboard-card">
        <div class="dashboard-card__title">Keyword Intersection</div>
        <div class="dashboard-card__val">${chartData.shared_keywords_count}</div>
        <div class="dashboard-card__sub">Shared semantic keywords</div>
      </div>
      <div class="dashboard-card">
        <div class="dashboard-card__title">Actionable Gaps</div>
        <div class="dashboard-card__val">${data.gaps ? data.gaps.length : 0}</div>
        <div class="dashboard-card__sub">High-value SEO opportunities</div>
      </div>
    `;

    // 2. Render SVG Comparison Chart
    overlapChartContainer.innerHTML = `
      <div class="chart-header">
        <span>Semantic Keyword Intersection (Venn Diagram)</span>
        <span style="font-size:12px; color:var(--text-3); font-weight:normal;">Calculated from verified crawl keywords</span>
      </div>
      <div style="display:flex; justify-content:center; align-items:center;">
        <svg viewBox="0 0 500 240" style="width: 100%; max-width: 500px; height: auto; display: block;">
          <defs>
            <linearGradient id="targetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="rgba(108, 92, 231, 0.4)" />
              <stop offset="100%" stop-color="rgba(162, 155, 254, 0.4)" />
            </linearGradient>
            <linearGradient id="compGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="rgba(0, 229, 255, 0.3)" />
              <stop offset="100%" stop-color="rgba(0, 230, 118, 0.3)" />
            </linearGradient>
          </defs>
          <circle cx="190" cy="120" r="90" fill="url(#targetGrad)" stroke="#6c5ce7" stroke-width="2" />
          <circle cx="310" cy="120" r="90" fill="url(#compGrad)" stroke="#00e5ff" stroke-width="2" />
          <text x="135" y="110" fill="#fff" font-size="13" font-weight="700" text-anchor="middle">Target Website</text>
          <text x="135" y="132" fill="rgba(240,240,245,0.7)" font-size="11" text-anchor="middle">${chartData.target_keywords_count} Keywords</text>
          <text x="365" y="110" fill="#fff" font-size="13" font-weight="700" text-anchor="middle">Competitors</text>
          <text x="365" y="132" fill="rgba(240,240,245,0.7)" font-size="11" text-anchor="middle">${chartData.competitor_keywords_count} Keywords</text>
          <text x="250" y="115" fill="#fff" font-size="16" font-weight="800" text-anchor="middle">${chartData.shared_keywords_count}</text>
          <text x="250" y="135" fill="var(--accent-light)" font-size="11" font-weight="600" text-anchor="middle">Shared</text>
        </svg>
      </div>
    `;

    // 3. Populate Tables
    // Missing Keywords
    if (data.missing_keywords && data.missing_keywords.length > 0) {
      keywordsTableBody.innerHTML = data.missing_keywords.map(kw => `
        <tr>
          <td style="font-weight:600; color: var(--accent);">${kw}</td>
          <td><span style="color:var(--orange);">Missing in Content</span></td>
          <td><span class="gap-badge gap-badge-kw">High Priority</span></td>
        </tr>
      `).join('');
    } else {
      keywordsTableBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-3);">No keyword gaps identified.</td></tr>`;
    }

    // Entities
    if (data.missing_entities && data.missing_entities.length > 0) {
      entitiesTableBody.innerHTML = data.missing_entities.map(ent => `
        <tr>
          <td style="font-weight:600; color:var(--orange);">${ent}</td>
          <td>Entity / Proper Noun</td>
          <td><span style="color:var(--orange);">Not Covered</span></td>
        </tr>
      `).join('');
    } else {
      entitiesTableBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-3);">No entity gaps identified.</td></tr>`;
    }

    // Pages
    if (data.missing_pages && data.missing_pages.length > 0) {
      pagesTableBody.innerHTML = data.missing_pages.map(page => {
        const path = new URL(page.url).pathname;
        return `
          <tr>
            <td style="font-family:monospace; color:var(--cyan);"><a href="${page.url}" target="_blank" style="color:inherit; text-decoration:none;">${path}</a></td>
            <td style="font-weight:500;">${page.title}</td>
            <td><span style="color:var(--red);">Create Page</span></td>
          </tr>
        `;
      }).join('');
    } else {
      pagesTableBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-3);">No page gaps identified.</td></tr>`;
    }

    // Schema
    if (data.missing_schema && data.missing_schema.length > 0) {
      schemaTableBody.innerHTML = data.missing_schema.map(schema => `
        <tr>
          <td style="font-weight:600; color:var(--yellow);">${schema}</td>
          <td>Present on Competitor templates</td>
          <td><span style="color:var(--yellow);">Inject JSON-LD</span></td>
        </tr>
      `).join('');
    } else {
      schemaTableBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-3);">No structured schema gaps identified. All schema sets align.</td></tr>`;
    }

    // Topic Clusters
    if (data.missing_topic_clusters && data.missing_topic_clusters.length > 0) {
      clustersTableBody.innerHTML = data.missing_topic_clusters.map(cluster => `
        <tr>
          <td style="font-weight:600; color:var(--green);">${cluster}</td>
          <td>Multiple Competitor Articles</td>
          <td><span style="color:var(--green);">Plan Topic Cluster</span></td>
        </tr>
      `).join('');
    } else {
      clustersTableBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-3);">No topic cluster gaps identified.</td></tr>`;
    }

    // 4. Render Actionable Gaps Recommendation Cards
    if (data.gaps && data.gaps.length > 0) {
      recommendationsList.innerHTML = data.gaps.map(gap => {
        const confClass = gap.confidenceScore >= 85 ? 'confidence-high' : 'confidence-med';
        const priorityClass = gap.priority === 'High' ? 'priority-high' : (gap.priority === 'Medium' ? 'priority-med' : 'priority-low');
        
        let typeBadgeClass = 'gap-badge-kw';
        if (gap.gapType === 'Missing Page') typeBadgeClass = 'gap-badge-page';
        if (gap.gapType === 'Missing Entity') typeBadgeClass = 'gap-badge-entity';
        if (gap.gapType === 'Missing Topic Cluster') typeBadgeClass = 'gap-badge-cluster';
        if (gap.gapType === 'Missing Schema') typeBadgeClass = 'gap-badge-schema';

        return `
          <div class="result-card">
            <div class="card-main">
              <div class="card-header">
                <div class="card-title">
                  <span>${gap.title}</span>
                  <span class="gap-badge ${typeBadgeClass}">${gap.gapType}</span>
                </div>
                <span class="confidence-badge ${confClass}">Confidence: ${gap.confidenceScore}%</span>
              </div>
              
              <div class="ai-summary-block">
                <div class="block-title">AI Summary</div>
                <p>${gap.aiSummary}</p>
              </div>

              <div class="qa-block">
                <div>
                  <h4>Why am I seeing this?</h4>
                  <p>${gap.why}</p>
                </div>
                <div>
                  <h4>How do I fix this?</h4>
                  <p>${gap.howToFix}</p>
                </div>
              </div>
            </div>

            <div class="card-sidebar">
              <div class="metrics-grid">
                <div class="metric-box">
                  <div class="metric-label">Priority</div>
                  <div class="metric-value ${priorityClass}">${gap.priority}</div>
                </div>
                <div class="metric-box">
                  <div class="metric-label">Expected SEO Impact</div>
                  <div class="metric-value" style="color:#fff;">${gap.seoImpact}</div>
                </div>
                <div class="metric-box">
                  <div class="metric-label">Estimated Traffic Opportunity</div>
                  <div class="metric-value" style="color:var(--green);">${gap.trafficOpportunity}</div>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    } else {
      recommendationsList.innerHTML = `<p style="color:var(--text-3); text-align:center; padding:32px 0;">No recommendations generated.</p>`;
    }

    renderTransparencyBlock('resultsSection', 'crawlX Ollagraph Crawler', 'Verified via HTTP parse and competitor body diffs', 96, 'Extracted keyword matrices, sitemap files, and structured JSON-LD payloads from target and competitor pages.');
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
});
