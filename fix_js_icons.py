import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace .material-symbols-rounded with span in querySelector inside openExerciseSheet
old_js = "const sheetIcon = sheetFavBtn.querySelector('.material-symbols-rounded');"
new_js = "const sheetIcon = sheetFavBtn.querySelector('span');"
html = html.replace(old_js, new_js)

# Also check toggleSheetFav
old_toggle_js = "const sheetIcon = sheetFavBtn.querySelector('.material-symbols-rounded');"
new_toggle_js = "const sheetIcon = sheetFavBtn.querySelector('span');"
html = html.replace(old_toggle_js, new_toggle_js)

# Also in toggleFavorite
old_fav_js = "const icon = btn.querySelector('.material-symbols-rounded');"
new_fav_js = "const icon = btn.querySelector('span');"
html = html.replace(old_fav_js, new_fav_js)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Fixed querySelectors for icons in JS!")
