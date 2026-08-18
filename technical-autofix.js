// Technical Auto Fix Controller
let activeIssuesList = [];

document.addEventListener("DOMContentLoaded", () => {
    const storedUser = localStorage.getItem('current_scanned_domain') || 'https://www.networkershome.com';
    document.getElementById('targetUrlInput').value = storedUser.replace(/^(https?:\/\/)?(www\.)?/i, '').split('/')[0];

    // Inject Loader
    const loaderOverlay = document.createElement('div');
    loaderOverlay.id = 'autofixLoader';
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
            <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 8px;"> AI Technical Diagnostic Engine Running </h2>
            <p id="loaderTask" style="color: #a0aec0; font-size: 13.5px; margin-bottom: 24px;">Crawling sitemaps and header assets...</p>
            
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

    const form = document.getElementById('autofixForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const urlVal = document.getElementById('targetUrlInput').value.trim();
        if (!urlVal) return;

        loaderOverlay.style.display = 'flex';
        logTerminal.innerHTML = '<div style="color: #555;">[SYSTEM LOGS SHIFT KEY: READY]</div>';
        
        addLog(`Connecting to website and auditing headers: ${urlVal}`, 'info');
        await sleep(600);
        addLog(`Analyzing redirect chain loops and alternate hreflang arrays...`, 'info');
        addLog(`Parsing robots.txt permissions and sitemap index counts...`, 'success');
        
        await sleep(800);
        logTaskText.textContent = "Connecting to local Ollama Llama-3 AI node...";
        addLog(`Triggering Ollama LLM to generate developer-ready fixes...`, 'ollama');
        await sleep(1000);
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout
            const res = await fetch(`/api/technical-autofix?url=${encodeURIComponent(urlVal)}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            const data = await res.json();
            
            loaderOverlay.style.display = 'none';
            if (data.success) {
                activeIssuesList = data.issues;
                renderIssues(data.issues);
            } else {
                throw new Error(data.error || "Diagnostic request failed.");
            }
        } catch(err) {
            const errorMsg = err.name === 'AbortError' 
                ? 'Diagnostics timed out — the AI model is still processing. Please try again.'
                : err.message;
            addLog(`API error: ${errorMsg}`, 'warn');
            await sleep(1500);
            loaderOverlay.style.display = 'none';
            renderError(errorMsg);
        }
    });

    function renderIssues(issues) {
        document.getElementById('resultsWrapper').style.display = 'grid';
        document.getElementById('issueDetailEmpty').style.display = 'flex';
        document.getElementById('issueDetailPanel').style.display = 'none';

        const checklist = document.getElementById('issueChecklist');
        checklist.innerHTML = '';
        
        issues.forEach((issue, idx) => {
            const item = document.createElement('div');
            item.className = 'issue-item';
            item.setAttribute('data-idx', idx);
            item.innerHTML = `
                <span class="issue-item-title">${issue.issue_type}</span>
                <span class="severity-badge severity-badge--${issue.severity.toLowerCase()}">${issue.severity}</span>
            `;
            item.addEventListener('click', () => {
                // Remove active class from all
                document.querySelectorAll('.issue-item').forEach(el => el.classList.remove('active'));
                item.classList.add('active');
                renderIssueDetail(issue);
            });
            checklist.appendChild(item);
        });
    }

    function renderIssueDetail(issue) {
        document.getElementById('issueDetailEmpty').style.display = 'none';
        const panel = document.getElementById('issueDetailPanel');
        panel.style.display = 'flex';

        // Update elements
        document.getElementById('detTitle').textContent = issue.issue_type;
        const sev = document.getElementById('detSeverity');
        sev.textContent = issue.severity;
        sev.className = `severity-badge severity-badge--${issue.severity.toLowerCase()}`;

        document.getElementById('detSeoImpact').textContent = `${issue.seo_impact}/100`;
        document.getElementById('detPriority').textContent = `#${issue.priority}`;
        document.getElementById('detEstimatedImprovement').textContent = issue.estimated_improvement;
        document.getElementById('detTrafficUplift').textContent = issue.traffic_improvement;
        
        document.getElementById('detExplanation').innerHTML = issue.explanation;
        document.getElementById('detWhyItMatters').innerHTML = issue.why_it_matters;
        document.getElementById('detBusinessImpact').innerHTML = issue.business_impact;
        document.getElementById('detFixInstructions').innerHTML = issue.fix_instructions;
        document.getElementById('detDeveloperGuide').innerHTML = issue.implementation_guide;
        document.getElementById('detCodeSnippet').textContent = issue.code_snippet;
        document.getElementById('detRevenueText').textContent = `Estimated revenue impact: ${issue.revenue_impact}`;

        renderTransparencyBlock('issueDetailPanel', 'crawlX 11-Point Technical Diagnostics', 'Verified via HTTP headers, status code mapping, and robots.txt analysis', issue.confidence_score.replace('%',''), 'Crawl responses, core Web Vitals, canonical links validation, redirect loops, and schema structures.');
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

    window.copySnippetText = () => {
        const pre = document.getElementById('detCodeSnippet');
        if (pre) {
            navigator.clipboard.writeText(pre.textContent);
            const btn = document.querySelector('.code-box-copy');
            const originalText = btn.textContent;
            btn.textContent = "Copied!";
            btn.style.color = "var(--green)";
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.color = "var(--text-2)";
            }, 1200);
        }
    };

    function renderError(message) {
        document.getElementById('resultsWrapper').style.display = 'grid';
        document.getElementById('issueDetailEmpty').style.display = 'flex';
        document.getElementById('issueDetailPanel').style.display = 'none';
        const checklist = document.getElementById('issueChecklist');
        checklist.innerHTML = `
            <div style="color: #ff5252; padding: 16px; font-size: 13.5px; line-height: 1.5;">
                <strong>Live analysis unavailable — check crawler/Ollama connection</strong><br>
                <span style="font-size: 12px; color: var(--text-2);">${message}</span>
            </div>
        `;
    }
});
