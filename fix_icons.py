import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Isolate the view-exercise-library section
start_tag = '<section id="view-exercise-library"'
end_tag = '</section>'

# Actually, the section ends right before <section id="view-edit-workout-template"
end_marker = '<section id="view-edit-workout-template"'
start_idx = html.find(start_tag)
end_idx = html.find(end_marker)

if start_idx != -1 and end_idx != -1:
    section_html = html[start_idx:end_idx]
    
    # Replace icons
    section_html = section_html.replace('material-symbols-rounded', 'material-symbols-outlined')
    
    html = html[:start_idx] + section_html + html[end_idx:]

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Replaced icons in view-exercise-library!")
