#!/usr/bin/env python3
"""
Integrate the global sidebar.js component into every page.

What this does for each *.html file (except login.html and auth-callback.html):
  1. Removes old duplicated sidebar markup (<!-- Sidebar Component --> + <aside>).
  2. Removes old sidebar CSS blocks and rules.
  3. Removes old sidebar JS toggle blocks.
  4. Ensures <script src="sidebar.js" defer></script> is present before </body>.
  5. Ensures the body uses <main class="main"> or <div class="main">.
  6. Removes the obsolete sidebar CSS variables that conflict with the shared ones.

Run from the project root:
  python3 _integrate_global_sidebar.py
"""
import glob, os, re, html

SKIP = {'login.html', 'auth-callback.html', 'index.html'}

# Patterns that identify old sidebar CSS in the <style> block.
OLD_SIDEBAR_CSS_PATTERNS = [
    # Comment block header
    r'/\*\s*═══════════════════════════════════════\s*\n\s*LAYOUT:\s*SIDEBAR\s*\n\s*═══════════════════════════════════════\s*\*/',
    # Empty/broken collapsed rules
    r'\.sidebar\.collapsed\s*\n\s*',
    # Any rule starting with .sidebar.
    r'\.sidebar[^}]*\{[^}]*\}',
    # Brand/logo CSS that was sidebar-specific
    r'\.brand-logo\s*\{[^}]*\}',
    r'\.brand-name\s*\{[^}]*\}',
    r'\.brand-name\s+span\s*\{[^}]*\}',
    # Sidebar toggle button CSS
    r'\.sidebar__toggle\s*\{[^}]*\}',
    r'\.sidebar__toggle:\w+\s*\{[^}]*\}',
    # Sidebar labels/items
    r'\.sidebar__label\s*\{[^}]*\}',
    r'\.sidebar__item\s*\{[^}]*\}',
    r'\.sidebar__item-text\s*\{[^}]*\}',
    r'\.sidebar__menu\s*\{[^}]*\}',
    r'\.sidebar__section\s*\{[^}]*\}',
    r'\.sidebar__footer\s*\{[^}]*\}',
    r'\.sidebar__user\s*\{[^}]*\}',
    r'\.sidebar__logout\s*\{[^}]*\}',
    # Main margin rules referring to sidebar
    r'\.sidebar\.collapsed\s*\+\s*\.main\s*\{[^}]*\}',
    r'\.main\s*\{\s*margin-left:\s*var\(--sidebar-w\)[^}]*\}',
]

# Old sidebar JS blocks/comments.
OLD_SIDEBAR_JS_SNIPPETS = [
    "// Sidebar toggle script",
    "document.getElementById('sidebarToggle').addEventListener('click', () => sidebar.classList.toggle('collapsed'));",
    "sidebar.addEventListener('mouseenter', () => { sidebar.classList.remove('collapsed'); });",
    "sidebar.addEventListener('mouseleave', () => { sidebar.classList.add('collapsed'); });",
]

# Old sidebar HTML snippets to remove.
OLD_SIDEBAR_HTML_SNIPPETS = [
    "<!-- Sidebar Component -->",
    '<aside class="sidebar" id="sidebar">',
    '<aside class="sidebar collapsed" id="sidebar">',
]

def clean_css_block(content):
    """Remove old sidebar CSS blocks inside the page's <style> tag."""
    # Remove the big commented sidebar section header
    content = re.sub(
        r'/\*\s*═+\s*\n\s*LAYOUT:\s*SIDEBAR\s*\n\s*═+\s*\*/',
        '', content, flags=re.IGNORECASE
    )
    # Remove lines that are just .sidebar... with empty or whitespace-only rule bodies
    content = re.sub(
        r'\.sidebar[^\n{]*\{[^}]*\}',
        '', content, flags=re.MULTILINE
    )
    # Remove brand-logo / brand-name rules
    content = re.sub(
        r'\.brand-logo\s*\{[^}]*\}',
        '', content, flags=re.MULTILINE
    )
    content = re.sub(
        r'\.brand-name\s*\{[^}]*\}',
        '', content, flags=re.MULTILINE
    )
    content = re.sub(
        r'\.brand-name\s+span\s*\{[^}]*\}',
        '', content, flags=re.MULTILINE
    )
    # Remove sidebar collapsed selector rules
    content = re.sub(
        r'\.sidebar\.collapsed\s*\n\s*',
        '', content
    )
    # Remove any rule that starts with .sidebar__ or .sidebar.
    content = re.sub(
        r'\.sidebar[_A-Za-z0-9-]*\s*\{[^}]*\}',
        '', content
    )
    content = re.sub(
        r'\.sidebar[_A-Za-z0-9-]*:\w+\s*\{[^}]*\}',
        '', content
    )
    # Remove main margin-left rules that referenced sidebar
    content = re.sub(
        r'\.main\s*\{\s*margin-left:\s*var\(--sidebar-w\)[^}]*\}',
        '.main { flex: 1; padding: 40px; min-width: 0; }',
        content
    )
    content = re.sub(
        r'\.sidebar\.collapsed\s*\+\s*\.main\s*\{[^}]*\}',
        '', content
    )
    # Remove old CSS variables that conflict with the shared sidebar vars
    # We keep the page's own design vars, but remove --sidebar-w etc if present.
    content = re.sub(
        r'\s*--sidebar-w:\s*\d+px;\s*\n?',
        '\n',
        content
    )
    content = re.sub(
        r'\s*--sidebar-w-collapsed:\s*\d+px;\s*\n?',
        '\n',
        content
    )
    return content

def clean_html_body(content):
    """Remove old sidebar markup from body."""
    # Remove the comment marker
    content = content.replace("<!-- Sidebar Component -->", "")
    # Remove any <aside class="sidebar" ...>...</aside> block (collapsed or not)
    content = re.sub(
        r'<aside\s+class="sidebar[^"]*"[^>]*>.*?</aside>\s*',
        '', content, flags=re.DOTALL | re.IGNORECASE
    )
    # Remove empty aside tags that might be left
    content = re.sub(
        r'<aside\b[^>]*>\s*</aside>\s*',
        '', content, flags=re.DOTALL | re.IGNORECASE
    )
    return content

def clean_js(content):
    """Remove old sidebar JS snippets."""
    for snippet in OLD_SIDEBAR_JS_SNIPPETS:
        content = content.replace(snippet, "")
    return content

def ensure_sidebar_script(content):
    """Make sure sidebar.js is loaded before the closing </body>."""
    if 'sidebar.js' in content:
        # Normalize existing references to local path
        content = content.replace('src="/sidebar.js"', 'src="sidebar.js"')
        return content

    # Insert before </body>
    script = '  <script src="sidebar.js" defer></script>\n'
    if '</body>' in content:
        content = content.replace('</body>', script + '</body>')
    else:
        content += '\n' + script
    return content

def ensure_main_container(content):
    """Ensure body has a .main container for Type B layout."""
    if re.search(r'<(main|div)\b[^>]*class\s*=\s*["\'][^"\']*\bmain\b', content, re.IGNORECASE):
        return content

    # If body has no main container, wrap its direct non-script children.
    # This is a fallback; most pages already have <main class="main">.
    body_match = re.search(r'<body[^>]*>(.*?)</body>', content, re.DOTALL | re.IGNORECASE)
    if not body_match:
        return content

    body_inner = body_match.group(1)
    # Don't wrap if there's already an .app container
    if 'class="app"' in body_inner or "class='app'" in body_inner:
        return content

    # Wrap everything except trailing scripts
    parts = re.split(r'(<script\b[^>]*>.*?</script>\s*)', body_inner, flags=re.DOTALL | re.IGNORECASE)
    non_script = ''.join(parts[::2])
    scripts = ''.join(parts[1::2])
    wrapped = f'<main class="main">\n{non_script.strip()}\n</main>\n{scripts}'
    content = content[:body_match.start(1)] + wrapped + content[body_match.end(1):]
    return content

def process_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        original = f.read()

    content = original

    # Clean old CSS, HTML, and JS remnants
    content = clean_css_block(content)
    content = clean_html_body(content)
    content = clean_js(content)

    # Ensure sidebar script and main container
    content = ensure_sidebar_script(content)
    content = ensure_main_container(content)

    # Remove excessive blank lines
    content = re.sub(r'\n{3,}', '\n\n', content)

    if content != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'  [patched] {os.path.basename(path)}')
    else:
        print(f'  [no change] {os.path.basename(path)}')

def main():
    files = sorted(glob.glob('*.html'))
    print('Integrating global sidebar.js across all HTML pages...')
    for f in files:
        if os.path.basename(f) in SKIP:
            print(f'  [skipped] {f}')
            continue
        process_file(f)
    print('Done.')

if __name__ == '__main__':
    main()
