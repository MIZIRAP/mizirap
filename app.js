import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { setupAuthUI } from "./auth.js";
import { initDashboard, clearDashboard, updateDashboardWorkouts, updateDashboardFinance } from "./dashboard.js";
import { initShopping, clearShopping } from "./shopping.js";
import { initWorkout, clearWorkout } from "./workout.js";
import { initFinance, clearFinance } from "./finance.js";

// ---------- DOM referansları ----------
const authScreen = document.getElementById("auth-screen");
const appScreen = document.getElementById("app-screen");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

// ---------- Başlangıç ----------
setupAuthUI();

// ---------- Oturum durumu ----------
onAuthStateChanged(auth, (user) => {
    if (user) {
        try {
            authScreen.classList.add("hidden");
            authScreen.classList.remove("flex");
            appScreen.classList.remove("hidden");
            
            const name = user.displayName || (user.email ? user.email.split('@')[0] : "Kullanıcı");
            const dsName = document.getElementById("dashboard-user-name");
            if(dsName) dsName.textContent = name;
            
            const today = new Date();
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            const dsDate = document.getElementById("dashboard-date");
            if(dsDate) dsDate.textContent = today.toLocaleDateString('tr-TR', options);
            
            // Modülleri başlat
            initDashboard(user.uid);
            initShopping(user.uid);
            
            initWorkout(user.uid, (workouts) => {
                updateDashboardWorkouts(workouts);
            });
            
            initFinance(user.uid, (txs) => {
                updateDashboardFinance(txs);
            });
            
        } catch (err) {
            console.error("Login transition error:", err);
            alert("Giriş yapılırken bir hata oluştu: " + err.message);
        }
    } else {
        appScreen.classList.add("hidden");
        authScreen.classList.remove("hidden");
        authScreen.classList.add("flex");
        if(loginForm) loginForm.reset();
        if(registerForm) registerForm.reset();
        
        // Modülleri temizle
        clearDashboard();
        clearShopping();
        clearWorkout();
        clearFinance();
    }
});

// ---------- Sekme (view) geçişleri (Uygulama İçi) ----------
document.querySelectorAll(".nav-tab").forEach(tab => {
    tab.addEventListener("click", (e) => {
        // Sadece görünümü (view) değiştir, aktif tab stilleri kendi içinde HTML'de zaten var.
        const targetId = tab.dataset.target || tab.closest('.nav-tab').dataset.target;
        if (!targetId) return;
        
        document.querySelectorAll(".view").forEach(v => {
            v.classList.add("hidden");
        });
        
        const target = document.getElementById(targetId);
        if(target) {
            target.classList.remove("hidden");
        }
    });
});
