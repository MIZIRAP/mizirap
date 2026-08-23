import { db, auth } from "./firebase-config.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, updateProfile } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { CalculatorEngine } from './tools.js';

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
    const dobEl = document.getElementById('profile-dob');

    // Set email from Auth
    if (auth.currentUser) {
        emailEl.textContent = auth.currentUser.email || "Anonim (E-posta yok)";
    }

    try {
        const docRef = doc(db, "users", currentUid, "profile", "data");
        const docSnap = await getDoc(docRef).catch(e => { console.error('DB Error:', e); alert('Veritabanı işlemi sırasında bir hata oluştu.'); throw e; });


        if (docSnap.exists()) {
            const data = docSnap.data();
            if (nameEl) nameEl.value = data.name || (auth.currentUser ? auth.currentUser.displayName : "") || "";
            if (bioEl) bioEl.value = data.bio || "";
            if (dobEl) dobEl.value = data.dob || "";
            
            // Fiziksel Bilgiler
            if (document.getElementById('profile-height')) document.getElementById('profile-height').value = data.height || "";
            if (document.getElementById('profile-weight')) document.getElementById('profile-weight').value = data.weight || "";
            if (document.getElementById('profile-gender')) document.getElementById('profile-gender').value = data.gender || "m";
            if (document.getElementById('profile-activity')) document.getElementById('profile-activity').value = data.activity || "1.2";
            if (document.getElementById('profile-goal')) document.getElementById('profile-goal').value = data.goal || "";
            if (document.getElementById('profile-neck')) document.getElementById('profile-neck').value = data.neck || "";
            if (document.getElementById('profile-waist')) document.getElementById('profile-waist').value = data.waist || "";
            if (document.getElementById('profile-hip')) document.getElementById('profile-hip').value = data.hip || "";
            if (document.getElementById('profile-wrist')) document.getElementById('profile-wrist').value = data.wrist || "";
            if (document.getElementById('profile-resting-hr')) document.getElementById('profile-resting-hr').value = data.restingHr || "";
            
            generateHealthSummary(data);

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
                    height: Number(document.getElementById('profile-height').value) || 0,
                    weight: Number(document.getElementById('profile-weight').value) || 0,
                    gender: document.getElementById('profile-gender').value,
                    activity: document.getElementById('profile-activity').value,
                    neck: Number(document.getElementById('profile-neck').value) || 0,
                    waist: Number(document.getElementById('profile-waist').value) || 0,
                    hip: Number(document.getElementById('profile-hip').value) || 0,
                    wrist: Number(document.getElementById('profile-wrist').value) || 0,
                    restingHr: Number(document.getElementById('profile-resting-hr').value) || 0,
                    photoUrl: currentPhotoUrl,
                    updatedAt: new Date()
                }, { merge: true });

                generateHealthSummary({
                    height: Number(document.getElementById('profile-height').value) || 0,
                    weight: Number(document.getElementById('profile-weight').value) || 0,
                    gender: document.getElementById('profile-gender').value,
                    activity: document.getElementById('profile-activity').value,
                    neck: Number(document.getElementById('profile-neck').value) || 0,
                    waist: Number(document.getElementById('profile-waist').value) || 0,
                    hip: Number(document.getElementById('profile-hip').value) || 0,
                    wrist: Number(document.getElementById('profile-wrist').value) || 0,
                    restingHr: Number(document.getElementById('profile-resting-hr').value) || 0,
                    dob: dobEl.value.trim()
                });

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

    // Autosave Setup
    const fields = ['profile-name', 'profile-dob', 'profile-height', 'profile-weight', 'profile-gender', 'profile-activity', 'profile-goal', 'profile-neck', 'profile-waist', 'profile-hip', 'profile-wrist', 'profile-resting-hr'];
    
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', autoSaveProfile);
            if(el.tagName === 'INPUT') {
                el.addEventListener('blur', autoSaveProfile);
            }
        }
    });

    async function autoSaveProfile() {
        if (!currentUid) return;
        const nameEl = document.getElementById('profile-name');
        const dobEl = document.getElementById('profile-dob');
        
        try {
            await setDoc(doc(db, "users", currentUid, "profile", "data"), {
                name: nameEl ? nameEl.value.trim() : '',
                dob: dobEl ? dobEl.value.trim() : '',
                height: Number(document.getElementById('profile-height')?.value) || 0,
                weight: Number(document.getElementById('profile-weight')?.value) || 0,
                gender: document.getElementById('profile-gender')?.value || 'm',
                activity: document.getElementById('profile-activity')?.value || '1.2',
                goal: document.getElementById('profile-goal')?.value || '',
                neck: Number(document.getElementById('profile-neck')?.value) || 0,
                waist: Number(document.getElementById('profile-waist')?.value) || 0,
                hip: Number(document.getElementById('profile-hip')?.value) || 0,
                wrist: Number(document.getElementById('profile-wrist')?.value) || 0,
                restingHr: Number(document.getElementById('profile-resting-hr')?.value) || 0,
                photoUrl: currentPhotoUrl,
                updatedAt: new Date()
            }, { merge: true });

            generateHealthSummary({
                height: Number(document.getElementById('profile-height')?.value) || 0,
                weight: Number(document.getElementById('profile-weight')?.value) || 0,
                gender: document.getElementById('profile-gender')?.value || 'm',
                activity: document.getElementById('profile-activity')?.value || '1.2',
                goal: document.getElementById('profile-goal')?.value || '',
                neck: Number(document.getElementById('profile-neck')?.value) || 0,
                waist: Number(document.getElementById('profile-waist')?.value) || 0,
                hip: Number(document.getElementById('profile-hip')?.value) || 0,
                wrist: Number(document.getElementById('profile-wrist')?.value) || 0,
                restingHr: Number(document.getElementById('profile-resting-hr')?.value) || 0,
                dob: dobEl ? dobEl.value.trim() : ''
            });
        } catch (err) {
            console.error("Auto-save failed:", err);
        }
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

export function generateHealthSummary(data) {
    const gridEl = document.getElementById('profile-health-summary-grid');
    
    if (!data.weight || !data.height || !data.goal) {
        if (gridEl) {
            gridEl.innerHTML = `<div class="col-span-2 text-center p-4 bg-surface-variant/20 shadow-neo-inset rounded-2xl cursor-pointer hover:bg-surface-variant/30 transition-colors" onclick="document.getElementById('profile-height').scrollIntoView({behavior: 'smooth', block: 'center'}); setTimeout(() => { const h = document.getElementById('profile-height'); const w = document.getElementById('profile-weight'); const g = document.getElementById('profile-goal'); if (!h.value) h.focus(); else if (!w.value) w.focus(); else if (!g.value) g.focus(); }, 300);"><span class="text-sm font-semibold text-neon-blue">Sağlık özetini görmek için Boy, Kilo ve Hedefini gir →</span></div>`;
        }
        if (document.getElementById('dashboard-water-text')) document.getElementById('dashboard-water-text').textContent = '-- L';
        if (document.getElementById('dashboard-kcal-text')) document.getElementById('dashboard-kcal-text').textContent = '-- kcal';
        return;
    }

    if (gridEl && gridEl.children.length === 1) {
        gridEl.innerHTML = `
            <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-1 p-3 rounded-2xl bg-surface-variant/20 shadow-neo-inset">
                    <span class="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Hedef Kalori</span>
                    <span id="summary-calorie" class="text-lg font-bold text-neon-blue">-- kcal</span>
                    <span id="summary-goal-text" class="text-[10px] text-on-surface-variant font-medium mt-auto"></span>
                </div>
                <div class="flex flex-col gap-1 p-3 rounded-2xl bg-surface-variant/20 shadow-neo-inset">
                    <span class="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Su İhtiyacı</span>
                    <span id="summary-water" class="text-lg font-bold text-neon-blue">-- L</span>
                </div>
                <div class="flex flex-col gap-1 p-3 rounded-2xl bg-surface-variant/20 shadow-neo-inset">
                    <span class="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">VKİ</span>
                    <span id="summary-bmi" class="text-lg font-bold text-on-surface">--</span>
                </div>
                <div class="flex flex-col gap-1 p-3 rounded-2xl bg-surface-variant/20 shadow-neo-inset">
                    <span class="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Vücut Tipi</span>
                    <span id="summary-bodytype" class="text-lg font-bold text-neon-purple cursor-pointer transition-colors hover:text-neon-blue" onclick="document.getElementById('profile-detailed-content').classList.remove('hidden'); document.getElementById('profile-detailed-icon').innerText='expand_less'; document.getElementById('profile-wrist').focus();">--</span>
                </div>
            </div>
            <div class="flex flex-col gap-2 p-3 rounded-2xl bg-surface-variant/20 shadow-neo-inset">
                <span class="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Günlük Makrolar</span>
                <div class="flex items-center justify-between mt-1">
                    <div class="flex flex-col items-center flex-1">
                        <span class="text-sm font-bold text-neon-blue" id="summary-carb">-- g</span>
                        <span class="text-[10px] text-on-surface-variant uppercase font-medium mt-1">Karb</span>
                    </div>
                    <div class="w-px h-6 bg-outline-variant/30"></div>
                    <div class="flex flex-col items-center flex-1">
                        <span class="text-sm font-bold text-neon-blue" id="summary-protein">-- g</span>
                        <span class="text-[10px] text-on-surface-variant uppercase font-medium mt-1">Pro</span>
                    </div>
                    <div class="w-px h-6 bg-outline-variant/30"></div>
                    <div class="flex flex-col items-center flex-1">
                        <span class="text-sm font-bold text-neon-blue" id="summary-fat">-- g</span>
                        <span class="text-[10px] text-on-surface-variant uppercase font-medium mt-1">Yağ</span>
                    </div>
                </div>
            </div>
        `;
    }

    const defaultAge = 25;
    let age = defaultAge;
    if (data.dob) {
        const parts = data.dob.split('.');
        if (parts.length === 3) {
            age = new Date().getFullYear() - parseInt(parts[2], 10);
            if(isNaN(age)) age = defaultAge;
        } else {
            const dateObj = new Date(data.dob);
            if(!isNaN(dateObj.getTime())) {
                 age = new Date().getFullYear() - dateObj.getFullYear();
            }
        }
    }
    
    // TDEE & Hedef Kalori
    const tdeeResult = CalculatorEngine.calculateTDEE(data.weight, data.height, age, data.gender, parseFloat(data.activity || "1.2"));
    const calResult = CalculatorEngine.calculateCalorie(tdeeResult.value, data.goal);
    
    if (document.getElementById('summary-calorie')) document.getElementById('summary-calorie').textContent = `${calResult.value} kcal`;
    if (document.getElementById('summary-goal-text')) {
        let goalText = data.goal === 'lose' ? 'Kilo Verme' : (data.goal === 'gain' ? 'Kilo Alma' : 'Koruma');
        document.getElementById('summary-goal-text').textContent = goalText;
    }
    if (document.getElementById('dashboard-kcal-text')) document.getElementById('dashboard-kcal-text').textContent = `${calResult.value} kcal`;
    
    // Su & BMI & Body Type
    const waterResult = CalculatorEngine.calculateWater(data.weight, 0);
    if (document.getElementById('summary-water')) document.getElementById('summary-water').textContent = `${waterResult.value} L`;
    if (document.getElementById('dashboard-water-text')) document.getElementById('dashboard-water-text').textContent = `${waterResult.value} L`;
    
    const bmiResult = CalculatorEngine.calculateBMI(data.weight, data.height);
    if (document.getElementById('summary-bmi')) document.getElementById('summary-bmi').textContent = `${bmiResult.value} (${bmiResult.text})`;

    if (!data.wrist) {
        if (document.getElementById('summary-bodytype')) {
            document.getElementById('summary-bodytype').innerHTML = `<span class="text-sm text-outline cursor-pointer hover:text-neon-blue transition-colors" onclick="document.getElementById('profile-detailed-content').classList.remove('hidden'); document.getElementById('profile-detailed-icon').innerText='expand_less'; document.getElementById('profile-wrist').focus();">Bilek ölçünü gir →</span>`;
        }
    } else {
        const bodyTypeResult = CalculatorEngine.calculateBodyType(data.wrist, data.height, data.gender);
        if (document.getElementById('summary-bodytype')) document.getElementById('summary-bodytype').textContent = bodyTypeResult.value;
    }

    // Makrolar
    CalculatorEngine.calculateProtein(data.weight, data.goal, parseFloat(data.activity || "1.2")); // internal state'i günceller
    const macroResult = CalculatorEngine.calculateMacro(calResult.value, data.weight);
    
    if (macroResult.raw) {
        if (document.getElementById('summary-carb')) document.getElementById('summary-carb').textContent = `${macroResult.raw.c}g`;
        if (document.getElementById('summary-protein')) document.getElementById('summary-protein').textContent = `${macroResult.raw.p}g`;
        if (document.getElementById('summary-fat')) document.getElementById('summary-fat').textContent = `${macroResult.raw.f}g`;
    }
}
