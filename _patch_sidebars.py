#!/usr/bin/env python3
"""
Patch all platform HTML files:
  1. Sidebar starts collapsed by default
  2. Remove the toggle button (hidden via CSS)
  3. Add hover auto-expand / auto-collapse (mouseenter/mouseleave)
  4. Margin-left for .main is always 68px (no shift)
  5. Replace all emojis with professional symbols
"""
import re, os, glob

HTML_FILES = [f for f in glob.glob('/home/ubuntu/seo-audit-platform/*.html')
              if os.path.basename(f) not in ('login.html', 'index.html')]

# ── CSS patches ────────────────────────────────────────────────────────────────
OLD_SIDEBAR_TOGGLE_CSS = """.sidebar__toggle {
      position: absolute; top: 20px; right: -14px; width: 28px; height: 28px;
      background: var(--bg-2); border: 1px solid var(--border); border-radius: 50%;
      display: flex; align-items: center; justify-content: center; cursor: pointer;
      color: var(--text-3); transition: all 0.2s; z-index: 10;
    }
    .sidebar__toggle:hover { color: var(--text-1); border-color: var(--accent); background: var(--accent-glow); }
    .sidebar.collapsed .sidebar__toggle { transform: rotate(180deg); }"""

NEW_SIDEBAR_TOGGLE_CSS = ".sidebar__toggle { display: none; }"

OLD_HOVER_RULES = """    .sidebar.collapsed:hover {
      width: var(--sidebar-w);
      box-shadow: 10px 0 30px rgba(0, 0, 0, 0.5);
      background: rgba(8,9,18,0.98);
    }
    .sidebar.collapsed:hover .brand-name {
      opacity: 1;
      width: auto;
    }
    .sidebar.collapsed:hover .sidebar__label {
      opacity: 1;
    }
    .sidebar.collapsed:hover .sidebar__item-text {
      opacity: 1;
      width: auto;
    }
    .sidebar.collapsed:hover .sidebar__toggle {
      transform: rotate(0deg);
    }"""

NEW_HOVER_RULES = """    .sidebar.collapsed:hover {
      width: var(--sidebar-w);
      box-shadow: 10px 0 30px rgba(0,0,0,0.5);
      background: rgba(8,9,18,0.98);
    }
    .sidebar.collapsed:hover .brand-name { opacity: 1; width: auto; }
    .sidebar.collapsed:hover .sidebar__label { opacity: 1; }
    .sidebar.collapsed:hover .sidebar__item-text { opacity: 1; width: auto; }"""

# collapsed suffix for .sidebar.collapsed { ... }
COLLAPSED_RULE = '.sidebar.collapsed { width: 68px; }'

HOVER_INJECT = '''.sidebar.collapsed { width: 68px; }
    .sidebar.collapsed:hover {
      width: var(--sidebar-w);
      box-shadow: 10px 0 30px rgba(0,0,0,0.5);
      background: rgba(8,9,18,0.98);
    }
    .sidebar.collapsed:hover .brand-name { opacity: 1; width: auto; }
    .sidebar.collapsed:hover .sidebar__label { opacity: 1; }
    .sidebar.collapsed:hover .sidebar__item-text { opacity: 1; width: auto; }'''

# .main margin-left
OLD_MAIN_CSS_VARIANTS = [
    '.main { margin-left: var(--sidebar-w); flex: 1; padding: 28px 32px; transition: margin-left 0.28s var(--ease); min-height: 100vh; }',
    '.main { margin-left: var(--sidebar-w); flex: 1; padding: 28px 32px; min-height: 100vh; }',
    '.main { margin-left:var(--sidebar-w); flex:1; padding:28px 32px; min-height:100vh; }',
]
NEW_MAIN_CSS = '.main { margin-left: 68px; flex: 1; padding: 28px 32px; min-height: 100vh; }'

OLD_COLLAPSED_MAIN = '.sidebar.collapsed ~ .main { margin-left: 68px; }'

# ── HTML patches ───────────────────────────────────────────────────────────────
OLD_ASIDE = '<aside class="sidebar" id="sidebar">'
NEW_ASIDE = '<aside class="sidebar collapsed" id="sidebar">'

# ── JS patches ─────────────────────────────────────────────────────────────────
OLD_SIDEBAR_JS_VARIANTS = [
    "document.getElementById('sidebarToggle').addEventListener('click', () => sidebar.classList.toggle('collapsed'));",
    "document.getElementById('sidebarToggle').addEventListener('click', () =>  sidebar.classList.toggle('collapsed'));",
]
NEW_SIDEBAR_JS = """// Auto-close system: expand on hover, collapse when cursor leaves
    sidebar.addEventListener('mouseenter', () => { sidebar.classList.remove('collapsed'); });
    sidebar.addEventListener('mouseleave', () => { sidebar.classList.add('collapsed'); });"""

# ── Emoji map (emoji → professional unicode symbol or SVG-text) ────────────────
EMOJI_MAP = {
    # Status / progress
    '⏳': '○',
    '⚡': '⟳',
    '✅': '✓',
    '❌': '✗',
    '⚠️': '!',
    '⚠': '!',
    '✨': '★',
    '⏱': '',    # replaced inline with clock SVG in competitor-engine; here just strip
    '📌': '#',
    '🔴': '●',
    '🟢': '●',
    '🔵': '●',
    '🔍': '',
    '🛡️': '■',
    '🛡': '■',
    '⚙️': '◈',
    '⚙': '◈',
    '📊': '▦',
    '📈': '↗',
    '📉': '↘',
    '💡': '→',
    '🎯': '◎',
    '🚀': '↑',
    '💰': '$',
    '📋': '≡',
    '🔗': '⊹',
    '🌐': '⊙',
    '📝': '✎',
    '🏆': '◆',
    '⚡️': '⟳',
    '🔄': '⟳',
    '✔️': '✓',
    '▸': '›',
    '🤖': '□',
    '💼': '▣',
    '📦': '▫',
    '🔒': '■',
    '🔓': '□',
    '💬': '▷',
    '❓': '?',
    '❗': '!',
    '🌟': '★',
    '⭐': '★',
    '🎉': '✓',
    '🔥': '↑',
    '📱': '▤',
    '🖥️': '▤',
    '🖥': '▤',
    '⬆️': '↑',
    '⬇️': '↓',
    '→': '→',
    '←': '←',
}

def patch_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # 1. Sidebar starts collapsed
    content = content.replace(OLD_ASIDE, NEW_ASIDE)

    # 2. Add hover rules after .sidebar.collapsed { width: 68px; } if not already present
    if '.sidebar.collapsed:hover' not in content:
        content = content.replace(COLLAPSED_RULE, HOVER_INJECT)

    # 3. Replace toggle button CSS with hidden
    content = content.replace(OLD_SIDEBAR_TOGGLE_CSS, NEW_SIDEBAR_TOGGLE_CSS)
    # Also clean up existing hover rules added previously (idempotent)
    content = content.replace(OLD_HOVER_RULES, '')

    # 4. Fix .main margin-left
    for variant in OLD_MAIN_CSS_VARIANTS:
        content = content.replace(variant, NEW_MAIN_CSS)
    content = content.replace(OLD_COLLAPSED_MAIN, '')

    # 5. Replace JS toggle listener with hover auto-close
    for variant in OLD_SIDEBAR_JS_VARIANTS:
        content = content.replace(variant, NEW_SIDEBAR_JS)

    # 6. Replace emojis
    for emoji, symbol in EMOJI_MAP.items():
        content = content.replace(emoji, symbol)

    if content != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'  [patched] {os.path.basename(path)}')
    else:
        print(f'  [no change] {os.path.basename(path)}')

print('Patching sidebar & emojis across all HTML pages...')
for html_file in sorted(HTML_FILES):
    patch_file(html_file)
print('Done.')
