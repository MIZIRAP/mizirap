import { auth, db } from "./firebase-config.js";
import { collection, doc, addDoc, updateDoc, deleteDoc, writeBatch, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { escapeHtml, handleFormSubmit } from "./utils.js";
import { registerListener } from "./listenerManager.js";

let allShopping = [];
let unsubscribe = null;

export function initShopping(uid) {
    const shoppingRef = query(collection(db, "users", uid, "shoppingList"), orderBy("createdAt", "desc"));
    unsubscribe = registerListener(onSnapshot(shoppingRef, snap => {
        allShopping = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderShoppingList();
    }));

    const form = document.getElementById("shopping-form");
    if(form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const input = document.getElementById("shopping-input");
            const title = input.value.trim();
            if (!title) return;
            await addDoc(collection(db, "users", uid, "shoppingList"), {
                title, done: false, createdAt: serverTimestamp()
            });
            input.value = "";
        };
    }

    const clearBtn = document.getElementById("clear-shopping-btn");
    if(clearBtn) {
        clearBtn.onclick = async () => {
            if(confirm('Tamamlanan ürünleri temizlemek istediğinize emin misiniz?')) {
                const batch = writeBatch(db);
                let count = 0;
                allShopping.filter(item => item.done).forEach(item => {
                    batch.delete(doc(db, "users", uid, "shoppingList", item.id));
                    count++;
                });
                if (count > 0) {
                    await batch.commit();
                } else {
                    alert('Silinecek tamamlanmış ürün bulunamadı.');
                }
            }
        };
    }
}

export function clearShopping() {
    if(unsubscribe) unsubscribe();
    allShopping = [];
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
    
    const dashboardCountLabel = document.getElementById("dashboard-shopping-count");
    if(dashboardCountLabel) dashboardCountLabel.textContent = `${activeItems.length} Ürün`;
    
    activeItems.forEach(item => {
        const div = document.createElement("div");
        div.className = "group bg-surface-container-lowest rounded-2xl p-4 shadow-sm flex items-center justify-between transition-all hover:bg-surface-container-low animate-in fade-in slide-in-from-top-2 duration-300";
        div.innerHTML = `
            <!-- Normal View -->
            <div class="flex items-center justify-between w-full normal-view">
                <div class="flex items-center gap-4">
                    <button class="toggle-btn w-6 h-6 rounded-md border-2 border-primary flex items-center justify-center transition-colors">
                        <span class="material-symbols-outlined icon-sm text-transparent">check</span>
                    </button>
                    <span class="font-body-md text-on-surface text-body-md">${escapeHtml(item.title)}</span>
                </div>
                <div class="flex items-center gap-1">
                    <button class="edit-btn material-symbols-outlined text-outline hover:text-primary transition-colors p-1">edit</button>
                    <button class="delete-btn material-symbols-outlined text-outline hover:text-error transition-colors p-1">delete</button>
                </div>
            </div>
            <!-- Edit View -->
            <div class="hidden items-center justify-between w-full gap-2 edit-view">
                <input type="text" class="w-full bg-surface-container border border-outline-variant rounded-lg px-2 py-1 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary edit-input" value="${escapeHtml(item.title)}">
                <button class="bg-primary text-on-primary px-3 py-1 rounded-lg text-sm font-medium shrink-0 save-btn">Kaydet</button>
                <button class="text-on-surface-variant px-2 py-1 rounded-lg text-sm shrink-0 cancel-btn">İptal</button>
            </div>
        `;
        
        const normalView = div.querySelector('.normal-view');
        const editView = div.querySelector('.edit-view');
        const editInput = div.querySelector('.edit-input');
        const saveBtn = div.querySelector('.save-btn');
        
        div.querySelector(".toggle-btn").addEventListener("click", () => {
            updateDoc(doc(db, "users", auth.currentUser.uid, "shoppingList", item.id), { done: true });
        });
        div.querySelector(".delete-btn").addEventListener("click", () => {
            deleteDoc(doc(db, "users", auth.currentUser.uid, "shoppingList", item.id));
        });
        div.querySelector(".edit-btn").addEventListener("click", () => {
            normalView.classList.add('hidden');
            editView.classList.remove('hidden');
            editView.classList.add('flex');
            editInput.focus();
        });
        div.querySelector(".cancel-btn").addEventListener("click", () => {
            editView.classList.add('hidden');
            editView.classList.remove('flex');
            normalView.classList.remove('hidden');
            editInput.value = item.title;
        });
        saveBtn.addEventListener("click", async () => {
            await handleFormSubmit(saveBtn, [{ el: editInput, type: 'text', required: true }], async () => {
                const newTitle = editInput.value.trim();
                await updateDoc(doc(db, "users", auth.currentUser.uid, "shoppingList", item.id), { title: newTitle });
            });
        });
        activeList.appendChild(div);
    });
    
    completedItems.forEach(item => {
        const div = document.createElement("div");
        div.className = "bg-surface-dim/40 rounded-2xl p-4 flex items-center justify-between border border-transparent";
        div.innerHTML = `
            <!-- Normal View -->
            <div class="flex items-center justify-between w-full normal-view">
                <div class="flex items-center gap-4">
                    <button class="toggle-btn w-6 h-6 rounded-md bg-primary flex items-center justify-center transition-colors">
                        <span class="material-symbols-outlined icon-sm text-on-primary">check</span>
                    </button>
                    <span class="font-body-md text-outline checked-item text-body-md">${escapeHtml(item.title)}</span>
                </div>
                <div class="flex items-center gap-1">
                    <button class="edit-btn material-symbols-outlined text-outline hover:text-primary transition-colors p-1">edit</button>
                    <button class="delete-btn material-symbols-outlined text-outline hover:text-error transition-colors p-1">delete</button>
                </div>
            </div>
            <!-- Edit View -->
            <div class="hidden items-center justify-between w-full gap-2 edit-view">
                <input type="text" class="w-full bg-surface-container border border-outline-variant rounded-lg px-2 py-1 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary edit-input" value="${escapeHtml(item.title)}">
                <button class="bg-primary text-on-primary px-3 py-1 rounded-lg text-sm font-medium shrink-0 save-btn">Kaydet</button>
                <button class="text-on-surface-variant px-2 py-1 rounded-lg text-sm shrink-0 cancel-btn">İptal</button>
            </div>
        `;
        
        const normalView = div.querySelector('.normal-view');
        const editView = div.querySelector('.edit-view');
        const editInput = div.querySelector('.edit-input');
        const saveBtn = div.querySelector('.save-btn');

        div.querySelector(".toggle-btn").addEventListener("click", () => {
            updateDoc(doc(db, "users", auth.currentUser.uid, "shoppingList", item.id), { done: false });
        });
        div.querySelector(".delete-btn").addEventListener("click", () => {
            deleteDoc(doc(db, "users", auth.currentUser.uid, "shoppingList", item.id));
        });
        div.querySelector(".edit-btn").addEventListener("click", () => {
            normalView.classList.add('hidden');
            editView.classList.remove('hidden');
            editView.classList.add('flex');
            editInput.focus();
        });
        div.querySelector(".cancel-btn").addEventListener("click", () => {
            editView.classList.add('hidden');
            editView.classList.remove('flex');
            normalView.classList.remove('hidden');
            editInput.value = item.title;
        });
        saveBtn.addEventListener("click", async () => {
            await handleFormSubmit(saveBtn, [{ el: editInput, type: 'text', required: true }], async () => {
                const newTitle = editInput.value.trim();
                await updateDoc(doc(db, "users", auth.currentUser.uid, "shoppingList", item.id), { title: newTitle });
            });
        });
        completedList.appendChild(div);
    });
}
