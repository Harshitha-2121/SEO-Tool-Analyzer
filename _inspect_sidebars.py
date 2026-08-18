#!/usr/bin/env python3
"""Inspect all HTML files for sidebar integration status."""
import glob, os, re, json

files = sorted(glob.glob('*.html'))
rows = []
for f in files:
    with open(f, 'r', encoding='utf-8') as fh:
        content = fh.read()
    rows.append({
        'file': f,
        'has_sidebar_js': 'sidebar.js' in content,
        'has_aside_sidebar': bool(re.search(r'<aside\b[^>]*\bsidebar\b', content, re.IGNORECASE)),
        'has_sidebar_css': '.sidebar' in content or '#sidebar' in content,
        'has_app_container': bool(re.search(r'<div\b[^>]*\bclass\s*=\s*["\'][^"\']*\bapp\b', content, re.IGNORECASE)),
    })

print(json.dumps(rows, indent=2))
