import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { setupAuthUI } from "./auth.js";
import { initDashboard, clearDashboard } from "./dashboard.js?v=1787428044";
import { initWater, clearWater } from "./water.js";
import { initProfile, clearProfile } from "./profile.js?v=1787428045";
import { initHistory, clearHistory } from "./history.js";
import { clearAllListeners, clearAllFirestoreListeners } from "./listenerManager.js";
import { clearSharedState } from "./sharedState.js";
import { initWorkout, renderSplitView } from "./workout.js";
import "./activeSession.js";
import { initAiChat } from "./ai-chat.js?v=20260925";
// ---------- DOM referansları ----------
const authScreen = document.getElementById("auth-screen");
const appScreen = document.getElementById("app-screen");

// ---------- Başlangıç ----------
setupAuthUI();

// ---------- Oturum durumu ----------
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            if (!user.isAnonymous && !user.emailVerified) {
                authScreen.classList.add("hidden");
                authScreen.classList.remove("flex");
                appScreen.classList.add("hidden");
                document.getElementById("verification-screen").classList.remove("hidden");
                document.getElementById("verification-screen").classList.add("flex");
                return;
            } else {
                document.getElementById("verification-screen").classList.add("hidden");
                document.getElementById("verification-screen").classList.remove("flex");
            }

            authScreen.classList.add("hidden");
            authScreen.classList.remove("flex");
            appScreen.classList.remove("hidden");
            
            if (user.uid !== localStorage.getItem('uid')) {
                clearProfile();
                clearSharedState();
            }
            localStorage.setItem('uid', user.uid);

            // Eğer isimsiz (anonim) girişse test kullanıcısı yaz, yoksa normal adı al
            const name = user.isAnonymous ? "Test Kullanıcısı" : (user.displayName || (user.email ? user.email.split('@')[0] : "Kullanıcı"));
            const dsName = document.getElementById("dashboard-user-name");
            if(dsName) dsName.textContent = name;

            const today = new Date();
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            const dsDate = document.getElementById("dashboard-date");
            if(dsDate) dsDate.textContent = today.toLocaleDateString('tr-TR', options);

            // Modülleri başlat
            initDashboard(user.uid);
            initWater(user.uid);
            initProfile(user.uid);
            initHistory(user.uid);
            initWorkout(user.uid);
            initAiChat(user.uid);
        } catch (err) {
            console.error("Login transition error:", err);
            alert("Giriş yapılırken bir hata oluştu: " + err.message);
        }
    } else {
        // Eğer daha önceden uygulamaya girilmişse (DOM kirlenmiş olabilir), en temiz çıkış sayfa yenilemektir.
        if (localStorage.getItem('uid')) {
            localStorage.removeItem('uid');
            window.location.reload();
            return;
        }

        // Oturum açılmamışsa auth-screen zaten default olarak açıktır.
        authScreen.classList.remove("hidden");
        authScreen.classList.add("flex");
        appScreen.classList.add("hidden");
        document.getElementById("verification-screen").classList.add("hidden");
        document.getElementById("verification-screen").classList.remove("flex");
        
        window.scrollTo(0, 0);
        const appContainer = document.getElementById('app-container');
        if (appContainer) appContainer.style.overflow = ''; // Modal vs. açık kaldıysa temizle

        // Login formunu varsayılan yap
        const loginForm = document.getElementById("login-form");
        const registerForm = document.getElementById("register-form");
        if (loginForm && registerForm) {
            loginForm.classList.remove("hidden");
            registerForm.classList.add("hidden");
            document.querySelectorAll(".auth-tab").forEach(b => {
                b.classList.remove("active", "text-on-surface");
                b.classList.add("text-on-surface-variant");
                if (b.dataset.auth === "login") {
                    b.classList.add("active", "text-on-surface");
                    b.classList.remove("text-on-surface-variant");
                }
            });
        }

        // Temizlik işlemleri (Logout sonrası state sıfırlama)
        clearAllListeners();
        clearSharedState();
        clearDashboard();
        clearWater();
        clearProfile();
        clearHistory();
    }
});

// ---------- Lazy Load State ----------
const loadedModules = {};

// ---------- Global Proxy Fonksiyonlar ----------
window.openProgressDetail = async function(exerciseId, exerciseName, category) {
    try {
        const { openProgressDetail } = await import('./exerciseDetail.js');
        openProgressDetail(exerciseId, exerciseName, category);
    } catch(err) {
        console.error("exerciseDetail modülü yüklenemedi:", err);
    }
};

// ---------- Sekme (view) geçişleri (Uygulama İçi, History API Destekli) ----------
window.showView = async function(viewId) {
    // Sekme değiştiğinde tüm açık Firestore onSnapshot aboneliklerini kapat (sızıntı hijyeni)
    if (typeof clearAllFirestoreListeners === 'function') {
        clearAllFirestoreListeners();
    }

    const uid = localStorage.getItem('uid');
    
    // Lazy Load logic
    if (uid && !loadedModules[viewId]) {
        let loader = document.getElementById('lazy-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'lazy-loader';
            loader.className = 'fixed inset-0 z-[200] flex items-center justify-center bg-[#F0F2F8]';
            loader.innerHTML = '<div class="w-10 h-10 rounded-full border-4 border-[#D1D9E6] border-t-[#3B82F6] animate-spin"></div>';
            document.body.appendChild(loader);
        }

        try {
            switch (viewId) {
                case 'view-calories': {
                    const { initCalories } = await import('./calories.js?v=20260925');
                    initCalories(uid);
                    break;
                }
                case 'view-finance': {
                    const { initFinance } = await import('./finance.js?v=20260920');
                    initFinance(uid);
                    break;
                }
                case 'view-books': {
                    const { initBooks } = await import('./books.js?v=20260920');
                    initBooks(uid);
                    break;
                }
                case 'view-movies': {
                    const { initMovies } = await import('./movies.js?v=20260920');
                    initMovies(uid);
                    break;
                }
                case 'view-shopping': {
                    const { initShopping } = await import('./shopping.js?v=20260920');
                    initShopping(uid);
                    break;
                }
                case 'view-tools': {
                    const { initTools } = await import('./tools.js?v=20260920');
                    initTools(uid);
                    break;
                }
            }
            loadedModules[viewId] = true;
        } catch (err) {
            console.error(viewId, "lazy load hatası:", err);
        } finally {
            if (loader && document.body.contains(loader)) {
                loader.remove();
            }
        }
    }

    document.querySelectorAll(".view").forEach(v => {
        v.classList.add("hidden");
    });
    const target = document.getElementById(viewId);
    if(target) {
        target.classList.remove("hidden");
        window.scrollTo(0,0);
        
        if (viewId === 'view-workout') {
            renderSplitView();
        }

        document.dispatchEvent(new CustomEvent('viewChanged', { detail: { viewId: viewId } }));
    } else {
        const dash = document.getElementById("view-dashboard");
        if (dash) {
            dash.classList.remove("hidden");
            window.scrollTo(0,0);
            document.dispatchEvent(new CustomEvent('viewChanged', { detail: { viewId: "view-dashboard" } }));
        }
    }
};

window.addEventListener("popstate", (e) => {
    if (e.state && e.state.view) {
        window.showView(e.state.view);
    } else {
        window.showView("view-dashboard");
    }
});

document.addEventListener("click", (e) => {
    const tab = e.target.closest(".nav-tab");
    if (!tab) return;

    if (window.isEditMode) {
        e.preventDefault();
        return;
    }

    const targetId = tab.dataset.target;
    if (!targetId) return;

    e.preventDefault();
    
    // Check if we are currently on a sub-page of the Workout tab, and the user clicked the Workout tab.
    // If so, act as a "Back" button instead of pushing a duplicate state.
    const currentView = document.querySelector('.view:not(.hidden)');
    const isWorkoutSubPage = currentView && (currentView.id === 'view-exercise-library' || currentView.id === 'view-split-edit');
    if (targetId === 'view-workout' && isWorkoutSubPage) {
        history.back();
        return;
    }

    // Revert replaceState back to pushState so that the back button functions properly for the history stack.
    history.pushState({view: targetId}, "", "?view=" + targetId);
    window.showView(targetId);
});

