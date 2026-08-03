import { db, auth } from "./firebase-config.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

let currentUid = null;
let currentPhotoUrl = null;

export function initProfile(uid) {
    currentUid = uid;
    loadProfile();
}

async function loadProfile() {
    if (!currentUid) return;

    const nameEl = document.getElementById('profile-name');
    const emailEl = document.getElementById('profile-email');
    const bioEl = document.getElementById('profile-bio');
    const dobEl = document.getElementById('profile-dob');

    // Set email from Auth
    if (auth.currentUser) {
        emailEl.textContent = auth.currentUser.email || "Anonim (E-posta yok)";
    }

    try {
        const docRef = doc(db, "users", currentUid, "profile", "data");
        const docSnap = await getDoc(docRef);
        
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (nameEl) nameEl.value = data.name || (auth.currentUser ? auth.currentUser.displayName : "") || "";
            if (bioEl) bioEl.value = data.bio || "";
            if (dobEl) dobEl.value = data.dob || "";
            if (data.photoUrl) {
                currentPhotoUrl = data.photoUrl;
                updateAllProfileImages(currentPhotoUrl);
            }
        } else {

            // Default to Auth display name if profile doc doesn't exist
            if (nameEl) nameEl.value = (auth.currentUser ? auth.currentUser.displayName : "") || "";
        }
    } catch (err) {
        console.error("Error loading profile:", err);
    }
}


function updateAllProfileImages(url) {
    if(!url) return;
    document.querySelectorAll('.user-profile-img').forEach(img => {
        img.src = url;
    });
}

document.addEventListener("DOMContentLoaded", () => {
    
    const photoInput = document.getElementById('profile-photo-input');
    if (photoInput) {
        photoInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = new Image();
                    img.onload = function() {
                        const canvas = document.createElement('canvas');
                        const MAX_WIDTH = 400;
                        const MAX_HEIGHT = 400;
                        let width = img.width;
                        let height = img.height;

                        if (width > height) {
                            if (width > MAX_WIDTH) {
                                height *= MAX_WIDTH / width;
                                width = MAX_WIDTH;
                            }
                        } else {
                            if (height > MAX_HEIGHT) {
                                width *= MAX_HEIGHT / height;
                                height = MAX_HEIGHT;
                            }
                        }
                        
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        currentPhotoUrl = canvas.toDataURL('image/jpeg', 0.8);
                        updateAllProfileImages(currentPhotoUrl);
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    const saveBtn = document.getElementById('profile-save-btn');

    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            if (!currentUid) return;
            
            const nameEl = document.getElementById('profile-name');
            const bioEl = document.getElementById('profile-bio');
            const dobEl = document.getElementById('profile-dob');
            
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = 'Kaydediliyor...';
            saveBtn.disabled = true;

            try {
                
                await setDoc(doc(db, "users", currentUid, "profile", "data"), {
                    name: nameEl.value.trim(),
                    bio: bioEl.value.trim(),
                    dob: dobEl.value.trim(),
                    photoUrl: currentPhotoUrl,
                    updatedAt: new Date()
                }, { merge: true });


                saveBtn.innerHTML = `<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">check_circle</span> Kaydedildi!`;
                saveBtn.classList.add("bg-primary-container", "text-on-primary-container");
                
                setTimeout(() => {
                    saveBtn.innerHTML = originalText;
                    saveBtn.classList.remove("bg-primary-container", "text-on-primary-container");
                    saveBtn.disabled = false;
                }, 2000);
            } catch (err) {
                console.error("Error saving profile:", err);
                alert("Kaydedilirken hata oluştu.");
                saveBtn.innerHTML = originalText;
                saveBtn.disabled = false;
            }
        });
    }

    const updatePasswordBtn = document.getElementById('profile-update-password-btn');
    if (updatePasswordBtn) {
        updatePasswordBtn.addEventListener('click', async () => {
            const currentPassword = document.getElementById('profile-current-password').value;
            const newPassword = document.getElementById('profile-new-password').value;
            const confirmPassword = document.getElementById('profile-confirm-password').value;
            const msgEl = document.getElementById('profile-password-msg');

            msgEl.textContent = "";
            msgEl.className = "text-sm text-center mt-2";

            if (!currentPassword || !newPassword || !confirmPassword) {
                msgEl.textContent = "Lütfen tüm alanları doldurun.";
                msgEl.classList.add("text-error");
                return;
            }

            if (newPassword !== confirmPassword) {
                msgEl.textContent = "Yeni şifreler eşleşmiyor.";
                msgEl.classList.add("text-error");
                return;
            }

            if (newPassword.length < 6) {
                msgEl.textContent = "Şifre en az 6 karakter olmalıdır.";
                msgEl.classList.add("text-error");
                return;
            }

            const user = auth.currentUser;
            if (!user) return;

            updatePasswordBtn.disabled = true;
            updatePasswordBtn.innerHTML = "Güncelleniyor...";

            try {
                // Re-authenticate first
                const credential = EmailAuthProvider.credential(user.email, currentPassword);
                await reauthenticateWithCredential(user, credential);
                
                // Update password
                await updatePassword(user, newPassword);
                
                msgEl.textContent = "Şifreniz başarıyla güncellendi.";
                msgEl.classList.add("text-primary");
                
                // Clear fields
                document.getElementById('profile-current-password').value = "";
                document.getElementById('profile-new-password').value = "";
                document.getElementById('profile-confirm-password').value = "";
                
            } catch (err) {
                console.error("Password update error:", err);
                msgEl.classList.add("text-error");
                if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                    msgEl.textContent = "Mevcut şifre hatalı.";
                } else if (err.code === 'auth/too-many-requests') {
                    msgEl.textContent = "Çok fazla deneme yaptınız, lütfen daha sonra tekrar deneyin.";
                } else {
                    msgEl.textContent = "Bir hata oluştu: " + err.message;
                }
            } finally {
                updatePasswordBtn.disabled = false;
                updatePasswordBtn.innerHTML = `
                    <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 0;">update</span>
                    Şifreyi Güncelle
                `;
            }
        });
    }
});
