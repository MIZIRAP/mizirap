import { auth } from "./firebase-config.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const loginError = document.getElementById("login-error");
const registerError = document.getElementById("register-error");

function turkceHataMesaji(code) {
  const map = {
    "auth/invalid-email": "Geçersiz e-posta adresi.",
    "auth/user-not-found": "Bu e-posta ile kayıtlı kullanıcı bulunamadı.",
    "auth/wrong-password": "Şifre hatalı.",
    "auth/invalid-credential": "E-posta veya şifre hatalı.",
    "auth/email-already-in-use": "Bu e-posta zaten kayıtlı.",
    "auth/weak-password": "Şifre en az 6 karakter olmalı.",
    "auth/popup-closed-by-user": "Giriş işlemi iptal edildi.",
    "auth/cancelled-popup-request": "Zaten bir giriş penceresi açık.",
    "auth/operation-not-allowed": "Google girişi aktif değil (Firebase panelinden açın).",
    "auth/network-request-failed": "Ağ bağlantısı hatası, internetinizi kontrol edin."
  };
  return map[code] || "Bir hata oluştu (" + code + "), tekrar dener misin?";
}

export function setupAuthUI() {
    // Sekme geçişleri
    document.querySelectorAll(".auth-tab").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".auth-tab").forEach(b => {
                b.classList.remove("active", "text-on-surface");
                b.classList.add("text-on-surface-variant");
            });
            btn.classList.add("active", "text-on-surface");
            btn.classList.remove("text-on-surface-variant");
            
            const target = btn.dataset.auth;
            if(loginForm && registerForm) {
                loginForm.classList.toggle("hidden", target !== "login");
                registerForm.classList.toggle("hidden", target !== "register");
            }
        });
    });

    // Kayıt ol
    if(registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            registerError.textContent = "";
            const name = document.getElementById("register-name").value.trim();
            const email = document.getElementById("register-email").value.trim();
            const password = document.getElementById("register-password").value;
            try {
                const cred = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(cred.user, { displayName: name });
            } catch (err) {
                registerError.textContent = turkceHataMesaji(err.code);
            }
        });
    }

    // Giriş yap
    if(loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            loginError.textContent = "";
            const email = document.getElementById("login-email").value.trim();
            const password = document.getElementById("login-password").value;
            try {
                await signInWithEmailAndPassword(auth, email, password);
            } catch (err) {
                loginError.textContent = turkceHataMesaji(err.code);
            }
        });
    }

    // Google Giriş
    const googleBtn = document.getElementById("btn-google-login");
    if(googleBtn) {
        googleBtn.addEventListener("click", async () => {
            loginError.textContent = "";
            const provider = new GoogleAuthProvider();
            try {
                await signInWithPopup(auth, provider);
            } catch (err) {
                console.error("Google Auth Error", err);
                loginError.textContent = turkceHataMesaji(err.code);
            }
        });
    }

    // Çıkış yap
    document.querySelectorAll(".logout-trigger").forEach(btn => {
        btn.addEventListener("click", () => signOut(auth));
    });
}
