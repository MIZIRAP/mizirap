import { auth, db } from "./firebase-config.js";
import { collection, doc, addDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { escapeHtml, tl } from "./utils.js";

let allTx = [];
let unsubscribe = null;
let callback = null;

export function initFinance(uid, onChangeCallback) {
    callback = onChangeCallback;
    const txRef = query(collection(db, "users", uid, "transactions"), orderBy("createdAt", "desc"));
    unsubscribe = onSnapshot(txRef, snap => {
        allTx = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderTx();
        if(callback) callback(allTx);
    });

    const form = document.getElementById("tx-form");
    if(form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const desc = document.getElementById("tx-desc").value.trim();
            const amount = parseFloat(document.getElementById("tx-amount").value);
            const type = document.getElementById("tx-type").value;
            if (!desc || isNaN(amount)) return;
            await addDoc(collection(db, "users", uid, "transactions"), {
                desc, amount, type, createdAt: serverTimestamp()
            });
            e.target.reset();
        };
    }
}

export function clearFinance() {
    if(unsubscribe) unsubscribe();
    allTx = [];
}

export function calcBalance(txs = allTx) {
    return txs.reduce((sum, t) => sum + (t.type === "income" ? t.amount : -t.amount), 0);
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
            deleteDoc(doc(db, "users", auth.currentUser.uid, "transactions", t.id))
        );
        list.appendChild(li);
    });
}
