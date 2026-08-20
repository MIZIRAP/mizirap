import { auth, db } from "./firebase-config.js";
import { collection, doc, updateDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { escapeHtml, formatDate, formatCurrency } from "./utils.js";
import { calcBalance } from "./finance.js";

let currentWorkouts = [];
let currentTxs = [];
let currentWaterStats = { currentAmount: 0, dailyGoal: 2000 };
let currentCaloriesStats = { consumed: 0, goal: 2000 };
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
    currentCaloriesStats = { consumed: 0, goal: 2000 };
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

export function updateDashboardCalories(stats) {
    currentCaloriesStats = stats;
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
    const circum = 251.2; // 2 * PI * 40 for the SVG circles
    
    // Su Tüketimi
    const waterText = document.getElementById("dashboard-water-text");
    const waterProg = document.getElementById("dash-prog-water");
    if(waterText && waterProg) {
        waterText.innerHTML = `${currentWaterStats.currentAmount}<span class="text-xs font-normal text-on-surface-variant">/${currentWaterStats.dailyGoal}ml</span>`;
        let percent = currentWaterStats.currentAmount / currentWaterStats.dailyGoal * 100;
        if (percent > 100) percent = 100;
        if (isNaN(percent)) percent = 0;
        waterProg.style.strokeDashoffset = circum - (percent / 100) * circum;
    }
    
    // Kalori Tüketimi
    const calsText = document.getElementById("dashboard-calories-text");
    const calsProg = document.getElementById("dash-prog-cals");
    if(calsText && calsProg) {
        calsText.innerHTML = `${currentCaloriesStats.totalCaloriesConsumed || 0}<span class="text-xs font-normal text-on-surface-variant">/${currentCaloriesStats.dailyCalorieGoal || 2000}</span>`;
        let percent = (currentCaloriesStats.totalCaloriesConsumed || 0) / (currentCaloriesStats.dailyCalorieGoal || 2000) * 100;
        if (percent > 100) percent = 100;
        if (isNaN(percent)) percent = 0;
        calsProg.style.strokeDashoffset = circum - (percent / 100) * circum;
    }

    // Okuma/Kitaplar
    const dashBooksText = document.getElementById("dashboard-books-text");
    if(dashBooksText) {
        if(currentBooks.length > 0) {
            const book = currentBooks[0];
            const read = book.readPages || 0;
            const total = book.totalPages || 1;
            dashBooksText.innerHTML = `<span class="text-2xl font-bold text-on-surface leading-none">${read}</span><span class="text-xs text-on-surface-variant mb-1">/${total} p.</span>`;
        } else {
            dashBooksText.innerHTML = `<span class="text-2xl font-bold text-on-surface leading-none">0</span><span class="text-xs text-on-surface-variant mb-1">/0 p.</span>`;
        }
    }
    
    // Dizi/Film
    const dashMoviesText = document.getElementById("dashboard-movies-text");
    if (dashMoviesText) {
        if (currentMovies && currentMovies.length > 0) {
            const activeMovie = currentMovies[0]; // because we sort the active one to index 0 in movies.js
            if (activeMovie.type === 'series') {
                dashMoviesText.innerHTML = `<span class="text-sm font-bold text-on-surface">S${activeMovie.season || 1} B${activeMovie.episode || 1}</span>`;
            } else {
                dashMoviesText.innerHTML = `<span class="text-sm font-bold text-on-surface">Film</span>`;
            }
        } else {
            dashMoviesText.innerHTML = `<span class="text-sm font-bold text-on-surface">YOK</span>`;
        }
    }

    // Spor
    const statWorkout = document.getElementById("stat-workout-split");
    if(statWorkout) statWorkout.textContent = window._miz_active_split_name || "Yapılmadı";

    // Finans
    const balance = calcBalance(currentTxs);
    const statBalance = document.getElementById("stat-balance");
    if(statBalance) statBalance.textContent = formatCurrency(balance);
}
