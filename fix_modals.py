import re

with open('/Users/boratektas/Desktop/mizirap/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix finance-add-category-modal
# Change z-[100] to z-[110], justify-end to justify-center
# change translate-y-full to scale-95 opacity-0 initially maybe? Wait, openModal in finance.js uses translate-y-full.
# Let's check openModal function in finance.js!
