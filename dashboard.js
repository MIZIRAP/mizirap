import { auth, db } from "./firebase-config.js";
import { collection, doc, updateDoc, setDoc, getDoc, getDocs, onSnapshot, query, orderBy, where } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { escapeHtml, formatDate, formatCurrency } from "./utils.js";
import { calcBalance } from "./finance.js";
import { fetchSharedProfile, updateSharedProfile } from "./sharedState.js";
import { registerFirestoreListener } from "./listenerManager.js";

// Helper for other modules to get the current daily summary doc reference
export function getDailySummaryRef(uid) {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    return doc(db, 'users', uid, 'summary', `daily-${todayStr}`);
}

let currentDashboardData = {
    waterAmount: 0,
    waterGoal: 2000,
    caloriesConsumed: 0,
    caloriesGoal: 2000,
    activeSplitName: "Yapılmadı",
    monthlyBalance: 0,
    activeBookRead: 0,
    activeBookTotal: 0,
    activeMovieTitle: 'YOK',
    activeMovieSeason: null,
    activeMovieEpisode: null,
    activeMovieType: null
};

let currentUid = null;

export async function initDashboard(uid) {
    currentUid = uid;


    const dailyRef = getDailySummaryRef(uid);
    
    // Check if daily document exists (Migration / Fallback logic)
    try {
        const snap = await getDoc(dailyRef);
        if (!snap.exists()) {
            // Show empty widgets instantly while migration happens in background
            renderDashboard();
            const grid = document.getElementById("dashboard-widgets-grid");
            const bottomGrid = document.getElementById("dashboard-bottom-widgets");
            if (grid) grid.classList.remove('opacity-0');
            if (bottomGrid) bottomGrid.classList.remove('opacity-0');
            const loader = document.getElementById("dashboard-initial-loader");
            if (loader) loader.classList.add('hidden');

            await runDashboardMigration(uid, dailyRef);
        }
    } catch(e) {
        console.error("Migration error:", e);
    }

    // Sort widgets and initialize SortableJS before initial render
    await initWidgetSorting(uid);

    // Listen to daily summary
    startDashboardListener(uid);
}

function startDashboardListener(uid) {
    if (!uid) return;
    const dailyRef = getDailySummaryRef(uid);
    registerFirestoreListener('dashboard', onSnapshot(dailyRef, (docSnap) => {
        try {
            if (docSnap.exists()) {
                currentDashboardData = { ...currentDashboardData, ...docSnap.data() };
            }
            renderDashboard();
        } catch (err) {
            console.error("Dashboard render error:", err);
        } finally {
            // Reveal dashboard once render is complete (or even if it fails)
            const grid = document.getElementById("dashboard-widgets-grid");
            const bottomGrid = document.getElementById("dashboard-bottom-widgets");
            if (grid) grid.classList.remove('opacity-0');
            if (bottomGrid) bottomGrid.classList.remove('opacity-0');

            // Hide initial HTML loader
            const loader = document.getElementById("dashboard-initial-loader");
            if (loader) loader.classList.add('hidden');
        }
    }));
}

document.addEventListener('viewChanged', (e) => {
    if (e.detail.viewId === 'view-dashboard') {
        startDashboardListener(currentUid);
    }
});

async function runDashboardMigration(uid, dailyRef) {
    // We fetch the current state from the db to initialize today's document
    let initialData = { ...currentDashboardData };
    
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    // 1. Water Settings
    const waterSettingsSnap = await getDoc(doc(db, "users", uid, "settings", "water"));
    if (waterSettingsSnap.exists()) {
        initialData.waterGoal = waterSettingsSnap.data().dailyGoal || 2000;
    }
    
    // 2. Water Today's logs
    const startOfToday = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const waterQ = query(collection(db, "users", uid, "waterLogs"));
    const waterSnap = await getDocs(waterQ);
    let todayWater = 0;
    waterSnap.forEach(docSnap => {
        const data = docSnap.data();
        if (data.createdAt) {
            const date = new Date(data.createdAt.seconds * 1000);
            if (date >= startOfToday) {
                todayWater += Number(data.amount || 0);
            }
        }
    });
    initialData.waterAmount = todayWater;
    
    // 3. Calories Settings
    const calSettingsSnap = await getDoc(doc(db, "users", uid, "settings", "calories"));
    if (calSettingsSnap.exists()) {
        initialData.caloriesGoal = calSettingsSnap.data().dailyCalorieGoal || 2000;
    }
    
    // 4. Calories Today's logs
    const calQ = query(collection(db, "users", uid, "calorieLogs"), where("dateStr", "==", todayStr));
    const calSnap = await getDocs(calQ);
    let todayCals = 0;
    calSnap.forEach(docSnap => {
        todayCals += Number(docSnap.data().calories || 0);
    });
    initialData.caloriesConsumed = todayCals;
    
    // 5. Active Book
    const booksQ = query(collection(db, "users", uid, "books"));
    const booksSnap = await getDocs(booksQ);
    let latestBook = null;
    let latestTime = 0;
    booksSnap.forEach(docSnap => {
        const data = docSnap.data();
        const time = data.updatedAt ? data.updatedAt.toMillis() : 0;
        if (time > latestTime) {
            latestTime = time;
            latestBook = data;
        }
    });
    if (latestBook) {
        initialData.activeBookRead = latestBook.readPages || 0;
        initialData.activeBookTotal = latestBook.totalPages || 0;
    }
    
    // 6. Active Movie
    const moviesQ = query(collection(db, "users", uid, "movies"));
    const moviesSnap = await getDocs(moviesQ);
    let latestMovie = null;
    let latestMovieTime = 0;
    moviesSnap.forEach(docSnap => {
        const data = docSnap.data();
        const time = data.updatedAt ? data.updatedAt.toMillis() : 0;
        if (time > latestMovieTime) {
            latestMovieTime = time;
            latestMovie = data;
        }
    });
    if (latestMovie) {
        initialData.activeMovieTitle = latestMovie.title || '';
        initialData.activeMovieType = latestMovie.type || 'movie';
        initialData.activeMovieSeason = latestMovie.season || null;
        initialData.activeMovieEpisode = latestMovie.episode || null;
    }
    
    // 7. Finance Balance (Monthly)
    const targetMonth = d.getMonth();
    const targetYear = d.getFullYear();
    const txQ = query(collection(db, "users", uid, "finance_transactions"));
    const txSnap = await getDocs(txQ);
    const monthTxs = [];
    txSnap.forEach(docSnap => {
        const tx = docSnap.data();
        if (tx.dateStr) {
            const tDate = new Date(tx.dateStr);
            if (!isNaN(tDate.getTime()) && tDate.getMonth() === targetMonth && tDate.getFullYear() === targetYear) {
                monthTxs.push(tx);
            }
        }
    });
    initialData.monthlyBalance = calcBalance(monthTxs);
    
    // Save to Firestore
    await setDoc(dailyRef, initialData, { merge: true });
}

let dashboardSortable = null;
let bottomWidgetsSortable = null;
window.isEditMode = false;

async function initWidgetSorting(uid) {
    const grid = document.getElementById("dashboard-widgets-grid");
    const bottomGrid = document.getElementById("dashboard-bottom-widgets");

    // Load initial order
    try {
        const data = await fetchSharedProfile(uid);
        if (data) {
            if (data.widgetOrder && grid) {
                const frag = document.createDocumentFragment();
                data.widgetOrder.forEach(id => {
                    const el = grid.querySelector(`[data-widget-id="${id}"]`);
                    if (el) frag.appendChild(el);
                });
                grid.appendChild(frag);
            }
            if (data.bottomWidgetOrder && bottomGrid) {
                const frag = document.createDocumentFragment();
                data.bottomWidgetOrder.forEach(id => {
                    const el = bottomGrid.querySelector(`[data-widget-id="${id}"]`);
                    if (el) frag.appendChild(el);
                });
                bottomGrid.appendChild(frag);
            }
        }
    } catch(err) {
        console.error("Sıralama yüklenemedi", err);
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
                        updateSharedProfile(updates);
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
    currentDashboardData = {
        waterAmount: 0,
        waterGoal: 2000,
        caloriesConsumed: 0,
        caloriesGoal: 2000,
        activeSplitName: "Yapılmadı",
        monthlyBalance: 0,
        activeBookRead: 0,
        activeBookTotal: 0,
        activeMovieTitle: 'YOK',
        activeMovieSeason: null,
        activeMovieEpisode: null,
        activeMovieType: null
    };
    
    // Reset grids to hidden state to prevent flash for next user
    const grid = document.getElementById("dashboard-widgets-grid");
    const bottomGrid = document.getElementById("dashboard-bottom-widgets");
    if (grid) grid.classList.add('opacity-0');
    if (bottomGrid) bottomGrid.classList.add('opacity-0');
}

function renderDashboard() {
    const circum = 251.2; // 2 * PI * 40 for the SVG circles

    // Su Tüketimi
    const waterText = document.getElementById("dashboard-water-text");
    const waterProg = document.getElementById("dash-prog-water");
    if(waterText && waterProg) {
        waterText.innerHTML = `${currentDashboardData.waterAmount}<span class="text-xs font-normal text-on-surface-variant">/${currentDashboardData.waterGoal}ml</span>`;
        let percent = currentDashboardData.waterAmount / currentDashboardData.waterGoal * 100;
        if (percent > 100) percent = 100;
        if (isNaN(percent)) percent = 0;
        waterProg.style.strokeDashoffset = circum - (percent / 100) * circum;
    }

    // Kalori Tüketimi
    const calsText = document.getElementById("dashboard-calories-text");
    const calsProg = document.getElementById("dash-prog-cals");
    if(calsText && calsProg) {
        calsText.innerHTML = `${currentDashboardData.caloriesConsumed || 0}<span class="text-xs font-normal text-on-surface-variant">/${currentDashboardData.caloriesGoal || 2000}</span>`;
        let percent = (currentDashboardData.caloriesConsumed || 0) / (currentDashboardData.caloriesGoal || 2000) * 100;
        if (percent > 100) percent = 100;
        if (isNaN(percent)) percent = 0;
        calsProg.style.strokeDashoffset = circum - (percent / 100) * circum;
    }

    // Okuma/Kitaplar
    const dashBooksText = document.getElementById("dashboard-books-text");
    if(dashBooksText) {
        if(currentDashboardData.activeBookTotal > 0) {
            const read = currentDashboardData.activeBookRead || 0;
            const total = currentDashboardData.activeBookTotal || 1;
            dashBooksText.innerHTML = `<span class="text-2xl font-bold text-on-surface leading-none">${read}</span><span class="text-xs text-on-surface-variant mb-1">/${total} p.</span>`;
        } else {
            dashBooksText.innerHTML = `<span class="text-2xl font-bold text-on-surface leading-none">0</span><span class="text-xs text-on-surface-variant mb-1">/0 p.</span>`;
        }
    }

    // Dizi/Film
    const dashMoviesText = document.getElementById("dashboard-movies-text");
    if (dashMoviesText) {
        if (currentDashboardData.activeMovieTitle !== 'YOK' && currentDashboardData.activeMovieTitle !== '') {
            if (currentDashboardData.activeMovieType === 'series') {
                dashMoviesText.innerHTML = `<span class="text-sm font-bold text-on-surface">S${currentDashboardData.activeMovieSeason || 1} B${currentDashboardData.activeMovieEpisode || 1}</span>`;
            } else {
                dashMoviesText.innerHTML = `<span class="text-sm font-bold text-on-surface">Film</span>`;
            }
        } else {
            dashMoviesText.innerHTML = `<span class="text-sm font-bold text-on-surface">YOK</span>`;
        }
    }

    // Spor
    const statWorkout = document.getElementById("stat-workout-split");
    if(statWorkout) statWorkout.textContent = currentDashboardData.activeSplitName || "Yapılmadı";

    // Finans
    try {
        const statBalance = document.getElementById("stat-balance");
        if(statBalance) statBalance.textContent = formatCurrency(Number(currentDashboardData.monthlyBalance) || 0);
    } catch(e) {
        console.error("Finance format error:", e);
    }
}
