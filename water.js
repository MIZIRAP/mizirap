import { auth, db } from "./firebase-config.js";
import { collection, doc, addDoc, setDoc, deleteDoc, updateDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { escapeHtml, handleFormSubmit } from "./utils.js";
import { registerListener } from "./listenerManager.js";

let dailyGoal = 2000;
let waterLogs = [];
let unsubscribeLogs = null;
let unsubscribeSettings = null;
let callback = null;
let currentUid = null;

export function initWater(uid, onChangeCallback) {
    callback = onChangeCallback;
    currentUid = uid;
    
    // Settings listener for daily goal
    const settingsRef = doc(db, "users", uid, "settings", "water");
    unsubscribeSettings = registerListener(onSnapshot(settingsRef, (docSnap) => {
        if (docSnap.exists() && docSnap.data().dailyGoal) {
            dailyGoal = docSnap.data().dailyGoal;
        } else {
            dailyGoal = 2000; // default
        }
        document.getElementById("water-goal-text").textContent = dailyGoal;
        updateWaterUI();
    }));

    // Logs listener (last 7 days)
    const logsRef = query(collection(db, "users", uid, "waterLogs"), orderBy("createdAt", "desc"));
    unsubscribeLogs = registerListener(onSnapshot(logsRef, (snap) => {
        // Fetch all logs to filter locally (since we need last 7 days and today)
        // For a huge app we might want to query where createdAt > 7 days ago, but this is fine for now
        waterLogs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        updateWaterUI();
    }));

    // Event Listeners for Quick Add
    document.querySelectorAll(".water-add-btn").forEach(btn => {
        btn.onclick = async () => {
            const amount = parseInt(btn.dataset.amount);
            const type = btn.dataset.type;
            const icon = btn.dataset.icon;
            
            try {
                await addDoc(collection(db, "users", uid, "waterLogs"), {
                    amount, type, icon, createdAt: serverTimestamp()
                });
            } catch(err) {
                console.error("Firestore test hatası:", err);
                waterLogs.unshift({ amount, type, icon, createdAt: { toDate: () => new Date() } });
                updateWaterUI();
            }
        };
    });

    // Event Listeners for Custom Add Modal
    const customBtn = document.getElementById("water-custom-btn");
    const customModal = document.getElementById("water-custom-modal");
    const customModalContent = document.getElementById("water-custom-modal-content");
    const customMinusBtn = document.getElementById("water-custom-minus");
    const customPlusBtn = document.getElementById("water-custom-plus");
    const customCancelBtn = document.getElementById("water-custom-cancel");
    const customSaveBtn = document.getElementById("water-custom-save");
    const customAmountDisplay = document.getElementById("water-custom-amount-display");
    const customPresetBtns = document.querySelectorAll(".water-custom-preset");
    
    let tempCustomAmount = 250;

    function updateCustomModalUI() {
        if(customAmountDisplay) customAmountDisplay.textContent = tempCustomAmount;
        // Optionally animate the display text pop
        customAmountDisplay.classList.remove('scale-105');
        void customAmountDisplay.offsetWidth; // Trigger reflow
        customAmountDisplay.classList.add('scale-105', 'transition-transform', 'duration-150');
        setTimeout(() => {
            customAmountDisplay.classList.remove('scale-105');
        }, 150);
        
        customPresetBtns.forEach(btn => {
            const amt = parseInt(btn.dataset.amount);
            if(amt === tempCustomAmount) {
                btn.className = "water-custom-preset flex-1 py-2 rounded-full border-2 border-primary text-primary font-bold text-label-md bg-surface-container-low transition-colors active:scale-95";
            } else {
                btn.className = "water-custom-preset flex-1 py-2 rounded-full border border-outline-variant text-on-surface-variant font-label-md text-label-md hover:bg-surface-container transition-colors active:scale-95";
            }
        });
    }

    function openCustomModal() {
        if(!customModal) return;
        tempCustomAmount = 250;
        updateCustomModalUI();
        customModal.classList.remove("hidden");
        // Trigger reflow
        void customModal.offsetWidth;
        customModalContent.classList.remove("opacity-0", "scale-95");
        customModalContent.classList.add("opacity-100", "scale-100");
    }

    function closeCustomModal() {
        if(!customModal) return;
        customModalContent.classList.remove("opacity-100", "scale-100");
        customModalContent.classList.add("opacity-0", "scale-95");
        setTimeout(() => {
            customModal.classList.add("hidden");
        }, 200);
    }

    if(customBtn) {
        customBtn.onclick = openCustomModal;
    }

    if(customMinusBtn) {
        customMinusBtn.onclick = () => {
            if(tempCustomAmount > 10) {
                tempCustomAmount -= 10;
                updateCustomModalUI();
            } else {
                tempCustomAmount = 0;
                updateCustomModalUI();
            }
        };
    }

    if(customPlusBtn) {
        customPlusBtn.onclick = () => {
            tempCustomAmount += 10;
            updateCustomModalUI();
        };
    }

    customPresetBtns.forEach(btn => {
        btn.onclick = () => {
            tempCustomAmount = parseInt(btn.dataset.amount);
            updateCustomModalUI();
        };
    });

    if(customCancelBtn) customCancelBtn.onclick = closeCustomModal;

    if(customSaveBtn) {
        customSaveBtn.onclick = async () => {
            if(tempCustomAmount > 0) {
                try {
                    await addDoc(collection(db, "users", uid, "waterLogs"), {
                        amount: tempCustomAmount, type: "Custom", icon: "add", createdAt: serverTimestamp()
                    });
                } catch(err) {
                    console.error("Firestore test hatası:", err);
                    waterLogs.unshift({ amount: tempCustomAmount, type: "Custom", icon: "add", createdAt: { toDate: () => new Date() } });
                    updateWaterUI();
                }
            }
            closeCustomModal();
        };
    }

    // Event Listener for Daily Goal Modal
    const goalBtn = document.getElementById("water-goal-btn");
    const modal = document.getElementById("water-goal-modal");
    const modalContent = document.getElementById("water-goal-modal-content");
    const minusBtn = document.getElementById("water-goal-minus");
    const plusBtn = document.getElementById("water-goal-plus");
    const cancelBtn = document.getElementById("water-goal-cancel");
    const saveBtn = document.getElementById("water-goal-save");
    const amountDisplay = document.getElementById("water-goal-amount-display");
    const presetBtns = document.querySelectorAll(".water-goal-preset");
    
    let tempGoal = dailyGoal;

    function updateModalUI() {
        if(amountDisplay) amountDisplay.textContent = tempGoal;
        presetBtns.forEach(btn => {
            const amt = parseInt(btn.dataset.amount);
            if(amt === tempGoal) {
                btn.className = "water-goal-preset px-4 py-2 rounded-full bg-primary-container text-label-md text-on-primary-container font-bold active:scale-95";
            } else {
                btn.className = "water-goal-preset px-4 py-2 rounded-full bg-surface-container text-label-md text-on-surface-variant hover:bg-primary-container/30 transition-colors active:scale-95";
            }
        });
    }

    function openModal() {
        if(!modal) return;
        tempGoal = dailyGoal;
        updateModalUI();
        modal.classList.remove("hidden");
        // Trigger reflow
        void modal.offsetWidth;
        modalContent.classList.remove("opacity-0", "scale-95");
        modalContent.classList.add("opacity-100", "scale-100");
    }

    function closeModal() {
        if(!modal) return;
        modalContent.classList.remove("opacity-100", "scale-100");
        modalContent.classList.add("opacity-0", "scale-95");
        setTimeout(() => {
            modal.classList.add("hidden");
        }, 200);
    }

    if(goalBtn) {
        goalBtn.onclick = openModal;
    }

    if(minusBtn) {
        minusBtn.onclick = () => {
            if(tempGoal > 100) {
                tempGoal -= 100;
                updateModalUI();
            }
        };
    }

    if(plusBtn) {
        plusBtn.onclick = () => {
            tempGoal += 100;
            updateModalUI();
        };
    }

    presetBtns.forEach(btn => {
        btn.onclick = () => {
            tempGoal = parseInt(btn.dataset.amount);
            updateModalUI();
        };
    });

    if(cancelBtn) cancelBtn.onclick = closeModal;

    if(saveBtn) {
        saveBtn.onclick = async () => {
            if(tempGoal > 0) {
                try {
                    await setDoc(doc(db, "users", uid, "settings", "water"), { dailyGoal: tempGoal }, { merge: true });
                } catch (err) {
                    console.error("Firestore kaydetme hatası (Test modunda normaldir):", err);
                    // Test modu için yerel olarak güncelle
                    dailyGoal = tempGoal;
                    updateWaterUI();
                }
            }
            closeModal();
        };
    }
}

export function clearWater() {
    if(unsubscribeLogs) unsubscribeLogs();
    if(unsubscribeSettings) unsubscribeSettings();
    waterLogs = [];
}

function updateWaterUI() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Hesaplama (Bugün)
    const todaysLogs = waterLogs.filter(log => {
        if(!log.createdAt || !log.createdAt.toDate) return false;
        return log.createdAt.toDate() >= today;
    });

    const currentAmount = todaysLogs.reduce((sum, log) => sum + log.amount, 0);
    const circle = document.getElementById("water-progress-circle");
    const currentText = document.getElementById("water-current-text");
    
    if(currentText) currentText.textContent = currentAmount;
    
    if(circle) {
        const radius = circle.r.baseVal.value;
        const circumference = radius * 2 * Math.PI;
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        
        let percent = currentAmount / dailyGoal;
        if (percent > 1) percent = 1;
        const offset = circumference - percent * circumference;
        circle.style.strokeDashoffset = offset;
    }

    // 2. Today's Log Render
    const logList = document.getElementById("water-log-list");
    if(logList) {
        logList.innerHTML = "";
        if(todaysLogs.length === 0) {
            logList.innerHTML = `<div class="p-4 text-center text-on-surface-variant text-sm">Bugün henüz su içilmedi.</div>`;
        } else {
            // Show all today's logs and add a delete button
            todaysLogs.forEach(log => {
                const timeStr = log.createdAt?.toDate ? log.createdAt.toDate().toLocaleTimeString("tr-TR", {hour: '2-digit', minute:'2-digit'}) : "";
                const div = document.createElement("div");
                div.className = "flex items-center justify-between p-4 border-b border-surface-container/50 last:border-0 relative group";
                
                const normalView = document.createElement('div');
                normalView.className = "flex items-center justify-between w-full";
                
                const editView = document.createElement('div');
                editView.className = "hidden flex items-center justify-between w-full gap-2";

                const delBtn = document.createElement('button');
                delBtn.className = "absolute right-2 top-1/2 -translate-y-1/2 p-2 text-error opacity-0 group-hover:opacity-100 transition-opacity bg-error-container/20 rounded-full active:scale-95";
                delBtn.innerHTML = `<span class="material-symbols-outlined text-sm">delete</span>`;
                delBtn.onclick = async (e) => {
                    e.stopPropagation();
                    try {
                        await deleteDoc(doc(db, "users", currentUid, "waterLogs", log.id));
                    } catch(err) {
                        console.error("Silme Hatası:", err);
                    }
                };
                
                const editBtn = document.createElement('button');
                editBtn.className = "absolute right-12 top-1/2 -translate-y-1/2 p-2 text-primary opacity-0 group-hover:opacity-100 transition-opacity bg-primary-container/20 rounded-full active:scale-95";
                editBtn.innerHTML = `<span class="material-symbols-outlined text-sm">edit</span>`;
                editBtn.onclick = (e) => {
                    e.stopPropagation();
                    normalView.classList.add('hidden');
                    editView.classList.remove('hidden');
                    delBtn.classList.add('hidden');
                    editBtn.classList.add('hidden');
                };

                normalView.innerHTML = `
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-secondary">
                            <span class="material-symbols-outlined" data-icon="${log.icon}" data-weight="regular">${escapeHtml(log.icon || 'local_drink')}</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="font-body-lg text-body-lg text-on-surface font-medium">${escapeHtml(log.type)}</span>
                            <span class="font-body-md text-body-md text-on-surface-variant text-sm">${timeStr}</span>
                        </div>
                    </div>
                    <span class="font-headline-sm text-headline-sm text-primary pr-20">+${log.amount}ml</span>
                `;
                
                editView.innerHTML = `
                    <div class="flex items-center gap-2 flex-1">
                        <div class="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-secondary shrink-0">
                            <span class="material-symbols-outlined text-sm" data-icon="${log.icon}" data-weight="regular">${escapeHtml(log.icon || 'local_drink')}</span>
                        </div>
                        <input type="number" class="w-full bg-surface-container border border-outline-variant rounded-lg px-2 py-1 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary edit-amount-input" value="${log.amount}" min="1">
                        <span class="text-on-surface-variant text-sm">ml</span>
                    </div>
                    <button class="bg-primary text-on-primary px-3 py-1 rounded-lg text-sm font-medium shrink-0 edit-save-btn">Kaydet</button>
                    <button class="text-on-surface-variant px-2 py-1 rounded-lg text-sm shrink-0 edit-cancel-btn">İptal</button>
                `;

                div.appendChild(normalView);
                div.appendChild(editView);
                div.appendChild(editBtn);
                div.appendChild(delBtn);

                const saveBtn = editView.querySelector('.edit-save-btn');
                const cancelBtn = editView.querySelector('.edit-cancel-btn');
                const amountInput = editView.querySelector('.edit-amount-input');

                cancelBtn.onclick = (e) => {
                    e.stopPropagation();
                    editView.classList.add('hidden');
                    normalView.classList.remove('hidden');
                    delBtn.classList.remove('hidden');
                    editBtn.classList.remove('hidden');
                    amountInput.value = log.amount;
                };

                saveBtn.onclick = async (e) => {
                    e.stopPropagation();
                    await handleFormSubmit(saveBtn, [{ el: amountInput, type: 'number', required: true, min: 1 }], async () => {
                        const newAmount = parseInt(amountInput.value);
                        await updateDoc(doc(db, "users", currentUid, "waterLogs", log.id), {
                            amount: newAmount
                        });
                    });
                };
                logList.appendChild(div);
            });
            logList.classList.add("max-h-64", "overflow-y-auto");
        }
    }

    // 3. Weekly Chart Calculation
    const chartContainer = document.getElementById("water-chart-container");
    const labelsContainer = document.getElementById("water-chart-labels");
    const avgText = document.getElementById("water-avg-text");
    
    if(chartContainer && labelsContainer && avgText) {
        chartContainer.innerHTML = "";
        labelsContainer.innerHTML = "";
        
        let total7Days = 0;
        const days = [];
        const dayNames = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
        
        const today = new Date();
        today.setHours(0,0,0,0);
        const currentDayOfWeek = today.getDay();
        const diffToMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
        
        const monday = new Date(today);
        monday.setDate(monday.getDate() - diffToMonday);

        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(d.getDate() + i);
            days.push({
                date: d,
                name: dayNames[d.getDay()],
                amount: 0,
                isToday: d.getTime() === today.getTime()
            });
        }

        const endOfWeek = new Date(monday);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        endOfWeek.setHours(23,59,59,999);

        waterLogs.forEach(log => {
            if(!log.createdAt || !log.createdAt.toDate) return;
            const logDate = log.createdAt.toDate();
            if(logDate >= monday && logDate <= endOfWeek) {
                // Find matching day
                const matchingDay = days.find(day => 
                    logDate.getDate() === day.date.getDate() && 
                    logDate.getMonth() === day.date.getMonth()
                );
                if(matchingDay) {
                    matchingDay.amount += log.amount;
                    total7Days += log.amount;
                }
            }
        });

        avgText.textContent = `Avg: ${Math.round(total7Days / 7)}ml`;

        days.forEach(day => {
            let percent = day.amount / dailyGoal * 100;
            if(percent > 100) percent = 100;
            if(percent < 5 && day.amount > 0) percent = 5; // Minimum visible bar if > 0

            const div = document.createElement("div");
            div.className = "flex flex-col items-center gap-2 w-[14%] group relative";
            
            let barClass = "bg-primary/70 group-hover:bg-primary/90";
            let textClass = "text-outline";
            
            if(day.isToday) {
                barClass = "bg-primary group-hover:bg-primary/90";
                textClass = "text-primary font-bold";
            }
            if(day.amount >= dailyGoal && !day.isToday) {
                barClass = "bg-primary group-hover:opacity-80";
            }

            div.innerHTML = `
                <div class="absolute -top-6 bg-surface-container-high text-on-surface text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                    ${Math.round(day.amount)} ml
                </div>
                <div class="w-2 md:w-3 bg-surface-container rounded-full h-24 relative flex items-end overflow-hidden">
                    <div class="w-full rounded-full transition-all duration-500 ${barClass}" style="height: ${percent}%"></div>
                </div>
            `;
            
            const labelDiv = document.createElement("div");
            labelDiv.className = `text-label-sm md:text-xs w-[14%] text-center uppercase tracking-wider ${textClass}`;
            labelDiv.textContent = day.name;

            chartContainer.appendChild(div);
            labelsContainer.appendChild(labelDiv);
        });
    }

    // Call callback to update dashboard if needed
    if(callback) {
        callback({ currentAmount, dailyGoal });
    }
}
