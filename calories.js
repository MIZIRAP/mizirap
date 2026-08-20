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
const caloriesGoalBackdrop = document.getElementById('calories-goal-backdrop');

const caloriesGoalMinus = document.getElementById('calories-goal-minus');
const caloriesGoalPlus = document.getElementById('calories-goal-plus');
const caloriesGoalAmountDisplay = document.getElementById('calories-goal-display');
const caloriesGoalSave = document.getElementById('save-calories-goal-btn');

const macroProteinMinus = document.getElementById('calories-goal-protein-minus');
const macroProteinPlus = document.getElementById('calories-goal-protein-plus');
const macroProteinDisplay = document.getElementById('calories-goal-protein-display');

const macroKarbMinus = document.getElementById('calories-goal-karb-minus');
const macroKarbPlus = document.getElementById('calories-goal-karb-plus');
const macroKarbDisplay = document.getElementById('calories-goal-karb-display');

const macroYagMinus = document.getElementById('calories-goal-yag-minus');
const macroYagPlus = document.getElementById('calories-goal-yag-plus');
const macroYagDisplay = document.getElementById('calories-goal-yag-display');

const portionModal = document.getElementById('addPortionModal');
const portionModalContent = document.getElementById('addPortionModalContent');
const portionBackdrop = document.getElementById('add-portion-backdrop');
const portionModalTitle = document.getElementById('portion-modal-title');
const portionGramDisplay = document.getElementById('portion-gram-display');
const portionKcalDisplay = document.getElementById('portion-kcal-display');
const addFoodToLogBtn = document.getElementById('add-food-to-log-btn');
const portionMinusBtn = document.getElementById('portion-minus-btn');
const portionPlusBtn = document.getElementById('portion-plus-btn');

let tempPortionAmount = 100;

const newFoodModal = document.getElementById('newFoodModal');
const newFoodModalContent = document.getElementById('newFoodModalContent');
const newFoodBackdrop = document.getElementById('new-food-backdrop');
const saveNewFoodBtn = document.getElementById('save-new-food-btn');

const newFoodNameInput = document.getElementById('new-food-name');
const newFoodKcalDisplay = document.getElementById('new-food-kcal-display');
const newFoodKcalMinus = document.getElementById('new-food-kcal-minus');
const newFoodKcalPlus = document.getElementById('new-food-kcal-plus');

const newFoodProteinDisplay = document.getElementById('new-food-protein-display');
const newFoodProteinMinus = document.getElementById('new-food-protein-minus');
const newFoodProteinPlus = document.getElementById('new-food-protein-plus');

const newFoodKarbDisplay = document.getElementById('new-food-karb-display');
const newFoodKarbMinus = document.getElementById('new-food-karb-minus');
const newFoodKarbPlus = document.getElementById('new-food-karb-plus');

const newFoodYagDisplay = document.getElementById('new-food-yag-display');
const newFoodYagMinus = document.getElementById('new-food-yag-minus');
const newFoodYagPlus = document.getElementById('new-food-yag-plus');

let tempNewFoodKcal = 100;
let tempNewFoodProtein = 0;
let tempNewFoodKarb = 0;
let tempNewFoodYag = 0;

const foodSearchInput = document.getElementById('food-search-input');

let tempCaloriesGoal = 2000;
let tempMacroProtein = 150;
let tempMacroKarb = 250;
let tempMacroYag = 65;
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
            if (foodSearchInput) {
                foodSearchInput.value = '';
                renderLibraryFoods(); // refresh list to show all
            }
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
    if (foodSearchInput) {
    foodSearchInput.addEventListener('input', () => {
        renderLibraryFoods();
    });
}
if (caloriesGoalBackdrop) {
        caloriesGoalBackdrop.onclick = () => closeCaloriesGoalModal();
    }

    if (caloriesGoalMinus) {
        caloriesGoalMinus.onclick = () => {
            if (tempCaloriesGoal > 500) tempCaloriesGoal -= 100;
            if(caloriesGoalAmountDisplay) caloriesGoalAmountDisplay.textContent = tempCaloriesGoal;
        };
    }
    if (caloriesGoalPlus) {
        caloriesGoalPlus.onclick = () => {
            if (tempCaloriesGoal < 10000) tempCaloriesGoal += 100;
            if(caloriesGoalAmountDisplay) caloriesGoalAmountDisplay.textContent = tempCaloriesGoal;
        };
    }

    if (macroProteinMinus) {
        macroProteinMinus.onclick = () => {
            if (tempMacroProtein > 10) tempMacroProtein -= 5;
            if(macroProteinDisplay) macroProteinDisplay.textContent = tempMacroProtein;
        };
    }
    if (macroProteinPlus) {
        macroProteinPlus.onclick = () => {
            if (tempMacroProtein < 500) tempMacroProtein += 5;
            if(macroProteinDisplay) macroProteinDisplay.textContent = tempMacroProtein;
        };
    }

    if (macroKarbMinus) {
        macroKarbMinus.onclick = () => {
            if (tempMacroKarb > 10) tempMacroKarb -= 10;
            if(macroKarbDisplay) macroKarbDisplay.textContent = tempMacroKarb;
        };
    }
    if (macroKarbPlus) {
        macroKarbPlus.onclick = () => {
            if (tempMacroKarb < 1000) tempMacroKarb += 10;
            if(macroKarbDisplay) macroKarbDisplay.textContent = tempMacroKarb;
        };
    }

    if (macroYagMinus) {
        macroYagMinus.onclick = () => {
            if (tempMacroYag > 5) tempMacroYag -= 5;
            if(macroYagDisplay) macroYagDisplay.textContent = tempMacroYag;
        };
    }
    if (macroYagPlus) {
        macroYagPlus.onclick = () => {
            if (tempMacroYag < 300) tempMacroYag += 5;
            if(macroYagDisplay) macroYagDisplay.textContent = tempMacroYag;
        };
    }

    if (caloriesGoalSave) {
        caloriesGoalSave.onclick = async () => {
            if(!currentUid) return;
            caloriesGoalSave.disabled = true;
            try {
                await setDoc(doc(db, "users", currentUid, "settings", "calories"), {
                    dailyCalorieGoal: tempCaloriesGoal,
                    proteinGoal: tempMacroProtein,
                    karbGoal: tempMacroKarb,
                    yagGoal: tempMacroYag,
                    updatedAt: serverTimestamp()
                }, { merge: true });
                closeCaloriesGoalModal();
            } catch (error) {
                console.error("Hedef güncellenirken hata:", error);
                alert("Hedef kaydedilemedi: " + error.message);
            } finally {
                caloriesGoalSave.disabled = false;
            }
        };
    }

    // New Food (Library) Modal
    document.querySelectorAll('.open-new-food-modal-btn').forEach(btn => {
        btn.onclick = openNewFoodModal;
    });

    
    if (newFoodBackdrop) {
        newFoodBackdrop.onclick = () => closeNewFoodModal();
    }

    if (newFoodKcalMinus) {
        newFoodKcalMinus.onclick = () => {
            if (tempNewFoodKcal > 10) tempNewFoodKcal -= 10;
            if (newFoodKcalDisplay) newFoodKcalDisplay.textContent = tempNewFoodKcal;
        };
    }
    if (newFoodKcalPlus) {
        newFoodKcalPlus.onclick = () => {
            tempNewFoodKcal += 10;
            if (newFoodKcalDisplay) newFoodKcalDisplay.textContent = tempNewFoodKcal;
        };
    }

    if (newFoodProteinMinus) {
        newFoodProteinMinus.onclick = () => {
            if (tempNewFoodProtein > 1) tempNewFoodProtein -= 1;
            else tempNewFoodProtein = 0;
            if (newFoodProteinDisplay) newFoodProteinDisplay.textContent = tempNewFoodProtein;
        };
    }
    if (newFoodProteinPlus) {
        newFoodProteinPlus.onclick = () => {
            tempNewFoodProtein += 1;
            if (newFoodProteinDisplay) newFoodProteinDisplay.textContent = tempNewFoodProtein;
        };
    }

    if (newFoodKarbMinus) {
        newFoodKarbMinus.onclick = () => {
            if (tempNewFoodKarb > 1) tempNewFoodKarb -= 1;
            else tempNewFoodKarb = 0;
            if (newFoodKarbDisplay) newFoodKarbDisplay.textContent = tempNewFoodKarb;
        };
    }
    if (newFoodKarbPlus) {
        newFoodKarbPlus.onclick = () => {
            tempNewFoodKarb += 1;
            if (newFoodKarbDisplay) newFoodKarbDisplay.textContent = tempNewFoodKarb;
        };
    }

    if (newFoodYagMinus) {
        newFoodYagMinus.onclick = () => {
            if (tempNewFoodYag > 1) tempNewFoodYag -= 1;
            else tempNewFoodYag = 0;
            if (newFoodYagDisplay) newFoodYagDisplay.textContent = tempNewFoodYag;
        };
    }
    if (newFoodYagPlus) {
        newFoodYagPlus.onclick = () => {
            tempNewFoodYag += 1;
            if (newFoodYagDisplay) newFoodYagDisplay.textContent = tempNewFoodYag;
        };
    }

    if (saveNewFoodBtn) {
        saveNewFoodBtn.onclick = async () => {
            if(!currentUid) return;
            const name = newFoodNameInput ? newFoodNameInput.value.trim() : "";
            if (!name) {
                alert("Lütfen besin adı giriniz.");
                return;
            }
            saveNewFoodBtn.disabled = true;
            try {
                await addDoc(collection(db, "users", currentUid, "foodLibrary"), {
                    name: name,
                    kcal: tempNewFoodKcal,
                    protein: tempNewFoodProtein,
                    karb: tempNewFoodKarb,
                    yag: tempNewFoodYag,
                    createdAt: serverTimestamp()
                });
                closeNewFoodModal();
            } catch (error) {
                console.error("Besin eklerken hata:", error);
                alert("Kaydedilemedi: " + error.message);
            } finally {
                saveNewFoodBtn.disabled = false;
            }
        };
    }

    if (portionBackdrop) {
        portionBackdrop.onclick = () => closeAddPortionModal();
    }

    if (portionMinusBtn) {
        portionMinusBtn.onclick = () => { adjustAmount(-10); };
    }
    
    if (portionPlusBtn) {
        portionPlusBtn.onclick = () => { adjustAmount(10); };
    }
    
    if (addFoodToLogBtn) {
        addFoodToLogBtn.onclick = async () => {
            let grams = tempPortionAmount;
            if (grams <= 0) {
                alert('Lütfen geçerli bir gramaj girin (Sıfırdan büyük olmalıdır).');
                return;
            }
            const total = Math.round((grams / 100) * currentKcalPer100g);
            
            // Approximate macros based on library macros or standard ratios
            let p = 0, k = 0, y = 0;
            if (currentFoodMacros.protein !== null) p = Math.round((grams / 100) * currentFoodMacros.protein);
            if (currentFoodMacros.karb !== null) k = Math.round((grams / 100) * currentFoodMacros.karb);
            if (currentFoodMacros.yag !== null) y = Math.round((grams / 100) * currentFoodMacros.yag);
            
            addFoodToLogBtn.disabled = true;
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
                        createdAt: serverTimestamp(),
                        type: "Food"
                    };
                    await addDoc(collection(db, "users", currentUid, "calorieLogs"), logEntry);
                }
            } catch(err) {
                console.error("Kayıt Hatası:", err);
                alert('Kaydedilirken hata oluştu: ' + err.message);
            } finally {
                currentEditLogId = null;
                addFoodToLogBtn.disabled = false;
                closeAddPortionModal();
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
    tempMacroProtein = proteinGoal;
    tempMacroKarb = karbGoal;
    tempMacroYag = yagGoal;

    if(caloriesGoalAmountDisplay) caloriesGoalAmountDisplay.textContent = tempCaloriesGoal;
    if(macroProteinDisplay) macroProteinDisplay.textContent = tempMacroProtein;
    if(macroKarbDisplay) macroKarbDisplay.textContent = tempMacroKarb;
    if(macroYagDisplay) macroYagDisplay.textContent = tempMacroYag;
    
    caloriesGoalModal.classList.remove('hidden');
    // small delay for transition
    setTimeout(() => {
        if(caloriesGoalBackdrop) caloriesGoalBackdrop.classList.remove('opacity-0');
        if(caloriesGoalModalContent) {
            caloriesGoalModalContent.classList.remove('translate-y-full', 'md:translate-y-10', 'md:opacity-0', 'md:scale-95');
            caloriesGoalModalContent.classList.add('translate-y-0', 'md:translate-y-0', 'md:opacity-100', 'md:scale-100');
        }
    }, 10);
}

function closeCaloriesGoalModal() {
    if(!caloriesGoalModal) return;
    if(caloriesGoalBackdrop) caloriesGoalBackdrop.classList.add('opacity-0');
    if(caloriesGoalModalContent) {
        caloriesGoalModalContent.classList.remove('translate-y-0', 'md:translate-y-0', 'md:opacity-100', 'md:scale-100');
        caloriesGoalModalContent.classList.add('translate-y-full', 'md:translate-y-10', 'md:opacity-0', 'md:scale-95');
    }
    setTimeout(() => {
        caloriesGoalModal.classList.add('hidden');
    }, 300);
}

function openNewFoodModal() {
    if(!newFoodModal) return;
    
    // Reset inputs
    tempNewFoodKcal = 100;
    tempNewFoodProtein = 0;
    tempNewFoodKarb = 0;
    tempNewFoodYag = 0;
    
    if (newFoodNameInput) newFoodNameInput.value = "";
    if (newFoodKcalDisplay) newFoodKcalDisplay.textContent = tempNewFoodKcal;
    if (newFoodProteinDisplay) newFoodProteinDisplay.textContent = tempNewFoodProtein;
    if (newFoodKarbDisplay) newFoodKarbDisplay.textContent = tempNewFoodKarb;
    if (newFoodYagDisplay) newFoodYagDisplay.textContent = tempNewFoodYag;
    
    newFoodModal.classList.remove('hidden');
    // small delay for transition
    setTimeout(() => {
        if(newFoodBackdrop) newFoodBackdrop.classList.remove('opacity-0');
        if(newFoodModalContent) {
            newFoodModalContent.classList.remove('translate-y-full', 'md:translate-y-10', 'md:opacity-0', 'md:scale-95');
            newFoodModalContent.classList.add('translate-y-0', 'md:translate-y-0', 'md:opacity-100', 'md:scale-100');
        }
    }, 10);
}

function closeNewFoodModal() {
    if(!newFoodModal) return;
    if(newFoodBackdrop) newFoodBackdrop.classList.add('opacity-0');
    if(newFoodModalContent) {
        newFoodModalContent.classList.remove('translate-y-0', 'md:translate-y-0', 'md:opacity-100', 'md:scale-100');
        newFoodModalContent.classList.add('translate-y-full', 'md:translate-y-10', 'md:opacity-0', 'md:scale-95');
    }
    setTimeout(() => {
        newFoodModal.classList.add('hidden');
    }, 300);
}

function renderLogs() {
    const list = document.getElementById('daily-log-list');
    if(!list) return;
    
    if(dailyLogs.length === 0) {
        list.innerHTML = '<div class="text-center py-4 text-[#64748B] text-sm">Henüz kayıt yok.</div>';
        return;
    }

    list.innerHTML = '';
    
    dailyLogs.forEach(log => {
        let dateObj = log.createdAt ? (log.createdAt.toDate ? log.createdAt.toDate() : new Date(log.createdAt)) : new Date();
        let timeStr = dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) + ' ' + (dateObj.getHours() >= 12 ? 'PM' : 'AM');
        
        const wrapper = document.createElement('div');
        wrapper.className = "relative w-full shrink-0";
        
        // Delete button underneath
        const delBtn = document.createElement('button');
        delBtn.className = "absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-red-500 rounded-2xl text-white flex items-center justify-center z-0 active:bg-red-600 transition-colors";
        delBtn.innerHTML = `<span class="material-symbols-outlined text-xl">delete</span>`;
        delBtn.onclick = async () => {
            try {
                await deleteDoc(doc(db, "users", currentUid, "calorieLogs", log.id));
            } catch(e) {
                console.error("Silme Hatası", e);
                // local update for test
                dailyLogs = dailyLogs.filter(l => l.id !== log.id);
                updateUIState();
            }
        };

        const item = document.createElement('div');
        item.className = "relative flex items-center justify-between p-4 rounded-2xl bg-[#F7F9FF] z-10 transition-transform cursor-grab active:cursor-grabbing";
        item.style.boxShadow = "4px 4px 8px #D1D9E6, -4px -4px 8px #FFFFFF";
        
        let iconHtml = '';
        let colorClass = '';
        if(log.type === "Meal") {
            iconHtml = `<span class="material-symbols-rounded text-[#3B82F6]">restaurant</span>`;
            colorClass = "text-[#3B82F6]";
        } else {
            iconHtml = `<span class="material-symbols-rounded text-[#A855F7]">nutrition</span>`;
            colorClass = "text-[#A855F7]";
        }

        item.innerHTML = `
            <div class="flex items-center gap-4 pointer-events-none">
                <div class="w-10 h-10 rounded-full bg-[#F7F9FF] flex items-center justify-center" style="box-shadow: inset 2px 2px 5px #D1D9E6, inset -2px -2px 5px #FFFFFF;">
                    ${iconHtml}
                </div>
                <div>
                    <p class="text-sm font-bold text-[#1E293B]">${escapeHtml(log.name || "Bilinmeyen")}</p>
                    <p class="text-xs text-[#64748B]">${timeStr}</p>
                </div>
            </div>
            <span class="font-bold ${colorClass} pointer-events-none">+${log.kcal}kcal</span>
        `;

        // Swipe logic
        let startX = 0;
        let currentX = 0;
        let isDragging = false;

        item.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isDragging = true;
            item.style.transition = 'none';
        }, {passive: true});

        item.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            currentX = e.touches[0].clientX;
            let diff = currentX - startX;
            if (diff > 0) diff = 0; // only swipe left
            if (diff < -80) diff = -80;
            item.style.transform = `translateX(${diff}px)`;
        }, {passive: true});

        item.addEventListener('touchend', (e) => {
            isDragging = false;
            item.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
            let diff = currentX - startX;
            if (diff < -40) {
                item.style.transform = `translateX(-80px)`; // stay open to show delete btn
                setTimeout(() => {
                    document.addEventListener('touchstart', function closeSwipe(evt) {
                        if (!wrapper.contains(evt.target)) {
                            item.style.transform = `translateX(0px)`;
                            document.removeEventListener('touchstart', closeSwipe);
                        }
                    }, {passive: true});
                }, 100);
            } else {
                item.style.transform = `translateX(0px)`;
            }
        });
        
        wrapper.appendChild(delBtn);
        wrapper.appendChild(item);
        list.appendChild(wrapper);
    });
}

window.openAddPortionModal = function(name, kcal100, macros) {
    currentFoodName = name;
    currentKcalPer100g = kcal100;
    currentFoodMacros = macros || {karb: 0, protein: 0, yag: 0};
    
    if(portionModalTitle) portionModalTitle.textContent = `${name} - Porsiyon Ekle`;
    tempPortionAmount = 100;
    if(portionGramDisplay) portionGramDisplay.textContent = tempPortionAmount;
    updatePortionTotal();
    
    if(portionModal) {
        portionModal.classList.remove('hidden');
        setTimeout(() => {
            if(portionBackdrop) portionBackdrop.classList.remove('opacity-0');
            if(portionModalContent) {
                portionModalContent.classList.remove('translate-y-full', 'md:translate-y-10', 'md:opacity-0', 'md:scale-95');
                portionModalContent.classList.add('translate-y-0', 'md:translate-y-0', 'md:opacity-100', 'md:scale-100');
            }
        }, 10);
    }
};

window.closeAddPortionModal = function() {
    if(portionModal) {
        if(portionBackdrop) portionBackdrop.classList.add('opacity-0');
        if(portionModalContent) {
            portionModalContent.classList.remove('translate-y-0', 'md:translate-y-0', 'md:opacity-100', 'md:scale-100');
            portionModalContent.classList.add('translate-y-full', 'md:translate-y-10', 'md:opacity-0', 'md:scale-95');
        }
        setTimeout(() => {
            portionModal.classList.add('hidden');
        }, 300);
    }
};

function updatePortionTotal() {
    if(portionGramDisplay && portionKcalDisplay) {
        let grams = tempPortionAmount;
        if (isNaN(grams) || grams < 0) grams = 0;
        const total = Math.round((grams / 100) * currentKcalPer100g);
        portionKcalDisplay.textContent = `${total} kcal`;
    }
}

function adjustAmount(amount) {
    tempPortionAmount += amount;
    if (tempPortionAmount < 0) tempPortionAmount = 0;
    if(portionGramDisplay) {
        portionGramDisplay.textContent = tempPortionAmount;
        portionGramDisplay.style.transform = 'scale(1.1)';
        setTimeout(() => portionGramDisplay.style.transform = 'scale(1)', 150);
    }
    updatePortionTotal();
}

function renderLibraryFoods() {
    const list = document.getElementById('library-food-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    let filteredFoods = libraryFoods;
    if (foodSearchInput && foodSearchInput.value) {
        const q = foodSearchInput.value.toLowerCase();
        filteredFoods = libraryFoods.filter(f => (f.name || "").toLowerCase().includes(q));
    }
    
    if(filteredFoods.length === 0) {
        list.innerHTML = `<p class="text-[#64748B] text-sm text-center py-4">Kayıtlı besin bulunamadı.</p>`;
        return;
    }

    filteredFoods.forEach((food) => {
        const wrapper = document.createElement('div');
        wrapper.className = "relative w-full shrink-0 overflow-hidden rounded-2xl";
        
        // Delete button underneath
        const delBtn = document.createElement('button');
        delBtn.className = "absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-red-500 rounded-2xl text-white flex items-center justify-center z-0 active:bg-red-600 transition-colors";
        delBtn.innerHTML = `<span class="material-symbols-rounded text-xl">delete</span>`;
        delBtn.onclick = async () => {
            try {
                await deleteDoc(doc(db, "users", currentUid, "foodLibrary", food.id));
            } catch(e) {
                console.error("Silme Hatası", e);
                alert('Silinirken hata oluştu: ' + e.message);
            }
        };

        const item = document.createElement('div');
        item.className = "flex items-center justify-between p-4 rounded-2xl bg-[#F7F9FF] relative z-10 transition-transform cursor-pointer";
        item.style.boxShadow = "4px 4px 8px #D1D9E6, -4px -4px 8px #FFFFFF";
        
        let p = food.protein || 0;
        let k = food.karb || 0;
        let y = food.yag || 0;

        item.innerHTML = `
            <div class="flex items-center gap-4 pointer-events-none">
                <div class="w-10 h-10 rounded-full bg-[#F7F9FF] flex items-center justify-center shrink-0" style="box-shadow: inset 2px 2px 5px #D1D9E6, inset -2px -2px 5px #FFFFFF;">
                    <span class="material-symbols-rounded text-[#3B82F6]">restaurant</span>
                </div>
                <div class="flex-1 min-w-0 pr-2">
                    <p class="text-sm font-bold text-[#1E293B] truncate">${escapeHtml(food.name || "İsimsiz")}</p>
                    <p class="text-[10px] text-[#64748B] mt-1 truncate">P:${p}g • K:${k}g • Y:${y}g</p>
                </div>
            </div>
            <span class="font-bold text-[#3B82F6] pointer-events-none whitespace-nowrap shrink-0">${food.kcal} kcal</span>
        `;
        
        // Swipe logic
        let startX = 0;
        let currentX = 0;
        let isDragging = false;

        item.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isDragging = true;
            item.style.transition = 'none';
        }, {passive: true});

        item.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            currentX = e.touches[0].clientX;
            let diff = currentX - startX;
            if (diff > 0) diff = 0; // only swipe left
            if (diff < -80) diff = -80;
            item.style.transform = `translateX(${diff}px)`;
        }, {passive: true});

        item.addEventListener('touchend', (e) => {
            isDragging = false;
            item.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
            let diff = currentX - startX;
            if (diff < -40) {
                item.style.transform = `translateX(-80px)`; // stay open to show delete btn
                setTimeout(() => {
                    document.addEventListener('touchstart', function closeSwipe(evt) {
                        if (!wrapper.contains(evt.target)) {
                            item.style.transform = `translateX(0px)`;
                            document.removeEventListener('touchstart', closeSwipe);
                        }
                    }, {passive: true});
                }, 100);
            } else {
                item.style.transform = `translateX(0px)`;
            }
        });
        
        item.addEventListener('click', (e) => {
            if (Math.abs(currentX - startX) < 5) {
                openAddPortionModal(food.name, food.kcal, {karb: food.karb, protein: food.protein, yag: food.yag});
            }
        });
        
        wrapper.appendChild(delBtn);
        wrapper.appendChild(item);
        list.appendChild(wrapper);
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
        let offset = 314.159 - (314.159 * percentage);
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
    const wrapper = document.getElementById('calories-chart-wrapper');
    const avgText = document.getElementById('calories-avg-text');
    if(!wrapper || !avgText) return;

    if(weeklyLogs.length === 0) {
        wrapper.innerHTML = '<div class="w-full text-center text-[#64748B] text-sm py-8">Veri yok</div>';
        avgText.textContent = "Avg: 0 kcal";
        return;
    }

    const today = new Date();
    today.setHours(0,0,0,0);
    
    let chartData = [];
    for(let i=6; i>=0; i--) {
        let d = new Date(today);
        d.setDate(d.getDate() - i);
        let dayStr = d.toISOString().split('T')[0];
        
        let sum = 0;
        weeklyLogs.forEach(l => {
            let logDate = l.createdAt ? (l.createdAt.toDate ? l.createdAt.toDate() : new Date(l.createdAt)) : new Date();
            let logDayStr = logDate.toISOString().split('T')[0];
            if(logDayStr === dayStr) {
                sum += l.kcal || 0;
            }
        });
        
        chartData.push({
            date: d,
            total: sum,
            label: d.toLocaleDateString('en-US', { weekday: 'short' })
        });
    }

    let total7Days = chartData.reduce((acc, c) => acc + c.total, 0);
    let avg = Math.round(total7Days / 7);
    avgText.textContent = `Avg: ${avg} kcal`;

    let maxVal = Math.max(...chartData.map(c => c.total), dailyCalorieGoal, 1);

    wrapper.innerHTML = '';
    
    chartData.forEach((data, index) => {
        const isToday = index === 6;
        let percent = Math.min((data.total / maxVal) * 100, 100);
        
        // Colors from user design
        let barColor = isToday ? "bg-[#22C55E]" : (index === 3 ? "bg-[#A855F7]" : "bg-[#3B82F6]");
        let textColor = isToday ? "font-bold text-[#1E293B]" : "text-[#64748B]";
        
        const col = document.createElement('div');
        col.className = "flex flex-col items-center gap-2 w-1/7";
        col.innerHTML = `
            <div class="w-4 h-32 bg-[#E0E5EC] rounded-full relative overflow-hidden">
                <div class="absolute bottom-0 w-full ${barColor} rounded-full transition-all duration-500 ease-out" style="height: ${percent}%;"></div>
            </div>
            <span class="text-[10px] ${textColor}">${data.label}</span>
        `;
        wrapper.appendChild(col);
    });
}
