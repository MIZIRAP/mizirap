import re

with open('/Users/boratektas/Desktop/mizirap/finance.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace renderTxModalOptions function block entirely using regex (from export function to its end)
match = re.search(r'export function renderTxModalOptions\(\) \{.*?if \(text\) \{ text\.classList\.add\(\'text-on-surface\'\); text\.classList\.remove\(\'text-on-surface-variant\'\); \}\s*\}\);\s*\}\);\s*\}\s*\}\s*\}', content, re.DOTALL)

new_func = """export function renderTxModalOptions() {
    const catContainer = document.getElementById('tx-category-container');
    const pmContainer = document.getElementById('tx-payment-container');
    
    // Style configurations for dynamic buttons
    const unselectedShadow = '6px 6px 12px #e3e6ee, -6px -6px 12px #ffffff';
    const selectedShadow = 'inset 4px 4px 8px #e3e6ee, inset -4px -4px 8px #ffffff';
    
    if (catContainer) {
        if (financeCategories.length === 0) {
            catContainer.innerHTML = '<div class="text-sm text-[#64748B] py-2 italic w-full text-center">Önce harcama türü ekleyin.</div>';
        } else {
            catContainer.innerHTML = financeCategories.map((c, idx) => `
                <button class="tx-cat-btn flex flex-col items-center gap-2 p-4 rounded-2xl transition-all min-w-[80px] snap-center bg-[#F7F9FF] ${idx === 0 ? 'selected' : ''}" 
                        style="box-shadow: ${idx === 0 ? selectedShadow : unselectedShadow};" 
                        data-id="${c.id}">
                    <span class="material-symbols-rounded ${idx === 0 ? 'text-[#22c55e]' : 'text-[#3B82F6]'}">${c.icon || 'category'}</span>
                    <span class="text-xs font-bold ${idx === 0 ? 'text-[#1E293B]' : 'text-[#64748B]'} whitespace-nowrap">${c.name}</span>
                </button>
            `).join('');
            
            // Add Listeners
            document.querySelectorAll('.tx-cat-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.tx-cat-btn').forEach(b => {
                        b.classList.remove('selected');
                        b.style.boxShadow = unselectedShadow;
                        b.querySelector('.material-symbols-rounded').classList.remove('text-[#22c55e]');
                        b.querySelector('.material-symbols-rounded').classList.add('text-[#3B82F6]');
                        b.querySelector('span:last-child').classList.remove('text-[#1E293B]');
                        b.querySelector('span:last-child').classList.add('text-[#64748B]');
                    });
                    btn.classList.add('selected');
                    btn.style.boxShadow = selectedShadow;
                    btn.querySelector('.material-symbols-rounded').classList.remove('text-[#3B82F6]');
                    btn.querySelector('.material-symbols-rounded').classList.add('text-[#22c55e]');
                    btn.querySelector('span:last-child').classList.remove('text-[#64748B]');
                    btn.querySelector('span:last-child').classList.add('text-[#1E293B]');
                });
            });
        }
    }
    
    if (pmContainer) {
        if (financePaymentMethods.length === 0) {
            pmContainer.innerHTML = '<div class="text-sm text-[#64748B] py-2 italic w-full text-center">Önce ödeme yöntemi ekleyin.</div>';
        } else {
            pmContainer.innerHTML = financePaymentMethods.map((p, idx) => `
                <button class="tx-pm-btn flex flex-col items-center gap-2 p-4 rounded-2xl transition-all min-w-[100px] snap-center bg-[#F7F9FF] ${idx === 0 ? 'selected' : ''}" 
                        style="box-shadow: ${idx === 0 ? selectedShadow : unselectedShadow};" 
                        data-id="${p.id}">
                    <span class="material-symbols-rounded ${idx === 0 ? 'text-[#22c55e]' : 'text-[#3B82F6]'}">${p.icon || 'credit_card'}</span>
                    <span class="text-xs font-bold ${idx === 0 ? 'text-[#1E293B]' : 'text-[#64748B]'} whitespace-nowrap">${p.name}</span>
                </button>
            `).join('');
            
            // Add Listeners
            document.querySelectorAll('.tx-pm-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.tx-pm-btn').forEach(b => {
                        b.classList.remove('selected');
                        b.style.boxShadow = unselectedShadow;
                        b.querySelector('.material-symbols-rounded').classList.remove('text-[#22c55e]');
                        b.querySelector('.material-symbols-rounded').classList.add('text-[#3B82F6]');
                        b.querySelector('span:last-child').classList.remove('text-[#1E293B]');
                        b.querySelector('span:last-child').classList.add('text-[#64748B]');
                    });
                    btn.classList.add('selected');
                    btn.style.boxShadow = selectedShadow;
                    btn.querySelector('.material-symbols-rounded').classList.remove('text-[#3B82F6]');
                    btn.querySelector('.material-symbols-rounded').classList.add('text-[#22c55e]');
                    btn.querySelector('span:last-child').classList.remove('text-[#64748B]');
                    btn.querySelector('span:last-child').classList.add('text-[#1E293B]');
                });
            });
        }
    }
}"""

if match:
    content = content[:match.start()] + new_func + content[match.end():]
else:
    print("COULD NOT FIND renderTxModalOptions TO REPLACE")
    import sys
    sys.exit(1)

with open('/Users/boratektas/Desktop/mizirap/finance.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS")
