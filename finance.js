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

let unsubCategories = null;
let unsubPaymentMethods = null;
let unsubTransactions = null;

export function initFinance(uid, onChangeCallback) {
    currentUid = uid;
    callback = onChangeCallback;
    
    // 1. Load Categories
    const categoriesRef = collection(db, "users", uid, "finance_categories");
    unsubCategories = registerListener(onSnapshot(categoriesRef, (snap) => {
        financeCategories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderTransactions();
        renderTxModalOptions();
        if (typeof renderFinanceDetail !== "undefined") renderFinanceDetail();
    }));

    // 2. Load Payment Methods
    const paymentMethodsRef = collection(db, "users", uid, "finance_payment_methods");
    unsubPaymentMethods = registerListener(onSnapshot(paymentMethodsRef, (snap) => {
        financePaymentMethods = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderTransactions();
        renderTxModalOptions();
        if (typeof renderFinanceDetail !== "undefined") renderFinanceDetail();
    }));

    // 3. Load Transactions
    const txRef = collection(db, "users", uid, "finance_transactions");
    const q = query(txRef, orderBy("dateStr", "desc"));
    
    unsubTransactions = registerListener(onSnapshot(q, (snap) => {
        financeTransactions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderTransactions();
        renderTxModalOptions();
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


let currentMainFinanceMonth = new Date();

function renderTransactions() {
    const list = document.getElementById("finance-recent-transactions");
    const balanceEl = document.getElementById("finance-total-balance");
    const trendEl = document.getElementById("finance-monthly-trend");
    
    // Main Page Month Selector
    const mainMonthLabel = document.getElementById('finance-month-label');
    const mainPrevBtn = document.getElementById('finance-prev-month');
    const mainNextBtn = document.getElementById('finance-next-month');
    
    if (mainMonthLabel) {
        if (mainPrevBtn && !mainPrevBtn.hasAttribute('data-listener')) {
            mainPrevBtn.addEventListener('click', () => {
                currentMainFinanceMonth.setMonth(currentMainFinanceMonth.getMonth() - 1);
                renderTransactions();
            });
            mainPrevBtn.setAttribute('data-listener', 'true');
        }
        if (mainNextBtn && !mainNextBtn.hasAttribute('data-listener')) {
            mainNextBtn.addEventListener('click', () => {
                currentMainFinanceMonth.setMonth(currentMainFinanceMonth.getMonth() + 1);
                renderTransactions();
            });
            mainNextBtn.setAttribute('data-listener', 'true');
        }
        
        const monthOptions = { month: 'long', year: 'numeric' };
        const dateStrFormatted = currentMainFinanceMonth.toLocaleDateString('tr-TR', monthOptions);
        mainMonthLabel.textContent = dateStrFormatted.charAt(0).toUpperCase() + dateStrFormatted.slice(1);
    }
    
    if(!list) return;
    
    // Filter transactions for current selected month
    const targetMonth = currentMainFinanceMonth.getMonth();
    const targetYear = currentMainFinanceMonth.getFullYear();
    
    const monthTxs = financeTransactions.filter(tx => {
        const d = new Date(tx.dateStr);
        return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    });
    
    // Calculate balances
    let totalBalance = 0;
    let currentMonthBalance = 0; // Same as total for the view
    
    const barsContainer = document.getElementById("finance-expense-bars");
    let categoryExpenses = {};
    let totalExpense = 0;

    monthTxs.forEach(tx => {
        const val = parseFloat(tx.amount) || 0;
        const change = tx.type === 'income' ? val : -val;
        totalBalance += change;
        currentMonthBalance += change;

        if (tx.type === 'expense') {
            totalExpense += val;
            if (!categoryExpenses[tx.categoryId]) {
                categoryExpenses[tx.categoryId] = 0;
            }
            categoryExpenses[tx.categoryId] += val;
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
        if(balanceEl) {
        balanceEl.textContent = formatCurrency(totalBalance);
    }
    
    if(trendEl) {
        if(currentMonthBalance > 0) {
            trendEl.innerHTML = `
                <span class="material-symbols-outlined text-primary bg-primary-container rounded-full p-1 text-sm" style="font-variation-settings: 'FILL' 1;">trending_up</span>
                <span class="font-body-md text-body-md text-primary">+${formatCurrency(currentMonthBalance)} (Bu Ay)</span>
            `;
        } else if (currentMonthBalance < 0) {
            trendEl.innerHTML = `
                <span class="material-symbols-outlined text-error bg-error-container rounded-full p-1 text-sm" style="font-variation-settings: 'FILL' 1;">trending_down</span>
                <span class="font-body-md text-body-md text-error">${formatCurrency(currentMonthBalance)} (Bu Ay)</span>
            `;
        } else {
            trendEl.innerHTML = `
                <span class="material-symbols-outlined text-outline bg-surface-variant rounded-full p-1 text-sm" style="font-variation-settings: 'FILL' 1;">trending_flat</span>
                <span class="font-body-md text-body-md text-outline">Değişim Yok (Bu Ay)</span>
            `;
        }
    }
    
    if(monthTxs.length === 0) {
        list.innerHTML = `<div class="text-center text-outline text-sm py-4">Henüz bir işlem bulunmuyor.</div>`;
        return;
    }
    
    list.innerHTML = "";
    // Only show last 5 in recent activity
    const recent = monthTxs.slice(0, 5);
    
    recent.forEach(tx => {
        const cat = financeCategories.find(c => c.id === tx.categoryId) || { name: 'Genel', icon: 'payments', type: tx.type, color: 'surface-container-high' };
        const pm = financePaymentMethods.find(p => p.id === tx.paymentMethodId) || { name: 'Bilinmiyor', type: 'Nakit' };
        
        const isIncome = tx.type === 'income';
        const sign = isIncome ? "+" : "-";
        const valStr = formatCurrency(tx.amount);
        
        const dateObj = new Date(tx.dateStr);
        const dateFormatted = formatDate(dateObj, { day: 'numeric', month: 'long' });
        
        // Dynamic colors based on type
        const iconBg = isIncome ? 'bg-primary-container' : 'bg-surface-container-high';
        const iconColor = isIncome ? 'text-on-primary-container' : 'text-on-surface-variant';
        const valColor = isIncome ? 'text-primary' : 'text-on-surface';
        
        // Payment badge
        const pmBadgeClass = isIncome 
            ? "bg-primary-container/20 text-primary border-primary/20" 
            : "bg-surface-container-high text-on-surface-variant border-outline-variant";
            
        const div = document.createElement("div");
        div.className = "bg-surface-container-lowest shadow-sm rounded-2xl p-4 flex items-center justify-between active:scale-98 transition-transform duration-100 ease-in-out relative group";
        
        const actionsDiv = document.createElement("div");
        actionsDiv.className = "absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-surface-container-lowest/90 px-2 py-1 rounded-full shadow-sm";
        
        const editBtn = document.createElement('button');
        editBtn.className = "p-2 text-primary hover:bg-primary-container/20 rounded-full active:scale-95 transition-colors";
        editBtn.innerHTML = `<span class="material-symbols-outlined text-sm">edit</span>`;
        editBtn.onclick = (e) => {
            e.stopPropagation();
            window.currentEditFinanceTxId = tx.id;
            const titleEl = document.getElementById('tx-title');
            const amtEl = document.getElementById('tx-amount');
            if (titleEl) titleEl.value = tx.title;
            if (amtEl) amtEl.value = tx.amount;
            
            // set type
            const typeRadios = document.querySelectorAll('input[name="tx-type"]');
            typeRadios.forEach(r => {
                if(r.value === tx.type) r.checked = true;
            });
            window.currentTxType = tx.type;
            if (typeof window.renderCategoryOptions === 'function') {
                window.renderCategoryOptions();
            }
            
            setTimeout(() => {
                const catOpts = document.querySelectorAll('.tx-cat-btn');
                catOpts.forEach(o => {
                    if(o.dataset.id === tx.categoryId) {
                        o.classList.add('bg-primary-container', 'border-primary', 'text-on-primary-container');
                        o.classList.remove('bg-surface', 'border-surface-variant', 'text-on-surface');
                    } else {
                        o.classList.remove('bg-primary-container', 'border-primary', 'text-on-primary-container');
                        o.classList.add('bg-surface', 'border-surface-variant', 'text-on-surface');
                    }
                });
            }, 50);

            const pmOpts = document.querySelectorAll('.tx-pm-btn');
            pmOpts.forEach(o => {
                if(o.dataset.id === tx.paymentMethodId) {
                    o.classList.add('border-primary', 'bg-primary/5');
                    o.classList.remove('border-surface-variant');
                } else {
                    o.classList.remove('border-primary', 'bg-primary/5');
                    o.classList.add('border-surface-variant');
                }
            });

            const modal = document.getElementById("finance-add-tx-modal");
            if (modal) {
                modal.classList.remove("hidden");
                void modal.offsetWidth;
                modal.classList.remove("opacity-0");
                const panel = modal.querySelector("div");
                if (panel) panel.classList.remove("translate-y-full");
            }
        };

        const delBtn = document.createElement('button');
        delBtn.className = "p-2 text-error hover:bg-error-container/20 rounded-full active:scale-95 transition-colors";
        delBtn.innerHTML = `<span class="material-symbols-outlined text-sm">delete</span>`;
        delBtn.onclick = async (e) => {
            e.stopPropagation();
            try {
                await deleteDoc(doc(db, "users", currentUid, "finance_transactions", tx.id));
            } catch(err) {
                console.error("Silme Hatası:", err);
            }
        };

        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(delBtn);

        div.innerHTML = `
            <div class="flex items-center gap-3 min-w-0 flex-1">
                <div class="w-11 h-11 shrink-0 rounded-full ${iconBg} flex items-center justify-center">
                    <span class="material-symbols-outlined ${iconColor} icon-md" style="font-variation-settings: 'FILL' 0;">${cat.icon}</span>
                </div>
                <div class="flex flex-col min-w-0">
                    <span class="font-label-md text-label-md text-on-surface truncate">${tx.title}</span>
                    <span class="font-body-md text-body-md text-on-surface-variant text-label-sm mt-0.5 truncate">${cat.name}</span>
                </div>
            </div>
            <div class="flex flex-col items-end shrink-0 ml-2">
                <span class="font-label-md text-label-md ${valColor} whitespace-nowrap">${sign}${valStr}</span>
                <div class="flex items-center gap-1.5 mt-1">
                    <span class="${pmBadgeClass} text-label-sm font-bold badge-outline">${pm.type}</span>
                    <span class="font-label-sm text-label-sm text-on-surface-variant text-label-sm whitespace-nowrap">${dateFormatted}</span>
                </div>
                <div class="flex items-center gap-0.5 mt-1.5">
                    <button class="edit-tx-btn p-1 text-primary hover:bg-primary-container/20 rounded-full active:scale-95 transition-colors" data-id="${tx.id}">
                        <span class="material-symbols-outlined text-lg">edit</span>
                    </button>
                    <button class="del-tx-btn p-1 text-error hover:bg-error-container/20 rounded-full active:scale-95 transition-colors" data-id="${tx.id}">
                        <span class="material-symbols-outlined text-lg">delete</span>
                    </button>
                </div>
            </div>
        `;
        // Bind inline edit/delete buttons
        const inlineEdit = div.querySelector('.edit-tx-btn');
        const inlineDel = div.querySelector('.del-tx-btn');
        if (inlineEdit) inlineEdit.onclick = editBtn.onclick;
        if (inlineDel) inlineDel.onclick = delBtn.onclick;
        
        list.appendChild(div);
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
                    <span class="material-symbols-outlined text-lg">${c.icon || 'category'}</span>
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
                    ${idx === 0 ? '<span class="material-symbols-outlined text-primary text-lg check-icon" style="font-variation-settings: \'FILL\' 1;">check_circle</span>' : ''}
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
                        btn.insertAdjacentHTML('beforeend', '<span class="material-symbols-outlined text-primary text-lg check-icon" style="font-variation-settings: \'FILL\' 1;">check_circle</span>');
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

        if (window.currentEditFinanceTxId) {
            await updateDoc(doc(db, "users", currentUid, "finance_transactions", window.currentEditFinanceTxId), txData);
            window.currentEditFinanceTxId = null;
        } else {
            txData.createdAt = serverTimestamp();
            await addDoc(collection(db, "users", currentUid, "finance_transactions"), txData);
        }
        
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
    
        const tlFormatNoSymbol = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    
    netTotalEl.textContent = (netTotal >= 0 ? '+' : '') + formatCurrency(netTotal);
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
            <div class="bg-surface-container-lowest p-4 rounded-2xl flex items-center justify-between shadow-sm border-l-4 border-primary mb-3 active:scale-98 transition-transform">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <span class="material-symbols-outlined text-primary">${pm.icon}</span>
                    </div>
                    <div>
                        <p class="font-body-lg text-body-lg font-semibold">${tx.title}</p>
                        <p class="font-label-sm text-label-sm text-on-surface-variant">${pm.name}</p>
                    </div>
                </div>
                <p class="font-headline-sm text-headline-sm text-primary">${formatCurrency(tx.amount)}</p>
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
                <div class="flex items-center justify-between p-3 rounded-2xl hover:bg-surface-container-low transition-colors active:scale-98">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span class="material-symbols-outlined text-primary">${pm.icon}</span>
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
window.renderFinanceDetail = renderFinanceDetail;

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
        const cacheSnap = await getDoc(cacheRef);

        if (cacheSnap.exists()) {
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
        goldPriceEl.textContent = 'Alınamıyor';
        silverPriceEl.textContent = 'Alınamıyor';
        goldChangeEl.textContent = '';
        silverChangeEl.textContent = '';
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
        if (val === undefined || val === null || isNaN(val)) {
            el.textContent = '';
            return;
        }
        const abs = Math.abs(val).toFixed(1);
        if (val > 0) {
            el.textContent = `▲ ${abs}%`;
            el.className = 'text-label-sm font-label-sm font-bold text-primary';
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
