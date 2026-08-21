import re
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Add event guard in openExerciseSheet
html = html.replace(
    'function openExerciseSheet(element, name, imgSrc, legendItems) {',
    '''function openExerciseSheet(element, name, imgSrc, legendItems) {
            const ev = window.event;
            if (ev && ev.target.closest('.exercise-fav-btn')) return;'''
)

# 2. Fix text-neon-blue to text-primary inside openExerciseSheet
html = re.sub(
    r'const isFav = listFavBtn.classList.contains\(\'text-neon-blue\'\);[\s\S]*?sheetIcon.style.fontVariationSettings = "\'FILL\' 0";\s*\}',
    '''const isFav = listFavBtn.classList.contains('text-primary');
            const sheetFavBtn = document.getElementById('sheet-fav-btn');
            const sheetIcon = sheetFavBtn.querySelector('.material-symbols-rounded');
            
            if (isFav) {
                sheetFavBtn.classList.add('text-primary');
                sheetFavBtn.classList.remove('text-on-surface-variant');
                sheetIcon.style.fontVariationSettings = "'FILL' 1";
            } else {
                sheetFavBtn.classList.remove('text-primary');
                sheetFavBtn.classList.add('text-on-surface-variant');
                sheetIcon.style.fontVariationSettings = "'FILL' 0";
            }''',
    html,
    count=1
)

# 3. Fix applyExerciseFilters
html = html.replace(
    "const isFav = item.querySelector('.exercise-fav-btn').classList.contains('text-neon-blue');",
    "const isFav = item.querySelector('.exercise-fav-btn').classList.contains('text-primary');"
)
html = html.replace(
    "const exerciseName = item.querySelector('h3').innerText.toLowerCase();",
    "const exerciseName = item.querySelector('h4').innerText.toLowerCase();"
)

# 4. Fix toggleSheetFav and toggleFav functions in index.html
html = html.replace(
    "const isFav = listFavBtn.classList.contains('text-neon-blue');\n            if (isFav) {\n                sheetFavBtn.classList.add('text-neon-blue');\n                sheetFavBtn.classList.remove('text-on-surface-variant');\n                sheetIcon.style.fontVariationSettings = \"'FILL' 1\";\n            } else {\n                sheetFavBtn.classList.remove('text-neon-blue');\n                sheetFavBtn.classList.add('text-on-surface-variant');\n                sheetIcon.style.fontVariationSettings = \"'FILL' 0\";\n            }",
    "const isFav = listFavBtn.classList.contains('text-primary');\n            if (isFav) {\n                sheetFavBtn.classList.add('text-primary');\n                sheetFavBtn.classList.remove('text-on-surface-variant');\n                sheetIcon.style.fontVariationSettings = \"'FILL' 1\";\n            } else {\n                sheetFavBtn.classList.remove('text-primary');\n                sheetFavBtn.classList.add('text-on-surface-variant');\n                sheetIcon.style.fontVariationSettings = \"'FILL' 0\";\n            }"
)

html = html.replace(
    "if (btn.classList.contains('text-neon-blue')) {\n                btn.classList.remove('text-neon-blue');\n                btn.classList.add('text-on-surface-variant');\n                icon.style.fontVariationSettings = \"'FILL' 0\";\n            } else {\n                btn.classList.add('text-neon-blue');\n                btn.classList.remove('text-on-surface-variant');\n                icon.style.fontVariationSettings = \"'FILL' 1\";\n            }",
    "if (btn.classList.contains('text-primary')) {\n                btn.classList.remove('text-primary');\n                btn.classList.add('text-on-surface-variant');\n                icon.style.fontVariationSettings = \"'FILL' 0\";\n            } else {\n                btn.classList.add('text-primary');\n                btn.classList.remove('text-on-surface-variant');\n                icon.style.fontVariationSettings = \"'FILL' 1\";\n            }"
)


with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Done fixing index.html JS!")
