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

    if(!activeList || !completedList) return;

    activeList.innerHTML = "";
    completedList.innerHTML = "";

    const activeItems = allShopping.filter(i => !i.done);
    const completedItems = allShopping.filter(i => i.done);

    const dashboardCountLabel = document.getElementById("dashboard-shopping-count");
    if(dashboardCountLabel) dashboardCountLabel.textContent = `${activeItems.length} Ürün`;

    // ACTIVE ITEMS
    activeItems.forEach(item => {
        const wrapper = document.createElement('div');
        wrapper.className = "relative w-full shrink-0 mb-4";

        const delBtn = document.createElement('button');
        delBtn.className = "absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-red-500 rounded-2xl text-white flex items-center justify-center z-0 active:bg-red-600 transition-colors";
        delBtn.innerHTML = `<span class="material-symbols-rounded text-xl">delete</span>`;
        delBtn.onclick = async (e) => {
            e.stopPropagation();
            try {
                await deleteDoc(doc(db, "users", auth.currentUser.uid, "shoppingList", item.id));
            } catch(err) {
                console.error("Silme Hatası:", err);
            }
        };

        const itemDiv = document.createElement('div');
        itemDiv.className = "relative flex items-center justify-between p-4 rounded-2xl bg-[#F7F9FF] z-10 transition-transform cursor-pointer active:scale-[0.99]";
        itemDiv.style.boxShadow = "4px 4px 8px #D1D9E6, -4px -4px 8px #FFFFFF";
        itemDiv.innerHTML = `
            <div class="flex items-center gap-4 pointer-events-none">
                <div class="w-10 h-10 rounded-full bg-[#F7F9FF] flex items-center justify-center" style="box-shadow: inset 2px 2px 5px #D1D9E6, inset -2px -2px 5px #FFFFFF;">
                    <span class="material-symbols-rounded text-[#3B82F6]">shopping_basket</span>
                </div>
                <div><p class="text-sm font-bold text-[#1E293B]">${escapeHtml(item.title)}</p></div>
            </div>
        `;

        let startX = 0;
        let currentX = 0;
        let isDragging = false;

        itemDiv.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isDragging = true;
            itemDiv.style.transition = 'none';
        }, {passive: true});

        itemDiv.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            currentX = e.touches[0].clientX;
            let diff = currentX - startX;
            if (diff > 0) diff = 0;
            if (diff < -80) diff = -80;
            itemDiv.style.transform = `translateX(${diff}px)`;
        }, {passive: true});

        itemDiv.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            isDragging = false;
            itemDiv.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
            let diff = currentX - startX;
            if (diff < -40) {
                itemDiv.style.transform = `translateX(-80px)`;
                setTimeout(() => {
                    document.addEventListener('touchstart', function closeSwipe(evt) {
                        if (!wrapper.contains(evt.target)) {
                            itemDiv.style.transform = `translateX(0px)`;
                            document.removeEventListener('touchstart', closeSwipe);
                        }
                    }, {passive: true});
                }, 100);
            } else {
                itemDiv.style.transform = `translateX(0px)`;
            }
        });

        // Click to Complete
        itemDiv.addEventListener('click', (e) => {
            if (itemDiv.style.transform === 'translateX(-80px)') return;
            if (Math.abs(currentX - startX) < 5) {
                updateDoc(doc(db, "users", auth.currentUser.uid, "shoppingList", item.id), { done: true }).catch(err => console.error(err));
            }
        });

        wrapper.appendChild(delBtn);
        wrapper.appendChild(itemDiv);
        activeList.appendChild(wrapper);
    });

    // COMPLETED ITEMS
    completedItems.forEach(item => {
        const wrapper = document.createElement('div');
        wrapper.className = "relative w-full shrink-0 mb-4";

        const delBtn = document.createElement('button');
        delBtn.className = "absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-red-500 rounded-2xl text-white flex items-center justify-center z-0 active:bg-red-600 transition-colors";
        delBtn.innerHTML = `<span class="material-symbols-rounded text-xl">delete</span>`;
        delBtn.onclick = async (e) => {
            e.stopPropagation();
            try {
                await deleteDoc(doc(db, "users", auth.currentUser.uid, "shoppingList", item.id));
            } catch(err) {
                console.error("Silme Hatası:", err);
            }
        };

        const itemDiv = document.createElement('div');
        itemDiv.className = "relative flex items-center justify-between p-4 rounded-2xl bg-[#F7F9FF] opacity-70 z-10 transition-transform cursor-pointer active:scale-[0.99]";
        itemDiv.style.boxShadow = "4px 4px 8px #D1D9E6, -4px -4px 8px #FFFFFF";
        itemDiv.innerHTML = `
            <div class="flex items-center gap-4 pointer-events-none">
                <div class="w-10 h-10 rounded-full bg-[#F7F9FF] flex items-center justify-center" style="box-shadow: inset 2px 2px 5px #D1D9E6, inset -2px -2px 5px #FFFFFF;">
                    <span class="material-symbols-rounded text-[#64748B]">check</span>
                </div>
                <div><p class="text-sm font-bold text-[#64748B] line-through">${escapeHtml(item.title)}</p></div>
            </div>
        `;

        let startX = 0;
        let currentX = 0;
        let isDragging = false;

        itemDiv.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isDragging = true;
            itemDiv.style.transition = 'none';
        }, {passive: true});

        itemDiv.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            currentX = e.touches[0].clientX;
            let diff = currentX - startX;
            if (diff > 0) diff = 0;
            if (diff < -80) diff = -80;
            itemDiv.style.transform = `translateX(${diff}px)`;
        }, {passive: true});

        itemDiv.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            isDragging = false;
            itemDiv.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
            let diff = currentX - startX;
            if (diff < -40) {
                itemDiv.style.transform = `translateX(-80px)`;
                setTimeout(() => {
                    document.addEventListener('touchstart', function closeSwipe(evt) {
                        if (!wrapper.contains(evt.target)) {
                            itemDiv.style.transform = `translateX(0px)`;
                            document.removeEventListener('touchstart', closeSwipe);
                        }
                    }, {passive: true});
                }, 100);
            } else {
                itemDiv.style.transform = `translateX(0px)`;
            }
        });

        // Click to Undo
        itemDiv.addEventListener('click', (e) => {
            if (itemDiv.style.transform === 'translateX(-80px)') return;
            if (Math.abs(currentX - startX) < 5) {
                updateDoc(doc(db, "users", auth.currentUser.uid, "shoppingList", item.id), { done: false }).catch(err => console.error(err));
            }
        });

        wrapper.appendChild(delBtn);
        wrapper.appendChild(itemDiv);
        completedList.appendChild(wrapper);
    });
}
