import { auth, db } from "./firebase-config.js";
import { collection, doc, updateDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { escapeHtml, fmtDate, tl } from "./utils.js";
import { calcBalance } from "./finance.js";

let allTasks = [];
let allNotes = [];
let unsubTasks = null;
let unsubNotes = null;

let currentWorkouts = [];
let currentTxs = [];
let currentWaterStats = { currentAmount: 0, dailyGoal: 2000 };
let currentBooks = [];

export function initDashboard(uid) {
    const tasksRef = query(collection(db, "users", uid, "tasks"), orderBy("createdAt", "desc"));
    const notesRef = query(collection(db, "users", uid, "notes"), orderBy("createdAt", "desc"));

    unsubTasks = onSnapshot(tasksRef, snap => {
        allTasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderDashboard();
    });

    unsubNotes = onSnapshot(notesRef, snap => {
        allNotes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderDashboard();
    });
}

export function clearDashboard() {
    if(unsubTasks) unsubTasks();
    if(unsubNotes) unsubNotes();
    allTasks = [];
    allNotes = [];
    currentWorkouts = [];
    currentTxs = [];
    currentWaterStats = { currentAmount: 0, dailyGoal: 2000 };
    currentBooks = [];
}

export function updateDashboardWorkouts(workouts, activeSplitName = "Yapılmadı") {
    currentWorkouts = workouts;
    window._miz_active_split_name = activeSplitName;
    renderDashboard();
}

export function updateDashboardFinance(txs) {
    currentTxs = txs;
    renderDashboard();
}

export function updateDashboardWater(stats) {
    currentWaterStats = stats;
    renderDashboard();
}

export function updateDashboardBooks(books) {
    currentBooks = books;
    renderDashboard();
}

function renderDashboard() {
    // Su Tüketimi
    const waterText = document.getElementById("dashboard-water-text");
    const waterProg = document.getElementById("dashboard-water-progress");
    if(waterText && waterProg) {
        waterText.innerHTML = `${currentWaterStats.currentAmount} <span class="text-[12px] font-normal text-[var(--ink)]/60">/ ${currentWaterStats.dailyGoal} ml</span>`;
        let percent = currentWaterStats.currentAmount / currentWaterStats.dailyGoal * 100;
        if (percent > 100) percent = 100;
        waterProg.style.width = `${percent}%`;
    }

    // Okuma/Kitaplar
    const dashBooksText = document.getElementById("dashboard-books-text");
    const dashBooksProg = document.getElementById("dashboard-books-progress");
    
    if(dashBooksText && dashBooksProg) {
        const readingBooks = currentBooks.filter(b => b.status === "reading");
        if(readingBooks.length > 0) {
            const book = readingBooks[0];
            const read = book.readPages || 0;
            const total = book.totalPages || 1;
            const percent = Math.min(100, Math.round((read / total) * 100));
            dashBooksText.innerHTML = `${read} <span class="text-[12px] font-normal text-[var(--ink)]/60">/ ${total} sayfa</span>`;
            dashBooksProg.style.width = `${percent}%`;
        } else {
            dashBooksText.innerHTML = `0 <span class="text-[12px] font-normal text-[var(--ink)]/60">/ 0 sayfa</span>`;
            dashBooksProg.style.width = `0%`;
        }
    }
    
    // Spor
    const statWorkout = document.getElementById("stat-workout-split");
    if(statWorkout) statWorkout.textContent = window._miz_active_split_name || "Yapılmadı";

    // Finans
    const balance = calcBalance(currentTxs);
    const statBalance = document.getElementById("stat-balance");
    if(statBalance) statBalance.textContent = tl(balance);

    // Görevler
    const upcoming = document.getElementById("dashboard-tasks-container");
    if(!upcoming) return;
    upcoming.innerHTML = "";
    
    const activeTasks = allTasks.filter(t => !t.done).slice(0, 5);
    
    if (activeTasks.length === 0) {
        upcoming.innerHTML = `<p class="text-on-surface-variant text-sm">Bekleyen görev yok.</p>`;
    } else {
        activeTasks.forEach(t => {
            const div = document.createElement("div");
            div.className = "flex items-center gap-4 border-b border-outline-variant/20 pb-3 last:border-0 last:pb-0";
            div.innerHTML = `
                <div class="p-2 rounded-full bg-surface-container-low text-primary cursor-pointer hover:bg-primary-container transition-colors">
                    <span class="material-symbols-outlined text-[18px]">radio_button_unchecked</span>
                </div>
                <div class="flex-1">
                    <p class="font-body-lg text-on-surface">${escapeHtml(t.title)}</p>
                    <p class="font-label-sm text-on-surface-variant">${t.due ? fmtDate(t.due) : "Tarihsiz"}</p>
                </div>
            `;
            div.querySelector(".p-2").addEventListener("click", () => {
                updateDoc(doc(db, "users", auth.currentUser.uid, "tasks", t.id), { done: true });
            });
            upcoming.appendChild(div);
        });
    }
}
