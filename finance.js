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
    });

    // 2. Load Payment Methods
    const paymentMethodsRef = collection(db, "users", uid, "finance_payment_methods");
    unsubPaymentMethods = onSnapshot(paymentMethodsRef, (snap) => {
        financePaymentMethods = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderTransactions();
    });

    // 3. Load Transactions
    const txRef = collection(db, "users", uid, "finance_transactions");
    const q = query(txRef, orderBy("dateStr", "desc"), orderBy("createdAt", "desc"));
    
    unsubTransactions = onSnapshot(q, (snap) => {
        financeTransactions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderTransactions();
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
    
    financeTransactions.forEach(tx => {
        const val = parseFloat(tx.amount) || 0;
        const change = tx.type === 'income' ? val : -val;
        totalBalance += change;
        
        const txDate = new Date(tx.dateStr);
        if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
            currentMonthBalance += change;
        }
    });
    
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
