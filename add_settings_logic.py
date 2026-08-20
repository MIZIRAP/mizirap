import re

with open('/Users/boratektas/Desktop/mizirap/finance.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update initFinance to also call renderFinanceSettings()
content = content.replace('renderTxModalOptions();', 'renderTxModalOptions();\n        if (typeof renderFinanceSettings !== "undefined") renderFinanceSettings();')


# 2. Add open/close settings modal to data-action handler
data_action_match = re.search(r'else if \(action === \'openAddPaymentMethodModal\'\) openModal\(\'finance-add-payment-modal\'\);', content)
if data_action_match:
    new_actions = """else if (action === 'openAddPaymentMethodModal') openModal('finance-add-payment-modal');
    else if (action === 'openFinanceSettingsModal') openModal('finance-settings-modal');
    else if (action === 'closeFinanceSettingsModal') closeModal('finance-settings-modal');"""
    content = content[:data_action_match.start()] + new_actions + content[data_action_match.end():]
else:
    print("Could not find data action handler")

# 3. Add renderFinanceSettings function
render_settings_func = """
export function renderFinanceSettings() {
    const catContainer = document.getElementById('settings-category-list');
    const pmContainer = document.getElementById('settings-payment-list');
    
    if (catContainer) {
        catContainer.innerHTML = '';
        if (financeCategories.length === 0) {
            catContainer.innerHTML = '<div class="text-xs text-[#64748B] italic py-2 px-4">Henüz harcama türü eklenmedi.</div>';
        } else {
            financeCategories.forEach(cat => {
                const wrapper = document.createElement('div');
                wrapper.className = "relative w-full shrink-0";
                
                // Delete button underneath
                const delBtn = document.createElement('button');
                delBtn.className = "absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 bg-red-500 rounded-2xl text-white flex items-center justify-center z-0 active:bg-red-600 transition-colors shadow-[4px_4px_8px_#D1D9E6,-4px_-4px_8px_#FFFFFF]";
                delBtn.innerHTML = `<span class="material-symbols-outlined text-xl">delete</span>`;
                delBtn.onclick = async () => {
                    if (!confirm(`'${cat.name}' harcama türünü silmek istediğinize emin misiniz?`)) return;
                    try {
                        await deleteDoc(doc(db, "users", currentUid, "finance_categories", cat.id));
                    } catch(e) {
                        console.error("Silme Hatası", e);
                        alert("Harcama türü silinirken bir hata oluştu.");
                    }
                };

                const item = document.createElement('div');
                item.className = "relative flex items-center justify-between p-4 rounded-2xl bg-[#F7F9FF] z-10 transition-transform cursor-grab active:cursor-grabbing";
                item.style.boxShadow = "6px 6px 12px #e3e6ee, -6px -6px 12px #ffffff";
                item.innerHTML = `
                    <div class="flex items-center gap-3 pointer-events-none">
                        <div class="w-10 h-10 rounded-full bg-[#F7F9FF] flex items-center justify-center" style="box-shadow: inset 2px 2px 5px #D1D9E6, inset -2px -2px 5px #FFFFFF;">
                            <span class="material-symbols-rounded text-[#3B82F6]">${cat.icon || 'category'}</span>
                        </div>
                        <span class="text-sm font-bold text-[#1E293B]">${cat.name}</span>
                    </div>
                `;

                // Swipe logic
                let startX = 0;
                let currentX = 0;
                let isDragging = false;
                let isSwiped = false;
                const threshold = -60;

                item.addEventListener('touchstart', (e) => {
                    startX = e.touches[0].clientX;
                    isDragging = true;
                    item.style.transition = 'none';
                });

                item.addEventListener('touchmove', (e) => {
                    if (!isDragging) return;
                    currentX = e.touches[0].clientX;
                    let diffX = currentX - startX;
                    if (isSwiped) diffX += threshold;
                    
                    if (diffX > 0) diffX = 0; // only swipe left
                    if (diffX < -100) diffX = -100; // max swipe left
                    
                    item.style.transform = `translateX(${diffX}px)`;
                });

                item.addEventListener('touchend', (e) => {
                    isDragging = false;
                    item.style.transition = 'transform 0.3s ease-out';
                    
                    let diffX = (currentX || startX) - startX;
                    if (isSwiped) diffX += threshold;

                    if (!isSwiped && diffX < -40) {
                        isSwiped = true;
                        item.style.transform = `translateX(${threshold}px)`;
                        
                        document.addEventListener('touchstart', function closeSwipe(evt) {
                            if (!wrapper.contains(evt.target)) {
                                isSwiped = false;
                                item.style.transform = `translateX(0px)`;
                                document.removeEventListener('touchstart', closeSwipe);
                            }
                        });
                    } else if (isSwiped && diffX > 40) {
                        isSwiped = false;
                        item.style.transform = `translateX(0px)`;
                    } else {
                        item.style.transform = isSwiped ? `translateX(${threshold}px)` : 'translateX(0px)';
                    }
                    currentX = 0;
                });

                wrapper.appendChild(delBtn);
                wrapper.appendChild(item);
                catContainer.appendChild(wrapper);
            });
        }
    }
    
    if (pmContainer) {
        pmContainer.innerHTML = '';
        if (financePaymentMethods.length === 0) {
            pmContainer.innerHTML = '<div class="text-xs text-[#64748B] italic py-2 px-4">Henüz ödeme yöntemi eklenmedi.</div>';
        } else {
            financePaymentMethods.forEach(pm => {
                const wrapper = document.createElement('div');
                wrapper.className = "relative w-full shrink-0";
                
                // Delete button underneath
                const delBtn = document.createElement('button');
                delBtn.className = "absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 bg-red-500 rounded-2xl text-white flex items-center justify-center z-0 active:bg-red-600 transition-colors shadow-[4px_4px_8px_#D1D9E6,-4px_-4px_8px_#FFFFFF]";
                delBtn.innerHTML = `<span class="material-symbols-outlined text-xl">delete</span>`;
                delBtn.onclick = async () => {
                    if (!confirm(`'${pm.name}' ödeme yöntemini silmek istediğinize emin misiniz?`)) return;
                    try {
                        await deleteDoc(doc(db, "users", currentUid, "finance_payment_methods", pm.id));
                    } catch(e) {
                        console.error("Silme Hatası", e);
                        alert("Ödeme yöntemi silinirken bir hata oluştu.");
                    }
                };

                const item = document.createElement('div');
                item.className = "relative flex items-center justify-between p-4 rounded-2xl bg-[#F7F9FF] z-10 transition-transform cursor-grab active:cursor-grabbing";
                item.style.boxShadow = "6px 6px 12px #e3e6ee, -6px -6px 12px #ffffff";
                item.innerHTML = `
                    <div class="flex items-center gap-3 pointer-events-none">
                        <div class="w-10 h-10 rounded-full bg-[#F7F9FF] flex items-center justify-center" style="box-shadow: inset 2px 2px 5px #D1D9E6, inset -2px -2px 5px #FFFFFF;">
                            <span class="material-symbols-rounded text-[#3B82F6]">${pm.icon || 'credit_card'}</span>
                        </div>
                        <span class="text-sm font-bold text-[#1E293B]">${pm.name}</span>
                    </div>
                `;

                // Swipe logic
                let startX = 0;
                let currentX = 0;
                let isDragging = false;
                let isSwiped = false;
                const threshold = -60;

                item.addEventListener('touchstart', (e) => {
                    startX = e.touches[0].clientX;
                    isDragging = true;
                    item.style.transition = 'none';
                });

                item.addEventListener('touchmove', (e) => {
                    if (!isDragging) return;
                    currentX = e.touches[0].clientX;
                    let diffX = currentX - startX;
                    if (isSwiped) diffX += threshold;
                    
                    if (diffX > 0) diffX = 0; // only swipe left
                    if (diffX < -100) diffX = -100; // max swipe left
                    
                    item.style.transform = `translateX(${diffX}px)`;
                });

                item.addEventListener('touchend', (e) => {
                    isDragging = false;
                    item.style.transition = 'transform 0.3s ease-out';
                    
                    let diffX = (currentX || startX) - startX;
                    if (isSwiped) diffX += threshold;

                    if (!isSwiped && diffX < -40) {
                        isSwiped = true;
                        item.style.transform = `translateX(${threshold}px)`;
                        
                        document.addEventListener('touchstart', function closeSwipe(evt) {
                            if (!wrapper.contains(evt.target)) {
                                isSwiped = false;
                                item.style.transform = `translateX(0px)`;
                                document.removeEventListener('touchstart', closeSwipe);
                            }
                        });
                    } else if (isSwiped && diffX > 40) {
                        isSwiped = false;
                        item.style.transform = `translateX(0px)`;
                    } else {
                        item.style.transform = isSwiped ? `translateX(${threshold}px)` : 'translateX(0px)';
                    }
                    currentX = 0;
                });

                wrapper.appendChild(delBtn);
                wrapper.appendChild(item);
                pmContainer.appendChild(wrapper);
            });
        }
    }
}
"""

content += render_settings_func

with open('/Users/boratektas/Desktop/mizirap/finance.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS")
