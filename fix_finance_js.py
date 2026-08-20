import re

with open('/Users/boratektas/Desktop/mizirap/finance.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix saveTransaction selectors
content = content.replace(
    "const activeCat = document.querySelector('.tx-cat-btn.bg-gradient-to-r from-neon-purple to-neon-blue-container');",
    "const activeCat = document.querySelector('.tx-cat-btn.selected');"
)
content = content.replace(
    "const activePm = document.querySelector('.tx-pm-btn.border-primary');",
    "const activePm = document.querySelector('.tx-pm-btn.selected');"
)

# 2. Fix editBtn.onclick logic for category and payment buttons
old_cat_logic = """                const catOpts = document.querySelectorAll('.tx-cat-btn');
                catOpts.forEach(o => {
                    if(o.dataset.id === tx.categoryId) {
                        o.classList.add('bg-gradient-to-r', 'from-neon-purple', 'to-neon-blue-container', 'border-primary', 'text-white-container');
                        o.classList.remove('bg-background', 'shadow-neo', 'border-surface-variant', 'text-on-surface');
                    } else {
                        o.classList.remove('bg-gradient-to-r', 'from-neon-purple', 'to-neon-blue-container', 'border-primary', 'text-white-container');
                        o.classList.add('bg-background', 'shadow-neo', 'border-surface-variant', 'text-on-surface');
                    }
                });"""

new_cat_logic = """                const catOpts = document.querySelectorAll('.tx-cat-btn');
                catOpts.forEach(o => {
                    if(o.dataset.id === tx.categoryId) {
                        o.classList.add('selected');
                        o.style.boxShadow = 'inset 4px 4px 8px #e3e6ee, inset -4px -4px 8px #ffffff';
                        o.querySelector('.material-symbols-rounded').classList.remove('text-[#3B82F6]');
                        o.querySelector('.material-symbols-rounded').classList.add('text-[#22c55e]');
                        o.querySelector('span:last-child').classList.remove('text-[#64748B]');
                        o.querySelector('span:last-child').classList.add('text-[#1E293B]');
                    } else {
                        o.classList.remove('selected');
                        o.style.boxShadow = '6px 6px 12px #e3e6ee, -6px -6px 12px #ffffff';
                        o.querySelector('.material-symbols-rounded').classList.add('text-[#3B82F6]');
                        o.querySelector('.material-symbols-rounded').classList.remove('text-[#22c55e]');
                        o.querySelector('span:last-child').classList.add('text-[#64748B]');
                        o.querySelector('span:last-child').classList.remove('text-[#1E293B]');
                    }
                });"""

old_pm_logic = """            const pmOpts = document.querySelectorAll('.tx-pm-btn');
            pmOpts.forEach(o => {
                if(o.dataset.id === tx.paymentMethodId) {
                    o.classList.add('border-primary', 'bg-gradient-to-r', 'from-neon-purple', 'to-neon-blue/5');
                    o.classList.remove('border-surface-variant');
                } else {
                    o.classList.remove('border-primary', 'bg-gradient-to-r', 'from-neon-purple', 'to-neon-blue/5');
                    o.classList.add('border-surface-variant');
                }
            });"""

new_pm_logic = """            const pmOpts = document.querySelectorAll('.tx-pm-btn');
            pmOpts.forEach(o => {
                if(o.dataset.id === tx.paymentMethodId) {
                    o.classList.add('selected');
                    o.style.boxShadow = 'inset 4px 4px 8px #e3e6ee, inset -4px -4px 8px #ffffff';
                    o.querySelector('.material-symbols-rounded').classList.remove('text-[#3B82F6]');
                    o.querySelector('.material-symbols-rounded').classList.add('text-[#22c55e]');
                    o.querySelector('span:last-child').classList.remove('text-[#64748B]');
                    o.querySelector('span:last-child').classList.add('text-[#1E293B]');
                } else {
                    o.classList.remove('selected');
                    o.style.boxShadow = '6px 6px 12px #e3e6ee, -6px -6px 12px #ffffff';
                    o.querySelector('.material-symbols-rounded').classList.add('text-[#3B82F6]');
                    o.querySelector('.material-symbols-rounded').classList.remove('text-[#22c55e]');
                    o.querySelector('span:last-child').classList.add('text-[#64748B]');
                    o.querySelector('span:last-child').classList.remove('text-[#1E293B]');
                }
            });"""

content = content.replace(old_cat_logic, new_cat_logic)
content = content.replace(old_pm_logic, new_pm_logic)

with open('/Users/boratektas/Desktop/mizirap/finance.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("SUCCESS")
