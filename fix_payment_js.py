import re

with open('/Users/boratektas/Desktop/mizirap/finance.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Update the icon selection logic in setupFinanceModals()
old_icon_logic = """    const paymentIcons = document.querySelectorAll('.payment-icon-option');
    paymentIcons.forEach(iconEl => {
        iconEl.addEventListener('click', () => {
            paymentIcons.forEach(el => {
                el.classList.remove('selected', 'bg-gradient-to-r', 'from-neon-purple', 'to-neon-blue', 'text-white', 'shadow-md', 'scale-105');
                el.classList.add('bg-background', 'shadow-neo', 'border', 'border-surface-variant', 'text-on-surface-variant', 'hover:bg-background', 'shadow-neo-low');
            });
            iconEl.classList.remove('bg-background', 'shadow-neo', 'border', 'border-surface-variant', 'text-on-surface-variant', 'hover:bg-background', 'shadow-neo-low');
            iconEl.classList.add('selected', 'bg-gradient-to-r', 'from-neon-purple', 'to-neon-blue', 'text-white', 'shadow-md', 'scale-105');
        });
    });"""

# Because the old logic might have slightly different classes in reality, let's use regex to replace the entire block
match = re.search(r'const paymentIcons = document\.querySelectorAll\(\'\.payment-icon-option\'\);.*?}\);\s*}\);', content, re.DOTALL)

new_icon_logic = """const paymentIcons = document.querySelectorAll('.payment-icon-option');
    paymentIcons.forEach(iconEl => {
        iconEl.addEventListener('click', () => {
            paymentIcons.forEach(el => {
                el.classList.remove('selected');
                el.classList.remove('text-[#3B82F6]');
                el.classList.add('text-[#64748B]');
                el.style.boxShadow = 'inset 4px 4px 8px #e3e6ee, inset -4px -4px 8px #ffffff';
            });
            iconEl.classList.add('selected');
            iconEl.classList.remove('text-[#64748B]');
            iconEl.classList.add('text-[#3B82F6]');
            iconEl.style.boxShadow = '6px 6px 12px #e3e6ee, -6px -6px 12px #ffffff';
        });
    });"""

if match:
    content = content[:match.start()] + new_icon_logic + content[match.end():]
else:
    print("Icon logic not found")


# Update save button feedback logic in savePaymentMethod()
old_save_feedback1 = """        saveBtn.innerHTML = `<span class="material-symbols-rounded">check_circle</span> Eklendi!`;
        saveBtn.classList.add("bg-gradient-to-r", "from-neon-purple", "to-neon-blue-container", "text-white-container");"""

old_save_feedback1_alt = """        saveBtn.innerHTML = `<span class="material-symbols-rounded">check_circle</span> Eklendi!`;
        saveBtn.classList.add("bg-gradient-to-r", "from-neon-purple", "to-neon-blue-container", "text-white-container");"""


new_save_feedback1 = """        saveBtn.innerHTML = `Eklendi! <span class="material-symbols-rounded text-[#3B82F6]">check_circle</span>`;"""

old_save_feedback2 = """            saveBtn.innerHTML = originalText;
            saveBtn.classList.remove("bg-gradient-to-r", "from-neon-purple", "to-neon-blue-container", "text-white-container");"""
            
new_save_feedback2 = """            saveBtn.innerHTML = originalText;"""

# Need to find and replace accurately
content = re.sub(r'saveBtn\.innerHTML = `<span class="material-symbols-rounded">check_circle</span> Eklendi!`;\s*saveBtn\.classList\.add\("bg-gradient-to-r"[^;]+;', new_save_feedback1, content)
content = re.sub(r'saveBtn\.innerHTML = originalText;\s*saveBtn\.classList\.remove\("bg-gradient-to-r"[^;]+;', new_save_feedback2, content)


with open('/Users/boratektas/Desktop/mizirap/finance.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS")
