import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Fix in loadCustomExercises
html = html.replace(
    "if (typeof currentUid === 'undefined') return;",
    "const currentUid = localStorage.getItem('uid');\n            if (!currentUid) return;"
)

# Fix in saveNewExercise
html = html.replace(
    "if (typeof currentUid !== 'undefined') {",
    "const currentUid = localStorage.getItem('uid');\n            if (currentUid) {"
)

# Fix in deleteCurrentExercise
html = html.replace(
    "if (typeof currentUid !== 'undefined') {",
    "const currentUid = localStorage.getItem('uid');\n                if (currentUid) {"
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Done fixing index.html uid logic!")
