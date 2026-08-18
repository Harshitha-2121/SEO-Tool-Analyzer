import glob
import re

old_content = """      /* Surfaces */
      --bg-base: #07080e;
      --bg-sidebar: #0b0d14;
      --bg-topbar: rgba(11, 13, 20, 0.75);
      --bg-card: rgba(255, 255, 255, 0.025);
      --bg-card-hover: rgba(255, 255, 255, 0.04);
      --bg-input: rgba(255, 255, 255, 0.04);
      --bg-badge: rgba(108, 92, 231, 0.12);

      /* Borders */
      --border: rgba(255, 255, 255, 0.06);
      --border-hover: rgba(255, 255, 255, 0.12);
      --border-active: rgba(108, 92, 231, 0.4);

      /* Accents */
      --accent: #6c5ce7;
      --accent-light: #a29bfe;
      --accent-glow: rgba(108, 92, 231, 0.3);"""

new_content = """      /* Surfaces - Dark Mode Default */
      --bg-base: #1A1A1A;
      --bg-sidebar: #131313;
      --bg-topbar: rgba(26, 26, 26, 0.75);
      --bg-card: rgba(250, 248, 242, 0.04);
      --bg-card-hover: rgba(250, 248, 242, 0.08);
      --bg-input: rgba(250, 248, 242, 0.06);
      --bg-badge: rgba(246, 199, 106, 0.15);

      /* Borders */
      --border: rgba(250, 248, 242, 0.08);
      --border-hover: rgba(250, 248, 242, 0.15);
      --border-active: rgba(246, 199, 106, 0.4);

      /* Accents */
      --accent: #F6C76A;
      --accent-light: #fbe3ad;
      --accent-glow: rgba(246, 199, 106, 0.3);"""


old_text_content = """      /* Text */
      --text-1: #f0f0f5;
      --text-2: rgba(240, 240, 245, 0.6);
      --text-3: rgba(240, 240, 245, 0.3);"""

new_text_content = """      /* Text */
      --text-1: #FAF8F2;
      --text-2: rgba(250, 248, 242, 0.7);
      --text-3: rgba(250, 248, 242, 0.4);"""

files = glob.glob('*.html')
count = 0
for f in files:
    if f == 'dashboard.html' or f == 'index.html': 
        continue
    with open(f, 'r', encoding='utf-8') as file:
        data = file.read()
    
    if old_content in data:
        data = data.replace(old_content, new_content)
        data = data.replace(old_text_content, new_text_content)
        with open(f, 'w', encoding='utf-8') as file:
            file.write(data)
        print(f"Updated {f}")
        count += 1
    else:
        print(f"Skipped {f} (pattern not found)")

print(f"Total updated: {count}")
