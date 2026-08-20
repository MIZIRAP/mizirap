import { auth, db } from "./firebase-config.js";
import { formatDate, formatCurrency } from "./utils.js";
import { collection, doc, addDoc, setDoc, updateDoc, deleteDoc, getDocs, getDoc, query, orderBy, limit, serverTimestamp, onSnapshot, where } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { registerListener } from "./listenerManager.js";
import { validatePositiveNumber } from "./utils.js";
import { COLLECTAPI_KEY } from "./api-config.js";

let currentUid = null;
let callback = null;

let financeCategories = [];
let financePaymentMethods = [];
let financeTransactions = [];
let expenseChartInstance = null;

let currentEditFinanceTxId = null;
let currentTxType = 'expense';

let unsubCategories = null;
let unsubPaymentMethods = null;
let unsubTransactions = null;

document.addEventListener('click', (e) => {
    const actionBtn = e.target.closest('[data-action]');
    if (!actionBtn) return;
    const action = actionBtn.getAttribute('data-action');
    if (action === 'openAddTransactionModal') openModal('finance-add-tx-modal');
    else if (action === 'closeAddTransactionModal') closeModal('finance-add-tx-modal');
    else if (action === 'openAddCategoryModal') openModal('finance-add-category-modal');
    else if (action === 'closeAddCategoryModal') closeModal('finance-add-category-modal');
    else if (action === 'openAddPaymentMethodModal') openModal('finance-add-payment-modal');
    else if (action === 'openFinanceSettingsModal') openModal('finance-settings-modal');
    else if (action === 'closeFinanceSettingsModal') closeModal('finance-settings-modal');
    else if (action === 'closeAddPaymentMethodModal') closeModal('finance-add-payment-modal');
    else if (action === 'resetFinanceData') resetFinanceData();
});

export function initFinance(uid, onChangeCallback) {
    currentUid = uid;
    callback = onChangeCallback;
    
    // 1. Load Categories
    const categoriesRef = collection(db, "users", uid, "finance_categories");
    unsubCategories = registerListener(onSnapshot(categoriesRef, (snap) => {
        financeCategories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderTransactions();
        renderTxModalOptions();
        if (typeof renderFinanceSettings !== "undefined") renderFinanceSettings();
        if (typeof renderFinanceDetail !== "undefined") renderFinanceDetail();
    }));

    // 2. Load Payment Methods
    const paymentMethodsRef = collection(db, "users", uid, "finance_payment_methods");
    unsubPaymentMethods = registerListener(onSnapshot(paymentMethodsRef, (snap) => {
        financePaymentMethods = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderTransactions();
        renderTxModalOptions();
        if (typeof renderFinanceSettings !== "undefined") renderFinanceSettings();
        if (typeof renderFinanceDetail !== "undefined") renderFinanceDetail();
    }));

    // 3. Load Transactions
    const txRef = collection(db, "users", uid, "finance_transactions");
    const q = query(txRef, orderBy("dateStr", "desc"));
    
    unsubTransactions = registerListener(onSnapshot(q, (snap) => {
        financeTransactions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderTransactions();
        renderTxModalOptions();
        if (typeof renderFinanceSettings !== "undefined") renderFinanceSettings();
        if (typeof renderFinanceDetail !== "undefined") renderFinanceDetail();
        if(callback) callback(financeTransactions);
    }));
    
    setupFinanceModals();
    fetchMetalPrices();
}

export function clearFinance() {
    if(unsubCategories) unsubCategories();
    if(unsubPaymentMethods) unsubPaymentMethods();
    if(unsubTransactions) unsubTransactions();
    currentUid = null;
    financeCategories = [];
    financePaymentMethods = [];
    financeTransactions = [];
    
    const list = document.getElementById("finance-recent-transactions");
    if(list) list.innerHTML = "";
    const balance = document.getElementById("finance-total-balance");
    if(balance) balance.textContent = "₺0,00";
    
    // Reset the carousel so it re-initializes for the next session
    const carousel = document.getElementById("finance-month-carousel");
    if(carousel) {
        carousel.removeAttribute("data-initialized");
        carousel.innerHTML = "";
    }
    if(financeCarouselObserver) {
        financeCarouselObserver.disconnect();
        financeCarouselObserver = null;
    }
    currentMainFinanceMonth = new Date();
}

function setupFinanceModals() {
    // TX Amount Plus/Minus Buttons
    const amtMinus = document.getElementById('tx-amount-minus');
    const amtPlus = document.getElementById('tx-amount-plus');
    const amtInput = document.getElementById('tx-amount');
    
    if (amtMinus && amtPlus && amtInput) {
        amtMinus.addEventListener('click', () => {
            let val = parseFloat(amtInput.value) || 0;
            if (val >= 10) val -= 10;
            else if (val > 0) val = 0;
            amtInput.value = val;
        });
        amtPlus.addEventListener('click', () => {
            let val = parseFloat(amtInput.value) || 0;
            val += 10;
            amtInput.value = val;
        });
    }

    // Payment Icon Selection
    const paymentIcons = document.querySelectorAll('.payment-icon-option');
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
    });

    // Save Payment Method
    const savePaymentBtn = document.getElementById('finance-save-payment-btn');
    if(savePaymentBtn) {
        savePaymentBtn.addEventListener('click', savePaymentMethod);
    }

    // Category Icon Selection
    const categoryIcons = document.querySelectorAll('.category-icon-option');
    categoryIcons.forEach(iconEl => {
        iconEl.addEventListener('click', () => {
            categoryIcons.forEach(el => {
                el.classList.remove('selected');
                el.classList.remove('text-[#3B82F6]');
                el.classList.add('text-[#64748B]');
                el.style.boxShadow = 'inset 4px 4px 8px #e3e6ee, inset -4px -4px 8px #ffffff';
                const span = el.querySelector('.material-symbols-rounded');
                if(span) span.style.fontVariationSettings = "'FILL' 0";
            });
            iconEl.classList.add('selected');
            iconEl.classList.remove('text-[#64748B]');
            iconEl.classList.add('text-[#3B82F6]');
            iconEl.style.boxShadow = '6px 6px 12px #e3e6ee, -6px -6px 12px #ffffff';
            const span = iconEl.querySelector('.material-symbols-rounded');
            if(span) span.style.fontVariationSettings = "'FILL' 1";
        });
    });

    // Category Color Selection
    const categoryColors = document.querySelectorAll('.category-color-option');
    categoryColors.forEach(colorEl => {
        colorEl.addEventListener('click', () => {
            categoryColors.forEach(el => {
                el.classList.remove('selected', 'ring-4', 'ring-primary-container', 'ring-offset-2', 'ring-offset-surface-container-lowest');
                el.innerHTML = '';
            });
            colorEl.classList.add('selected', 'ring-4', 'ring-primary-container', 'ring-offset-2', 'ring-offset-surface-container-lowest');
            colorEl.innerHTML = '<span class="material-symbols-rounded text-white">check</span>';
        });
    });

    // Save Category
    const saveCategoryBtn = document.getElementById('finance-save-category-btn');
    if(saveCategoryBtn) {
        saveCategoryBtn.addEventListener('click', saveCategory);
    }

    // Save Transaction
    const saveTxBtn = document.getElementById('finance-save-tx-btn');
    if(saveTxBtn) {
        saveTxBtn.addEventListener('click', saveTransaction);
    }
}



async function savePaymentMethod() {
    if(!currentUid) return;
    
    const nameEl = document.getElementById('method-name');
    const typeEl = document.querySelector('input[name="payment-type"]:checked');
    const iconEl = document.querySelector('.payment-icon-option.selected');
    
    if(!nameEl || !typeEl || !iconEl) return;
    
    const name = nameEl.value.trim();
    if(!name) {
        alert('Lütfen bir hesap/kart adı girin.');
        return;
    }
    
    const type = typeEl.value;
    const icon = iconEl.dataset.icon || 'account_balance';
    
    const saveBtn = document.getElementById('finance-save-payment-btn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = 'Kaydediliyor...';
    saveBtn.disabled = true;
    
    try {
        await addDoc(collection(db, "users", currentUid, "finance_payment_methods"), {
            name,
            type,
            icon,
            createdAt: serverTimestamp()
        });
        
        saveBtn.innerHTML = `<span class="material-symbols-rounded">check_circle</span> Eklendi!`;
        saveBtn.classList.add("bg-gradient-to-r", "from-neon-purple", "to-neon-blue-container", "text-white-container");
        
        setTimeout(() => {
            saveBtn.innerHTML = originalText;
            saveBtn.classList.remove("bg-gradient-to-r", "from-neon-purple", "to-neon-blue-container", "text-white-container");
            saveBtn.disabled = false;
            
            // Clear inputs
            nameEl.value = '';
            
            closeModal('finance-add-payment-modal');
        }, 1000);
    } catch(err) {
        console.error(err);
        alert('Kaydedilirken hata oluştu.');
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

function openModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove("hidden");
    el.classList.add("flex");
    requestAnimationFrame(() => {
        el.classList.remove("opacity-0");
        const panel = el.querySelector("div.transform") || el.querySelector("div");
        if(panel) {
            panel.classList.remove("translate-y-full");
            panel.classList.remove("scale-95", "opacity-0");
            panel.classList.add("scale-100", "opacity-100");
        }
        
        const backdrop = el.querySelector("[id$='-backdrop']");
        if (backdrop) backdrop.classList.remove("opacity-0");
    });
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    
    const panel = el.querySelector("div.transform") || el.querySelector("div");
    if(panel) {
        if (panel.classList.contains("scale-100")) {
            panel.classList.remove("scale-100", "opacity-100");
            panel.classList.add("scale-95", "opacity-0");
        } else {
            panel.classList.add("translate-y-full");
        }
    }
    
    const backdrop = el.querySelector("[id$='-backdrop']");
    if (backdrop) backdrop.classList.add("opacity-0");
    
    el.classList.add("opacity-0");
    setTimeout(() => {
        el.classList.remove("flex");
        el.classList.add("hidden");
    }, 300);
}


let currentMainFinanceMonth = new Date();

let financeMonthScrollTimeout = null;
let financeCarouselObserver = null;

function renderMonthCarousel() {
    const carousel = document.getElementById("finance-month-carousel");
    if (!carousel) return;
    
    // Only generate HTML if not initialized
    if (!carousel.hasAttribute("data-initialized")) {
        carousel.setAttribute("data-initialized", "true");
        
        const today = new Date();
        const startYear = today.getFullYear() - 1;
        const endYear = today.getFullYear() + 1;
        
        let html = '';
        const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
        
        for (let y = startYear; y <= endYear; y++) {
            for (let m = 0; m < 12; m++) {
                // Change min-w-full to min-w-[120px] to allow swiping to see parts of adjacent months
                html += `
                <div class="min-w-[120px] shrink-0 flex justify-center items-center py-3 snap-center month-snap-item cursor-pointer" data-year="${y}" data-month="${m}">
                    <button class="month-btn px-6 py-2 rounded-full bg-[#F7F9FF] text-xs font-bold text-[#64748B] transition-all" style="box-shadow: 4px 4px 8px #D1D9E6, -4px -4px 8px #FFFFFF;">
                        ${monthNames[m]} ${y !== today.getFullYear() ? y : ''}
                    </button>
                </div>
                `;
            }
        }
        
        carousel.innerHTML = html;

        // Click to scroll
        const items = carousel.querySelectorAll('.month-snap-item');
        items.forEach(item => {
            item.addEventListener('click', () => {
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            });
        });

        // Scroll listener to detect active center item
        carousel.addEventListener('scroll', () => {
            clearTimeout(financeMonthScrollTimeout);
            financeMonthScrollTimeout = setTimeout(() => {
                const carouselCenter = carousel.getBoundingClientRect().left + carousel.clientWidth / 2;
                let closestItem = null;
                let minDistance = Infinity;

                const currentItems = carousel.querySelectorAll('.month-snap-item');
                currentItems.forEach(item => {
                    const rect = item.getBoundingClientRect();
                    const itemCenter = rect.left + rect.width / 2;
                    const distance = Math.abs(carouselCenter - itemCenter);
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestItem = item;
                    }
                });

                if (closestItem) {
                    const year = parseInt(closestItem.getAttribute("data-year"));
                    const month = parseInt(closestItem.getAttribute("data-month"));
                    
                    if (currentMainFinanceMonth.getFullYear() !== year || currentMainFinanceMonth.getMonth() !== month) {
                        currentMainFinanceMonth.setFullYear(year, month, 1);
                        updateMonthStyles();
                        renderTransactions(true); // Re-render transactions on month change
                    }
                }
            }, 100);
        });
        
        // Ensure it scrolls to current month when it becomes visible
        if (!financeCarouselObserver) {
            financeCarouselObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const target = carousel.querySelector(`.month-snap-item[data-year="${currentMainFinanceMonth.getFullYear()}"][data-month="${currentMainFinanceMonth.getMonth()}"]`);
                        if (target) {
                            target.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
                        }
                    }
                });
            }, { threshold: 0.1 });
            financeCarouselObserver.observe(carousel);
        }
    }
    
    updateMonthStyles();
}

function updateMonthStyles() {
    const carousel = document.getElementById("finance-month-carousel");
    if (!carousel) return;
    
    const items = carousel.querySelectorAll('.month-snap-item');
    const targetY = currentMainFinanceMonth.getFullYear();
    const targetM = currentMainFinanceMonth.getMonth();
    
    items.forEach(item => {
        const btn = item.querySelector('.month-btn');
        const y = parseInt(item.getAttribute("data-year"));
        const m = parseInt(item.getAttribute("data-month"));
        
        if (y === targetY && m === targetM) {
            btn.classList.remove('text-[#64748B]');
            btn.classList.add('text-[#3B82F6]');
            btn.style.boxShadow = "inset 2px 2px 5px #D1D9E6, inset -2px -2px 5px #FFFFFF";
        } else {
            btn.classList.add('text-[#64748B]');
            btn.classList.remove('text-[#3B82F6]');
            btn.style.boxShadow = "4px 4px 8px #D1D9E6, -4px -4px 8px #FFFFFF";
        }
    });
}

function renderTransactions(isFromScroll = false) {
    if (!isFromScroll) renderMonthCarousel();
    
    const list = document.getElementById("finance-recent-transactions");
    const balanceEl = document.getElementById("finance-total-balance");
    const trendEl = document.getElementById("finance-monthly-trend");
    const ringEl = document.getElementById("finance-balance-ring");
    
    if(!list) return;
    
    const targetMonth = currentMainFinanceMonth.getMonth();
    const targetYear = currentMainFinanceMonth.getFullYear();
    
    const monthTxs = financeTransactions.filter(tx => {
        const d = new Date(tx.dateStr);
        return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    });
    
    let totalBalance = 0;
    let currentMonthBalance = 0; 
    let currentMonthIncome = 0;
    let currentMonthExpense = 0;
    
    const barsContainer = document.getElementById("finance-expense-bars");
    let categoryExpenses = {};

    monthTxs.forEach(tx => {
        const val = parseFloat(tx.amount) || 0;
        const change = tx.type === 'income' ? val : -val;
        totalBalance += change;
        currentMonthBalance += change;

        if (tx.type === 'expense') {
            currentMonthExpense += val;
            if (!categoryExpenses[tx.categoryId]) categoryExpenses[tx.categoryId] = 0;
            categoryExpenses[tx.categoryId] += val;
        } else {
            currentMonthIncome += val;
        }
    });

    if (barsContainer) {
        if (currentMonthExpense === 0) {
            barsContainer.innerHTML = '<div class="text-sm text-[#64748B] italic">Henüz harcama yok.</div>';
        } else {
            const sortedCats = Object.keys(categoryExpenses).sort((a, b) => categoryExpenses[b] - categoryExpenses[a]);
            const colorClasses = [
                'linear-gradient(to right, #A855F7, #3B82F6)', 
                'linear-gradient(to right, #3B82F6, #22C55E)', 
                'linear-gradient(to right, #A855F7, #22C55E)'
            ];
            const textColors = ['text-[#A855F7]', 'text-[#3B82F6]', 'text-[#22C55E]'];
            
            barsContainer.innerHTML = sortedCats.slice(0, 4).map((catId, index) => {
                const amount = categoryExpenses[catId];
                const percentage = Math.round((amount / currentMonthExpense) * 100);
                const catObj = financeCategories.find(c => c.id === catId) || { name: 'Genel' };
                const bg = colorClasses[index % colorClasses.length];
                const txtCol = textColors[index % textColors.length];
                
                return `
                <div class="flex flex-col gap-2">
                    <div class="flex justify-between items-center">
                        <span class="text-sm font-bold text-[#1E293B]">${catObj.name}</span>
                        <span class="text-sm font-bold ${txtCol}">${percentage}%</span>
                    </div>
                    <div class="h-2 w-full bg-[#E0E5EC] rounded-full relative overflow-hidden" style="box-shadow: inset 2px 2px 4px #D1D9E6, inset -2px -2px 4px #FFFFFF;">
                        <div class="absolute inset-y-0 left-0 rounded-full" style="width: ${percentage}%; background: ${bg};"></div>
                    </div>
                </div>
                `;
            }).join('');
        }
    }

    if(balanceEl) {
        balanceEl.textContent = formatCurrency(totalBalance);
    }
    
    if(trendEl) {
        if(currentMonthBalance > 0) {
            trendEl.innerHTML = `▲ +${formatCurrency(currentMonthBalance)} Bu Ay`;
            trendEl.className = "text-[10px] font-bold text-[#22C55E]";
            trendEl.parentElement.className = "mt-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#22C55E]/10";
        } else if (currentMonthBalance < 0) {
            trendEl.innerHTML = `▼ ${formatCurrency(currentMonthBalance)} Bu Ay`;
            trendEl.className = "text-[10px] font-bold text-red-500";
            trendEl.parentElement.className = "mt-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10";
        } else {
            trendEl.innerHTML = `Değişim Yok`;
            trendEl.className = "text-[10px] font-bold text-[#64748B]";
            trendEl.parentElement.className = "mt-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#64748B]/10";
        }
    }

    if (ringEl) {
        // Circumference is 314.159. offset 0 = full, 314.159 = empty
        // Let's make it represent income vs expense ratio. 
        // If expenses > income, it gets emptier.
        let ratio = 1;
        if (currentMonthIncome > 0) {
            ratio = Math.max(0, 1 - (currentMonthExpense / currentMonthIncome));
        } else if (currentMonthExpense > 0) {
            ratio = 0;
        }
        // minimum 5% to always show a bit if there's any activity
        if (currentMonthIncome > 0 || currentMonthExpense > 0) ratio = Math.max(0.05, ratio);
        
        const offset = 314.159 - (ratio * 314.159);
        ringEl.style.strokeDashoffset = offset;
    }
    
    if(monthTxs.length === 0) {
        list.innerHTML = `<div class="text-center text-[#64748B] text-sm py-4 font-medium">Henüz bir işlem bulunmuyor.</div>`;
        return;
    }
    
    list.innerHTML = "";
    const recent = monthTxs.slice(0, 5);
    
    recent.forEach(tx => {
        const cat = financeCategories.find(c => c.id === tx.categoryId) || { name: 'Genel', icon: 'payments', type: tx.type };
        const pm = financePaymentMethods.find(p => p.id === tx.paymentMethodId) || { name: 'Bilinmiyor', type: 'Nakit' };
        
        const isIncome = tx.type === 'income';
        const sign = isIncome ? "+" : "-";
        const valStr = formatCurrency(tx.amount);
        
        const dateObj = new Date(tx.dateStr);
        const dateFormatted = dateObj.getDate() + ' ' + ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"][dateObj.getMonth()];
        
        const iconColor = isIncome ? 'text-[#22C55E]' : 'text-[#3B82F6]';
        const valColor = isIncome ? 'text-[#22C55E]' : 'text-[#3B82F6]';
        
        const wrapper = document.createElement('div');
        wrapper.className = "relative w-full shrink-0 mb-4";
        
        const delBtn = document.createElement('button');
        delBtn.className = "absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-red-500 rounded-2xl text-white flex items-center justify-center z-0 active:bg-red-600 transition-colors";
        delBtn.innerHTML = `<span class="material-symbols-rounded text-xl">delete</span>`;
        delBtn.onclick = async (e) => {
            e.stopPropagation();
            try {
                await deleteDoc(doc(db, "users", currentUid, "finance_transactions", tx.id)).catch(e => { console.error('DB Error:', e); alert('Veritabanı işlemi sırasında bir hata oluştu.'); throw e; });
            } catch(err) {
                console.error("Silme Hatası:", err);
            }
        };

        const item = document.createElement('div');
        item.className = "relative flex items-center justify-between p-4 rounded-2xl bg-[#F7F9FF] z-10 transition-transform cursor-grab active:cursor-grabbing";
        item.style.boxShadow = "4px 4px 8px #D1D9E6, -4px -4px 8px #FFFFFF";
        item.innerHTML = `
            <div class="flex items-center gap-4 min-w-0 pointer-events-none">
                <div class="w-10 h-10 rounded-full bg-[#F7F9FF] flex items-center justify-center shrink-0" style="box-shadow: inset 2px 2px 5px #D1D9E6, inset -2px -2px 5px #FFFFFF;">
                    <span class="material-symbols-rounded ${iconColor}">${cat.icon}</span>
                </div>
                <div class="flex flex-col min-w-0">
                    <p class="text-sm font-bold text-[#1E293B] truncate">${tx.title}</p>
                    <div class="flex items-center gap-2">
                        <p class="text-xs text-[#64748B] whitespace-nowrap">${dateFormatted}</p>
                        <span class="text-[10px] px-1.5 py-0.5 rounded bg-[#E0E5EC] text-[#64748B] font-medium truncate max-w-[80px]">${pm.name}</span>
                    </div>
                </div>
            </div>
            <span class="font-bold ${valColor} whitespace-nowrap ml-2 pointer-events-none">${sign}${valStr}</span>
        `;
        
        let startX = 0;
        let currentX = 0;
        let isDragging = false;

        item.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isDragging = true;
            item.style.transition = 'none';
        }, {passive: true});

        item.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            currentX = e.touches[0].clientX;
            let diff = currentX - startX;
            if (diff > 0) diff = 0; 
            if (diff < -80) diff = -80;
            item.style.transform = `translateX(${diff}px)`;
        }, {passive: true});

        item.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            isDragging = false;
            item.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
            let diff = currentX - startX;
            if (diff < -40) {
                item.style.transform = `translateX(-80px)`; 
                setTimeout(() => {
                    document.addEventListener('touchstart', function closeSwipe(evt) {
                        if (!wrapper.contains(evt.target)) {
                            item.style.transform = `translateX(0px)`;
                            document.removeEventListener('touchstart', closeSwipe);
                        }
                    }, {passive: true});
                }, 100);
            } else {
                item.style.transform = `translateX(0px)`;
            }
        });

        // Click to Edit
        item.addEventListener('click', (e) => {
            if (Math.abs(currentX - startX) < 5) {
                e.stopPropagation();
                currentEditFinanceTxId = tx.id;
                openModal('finance-add-tx-modal');
                const titleEl = document.getElementById('tx-title');
                const amtEl = document.getElementById('tx-amount');
                if (titleEl) titleEl.value = tx.title;
                if (amtEl) amtEl.value = tx.amount;
                
                const typeRadios = document.querySelectorAll('input[name="tx-type"]');
                typeRadios.forEach(r => {
                    if(r.value === tx.type) r.checked = true;
                });
                currentTxType = tx.type;
                if (typeof renderCategoryOptions === 'function') {
                    renderCategoryOptions();
                }
                
                setTimeout(() => {
                    const catOpts = document.querySelectorAll('.tx-cat-btn');
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
                    });
                }, 50);

                const pmOpts = document.querySelectorAll('.tx-pm-btn');
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
                });
            }
        });

        wrapper.appendChild(delBtn);
        wrapper.appendChild(item);
        list.appendChild(wrapper);
    });
}

export function calcBalance(txs) {
    if(!txs) return 0;
    return txs.reduce((acc, tx) => {
        const val = parseFloat(tx.amount) || 0;
        return acc + (tx.type === 'income' ? val : -val);
    }, 0);
}


async function saveCategory() {
    if(!currentUid) return;
    
    const nameEl = document.getElementById('category-name');
    const iconEl = document.querySelector('.category-icon-option.selected');
    const colorEl = document.querySelector('.category-color-option.selected');
    
    if(!nameEl || !iconEl) return;
    
    const name = nameEl.value.trim();
    if(!name) {
        alert('Lütfen bir tür adı girin.');
        return;
    }
    
    const icon = iconEl.dataset.icon || 'receipt_long';
    const color = colorEl?.dataset?.color || "primary";
    
    const saveBtn = document.getElementById('finance-save-category-btn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = 'Kaydediliyor...';
    saveBtn.disabled = true;
    
    try {
        await addDoc(collection(db, "users", currentUid, "finance_categories"), {
            name,
            icon,
            color,
            createdAt: serverTimestamp()
        });
        
        saveBtn.innerHTML = `<span class="material-symbols-rounded">check_circle</span> Eklendi!`;
        saveBtn.classList.add("bg-gradient-to-r", "from-neon-purple", "to-neon-blue-container", "text-white-container");
        
        setTimeout(() => {
            saveBtn.innerHTML = originalText;
            saveBtn.classList.remove("bg-gradient-to-r", "from-neon-purple", "to-neon-blue-container", "text-white-container");
            saveBtn.disabled = false;
            
            // Clear inputs
            nameEl.value = '';
            
            closeModal('finance-add-category-modal');
        }, 1000);
    } catch(err) {
        console.error(err);
        alert('Kaydedilirken hata oluştu.');
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}


export function renderTxModalOptions() {
    const catContainer = document.getElementById('tx-category-container');
    const pmContainer = document.getElementById('tx-payment-container');
    
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
    
    const dateInput = document.getElementById('tx-date');
    if(dateInput && !dateInput.value) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        dateInput.value = `${yyyy}-${mm}-${dd}`;
    }
}

async function saveTransaction() {
    if(!currentUid) return;
    
    const amountEl = document.getElementById('tx-amount');
    const titleEl = document.getElementById('tx-title');
    const typeEl = document.querySelector('input[name="tx-type"]:checked');
    const dateEl = document.getElementById('tx-date');
    
    const activeCat = document.querySelector('.tx-cat-btn.selected');
    const activePm = document.querySelector('.tx-pm-btn.selected');
    
    if(!amountEl || !titleEl || !typeEl || !dateEl) return;
    
    const amount = parseFloat(amountEl.value);
    const title = titleEl.value.trim();
    const type = typeEl.value; // income or expense
    const dateStr = dateEl.value;
    
    if(!validatePositiveNumber(amount)) {
        alert('Lütfen geçerli bir tutar girin (Sıfırdan büyük olmalıdır).');
        return;
    }
    if(!title) {
        alert('Lütfen işlem adı girin.');
        return;
    }
    if(!activeCat) {
        alert('Lütfen bir kategori seçin.');
        return;
    }
    if(!activePm) {
        alert('Lütfen bir ödeme yöntemi seçin.');
        return;
    }
    
    const categoryId = activeCat.dataset.id;
    const paymentMethodId = activePm.dataset.id;
    
    const saveBtn = document.getElementById('finance-save-tx-btn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = 'Kaydediliyor...';
    saveBtn.disabled = true;
    
    try {
        const txData = {
            title,
            amount,
            type,
            categoryId,
            paymentMethodId,
            dateStr,
            updatedAt: serverTimestamp()
        };

        if (currentEditFinanceTxId) {
            await updateDoc(doc(db, "users", currentUid, "finance_transactions", currentEditFinanceTxId), txData).catch(e => { console.error('DB Error:', e); alert('Veritabanı işlemi sırasında bir hata oluştu.'); throw e; });
            currentEditFinanceTxId = null;
        } else {
            txData.createdAt = serverTimestamp();
            await addDoc(collection(db, "users", currentUid, "finance_transactions"), txData).catch(e => { console.error('DB Error:', e); alert('Veritabanı işlemi sırasında bir hata oluştu.'); throw e; });
        }
        
        saveBtn.innerHTML = `<span class="material-symbols-rounded">check_circle</span> Eklendi!`;
        saveBtn.classList.add("bg-gradient-to-r", "from-neon-purple", "to-neon-blue-container", "text-white-container");
        
        setTimeout(() => {
            saveBtn.innerHTML = originalText;
            saveBtn.classList.remove("bg-gradient-to-r", "from-neon-purple", "to-neon-blue-container", "text-white-container");
            saveBtn.disabled = false;
            
            // Clear inputs
            amountEl.value = '';
            titleEl.value = '';
            
            closeModal('finance-add-tx-modal');
        }, 1000);
    } catch(err) {
        console.error(err);
        alert('Kaydedilirken hata oluştu.');
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}


let currentDetailDate = new Date();

export function renderFinanceDetail() {
    // Labels & Buttons
    const monthLabel = document.getElementById('fd-month-label');
    const prevBtn = document.getElementById('fd-prev-month');
    const nextBtn = document.getElementById('fd-next-month');
    
    // Stats
    const netTotalEl = document.getElementById('fd-net-total');
    const incomeTotalEl = document.getElementById('fd-total-income');
    const expenseTotalEl = document.getElementById('fd-total-expense');
    const incomeCountEl = document.getElementById('fd-income-count');
    const expenseCountEl = document.getElementById('fd-expense-count');
    
    // Lists
    const incomeListEl = document.getElementById('fd-income-list');
    const expenseListEl = document.getElementById('fd-expense-list');
    const insightTextEl = document.getElementById('fd-insight-text');
    
    if(!monthLabel) return;
    
    // Setup listeners if not already
    if (!prevBtn.hasAttribute('data-listener')) {
        prevBtn.addEventListener('click', () => {
            currentDetailDate.setMonth(currentDetailDate.getMonth() - 1);
            renderFinanceDetail();
        });
        prevBtn.setAttribute('data-listener', 'true');
    }
    if (!nextBtn.hasAttribute('data-listener')) {
        nextBtn.addEventListener('click', () => {
            currentDetailDate.setMonth(currentDetailDate.getMonth() + 1);
            renderFinanceDetail();
        });
        nextBtn.setAttribute('data-listener', 'true');
    }

    // Format current month
    const monthOptions = { month: 'long', year: 'numeric' };
    const dateStrFormatted = currentDetailDate.toLocaleDateString('tr-TR', monthOptions);
    monthLabel.textContent = dateStrFormatted.charAt(0).toUpperCase() + dateStrFormatted.slice(1);
    
    // Filter transactions for this month
    const targetMonth = currentDetailDate.getMonth();
    const targetYear = currentDetailDate.getFullYear();
    
    const monthTxs = financeTransactions.filter(tx => {
        const d = new Date(tx.dateStr);
        return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    });
    
    const incomes = monthTxs.filter(tx => tx.type === 'income');
    const expenses = monthTxs.filter(tx => tx.type === 'expense');
    
    const totalIncome = incomes.reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);
    const totalExpense = expenses.reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);
    const netTotal = totalIncome - totalExpense;
    
        const tlFormatNoSymbol = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    
    netTotalEl.textContent = (netTotal >= 0 ? '+' : '') + formatCurrency(netTotal);
    netTotalEl.className = `font-display-lg text-display-lg ${netTotal >= 0 ? 'text-neon-blue' : 'text-error'}`;
    
    incomeTotalEl.textContent = tlFormatNoSymbol.format(totalIncome) + ' ₺';
    expenseTotalEl.textContent = tlFormatNoSymbol.format(totalExpense) + ' ₺';
    
    incomeCountEl.textContent = `${incomes.length} Kayıt`;
    
    // Render Incomes
    if(incomes.length === 0) {
        incomeListEl.innerHTML = '<div class="text-center text-sm text-on-surface-variant italic py-2">Henüz gelir yok</div>';
    } else {
        incomeListEl.innerHTML = incomes.map(tx => {
            const pm = financePaymentMethods.find(p => p.id === tx.paymentMethodId) || { name: 'Genel', icon: 'payments' };
            return `
            <div class="bg-background shadow-neo-lowest p-4 rounded-[32px] flex items-center justify-between shadow-sm border-l-4 border-primary mb-3 active:scale-98 transition-transform">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-[32px] bg-gradient-to-r from-neon-purple to-neon-blue/10 flex items-center justify-center">
                        <span class="material-symbols-rounded text-neon-blue">${pm.icon}</span>
                    </div>
                    <div>
                        <p class="font-body-lg text-body-lg font-semibold">${tx.title}</p>
                        <p class="font-label-sm text-label-sm text-on-surface-variant">${pm.name}</p>
                    </div>
                </div>
                <p class="font-headline-sm text-headline-sm text-neon-blue">${formatCurrency(tx.amount)}</p>
            </div>
            `;
        }).join('');
    }
    
    // Group Expenses by Category
    let categorySums = {};
    expenses.forEach(tx => {
        if(!categorySums[tx.categoryId]) categorySums[tx.categoryId] = 0;
        categorySums[tx.categoryId] += parseFloat(tx.amount || 0);
    });
    
    const sortedCatIds = Object.keys(categorySums).sort((a,b) => categorySums[b] - categorySums[a]);
    expenseCountEl.textContent = `${sortedCatIds.length} Kategori`;
    
    if(sortedCatIds.length === 0) {
        expenseListEl.innerHTML = '<div class="text-center text-sm text-on-surface-variant italic py-2">Henüz gider yok</div>';
        insightTextEl.textContent = 'Harika, hiç harcamanız yok!';
    } else {
        const topCatId = sortedCatIds[0];
        const topCat = financeCategories.find(c => c.id === topCatId) || { name: 'Genel', icon: 'receipt_long' };
        const topAmount = categorySums[topCatId];
        const topPercentage = Math.round((topAmount / totalExpense) * 100);
        
        insightTextEl.textContent = `${topCat.name}, toplam harcamalarınızın %${topPercentage}'ini oluşturuyor.`;
        
        const colors = ['tertiary', 'secondary', 'primary', 'error'];
        
        expenseListEl.innerHTML = sortedCatIds.map((catId, index) => {
            const amount = categorySums[catId];
            const cat = financeCategories.find(c => c.id === catId) || { name: 'Bilinmiyor', icon: 'more_horiz' };
            const cColor = colors[index % colors.length];
            return `
            <div class="flex items-center justify-between p-3 rounded-[32px] hover:bg-background shadow-neo-low transition-colors active:scale-98">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-${cColor}-fixed-dim/30 flex items-center justify-center">
                        <span class="material-symbols-rounded text-${cColor}">${cat.icon}</span>
                    </div>
                    <p class="font-body-lg text-body-lg">${cat.name}</p>
                </div>
                <p class="font-body-lg text-body-lg font-bold">${formatCurrency(amount)}</p>
            </div>
            `;
        }).join('');
    }

    // Chart.js render logic
    const chartCanvas = document.getElementById('finance-expense-chart');
    if (chartCanvas && typeof Chart !== 'undefined') {
        if (expenseChartInstance) {
            expenseChartInstance.destroy();
        }
        if (sortedCatIds.length > 0) {
            const chartLabels = sortedCatIds.map(id => {
                const cat = financeCategories.find(c => c.id === id);
                return cat ? cat.name : 'Bilinmiyor';
            });
            const chartData = sortedCatIds.map(id => categorySums[id]);
            const chartColors = ['#446554', '#ff8a80', '#d2b48c', '#a8e6cf', '#ffb7b2', '#ffcc80', '#b39ddb'];

            expenseChartInstance = new Chart(chartCanvas, {
                type: 'doughnut',
                data: {
                    labels: chartLabels,
                    datasets: [{
                        data: chartData,
                        backgroundColor: chartColors.slice(0, chartLabels.length),
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    cutout: '70%',
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return ' ' + context.label + ': ' + formatCurrency(context.raw);
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    // Group Expenses by Payment Method
    const paymentListEl = document.getElementById('fd-payment-list');
    if (paymentListEl) {
        let pmSums = {};
        expenses.forEach(tx => {
            if(!pmSums[tx.paymentMethodId]) pmSums[tx.paymentMethodId] = 0;
            pmSums[tx.paymentMethodId] += parseFloat(tx.amount || 0);
        });
        
        const sortedPmIds = Object.keys(pmSums).sort((a,b) => pmSums[b] - pmSums[a]);
        
        if (sortedPmIds.length === 0) {
            paymentListEl.innerHTML = '<div class="text-center text-sm text-on-surface-variant italic py-2">Veri yok</div>';
        } else {
            paymentListEl.innerHTML = sortedPmIds.map((pmId) => {
                const amount = pmSums[pmId];
                const pm = financePaymentMethods.find(p => p.id === pmId) || { name: 'Bilinmiyor', icon: 'payments' };
                return `
                <div class="flex items-center justify-between p-3 rounded-[32px] hover:bg-background shadow-neo-low transition-colors active:scale-98">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-r from-neon-purple to-neon-blue/10 flex items-center justify-center">
                            <span class="material-symbols-rounded text-neon-blue">${pm.icon}</span>
                        </div>
                        <p class="font-body-lg text-body-lg">${pm.name}</p>
                    </div>
                    <p class="font-body-lg text-body-lg font-bold">${formatCurrency(amount)}</p>
                </div>
                `;
            }).join('');
        }
    }
}

// ==================== METAL PRICES ====================

async function fetchMetalPrices() {
    const goldPriceEl = document.getElementById('metal-gold-price');
    const goldChangeEl = document.getElementById('metal-gold-change');
    const silverPriceEl = document.getElementById('metal-silver-price');
    const silverChangeEl = document.getElementById('metal-silver-change');

    if (!goldPriceEl || !silverPriceEl) return;

    // Show loading state
    goldPriceEl.textContent = '...';
    silverPriceEl.textContent = '...';

    try {
        // 1. Check Firestore cache first
        const cacheRef = doc(db, 'app', 'metalPrices');
        let cacheSnap = null;
        try {
            cacheSnap = await getDoc(cacheRef);
        } catch(e) {
            console.warn('Firestore cache read error, falling back to API:', e);
        }

        if (cacheSnap && cacheSnap.exists()) {
            const cached = cacheSnap.data();
            const cachedAt = cached.updatedAt?.toDate ? cached.updatedAt.toDate() : new Date(cached.updatedAt);
            const now = new Date();
            const diffMs = now - cachedAt;
            const THIRTY_MIN = 30 * 60 * 1000;

            if (diffMs < THIRTY_MIN && cached.gold && cached.silver) {
                // Cache is still fresh, use it
                renderMetalPrices(cached.gold, cached.silver);
                return;
            }
        }

        // 2. Cache expired or missing — fetch from CollectAPI
        const response = await fetch('https://api.collectapi.com/economy/goldPrice', {
            method: 'GET',
            headers: {
                'authorization': 'apikey ' + COLLECTAPI_KEY,
                'content-type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('API response: ' + response.status);
        }

        const data = await response.json();

        if (!data.success || !data.result) {
            throw new Error('API returned unsuccessful result');
        }

        // 3. Find gram altın and gram gümüş from result array
        let goldData = null;
        let silverData = null;

        for (const item of data.result) {
            const name = (item.name || '').toLowerCase();
            if (name.includes('gram') && name.includes('altın') && !name.includes('çeyrek') && !name.includes('yarım') && !name.includes('tam') && !name.includes('18') && !name.includes('14') && !name.includes('22')) {
                goldData = {
                    price: parseFloat(item.buying || item.selling || 0),
                    change: parseFloat(item.changeRate || 0)
                };
            }
            if (name.includes('gümüş')) {
                silverData = {
                    price: parseFloat(item.buying || item.selling || 0),
                    change: parseFloat(item.changeRate || 0)
                };
            }
        }

        // Fallback: if we didn't find exact match, try by index or broader match
        if (!goldData) {
            const gramAltin = data.result.find(i => (i.name || '').toLowerCase().includes('gram'));
            if (gramAltin) {
                goldData = {
                    price: parseFloat(gramAltin.buying || gramAltin.selling || 0),
                    change: parseFloat(gramAltin.changeRate || 0)
                };
            }
        }

        if (!goldData || !silverData) {
            throw new Error('Could not find gold/silver data in API response');
        }

        // 4. Write to Firestore cache (shared, not user-specific)
        try {
            await setDoc(cacheRef, {
                gold: goldData,
                silver: silverData,
                updatedAt: new Date()
            });
        } catch (cacheErr) {
            console.warn('Metal prices cache write failed (Firestore rules may need update):', cacheErr.message);
        }

        // 5. Render
        renderMetalPrices(goldData, silverData);

    } catch (err) {
        console.warn('Metal prices fetch failed:', err.message);
        if (goldPriceEl) goldPriceEl.textContent = 'Alınamıyor';
        if (silverPriceEl) silverPriceEl.textContent = 'Alınamıyor';
        if (goldChangeEl) goldChangeEl.textContent = '';
        if (silverChangeEl) silverChangeEl.textContent = '';
    }
}

function renderMetalPrices(gold, silver) {
    const goldPriceEl = document.getElementById('metal-gold-price');
    const goldChangeEl = document.getElementById('metal-gold-change');
    const silverPriceEl = document.getElementById('metal-silver-price');
    const silverChangeEl = document.getElementById('metal-silver-change');

    if (!goldPriceEl || !silverPriceEl) return;

    // Format prices
    const formatPrice = (val) => {
        if (!val || isNaN(val)) return '—';
        return new Intl.NumberFormat('tr-TR', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val) + ' TL';
    };

    goldPriceEl.textContent = formatPrice(gold.price);
    silverPriceEl.textContent = formatPrice(silver.price);

    // Format change percentages
    const formatChange = (el, val) => {
        if (!el) return;
        if (val === undefined || val === null || isNaN(val)) {
            el.textContent = '';
            return;
        }
        const abs = Math.abs(val).toFixed(1);
        if (val > 0) {
            el.textContent = `▲ ${abs}%`;
            el.className = 'text-label-sm font-label-sm font-bold text-neon-blue';
        } else if (val < 0) {
            el.textContent = `▼ ${abs}%`;
            el.className = 'text-label-sm font-label-sm font-bold text-error';
        } else {
            el.textContent = `— ${abs}%`;
            el.className = 'text-label-sm font-label-sm font-bold text-on-surface-variant';
        }
    };

    formatChange(goldChangeEl, gold.change);
    formatChange(silverChangeEl, silver.change);
}

async function resetFinanceData() {
    if (!currentUid) return;
    if (!confirm('Tüm finans verileriniz (kategoriler, ödeme yöntemleri ve işlemler) kalıcı olarak silinecektir. Emin misiniz?')) return;
    
    try {
        const batch = writeBatch(db);
        
        // Delete all transactions
        const txsRef = collection(db, "users", currentUid, "finance_transactions");
        const txsSnap = await getDocs(txsRef);
        txsSnap.forEach(docSnap => batch.delete(docSnap.ref));
        
        // Delete all payment methods
        const methodsRef = collection(db, "users", currentUid, "finance_payment_methods");
        const methodsSnap = await getDocs(methodsRef);
        methodsSnap.forEach(docSnap => batch.delete(docSnap.ref));
        
        // Delete all categories
        const catsRef = collection(db, "users", currentUid, "finance_categories");
        const catsSnap = await getDocs(catsRef);
        catsSnap.forEach(docSnap => batch.delete(docSnap.ref));
        
        await batch.commit();
        alert('Finans verileriniz başarıyla sıfırlandı.');
        // After deletion, the onSnapshot listeners will automatically trigger an empty render
    } catch(err) {
        console.error('Reset error:', err);
        alert('Sıfırlama işlemi sırasında bir hata oluştu.');
    }
}

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
                delBtn.innerHTML = `<span class="material-symbols-rounded text-xl">delete</span>`;
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

                item.addEventListener('touchstart', (e) => {
                    startX = e.touches[0].clientX;
                    isDragging = true;
                    item.style.transition = 'none';
                }, {passive: true});

                item.addEventListener('touchmove', (e) => {
                    if (!isDragging) return;
                    currentX = e.touches[0].clientX;
                    let diff = currentX - startX;
                    if (diff > 0) diff = 0; // only swipe left
                    if (diff < -80) diff = -80;
                    item.style.transform = `translateX(${diff}px)`;
                }, {passive: true});

                item.addEventListener('touchend', (e) => {
                    isDragging = false;
                    item.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
                    let diff = currentX - startX;
                    if (diff < -40) {
                        item.style.transform = `translateX(-80px)`; // stay open to show delete btn
                        setTimeout(() => {
                            document.addEventListener('touchstart', function closeSwipe(evt) {
                                if (!wrapper.contains(evt.target)) {
                                    item.style.transform = `translateX(0px)`;
                                    document.removeEventListener('touchstart', closeSwipe);
                                }
                            }, {passive: true});
                        }, 100);
                    } else {
                        item.style.transform = `translateX(0px)`;
                    }
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
                delBtn.innerHTML = `<span class="material-symbols-rounded text-xl">delete</span>`;
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

                item.addEventListener('touchstart', (e) => {
                    startX = e.touches[0].clientX;
                    isDragging = true;
                    item.style.transition = 'none';
                }, {passive: true});

                item.addEventListener('touchmove', (e) => {
                    if (!isDragging) return;
                    currentX = e.touches[0].clientX;
                    let diff = currentX - startX;
                    if (diff > 0) diff = 0; // only swipe left
                    if (diff < -80) diff = -80;
                    item.style.transform = `translateX(${diff}px)`;
                }, {passive: true});

                item.addEventListener('touchend', (e) => {
                    isDragging = false;
                    item.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
                    let diff = currentX - startX;
                    if (diff < -40) {
                        item.style.transform = `translateX(-80px)`; // stay open to show delete btn
                        setTimeout(() => {
                            document.addEventListener('touchstart', function closeSwipe(evt) {
                                if (!wrapper.contains(evt.target)) {
                                    item.style.transform = `translateX(0px)`;
                                    document.removeEventListener('touchstart', closeSwipe);
                                }
                            }, {passive: true});
                        }, 100);
                    } else {
                        item.style.transform = `translateX(0px)`;
                    }
                });

                wrapper.appendChild(delBtn);
                wrapper.appendChild(item);
                pmContainer.appendChild(wrapper);
            });
        }
    }
}
