import glob
import re

files = glob.glob('*.html')
count = 0

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        data = file.read()
    
    original_data = data
    
    # Replace white backgrounds with very low opacity
    data = re.sub(r'background(?:-color)?:\s*rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.0[0-9]+\s*\);', r'background: var(--bg-card);', data)
    
    # Replace white backgrounds with higher opacity
    data = re.sub(r'background(?:-color)?:\s*rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.[1-9]+\s*\);', r'background: var(--bg-card-hover);', data)
    
    # Replace hard-coded dark colors
    data = re.sub(r'background(?:-color)?:\s*#(?:06070a|0e1022|131629);', r'background: var(--bg-card);', data)
    
    # Replace dark rgba backgrounds
    data = re.sub(r'background(?:-color)?:\s*rgba\(\s*(?:8|14)\s*,\s*(?:9|16)\s*,\s*(?:18|34)\s*,\s*0\.[0-9]+\s*\);', r'background: var(--bg-card);', data)
    
    if original_data != data:
        with open(f, 'w', encoding='utf-8') as file:
            file.write(data)
        count += 1
        print(f"Fixed {f}")

print(f"Total fixed: {count}")
