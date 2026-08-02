import { auth, db } from "./firebase-config.js";
import { collection, doc, addDoc, setDoc, getDocs, query, orderBy, limit, serverTimestamp, onSnapshot, where } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

let currentUid = null;
let callback = null;

let financeCategories = [];
let financePaymentMethods = [];
let financeTransactions = [];

let unsubCategories = null;
let unsubPaymentMethods = null;
let unsubTransactions = null;

export function initFinance(uid, onChangeCallback) {
    currentUid = uid;
    callback = onChangeCallback;
    
    // 1. Load Categories
    const categoriesRef = collection(db, "users", uid, "finance_categories");
    unsubCategories = onSnapshot(categoriesRef, (snap) => {
        financeCategories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderTransactions();
        renderTxModalOptions();
        if (typeof renderFinanceDetail !== "undefined") renderFinanceDetail();
    });

    // 2. Load Payment Methods
    const paymentMethodsRef = collection(db, "users", uid, "finance_payment_methods");
    unsubPaymentMethods = onSnapshot(paymentMethodsRef, (snap) => {
        financePaymentMethods = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderTransactions();
        renderTxModalOptions();
        if (typeof renderFinanceDetail !== "undefined") renderFinanceDetail();
    });

    // 3. Load Transactions
    const txRef = collection(db, "users", uid, "finance_transactions");
    const q = query(txRef, orderBy("dateStr", "desc"));
    
    unsubTransactions = onSnapshot(q, (snap) => {
        financeTransactions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderTransactions();
        renderTxModalOptions();
        if (typeof renderFinanceDetail !== "undefined") renderFinanceDetail();
        if(callback) callback(financeTransactions);
    });
    
    setupFinanceModals();
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
}

function setupFinanceModals() {
    // Expose open/close functions globally for inline onclicks
    window.openAddTransactionModal = () => openModal('finance-add-tx-modal');
    window.closeAddTransactionModal = () => closeModal('finance-add-tx-modal');
    
    window.openAddCategoryModal = () => openModal('finance-add-category-modal');
    window.closeAddCategoryModal = () => closeModal('finance-add-category-modal');
    
    window.openAddPaymentMethodModal = () => openModal('finance-add-payment-modal');
    window.closeAddPaymentMethodModal = () => closeModal('finance-add-payment-modal');
    // Payment Icon Selection
    const paymentIcons = document.querySelectorAll('.payment-icon-option');
    paymentIcons.forEach(iconEl => {
        iconEl.addEventListener('click', () => {
            paymentIcons.forEach(el => {
                el.classList.remove('selected', 'bg-primary', 'text-on-primary', 'shadow-md', 'scale-105');
                el.classList.add('bg-surface', 'border', 'border-surface-variant', 'text-on-surface-variant', 'hover:bg-surface-container-low');
                const span = el.querySelector('span');
                if(span) span.style.fontVariationSettings = "'FILL' 0";
            });
            iconEl.classList.add('selected', 'bg-primary', 'text-on-primary', 'shadow-md', 'scale-105');
            iconEl.classList.remove('bg-surface', 'border', 'border-surface-variant', 'text-on-surface-variant', 'hover:bg-surface-container-low');
            const span = iconEl.querySelector('span');
            if(span) span.style.fontVariationSettings = "'FILL' 1";
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
                el.classList.remove('selected', 'bg-primary', 'text-on-primary', 'shadow-sm');
                el.classList.add('bg-surface-container', 'text-on-surface', 'hover:bg-surface-container-high');
                const span = el.querySelector('span');
                if(span) span.style.fontVariationSettings = "'FILL' 0";
            });
            iconEl.classList.add('selected', 'bg-primary', 'text-on-primary', 'shadow-sm');
            iconEl.classList.remove('bg-surface-container', 'text-on-surface', 'hover:bg-surface-container-high');
            const span = iconEl.querySelector('span');
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
            colorEl.innerHTML = '<span class="material-symbols-outlined text-on-primary">check</span>';
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
        
        saveBtn.innerHTML = `<span class="material-symbols-outlined">check_circle</span> Eklendi!`;
        saveBtn.classList.add("bg-primary-container", "text-on-primary-container");
        
        setTimeout(() => {
            saveBtn.innerHTML = originalText;
            saveBtn.classList.remove("bg-primary-container", "text-on-primary-container");
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
        const panel = el.querySelector("div");
        if(panel) panel.classList.remove("translate-y-full");
    });
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add("opacity-0");
    const panel = el.querySelector("div");
    if(panel) panel.classList.add("translate-y-full");
    setTimeout(() => {
        el.classList.remove("flex");
        el.classList.add("hidden");
    }, 300);
}

function renderTransactions() {
    const list = document.getElementById("finance-recent-transactions");
    const balanceEl = document.getElementById("finance-total-balance");
    const trendEl = document.getElementById("finance-monthly-trend");
    
    if(!list) return;
    
    // Calculate balances
    let totalBalance = 0;
    let currentMonthBalance = 0;
    
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const barsContainer = document.getElementById("finance-expense-bars");
    let categoryExpenses = {};
    let totalExpense = 0;

    
    financeTransactions.forEach(tx => {
        const val = parseFloat(tx.amount) || 0;
        const change = tx.type === 'income' ? val : -val;
        totalBalance += change;

        if (tx.type === 'expense') {
            totalExpense += val;
            if (!categoryExpenses[tx.categoryId]) {
                categoryExpenses[tx.categoryId] = 0;
            }
            categoryExpenses[tx.categoryId] += val;
        }

        
        const txDate = new Date(tx.dateStr);
        if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
            currentMonthBalance += change;
        }
    });
    
    
    if (barsContainer) {
        if (totalExpense === 0) {
            barsContainer.innerHTML = '<div class="text-sm text-outline-variant italic">Henüz harcama yok.</div>';
        } else {
            const sortedCats = Object.keys(categoryExpenses).sort((a, b) => categoryExpenses[b] - categoryExpenses[a]);
            const colorClasses = ['bg-primary', 'bg-secondary', 'bg-tertiary-container', 'bg-error', 'bg-primary-container'];
            
            barsContainer.innerHTML = sortedCats.slice(0, 4).map((catId, index) => {
                const amount = categoryExpenses[catId];
                const percentage = Math.round((amount / totalExpense) * 100);
                const catObj = financeCategories.find(c => c.id === catId) || { name: 'Genel' };
                const colorClass = colorClasses[index % colorClasses.length];
                
                return `
                <div class="flex flex-col gap-1">
                    <div class="flex justify-between items-center">
                        <span class="font-label-sm text-label-sm text-on-surface">${catObj.name}</span>
                        <span class="font-label-sm text-label-sm text-on-surface-variant">${percentage}%</span>
                    </div>
                    <div class="w-full bg-surface-container-high rounded-full h-2">
                        <div class="${colorClass} h-2 rounded-full" style="width: ${percentage}%"></div>
                    </div>
                </div>
                `;
            }).join('');
        }
    }

    // Format balance
    const tlFormat = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' });
    if(balanceEl) {
        balanceEl.textContent = tlFormat.format(totalBalance);
    }
    
    if(trendEl) {
        if(currentMonthBalance > 0) {
            trendEl.innerHTML = `
                <span class="material-symbols-outlined text-primary bg-primary-container rounded-full p-1 text-sm" style="font-variation-settings: 'FILL' 1;">trending_up</span>
                <span class="font-body-md text-body-md text-primary">+${tlFormat.format(currentMonthBalance)} (Bu Ay)</span>
            `;
        } else if (currentMonthBalance < 0) {
            trendEl.innerHTML = `
                <span class="material-symbols-outlined text-error bg-error-container rounded-full p-1 text-sm" style="font-variation-settings: 'FILL' 1;">trending_down</span>
                <span class="font-body-md text-body-md text-error">${tlFormat.format(currentMonthBalance)} (Bu Ay)</span>
            `;
        } else {
            trendEl.innerHTML = `
                <span class="material-symbols-outlined text-outline bg-surface-variant rounded-full p-1 text-sm" style="font-variation-settings: 'FILL' 1;">trending_flat</span>
                <span class="font-body-md text-body-md text-outline">Değişim Yok (Bu Ay)</span>
            `;
        }
    }
    
    if(financeTransactions.length === 0) {
        list.innerHTML = `<div class="text-center text-outline text-sm py-4">Henüz bir işlem bulunmuyor.</div>`;
        return;
    }
    
    list.innerHTML = "";
    // Only show last 5 in recent activity
    const recentTx = financeTransactions.slice(0, 5);
    
    recentTx.forEach(tx => {
        const cat = financeCategories.find(c => c.id === tx.categoryId) || { name: 'Genel', icon: 'payments', type: tx.type, color: 'surface-container-high' };
        const pm = financePaymentMethods.find(p => p.id === tx.paymentMethodId) || { name: 'Bilinmiyor', type: 'Nakit' };
        
        const isIncome = tx.type === 'income';
        const sign = isIncome ? "+" : "-";
        const valStr = tlFormat.format(tx.amount);
        
        const dateObj = new Date(tx.dateStr);
        const dateFormatted = dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
        
        // Dynamic colors based on type
        const iconBg = isIncome ? 'bg-primary-container' : 'bg-surface-container-high';
        const iconColor = isIncome ? 'text-on-primary-container' : 'text-on-surface-variant';
        const valColor = isIncome ? 'text-primary' : 'text-on-surface';
        
        // Payment badge
        const pmBadgeClass = isIncome 
            ? "bg-primary-container/20 text-primary border-primary/20" 
            : "bg-surface-container-high text-on-surface-variant border-outline-variant";
            
        list.innerHTML += `
            <div class="bg-surface-container-lowest shadow-[0px_4px_20px_rgba(0,0,0,0.04)] rounded-[16px] p-4 flex items-center justify-between active:scale-98 transition-transform duration-100 ease-in-out">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-full ${iconBg} flex items-center justify-center">
                        <span class="material-symbols-outlined ${iconColor}" style="font-variation-settings: 'FILL' 0;">${cat.icon}</span>
                    </div>
                    <div class="flex flex-col">
                        <span class="font-label-md text-label-md text-on-surface">${tx.title}</span>
                        <div class="flex items-center gap-2 mt-1">
                            <span class="font-body-md text-body-md text-on-surface-variant text-xs">${cat.name}</span>
                            <span class="text-on-surface-variant text-xs">•</span>
                            <span class="${pmBadgeClass} text-[10px] font-bold px-2 py-0.5 rounded-lg border uppercase tracking-tight">${pm.type}</span>
                        </div>
                    </div>
                </div>
                <div class="flex flex-col items-end">
                    <span class="font-label-md text-label-md ${valColor}">${sign}${valStr}</span>
                    <span class="font-label-sm text-label-sm text-on-surface-variant mt-1">${dateFormatted}</span>
                </div>
            </div>
        `;
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
    
    if(!nameEl || !iconEl || !colorEl) return;
    
    const name = nameEl.value.trim();
    if(!name) {
        alert('Lütfen bir tür adı girin.');
        return;
    }
    
    const icon = iconEl.dataset.icon || 'receipt_long';
    const color = colorEl.dataset.color || 'primary';
    
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
        
        saveBtn.innerHTML = `<span class="material-symbols-outlined">check_circle</span> Eklendi!`;
        saveBtn.classList.add("bg-primary-container", "text-on-primary-container");
        
        setTimeout(() => {
            saveBtn.innerHTML = originalText;
            saveBtn.classList.remove("bg-primary-container", "text-on-primary-container");
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
    
    if (catContainer) {
        if (financeCategories.length === 0) {
            catContainer.innerHTML = '<div class="text-sm text-outline-variant py-2">Önce kategori ekleyin.</div>';
        } else {
            catContainer.innerHTML = financeCategories.map((c, idx) => `
                <button class="tx-cat-btn flex items-center gap-2 px-4 py-2 rounded-full ${idx === 0 ? 'bg-primary-container text-on-primary-container border-transparent' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-variant border-transparent'} shrink-0 snap-start transition-colors active:scale-95 border-2" data-id="${c.id}">
                    <span class="material-symbols-outlined text-[18px]">${c.icon || 'category'}</span>
                    <span class="font-label-md text-label-md">${c.name}</span>
                </button>
            `).join('');
            
            // Add Listeners
            document.querySelectorAll('.tx-cat-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.tx-cat-btn').forEach(b => {
                        b.classList.remove('bg-primary-container', 'text-on-primary-container');
                        b.classList.add('bg-surface-container-high', 'text-on-surface-variant');
                    });
                    btn.classList.add('bg-primary-container', 'text-on-primary-container');
                    btn.classList.remove('bg-surface-container-high', 'text-on-surface-variant');
                });
            });
        }
    }
    
    if (pmContainer) {
        if (financePaymentMethods.length === 0) {
            pmContainer.innerHTML = '<div class="text-sm text-outline-variant py-2">Önce ödeme yöntemi ekleyin.</div>';
        } else {
            pmContainer.innerHTML = financePaymentMethods.map((p, idx) => `
                <div class="tx-pm-btn flex items-center justify-between p-3 rounded-xl border-2 ${idx === 0 ? 'border-primary bg-primary-fixed-dim/10' : 'border-transparent bg-surface-container-high hover:bg-surface-variant'} cursor-pointer transition-transform active:scale-95" data-id="${p.id}">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined ${idx === 0 ? 'text-primary' : 'text-on-surface-variant'}">${p.icon || 'credit_card'}</span>
                        <span class="font-label-md text-label-md ${idx === 0 ? 'text-on-surface' : 'text-on-surface-variant'}">${p.name}</span>
                    </div>
                    ${idx === 0 ? '<span class="material-symbols-outlined text-primary text-[16px] check-icon" style="font-variation-settings: \'FILL\' 1;">check_circle</span>' : ''}
                </div>
            `).join('');
            
            // Add Listeners
            document.querySelectorAll('.tx-pm-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.tx-pm-btn').forEach(b => {
                        b.classList.remove('border-primary', 'bg-primary-fixed-dim/10');
                        b.classList.add('border-transparent', 'bg-surface-container-high', 'text-on-surface-variant');
                        const icon1 = b.querySelector('.material-symbols-outlined:first-child');
                        const text = b.querySelector('.font-label-md');
                        const check = b.querySelector('.check-icon');
                        if (icon1) { icon1.classList.remove('text-primary'); icon1.classList.add('text-on-surface-variant'); }
                        if (text) { text.classList.remove('text-on-surface'); text.classList.add('text-on-surface-variant'); }
                        if (check) check.remove();
                    });
                    
                    btn.classList.add('border-primary', 'bg-primary-fixed-dim/10');
                    btn.classList.remove('border-transparent', 'bg-surface-container-high', 'text-on-surface-variant');
                    const icon1 = btn.querySelector('.material-symbols-outlined:first-child');
                    const text = btn.querySelector('.font-label-md');
                    if (icon1) { icon1.classList.add('text-primary'); icon1.classList.remove('text-on-surface-variant'); }
                    if (text) { text.classList.add('text-on-surface'); text.classList.remove('text-on-surface-variant'); }
                    
                    if (!btn.querySelector('.check-icon')) {
                        btn.insertAdjacentHTML('beforeend', '<span class="material-symbols-outlined text-primary text-[16px] check-icon" style="font-variation-settings: \'FILL\' 1;">check_circle</span>');
                    }
                });
            });
        }
    }
    
    // Set default date
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
    
    const activeCat = document.querySelector('.tx-cat-btn.bg-primary-container');
    const activePm = document.querySelector('.tx-pm-btn.border-primary');
    
    if(!amountEl || !titleEl || !typeEl || !dateEl) return;
    
    const amount = parseFloat(amountEl.value);
    const title = titleEl.value.trim();
    const type = typeEl.value; // income or expense
    const dateStr = dateEl.value;
    
    if(isNaN(amount) || amount <= 0) {
        alert('Lütfen geçerli bir tutar girin.');
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
        await addDoc(collection(db, "users", currentUid, "finance_transactions"), {
            title,
            amount,
            type,
            categoryId,
            paymentMethodId,
            dateStr,
            createdAt: serverTimestamp()
        });
        
        saveBtn.innerHTML = `<span class="material-symbols-outlined">check_circle</span> Eklendi!`;
        saveBtn.classList.add("bg-primary-container", "text-on-primary-container");
        
        setTimeout(() => {
            saveBtn.innerHTML = originalText;
            saveBtn.classList.remove("bg-primary-container", "text-on-primary-container");
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
    
    const tlFormat = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' });
    const tlFormatNoSymbol = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    
    netTotalEl.textContent = (netTotal >= 0 ? '+' : '') + tlFormat.format(netTotal);
    netTotalEl.className = `font-display-lg text-display-lg ${netTotal >= 0 ? 'text-primary' : 'text-error'}`;
    
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
            <div class="bg-surface-container-lowest p-4 rounded-2xl flex items-center justify-between custom-shadow border-l-4 border-primary mb-3 active:scale-98 transition-transform">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <span class="material-symbols-outlined text-primary">${pm.icon}</span>
                    </div>
                    <div>
                        <p class="font-body-lg text-body-lg font-semibold">${tx.title}</p>
                        <p class="font-label-sm text-label-sm text-on-surface-variant">${pm.name}</p>
                    </div>
                </div>
                <p class="font-headline-sm text-headline-sm text-primary">${tlFormat.format(tx.amount)}</p>
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
            <div class="flex items-center justify-between p-3 rounded-2xl hover:bg-surface-container-low transition-colors active:scale-98">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-${cColor}-fixed-dim/30 flex items-center justify-center">
                        <span class="material-symbols-outlined text-${cColor}">${cat.icon}</span>
                    </div>
                    <p class="font-body-lg text-body-lg">${cat.name}</p>
                </div>
                <p class="font-body-lg text-body-lg font-bold">${tlFormat.format(amount)}</p>
            </div>
            `;
        }).join('');
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
                <div class="flex items-center justify-between p-3 rounded-2xl hover:bg-surface-container-low transition-colors active:scale-98">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span class="material-symbols-outlined text-primary">${pm.icon}</span>
                        </div>
                        <p class="font-body-lg text-body-lg">${pm.name}</p>
                    </div>
                    <p class="font-body-lg text-body-lg font-bold">${tlFormat.format(amount)}</p>
                </div>
                `;
            }).join('');
        }
    }
}
window.renderFinanceDetail = renderFinanceDetail;

