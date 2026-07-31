// ============================================
// HAYAT DEFTERİ — uygulama mantığı
// Firebase Auth (email/şifre) + Firestore (görevler, notlar, işlemler, alışveriş, antrenman)
// ============================================

import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, writeBatch,
  onSnapshot, query, orderBy, serverTimestamp, getDocs
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ---------- DOM referansları ----------
const authScreen = document.getElementById("auth-screen");
const appScreen = document.getElementById("app-screen");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const loginError = document.getElementById("login-error");
const registerError = document.getElementById("register-error");

let unsubscribers = [];

// ---------- Sekme geçişleri (giriş ekranı içinde) ----------
document.querySelectorAll(".auth-tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".auth-tab").forEach(b => {
      b.classList.remove("active", "text-on-surface");
      b.classList.add("text-on-surface-variant");
    });
    btn.classList.add("active", "text-on-surface");
    btn.classList.remove("text-on-surface-variant");
    
    const target = btn.dataset.auth;
    loginForm.classList.toggle("hidden", target !== "login");
    registerForm.classList.toggle("hidden", target !== "register");
  });
});

// ---------- Kayıt ol ----------
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

// ---------- Giriş yap ----------
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

// ---------- Çıkış yap ----------
document.querySelectorAll(".logout-trigger").forEach(btn => {
    btn.addEventListener("click", () => signOut(auth));
});

function turkceHataMesaji(code) {
  const map = {
    "auth/invalid-email": "Geçersiz e-posta adresi.",
    "auth/user-not-found": "Bu e-posta ile kayıtlı kullanıcı bulunamadı.",
    "auth/wrong-password": "Şifre hatalı.",
    "auth/invalid-credential": "E-posta veya şifre hatalı.",
    "auth/email-already-in-use": "Bu e-posta zaten kayıtlı.",
    "auth/weak-password": "Şifre en az 6 karakter olmalı.",
  };
  return map[code] || "Bir hata oluştu, tekrar dener misin?";
}

// ---------- Oturum durumu ----------
onAuthStateChanged(auth, (user) => {
  unsubscribers.forEach(u => u());
  unsubscribers = [];

  if (user) {
    authScreen.classList.add("hidden");
    authScreen.classList.remove("flex");
    appScreen.classList.remove("hidden");
    
    const name = user.displayName || user.email.split('@')[0];
    const dsName = document.getElementById("dashboard-user-name");
    if(dsName) dsName.textContent = name;
    
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dsDate = document.getElementById("dashboard-date");
    if(dsDate) dsDate.textContent = today.toLocaleDateString('tr-TR', options);
    
    startListeners(user.uid);
  } else {
    appScreen.classList.add("hidden");
    authScreen.classList.remove("hidden");
    authScreen.classList.add("flex");
    loginForm.reset();
    registerForm.reset();
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

// ---------- Yardımcılar ----------
const tl = (n) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("tr-TR") : "";
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Veri Yönetimi ----------
let allTasks = [], allNotes = [], allTx = [], allShopping = [], allWorkouts = [];

function startListeners(uid) {
  const tasksRef = query(collection(db, "users", uid, "tasks"), orderBy("createdAt", "desc"));
  const notesRef = query(collection(db, "users", uid, "notes"), orderBy("createdAt", "desc"));
  const txRef = query(collection(db, "users", uid, "transactions"), orderBy("createdAt", "desc"));
  const shoppingRef = query(collection(db, "users", uid, "shoppingList"), orderBy("createdAt", "desc"));
  const workoutsRef = query(collection(db, "users", uid, "workouts"), orderBy("createdAt", "desc"));

  unsubscribers.push(onSnapshot(tasksRef, snap => {
    allTasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderDashboard();
  }));
  unsubscribers.push(onSnapshot(notesRef, snap => {
    allNotes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderDashboard();
  }));
  unsubscribers.push(onSnapshot(txRef, snap => {
    allTx = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderTx();
    renderDashboard();
  }));
  unsubscribers.push(onSnapshot(shoppingRef, snap => {
    allShopping = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderShoppingList();
  }));
  unsubscribers.push(onSnapshot(workoutsRef, snap => {
    allWorkouts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderWorkouts();
    renderDashboard();
  }));

  // Forms
  document.getElementById("tx-form").onsubmit = (e) => addTx(e, uid);
  document.getElementById("shopping-form").onsubmit = (e) => addShoppingItem(e, uid);
  document.getElementById("workout-form").onsubmit = (e) => addWorkout(e, uid);
  
  // Shopping Clear
  const clearBtn = document.getElementById("clear-shopping-btn");
  if(clearBtn) {
      clearBtn.onclick = async () => {
          if(confirm('Tüm listeyi temizlemek istediğinize emin misiniz?')) {
              const batch = writeBatch(db);
              allShopping.forEach(item => {
                  batch.delete(doc(db, "users", uid, "shoppingList", item.id));
              });
              await batch.commit();
          }
      };
  }
}

// ---------- FİNANS ----------
async function addTx(e, uid) {
  e.preventDefault();
  const desc = document.getElementById("tx-desc").value.trim();
  const amount = parseFloat(document.getElementById("tx-amount").value);
  const type = document.getElementById("tx-type").value;
  if (!desc || isNaN(amount)) return;
  await addDoc(collection(db, "users", uid, "transactions"), {
    desc, amount, type, createdAt: serverTimestamp()
  });
  e.target.reset();
}

function renderTx() {
  const list = document.getElementById("tx-list");
  if(!list) return;
  list.innerHTML = "";
  if (allTx.length === 0) {
      list.innerHTML = "<p class='text-on-surface-variant text-sm'>Henüz işlem yok.</p>";
      return;
  }
  allTx.forEach(t => {
    const li = document.createElement("div");
    li.className = "flex justify-between items-center bg-surface-container-low p-3 rounded-lg";
    const dateStr = t.createdAt?.toDate ? t.createdAt.toDate().toLocaleDateString("tr-TR") : "";
    const sign = t.type === "income" ? "+" : "−";
    const colorClass = t.type === "income" ? "text-primary" : "text-error";
    li.innerHTML = `
      <div class="flex flex-col">
          <span class="text-on-background font-body-md">${escapeHtml(t.desc)}</span>
          <span class="text-outline text-label-sm">${dateStr}</span>
      </div>
      <div class="flex items-center gap-3">
          <span class="font-headline-sm ${colorClass}">${sign}${tl(Math.abs(t.amount))}</span>
          <button class="material-symbols-outlined text-outline hover:text-error transition-colors p-1" data-id="${t.id}">delete</button>
      </div>
    `;
    li.querySelector("button").addEventListener("click", () =>
      deleteDoc(doc(db, "users", auth.currentUser.uid, "transactions", t.id)));
    list.appendChild(li);
  });
}

function calcBalance() {
  return allTx.reduce((sum, t) => sum + (t.type === "income" ? t.amount : -t.amount), 0);
}

// ---------- ALIŞVERİŞ LİSTESİ ----------
async function addShoppingItem(e, uid) {
    e.preventDefault();
    const input = document.getElementById("shopping-input");
    const title = input.value.trim();
    if (!title) return;
    await addDoc(collection(db, "users", uid, "shoppingList"), {
        title, done: false, createdAt: serverTimestamp()
    });
    input.value = "";
}

function renderShoppingList() {
    const activeList = document.getElementById("active-shopping-list");
    const completedList = document.getElementById("completed-shopping-list");
    const countLabel = document.getElementById("active-shopping-count");
    
    if(!activeList || !completedList) return;
    
    activeList.innerHTML = "";
    completedList.innerHTML = "";
    
    const activeItems = allShopping.filter(i => !i.done);
    const completedItems = allShopping.filter(i => i.done);
    
    if(countLabel) countLabel.textContent = `${activeItems.length} Ürün`;
    
    activeItems.forEach(item => {
        const div = document.createElement("div");
        div.className = "group bg-surface-container-lowest rounded-[24px] p-4 card-shadow flex items-center justify-between transition-all hover:bg-surface-container-low animate-in fade-in slide-in-from-top-2 duration-300";
        div.innerHTML = `
            <div class="flex items-center gap-4">
                <button class="toggle-btn w-6 h-6 rounded-md border-2 border-primary flex items-center justify-center transition-colors">
                    <span class="material-symbols-outlined text-[18px] opacity-0 transition-opacity">check</span>
                </button>
                <span class="font-body-md text-on-surface text-body-md">${escapeHtml(item.title)}</span>
            </div>
            <button class="delete-btn material-symbols-outlined text-outline hover:text-error transition-colors p-1">delete</button>
        `;
        div.querySelector(".toggle-btn").addEventListener("click", () => {
            updateDoc(doc(db, "users", auth.currentUser.uid, "shoppingList", item.id), { done: true });
        });
        div.querySelector(".delete-btn").addEventListener("click", () => {
            deleteDoc(doc(db, "users", auth.currentUser.uid, "shoppingList", item.id));
        });
        activeList.appendChild(div);
    });
    
    completedItems.forEach(item => {
        const div = document.createElement("div");
        div.className = "bg-surface-dim/40 rounded-[24px] p-4 flex items-center justify-between border border-transparent";
        div.innerHTML = `
            <div class="flex items-center gap-4">
                <button class="toggle-btn w-6 h-6 rounded-md bg-primary flex items-center justify-center transition-colors">
                    <span class="material-symbols-outlined text-[18px] text-on-primary">check</span>
                </button>
                <span class="font-body-md text-outline checked-item text-body-md">${escapeHtml(item.title)}</span>
            </div>
            <button class="delete-btn material-symbols-outlined text-outline hover:text-error transition-colors p-1">delete</button>
        `;
        div.querySelector(".toggle-btn").addEventListener("click", () => {
            updateDoc(doc(db, "users", auth.currentUser.uid, "shoppingList", item.id), { done: false });
        });
        div.querySelector(".delete-btn").addEventListener("click", () => {
            deleteDoc(doc(db, "users", auth.currentUser.uid, "shoppingList", item.id));
        });
        completedList.appendChild(div);
    });
}

// ---------- SPOR TAKİBİ ----------
async function addWorkout(e, uid) {
    e.preventDefault();
    const name = document.getElementById("workout-name").value.trim();
    const sets = parseInt(document.getElementById("workout-sets").value);
    const reps = parseInt(document.getElementById("workout-reps").value);
    const weight = parseFloat(document.getElementById("workout-weight").value);
    
    if (!name || isNaN(sets) || isNaN(reps) || isNaN(weight)) return;
    
    await addDoc(collection(db, "users", uid, "workouts"), {
        name, sets, reps, weight, createdAt: serverTimestamp()
    });
    e.target.reset();
}

function renderWorkouts() {
    const list = document.getElementById("workout-list");
    if(!list) return;
    list.innerHTML = "";
    
    if(allWorkouts.length === 0) {
        list.innerHTML = "<p class='text-on-surface-variant'>Henüz egzersiz eklenmemiş.</p>";
    }
    
    // Bu hafta istatistikleri
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const workoutsThisWeek = allWorkouts.filter(w => w.createdAt?.toDate && w.createdAt.toDate() > oneWeekAgo);
    const uniqueDays = new Set(workoutsThisWeek.map(w => w.createdAt.toDate().toDateString()));
    const weeklyText = document.getElementById("weekly-workout-text");
    if(weeklyText) weeklyText.textContent = `Bu hafta ${uniqueDays.size} gün antrenman yapıldı`;
    
    // Görüntüleme (Son 10)
    allWorkouts.slice(0, 10).forEach(w => {
        const btn = document.createElement("button");
        btn.className = "w-full text-left bg-surface-container-lowest rounded-xl p-4 card-shadow hover:scale-[0.98] transition-transform duration-200";
        
        const dateStr = w.createdAt?.toDate ? w.createdAt.toDate().toLocaleDateString("tr-TR", {day: 'numeric', month:'short'}) : "";
        
        btn.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <h3 class="font-headline-sm text-headline-sm text-on-background">${escapeHtml(w.name)}</h3>
                <span class="text-outline text-sm">${dateStr}</span>
            </div>
            <div class="flex justify-between items-end">
                <div class="font-body-lg text-body-lg text-on-surface-variant">
                    <span class="font-medium text-primary">${w.sets}</span> set × <span class="font-medium text-primary">${w.reps}</span> tekrar
                </div>
                <div class="font-headline-sm text-headline-sm text-primary">${w.weight}<span class="font-body-md text-body-md text-on-surface-variant ml-1">kg</span></div>
            </div>
        `;
        btn.addEventListener("click", () => {
            if(confirm("Bu egzersizi silmek istiyor musunuz?")) {
                deleteDoc(doc(db, "users", auth.currentUser.uid, "workouts", w.id));
            }
        });
        list.appendChild(btn);
    });
}

// ---------- ÖZET (dashboard) ----------
function renderDashboard() {
  const statNotes = document.getElementById("stat-notes");
  if(statNotes) statNotes.textContent = allNotes.length;
  
  // Workouts this week
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const workoutsThisWeek = allWorkouts.filter(w => w.createdAt?.toDate && w.createdAt.toDate() > oneWeekAgo);
  const uniqueWorkoutDays = new Set(workoutsThisWeek.map(w => w.createdAt.toDate().toDateString()));
  
  const statWorkout = document.getElementById("stat-workout-count");
  if(statWorkout) statWorkout.textContent = uniqueWorkoutDays.size > 0 ? `${uniqueWorkoutDays.size}/hafta` : "Yapılmadı";

  const balance = calcBalance();
  const statBalance = document.getElementById("stat-balance");
  if(statBalance) statBalance.textContent = tl(balance);

  const upcoming = document.getElementById("dashboard-tasks-container");
  if(!upcoming) return;
  upcoming.innerHTML = "";
  
  const activeTasks = allTasks.filter(t => !t.done).slice(0, 5);
  
  if (activeTasks.length === 0) {
      upcoming.innerHTML = `<p class="text-on-surface-variant text-sm">Bekleyen görev yok.</p>`;
  } else {
      activeTasks.forEach(t => {
        const div = document.createElement("div");
        div.className = "flex items-center gap-4 border-b border-outline-variant/20 pb-3 last:border-0 last:pb-0";
        div.innerHTML = `
            <div class="p-2 rounded-full bg-surface-container-low text-primary cursor-pointer hover:bg-primary-container transition-colors">
                <span class="material-symbols-outlined text-[18px]">radio_button_unchecked</span>
            </div>
            <div class="flex-1">
                <p class="font-body-lg text-on-surface">${escapeHtml(t.title)}</p>
                <p class="font-label-sm text-on-surface-variant">${t.due ? fmtDate(t.due) : "Tarihsiz"}</p>
            </div>
        `;
        div.querySelector(".p-2").addEventListener("click", () => {
            updateDoc(doc(db, "users", auth.currentUser.uid, "tasks", t.id), { done: true });
        });
        upcoming.appendChild(div);
      });
  }
}
