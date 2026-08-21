import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Remove bg-secondary-container from filter chips
html = html.replace('bg-secondary-container ', '')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Removed bg-secondary-container from all chips to fix neumorphic depth illusion!")
