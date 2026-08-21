import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Fix openExerciseSheet
html = html.replace("const isFav = listFavBtn.classList.contains('text-primary');", "const isFav = listFavBtn.classList.contains('text-amber-500');")
html = html.replace("sheetFavBtn.classList.add('text-primary');", "sheetFavBtn.classList.add('text-amber-500');")
html = html.replace("sheetFavBtn.classList.remove('text-primary');", "sheetFavBtn.classList.remove('text-amber-500');")

# Fix toggleFav
html = html.replace("if (btn.classList.contains('text-primary')) {", "if (btn.classList.contains('text-amber-500')) {")
html = html.replace("btn.classList.remove('text-primary');", "btn.classList.remove('text-amber-500');")
html = html.replace("btn.classList.add('text-primary');", "btn.classList.add('text-amber-500');")

# Fix toggleSheetFav
html = html.replace("const isFav = sheetFavBtn.classList.contains('text-primary');", "const isFav = sheetFavBtn.classList.contains('text-amber-500');")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Fixed favorite icon logic and changed to amber!")
