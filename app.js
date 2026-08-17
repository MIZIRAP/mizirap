import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { setupAuthUI } from "./auth.js";
import { initDashboard, clearDashboard, updateDashboardWorkouts, updateDashboardFinance, updateDashboardWater, updateDashboardBooks, updateDashboardMovies } from "./dashboard.js";
import { initShopping, clearShopping } from "./shopping.js";
import { initWorkout, clearWorkout } from "./workout.js?v=8";
import { initFinance, clearFinance } from "./finance.js";
import { initWater, clearWater } from "./water.js";
import { initBooks, clearBooks } from "./books.js";
import { initMovies, clearMovies } from "./movies.js";
import { initProfile, clearProfile } from "./profile.js";
import { initCalories, clearCalories } from "./calories.js";
import { initHistory, clearHistory } from "./history.js";
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
            authScreen.classList.add("hidden");
            authScreen.classList.remove("flex");
            appScreen.classList.remove("hidden");
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
                updateDashboardWorkouts(workouts, activeSplitName);
            });
            
            initFinance(user.uid, (txs) => {
                updateDashboardFinance(txs);
            });

            initWater(user.uid, (waterStats) => {
                updateDashboardWater(waterStats);
            });
            initCalories(user.uid);
            
            initBooks(user.uid, (books) => {
                updateDashboardBooks(books);
            });
            
            initMovies(user.uid, (movies) => {
                updateDashboardMovies(movies);
            });
            
            initProfile(user.uid);
            initHistory(user.uid);
            
        } catch (err) {
            console.error("Login transition error:", err);
            alert("Giriş yapılırken bir hata oluştu: " + err.message);
        }
    } else {
        // Oturum açılmamışsa auth-screen zaten default olarak açıktır.
        authScreen.classList.remove("hidden");
        authScreen.classList.add("flex");
        appScreen.classList.add("hidden");
        
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
    }
});

// ---------- Sekme (view) geçişleri (Uygulama İçi) ----------
document.addEventListener("click", (e) => {
    const tab = e.target.closest(".nav-tab");
    if (!tab) return;
    
    const targetId = tab.dataset.target;
    if (!targetId) return;
    
    document.querySelectorAll(".view").forEach(v => {
        v.classList.add("hidden");
    });
    
    const target = document.getElementById(targetId);
    if(target) {
        target.classList.remove("hidden");
    }


});
