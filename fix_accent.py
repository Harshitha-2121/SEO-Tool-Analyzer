import glob
import re

files = glob.glob('*.html')
files.extend(glob.glob('*.js'))

count_accent = 0

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        data = file.read()
    
    original_data = data
    
    # Replace color: var(--accent-light) with color: var(--accent)
    data = re.sub(r'color:\s*var\(--accent-light\)', r'color: var(--accent)', data)
    
    if original_data != data:
        with open(f, 'w', encoding='utf-8') as file:
            file.write(data)
        print(f"Updated {f}")
        count_accent += 1

print(f"Total files updated: {count_accent}")
