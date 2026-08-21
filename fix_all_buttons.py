import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace bg-[#F7F9FF] with bg-surface-light or bg-[#F0F2F8]
html = html.replace('bg-[#F7F9FF]', 'bg-[#F0F2F8]')

# Replace any stray #F7F9FF in inline styles with #F0F2F8
html = re.sub(r'#F7F9FF\b', '#F0F2F8', html, flags=re.IGNORECASE)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Replaced all #F7F9FF with #F0F2F8 to fix the white button background issue!")
