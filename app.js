import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { setupAuthUI } from "./auth.js";
import { initDashboard, clearDashboard, updateDashboardWorkouts, updateDashboardFinance, updateDashboardWater, updateDashboardBooks, updateDashboardMovies, updateDashboardCalories } from "./dashboard.js?v=1787428044";
import { initShopping, clearShopping } from "./shopping.js";
import { initWorkout, clearWorkout } from "./workout.js?v=1787428053";
import { initFinance, clearFinance } from "./finance.js";
import { initWater, clearWater } from "./water.js";
import { initBooks, clearBooks } from "./books.js?v=1787428044";
import { initMovies, clearMovies } from "./movies.js?v=1787428044";
import { initProfile, clearProfile } from "./profile.js?v=1787428045";
import { initCalories, clearCalories } from "./calories.js?v=1787428046";
import { initHistory, clearHistory } from "./history.js";
import { initTools, clearTools } from "./tools.js?v=1787428045";
import { clearAllListeners } from "./listenerManager.js";

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
            initShopping(user.uid);

            initWorkout(user.uid, (workouts, activeSplitName) => {
                requestAnimationFrame(() => updateDashboardWorkouts(workouts, activeSplitName));
            });

            initFinance(user.uid, (txs) => {
                requestAnimationFrame(() => updateDashboardFinance(txs));
            });

            initWater(user.uid, (waterStats) => {
                requestAnimationFrame(() => updateDashboardWater(waterStats));
            });
            initCalories(user.uid, (caloriesStats) => {
                requestAnimationFrame(() => updateDashboardCalories(caloriesStats));
            });

            initBooks(user.uid, (books) => {
                requestAnimationFrame(() => updateDashboardBooks(books));
            });

            initMovies(user.uid, (movies) => {
                requestAnimationFrame(() => updateDashboardMovies(movies));
            });

            initProfile(user.uid);
            initHistory(user.uid);
            initTools();

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
        document.body.style.overflow = ''; // Modal vs. açık kaldıysa temizle

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
        clearDashboard();
        clearShopping();
        clearWorkout();
        clearFinance();
        clearWater();
        clearBooks();
        clearMovies();
        clearProfile();
        clearCalories();
        clearHistory();
        clearTools();
    }
});

// ---------- Sekme (view) geçişleri (Uygulama İçi, History API Destekli) ----------
window.showView = function(viewId) {
    document.querySelectorAll(".view").forEach(v => {
        v.classList.add("hidden");
    });
    const target = document.getElementById(viewId);
    if(target) {
        target.classList.remove("hidden");
        window.scrollTo(0,0);
    } else {
        const dash = document.getElementById("view-dashboard");
        if (dash) {
            dash.classList.remove("hidden");
            window.scrollTo(0,0);
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
    history.pushState({view: targetId}, "", "?view=" + targetId);
    window.showView(targetId);
});
