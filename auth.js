import { auth } from "./firebase-config.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

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
    "auth/network-request-failed": "Ağ bağlantısı hatası, internetinizi kontrol edin.",
    "auth/unauthorized-domain": "Bu alan adı yetkisiz. Firebase panelinden yetkilendirin."
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
                await sendEmailVerification(cred.user);
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

    // Şifremi Unuttum Modal Akışı
    const forgotLink = document.getElementById("forgot-password-link");
    const forgotModal = document.getElementById("forgot-password-modal");
    const forgotCancel = document.getElementById("forgot-password-cancel");
    const forgotSend = document.getElementById("forgot-password-send");
    const forgotEmail = document.getElementById("forgot-password-email");
    const forgotMsg = document.getElementById("forgot-password-message");

    if (forgotLink && forgotModal) {
        forgotLink.addEventListener("click", (e) => {
            e.preventDefault();
            forgotEmail.value = document.getElementById("login-email")?.value || "";
            forgotMsg.textContent = "";
            forgotMsg.className = "font-label-sm min-h-[20px] mb-4";

            forgotModal.classList.remove("hidden");
            void forgotModal.offsetWidth;
            const content = document.getElementById("forgot-password-modal-content");
            if(content) content.classList.remove("opacity-0", "scale-95");
        });

        const closeForgotModal = () => {
            const content = document.getElementById("forgot-password-modal-content");
            if(content) content.classList.add("opacity-0", "scale-95");
            setTimeout(() => forgotModal.classList.add("hidden"), 200);
        };

        if (forgotCancel) forgotCancel.addEventListener("click", closeForgotModal);

        forgotModal.addEventListener("click", (e) => {
            if(e.target === forgotModal) closeForgotModal();
        });

        if (forgotSend) {
            forgotSend.addEventListener("click", async () => {
                const email = forgotEmail.value.trim();
                if (!email) {
                    forgotMsg.textContent = "Lütfen e-posta adresinizi girin.";
                    forgotMsg.className = "font-label-sm min-h-[20px] mb-4 text-error";
                    return;
                }

                forgotSend.disabled = true;
                forgotSend.textContent = "Gönderiliyor...";

                try {
                    await sendPasswordResetEmail(auth, email);
                    forgotMsg.textContent = "Şifre sıfırlama bağlantısı gönderildi! Lütfen e-postanızı kontrol edin.";
                    forgotMsg.className = "font-label-sm min-h-[20px] mb-4 text-primary";
                    setTimeout(closeForgotModal, 3000);
                } catch (err) {
                    forgotMsg.textContent = getFriendlyError(err.code);
                    forgotMsg.className = "font-label-sm min-h-[20px] mb-4 text-error";
                } finally {
                    forgotSend.disabled = false;
                    forgotSend.textContent = "Gönder";
                }
            });
        }
    }

    // Çıkış yap
    document.querySelectorAll(".logout-trigger").forEach(btn => {
        btn.addEventListener("click", () => {
            signOut(auth);
        });
    });

    // Doğrulama e-postası tekrar gönder
    const btnResend = document.getElementById("btn-resend-verification");
    const btnCheck = document.getElementById("btn-check-verification");
    const verificationMsg = document.getElementById("verification-message");
    
    if (btnCheck) {
        btnCheck.addEventListener("click", async () => {
            if (auth.currentUser) {
                try {
                    btnCheck.disabled = true;
                    btnCheck.innerHTML = '<span class="material-symbols-rounded animate-spin">refresh</span> Kontrol ediliyor...';
                    await auth.currentUser.reload();
                    if (auth.currentUser.emailVerified) {
                        window.location.reload();
                    } else {
                        if(verificationMsg) {
                            verificationMsg.textContent = "Henüz doğrulanmamış. Lütfen e-postanı kontrol et.";
                            verificationMsg.className = "text-error font-label-sm mt-4 min-h-[14px]";
                        }
                    }
                } catch (err) {
                    if(verificationMsg) {
                        verificationMsg.textContent = turkceHataMesaji(err.code);
                        verificationMsg.className = "text-error font-label-sm mt-4 min-h-[14px]";
                    }
                } finally {
                    btnCheck.disabled = false;
                    btnCheck.innerHTML = "Doğruladım, devam et";
                }
            }
        });
    }

    if (btnResend) {
        btnResend.addEventListener("click", async () => {
            if (auth.currentUser && !auth.currentUser.emailVerified) {
                try {
                    btnResend.disabled = true;
                    btnResend.innerHTML = '<span class="material-symbols-rounded animate-spin">refresh</span> Gönderiliyor...';
                    await sendEmailVerification(auth.currentUser);
                    if(verificationMsg) {
                        verificationMsg.textContent = "Doğrulama e-postası tekrar gönderildi. Lütfen gelen kutunu kontrol et.";
                        verificationMsg.className = "text-neon-blue font-label-sm mt-4 min-h-[14px]";
                    }
                } catch (err) {
                    if(verificationMsg) {
                        verificationMsg.textContent = turkceHataMesaji(err.code);
                        verificationMsg.className = "text-error font-label-sm mt-4 min-h-[14px]";
                    }
                } finally {
                    btnResend.disabled = false;
                    btnResend.innerHTML = 'Doğrulama E-postasını Tekrar Gönder';
                }
            }
        });
    }
}
