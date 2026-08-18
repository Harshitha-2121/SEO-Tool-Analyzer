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
  const auditScopeInput = document.getElementById('auditScope');
  const loadingState = document.getElementById('loadingState');
  const resultsSection = document.getElementById('resultsSection');

  const metricsOverviewGrid = document.getElementById('metricsOverviewGrid');
  const depthChartContainer = document.getElementById('depthChartContainer');
  const recommendationsList = document.getElementById('recommendationsList');

  const inventoryTableBody = document.getElementById('inventoryTableBody');
  const brokenTableBody = document.getElementById('brokenTableBody');
  const orphansTableBody = document.getElementById('orphansTableBody');
  const anchorsTableBody = document.getElementById('anchorsTableBody');
  const opportunitiesTableBody = document.getElementById('opportunitiesTableBody');

  const inventorySearch = document.getElementById('inventorySearch');
  const inventoryFilter = document.getElementById('inventoryFilter');
  const btnExportCSV = document.getElementById('btnExportCSV');

  let activeData = null; // Store fetched link data globally
  let activeFilteredLinks = [];

  // Tab switching logic with ARIA + keyboard navigation
  const tabButtons = document.querySelectorAll('.tab-btn');
  function activateTab(button) {
    tabButtons.forEach(btn => {
      btn.classList.remove('active');
      btn.setAttribute('aria-selected', 'false');
    });
    button.classList.add('active');
    button.setAttribute('aria-selected', 'true');

    const targetTabId = button.getAttribute('data-tab');
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(targetTabId).classList.add('active');
  }
  tabButtons.forEach(button => {
    button.addEventListener('click', () => activateTab(button));
  });

  // Keyboard navigation for tabs (Left/Right arrows, Home/End)
  const tabContainer = document.getElementById('gapsTabsContainer');
  if (tabContainer) {
    tabContainer.addEventListener('keydown', (e) => {
      const tabs = Array.from(tabButtons);
      const currentIdx = tabs.indexOf(document.activeElement);
      if (currentIdx === -1) return;

      let newIdx;
      if (e.key === 'ArrowRight') newIdx = (currentIdx + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') newIdx = (currentIdx - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') newIdx = 0;
      else if (e.key === 'End') newIdx = tabs.length - 1;
      else return;

      e.preventDefault();
      tabs[newIdx].focus();
      activateTab(tabs[newIdx]);
    });
  }


  // Wildcard match utility: ? matches 1 char, * matches 0 or more chars
  function wildcardMatch(str, rule) {
    const escapeRegex = (s) => s.replace(/([.+^=!:${}()|\[\]\/\\])/g, "\\$1");
    let rule_regex = rule.split("*").map(escapeRegex).join(".*");
    rule_regex = rule_regex.split("?").join(".");
    return new RegExp("^" + rule_regex + "$", "i").test(str);
  }

  function matchQuery(text, query) {
    if (!query) return true;
    if (!text) return false;
    const txt = text.toLowerCase().trim();
    const q = query.toLowerCase().trim();
    if (q.includes('*') || q.includes('?')) {
      return wildcardMatch(txt, q);
    }
    return txt.includes(q);
  }

  // ══════════════════════════════════════════════════════════════════
  //  DETAILS DRAWER CONTROLLER
  // ══════════════════════════════════════════════════════════════════

  const drawer        = document.getElementById('linkDrawer');
  const drawerBackdrop= document.getElementById('drawerBackdrop');
  const drawerBody    = document.getElementById('drawerBody');
  const drawerClose   = document.getElementById('drawerClose');
  const drawerOpenSrc = document.getElementById('drawerOpenSource');
  const drawerOpenTgt = document.getElementById('drawerOpenTarget');
  const drawerCopyBtn = document.getElementById('drawerCopyBtn');

  let drawerCurrentLink  = null; // the link object currently displayed
  let drawerSelectedRow  = null; // the <tr> that opened the drawer

  /** Safe URL path extractor — never throws */
  function safePathname(url) {
    try { return new URL(url).pathname + new URL(url).search || url; }
    catch { return url; }
  }

  /** Build one field row */
  function drawerField(iconBg, iconSvg, label, valueHtml, extraClass = '') {
    return `
      <div class="drawer-field">
        <div class="drawer-field__icon" style="background:${iconBg};">${iconSvg}</div>
        <div class="drawer-field__body">
          <div class="drawer-field__key">${label}</div>
          <div class="drawer-field__val ${extraClass}">${valueHtml}</div>
        </div>
      </div>`;
  }

  /** Build an indicator chip */
  function drawerInd(cls, label, value) {
    return `
      <div class="drawer-ind ${cls}">
        <span class="drawer-ind__dot"></span>
        <span class="drawer-ind__label">${label}</span>
        <span class="drawer-ind__val">${value}</span>
      </div>`;
  }

  /** Populate the drawer with a link object and open it */
  function openDrawer(link, triggerRow) {
    drawerCurrentLink = link;

    // ── Derive display values ──────────────────────────────────────
    const srcPath  = safePathname(link.source_url);
    const tgtPath  = safePathname(link.target_url);
    const anchor   = link.anchor || '[empty]';
    const status   = parseInt(link.status_code, 10) || 200;
    const isRedir  = status >= 300 && status < 400;

    // ── Status code colour ─────────────────────────────────────────
    let statusCls = 'ent-badge--ok';
    if (link.is_broken)     statusCls = 'ent-badge--err';
    else if (isRedir)       statusCls = 'ent-badge--warn';

    // ── SVG icon snippets ──────────────────────────────────────────
    const SVG = {
      src:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
      tgt:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
      anchor: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg>`,
      type:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
      status: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    };

    // ── Build body HTML ────────────────────────────────────────────
    drawerBody.innerHTML = `

      <!-- URLS section -->
      <div class="drawer-section">
        <div class="drawer-section__label">Link Path</div>

        ${drawerField(
          'rgba(108,92,231,0.12)', SVG.src,
          'Source Page',
          `<a href="${link.source_url}" target="_blank" rel="noopener" title="${link.source_url}">${srcPath}</a>`,
          'drawer-field__val--mono'
        )}

        ${drawerField(
          'rgba(0,229,255,0.1)', SVG.tgt,
          'Destination URL',
          `<a href="${link.target_url}" target="_blank" rel="noopener" title="${link.target_url}">${tgtPath}</a>`,
          'drawer-field__val--mono'
        )}
      </div>

      <!-- Anchor section -->
      <div class="drawer-section">
        <div class="drawer-section__label">Anchor & Classification</div>

        ${drawerField(
          'rgba(255,202,40,0.1)', SVG.anchor,
          'Anchor Text',
          anchor === '[empty]'
            ? `<span class="drawer-field__val--muted">[empty anchor]</span>`
            : `"${anchor}"`
        )}

        ${drawerField(
          'rgba(255,255,255,0.05)', SVG.type,
          'Anchor Type',
          link.anchor_type || '—'
        )}

        ${drawerField(
          'rgba(108,92,231,0.1)', SVG.type,
          'Link Classification',
          `<span class="ent-badge ent-badge--${link.link_type === 'Internal' ? 'int' : link.link_type === 'External' ? 'ext' : 'sub'}">${link.link_type}</span>`
        )}
      </div>

      <!-- Status section -->
      <div class="drawer-section">
        <div class="drawer-section__label">HTTP & Properties</div>

        ${drawerField(
          link.is_broken ? 'rgba(255,82,82,0.1)' : isRedir ? 'rgba(255,145,0,0.1)' : 'rgba(0,230,118,0.1)',
          SVG.status,
          'HTTP Status Code',
          `<span class="ent-badge ${statusCls}">${status}</span>`
        )}
      </div>

      <!-- Indicators grid -->
      <div class="drawer-section">
        <div class="drawer-section__label">Status Indicators</div>
        <div class="drawer-indicators">
          ${drawerInd(
            link.is_broken ? 'ind--red' : 'ind--green',
            'Broken',
            link.is_broken ? 'Yes' : 'No'
          )}
          ${drawerInd(
            isRedir ? 'ind--yellow' : 'ind--green',
            'Redirect',
            isRedir ? `${status}` : 'No'
          )}
          ${drawerInd(
            link.nofollow ? 'ind--orange' : 'ind--green',
            'Follow',
            link.nofollow ? 'NoFollow' : 'Follow'
          )}
          ${drawerInd(
            link.duplicate ? 'ind--orange' : 'ind--green',
            'Duplicate',
            link.duplicate ? 'Yes' : 'No'
          )}
          ${drawerInd(
            link.missing_alt ? 'ind--red' : 'ind--green',
            'Alt Text',
            link.missing_alt ? 'Missing' : 'Present'
          )}
          ${drawerInd(
            link.link_type === 'Internal' ? 'ind--cyan' : link.link_type === 'External' ? 'ind--orange' : 'ind--yellow',
            'Link Type',
            link.link_type
          )}
        </div>
      </div>`;

    // ── Update footer buttons ──────────────────────────────────────
    if (drawerOpenSrc) drawerOpenSrc.href = link.source_url;
    if (drawerOpenTgt) drawerOpenTgt.href = link.target_url;

    // ── Highlight selected row ─────────────────────────────────────
    if (drawerSelectedRow) drawerSelectedRow.classList.remove('row-selected');
    drawerSelectedRow = triggerRow;
    if (drawerSelectedRow) drawerSelectedRow.classList.add('row-selected');

    // ── Open panel ────────────────────────────────────────────────
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    drawerBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Focus the close button for a11y
    setTimeout(() => drawerClose && drawerClose.focus(), 310);
  }

  /** Close the drawer */
  function closeDrawer() {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    drawerBackdrop.classList.remove('open');
    document.body.style.overflow = '';
    if (drawerSelectedRow) {
      drawerSelectedRow.classList.remove('row-selected');
      drawerSelectedRow = null;
    }
    drawerCurrentLink = null;
  }

  // ── Wire close button & backdrop ──────────────────────────────────
  if (drawerClose)    drawerClose.addEventListener('click', closeDrawer);
  if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);

  // ── Escape key closes drawer ───────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) {
      closeDrawer();
    }
  });

  // ── Drawer copy button ─────────────────────────────────────────────
  if (drawerCopyBtn) {
    drawerCopyBtn.addEventListener('click', () => {
      if (!drawerCurrentLink) return;
      const l = drawerCurrentLink;
      const text = [
        l.source_url, l.target_url,
        l.anchor || '—', l.anchor_type,
        l.link_type, l.status_code,
        l.nofollow ? 'nofollow' : 'follow',
        l.is_broken ? 'broken' : 'ok'
      ].join(' | ');
      navigator.clipboard.writeText(text)
        .then(() => showToast('Link copied to clipboard'))
        .catch(() => showToast('Copy failed'));
    });
  }

  // ══════════════════════════════════════════════════════════════════
  //  ENTERPRISE TABLE ENGINE
  // ══════════════════════════════════════════════════════════════════

  const PAGE_SIZE = 25; // rows per page

  // State
  let entSortCol = null;     // e.g. 'source_url'
  let entSortDir = 'asc';   // 'asc' | 'desc'
  let entPage    = 1;

  // Toast helper
  function showToast(msg, duration = 1800) {
    const toast = document.getElementById('entToast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
  }

  // Skeleton: show 5 shimmer rows before first data load
  function showInventorySkeleton() {
    const colWidths = ['30%','25%','18%','10%','7%','7%','3%'];
    const rows = Array.from({length: 5}, () => `
      <tr class="ent-skeleton-row">
        ${colWidths.map(w => `<td><div class="ent-skel" style="width:${w}"></div></td>`).join('')}
      </tr>`).join('');
    inventoryTableBody.innerHTML = rows;
    document.getElementById('inventoryPageInfo').textContent = 'Loading…';
    document.getElementById('inventoryPageControls').innerHTML = '';
  }

  // Empty state
  function showInventoryEmpty(message = 'No links match your filters.') {
    inventoryTableBody.innerHTML = `
      <tr><td colspan="7" style="padding:0; border:none;">
        <div class="ent-empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <p>${message}</p>
        </div>
      </td></tr>`;
    document.getElementById('inventoryPageInfo').textContent = '0 results';
    document.getElementById('inventoryPageControls').innerHTML = '';
  }

  // Link-type badge
  function linkTypeBadge(type) {
    const map = { Internal:'int', External:'ext', Subdomain:'sub' };
    const cls = map[type] || 'neutral';
    return `<span class="ent-badge ent-badge--${cls}">${type}</span>`;
  }

  // Status badge
  function statusBadge(link) {
    if (link.is_broken)
      return `<span class="ent-badge ent-badge--err">${link.status_code}</span>`;
    return `<span class="ent-badge ent-badge--ok">200</span>`;
  }

  // Copy row to clipboard
  function copyRow(link) {
    const text = [
      link.source_url, link.target_url,
      link.anchor || '—', link.anchor_type,
      link.link_type, link.status_code
    ].join(' | ');
    navigator.clipboard.writeText(text)
      .then(() => showToast('Row copied to clipboard'))
      .catch(() => showToast('Copy failed'));
  }

  // Render one page of rows
  function renderInventoryPage(rows) {
    if (rows.length === 0) { showInventoryEmpty(); return; }

    const total   = activeFilteredLinks.length;
    const totalPg = Math.ceil(total / PAGE_SIZE);
    const start   = (entPage - 1) * PAGE_SIZE;
    const pageRows = rows;

    inventoryTableBody.innerHTML = pageRows.map((l, idx) => {
      const srcPath  = (() => { try { return new URL(l.source_url).pathname; } catch { return l.source_url; } })();
      const destPath = (() => { try { return new URL(l.target_url).pathname + new URL(l.target_url).search; } catch { return l.target_url; } })();

      let props = '';
      if (l.nofollow)     props += `<span class="ent-badge ent-badge--warn">NoFollow</span>`;
      if (l.duplicate)    props += `<span class="ent-badge ent-badge--warn">Duplicate</span>`;
      if (l.missing_alt)  props += `<span class="ent-badge ent-badge--err">Missing Alt</span>`;
      if (!props)          props  = `<span style="color:var(--text-3);font-size:11px;">—</span>`;

      const rowIdx = start + idx;
      return `
        <tr class="drawer-row" data-row-idx="${rowIdx}">
          <td data-label="Source">
            <a class="ent-url" href="${l.source_url}" target="_blank" rel="noopener"
               title="${l.source_url}" style="color:var(--text-2);text-decoration:none;">${srcPath}</a>
          </td>
          <td data-label="Destination">
            <a class="ent-url" href="${l.target_url}" target="_blank" rel="noopener"
               title="${l.target_url}" style="text-decoration:none;">${destPath}</a>
          </td>
          <td data-label="Anchor">
            <strong style="font-size:12.5px;">"${l.anchor || '[empty]'}"</strong>
            <div style="font-size:10px;color:var(--text-3);margin-top:2px;">${l.anchor_type}</div>
          </td>
          <td data-label="Classification">${linkTypeBadge(l.link_type)}</td>
          <td data-label="Status">${statusBadge(l)}</td>
          <td data-label="Properties">${props}</td>
          <td>
            <button class="ent-copy-btn" data-row-idx="${rowIdx}" title="Copy row" type="button"
                    aria-label="Copy row data">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              Copy
            </button>
          </td>
        </tr>`;
    }).join('');

    // Render pagination info
    const from = start + 1, to = Math.min(start + PAGE_SIZE, total);
    document.getElementById('inventoryPageInfo').textContent =
      `Showing ${from}–${to} of ${total} link${total !== 1 ? 's' : ''}`;

    // Render page number buttons (max 7 visible)
    const ctrl = document.getElementById('inventoryPageControls');
    let btns = '';
    btns += `<button class="ent-page-btn" data-page="prev" ${entPage === 1 ? 'disabled' : ''}>‹</button>`;
    const WING = 2;
    for (let p = 1; p <= totalPg; p++) {
      if (p === 1 || p === totalPg || (p >= entPage - WING && p <= entPage + WING)) {
        btns += `<button class="ent-page-btn ${p === entPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
      } else if (p === entPage - WING - 1 || p === entPage + WING + 1) {
        btns += `<button class="ent-page-btn" disabled style="border:none;background:none;cursor:default;">…</button>`;
      }
    }
    btns += `<button class="ent-page-btn" data-page="next" ${entPage === totalPg ? 'disabled' : ''}>›</button>`;
    ctrl.innerHTML = btns;
  }

  // Sort + paginate + render
  function updateInventoryTable() {
    if (!activeData || !activeData.all_links) return;

    const searchTerm = (inventorySearch.value || '').trim();

    // 1. Filter by active chip using CHIP_DEFS
    const chipTest = CHIP_DEFS[activeFilter] || CHIP_DEFS.all;
    activeFilteredLinks = activeData.all_links.filter(link => chipTest(link))
      .filter(link => {
        if (!searchTerm) return true;
        return matchQuery(link.source_url, searchTerm) ||
               matchQuery(link.target_url, searchTerm)  ||
               matchQuery(link.anchor, searchTerm)       ||
               matchQuery(link.type, searchTerm);
      });

    // 2. Sort
    if (entSortCol) {
      activeFilteredLinks = [...activeFilteredLinks].sort((a, b) => {
        let va = a[entSortCol] ?? '';
        let vb = b[entSortCol] ?? '';
        if (typeof va === 'string') va = va.toLowerCase();
        if (typeof vb === 'string') vb = vb.toLowerCase();
        const cmp = va < vb ? -1 : va > vb ? 1 : 0;
        return entSortDir === 'asc' ? cmp : -cmp;
      });
    }

    // 3. Clamp page
    const totalPg = Math.max(1, Math.ceil(activeFilteredLinks.length / PAGE_SIZE));
    if (entPage > totalPg) entPage = totalPg;

    // 4. Slice current page
    const start  = (entPage - 1) * PAGE_SIZE;
    const pageRows = activeFilteredLinks.slice(start, start + PAGE_SIZE);

    // 5. Render
    if (activeFilteredLinks.length === 0) {
      showInventoryEmpty('No links match your search or filters.');
    } else {
      renderInventoryPage(pageRows);
    }
  }

  // ── Sort column click handler ─────────────────────────────────────
  const inventoryTable = document.getElementById('inventoryTable');
  if (inventoryTable) {
    inventoryTable.querySelector('thead').addEventListener('click', (e) => {
      const th = e.target.closest('th.sortable');
      if (!th) return;
      const col = th.dataset.col;
      if (entSortCol === col) {
        entSortDir = entSortDir === 'asc' ? 'desc' : 'asc';
      } else {
        entSortCol = col;
        entSortDir = 'asc';
      }
      // Update header classes
      inventoryTable.querySelectorAll('th').forEach(h => {
        h.classList.remove('sort-asc','sort-desc');
        const si = h.querySelector('.sort-icon');
        if (si) si.textContent = '⇅';
      });
      th.classList.add(entSortDir === 'asc' ? 'sort-asc' : 'sort-desc');
      const si = th.querySelector('.sort-icon');
      if (si) si.textContent = entSortDir === 'asc' ? '↑' : '↓';
      entPage = 1;
      updateInventoryTable();
    });

    // ── Copy button + Row click delegation ────────────────────────────
    inventoryTableBody.addEventListener('click', (e) => {
      // If click is on a copy button, handle copy
      const copyBtn = e.target.closest('.ent-copy-btn');
      if (copyBtn) {
        e.stopPropagation();
        const idx = parseInt(copyBtn.dataset.rowIdx, 10);
        if (!isNaN(idx) && activeFilteredLinks[idx]) {
          copyRow(activeFilteredLinks[idx]);
        }
        return;
      }

      // If click is on a link (<a>), let it navigate normally
      if (e.target.closest('a')) return;

      // Otherwise, open the drawer for this row
      const row = e.target.closest('tr.drawer-row');
      if (!row) return;
      const rowIdx = parseInt(row.dataset.rowIdx, 10);
      if (!isNaN(rowIdx) && activeFilteredLinks[rowIdx]) {
        openDrawer(activeFilteredLinks[rowIdx], row);
      }
    });
  }

  // ── Pagination delegation ─────────────────────────────────────────
  const inventoryPagination = document.getElementById('inventoryPagination');
  if (inventoryPagination) {
    inventoryPagination.addEventListener('click', (e) => {
      const btn = e.target.closest('.ent-page-btn');
      if (!btn || btn.disabled) return;
      const p = btn.dataset.page;
      const total = Math.ceil(activeFilteredLinks.length / PAGE_SIZE);
      if (p === 'prev') entPage = Math.max(1, entPage - 1);
      else if (p === 'next') entPage = Math.min(total, entPage + 1);
      else entPage = parseInt(p, 10);
      updateInventoryTable();
      // Scroll table back to top on page change
      const scroll = document.querySelector('.ent-table-scroll');
      if (scroll) scroll.scrollTop = 0;
    });
  }

  // ══════════════════════════════════════════════════════════════════
  //  FILTER CHIP ENGINE
  // ══════════════════════════════════════════════════════════════════

  // Active filter state (chip key string)
  let activeFilter = 'all';

  /**
   * CHIP_DEFS — maps each filter key to a test function.
   * All tests use ONLY real backend fields:
   *   link_type, is_broken, status_code, nofollow,
   *   duplicate, anchor_type, anchor, missing_alt
   */
  const CHIP_DEFS = {
    all:       () => true,
    internal:  (l) => l.link_type === 'Internal' || l.link_type === 'Subdomain',
    external:  (l) => l.link_type === 'External',
    broken:    (l) => l.is_broken === true,
    redirect:  (l) => {
      const c = parseInt(l.status_code, 10);
      return c >= 300 && c < 400;
    },
    nofollow:  (l) => l.nofollow === true,
    duplicate: (l) => l.duplicate === true,
    images:    (l) => {
      const t = (l.anchor_type || '').toLowerCase();
      return t === 'image link' || t === 'mixed link';
    },
    empty:     (l) => {
      const t = (l.anchor_type || '').toLowerCase();
      const a = (l.anchor || '').trim();
      return t === 'empty link' || a === '';
    },
  };

  /**
   * Compute counts for each chip against the FULL unfiltered dataset
   * and write them into the count badge elements.
   */
  function computeChipCounts(allLinks) {
    Object.keys(CHIP_DEFS).forEach(key => {
      const el = document.getElementById('chip-count-' + key);
      if (!el) return;
      const count = key === 'all' ? allLinks.length : allLinks.filter(CHIP_DEFS[key]).length;
      el.textContent = count;
    });
  }

  /**
   * Set the active chip visually and update activeFilter state.
   */
  function setActiveChip(filterKey) {
    activeFilter = filterKey;
    const chips = document.querySelectorAll('.ent-chip');
    chips.forEach(chip => {
      const isActive = chip.dataset.filter === filterKey;
      chip.classList.toggle('active', isActive);
      chip.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  // ── Chip click delegation ──────────────────────────────────────────
  const filterChipsRow = document.getElementById('filterChipsRow');
  if (filterChipsRow) {
    filterChipsRow.addEventListener('click', (e) => {
      const chip = e.target.closest('.ent-chip');
      if (!chip) return;
      const key = chip.dataset.filter;
      if (!key || key === activeFilter) return; // already active
      setActiveChip(key);
      entPage = 1;
      updateInventoryTable();
    });

    // Keyboard support (Space / Enter already handled by <button>)
  }

  // ── Search / filter listeners ─────────────────────────────────────
  if (inventorySearch) {
    inventorySearch.addEventListener('input', () => { entPage = 1; updateInventoryTable(); });
  }
  // Keep old select listener as no-op (element is hidden)
  if (inventoryFilter) {
    inventoryFilter.addEventListener('change', () => { entPage = 1; updateInventoryTable(); });
  }


  // ── CSV Export (uses current filtered+sorted data) ────────────────
  if (btnExportCSV) {
    btnExportCSV.addEventListener('click', () => {
      if (!activeFilteredLinks || activeFilteredLinks.length === 0) {
        showToast('No data to export'); return;
      }
      const header = ['Source Page','Destination Page','Anchor Text','Anchor Type',
                       'Link Type','Nofollow','Duplicate','Missing Alt','Status Code','Is Broken'];
      const rows = activeFilteredLinks.map(l => [
        `"${(l.source_url||'').replace(/"/g,'""')}"`,
        `"${(l.target_url||'').replace(/"/g,'""')}"`,
        `"${(l.anchor||'').replace(/"/g,'""')}"`,
        `"${l.anchor_type||''}"`,
        `"${l.link_type||''}"`,
        `"${l.nofollow  ? 'Yes':'No'}"`,
        `"${l.duplicate ? 'Yes':'No'}"`,
        `"${l.missing_alt ? 'Yes':'No'}"`,
        `"${l.status_code||''}"`,
        `"${l.is_broken ? 'Yes':'No'}"`,
      ].join(','));
      const csv  = [header.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `crawlX_links_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Exported ${activeFilteredLinks.length} rows`);
    });
  }



  // 1. Advanced Options Accordion Toggle
  const btnAdvancedToggle = document.getElementById('btnAdvancedToggle');
  const advancedOptionsArea = document.getElementById('advancedOptionsArea');
  if (btnAdvancedToggle && advancedOptionsArea) {
    btnAdvancedToggle.addEventListener('click', () => {
      const isExpanded = btnAdvancedToggle.getAttribute('aria-expanded') === 'true';
      btnAdvancedToggle.setAttribute('aria-expanded', !isExpanded);
      btnAdvancedToggle.classList.toggle('expanded');
      advancedOptionsArea.classList.toggle('show');
    });
  }

  // 2. Clickable Example URL Pill Badges
  const exampleTags = document.querySelectorAll('.example-link-tag');
  exampleTags.forEach(tag => {
    // Click listener
    tag.addEventListener('click', () => {
      targetUrlInput.value = tag.getAttribute('data-url');
      targetUrlInput.focus();
    });
    // Keyboard listener for accessibility
    tag.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        targetUrlInput.value = tag.getAttribute('data-url');
        targetUrlInput.focus();
      }
    });
  });

  // 3. Reset Button Implementation
  const btnReset = document.getElementById('btnReset');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      // Clear inputs
      targetUrlInput.value = '';
      auditScopeInput.value = 'site';
      
      // Hide results wrapper
      loadingState.style.display = 'none';
      resultsSection.style.display = 'none';
      
      // Reset active data
      activeData = null;
      activeFilteredLinks = [];
      
      // Clear search inputs and filters
      if (inventorySearch) inventorySearch.value = '';
      if (inventoryFilter) inventoryFilter.value = 'all';
      // Reset chip state to 'All'
      setActiveChip('all');
      // Zero out all chip counts
      document.querySelectorAll('.ent-chip__count').forEach(el => { el.textContent = '0'; });


      // Reset DOM Tables
      inventoryTableBody.innerHTML = '';
      brokenTableBody.innerHTML = '';
      orphansTableBody.innerHTML = '';
      anchorsTableBody.innerHTML = '';
      opportunitiesTableBody.innerHTML = '';
      metricsOverviewGrid.innerHTML = '';
      depthChartContainer.innerHTML = '';
      recommendationsList.innerHTML = '';
      
      const existingTrans = resultsSection.querySelector('.transparency-block');
      if (existingTrans) existingTrans.remove();
    });
  }
  // ── Loading step progression helper ──────────────────────────────
  function setLoadingStep(stepId) {
    const steps = document.querySelectorAll('.loading-step');
    let found = false;
    steps.forEach(s => {
      if (s.id === stepId) {
        s.classList.remove('done');
        s.classList.add('active');
        s.querySelector('.loading-step__icon').textContent = '○';
        found = true;
      } else if (!found) {
        s.classList.remove('active');
        s.classList.add('done');
        s.querySelector('.loading-step__icon').textContent = '✓';
      } else {
        s.classList.remove('active', 'done');
        s.querySelector('.loading-step__icon').textContent = '○';
      }
    });
  }
  function resetLoadingSteps() {
    document.querySelectorAll('.loading-step').forEach(s => {
      s.classList.remove('active', 'done');
      s.querySelector('.loading-step__icon').textContent = '○';
    });
    const first = document.getElementById('step-crawl');
    if (first) first.classList.add('active');
  }

  // ── KPI skeleton cards ──────────────────────────────────────────
  function showKpiSkeletons() {
    const widths = [
      ['40%', '70%', '30%'],
      ['35%', '60%', '45%'],
      ['50%', '65%', '25%'],
      ['38%', '55%', '35%'],
      ['42%', '72%', '28%'],
      ['45%', '58%', '40%'],
      ['36%', '68%', '32%'],
    ];
    metricsOverviewGrid.innerHTML = widths.map(w => `
      <div class="kpi-skel">
        <div class="kpi-skel__bar" style="width:${w[0]}; height:10px; margin-bottom:18px;"></div>
        <div class="kpi-skel__bar" style="width:${w[1]}; height:28px; margin-bottom:12px;"></div>
        <div class="kpi-skel__bar" style="width:${w[2]}; height:10px;"></div>
      </div>`).join('');
  }

  // Optimize button click
  btnAnalyze.addEventListener('click', async () => {
    const target = targetUrlInput.value.trim();
    const scope = auditScopeInput.value;
    if (!target) {
      alert('Please enter a website URL.');
      return;
    }

    loadingState.style.display = 'block';
    resultsSection.style.display = 'none';
    // Show skeletons immediately
    showInventorySkeleton();
    showKpiSkeletons();
    resetLoadingSteps();

    // Simulate step progression during crawl
    const stepTimer1 = setTimeout(() => setLoadingStep('step-parse'), 3000);
    const stepTimer2 = setTimeout(() => setLoadingStep('step-analyze'), 7000);
    const stepTimer3 = setTimeout(() => setLoadingStep('step-ai'), 12000);

    try {
      const response = await fetch('/api/internal-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl: target, scope: scope })
      });

      if (!response.ok) {
        throw new Error('API returned error ' + response.status);
      }

      const data = await response.json();
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      loadingState.style.display = 'none';

      if (data.success) {
        activeData = data;
        renderResults(data);
        resultsSection.style.display = 'block';
      } else {
        alert('Optimization audit failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      loadingState.style.display = 'none';
      alert('Failed to run Internal Link Optimizer. Make sure the backend is active on port 8080.');
    }
  });


  function renderResults(data) {
    // ── KPI card builder helpers ────────────────────────────────────────────

    /**
     * Counts from 0 to `target` over `duration` ms and writes into `el.textContent`.
     * Works for both integers and floats (respects `decimals`).
     */
    function animateCounter(el, target, duration = 700, decimals = 0) {
      if (target === 0) { el.textContent = (0).toFixed(decimals); return; }
      const start = performance.now();
      function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        // ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = eased * target;
        el.textContent = decimals > 0 ? current.toFixed(decimals) : Math.round(current);
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    /** Build one KPI card DOM element. */
    function buildKpiCard({ label, icon, value, valueColored, subValue, subLabel, sub, badge, accentColor, glowColor, iconBg, iconBorder }) {
      const card = document.createElement('div');
      card.className = 'kpi-card';
      card.style.setProperty('--kpi-accent',      accentColor  || 'var(--accent)');
      card.style.setProperty('--kpi-glow',        glowColor    || 'rgba(108,92,231,0.06)');
      card.style.setProperty('--kpi-icon-bg',     iconBg       || 'rgba(108,92,231,0.12)');
      card.style.setProperty('--kpi-icon-border', iconBorder   || 'rgba(108,92,231,0.2)');

      // Header row: label + icon
      card.innerHTML = `
        <div class="kpi-card__header">
          <span class="kpi-card__label">${label}</span>
          <span class="kpi-card__icon" aria-hidden="true">${icon}</span>
        </div>`;

      // Value area
      if (subValue !== undefined) {
        // Split display: main value + secondary value (e.g. 12  /  3%)
        const splitEl = document.createElement('div');
        splitEl.className = 'kpi-split';
        const mainEl = document.createElement('span');
        mainEl.className = 'kpi-split__main' + (valueColored ? ' kpi-card__value--colored' : '');
        mainEl.textContent = '0';
        const secEl = document.createElement('span');
        secEl.className = 'kpi-split__secondary';
        secEl.textContent = subValue;
        splitEl.appendChild(mainEl);
        splitEl.appendChild(secEl);
        card.appendChild(splitEl);
        // animate the main value
        animateCounter(mainEl, value);
      } else {
        const valEl = document.createElement('div');
        valEl.className = 'kpi-card__value' + (valueColored ? ' kpi-card__value--colored' : '');
        valEl.textContent = '0';
        card.appendChild(valEl);
        animateCounter(valEl, value);
      }

      // Sub-label
      if (subLabel) {
        const slEl = document.createElement('div');
        slEl.className = 'kpi-card__sub';
        slEl.style.marginTop = '4px';
        slEl.innerHTML = subLabel;
        card.appendChild(slEl);
      }

      // Description
      if (sub) {
        const subEl = document.createElement('div');
        subEl.className = 'kpi-card__sub';
        subEl.textContent = sub;
        card.appendChild(subEl);
      }

      // Status badge
      if (badge) {
        const badgeEl = document.createElement('div');
        badgeEl.className = `kpi-card__badge kpi-badge--${badge.type}`;
        badgeEl.innerHTML = badge.icon ? `${badge.icon} ${badge.text}` : badge.text;
        card.appendChild(badgeEl);
      }

      return card;
    }

    // ── Icon SVG templates ────────────────────────────────────────────────
    const ICON = {
      pages:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
      links:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
      broken: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`,
      dupes:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
      nofollow:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`,
      alt:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
      orphan: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    };

    // ── Build cards from real backend data only ───────────────────────────
    const totalPages      = data.total_pages            ?? 0;
    const totalLinks      = data.total_links            ?? 0;
    const brokenCount     = data.broken_links_count     ?? 0;
    const duplicateCount  = data.duplicate_links_count  ?? 0;
    const nofollowCount   = data.nofollow_links_count   ?? 0;
    const missingAltCount = data.missing_alt_links_count ?? 0;
    const orphanCount     = data.orphans_count           ?? 0;

    const duplicatePct = totalLinks > 0 ? ((duplicateCount / totalLinks) * 100).toFixed(1) : '0.0';

    const cards = [
      {
        label: 'Pages Crawled',
        icon: ICON.pages,
        value: totalPages,
        sub: 'Unique pages evaluated in link graph',
        badge: { type: 'neutral', text: 'Scope: ' + (data.scope || 'site') },
        accentColor: 'var(--accent)',
        glowColor: 'rgba(108,92,231,0.07)',
        iconBg: 'rgba(108,92,231,0.12)',
        iconBorder: 'rgba(108,92,231,0.22)',
      },
      {
        label: 'Total Links',
        icon: ICON.links,
        value: totalLinks,
        sub: 'Internal + external + subdomain links',
        badge: { type: 'neutral', text: 'Full link graph' },
        accentColor: 'var(--cyan)',
        glowColor: 'rgba(0,229,255,0.06)',
        iconBg: 'rgba(0,229,255,0.1)',
        iconBorder: 'rgba(0,229,255,0.2)',
      },
      {
        label: 'Broken Links',
        icon: ICON.broken,
        value: brokenCount,
        sub: brokenCount === 0 ? 'No broken links detected' : 'Links returning 4xx / 5xx',
        badge: brokenCount === 0
          ? { type: 'good', text: '✓ Healthy' }
          : { type: 'bad',  text: brokenCount + ' to fix' },
        accentColor: brokenCount > 0 ? 'var(--red)' : 'var(--green)',
        glowColor:   brokenCount > 0 ? 'rgba(255,82,82,0.06)' : 'rgba(0,230,118,0.05)',
        iconBg:      brokenCount > 0 ? 'rgba(255,82,82,0.1)'  : 'rgba(0,230,118,0.1)',
        iconBorder:  brokenCount > 0 ? 'rgba(255,82,82,0.2)'  : 'rgba(0,230,118,0.2)',
      },
      {
        label: 'Duplicate Links',
        icon: ICON.dupes,
        value: duplicateCount,
        subValue: duplicatePct + '%',
        sub: 'Multiple outbound paths to same URL',
        badge: duplicateCount === 0
          ? { type: 'good', text: '✓ No duplicates' }
          : duplicateCount < 5
            ? { type: 'warn', text: 'Low volume' }
            : { type: 'bad', text: 'High volume' },
        accentColor: duplicateCount > 0 ? 'var(--orange)' : 'var(--green)',
        glowColor:   duplicateCount > 0 ? 'rgba(255,145,0,0.06)' : 'rgba(0,230,118,0.05)',
        iconBg:      duplicateCount > 0 ? 'rgba(255,145,0,0.1)'  : 'rgba(0,230,118,0.1)',
        iconBorder:  duplicateCount > 0 ? 'rgba(255,145,0,0.2)'  : 'rgba(0,230,118,0.2)',
      },
      {
        label: 'Nofollow Links',
        icon: ICON.nofollow,
        value: nofollowCount,
        sub: 'Links with rel="nofollow" attribute',
        badge: nofollowCount === 0
          ? { type: 'good', text: '✓ None found' }
          : { type: 'warn', text: nofollowCount + ' suppressed' },
        accentColor: nofollowCount > 0 ? 'var(--orange)' : 'var(--green)',
        glowColor:   nofollowCount > 0 ? 'rgba(255,145,0,0.06)' : 'rgba(0,230,118,0.05)',
        iconBg:      nofollowCount > 0 ? 'rgba(255,145,0,0.1)'  : 'rgba(0,230,118,0.1)',
        iconBorder:  nofollowCount > 0 ? 'rgba(255,145,0,0.2)'  : 'rgba(0,230,118,0.2)',
      },
      {
        label: 'Missing Alt Tags',
        icon: ICON.alt,
        value: missingAltCount,
        sub: 'Image links without alt attribute',
        badge: missingAltCount === 0
          ? { type: 'good', text: '✓ All alts present' }
          : { type: 'bad',  text: 'A11y issue' },
        accentColor: missingAltCount > 0 ? 'var(--red)' : 'var(--green)',
        glowColor:   missingAltCount > 0 ? 'rgba(255,82,82,0.06)' : 'rgba(0,230,118,0.05)',
        iconBg:      missingAltCount > 0 ? 'rgba(255,82,82,0.1)'  : 'rgba(0,230,118,0.1)',
        iconBorder:  missingAltCount > 0 ? 'rgba(255,82,82,0.2)'  : 'rgba(0,230,118,0.2)',
      },
      {
        label: 'Orphan Pages',
        icon: ICON.orphan,
        value: orphanCount,
        sub: 'Pages with zero inbound internal links',
        badge: orphanCount === 0
          ? { type: 'good', text: '✓ No orphans' }
          : { type: 'warn', text: orphanCount + ' isolated' },
        accentColor: orphanCount > 0 ? 'var(--orange)' : 'var(--green)',
        glowColor:   orphanCount > 0 ? 'rgba(255,145,0,0.06)' : 'rgba(0,230,118,0.05)',
        iconBg:      orphanCount > 0 ? 'rgba(255,145,0,0.1)'  : 'rgba(0,230,118,0.1)',
        iconBorder:  orphanCount > 0 ? 'rgba(255,145,0,0.2)'  : 'rgba(0,230,118,0.2)',
      },
    ];

    // 1. Render KPI Cards
    metricsOverviewGrid.innerHTML = '';
    cards.forEach(def => metricsOverviewGrid.appendChild(buildKpiCard(def)));



    // 2. Render SVG Crawl Depth Bar Chart
    const dist = data.depth_distribution || {};
    const maxVal = Math.max(...Object.values(dist), 1);
    
    // Depth labels
    const depths = [0, 1, 2, 3, 4];
    const depthsNames = ["Depth 0 (Root)", "Depth 1", "Depth 2", "Depth 3", "Depth 4+"];
    
    let chartBarsHtml = '';
    depths.forEach((depth, idx) => {
      const count = dist[depth] || 0;
      const barPercent = Math.round((count / maxVal) * 100);
      chartBarsHtml += `
        <div style="display:flex; align-items:center; gap:16px; margin-bottom:12px;">
          <span style="width:110px; font-size:12px; color:var(--text-2); text-align:right;">${depthsNames[idx]}</span>
          <div style="flex:1; background:rgba(255,255,255,0.02); height:16px; border-radius:4px; overflow:hidden; border:1px solid var(--border);">
            <div style="background:linear-gradient(90deg, #6c5ce7, #00e5ff); width:${barPercent}%; height:100%; border-radius:3px; transition: width 0.5s ease-out;"></div>
          </div>
          <span style="width:30px; font-size:12px; font-weight:600; color:#fff;">${count}</span>
        </div>
      `;
    });

    depthChartContainer.innerHTML = `
      <div class="chart-header">
        <span>Click Depth Distribution Analysis</span>
        <span style="font-size:12px; color:var(--text-3); font-weight:normal;">Minimum click distance from target landing URL</span>
      </div>
      <div style="max-width:600px; margin: 0 auto; padding: 10px 0;">
        ${chartBarsHtml}
      </div>
    `;

    // 3. Populate Link Inventory Table
    // Update chip counts from full dataset, reset to 'all', then render
    computeChipCounts(data.all_links || []);
    setActiveChip('all');
    entPage = 1;
    updateInventoryTable();


    // 4. Populate Other Tables

    function buildTabEmptyState(colspan, icon, title, sub) {
      return `<tr><td colspan="${colspan}"><div class="tab-empty">
        ${icon}
        <div class="tab-empty__title">${title}</div>
        <div class="tab-empty__sub">${sub}</div>
      </div></td></tr>`;
    }

    const EMPTY_SVG = {
      broken: `<svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3m-6 0H6a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3"/><line x1="8" y1="12" x2="11" y2="12"/></svg>`,
      orphan: `<svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>`,
      anchor: `<svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>`,
      opps:   `<svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`
    };

    // Broken Links Table
    if (data.broken_links && data.broken_links.length > 0) {
      brokenTableBody.innerHTML = data.broken_links.map(link => {
        const srcPath = safePathname(link.source_url);
        const destPath = safePathname(link.target_url);
        return `
          <tr>
            <td style="font-family:monospace; color:var(--text-2);"><a href="${link.source_url}" target="_blank" style="color:inherit; text-decoration:none;">${srcPath}</a></td>
            <td style="font-family:monospace; color:var(--red); font-weight:600;">${destPath}</td>
            <td style="font-style:italic;">"${link.anchor}"</td>
            <td><span class="gap-badge" style="background:var(--red-bg); color:var(--red); border:1px solid var(--red-border); font-weight:600;">${link.status_code} Error</span></td>
            <td>—</td>
          </tr>
        `;
      }).join('');
    } else {
      brokenTableBody.innerHTML = buildTabEmptyState(5, EMPTY_SVG.broken, "No Broken Links", "Your internal linking structure is perfectly healthy with no 4xx or 5xx HTTP errors detected.");
    }

    // Orphans & Weak Pages
    const orphansList = (data.orphans || []).map(url => {
      return { url, path: safePathname(url), incoming: 0, equity: 0.0, type: 'Orphan Page' };
    });
    const weakList = (data.weak_pages || []).map(wp => {
      return { url: wp.url, path: safePathname(wp.url), incoming: wp.incoming_count, equity: wp.equity, type: 'Weak Equity Page' };
    });
    const combinedPages = [...orphansList, ...weakList];

    if (combinedPages.length > 0) {
      orphansTableBody.innerHTML = combinedPages.map(page => {
        const typeBadge = page.type === 'Orphan Page' 
          ? `<span class="gap-badge" style="background:var(--orange-bg); border:1px solid var(--orange-border); color:var(--orange);">Orphan</span>`
          : `<span class="gap-badge" style="background:rgba(255, 202, 40, 0.1); border:1px solid rgba(255, 202, 40, 0.2); color:var(--yellow);">Weak Page</span>`;
        return `
          <tr>
            <td style="font-family:monospace; color:var(--cyan);"><a href="${page.url}" target="_blank" style="color:inherit; text-decoration:none;">${page.path}</a></td>
            <td style="font-weight:600; text-align:center;">${page.incoming}</td>
            <td style="font-weight:600;">${page.equity} / 1.0</td>
            <td>${typeBadge}</td>
          </tr>
        `;
      }).join('');
    } else {
      orphansTableBody.innerHTML = buildTabEmptyState(4, EMPTY_SVG.orphan, "No Orphan Pages", "All pages discovered are successfully linked from within the site architecture.");
    }

    // Anchor Text Issues
    if (data.poor_anchors && data.poor_anchors.length > 0) {
      anchorsTableBody.innerHTML = data.poor_anchors.map(issue => {
        const srcPath = safePathname(issue.source_url);
        const destPath = safePathname(issue.url);
        const badgeColor = issue.severity === 'Critical' ? 'var(--red)' : 'var(--orange)';
        const badgeBg = issue.severity === 'Critical' ? 'var(--red-bg)' : 'var(--orange-bg)';
        const badgeBorder = issue.severity === 'Critical' ? 'var(--red-border)' : 'var(--orange-border)';
        return `
          <tr>
            <td style="font-family:monospace; color:var(--text-2);"><a href="${issue.source_url}" target="_blank" style="color:inherit; text-decoration:none;">${srcPath}</a></td>
            <td style="font-family:monospace; color:var(--text-2);">${destPath}</td>
            <td style="font-weight:600; color: var(--accent);">"${issue.anchor}"</td>
            <td><span class="gap-badge" style="background:${badgeBg}; border:1px solid ${badgeBorder}; color:${badgeColor}; font-weight:600;">${issue.severity}</span></td>
          </tr>
        `;
      }).join('');
    } else {
      anchorsTableBody.innerHTML = buildTabEmptyState(4, EMPTY_SVG.anchor, "No Anchor Issues", "All anchor texts analyzed appear descriptive and contextual.");
    }

    // Contextual Link Opportunities
    if (data.opportunities && data.opportunities.length > 0) {
      opportunitiesTableBody.innerHTML = data.opportunities.map(opp => {
        const srcPath = safePathname(opp.source_url);
        const destPath = safePathname(opp.target_url);
        return `
          <tr>
            <td style="font-family:monospace; color:var(--cyan);"><a href="${opp.source_url}" target="_blank" style="color:inherit; text-decoration:none;">${srcPath}</a></td>
            <td style="font-family:monospace; color:var(--green);"><a href="${opp.target_url}" target="_blank" style="color:inherit; text-decoration:none;">${destPath}</a></td>
            <td style="font-weight:700; color:var(--yellow);">${opp.keyword}</td>
            <td style="font-size:12px; color:var(--text-2); max-width:250px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${opp.context}">${opp.context}</td>
          </tr>
        `;
      }).join('');
    } else {
      opportunitiesTableBody.innerHTML = buildTabEmptyState(4, EMPTY_SVG.opps, "No Missing Links", "The AI did not find any obvious missing contextual link opportunities in the scanned text.");
    }

    // 5. Render Actionable Gaps Recommendation Cards
    if (data.recommendations && data.recommendations.length > 0) {
      recommendationsList.innerHTML = data.recommendations.map(rec => {
        const confClass = rec.confidenceScore >= 85 ? 'confidence-high' : 'confidence-med';
        const priorityClass = rec.priority === 'High' ? 'priority-high' : (rec.priority === 'Medium' ? 'priority-med' : 'priority-low');

        return `
          <div class="result-card">
            <div class="card-main">
              <div class="card-header">
                <div class="card-title">
                  <span>${rec.title}</span>
                </div>
                <span class="confidence-badge ${confClass}">Confidence: ${rec.confidenceScore}%</span>
              </div>
              
              <div class="ai-summary-block">
                <div class="block-title">AI Recommendation Summary</div>
                <p>${rec.aiSummary}</p>
              </div>

              <div class="qa-block">
                <div>
                  <h4>Why am I seeing this?</h4>
                  <p>${rec.why}</p>
                </div>
                <div>
                  <h4>Step-by-step Fix</h4>
                  <p>${rec.howToFix}</p>
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
                  <div class="metric-label">Expected SEO Improvement</div>
                  <div class="metric-value" style="color:var(--green);">${rec.seoImpact}</div>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    } else {
      recommendationsList.innerHTML = `<p style="color:var(--text-3); text-align:center; padding:32px 0;">No recommendations generated.</p>`;
    }

    renderTransparencyBlock('resultsSection', 'crawlX Ollagraph Link Graph Engine', 'Verified via recursive anchor and response path scanning', 98, 'Internal link references, duplicate rates, click depths, and authority allocations (PageRank metrics) mapped across crawled assets.');
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
