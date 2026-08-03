import { db } from "./firebase-config.js";
import { collection, doc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { escapeHtml, validatePositiveNumber } from "./utils.js";
import { registerListener } from "./listenerManager.js";

let dailyCalorieGoal = 2000;
let proteinGoal = 110;
let karbGoal = 240;
let yagGoal = 66;

let dailyLogs = [];
let libraryFoods = [];
let unsubscribeLogs = null;
let unsubscribeSettings = null;
let unsubscribeLibrary = null;
let unsubWeeklyLogs = null;
let weeklyLogs = [];
let onChangeCb = null;
let currentUid = null;
let currentEditLogId = null;

// Modal Elements
const addFoodModal = document.getElementById('addFoodModal');
const addFoodModalContent = document.getElementById('addFoodModalContent');
const addFoodModalTitle = document.getElementById('modalMealTitle');

const caloriesGoalBtn = document.getElementById('calories-goal-btn');
const caloriesGoalModal = document.getElementById('calories-goal-modal');
const caloriesGoalModalContent = document.getElementById('calories-goal-modal-content');
const caloriesGoalMinus = document.getElementById('calories-goal-minus');
const caloriesGoalPlus = document.getElementById('calories-goal-plus');
const caloriesGoalAmountDisplay = document.getElementById('calories-goal-amount-display');
const caloriesGoalCancel = document.getElementById('calories-goal-cancel');
const caloriesGoalSave = document.getElementById('calories-goal-save');

const portionModal = document.getElementById('addPortionModal');
const portionModalContent = document.getElementById('addPortionModalContent');
const portionCloseBtn = document.getElementById('portion-close-btn');
const portionFoodName = document.getElementById('portion-food-name');
const portionFoodKcalText = document.getElementById('portion-food-kcal-text');
const gramInput = document.getElementById('gram-input');
const totalKcalEl = document.getElementById('total-kcal');
const addFoodToLogBtn = document.getElementById('add-food-to-log-btn');
const portionMinusBtn = document.getElementById('portion-minus-btn');
const portionPlusBtn = document.getElementById('portion-plus-btn');

const newFoodModal = document.getElementById('newFoodModal');
const newFoodModalContent = document.getElementById('newFoodModalContent');
const newFoodCloseBtn = document.getElementById('new-food-close-btn');
const saveNewFoodBtn = document.getElementById('save-new-food-btn');
const newFoodNameInput = document.getElementById('new-food-name');
const newFoodKcalInput = document.getElementById('new-food-kcal');
const newFoodKarbInput = document.getElementById('new-food-karb');
const newFoodProteinInput = document.getElementById('new-food-protein');
const newFoodYagInput = document.getElementById('new-food-yag');

let tempCaloriesGoal = 2000;
let currentKcalPer100g = 0;
let currentFoodName = "";
let currentFoodMacros = { karb: 0, protein: 0, yag: 0 };

export function initCalories(uid, onChangeCallback) {
    currentUid = uid;
    onChangeCb = onChangeCallback;

    // Listen to Settings
    const settingsRef = doc(db, "users", uid, "settings", "calories");
    unsubscribeSettings = registerListener(onSnapshot(settingsRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.dailyCalorieGoal) dailyCalorieGoal = data.dailyCalorieGoal;
            if (data.proteinGoal) proteinGoal = data.proteinGoal;
            if (data.karbGoal) karbGoal = data.karbGoal;
            if (data.yagGoal) yagGoal = data.yagGoal;
        } else {
            dailyCalorieGoal = 2000;
            proteinGoal = 110;
            karbGoal = 240;
            yagGoal = 66;
        }
        updateUIState();
    }));

    // Listen to Logs (Only needed for daily tracking)
    const logsRef = query(collection(db, "users", uid, "calorieLogs"), orderBy("createdAt", "desc"));
    unsubscribeLogs = registerListener(onSnapshot(logsRef, (snap) => {
        const today = new Date();
        today.setHours(0,0,0,0);
        
        dailyLogs = [];
        snap.forEach(d => {
            const data = d.data();
            if (data.createdAt && data.createdAt.toDate) {
                if (data.createdAt.toDate() >= today) {
                    dailyLogs.push({ id: d.id, ...data });
                }
            }
        });
        renderLogs();
        updateUIState();
    }));

    // Listen to Food Library
    const libRef = query(collection(db, "users", uid, "foodLibrary"), orderBy("createdAt", "desc"));
    unsubscribeLibrary = registerListener(onSnapshot(libRef, (snap) => {
        libraryFoods = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderLibraryFoods();
    }));

    // Listen to Weekly Calorie Logs (for chart)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weeklyRef = query(
        collection(db, "users", uid, "calorieLogs"),
        where("createdAt", ">=", oneWeekAgo),
        orderBy("createdAt", "desc")
    );
    unsubWeeklyLogs = registerListener(onSnapshot(weeklyRef, (snap) => {
        weeklyLogs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderWeeklyChart();
    }));

    bindEvents();
}

function bindEvents() {
    // Add Food to Library Modal
    document.querySelectorAll('.open-add-food-modal-btn').forEach(btn => {
        btn.onclick = () => {
            const mealName = btn.dataset.meal || "Öğün";
            if(addFoodModalTitle) addFoodModalTitle.innerText = `${mealName} - Yiyecek Ekle`;
            addFoodModal.classList.remove('hidden');
            addFoodModal.classList.add('flex');
            setTimeout(() => {
                addFoodModalContent.classList.remove('translate-y-full');
                addFoodModalContent.classList.add('translate-y-0');
            }, 10);
            document.body.style.overflow = 'hidden';
        };
    });

    document.querySelectorAll('.close-add-food-modal-btn').forEach(btn => {
        btn.onclick = closeAddFoodModal;
    });

    if (addFoodModal) {
        addFoodModal.onclick = (e) => {
            if (e.target === addFoodModal) closeAddFoodModal();
        };
    }

    // Calories Goal Modal
    if (caloriesGoalBtn) caloriesGoalBtn.onclick = openCaloriesGoalModal;
    if (caloriesGoalCancel) caloriesGoalCancel.onclick = closeCaloriesGoalModal;
    
    if (caloriesGoalModal) {
        caloriesGoalModal.onclick = (e) => {
            if (e.target === caloriesGoalModal) closeCaloriesGoalModal();
        };
    }

    if (caloriesGoalMinus) {
        caloriesGoalMinus.onclick = () => {
            if (tempCaloriesGoal > 500) tempCaloriesGoal -= 100;
            if(caloriesGoalAmountDisplay) caloriesGoalAmountDisplay.textContent = tempCaloriesGoal;
        };
    }
    if (caloriesGoalPlus) {
        caloriesGoalPlus.onclick = () => {
            tempCaloriesGoal += 100;
            if(caloriesGoalAmountDisplay) caloriesGoalAmountDisplay.textContent = tempCaloriesGoal;
        };
    }

    document.querySelectorAll('.calories-goal-preset').forEach(btn => {
        btn.onclick = () => {
            tempCaloriesGoal = parseInt(btn.dataset.amount);
            if(caloriesGoalAmountDisplay) caloriesGoalAmountDisplay.textContent = tempCaloriesGoal;
            document.querySelectorAll('.calories-goal-preset').forEach(b => {
                b.classList.remove('bg-primary-container', 'text-on-primary-container', 'font-bold');
                b.classList.add('bg-surface-container', 'text-on-surface-variant');
            });
            btn.classList.add('bg-primary-container', 'text-on-primary-container', 'font-bold');
            btn.classList.remove('bg-surface-container', 'text-on-surface-variant');
        };
    });

    if (caloriesGoalSave) {
        caloriesGoalSave.onclick = async () => {
            const amountDisplay = document.getElementById('calories-goal-amount-display');
            const g = amountDisplay ? parseInt(amountDisplay.textContent) || 2000 : 2000;
            
            const karbInput = document.getElementById('macro-goal-karb');
            const k = karbInput ? parseInt(karbInput.value) || 240 : 240;
            
            const proteinInput = document.getElementById('macro-goal-protein');
            const p = proteinInput ? parseInt(proteinInput.value) || 110 : 110;
            
            const yagInput = document.getElementById('macro-goal-yag');
            const y = yagInput ? parseInt(yagInput.value) || 66 : 66;
            
            try {
                await setDoc(doc(db, "users", currentUid, "settings", "calories"), {
                    dailyCalorieGoal: g, proteinGoal: p, karbGoal: k, yagGoal: y
                }, { merge: true });
            } catch(err) {
                console.error("Test Modu:", err);
                dailyCalorieGoal = g; proteinGoal = p; karbGoal = k; yagGoal = y;
                updateUIState();
            }
            closeCaloriesGoalModal();
        };
    }

    // New Food (Library) Modal
    document.querySelectorAll('.open-new-food-modal-btn').forEach(btn => {
        btn.onclick = openNewFoodModal;
    });

    if (newFoodCloseBtn) newFoodCloseBtn.onclick = closeNewFoodModal;
    
    if (newFoodModal) {
        newFoodModal.onclick = (e) => {
            if (e.target === newFoodModal) closeNewFoodModal();
        };
    }
    
    if (saveNewFoodBtn) {
        saveNewFoodBtn.onclick = async () => {
            if (!newFoodNameInput || !newFoodKcalInput || !newFoodNameInput.value || !newFoodKcalInput.value) return; 
            
            const newFood = {
                name: newFoodNameInput.value,
                kcal: parseInt(newFoodKcalInput.value) || 0,
                karb: newFoodKarbInput && newFoodKarbInput.value ? parseInt(newFoodKarbInput.value) : null,
                protein: newFoodProteinInput && newFoodProteinInput.value ? parseInt(newFoodProteinInput.value) : null,
                yag: newFoodYagInput && newFoodYagInput.value ? parseInt(newFoodYagInput.value) : null,
                createdAt: serverTimestamp()
            };
            
            try {
                await addDoc(collection(db, "users", currentUid, "foodLibrary"), newFood);
            } catch(err) {
                console.error("Test Modu:", err);
                newFood.id = "temp-" + Date.now();
                newFood.createdAt = { toDate: () => new Date() };
                libraryFoods.unshift(newFood);
                renderLibraryFoods();
            }
            
            newFoodNameInput.value = '';
            newFoodKcalInput.value = '';
            if(newFoodKarbInput) newFoodKarbInput.value = '';
            if(newFoodProteinInput) newFoodProteinInput.value = '';
            if(newFoodYagInput) newFoodYagInput.value = '';
            
            closeNewFoodModal();
        };
    }

    // Portion Modal Events
    if (portionCloseBtn) portionCloseBtn.onclick = closeAddPortionModal;
    if (portionModal) {
        portionModal.onclick = (e) => {
            if (e.target === portionModal) closeAddPortionModal();
        };
    }
    
    if (gramInput) {
        gramInput.oninput = updatePortionTotal;
        gramInput.onblur = function() {
            let val = parseInt(this.value);
            if (isNaN(val) || val <= 0) this.value = 100;
            updatePortionTotal();
        };
    }

    if (portionMinusBtn) {
        portionMinusBtn.onclick = () => { adjustAmount(-10); };
    }
    
    if (portionPlusBtn) {
        portionPlusBtn.onclick = () => { adjustAmount(10); };
    }
    
    if (addFoodToLogBtn) {
        addFoodToLogBtn.onclick = async () => {
            let grams = 100;
            if(gramInput) {
                if (!validatePositiveNumber(gramInput.value)) {
                    alert('Lütfen geçerli bir gramaj girin (Sıfırdan büyük olmalıdır).');
                    return;
                }
                grams = parseInt(gramInput.value) || 100;
            }
            const total = Math.round((grams / 100) * currentKcalPer100g);
            
            // Approximate macros based on library macros or standard ratios
            let p = 0, k = 0, y = 0;
            if (currentFoodMacros.protein !== null) p = Math.round((grams / 100) * currentFoodMacros.protein);
            if (currentFoodMacros.karb !== null) k = Math.round((grams / 100) * currentFoodMacros.karb);
            if (currentFoodMacros.yag !== null) y = Math.round((grams / 100) * currentFoodMacros.yag);
            
            try {
                if (currentEditLogId) {
                    await updateDoc(doc(db, "users", currentUid, "calorieLogs", currentEditLogId), {
                        amount: grams,
                        kcal: total,
                        protein: p,
                        karb: k,
                        yag: y
                    });
                } else {
                    const logEntry = {
                        name: currentFoodName,
                        amount: grams,
                        kcal: total,
                        protein: p,
                        karb: k,
                        yag: y,
                        createdAt: serverTimestamp()
                    };
                    await addDoc(collection(db, "users", currentUid, "calorieLogs"), logEntry);
                }
            } catch(err) {
                console.error("Kayıt Hatası:", err);
            } finally {
                currentEditLogId = null;
                closeAddPortionModal();
                closeAddFoodModal();
            }
        };
    }
}

// Modal Toggle Functions
function closeAddFoodModal() {
    if(!addFoodModalContent || !addFoodModal) return;
    addFoodModalContent.classList.remove('translate-y-0');
    addFoodModalContent.classList.add('translate-y-full');
    setTimeout(() => {
        addFoodModal.classList.add('hidden');
        addFoodModal.classList.remove('flex');
        document.body.style.overflow = 'auto';
    }, 300);
}

function openCaloriesGoalModal() {
    if(!caloriesGoalModal) return;
    tempCaloriesGoal = dailyCalorieGoal;
    if(caloriesGoalAmountDisplay) caloriesGoalAmountDisplay.textContent = tempCaloriesGoal;
    
    const karbInput = document.getElementById('macro-goal-karb');
    if (karbInput) karbInput.value = karbGoal;
    const proteinInput = document.getElementById('macro-goal-protein');
    if (proteinInput) proteinInput.value = proteinGoal;
    const yagInput = document.getElementById('macro-goal-yag');
    if (yagInput) yagInput.value = yagGoal;

    caloriesGoalModal.classList.remove('hidden');
    setTimeout(() => {
        caloriesGoalModalContent.classList.remove('scale-95', 'opacity-0');
        caloriesGoalModalContent.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function closeCaloriesGoalModal() {
    if(!caloriesGoalModal) return;
    caloriesGoalModalContent.classList.remove('scale-100', 'opacity-100');
    caloriesGoalModalContent.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        caloriesGoalModal.classList.add('hidden');
    }, 200);
}

function openNewFoodModal() {
    if(!newFoodModal) return;
    newFoodModal.classList.remove('hidden');
    setTimeout(() => {
        newFoodModal.classList.remove('opacity-0');
        newFoodModalContent.classList.remove('translate-y-full');
    }, 10);
}

function closeNewFoodModal() {
    if(!newFoodModal) return;
    newFoodModal.classList.add('opacity-0');
    newFoodModalContent.classList.add('translate-y-full');
    setTimeout(() => {
        newFoodModal.classList.add('hidden');
    }, 300);
}

function openAddPortionModal(name, kcal100, macros) {
    currentFoodName = name;
    currentKcalPer100g = kcal100;
    currentFoodMacros = macros || {karb: 0, protein: 0, yag: 0};
    
    if(portionFoodName) portionFoodName.textContent = name;
    if(portionFoodKcalText) portionFoodKcalText.textContent = `${kcal100} kcal / 100g`;
    if(gramInput) gramInput.value = 100;
    updatePortionTotal();
    
    if(portionModal) {
        portionModal.classList.remove('hidden');
        setTimeout(() => {
            portionModal.classList.remove('opacity-0');
            portionModalContent.classList.remove('translate-y-full');
        }, 10);
    }
}

function closeAddPortionModal() {
    if(portionModal) {
        portionModal.classList.add('opacity-0');
        portionModalContent.classList.add('translate-y-full');
        setTimeout(() => {
            portionModal.classList.add('hidden');
        }, 300);
    }
}

function updatePortionTotal() {
    if(gramInput && totalKcalEl) {
        let grams = parseInt(gramInput.value);
        if (isNaN(grams) || grams < 0) grams = 0;
        const total = Math.round((grams / 100) * currentKcalPer100g);
        totalKcalEl.textContent = total;
    }
}

function adjustAmount(amount) {
    if(gramInput) {
        let current = parseInt(gramInput.value);
        if (isNaN(current)) current = 0;
        let newValue = current + amount;
        if (newValue < 0) newValue = 0;
        gramInput.value = newValue;
        updatePortionTotal();
        
        gramInput.classList.add('scale-105');
        setTimeout(() => {
            gramInput.classList.remove('scale-105');
        }, 150);
    }
}

// Render Functions
function renderLogs() {
    const logList = document.getElementById('daily-log-list');
    if (logList) {
        logList.innerHTML = '';
        if(dailyLogs.length === 0) {
            logList.innerHTML = `<p class="text-on-surface-variant text-sm p-4 text-center">Bugün henüz yiyecek eklemedin.</p>`;
        }
        dailyLogs.forEach(log => {
            const newEntry = document.createElement('div');
            newEntry.className = "flex justify-between items-center p-3 border-b border-surface-container-high last:border-0 relative group";
            
            const editBtn = document.createElement('button');
            editBtn.className = "absolute right-12 top-1/2 -translate-y-1/2 p-2 text-primary opacity-0 group-hover:opacity-100 transition-opacity bg-primary-container/20 rounded-full active:scale-95";
            editBtn.innerHTML = `<span class="material-symbols-outlined text-sm">edit</span>`;
            editBtn.onclick = (e) => {
                e.stopPropagation();
                currentEditLogId = log.id;
                const baseKcal = (log.kcal / log.amount) * 100;
                const baseP = log.protein ? (log.protein / log.amount) * 100 : 0;
                const baseK = log.karb ? (log.karb / log.amount) * 100 : 0;
                const baseY = log.yag ? (log.yag / log.amount) * 100 : 0;
                openAddPortionModal(log.name, baseKcal, { protein: baseP, karb: baseK, yag: baseY });
                setTimeout(() => {
                    const gramInput = document.getElementById('gram-input');
                    if (gramInput) {
                        gramInput.value = log.amount;
                        updatePortionTotal();
                    }
                }, 100);
            };

            const delBtn = document.createElement('button');
            delBtn.className = "absolute right-2 top-1/2 -translate-y-1/2 p-2 text-error opacity-0 group-hover:opacity-100 transition-opacity bg-error-container/20 rounded-full active:scale-95";
            delBtn.innerHTML = `<span class="material-symbols-outlined text-sm">delete</span>`;
            delBtn.onclick = async (e) => {
                e.stopPropagation();
                try {
                    await deleteDoc(doc(db, "users", currentUid, "calorieLogs", log.id));
                } catch(err) {
                    dailyLogs = dailyLogs.filter(l => l.id !== log.id);
                    renderLogs();
                    updateUIState();
                }
            };

            newEntry.innerHTML = `
            <div class="flex flex-col pr-20">
            <span class="font-body-md text-body-md text-on-surface font-medium">${escapeHtml(log.name)}</span>
            <span class="font-label-sm text-label-sm text-on-surface-variant">${log.amount}g</span>
            </div>
            <span class="font-body-lg text-body-lg text-on-surface font-bold pr-20">${log.kcal} kcal</span>
            `;
            newEntry.appendChild(editBtn);
            newEntry.appendChild(delBtn);
            logList.appendChild(newEntry);
        });
    }
}

function renderLibraryFoods() {
    const list = document.getElementById('library-food-list');
    if (!list) return;
    
    list.innerHTML = '';
    if(libraryFoods.length === 0) {
        list.innerHTML = `<p class="text-on-surface-variant text-sm text-center col-span-2 py-4">Kütüphanede kayıtlı besin yok.</p>`;
    }

    libraryFoods.forEach((food) => {
        const item = document.createElement('div');
        item.className = "bg-surface-container-lowest rounded-[24px] p-4 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] hover:scale-[0.99] transition-transform relative group";
        
        let macrosHtml = '';
        if(food.karb !== null || food.protein !== null || food.yag !== null) {
            macrosHtml = '<div class="flex gap-2">';
            if(food.karb !== null && !isNaN(food.karb)) macrosHtml += `<span class="font-label-sm text-label-sm bg-tertiary-container/20 text-tertiary rounded-md px-2 py-1">K: ${food.karb}g</span>`;
            if(food.protein !== null && !isNaN(food.protein)) macrosHtml += `<span class="font-label-sm text-label-sm bg-secondary-container/30 text-secondary rounded-md px-2 py-1">P: ${food.protein}g</span>`;
            if(food.yag !== null && !isNaN(food.yag)) macrosHtml += `<span class="font-label-sm text-label-sm bg-error-container/40 text-on-error-container rounded-md px-2 py-1">Y: ${food.yag}g</span>`;
            macrosHtml += '</div>';
        }

        item.innerHTML = `
            <div class="cursor-pointer">
                <div class="flex justify-between items-start mb-2 pr-8">
                    <h3 class="font-headline-sm text-headline-sm text-on-surface truncate">${escapeHtml(food.name)}</h3>
                    <span class="font-label-md text-label-md text-on-surface-variant bg-surface-container px-2 py-1 rounded-full shrink-0">100g</span>
                </div>
                <div class="flex items-center gap-2 mb-3">
                    <span class="font-body-lg text-body-lg text-primary font-bold">${food.kcal} kcal</span>
                </div>
                ${macrosHtml}
            </div>
            <!-- Delete Button -->
            <button class="absolute top-4 right-4 w-8 h-8 rounded-full bg-error-container text-on-error-container flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity active:scale-95 z-10 delete-library-btn">
                <span class="material-symbols-outlined text-[18px]">delete</span>
            </button>
        `;
        
        // Bind portion modal opening to the content
        item.firstElementChild.onclick = () => openAddPortionModal(food.name, food.kcal, {karb: food.karb, protein: food.protein, yag: food.yag});
        
        // Bind delete
        item.querySelector('.delete-library-btn').onclick = async (e) => {
            e.stopPropagation();
            try {
                await deleteDoc(doc(db, "users", currentUid, "foodLibrary", food.id));
            } catch(err) {
                libraryFoods = libraryFoods.filter(f => f.id !== food.id);
                renderLibraryFoods();
            }
        };

        list.appendChild(item);
    });
    
    const countEl = document.getElementById('library-food-count');
    if (countEl) countEl.textContent = libraryFoods.length;
}

function updateUIState() {
    let totalCaloriesConsumed = 0;
    let proteinConsumed = 0;
    let karbConsumed = 0;
    let yagConsumed = 0;

    dailyLogs.forEach(l => {
        totalCaloriesConsumed += l.kcal || 0;
        proteinConsumed += l.protein || 0;
        karbConsumed += l.karb || 0;
        yagConsumed += l.yag || 0;
    });

    // Update Goals
    const calGoalEl = document.getElementById('ui-calorie-goal');
    if (calGoalEl) calGoalEl.textContent = dailyCalorieGoal;
    
    const proteinGoalEl = document.getElementById('ui-protein-goal');
    if (proteinGoalEl) proteinGoalEl.textContent = proteinGoal;
    
    const karbGoalEl = document.getElementById('ui-karb-goal');
    if (karbGoalEl) karbGoalEl.textContent = karbGoal;
    
    const yagGoalEl = document.getElementById('ui-yag-goal');
    if (yagGoalEl) yagGoalEl.textContent = yagGoal;
    
    // Update Consumed
    const calConsEl = document.getElementById('ui-calorie-consumed');
    if (calConsEl) calConsEl.textContent = totalCaloriesConsumed;
    
    const calRemEl = document.getElementById('ui-calorie-remaining');
    if (calRemEl) {
        let remaining = dailyCalorieGoal - totalCaloriesConsumed;
        calRemEl.textContent = `Kalan: ${remaining > 0 ? remaining : 0} kcal`;
    }
    
    const proteinConsEl = document.getElementById('ui-protein-consumed');
    if (proteinConsEl) proteinConsEl.textContent = proteinConsumed;
    
    const karbConsEl = document.getElementById('ui-karb-consumed');
    if (karbConsEl) karbConsEl.textContent = karbConsumed;
    
    const yagConsEl = document.getElementById('ui-yag-consumed');
    if (yagConsEl) yagConsEl.textContent = yagConsumed;
    
    // Update SVG Circle
    const circle = document.getElementById('ui-calorie-circle');
    if (circle) {
        let percentage = Math.min(totalCaloriesConsumed / dailyCalorieGoal, 1);
        let offset = 339.292 - (339.292 * percentage);
        circle.style.strokeDashoffset = offset;
    }
    
    // Update Macro Bars
    const proteinBar = document.getElementById('ui-protein-bar');
    if (proteinBar) proteinBar.style.width = `${Math.min((proteinConsumed / proteinGoal) * 100, 100)}%`;
    
    const karbBar = document.getElementById('ui-karb-bar');
    if (karbBar) karbBar.style.width = `${Math.min((karbConsumed / karbGoal) * 100, 100)}%`;
    
    const yagBar = document.getElementById('ui-yag-bar');
    if (yagBar) yagBar.style.width = `${Math.min((yagConsumed / yagGoal) * 100, 100)}%`;
    
    // Update Dashboard
    const dashCalText = document.getElementById('dashboard-calories-text');
    if (dashCalText) {
        dashCalText.innerHTML = `${totalCaloriesConsumed} <span class="text-sm font-normal text-on-surface-variant">/ ${dailyCalorieGoal} kcal</span>`;
    }
    const dashCalProg = document.getElementById('dashboard-calories-progress');
    if (dashCalProg) {
        let percentage = Math.min((totalCaloriesConsumed / dailyCalorieGoal) * 100, 100);
        dashCalProg.style.width = `${percentage}%`;
    }

    if (onChangeCb) onChangeCb({ totalCaloriesConsumed, dailyCalorieGoal });
}

export function clearCalories() {
    if(unsubscribeLogs) unsubscribeLogs();
    if(unsubscribeSettings) unsubscribeSettings();
    if(unsubscribeLibrary) unsubscribeLibrary();
    dailyLogs = [];
    libraryFoods = [];
}


function renderWeeklyChart() {
    const chartContainer = document.getElementById("calories-chart-container");
    const labelsContainer = document.getElementById("calories-chart-labels");
    const avgText = document.getElementById("calories-avg-text");
    
    if(!chartContainer || !labelsContainer || !avgText) return;
    
    chartContainer.innerHTML = "";
    labelsContainer.innerHTML = "";
    
    const days = [];
    const dayNames = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
    let total7Days = 0;
    
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setHours(0,0,0,0);
        d.setDate(d.getDate() - i);
        days.push({
            date: d,
            name: dayNames[d.getDay()],
            amount: 0,
            isToday: i === 0
        });
    }

    const oneWeekAgo = new Date();
    oneWeekAgo.setHours(0,0,0,0);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 6);

    weeklyLogs.forEach(log => {
        if(!log.createdAt || !log.createdAt.toDate) return;
        const logDate = log.createdAt.toDate();
        if(logDate >= oneWeekAgo) {
            const matchingDay = days.find(day => 
                logDate.getDate() === day.date.getDate() && 
                logDate.getMonth() === day.date.getMonth()
            );
            if(matchingDay) {
                matchingDay.amount += (log.kcal || 0);
                total7Days += (log.kcal || 0);
            }
        }
    });

    avgText.textContent = `Avg: ${Math.round(total7Days / 7)} kcal`;

    days.forEach(day => {
        let percent = day.amount / dailyCalorieGoal * 100;
        if(percent > 100) percent = 100;
        if(percent < 5 && day.amount > 0) percent = 5;

        const div = document.createElement("div");
        div.className = "flex flex-col items-center gap-2 w-[14%] group relative";
        
        let barClass = "bg-primary/70 group-hover:bg-primary/90";
        let textClass = "text-outline";
        
        if(day.isToday) {
            barClass = "bg-primary group-hover:bg-primary/90";
            textClass = "text-primary font-bold";
        }

        div.innerHTML = `
            <div class="absolute -top-8 bg-surface-container-high text-on-surface text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                ${Math.round(day.amount)} kcal
            </div>
            <div class="w-2 md:w-3 bg-surface-container rounded-full h-24 relative flex items-end overflow-hidden">
                <div class="w-full rounded-full transition-all duration-500 ${barClass}" style="height: ${percent}%"></div>
            </div>
        `;
        
        const labelDiv = document.createElement("div");
        labelDiv.className = `text-[10px] md:text-xs w-[14%] text-center uppercase tracking-wider ${textClass}`;
        labelDiv.textContent = day.name;

        chartContainer.appendChild(div);
        labelsContainer.appendChild(labelDiv);
    });
}
