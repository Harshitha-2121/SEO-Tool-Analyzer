import glob
import re

files = glob.glob('*.html')
count = 0

replacements = [
    (r'--bg:\s*#[0-9a-fA-F]+;', '--bg: #1A1A1A;'),
    (r'--bg-base:\s*#[0-9a-fA-F]+;', '--bg-base: #1A1A1A;'),
    (r'--bg-card:\s*rgba?\([^)]+\);', '--bg-card: rgba(250, 248, 242, 0.04);'),
    (r'--border:\s*rgba?\([^)]+\);', '--border: rgba(250, 248, 242, 0.08);'),
    (r'--border-hover:\s*rgba?\([^)]+\);', '--border-hover: rgba(250, 248, 242, 0.15);'),
    (r'--accent:\s*#[0-9a-fA-F]+;', '--accent: #F6C76A;'),
    (r'--accent-light:\s*#[0-9a-fA-F]+;', '--accent-light: #fbe3ad;'),
    (r'--text-1:\s*#[0-9a-fA-F]+;', '--text-1: #FAF8F2;'),
    (r'--text-2:\s*#[0-9a-fA-F]+;', '--text-2: rgba(250, 248, 242, 0.7);'),
    (r'--text-3:\s*#[0-9a-fA-F]+;', '--text-3: rgba(250, 248, 242, 0.4);'),
    (r'--text-2:\s*rgba?\([^)]+\);', '--text-2: rgba(250, 248, 242, 0.7);'),
    (r'--text-3:\s*rgba?\([^)]+\);', '--text-3: rgba(250, 248, 242, 0.4);'),
]

for f in files:
    if f in ['dashboard.html', 'index.html', 'login.html']: 
        continue
        
    with open(f, 'r', encoding='utf-8') as file:
        data = file.read()
    
    original_data = data
    for pattern, replacement in replacements:
        data = re.sub(pattern, replacement, data)
        
    if data != original_data:
        with open(f, 'w', encoding='utf-8') as file:
            file.write(data)
        print(f"Updated {f}")
        count += 1
    else:
        print(f"Skipped {f} (no changes)")

print(f"Total updated: {count}")
