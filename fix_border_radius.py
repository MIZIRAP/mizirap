import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Remove border-radius from neo-surface and neo-inset
html = re.sub(r'border-radius:\s*1\.5rem;', '', html)
html = re.sub(r'border-radius:\s*1rem;', '', html)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Removed conflicting hardcoded border-radii!")
