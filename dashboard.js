import { auth, db } from "./firebase-config.js";
import { collection, doc, updateDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { escapeHtml, formatDate, formatCurrency } from "./utils.js";
import { calcBalance } from "./finance.js";

let currentWorkouts = [];
let currentTxs = [];
let currentWaterStats = { currentAmount: 0, dailyGoal: 2000 };
let currentBooks = [];
let currentMovies = [];

export function initDashboard(uid) {
    // Only static rendering for now, updates come from other modules
    renderDashboard();
}

export function clearDashboard() {
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

export function updateDashboardMovies(movies) {
    currentMovies = movies;
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
    
    // Dizi/Film
    const dashMoviesText = document.getElementById("dashboard-movies-text");
    const dashMoviesProg = document.getElementById("dashboard-movies-progress");
    if (dashMoviesText && dashMoviesProg) {
        const watchingMovies = currentMovies.filter(m => (m.status || 'watching') === 'watching');
        dashMoviesText.innerHTML = `${watchingMovies.length} <span class="text-[12px] font-normal text-[var(--ink)]/60">izleniyor</span>`;
        const percent = watchingMovies.length > 0 ? Math.min(100, watchingMovies.length * 10) : 0;
        dashMoviesProg.style.width = `${percent}%`;
    }

    // Spor
    const statWorkout = document.getElementById("stat-workout-split");
    if(statWorkout) statWorkout.textContent = window._miz_active_split_name || "Yapılmadı";

    // Finans
    const balance = calcBalance(currentTxs);
    const statBalance = document.getElementById("stat-balance");
    if(statBalance) statBalance.textContent = formatCurrency(balance);
}
