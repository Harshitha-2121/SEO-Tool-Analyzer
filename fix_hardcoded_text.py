import glob
import re

files = glob.glob('*.html')
count = 0

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        data = file.read()
    
    original_data = data
    
    # Replace white text with text-1
    data = re.sub(r'color:\s*#(?:fff|ffffff);\s*', r'color: var(--text-1); ', data, flags=re.IGNORECASE)
    
    # Replace light grey text with text-2
    data = re.sub(r'color:\s*#a0aec0;\s*', r'color: var(--text-2); ', data, flags=re.IGNORECASE)
    
    if original_data != data:
        with open(f, 'w', encoding='utf-8') as file:
            file.write(data)
        count += 1
        print(f"Fixed {f}")

print(f"Total fixed: {count}")
