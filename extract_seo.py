import os
import re

BASE = '/home/ubuntu/seo-audit-platform'
OUT = '/home/ubuntu/seo-audit-platform/seo_extract.md'

with open(OUT, 'w', encoding='utf-8') as out:
    for f in sorted(os.listdir(BASE)):
        if not f.endswith('.html'):
            continue
        path = os.path.join(BASE, f)
        with open(path, 'r', encoding='utf-8', errors='ignore') as fh:
            lines = fh.readlines()
        out.write(f"\n# {f} ({len(lines)} lines)\n")
        # Navigation links
        out.write("## Navigation / hrefs\n")
        for i, line in enumerate(lines, 1):
            if '<a ' in line.lower() or 'href=' in line.lower() or 'location.href' in line or 'window.location' in line:
                out.write(f"{i}: {line.rstrip()}\n")
        # Script sections
        out.write("## Scripts\n")
        in_script = False
        start = 0
        for i, line in enumerate(lines, 1):
            if re.search(r'<script', line, re.I):
                in_script = True
                start = i
            if in_script:
                out.write(f"{i}: {line.rstrip()}\n")
                if re.search(r'</script>', line, re.I):
                    in_script = False
                    out.write("\n")

print('Extraction written to /home/ubuntu/seo-audit-platform/seo_extract.md')
