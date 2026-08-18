import glob
import re

files = glob.glob('*.html')
count = 0

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        data = file.read()
    
    original_data = data
    
    # In :root, if --bg is defined but --bg-base is not, rename --bg to --bg-base
    # or just add --bg-base next to --bg.
    # Actually, the regex in fix_ui.py changed background-color: var(--bg) to var(--bg-base).
    # So we just rename --bg: to --bg-base: in :root
    
    data = re.sub(r'--bg:\s*(#[0-9A-Fa-f]+|var\([^\)]+\));', r'--bg-base: \1; --bg: \1;', data)
    
    # Also, some files have --bg-2 and --bg-3. Let's map them to --bg-card and --bg-card-hover
    # or simply let them use the variables.
    
    # Let's replace any hardcoded dark rgb/rgba with standard CSS variables if possible.
    # But wait, doing it blindly might break things. Let's just fix the backgrounds first.
    
    # Let's also ensure --bg-base is present in the root.
    
    if original_data != data:
        with open(f, 'w', encoding='utf-8') as file:
            file.write(data)
        count += 1
        print(f"Fixed {f}")

print(f"Total fixed: {count}")
