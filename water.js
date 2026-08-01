import { auth, db } from "./firebase-config.js";
import { collection, doc, addDoc, setDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { escapeHtml } from "./utils.js";

let dailyGoal = 2000;
let waterLogs = [];
let unsubscribeLogs = null;
let unsubscribeSettings = null;
let callback = null;

export function initWater(uid, onChangeCallback) {
    callback = onChangeCallback;
    
    // Settings listener for daily goal
    const settingsRef = doc(db, "users", uid, "settings", "water");
    unsubscribeSettings = onSnapshot(settingsRef, (docSnap) => {
        if (docSnap.exists() && docSnap.data().dailyGoal) {
            dailyGoal = docSnap.data().dailyGoal;
        } else {
            dailyGoal = 2000; // default
        }
        document.getElementById("water-goal-text").textContent = dailyGoal;
        updateWaterUI();
    });

    // Logs listener (last 7 days)
    const logsRef = query(collection(db, "users", uid, "waterLogs"), orderBy("createdAt", "desc"));
    unsubscribeLogs = onSnapshot(logsRef, (snap) => {
        // Fetch all logs to filter locally (since we need last 7 days and today)
        // For a huge app we might want to query where createdAt > 7 days ago, but this is fine for now
        waterLogs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        updateWaterUI();
    });

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

    // Event Listener for Custom Add
    const customBtn = document.getElementById("water-custom-btn");
    if(customBtn) {
        customBtn.onclick = async () => {
            const val = prompt("Kaç ml su içtiniz?", "300");
            const amount = parseInt(val);
            if(val && !isNaN(amount) && amount > 0) {
                try {
                    await addDoc(collection(db, "users", uid, "waterLogs"), {
                        amount, type: "Custom", icon: "add", createdAt: serverTimestamp()
                    });
                } catch(err) {
                    console.error("Firestore test hatası:", err);
                    waterLogs.unshift({ amount, type: "Custom", icon: "add", createdAt: { toDate: () => new Date() } });
                    updateWaterUI();
                }
            }
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
            // Sort by time descending (newest first)
            // Sadece en yeni 3 log'u göster
            todaysLogs.slice(0, 3).forEach(log => {
                const timeStr = log.createdAt?.toDate ? log.createdAt.toDate().toLocaleTimeString("tr-TR", {hour: '2-digit', minute:'2-digit'}) : "";
                const div = document.createElement("div");
                div.className = "flex items-center justify-between p-4 border-b border-surface-container/50 last:border-0";
                div.innerHTML = `
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-secondary">
                            <span class="material-symbols-outlined" data-icon="${log.icon}" data-weight="regular">${escapeHtml(log.icon || 'local_drink')}</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="font-body-lg text-body-lg text-on-surface font-medium">${escapeHtml(log.type)}</span>
                            <span class="font-body-md text-body-md text-on-surface-variant text-sm">${timeStr}</span>
                        </div>
                    </div>
                    <span class="font-headline-sm text-headline-sm text-primary">+${log.amount}ml</span>
                `;
                logList.appendChild(div);
            });
        }
    }

    // 3. Weekly Chart Calculation
    const chartContainer = document.getElementById("water-chart-container");
    const avgText = document.getElementById("water-avg-text");
    if(chartContainer && avgText) {
        chartContainer.innerHTML = "";
        
        // Find past 7 days
        let total7Days = 0;
        const days = [];
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        
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

        // Fill amounts
        const oneWeekAgo = new Date();
        oneWeekAgo.setHours(0,0,0,0);
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 6);

        waterLogs.forEach(log => {
            if(!log.createdAt || !log.createdAt.toDate) return;
            const logDate = log.createdAt.toDate();
            if(logDate >= oneWeekAgo) {
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
            
            // Stylings based on whether it's today and whether goal is met
            let barClass = "bg-surface-variant group-hover:bg-primary-fixed";
            let textClass = "text-outline";
            
            if(day.isToday) {
                barClass = "bg-primary-container group-hover:bg-primary";
                textClass = "text-primary font-bold";
            }
            if(day.amount >= dailyGoal && !day.isToday) {
                barClass = "bg-primary group-hover:opacity-80";
            }

            div.innerHTML = `
                <div class="w-full flex justify-center h-32 items-end">
                    <div class="w-6 ${barClass} rounded-t-sm transition-all duration-300" style="height: ${percent}%;"></div>
                </div>
                <span class="font-label-sm text-label-sm ${textClass}">${day.name}</span>
            `;
            chartContainer.appendChild(div);
        });
    }

    // Call callback to update dashboard if needed
    if(callback) {
        callback({ currentAmount, dailyGoal });
    }
}
