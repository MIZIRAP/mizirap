import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Fix Tailwind config
html = html.replace('#ffffff"', 'rgba(255, 255, 255, 0.7)"')
html = html.replace('#FFFFFF"', 'rgba(255, 255, 255, 0.7)"')

# Fix inline styles (case insensitive)
# E.g., box-shadow: 4px 4px 8px #D1D9E6, -4px -4px 8px #FFFFFF;
html = re.sub(r'#ffffff\b', 'rgba(255, 255, 255, 0.7)', html, flags=re.IGNORECASE)
html = re.sub(r'#fff\b', 'rgba(255, 255, 255, 0.7)', html, flags=re.IGNORECASE)

# Fix rgba(255, 255, 255, 0.8) to 0.7 just in case
html = html.replace('rgba(255,255,255,0.8)', 'rgba(255, 255, 255, 0.7)')
html = html.replace('rgba(255, 255, 255, 0.8)', 'rgba(255, 255, 255, 0.7)')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Replaced all harsh white shadows!")
