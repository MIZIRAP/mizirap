import { formatDate, formatCurrency } from "./utils.js";
import { db } from "./firebase-config.js";
import { collection, query, orderBy, limit, onSnapshot } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { registerListener } from "./listenerManager.js";

let unsubCalories = null;
let unsubWater = null;
let unsubFinance = null;
let unsubBooks = null;

let rawCalories = [];
let rawWater = [];
let rawFinance = [];
let rawBooks = [];

let currentUid = null;

export function initHistory(uid) {
    currentUid = uid;
    
    // Clear previous unsubs
    if(unsubCalories) unsubCalories();
    if(unsubWater) unsubWater();
    if(unsubFinance) unsubFinance();
    if(unsubBooks) unsubBooks();

    // Query past 30 days roughly or just limit to 100 docs each
    const calRef = query(collection(db, "users", uid, "calorieLogs"), orderBy("createdAt", "desc"), limit(100));
    unsubCalories = registerListener(onSnapshot(calRef, snap => {
        rawCalories = snap.docs.map(d => d.data());
        renderHistory();
    }));

    const waterRef = query(collection(db, "users", uid, "waterLogs"), orderBy("createdAt", "desc"), limit(100));
    unsubWater = registerListener(onSnapshot(waterRef, snap => {
        rawWater = snap.docs.map(d => d.data());
        renderHistory();
    }));

    const finRef = query(collection(db, "users", uid, "finance_transactions"), orderBy("createdAt", "desc"), limit(100));
    unsubFinance = registerListener(onSnapshot(finRef, snap => {
        rawFinance = snap.docs.map(d => d.data());
        renderHistory();
    }));

    const bookRef = query(collection(db, "users", uid, "book_logs"), orderBy("createdAt", "desc"), limit(100));
    unsubBooks = registerListener(onSnapshot(bookRef, snap => {
        rawBooks = snap.docs.map(d => d.data());
        renderHistory();
    }));
}

export function clearHistory() {
    if(unsubCalories) unsubCalories();
    if(unsubWater) unsubWater();
    if(unsubFinance) unsubFinance();
    if(unsubBooks) unsubBooks();
}

function renderHistory() {
    // Group all by YYYY-MM-DD
    const grouped = {};

    const processDoc = (doc, type) => {
        if (!doc.createdAt) return;
        const dateObj = doc.createdAt.toDate ? doc.createdAt.toDate() : new Date(doc.createdAt);
        if(isNaN(dateObj)) return; 
        
        const dateKey = formatDate(dateObj); 

        if(!grouped[dateKey]) {
            grouped[dateKey] = {
                dateObj: dateObj,
                calories: 0,
                water: 0,
                books: 0,
                finance: 0
            };
        }

        if(type === 'calories') {
            grouped[dateKey].calories += (doc.kcal || 0);
        } else if (type === 'water') {
            grouped[dateKey].water += (doc.amount || 0);
        } else if (type === 'finance') {
            const amount = parseFloat(doc.amount) || 0;
            if(doc.type === 'income') grouped[dateKey].finance += amount;
            else if(doc.type === 'expense') grouped[dateKey].finance -= amount;
        } else if (type === 'books') {
            grouped[dateKey].books += (doc.pagesRead || 0);
        }
    };

    rawCalories.forEach(d => processDoc(d, 'calories'));
    rawWater.forEach(d => processDoc(d, 'water'));
    rawFinance.forEach(d => processDoc(d, 'finance'));
    rawBooks.forEach(d => processDoc(d, 'books'));

    const container = document.getElementById("history-cards-container");
    if(!container) return;

    // Sort by date descending
    const sortedKeys = Object.keys(grouped).sort((a, b) => grouped[b].dateObj - grouped[a].dateObj);

    container.innerHTML = "";
    
    if (sortedKeys.length === 0) {
        container.innerHTML = `<div class="text-center text-on-surface/60 mt-10">Henüz geçmiş kaydı bulunmuyor.</div>`;
        return;
    }

    const todayStr = new Date().toLocaleDateString("tr-TR");
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);

    sortedKeys.forEach((key, index) => {
        const data = grouped[key];
        
        let title = key; 
        const options = { day: 'numeric', month: 'long', weekday: 'long' };
        let formattedDate = formatDate(data.dateObj, options);
        
        if (key === todayStr) {
            title = "Bugün, " + formatDate(data.dateObj, { day: 'numeric', month: 'long' });
        } else if (key === yesterdayStr) {
            title = "Dün, " + formatDate(data.dateObj, { day: 'numeric', month: 'long' });
        } else {
            title = formattedDate;
        }

        const financeColor = data.finance >= 0 ? 'var(--green)' : 'var(--coral)';
        const financeSign = data.finance > 0 ? '+' : '';
        const financeBg = data.finance >= 0 ? 'bg-[var(--green)]/10' : 'bg-[var(--coral)]/20';

        const opacityClass = index > 1 ? "opacity-80" : "";

        // Hedef kaloriyi varsayılan 2500 alıyoruz, grafiğin doluluğu için
        const calPercent = Math.min((data.calories / 2500) * 100, 100);

        const html = `
        <article class="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-4 active-scale transition-transform duration-200 cursor-pointer border border-outline-variant/30 ${opacityClass}">
            <div class="flex justify-between items-center w-full border-b border-outline-variant/30 pb-3">
                <h2 class="text-headline-sm font-headline-sm font-bold text-on-surface">${title}</h2>
                <span class="material-symbols-rounded text-on-surface/40">chevron_right</span>
            </div>
            <div class="flex justify-between items-center gap-2 overflow-x-auto pb-2">
                <!-- Calories -->
                <div class="flex flex-col items-center gap-1 min-w-[60px]">
                    <div class="relative w-8 h-8 flex items-center justify-center">
                        <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                            <path class="text-primary/20 stroke-current" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke-width="3"></path>
                            <path class="text-primary stroke-current" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke-dasharray="${calPercent}, 100" stroke-width="3"></path>
                        </svg>
                        <span class="material-symbols-rounded absolute text-lg text-primary" style="font-variation-settings: 'FILL' 1;">restaurant</span>
                    </div>
                    <span class="text-label-sm text-on-surface font-semibold">${Math.round(data.calories)}</span>
                </div>
                <!-- Water -->
                <div class="flex flex-col items-center gap-1 min-w-[60px]">
                    <div class="w-8 h-8 rounded-full bg-[var(--green)]/10 flex items-center justify-center text-primary">
                        <span class="material-symbols-rounded text-lg">water_drop</span>
                    </div>
                    <span class="text-label-sm text-on-surface font-semibold">${Math.round(data.water)}ml</span>
                </div>
                <!-- Reading -->
                <div class="flex flex-col items-center gap-1 min-w-[60px]">
                    <div class="w-8 h-8 rounded-full bg-[var(--tan)]/20 flex items-center justify-center text-[var(--tan)]">
                        <span class="material-symbols-rounded text-lg">menu_book</span>
                    </div>
                    <span class="text-label-sm text-on-surface font-semibold">${data.books}s</span>
                </div>
                <!-- Finance -->
                <div class="flex flex-col items-center gap-1 min-w-[60px]">
                    <div class="w-8 h-8 rounded-full ${financeBg} flex items-center justify-center text-[${financeColor}]">
                        <span class="material-symbols-rounded text-lg">account_balance_wallet</span>
                    </div>
                    <span class="text-label-sm text-[${financeColor}] font-semibold">${financeSign}₺${Math.abs(data.finance)}</span>
                </div>
            </div>
        </article>
        `;
        
        container.insertAdjacentHTML("beforeend", html);
    });
}
