// ============================================
// HAYAT DEFTERİ — uygulama mantığı
// Firebase Auth (email/şifre) + Firestore (görevler, notlar, işlemler)
// ============================================

import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore, collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp
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
const userNameDisplay = document.getElementById("user-name-display");

let unsubscribers = []; // Firestore dinleyicilerini oturum kapanınca temizlemek için

// ---------- Sekme geçişleri (giriş ekranı içinde) ----------
document.querySelectorAll(".auth-tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".auth-tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
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
document.getElementById("logout-btn").addEventListener("click", () => signOut(auth));

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
    appScreen.classList.remove("hidden");
    userNameDisplay.textContent = user.displayName || user.email;
    startListeners(user.uid);
  } else {
    appScreen.classList.add("hidden");
    authScreen.classList.remove("hidden");
    loginForm.reset();
    registerForm.reset();
  }
});

// ---------- Sekme (view) geçişleri ----------
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`view-${tab.dataset.view}`).classList.add("active");
  });
});

// ---------- Yardımcılar ----------
const tl = (n) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("tr-TR") : "";

let allTasks = [], allNotes = [], allTx = [];

function startListeners(uid) {
  const tasksRef = query(collection(db, "users", uid, "tasks"), orderBy("createdAt", "desc"));
  const notesRef = query(collection(db, "users", uid, "notes"), orderBy("createdAt", "desc"));
  const txRef = query(collection(db, "users", uid, "transactions"), orderBy("createdAt", "desc"));

  unsubscribers.push(onSnapshot(tasksRef, snap => {
    allTasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderTasks();
    renderDashboard();
  }));
  unsubscribers.push(onSnapshot(notesRef, snap => {
    allNotes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderNotes();
    renderDashboard();
  }));
  unsubscribers.push(onSnapshot(txRef, snap => {
    allTx = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderTx();
    renderDashboard();
  }));

  // Formları uid'ye bağla
  document.getElementById("task-form").onsubmit = (e) => addTask(e, uid);
  document.getElementById("note-form").onsubmit = (e) => addNote(e, uid);
  document.getElementById("tx-form").onsubmit = (e) => addTx(e, uid);
}

// ---------- GÖREVLER ----------
async function addTask(e, uid) {
  e.preventDefault();
  const title = document.getElementById("task-title").value.trim();
  const due = document.getElementById("task-due").value;
  const priority = document.getElementById("task-priority").value;
  if (!title) return;
  await addDoc(collection(db, "users", uid, "tasks"), {
    title, due: due || null, priority, done: false, createdAt: serverTimestamp()
  });
  e.target.reset();
}

function renderTasks() {
  const list = document.getElementById("task-list");
  const empty = document.getElementById("tasks-empty");
  list.innerHTML = "";
  empty.classList.toggle("hidden", allTasks.length > 0);
  allTasks.forEach(t => {
    const li = document.createElement("li");
    li.innerHTML = `
      <input type="checkbox" class="task-check" ${t.done ? "checked" : ""}>
      <span class="task-title ${t.done ? "done" : ""}">${escapeHtml(t.title)}</span>
      ${t.due ? `<span class="task-due">${fmtDate(t.due)}</span>` : ""}
      <span class="priority-badge priority-${t.priority}">${priorityLabel(t.priority)}</span>
      <button class="delete-btn" title="Sil">✕</button>
    `;
    li.querySelector(".task-check").addEventListener("change", (e) =>
      updateDoc(doc(db, "users", auth.currentUser.uid, "tasks", t.id), { done: e.target.checked }));
    li.querySelector(".delete-btn").addEventListener("click", () =>
      deleteDoc(doc(db, "users", auth.currentUser.uid, "tasks", t.id)));
    list.appendChild(li);
  });
}
function priorityLabel(p) { return { low: "Düşük", medium: "Orta", high: "Yüksek" }[p] || p; }

// ---------- NOTLAR ----------
async function addNote(e, uid) {
  e.preventDefault();
  const title = document.getElementById("note-title").value.trim();
  const body = document.getElementById("note-body").value.trim();
  if (!title) return;
  await addDoc(collection(db, "users", uid, "notes"), { title, body, createdAt: serverTimestamp() });
  e.target.reset();
}

function renderNotes() {
  const grid = document.getElementById("note-list");
  const empty = document.getElementById("notes-empty");
  grid.innerHTML = "";
  empty.classList.toggle("hidden", allNotes.length > 0);
  allNotes.forEach(n => {
    const card = document.createElement("div");
    card.className = "note-card";
    const dateStr = n.createdAt?.toDate ? n.createdAt.toDate().toLocaleDateString("tr-TR") : "";
    card.innerHTML = `
      <h4>${escapeHtml(n.title)}</h4>
      <p>${escapeHtml(n.body || "")}</p>
      <div class="note-card-footer">
        <span class="note-date">${dateStr}</span>
        <button class="delete-btn" title="Sil">✕</button>
      </div>
    `;
    card.querySelector(".delete-btn").addEventListener("click", () =>
      deleteDoc(doc(db, "users", auth.currentUser.uid, "notes", n.id)));
    grid.appendChild(card);
  });
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
  const empty = document.getElementById("tx-empty");
  list.innerHTML = "";
  empty.classList.toggle("hidden", allTx.length > 0);
  allTx.forEach(t => {
    const li = document.createElement("li");
    const dateStr = t.createdAt?.toDate ? t.createdAt.toDate().toLocaleDateString("tr-TR") : "";
    const sign = t.type === "income" ? "+" : "−";
    li.innerHTML = `
      <span class="tx-desc">${escapeHtml(t.desc)}</span>
      <span class="tx-date">${dateStr}</span>
      <span class="tx-amount ${t.type}">${sign} ${tl(Math.abs(t.amount))}</span>
      <button class="delete-btn" title="Sil">✕</button>
    `;
    li.querySelector(".delete-btn").addEventListener("click", () =>
      deleteDoc(doc(db, "users", auth.currentUser.uid, "transactions", t.id)));
    list.appendChild(li);
  });
}

function calcBalance() {
  return allTx.reduce((sum, t) => sum + (t.type === "income" ? t.amount : -t.amount), 0);
}

// ---------- ÖZET (dashboard) ----------
function renderDashboard() {
  document.getElementById("stat-open-tasks").textContent = allTasks.filter(t => !t.done).length;
  document.getElementById("stat-notes").textContent = allNotes.length;
  const balance = calcBalance();
  const balanceEl = document.getElementById("stat-balance");
  balanceEl.textContent = tl(balance);
  document.getElementById("stat-balance-card").classList.toggle("summary-card--accent", balance >= 0);

  const upcoming = document.getElementById("dashboard-tasks");
  upcoming.innerHTML = "";
  allTasks.filter(t => !t.done).slice(0, 5).forEach(t => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${escapeHtml(t.title)}</span><span class="muted-small">${t.due ? fmtDate(t.due) : ""}</span>`;
    upcoming.appendChild(li);
  });
  if (!upcoming.children.length) upcoming.innerHTML = `<li class="muted-small">Açık görev yok.</li>`;

  const recentTx = document.getElementById("dashboard-transactions");
  recentTx.innerHTML = "";
  allTx.slice(0, 5).forEach(t => {
    const li = document.createElement("li");
    const sign = t.type === "income" ? "+" : "−";
    li.innerHTML = `<span>${escapeHtml(t.desc)}</span><span class="muted-small">${sign} ${tl(Math.abs(t.amount))}</span>`;
    recentTx.appendChild(li);
  });
  if (!recentTx.children.length) recentTx.innerHTML = `<li class="muted-small">Henüz işlem yok.</li>`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
