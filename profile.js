import { db, auth } from "./firebase-config.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, updateProfile } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

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
            } else if (auth.currentUser && auth.currentUser.photoURL) {
                currentPhotoUrl = auth.currentUser.photoURL;
                updateAllProfileImages(currentPhotoUrl);
            }
        } else {
            // Default to Auth display name if profile doc doesn't exist
            if (nameEl) nameEl.value = (auth.currentUser ? auth.currentUser.displayName : "") || "";
            if (auth.currentUser && auth.currentUser.photoURL) {
                currentPhotoUrl = auth.currentUser.photoURL;
                updateAllProfileImages(currentPhotoUrl);
            }
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

function setupProfileEvents() {
    const photoInput = document.getElementById('profile-photo-input');
    if (photoInput) {
        photoInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // 1. Validation (size & type)
            if (!file.type.startsWith('image/')) {
                alert('Lütfen geçerli bir resim dosyası seçin.');
                return;
            }
            if (file.size > 5 * 1024 * 1024) { // 5MB
                alert('Dosya boyutu 5MB\'dan küçük olmalıdır.');
                return;
            }

            if (!currentUid) {
                alert('Oturum açmadınız.');
                return;
            }

            // 2. Loading UI
            const loadingOverlay = document.createElement('div');
            loadingOverlay.className = "absolute inset-0 bg-background shadow-neo/70 flex flex-col items-center justify-center z-10 backdrop-blur-sm rounded-full";
            loadingOverlay.innerHTML = `
                <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent mb-1"></div>
                <span class="text-label-sm font-medium text-neon-blue">Yükleniyor</span>
            `;
            const wrapper = photoInput.closest('.relative') || photoInput.parentElement;
            if(wrapper) wrapper.appendChild(loadingOverlay);

            try {
                // 3. Process Image and Convert to Base64
                const base64Url = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = function(event) {
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
                            
                            // 0.7 quality to keep size small enough for Firestore
                            resolve(canvas.toDataURL('image/jpeg', 0.7));
                        };
                        img.onerror = () => reject(new Error("Görsel okunamadı"));
                        img.src = event.target.result;
                    };
                    reader.onerror = () => reject(new Error("Dosya okunamadı"));
                    reader.readAsDataURL(file);
                });
                
                currentPhotoUrl = base64Url;

                // 4. Update Firestore
                await setDoc(doc(db, "users", currentUid, "profile", "data"), {
                    photoUrl: currentPhotoUrl,
                    updatedAt: new Date()
                }, { merge: true });

                // 5. Update Auth
                if (auth.currentUser) {
                    await updateProfile(auth.currentUser, {
                        photoURL: currentPhotoUrl
                    });
                }

                // 6. Update UI
                updateAllProfileImages(currentPhotoUrl);

            } catch (err) {
                console.error('Fotoğraf yükleme hatası:', err);
                alert('Fotoğraf yüklenirken bir hata oluştu: ' + err.message);
            } finally {
                if(wrapper && loadingOverlay.parentNode === wrapper) {
                    wrapper.removeChild(loadingOverlay);
                }
                // Reset input
                photoInput.value = '';
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


                saveBtn.innerHTML = `<span class="material-symbols-rounded" style="font-variation-settings: 'FILL' 1;">check_circle</span> Kaydedildi!`;
                saveBtn.classList.add("bg-gradient-to-r from-neon-purple to-neon-blue-container", "text-white-container");
                
                setTimeout(() => {
                    saveBtn.innerHTML = originalText;
                    saveBtn.classList.remove("bg-gradient-to-r from-neon-purple to-neon-blue-container", "text-white-container");
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
                msgEl.classList.add("text-neon-blue");
                
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
                    <span class="material-symbols-rounded text-sm" style="font-variation-settings: 'FILL' 0;">update</span>
                    Şifreyi Güncelle
                `;
            }
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupProfileEvents);
} else {
    setupProfileEvents();
}

export function clearProfile() {
    currentUid = null;
    currentPhotoUrl = null;
}
