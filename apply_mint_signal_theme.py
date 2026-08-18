import glob
import re

files = glob.glob('*.html')
count = 0

replacements = [
    # Backgrounds & Surfaces
    (r'--bg-base:\s*#[0-9a-fA-F]+;', '--bg-base: #09090b;'),
    (r'--bg-sidebar:\s*#[0-9a-fA-F]+;', '--bg-sidebar: #09090b;'),
    (r'--bg-topbar:\s*rgba?\([^)]+\);', '--bg-topbar: rgba(9, 9, 11, 0.8);'),
    (r'--bg-card:\s*rgba?\([^)]+\);', '--bg-card: rgba(20, 20, 25, 0.65);'),
    (r'--bg-card-hover:\s*rgba?\([^)]+\);', '--bg-card-hover: rgba(255, 255, 255, 0.04);'),
    (r'--bg-input:\s*rgba?\([^)]+\);', '--bg-input: rgba(255, 255, 255, 0.03);'),

    # Borders
    (r'--border:\s*rgba?\([^)]+\);', '--border: rgba(255, 255, 255, 0.08);'),
    (r'--border-hover:\s*rgba?\([^)]+\);', '--border-hover: rgba(255, 255, 255, 0.16);'),
    (r'--border-active:\s*rgba?\([^)]+\);', '--border-active: rgba(16, 185, 129, 0.4);'),
    (r'--border-active:\s*#[0-9a-fA-F]+;', '--border-active: #10b981;'),

    # Accents & Brand Colors
    (r'--accent:\s*#[0-9a-fA-F]+;', '--accent: #10b981;'),
    (r'--accent-light:\s*#[0-9a-fA-F]+;', '--accent-light: #34d399;'),
    (r'--accent-glow:\s*rgba?\([^)]+\);', '--accent-glow: rgba(16, 185, 129, 0.25);'),
    (r'--accent-primary:\s*#[0-9a-fA-F]+;', '--accent-primary: #10b981;'),
    (r'--accent-secondary:\s*#[0-9a-fA-F]+;', '--accent-secondary: #059669;'),
    (r'--accent-green:\s*#[0-9a-fA-F]+;', '--accent-green: #10b981;'),
    (r'--accent-cyan:\s*#[0-9a-fA-F]+;', '--accent-cyan: #10b981;'),
    
    # Texts
    (r'--text-1:\s*#[0-9a-fA-F]+;', '--text-1: #f4f4f5;'),
    (r'--text-2:\s*rgba?\([^)]+\);', '--text-2: rgba(244, 244, 245, 0.7);'),
    (r'--text-3:\s*rgba?\([^)]+\);', '--text-3: rgba(244, 244, 245, 0.4);'),
    (r'--text-primary:\s*#[0-9a-fA-F]+;', '--text-primary: #f4f4f5;'),
    (r'--text-secondary:\s*rgba?\([^)]+\);', '--text-secondary: rgba(244, 244, 245, 0.7);'),
    (r'--text-tertiary:\s*rgba?\([^)]+\);', '--text-tertiary: rgba(244, 244, 245, 0.4);'),

    # Hardcoded Accent color overrides (Lime Green & Yellow to Mint Green)
    (r'#76B900', '#10b981'),
    (r'#a3e635', '#34d399'),
    (r'#5C9000', '#059669'),
    (r'#F6C76A', '#10b981'),
    (r'#fbe3ad', '#34d399'),
    (r'rgba\(246,\s*199,\s*106', 'rgba(16, 185, 129'),
    (r'rgba\(118,\s*185,\s*0', 'rgba(16, 185, 129'),
    (r'118,\s*185,\s*0', '16, 185, 129'),
    (r'246,\s*199,\s*106', '16, 185, 129'),
]

for f in files:
    # Skip temporary or check scripts, just process HTML
    with open(f, 'r', encoding='utf-8') as file:
        data = file.read()
    
    original_data = data
    for pattern, replacement in replacements:
        data = re.sub(pattern, replacement, data)
        
    if data != original_data:
        with open(f, 'w', encoding='utf-8') as file:
            file.write(data)
        print(f"Updated theme colors in: {f}")
        count += 1
    else:
        print(f"Skipped {f} (already themed)")

print(f"Theme redesign update complete. Total files modified: {count}")
