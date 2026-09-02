import { auth, db } from "./firebase-config.js";
import { collection, doc, updateDoc, getDoc, getDocs, onSnapshot, query, orderBy, where, setDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { escapeHtml, formatDate, formatCurrency, getTodayString } from "./utils.js";
import { registerFirestoreListener, unregisterFirestoreListener } from "./listenerManager.js";

let currentWorkouts = [];
let currentTxs = [];
let currentWaterStats = { currentAmount: 0, dailyGoal: 2000 };
let currentCaloriesStats = { consumed: 0, goal: 2000 };
let currentBooks = [];
let currentMovies = [];

export function initDashboard(uid) {
    initWidgetSorting(uid);

    const todayStr = getTodayString();
    const summaryRef = doc(db, "users", uid, "summary", `daily-${todayStr}`);

    const setupDashboardListener = () => {
        return onSnapshot(summaryRef, async (snap) => {
            if (!snap.exists()) {
                await performDailySummaryMigration(uid, todayStr, summaryRef);
            } else {
                updateDashboardUIFromSummary(snap.data());
            }
        });
    };

    registerFirestoreListener("view-dashboard", setupDashboardListener);
}

let dashboardSortable = null;
let bottomWidgetsSortable = null;
window.isEditMode = false;

async function initWidgetSorting(uid) {
    const grid = document.getElementById("dashboard-widgets-grid");
    const bottomGrid = document.getElementById("dashboard-bottom-widgets");

    // Load initial order
    try {
        const docRef = doc(db, "users", uid, "profile", "data");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.widgetOrder && grid) {
                data.widgetOrder.forEach(id => {
                    const el = grid.querySelector(`[data-widget-id="${id}"]`);
                    if (el) grid.appendChild(el);
                });
            }
            if (data.bottomWidgetOrder && bottomGrid) {
                data.bottomWidgetOrder.forEach(id => {
                    const el = bottomGrid.querySelector(`[data-widget-id="${id}"]`);
                    if (el) bottomGrid.appendChild(el);
                });
            }
        }
    } catch(err) {
        console.error("Sıralama yüklenemedi", err);
    } finally {
        if (grid) grid.classList.remove('opacity-0');
        if (bottomGrid) bottomGrid.classList.remove('opacity-0');
    }

    if (typeof Sortable !== 'undefined') {
        const sortableOptions = {
            animation: 300,
            delay: 500,
            delayOnTouchOnly: false,
            touchStartThreshold: 5,
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            onChoose: function (evt) {
                if (!window.isEditMode) {
                    window.isEditMode = true;
                    if (grid) grid.classList.add('widget-edit-mode');
                    if (bottomGrid) bottomGrid.classList.add('widget-edit-mode');
                    if (dashboardSortable) dashboardSortable.option("delay", 0);
                    if (bottomWidgetsSortable) bottomWidgetsSortable.option("delay", 0);
                    if(navigator.vibrate) navigator.vibrate(50);
                }
            }
        };

        if (grid) dashboardSortable = new Sortable(grid, sortableOptions);
        if (bottomGrid) bottomWidgetsSortable = new Sortable(bottomGrid, sortableOptions);

        // Click outside to exit edit mode
        document.addEventListener('click', async (e) => {
            if (window.isEditMode) {
                const isWidget = e.target.closest('[data-widget-id]');
                if (!isWidget) {
                    window.isEditMode = false;
                    if (grid) grid.classList.remove('widget-edit-mode');
                    if (bottomGrid) bottomGrid.classList.remove('widget-edit-mode');
                    if (dashboardSortable) dashboardSortable.option("delay", 500);
                    if (bottomWidgetsSortable) bottomWidgetsSortable.option("delay", 500);
                    
                    // Save new order
                    const updates = {};
                    if (grid) updates.widgetOrder = Array.from(grid.children).map(child => child.dataset.widgetId).filter(Boolean);
                    if (bottomGrid) updates.bottomWidgetOrder = Array.from(bottomGrid.children).map(child => child.dataset.widgetId).filter(Boolean);
                    
                    try {
                        const docRef = doc(db, "users", uid, "profile", "data");
                        await updateDoc(docRef, updates);
                    } catch(err) {
                        console.error("Sıralama kaydedilemedi", err);
                    }
                }
            }
        });

        // Prevent native context menu on widgets (e.g. mobile long press text selection/image drag popup)
        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('[data-widget-id]')) {
                e.preventDefault();
            }
        });

    }
}

export function clearDashboard() {
    unregisterFirestoreListener("view-dashboard");
    const grid = document.getElementById("dashboard-widgets-grid");
    const bottomGrid = document.getElementById("dashboard-bottom-widgets");
    if (grid) grid.classList.add('opacity-0');
    if (bottomGrid) bottomGrid.classList.add('opacity-0');
}

export function updateDashboardWorkouts(workouts, activeSplitName = "Yapılmadı") {}
export function updateDashboardFinance(txs) {}
export function updateDashboardWater(stats) {}
export function updateDashboardCalories(stats) {}
export function updateDashboardBooks(books) {}
export function updateDashboardMovies(movies) {}

function updateDashboardUIFromSummary(data) {
    const circum = 251.2;

    const waterText = document.getElementById("dashboard-water-text");
    const waterProg = document.getElementById("dash-prog-water");
    if(waterText && waterProg && data.water) {
        const waterVal = data.water.consumed || data.water.currentAmount || 0;
        waterText.innerHTML = `${waterVal}<span class="text-xs font-normal text-on-surface-variant">/${data.water.goal || 2000}ml</span>`;
        let percent = waterVal / (data.water.goal || 2000) * 100;
        if (percent > 100) percent = 100;
        if (isNaN(percent)) percent = 0;
        waterProg.style.strokeDashoffset = circum - (percent / 100) * circum;
    }

    const calsText = document.getElementById("dashboard-calories-text");
    const calsProg = document.getElementById("dash-prog-cals");
    if(calsText && calsProg && data.calories) {
        calsText.innerHTML = `${data.calories.consumed || 0}<span class="text-xs font-normal text-on-surface-variant">/${data.calories.goal || 2000}</span>`;
        let percent = (data.calories.consumed || 0) / (data.calories.goal || 2000) * 100;
        if (percent > 100) percent = 100;
        if (isNaN(percent)) percent = 0;
        calsProg.style.strokeDashoffset = circum - (percent / 100) * circum;
    }

    const dashBooksText = document.getElementById("dashboard-books-text");
    if(dashBooksText && data.books) {
        dashBooksText.innerHTML = `<span class="text-2xl font-bold text-on-surface leading-none">${data.books.readPages || 0}</span><span class="text-xs text-on-surface-variant mb-1">/${data.books.totalPages || 0} p.</span>`;
    }

    const dashMoviesText = document.getElementById("dashboard-movies-text");
    if (dashMoviesText && data.movies) {
        dashMoviesText.innerHTML = `<span class="text-sm font-bold text-on-surface">${escapeHtml(data.movies.detail || "YOK")}</span>`;
    }

    const statWorkout = document.getElementById("stat-workout-split");
    if(statWorkout && data.workout) {
        statWorkout.textContent = data.workout.activeSplitName || "Yapılmadı";
    }

    const statBalance = document.getElementById("stat-balance");
    if(statBalance && data.finance) {
        statBalance.textContent = formatCurrency(data.finance.balance || 0);
    }
}

async function performDailySummaryMigration(uid, todayStr, summaryRef) {
    let waterConsumed = 0; let waterGoal = 2000;
    let calConsumed = 0; let calGoal = 2000;
    let financeBalance = 0;
    let activeSplitName = "Yapılmadı";
    let booksActiveTitle = "Aktif Kitap Yok"; let booksReadPages = 0; let booksTotalPages = 0;
    let moviesActiveTitle = "İçerik Seçin"; let moviesDetail = "--"; let moviesPercentage = 0;

    const today = new Date();
    today.setHours(0,0,0,0);

    try {
        const waterSet = await getDoc(doc(db, "users", uid, "settings", "water"));
        if (waterSet.exists() && waterSet.data().dailyGoal) waterGoal = waterSet.data().dailyGoal;
        const wSnap = await getDocs(query(collection(db, "users", uid, "waterLogs"), where("createdAt", ">=", today)));
        wSnap.forEach(d => { waterConsumed += d.data().amount || 0; });
    } catch(e){}

    try {
        const calSet = await getDoc(doc(db, "users", uid, "settings", "calories"));
        if (calSet.exists() && calSet.data().dailyCalorieGoal) calGoal = calSet.data().dailyCalorieGoal;
        const cSnap = await getDocs(query(collection(db, "users", uid, "calorieLogs"), where("createdAt", ">=", today)));
        cSnap.forEach(d => { calConsumed += d.data().kcal || 0; });
    } catch(e){}

    try {
        const fSnap = await getDocs(query(collection(db, "users", uid, "finance_transactions")));
        fSnap.forEach(d => {
            const data = d.data();
            const val = parseFloat(data.amount) || 0;
            financeBalance += (data.type === 'income' ? val : -val);
        });
    } catch(e){}

    try {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists() && userDoc.data().activeSplitId) {
            const asId = userDoc.data().activeSplitId;
            const splitDoc = await getDoc(doc(db, "users", uid, "splits", asId));
            if (splitDoc.exists()) activeSplitName = splitDoc.data().name || "Yapılmadı";
        }
    } catch(e){}

    try {
        const bSnap = await getDocs(query(collection(db, "users", uid, "books"), orderBy("updatedAt", "desc"), limit(20)));
        let books = [];
        bSnap.forEach(d => books.push({ id: d.id, ...d.data() }));
        let activeBook = books.find(b => b.status === "reading") || books.find(b => b.status === "to_read") || books[0];
        if (activeBook) {
            booksActiveTitle = activeBook.title || "İsimsiz";
            booksReadPages = activeBook.readPages || 0;
            booksTotalPages = activeBook.totalPages || 0;
        }
    } catch(e){}

    try {
        const mSnap = await getDocs(query(collection(db, "users", uid, "movies"), orderBy("updatedAt", "desc"), limit(20)));
        let movies = [];
        mSnap.forEach(d => movies.push({ id: d.id, ...d.data() }));
        let storedActiveStr = localStorage.getItem(`activeMovie_${uid}`);
        let activeMovie = storedActiveStr ? JSON.parse(storedActiveStr) : null;
        if (activeMovie) activeMovie = movies.find(m => m.id === activeMovie.id) || activeMovie;
        if (!activeMovie && movies.length > 0) activeMovie = movies[0];

        if (activeMovie) {
            moviesActiveTitle = activeMovie.title || "İsimsiz";
            if (activeMovie.type === 'movie') {
                moviesDetail = activeMovie.status === 'completed' ? 'BİTTİ' : (activeMovie.status === 'watchlist' ? 'BEKLİYOR' : 'İZLİYOR');
                moviesPercentage = activeMovie.status === 'completed' ? 100 : (activeMovie.status === 'watchlist' ? 0 : 50);
            } else {
                moviesDetail = `S${(activeMovie.season || 1).toString().padStart(2, '0')} B${(activeMovie.episode || 1).toString().padStart(2, '0')}`;
                const totalEp = activeMovie.totalEpisode || 1;
                const ep = activeMovie.episode || 1;
                moviesPercentage = totalEp > 1 ? Math.min((ep / totalEp) * 100, 100) : Math.min((ep % 20) * 5, 100);
            }
        }
    } catch(e){}

    const summaryData = {
        water: { consumed: waterConsumed, goal: waterGoal },
        calories: { consumed: calConsumed, goal: calGoal },
        finance: { balance: financeBalance },
        workout: { activeSplitName },
        books: { activeTitle: booksActiveTitle, readPages: booksReadPages, totalPages: booksTotalPages },
        movies: { activeTitle: moviesActiveTitle, detail: moviesDetail, percentage: moviesPercentage }
    };

    try {
        await setDoc(summaryRef, summaryData, { merge: true });
    } catch(e) {
        console.error("Migration failed", e);
    }
}
