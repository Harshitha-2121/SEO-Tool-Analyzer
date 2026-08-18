import glob
import re

css_to_inject = """
    /* Animated Glowing Search Bar */
    .animated-glowing-search-wrapper {
      position: relative;
      border-radius: var(--radius-md);
      padding: 1.5px;
      background: var(--bg-card);
      overflow: hidden;
      z-index: 1;
      display: flex;
      align-items: center;
      transition: all 0.3s ease;
      width: 100%;
    }

    .animated-glowing-search-wrapper::before {
      content: '';
      position: absolute;
      top: -100%; left: -100%;
      width: 300%; height: 300%;
      background: conic-gradient(from 0deg, transparent 0%, transparent 40%, var(--accent) 50%, var(--accent) 60%, transparent 100%);
      animation: searchGlowSpin 4s linear infinite;
      z-index: -2;
      opacity: 0.15;
      transition: opacity 0.3s ease;
    }

    .animated-glowing-search-wrapper:focus-within::before {
      opacity: 1;
      animation: searchGlowSpin 2s linear infinite;
    }

    .animated-glowing-search-wrapper::after {
      content: '';
      position: absolute;
      inset: 1.5px;
      background: var(--bg-card);
      border-radius: calc(var(--radius-md) - 1.5px);
      z-index: -1;
    }

    @keyframes searchGlowSpin {
      100% { transform: rotate(360deg); }
    }

    .animated-glowing-search-input {
      width: 100%;
      padding: 14px 20px;
      background: transparent;
      border: none;
      color: var(--text-1);
      font-size: 14px;
      outline: none;
      z-index: 2;
    }
    .animated-glowing-search-input::placeholder {
      color: var(--text-3);
    }
"""

files = glob.glob('*.html')

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    original = content
    
    # 1. Inject CSS if not there
    if "animated-glowing-search-wrapper" not in content:
        content = content.replace("</style>", css_to_inject + "\n  </style>", 1)
    
    # 2. Fix audit-search-bar in dashboard (removes the svg icon as well!)
    dashboard_search_regex = r'<div class="audit-search-bar__input-wrapper">.*?<svg.*?</svg>.*?<input(.*?)class="audit-search-input".*?>.*?</div>'
    def dash_repl(match):
        input_attrs = match.group(1)
        return f'<div class="animated-glowing-search-wrapper"><input {input_attrs} class="animated-glowing-search-input"></div>'
    
    content = re.sub(dashboard_search_regex, dash_repl, content, flags=re.DOTALL)
    
    # 3. Fix selector-inputs across tools
    # They look like: <input type="text" class="selector-input" id="targetUrlInput" placeholder="Enter URL (e.g. site.com)" required>
    selector_regex = r'<input([^>]*?)class="selector-input"([^>]*?)>'
    def selector_repl(match):
        attrs1 = match.group(1)
        attrs2 = match.group(2)
        return f'<div class="animated-glowing-search-wrapper"><input {attrs1} class="animated-glowing-search-input" {attrs2}></div>'
    
    content = re.sub(selector_regex, selector_repl, content)

    # 4. Fix topbar__search if it exists anywhere in HTML
    topbar_search_regex = r'<div class="topbar__search">.*?<svg.*?</svg>.*?<input([^>]*?)class="topbar__search-input"([^>]*?)>.*?</div>'
    def topbar_repl(match):
        attrs1 = match.group(1)
        attrs2 = match.group(2)
        return f'<div class="animated-glowing-search-wrapper" style="flex:1; max-width:420px;"><input {attrs1} class="animated-glowing-search-input" {attrs2}></div>'
    
    content = re.sub(topbar_search_regex, topbar_repl, content, flags=re.DOTALL)

    if content != original:
        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)
        print(f"Updated {f}")

print("Done")
