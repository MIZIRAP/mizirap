import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Fix Header Title
html = html.replace('<h1 class="text-lg font-bold text-primary tracking-tight">Egzersiz Kütüphanesi</h1>',
                    '<h1 class="text-lg font-bold text-on-surface tracking-tight">Egzersiz Kütüphanesi</h1>')

# Fix + button
html = html.replace('<span class="material-symbols-rounded text-primary">add</span>',
                    '<span class="material-symbols-rounded text-on-surface">add</span>')

# Fix Tümü chip in HTML
html = html.replace('class="neo-inset px-5 py-2 rounded-full text-sm font-semibold text-primary whitespace-nowrap filter-chip active"',
                    'class="neo-inset px-5 py-2 rounded-full text-sm font-semibold text-on-surface whitespace-nowrap filter-chip active"')

# Fix JS for active chip
html = html.replace("btnElement.className = 'neo-inset px-5 py-2 rounded-full text-sm font-semibold text-primary whitespace-nowrap filter-chip active';",
                    "btnElement.className = 'neo-inset px-5 py-2 rounded-full text-sm font-semibold text-on-surface whitespace-nowrap filter-chip active';")

# Fix all exercise icons (B, S, D, O etc.)
html = html.replace('rounded-full neo-inset flex items-center justify-center bg-surface-light text-primary font-bold',
                    'rounded-full neo-inset flex items-center justify-center bg-surface-light text-on-surface font-bold')


with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Replaced purple texts with text-on-surface!")
