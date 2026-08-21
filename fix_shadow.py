import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

old_button = """        .neo-button {
            transition: all 0.2s ease-in-out;
            box-shadow: 6px 6px 12px #e3e6ee, -6px -6px 12px #ffffff;
        }
        .neo-button:active {
            box-shadow: inset 4px 4px 8px #e3e6ee, inset -4px -4px 8px #ffffff;
            transform: scale(0.98);
        }"""

new_button = """        .neo-button {
            transition: all 0.2s ease-in-out;
            box-shadow: 6px 6px 12px rgba(0,0,0,0.08), -6px -6px 12px rgba(255,255,255,0.7);
        }
        .neo-button:active {
            box-shadow: inset 4px 4px 8px rgba(0,0,0,0.06), inset -4px -4px 8px rgba(255,255,255,0.7) !important;
            transform: scale(0.98);
        }"""

html = html.replace(old_button, new_button)

# Also let's slightly soften the white in neo-surface so it's not a harsh white line
html = html.replace('rgba(255,255,255,0.8)', 'rgba(255,255,255,0.7)')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Fixed harsh white shadows!")
