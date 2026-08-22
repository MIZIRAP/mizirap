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

    // New bindings for Silk Neon Water UI
    const btn250 = document.getElementById("btn-water-250");
    const btn500 = document.getElementById("btn-water-500");
    const btnCustom = document.getElementById("btn-water-custom");
    const btnEditGoal = document.getElementById("btn-edit-water-goal");

    const addWaterLog = async (amount, type, icon) => {
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

    if(btn250) btn250.onclick = () => addWaterLog(250, "Glass of Water", "local_drink");
    if(btn500) btn500.onclick = () => addWaterLog(500, "Water Bottle", "water_bottle");
    if(btnCustom) btnCustom.onclick = openCustomModal;
    if(btnEditGoal) btnEditGoal.onclick = openModal;


    // Event Listeners for Custom Add Modal
    const customBtn = document.getElementById("water-custom-btn");
    const customModal = document.getElementById("water-custom-modal");
    const customModalContent = document.getElementById("water-custom-modal-content");
    const customBackdrop = document.getElementById("water-custom-backdrop");
    const customMinusBtn = document.getElementById("water-custom-minus");
    const customPlusBtn = document.getElementById("water-custom-plus");
    const customSaveBtn = document.getElementById("water-custom-save");
    const customAmountDisplay = document.getElementById("water-custom-amount-display");
    const customCloseHandle = document.getElementById("water-custom-close-handle");

    let tempCustomAmount = 250;

    function updateCustomModalUI() {
        if(customAmountDisplay) {
            customAmountDisplay.textContent = tempCustomAmount;
            customAmountDisplay.style.transform = 'scale(1.1)';
            customAmountDisplay.style.transition = 'transform 0.15s ease-out';
            setTimeout(() => customAmountDisplay.style.transform = 'scale(1)', 150);
        }
    }

    function openCustomModal() {
        if(!customModal) return;
        tempCustomAmount = 250;
        updateCustomModalUI();
        customModal.classList.remove("hidden");
        // Trigger reflow
        void customModal.offsetWidth;
        customModalContent.classList.remove("translate-y-full");
        customModalContent.classList.add("translate-y-0");
        if(customBackdrop) {
            customBackdrop.classList.remove("opacity-0");
            customBackdrop.classList.add("opacity-100");
        }
    }

    function closeCustomModal() {
        if(!customModal) return;
        customModalContent.classList.remove("translate-y-0");
        customModalContent.classList.add("translate-y-full");
        if(customBackdrop) {
            customBackdrop.classList.remove("opacity-100");
            customBackdrop.classList.add("opacity-0");
        }
        setTimeout(() => {
            customModal.classList.add("hidden");
        }, 300);
    }

    if(customMinusBtn) {
        customMinusBtn.onclick = () => {
            if(tempCustomAmount > 50) {
                tempCustomAmount -= 50;
                updateCustomModalUI();
            }
        };
    }

    if(customPlusBtn) {
        customPlusBtn.onclick = () => {
            if(tempCustomAmount < 2000) {
                tempCustomAmount += 50;
                updateCustomModalUI();
            }
        };
    }

    if(customCloseHandle) customCloseHandle.onclick = closeCustomModal;
    if(customBackdrop) customBackdrop.onclick = closeCustomModal;

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
    const backdrop = document.getElementById("water-goal-backdrop");
    const minusBtn = document.getElementById("water-goal-minus");
    const plusBtn = document.getElementById("water-goal-plus");
    const cancelBtn = document.getElementById("water-goal-cancel");
    const saveBtn = document.getElementById("water-goal-save");
    const amountDisplay = document.getElementById("water-goal-amount-display");
    const closeHandle = document.getElementById("water-goal-close-handle");
    const presetBtns = document.querySelectorAll(".water-goal-preset");

    let tempGoal = dailyGoal;

    function updateModalUI() {
        if(amountDisplay) {
            amountDisplay.textContent = tempGoal;
            amountDisplay.style.transform = 'scale(1.1)';
            amountDisplay.style.transition = 'transform 0.15s ease-out';
            setTimeout(() => amountDisplay.style.transform = 'scale(1)', 150);
        }
    }

    function openModal() {
        if(!modal) return;
        tempGoal = dailyGoal;
        updateModalUI();
        modal.classList.remove("hidden");
        // Trigger reflow
        void modal.offsetWidth;
        modalContent.classList.remove("translate-y-full");
        modalContent.classList.add("translate-y-0");
        if(backdrop) {
            backdrop.classList.remove("opacity-0");
            backdrop.classList.add("opacity-100");
        }
    }

    function closeModal() {
        if(!modal) return;
        modalContent.classList.remove("translate-y-0");
        modalContent.classList.add("translate-y-full");
        if(backdrop) {
            backdrop.classList.remove("opacity-100");
            backdrop.classList.add("opacity-0");
        }
        setTimeout(() => {
            modal.classList.add("hidden");
        }, 300);
    }

    if(minusBtn) {
        minusBtn.onclick = () => {
            if(tempGoal > 500) {
                tempGoal -= 250;
                updateModalUI();
            }
        };
    }

    if(plusBtn) {
        plusBtn.onclick = () => {
            if(tempGoal < 5000) {
                tempGoal += 250;
                updateModalUI();
            }
        };
    }

    if(cancelBtn) cancelBtn.onclick = closeModal;
    if(closeHandle) closeHandle.onclick = closeModal;
    if(backdrop) backdrop.onclick = closeModal;

    if(saveBtn) {
        saveBtn.onclick = async () => {
            if(tempGoal > 0) {
                try {
                    await setDoc(doc(db, "users", uid, "settings", "water"), { dailyGoal: tempGoal }, { merge: true }).catch(e => { console.error('DB Error:', e); alert('Veritabanı işlemi sırasında bir hata oluştu.'); throw e; });
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
    const circle = document.getElementById("water-prog-circle");
    const currentText = document.getElementById("water-current-amount");
    const goalText = document.getElementById("water-goal-text");

    if(currentText) currentText.textContent = currentAmount;
    if(goalText) goalText.textContent = `of ${dailyGoal} ml`;

    if(circle) {
        const radius = circle.r.baseVal.value; // 50
        const circumference = radius * 2 * Math.PI; // 314.159
        circle.style.strokeDasharray = `${circumference} ${circumference}`;

        let percent = currentAmount / dailyGoal;
        if (percent > 1) percent = 1;
        const offset = circumference - percent * circumference;
        circle.style.strokeDashoffset = offset;
    }


    // 2. Today's Log Render
    const logList = document.getElementById("water-history-list");
    if(logList) {
        logList.innerHTML = "";
        if(todaysLogs.length === 0) {
            logList.innerHTML = `<div class="p-4 text-center text-[#64748B] text-sm">Bugün henüz su içilmedi.</div>`;
        } else {
            todaysLogs.forEach(log => {
                const timeStr = log.createdAt?.toDate ? log.createdAt.toDate().toLocaleTimeString("tr-TR", {hour: '2-digit', minute:'2-digit'}) : "";

                const wrapper = document.createElement("div");
                wrapper.className = "relative w-full shrink-0";

                const delBtn = document.createElement("button");
                delBtn.className = "absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-red-500 rounded-2xl text-white flex items-center justify-center z-0 active:bg-red-600 transition-colors";
                delBtn.innerHTML = `<span class="material-symbols-rounded text-xl">delete</span>`;
                delBtn.onclick = async () => {
                    try {
                        await deleteDoc(doc(db, "users", currentUid, "waterLogs", log.id));
                    } catch(err) {
                        console.error("Silme Hatası:", err);
                        // local update for test
                        waterLogs = waterLogs.filter(l => l.id !== log.id);
                        updateWaterUI();
                    }
                };

                const card = document.createElement("div");
                card.className = "relative z-10 flex items-center justify-between p-4 rounded-2xl bg-[#F7F9FF] w-full touch-pan-y";
                card.style.boxShadow = "4px 4px 8px #D1D9E6, -4px -4px 8px #FFFFFF";

                let iconClass = "text-[#3B82F6]";
                if(log.icon === "water_bottle") iconClass = "text-[#A855F7]";

                card.innerHTML = `
                    <div class="flex items-center gap-4 pointer-events-none">
                        <div class="w-10 h-10 rounded-full bg-[#F7F9FF] flex items-center justify-center" style="box-shadow: inset 2px 2px 5px #D1D9E6, inset -2px -2px 5px #FFFFFF;">
                            <span class="material-symbols-rounded ${iconClass}">${log.icon || 'local_drink'}</span>
                        </div>
                        <div>
                            <p class="text-sm font-bold text-[#1E293B]">${log.type}</p>
                            <p class="text-xs text-[#64748B]">${timeStr}</p>
                        </div>
                    </div>
                    <span class="font-bold ${iconClass} pointer-events-none">+${log.amount}ml</span>
                `;

                // Swipe logic
                let startX = 0;
                let currentX = 0;
                let isSwiping = false;

                card.addEventListener('touchstart', (e) => {
                    startX = e.touches[0].clientX;
                    isSwiping = true;
                    card.style.transition = 'none';
                }, {passive: true});

                card.addEventListener('touchmove', (e) => {
                    if(!isSwiping) return;
                    const deltaX = e.touches[0].clientX - startX;
                    if (deltaX < 0 && deltaX > -100) {
                        currentX = deltaX;
                        card.style.transform = `translateX(${currentX}px)`;
                    } else if (deltaX >= 0) {
                        currentX = 0;
                        card.style.transform = `translateX(0px)`;
                    }
                }, {passive: true});

                card.addEventListener('touchend', (e) => {
                    isSwiping = false;
                    card.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
                    if (currentX < -30) {
                        card.style.transform = `translateX(-72px)`; // Snap open
                    } else {
                        card.style.transform = `translateX(0px)`; // Snap close
                    }
                    currentX = 0;
                });

                // Close swipe when clicking outside
                document.addEventListener('touchstart', (e) => {
                    if(!wrapper.contains(e.target) && card.style.transform === 'translateX(-72px)') {
                        card.style.transform = `translateX(0px)`;
                    }
                }, {passive: true});

                wrapper.appendChild(delBtn);
                wrapper.appendChild(card);
                logList.appendChild(wrapper);
            });
        }
    }

    // 3. Weekly Chart Calculation
    const chartContainer = document.getElementById("water-chart-wrapper");
    const avgText = document.getElementById("water-avg-text");

    if(chartContainer && avgText) {
        chartContainer.innerHTML = "";

        let total7Days = 0;
        const days = [];
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]; // Changed to english based on user's HTML

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
            if(percent < 5 && day.amount > 0) percent = 5;

            const div = document.createElement("div");
            div.className = "flex flex-col items-center gap-2 w-1/7";

            let color = "#3B82F6"; // default blue
            let textClass = "text-[#64748B]";
            if(day.isToday) {
                textClass = "font-bold text-[#1E293B]";
                color = "#22C55E"; // green for today
            } else if (day.amount >= dailyGoal) {
                color = "#A855F7"; // purple for met goal
            }

            div.innerHTML = `
                <div class="w-4 h-32 bg-[#E0E5EC] rounded-full relative overflow-hidden">
                    <div class="absolute bottom-0 w-full rounded-full transition-all duration-500" style="background-color: ${color}; height: ${percent}%;"></div>
                </div>
                <span class="text-[10px] ${textClass}">${day.name}</span>
            `;

            chartContainer.appendChild(div);
        });
    }

    // Call callback to update dashboard if needed
    if(callback) {
        callback({ currentAmount, dailyGoal });
    }
}
