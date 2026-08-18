import glob
import re

files = glob.glob('*.html')
count_bg = 0
count_grad = 0
count_white_text = 0

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        data = file.read()
    
    original_data = data
    
    # 1. Standardize backgrounds
    # Matches: background: var(--bg); or background-color: var(--bg);
    data = re.sub(r'background(?:-color)?:\s*var\(--bg\);', r'background-color: var(--bg-base);', data)
    
    if original_data != data:
        count_bg += 1
        
    original_grad = data
    
    # 2. Fix the white text gradients
    gradient_regex = r'background:\s*linear-gradient\([^;]+(?:#fff|255,\s*255,\s*255)[^;]+\);\s*(?:-webkit-)?background-clip:\s*text;\s*(?:-webkit-)?text-fill-color:\s*transparent;'
    data = re.sub(gradient_regex, r'color: var(--text-1);', data, flags=re.MULTILINE|re.IGNORECASE)
    
    if original_grad != data:
        count_grad += 1
        
    original_text = data
    
    # Also fix random places where it might just be color: #fff or color: white in a title class
    # To be safe, we might just look for color: #fff; and color: #ffffff; in general blocks if we needed, but let's just stick to the gradient and standardizing backgrounds first.
    
    if data != original_data:
        with open(f, 'w', encoding='utf-8') as file:
            file.write(data)
        print(f"Updated {f}")

print(f"Total backgrounds fixed: {count_bg}")
print(f"Total gradients fixed: {count_grad}")
