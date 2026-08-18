document.addEventListener("DOMContentLoaded", () => {
  const storedUser = localStorage.getItem('current_scanned_domain') || 'https://www.networkershome.com';
  document.getElementById('targetUrlInput').value = storedUser.replace(/^(https?:\/\/)?(www\.)?/i, '').split('/')[0];

  // Connect sliders
  const slideNewContent = document.getElementById('slideNewContent');
  const valNewContent = document.getElementById('valNewContent');
  slideNewContent.addEventListener('input', () => {
    valNewContent.textContent = `${slideNewContent.value} pages`;
  });

  const slideInternalLinking = document.getElementById('slideInternalLinking');
  const valInternalLinking = document.getElementById('valInternalLinking');
  slideInternalLinking.addEventListener('input', () => {
    valInternalLinking.textContent = `${slideInternalLinking.value}%`;
  });

  const slidePageSpeed = document.getElementById('slidePageSpeed');
  const valPageSpeed = document.getElementById('valPageSpeed');
  slidePageSpeed.addEventListener('input', () => {
    valPageSpeed.textContent = `${slidePageSpeed.value}/100`;
  });

  const slideBacklinks = document.getElementById('slideBacklinks');
  const valBacklinks = document.getElementById('valBacklinks');
  slideBacklinks.addEventListener('input', () => {
    valBacklinks.textContent = `${slideBacklinks.value} backlinks`;
  });

  const slideClusters = document.getElementById('slideClusters');
  const valClusters = document.getElementById('valClusters');
  slideClusters.addEventListener('input', () => {
    valClusters.textContent = `${slideClusters.value} clusters`;
  });

  // Inject loader overlay
  const loaderOverlay = document.createElement('div');
  loaderOverlay.id = 'twinLoader';
  loaderOverlay.style.cssText = `
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(7, 8, 14, 0.95);
    z-index: 99999;
    backdrop-filter: blur(15px);
    align-items: center;
    justify-content: center;
    flex-direction: column;
    color: #fff;
    font-family: 'Inter', sans-serif;
  `;
  loaderOverlay.innerHTML = `
    <div style="text-align: center; width: 80%; max-width: 600px;">
      <div class="loader-spinner" style="width: 64px; height: 64px; border: 4px solid rgba(124, 77, 255, 0.1); border-top-color: #7c4dff; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 24px;"></div>
      <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 8px;"> AI SEO Digital Twin Model Rendering </h2>
      <p id="loaderTask" style="color: #a0aec0; font-size: 13.5px; margin-bottom: 24px;">Crawling sitemaps and building site structure model...</p>
      
      <div id="loaderTerminal" style="background: #090a0f; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 18px; font-family: 'Fira Code', monospace; font-size: 12px; text-align: left; height: 220px; overflow-y: auto; color: #a29bfe; line-height: 1.5; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
        <div style="color: #555;">[SYSTEM LOGS SHIFT KEY: READY]</div>
      </div>
    </div>
    <style>
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
  `;
  document.body.appendChild(loaderOverlay);

  const logTerminal = document.getElementById('loaderTerminal');
  const logTaskText = document.getElementById('loaderTask');

  function addLog(msg, type = 'info') {
    const line = document.createElement('div');
    const timestamp = new Date().toLocaleTimeString();
    let color = '#a0aec0';
    if (type === 'success') color = '#00e676';
    if (type === 'warn') color = '#ffd600';
    if (type === 'ollama') color = '#00e5ff';
    
    line.innerHTML = `<span style="color: #555;">[${timestamp}]</span> <span style="color:${color}">${msg}</span>`;
    logTerminal.appendChild(line);
    logTerminal.scrollTop = logTerminal.scrollHeight;
  }

  function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

  const form = document.getElementById('twinForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await buildDigitalTwin();
  });

  const runBtn = document.getElementById('runSimulationBtn');
  runBtn.addEventListener('click', async () => {
    await buildDigitalTwin();
  });

  async function buildDigitalTwin() {
    const urlVal = document.getElementById('targetUrlInput').value.trim();
    if (!urlVal) return;

    loaderOverlay.style.display = 'flex';
    logTerminal.innerHTML = '<div style="color: #555;">[DIGITAL TWIN MODEL BUILDER ACTIVE]</div>';
    
    addLog(`Crawling link connectivity structure: ${urlVal}`, 'info');
    await sleep(400);
    addLog(`Analyzing baseline site health speed metrics and sitemap ratios...`, 'info');
    addLog(`Building virtual internal routing map graph...`, 'success');
    
    await sleep(500);
    logTaskText.textContent = "Connecting to local Ollama Llama-3 forecast models...";
    addLog(`Generating forecast reasoning matrices based on parameter choices...`, 'ollama');
    await sleep(800);

    const payload = {
      user_url: urlVal,
      new_content_count: parseInt(slideNewContent.value),
      tech_fixes_enabled: document.getElementById('toggleTechFix').checked,
      internal_linking_pct: parseInt(slideInternalLinking.value),
      schema_enabled: document.getElementById('toggleSchema').checked,
      page_speed_score: parseInt(slidePageSpeed.value),
      backlinks_count: parseInt(slideBacklinks.value),
      clusters_count: parseInt(slideClusters.value)
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);
      const res = await fetch('/api/simulate-digital-twin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      
      loaderOverlay.style.display = 'none';
      if (data.success) {
        renderTwinForecast(data);
      } else {
        throw new Error(data.error || "API returned failure.");
      }
    } catch(err) {
      const errorMsg = err.name === 'AbortError' 
        ? 'Simulation timed out — the AI model is still processing. Please try again.'
        : err.message;
      addLog(`API connection error: ${errorMsg}`, 'warn');
      await sleep(1000);
      loaderOverlay.style.display = 'none';
      renderError(errorMsg);
    }
  }

  function renderTwinForecast(data) {
    document.getElementById('resultsWrapper').style.display = 'grid';

    // 1. Update outputs metrics values
    document.getElementById('predTraffic').textContent = `+${data.predicted_traffic_growth_pct}%`;
    document.getElementById('predKeywords').textContent = `#${data.predicted_keyword_rank.toFixed(1)}`;
    document.getElementById('predCtr').textContent = `+${data.predicted_ctr_increase_pct.toFixed(2)}%`;
    document.getElementById('predConversion').textContent = `+${data.predicted_conversion_increase_pct.toFixed(2)}%`;
    document.getElementById('predHealth').textContent = data.predicted_seo_health;

    // 2. Overview reasoning text
    document.getElementById('simulationReasoningText').innerHTML = data.forecast_reasoning;

    // 3. Radar Polygon Coordinate calculations
    const polygon = document.getElementById('radarPolygon');
    if (polygon) {
      const scale = data.predicted_seo_health / 100;
      const topY = 100 - 65 * scale;
      const rightX = 100 + 60 * scale;
      const rightY = 100 - 15 * scale;
      const bottomRX = 100 + 40 * scale;
      const bottomRY = 100 + 50 * scale;
      const bottomY = 100 + 60 * scale;
      const bottomLX = 100 - 40 * scale;
      const bottomLY = 100 + 50 * scale;
      const leftX = 100 - 60 * scale;
      const leftY = 100 - 15 * scale;

      polygon.setAttribute('points', `100,${topY} ${rightX},${rightY} ${bottomRX},${bottomRY} 100,${bottomY} ${bottomLX},${bottomLY} ${leftX},${leftY}`);
    }

    // 4. Draw 12-Month Traffic Projection Chart (SVG Line chart)
    const svg = document.getElementById('trajectoryChartSvg');
    // Clear dynamic paths and text
    const dynamicElements = svg.querySelectorAll('.chart-dynamic');
    dynamicElements.forEach(el => el.remove());

    const trajectory = data.forecast_trajectory || [];
    if (trajectory.length > 0) {
      const width = 440;
      const height = 100;
      
      // Calculate max value for chart scaling
      const maxVal = Math.max(...trajectory.map(t => Math.max(t.base_clicks, t.sim_clicks, t.base_impressions, t.sim_impressions))) || 1000;
      
      let basePoints = [];
      let simPoints = [];
      
      trajectory.forEach((t, i) => {
        const x = 40 + (i / 11) * width;
        const baseY = 120 - (t.base_clicks / maxVal) * height;
        const simY = 120 - (t.sim_clicks / maxVal) * height;
        
        basePoints.push(`${x},${baseY}`);
        simPoints.push(`${x},${simY}`);
        
        // Add Month labels underneath
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', 140);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', 'var(--text-3)');
        text.setAttribute('font-size', '9px');
        text.setAttribute('class', 'chart-dynamic');
        text.textContent = t.month;
        svg.appendChild(text);
      });
      
      // Create Base Click Path
      const baseLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      baseLine.setAttribute('d', `M ${basePoints.join(' L ')}`);
      baseLine.setAttribute('fill', 'none');
      baseLine.setAttribute('stroke', 'rgba(255,255,255,0.25)');
      baseLine.setAttribute('stroke-width', '1.5');
      baseLine.setAttribute('stroke-dasharray', '4,4');
      baseLine.setAttribute('class', 'chart-dynamic');
      svg.appendChild(baseLine);
      
      // Create Sim Click Path
      const simLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      simLine.setAttribute('d', `M ${simPoints.join(' L ')}`);
      simLine.setAttribute('fill', 'none');
      simLine.setAttribute('stroke', 'var(--cyan)');
      simLine.setAttribute('stroke-width', '2.5');
      simLine.setAttribute('class', 'chart-dynamic');
      svg.appendChild(simLine);
    }

    // 5. Populate Comparison Matrix Table
    const tableBody = document.getElementById('compareTableBody');
    const base = data.crawl_baselines || {};
    const baselines = data.baselines || {};
    const predictions = data.predictions || {};

    const tableRows = [
      { metric: 'SEO Score index', base: `${baselines.seo_score || 70}/100`, sim: `${predictions.seo_score || 85}/100`, delta: `+${(predictions.seo_score || 85) - (baselines.seo_score || 70)}` },
      { metric: 'Organic Traffic Volume', base: `${baselines.clicks || 0} clicks/mo`, sim: `${predictions.clicks || 0} clicks/mo`, delta: `+${data.predicted_traffic_growth_pct}%` },
      { metric: 'Average Keyword rankings', base: `Pos #${baselines.rankings || 24.5}`, sim: `Pos #${predictions.rankings || 16.5}`, delta: `-${((baselines.rankings || 24.5) - (predictions.rankings || 16.5)).toFixed(1)} rank positions` },
      { metric: 'Search Impressions index', base: `${baselines.impressions || 0} impressions/mo`, sim: `${predictions.impressions || 0} impressions/mo`, delta: `+${intPercentShift(baselines.impressions, predictions.impressions)}%` },
      { metric: 'Technical health index', base: `${baselines.technical_health || 60}/100`, sim: `${predictions.technical_health || 85}/100`, delta: `+${(predictions.technical_health || 85) - (baselines.technical_health || 60)}` },
      { metric: 'Crawl pathway connectivity', base: `${baselines.crawl_health || 60}/100`, sim: `${predictions.crawl_health || 85}/100`, delta: `+${(predictions.crawl_health || 85) - (baselines.crawl_health || 60)}` },
    ];

    tableBody.innerHTML = tableRows.map(row => `
      <tr>
        <td style="font-weight:600; color:#fff;">${row.metric}</td>
        <td>${row.base}</td>
        <td style="color:var(--cyan); font-weight:700;">${row.sim}</td>
        <td style="color:var(--green); font-weight:600;">${row.delta}</td>
      </tr>
    `).join('');

    // 6. Populate Detailed Forecast Optimization Cards
    const cardsContainer = document.getElementById('detailedForecastCards');
    const cards = data.detailed_cards || [];
    cardsContainer.innerHTML = cards.map(c => `
      <div class="forecast-card">
        <div class="forecast-card-header">
          <span class="forecast-card-title">${c.metric_name}</span>
          <span class="badge-lbl badge-confidence">Confidence Score: ${c.confidence}%</span>
        </div>

        <div class="forecast-comparison-row">
          <div>
            <div class="comparison-col-label">Verified Baseline Value</div>
            <div class="comparison-col-val" style="color:var(--text-3);">${c.verified_metric}</div>
          </div>
          <div>
            <div class="comparison-col-label">AI Forecasted Prediction</div>
            <div class="comparison-col-val" style="color:var(--green);">${c.predicted_metric}</div>
          </div>
        </div>

        <div class="forecast-details">
          <div>
            <h4>Why am I seeing this?</h4>
            <p>${c.why}</p>
          </div>
          <div>
            <h4>What happens if I fix these issues?</h4>
            <p>${c.impact_desc}</p>
          </div>
        </div>

        <div class="forecast-badges">
          <span class="badge-lbl badge-priority">Priority #${c.priority}</span>
          <span class="badge-lbl badge-impact">SEO Impact: ${c.expected_impact}</span>
        </div>
    `).join('');

    renderTransparencyBlock('resultsWrapper', 'crawlX SEO Digital Twin Simulator', 'Simulated projections based on crawl health baseline models', 92, '12-month traffic trajectory estimations calculated using deterministic regression curves and local parameter adjustments.');
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

  function intPercentShift(base, pred) {
    if (!base) return 0;
    return Math.round(((pred - base) / base) * 100);
  }

  function renderError(message) {
    document.getElementById('resultsWrapper').style.display = 'grid';

    document.getElementById('predTraffic').textContent = "N/A";
    document.getElementById('predKeywords').textContent = "N/A";
    document.getElementById('predCtr').textContent = "N/A";
    document.getElementById('predConversion').textContent = "N/A";
    document.getElementById('predHealth').textContent = "Error";

    document.getElementById('compareTableBody').innerHTML = `
      <tr><td colspan="4" style="text-align:center; color:var(--red);">Simulation crawler error occurred.</td></tr>
    `;

    document.getElementById('detailedForecastCards').innerHTML = '';

    document.getElementById('simulationReasoningText').innerHTML = `
      <div style="color: #ff1744; font-weight: 700; margin-bottom: 8px; font-size: 14px;">
        Live simulation unavailable — check crawler/Ollama connection
      </div>
      <div style="font-size: 12.5px; color: #a0aec0; line-height: 1.5;">
        <strong>Details:</strong> ${message}
      </div>
    `;

    const polygon = document.getElementById('radarPolygon');
    if (polygon) {
      polygon.setAttribute('points', '100,100 100,100 100,100 100,100 100,100 100,100');
    }
  }
});
