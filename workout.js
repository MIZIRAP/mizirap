import { auth, db } from "./firebase-config.js";
import { formatDate, formatCurrency } from "./utils.js";
import { collection, doc, addDoc, setDoc, getDocs, getDoc, query, orderBy, limit, serverTimestamp, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { escapeHtml, handleFormSubmit } from "./utils.js";
import { registerListener } from "./listenerManager.js";

let currentUid = null;
let splits = [];
let activeSplitId = null;
let activeDayId = null;
let currentWorkoutLog = null; 
let lastWorkoutLog = null; 

let callback = null; 

let unsubSplits = null;
let unsubLogs = null;

export function initWorkout(uid, onChangeCallback) {
    currentUid = uid;
    callback = onChangeCallback;
    
    const splitsRef = collection(db, "users", uid, "splits");
    unsubSplits = registerListener(onSnapshot(splitsRef, (snap) => {
        splits = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        const savedSplit = localStorage.getItem(`miz_activeSplit_${uid}`);
        if(savedSplit && splits.find(s => s.id === savedSplit)) {
            activeSplitId = savedSplit;
        } else if(splits.length > 0) {
            activeSplitId = splits[0].id;
        } else {
            activeSplitId = null;
        }

        renderSplitView();
        
        if(callback) {
            const activeSplit = splits.find(s => s.id === activeSplitId);
            const activeSplitName = activeSplit ? activeSplit.name : "Yapılmadı";
            // We use the last known mappedLogs or empty array
            callback(window._miz_last_workout_logs || [], activeSplitName);
        }
    }));

    const logsRef = query(collection(db, "users", uid, "workout_logs"), orderBy("dateStr", "desc"));
    unsubLogs = registerListener(onSnapshot(logsRef, (snap) => {
        const allLogs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        const mappedLogs = allLogs.map(log => {
            const dateObj = new Date(log.dateStr);
            return {
                ...log,
                createdAt: log.createdAt || { toDate: () => dateObj }
            };
        });
        
        window._miz_last_workout_logs = mappedLogs;
        
        if(callback) {
            const activeSplit = splits.find(s => s.id === activeSplitId);
            const activeSplitName = activeSplit ? activeSplit.name : "Yapılmadı";
            callback(mappedLogs, activeSplitName);
        }
    }));

    setupEventListeners();
}

export function clearWorkout() {
    if(unsubSplits) unsubSplits();
    if(unsubLogs) unsubLogs();
    currentUid = null;
    splits = [];
    activeSplitId = null;
    activeDayId = null;
}

function setupEventListeners() {
    const saveSplitBtn = document.getElementById("save-split-btn");
    if (saveSplitBtn) saveSplitBtn.onclick = saveNewSplit;
    
    const addDayBtn = document.getElementById("add-day-btn");
    if (addDayBtn) addDayBtn.onclick = addDayToSplitForm;

    const closeSplitModalBtn = document.getElementById("close-split-modal-btn");
    if (closeSplitModalBtn) closeSplitModalBtn.onclick = closeSplitModal;
    
    const saveWorkoutBtn = document.getElementById("workout-save-btn");
    if (saveWorkoutBtn) saveWorkoutBtn.onclick = saveWorkoutSession;
}

function renderSplitView() {
    const splitSelector = document.getElementById("workout-split-selector");
    const splitName = document.getElementById("workout-split-name");
    const dayPills = document.getElementById("workout-day-pills");
    
    if (!activeSplitId || splits.length === 0) {
        if(splitName) splitName.textContent = "Split Bulunamadı";
        if(dayPills) dayPills.innerHTML = "";
        const c = document.getElementById("workout-exercises-container");
        if(c) {
            c.innerHTML = `
                <div class="text-center text-on-surface-variant mt-10">
                    <p>Henüz bir split profili oluşturmadınız.</p>
                    <button class="mt-4 bg-primary text-on-primary px-6 py-2 rounded-full font-label-md hover:opacity-90 transition-opacity" onclick="openSplitModal()">Yeni Split Oluştur</button>
                </div>
            `;
        }
        return;
    }
    
    const activeSplit = splits.find(s => s.id === activeSplitId);
    if(splitName) splitName.textContent = activeSplit.name;
    
    if(splitSelector) {
        splitSelector.onclick = () => {
            openSplitSelectionModal(); 
        };
    }
    
    if (dayPills) {
        dayPills.innerHTML = "";
        
        if (!activeDayId || !activeSplit.days.find(d => d.id === activeDayId)) {
            activeDayId = activeSplit.days[0].id; 
        }
        
        activeSplit.days.forEach(day => {
            const btn = document.createElement("button");
            const isActive = day.id === activeDayId;
            btn.className = isActive 
                ? "snap-start flex-shrink-0 bg-primary text-on-primary font-label-md text-label-md px-6 py-3 rounded-full transition-transform active:scale-95 shadow-sm"
                : "snap-start flex-shrink-0 bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest font-label-md text-label-md px-6 py-3 rounded-full transition-transform active:scale-95 shadow-sm";
            btn.textContent = day.name;
            btn.onclick = () => {
                activeDayId = day.id;
                renderSplitView(); 
            };
            dayPills.appendChild(btn);
        });
    }
    
    loadWorkoutDataForDay(activeSplitId, activeDayId);
}

window.openSplitModal = function() {
    const modal = document.getElementById("newSplitModal");
    const content = document.getElementById("newSplitModalContent");
    if(modal && content) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            content.classList.remove('translate-y-full');
        }, 10);
        
        document.getElementById("new-split-name").value = "";
        const daysContainer = document.getElementById("split-days-container");
        if(daysContainer) {
            daysContainer.innerHTML = "";
            addDayToSplitForm(); 
        }
    }
};

window.closeSplitModal = function() {
    const modal = document.getElementById("newSplitModal");
    const content = document.getElementById("newSplitModalContent");
    if(modal && content) {
        modal.classList.add('opacity-0');
        content.classList.add('translate-y-full');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }
};

let splitDayCounter = 0;
function addDayToSplitForm() {
    const container = document.getElementById("split-days-container");
    if (!container) return;
    
    splitDayCounter++;
    const dayId = `day-${splitDayCounter}`;
    
    const dayEl = document.createElement("div");
    dayEl.className = "bg-surface-container-lowest rounded-xl p-4 flex flex-col gap-3 shadow-sm border border-surface-variant/30 relative";
    dayEl.id = dayId;
    
    dayEl.innerHTML = `
        <button class="absolute top-2 right-2 text-on-surface-variant hover:text-error transition-colors" onclick="this.parentElement.remove()">
            <span class="material-symbols-outlined text-[20px]">delete</span>
        </button>
        <div class="flex flex-col gap-1 pr-8">
            <label class="font-label-sm text-label-sm text-on-surface-variant">Gün Adı</label>
            <input class="w-full bg-surface-container-low border border-transparent focus:border-primary/30 outline-none rounded-lg py-2 px-3 font-body-md text-on-surface" placeholder="Örn: İtiş" type="text" />
        </div>
        
        <div class="flex flex-col gap-2 mt-2">
            <div class="flex justify-between items-center">
                <label class="font-label-sm text-label-sm text-on-surface-variant">Hareketler (virgülle ayırın)</label>
            </div>
            <textarea class="w-full bg-surface-container-low border border-transparent focus:border-primary/30 outline-none rounded-lg py-2 px-3 font-body-md text-on-surface resize-none h-20" placeholder="Örn: Bench Press, Overhead Press"></textarea>
        </div>
    `;
    container.appendChild(dayEl);
}

async function saveNewSplit() {
    if(!currentUid) return;
    const nameInput = document.getElementById("new-split-name");
    const splitName = nameInput ? nameInput.value.trim() : "";
    
    if(!splitName) {
        alert("Lütfen split adı girin.");
        return;
    }
    
    const container = document.getElementById("split-days-container");
    const dayEls = container.querySelectorAll("div[id^='day-']");
    
    const days = [];
    dayEls.forEach((dayEl, index) => {
        const name = dayEl.querySelector("input").value.trim() || `Gün ${index+1}`;
        const exercisesStr = dayEl.querySelector("textarea").value;
        const exercises = exercisesStr.split(',').map(e => e.trim()).filter(e => e);
        
        days.push({
            id: `d${Date.now()}_${index}`,
            name,
            exercises: exercises.map((e, idx) => ({ id: `e${Date.now()}_${idx}`, name: e, defaultSets: 2 }))
        });
    });
    
    if(days.length === 0) {
        alert("En az bir gün eklemelisiniz.");
        return;
    }
    
    try {
        const splitRef = await addDoc(collection(db, "users", currentUid, "splits"), {
            name: splitName,
            days: days,
            createdAt: serverTimestamp()
        });
        
        localStorage.setItem(`miz_activeSplit_${currentUid}`, splitRef.id);
        activeSplitId = splitRef.id;
        window.closeSplitModal();
        
    } catch (e) {
        console.error(e);
        alert("Split kaydedilirken hata oluştu.");
    }
}

async function loadWorkoutDataForDay(splitId, dayId) {
    if(!splitId || !dayId) return;
    
    const split = splits.find(s => s.id === splitId);
    if(!split) return;
    const day = split.days.find(d => d.id === dayId);
    if(!day) return;

    const q = query(
        collection(db, "users", currentUid, "workout_logs"),
        where("splitId", "==", splitId),
        where("dayId", "==", dayId)
    );
    
    const snap = await getDocs(q);
    const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Sort by createdAt descending, fallback to dateStr
    logs.sort((a,b) => {
        const timeA = a.createdAt ? (a.createdAt.toMillis ? a.createdAt.toMillis() : a.createdAt) : new Date(a.dateStr).getTime();
        const timeB = b.createdAt ? (b.createdAt.toMillis ? b.createdAt.toMillis() : b.createdAt) : new Date(b.dateStr).getTime();
        return timeB - timeA;
    });
    
    // Always start fresh for "ertesi gün" behavior.
    // The most recently saved log is the "lastWorkoutLog" (Hedef).
    currentWorkoutLog = null;
    lastWorkoutLog = logs.length > 0 ? logs[0] : null;

    renderExercises(day, lastWorkoutLog, currentWorkoutLog);
}

function renderExercises(day, lastLog, currentLog) {
    const container = document.getElementById("workout-exercises-container");
    if(!container) return;
    container.innerHTML = "";
    
    const lastSessionDateEl = document.getElementById("workout-last-session-date");
    if(lastSessionDateEl) {
        if (lastLog) {
            const d = new Date(lastLog.dateStr);
            const formatted = formatDate(d, { day: 'numeric', month: 'long' });
            lastSessionDateEl.textContent = `Son ${day.name} günü: ${formatted}`;
        } else {
            lastSessionDateEl.textContent = "Daha önce kayıt yok";
        }
    }
    
    day.exercises.forEach(ex => {
        const lastSets = lastLog?.exercises ? (lastLog.exercises[ex.id] || []) : [];
        let currentSets = currentLog?.exercises ? (currentLog.exercises[ex.id] || []) : [];
        
        if(currentSets.length === 0) {
            if (lastSets.length > 0) {
                currentSets = JSON.parse(JSON.stringify(lastSets));
            } else {
                for(let i=0; i<ex.defaultSets; i++) currentSets.push({ weight: '', reps: '' });
            }
        }
        
        // Find best set from last session for header
        let bestLastSet = null;
        if(lastSets.length > 0) {
            bestLastSet = lastSets.reduce((prev, current) => {
                const pVol = (parseFloat(prev.weight)||0) * (parseInt(prev.reps)||0);
                const cVol = (parseFloat(current.weight)||0) * (parseInt(current.reps)||0);
                return (pVol > cVol) ? prev : current;
            });
        }
        
        const card = document.createElement("div");
        card.className = "bg-surface-container-lowest rounded-xl p-5 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] border-none exercise-card mb-4";
        card.dataset.exerciseId = ex.id;
        
        const targetText = bestLastSet && bestLastSet.weight && bestLastSet.reps 
            ? `Hedef: ${bestLastSet.weight}kg x ${bestLastSet.reps}` 
            : "Hedef: Belirlenmedi";
            
        // Calculate diff if current best set is available
        let bestCurrSet = null;
        if(currentSets.length > 0) {
            bestCurrSet = currentSets.reduce((prev, current) => {
                const pVol = (parseFloat(prev.weight)||0) * (parseInt(prev.reps)||0);
                const cVol = (parseFloat(current.weight)||0) * (parseInt(current.reps)||0);
                return (pVol > cVol) ? prev : current;
            });
        }
        
        let diffBadgeHTML = `<span class="bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm px-2 py-1 rounded">--</span>`;
        if (bestLastSet && bestCurrSet && bestLastSet.weight && bestCurrSet.weight) {
            const diff = parseFloat(bestCurrSet.weight) - parseFloat(bestLastSet.weight);
            if (diff > 0) {
                diffBadgeHTML = `<span class="bg-primary-container text-on-primary-container font-label-sm text-label-sm px-1 py-1 rounded inline-block min-w-[48px] text-center">+${diff} kg</span>`;
            } else if (diff < 0) {
                diffBadgeHTML = `<span class="bg-error-container text-on-error-container font-label-sm text-label-sm px-1 py-1 rounded inline-block min-w-[48px] text-center">${diff} kg</span>`;
            } else {
                diffBadgeHTML = `<span class="bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm px-1 py-1 rounded inline-block min-w-[48px] text-center">0.0 kg</span>`;
            }
        }
        
        const details = document.createElement("details");
        details.className = "group";
        // Do not open by default
        
        const summary = document.createElement("summary");
        summary.className = "flex justify-between items-center cursor-pointer list-none";
        summary.innerHTML = `
            <div class="flex flex-col">
                <h2 class="font-headline-sm text-headline-sm text-on-surface">${escapeHtml(ex.name)}</h2>
                <div class="flex items-center gap-1">
                    <span class="text-label-sm text-outline">${targetText}</span>
                    <button class="flex items-center justify-center p-1.5 ml-2 bg-surface-container rounded-lg hover:bg-surface-container-high transition-colors active:scale-95 text-primary" onclick="event.preventDefault(); event.stopPropagation(); openExerciseHistory('${ex.id}', '${escapeHtml(ex.name)}')">
                        <span class="material-symbols-outlined" style="font-size: 18px;">history</span>
                        <span class="text-[11px] font-bold ml-1 uppercase">Geçmiş</span>
                    </button>
                </div>
            </div>
            <div class="flex items-center gap-2">
                ${diffBadgeHTML}
                <span class="material-symbols-outlined text-outline group-open:rotate-180 transition-transform">expand_more</span>
            </div>
        `;
        
        const setsContainer = document.createElement("div");
        setsContainer.className = "flex flex-col gap-3 mt-4 transition-all duration-200 sets-container";
        
        const renderSetRows = () => {
            setsContainer.innerHTML = "";
            currentSets.forEach((set, index) => {
                const prevSet = lastSets[index];
                const prevText = prevSet && prevSet.weight && prevSet.reps 
                    ? `(Geçen: ${prevSet.weight}x${prevSet.reps})` 
                    : "(Geçen kayıt yok)";
                
                const setRow = document.createElement("div");
                setRow.className = "flex items-center gap-3 bg-surface-container-low p-3 rounded-xl border border-outline-variant/20 set-row";
                setRow.dataset.index = index;
                
                setRow.innerHTML = `
                    <div class="flex-1">
                        <div class="flex justify-between items-center mb-1">
                            <div class="text-label-sm text-outline">Set ${index + 1} ${prevText}</div>
                            <button class="text-error opacity-0 hover:opacity-100 transition-opacity p-1 text-[10px] uppercase font-bold tracking-widest delete-set-btn">SİL</button>
                        </div>
                        <div class="flex items-center gap-2">
                            <div class="flex items-center bg-surface-dim rounded-lg overflow-hidden flex-1">
                                <button class="p-2 hover:bg-surface-variant active:scale-95 minus-btn" data-type="weight"><span class="material-symbols-outlined text-sm">remove</span></button>
                                <input class="w-full bg-transparent border-none text-center font-medium p-0 focus:ring-0 weight-input" type="number" placeholder="Kg" value="${set.weight || ''}" step="2.5" />
                                <button class="p-2 hover:bg-surface-variant active:scale-95 plus-btn" data-type="weight"><span class="material-symbols-outlined text-sm">add</span></button>
                            </div>
                            <div class="text-outline">×</div>
                            <div class="flex items-center bg-surface-dim rounded-lg overflow-hidden flex-1">
                                <button class="p-2 hover:bg-surface-variant active:scale-95 minus-btn" data-type="reps"><span class="material-symbols-outlined text-sm">remove</span></button>
                                <input class="w-full bg-transparent border-none text-center font-medium p-0 focus:ring-0 reps-input" type="number" placeholder="Tekrar" value="${set.reps || ''}" step="1" />
                                <button class="p-2 hover:bg-surface-variant active:scale-95 plus-btn" data-type="reps"><span class="material-symbols-outlined text-sm">add</span></button>
                            </div>
                        </div>
                    </div>
                    <button class="w-12 h-12 rounded-full border-2 border-outline-variant text-outline flex items-center justify-center active:scale-90 transition-all check-btn"><span class="material-symbols-outlined">check</span></button>
                `;
                
                // Set hover effect to show delete btn
                setRow.onmouseenter = () => setRow.querySelector('.delete-set-btn').classList.remove('opacity-0');
                setRow.onmouseleave = () => setRow.querySelector('.delete-set-btn').classList.add('opacity-0');
                
                // Check btn logic
                const checkBtn = setRow.querySelector('.check-btn');
                const isDone = !!(set.weight && set.reps); // Simple auto-check if both are filled, or let user manually do it.
                // We'll let user manually do it or just visual.
                let done = false;
                checkBtn.onclick = () => {
                    done = !done;
                    if(done) {
                        checkBtn.className = "w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-sm active:scale-90 transition-all check-btn";
                        setRow.classList.remove('opacity-60');
                    } else {
                        checkBtn.className = "w-12 h-12 rounded-full border-2 border-outline-variant text-outline flex items-center justify-center active:scale-90 transition-all check-btn";
                        setRow.classList.add('opacity-60');
                    }
                };
                
                // Initially visually mark as not done (opacity-60) unless they click check
                // Or maybe don't make it opacity-60 by default. Let's just make check toggle green.
                
                // Delete set logic
                setRow.querySelector('.delete-set-btn').onclick = () => {
                    currentSets.splice(index, 1);
                    renderSetRows(); // Re-render sets
                };
                
                // Plus/Minus logic
                const inputs = {
                    weight: setRow.querySelector('.weight-input'),
                    reps: setRow.querySelector('.reps-input')
                };
                
                setRow.querySelectorAll('.minus-btn, .plus-btn').forEach(btn => {
                    btn.onclick = (e) => {
                        const type = e.currentTarget.dataset.type;
                        const input = inputs[type];
                        const step = parseFloat(input.step) || 1;
                        let val = parseFloat(input.value) || 0;
                        if(e.currentTarget.classList.contains('plus-btn')) {
                            val += step;
                        } else {
                            val = Math.max(0, val - step);
                        }
                        input.value = val;
                        // update currentSets array so it persists re-renders
                        currentSets[index][type] = val;
                        // We do not re-render the whole row here, just update value so cursor isn't lost
                    };
                });
                
                // Input listeners to sync currentSets
                inputs.weight.oninput = (e) => { currentSets[index].weight = e.target.value; };
                inputs.reps.oninput = (e) => { currentSets[index].reps = e.target.value; };
                
                setsContainer.appendChild(setRow);
            });
            
            // Add Set Button
            const addSetBtn = document.createElement("button");
            addSetBtn.className = "w-full mt-2 py-3 bg-surface-container-high text-primary rounded-xl flex items-center justify-center gap-2 hover:bg-surface-variant transition-colors active:scale-98";
            addSetBtn.innerHTML = `
                <span class="material-symbols-outlined">add_circle</span>
                <span class="font-label-md">Set Ekle</span>
            `;
            addSetBtn.onclick = () => {
                currentSets.push({ weight: '', reps: '' });
                renderSetRows();
            };
            setsContainer.appendChild(addSetBtn);
        };
        
        renderSetRows();
        
        details.appendChild(summary);
        details.appendChild(setsContainer);
        card.appendChild(details);
        container.appendChild(card);
    });
}

async function saveWorkoutSession() {
    if(!currentUid || !activeSplitId || !activeDayId) return;
    
    const todayStr = new Date().toLocaleDateString('en-CA');
    const exercisesData = {};
    
    const cards = document.querySelectorAll(".exercise-card");
    cards.forEach(card => {
        const exId = card.dataset.exerciseId;
        const setRows = card.querySelectorAll(".set-row");
        const sets = [];
        setRows.forEach(row => {
            const w = parseFloat(row.querySelector(".weight-input").value);
            const r = parseInt(row.querySelector(".reps-input").value);
            if (!isNaN(w) && !isNaN(r)) {
                sets.push({ weight: w, reps: r });
            }
        });
        if(sets.length > 0) exercisesData[exId] = sets;
    });
    
    if (Object.keys(exercisesData).length === 0) {
        alert("En az bir set verisi girmelisiniz.");
        return;
    }
    
    const logData = {
        splitId: activeSplitId,
        dayId: activeDayId,
        dateStr: todayStr,
        exercises: exercisesData,
        createdAt: serverTimestamp() 
    };
    
    try {
        const saveBtn = document.getElementById("workout-save-btn");
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = "Kaydediliyor...";
        saveBtn.disabled = true;
        
        // Always update or create a log for this specific split, day, and date
        logData.completed = true;
        const docId = `${activeSplitId}_${activeDayId}_${todayStr}`;
        await setDoc(doc(db, "users", currentUid, "workout_logs", docId), logData);
        currentWorkoutLog = { id: docId, ...logData };
        
        saveBtn.innerHTML = `<span class="material-symbols-outlined">check_circle</span> Kaydedildi!`;
        saveBtn.classList.add("bg-primary-container", "text-on-primary-container");
        
        setTimeout(() => {
            saveBtn.innerHTML = originalText;
            saveBtn.classList.remove("bg-primary-container", "text-on-primary-container");
            saveBtn.disabled = false;
            
            // RESET STATE
            activeDayId = null;
            currentWorkoutLog = null;
            renderSplitView(); 
            window.scrollTo(0,0);
        }, 1500);
        
    } catch (e) {
        console.error("Save error:", e);
        alert("Kaydetme sırasında bir hata oluştu.");
    }
}

// ==========================================
// EXERCISE HISTORY
// ==========================================

window.openExerciseHistory = async function(exId, exName) {
    const modal = document.getElementById("exerciseHistoryModal");
    const content = document.getElementById("exerciseHistoryModalContent");
    const title = document.getElementById("history-modal-title");
    const list = document.getElementById("history-modal-list");
    
    if(!modal || !content || !list || !title) return;
    
    title.textContent = `${exName} Geçmişi`;
    list.innerHTML = `<div class="w-full text-center py-10"><span class="material-symbols-outlined animate-spin text-primary">sync</span></div>`;
    
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        content.classList.remove('translate-y-full');
    }, 10);
    
    try {
        const q = query(
            collection(db, "users", currentUid, "workout_logs"),
            where("splitId", "==", activeSplitId),
            where("dayId", "==", activeDayId)
        );
        const snap = await getDocs(q);
        const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        logs.sort((a,b) => new Date(b.dateStr) - new Date(a.dateStr)); // Descending chronological
        
        // Filter to only those where this exercise was performed
        const exLogs = logs.filter(log => log.exercises && log.exercises[exId] && log.exercises[exId].length > 0);
        
        list.innerHTML = "";
        
        if (exLogs.length === 0) {
            list.innerHTML = `<p class="text-on-surface-variant text-center mt-6">Daha önce kaydedilmiş veri yok.</p>`;
            return;
        }
        
        exLogs.forEach(log => {
            const d = new Date(log.dateStr);
            const formatted = formatDate(d, { day: 'numeric', month: 'long', year: 'numeric' });
            
            const sets = log.exercises[exId];
            let setsHtml = '';
            
            sets.forEach((set, i) => {
                setsHtml += `
                <div class="flex justify-between items-center py-1 border-b border-surface-variant/30 last:border-0">
                    <span class="font-body-md text-on-surface-variant">Set ${i+1}</span>
                    <span class="font-body-md text-on-surface font-medium">${set.weight} kg x ${set.reps}</span>
                </div>`;
            });
            
            const card = document.createElement("div");
            card.className = "bg-surface-container-lowest rounded-xl p-4 flex flex-col gap-2 shadow-[0px_4px_16px_rgba(0,0,0,0.03)]";
            card.innerHTML = `
                <div class="font-label-md text-primary mb-2">${formatted}</div>
                ${setsHtml}
            `;
            list.appendChild(card);
        });
        
    } catch(e) {
        console.error("History fetch error:", e);
        list.innerHTML = `<p class="text-error text-center mt-6">Geçmiş yüklenirken hata oluştu.</p>`;
    }
};

window.closeHistoryModal = function() {
    const modal = document.getElementById("exerciseHistoryModal");
    const content = document.getElementById("exerciseHistoryModalContent");
    if(modal && content) {
        modal.classList.add('opacity-0');
        content.classList.add('translate-y-full');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }
};

// ==========================================
// EDIT TEMPLATE VIEW
// ==========================================

let editingExercises = [];

window.openEditTemplateView = function() {
    if (!activeSplitId || !activeDayId) return;
    const split = splits.find(s => s.id === activeSplitId);
    if (!split) return;
    const day = split.days.find(d => d.id === activeDayId);
    if (!day) return;

    // Set Header Info
    const splitNameEl = document.getElementById("edit-template-split-name");
    const dayNameEl = document.getElementById("edit-template-day-name");
    if (splitNameEl) splitNameEl.textContent = `Split Profili: ${split.name}`;
    if (dayNameEl) dayNameEl.textContent = `${day.name} Günü Şablonu`;

    // Copy current day's exercises to local editing array
    editingExercises = JSON.parse(JSON.stringify(day.exercises));

    renderEditTemplateList();

    // Switch View
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    document.getElementById("view-edit-workout-template").classList.remove("hidden");
    
    // Hide BottomNavBar for this transactional screen
    const navBar = document.getElementById("bottom-nav");
    if(navBar) navBar.style.display = "none";
};

function renderEditTemplateList() {
    const listEl = document.getElementById("edit-template-exercise-list");
    if (!listEl) return;
    
    listEl.innerHTML = "";
    
    editingExercises.forEach((ex, index) => {
        const item = document.createElement("div");
        item.className = "exercise-item bg-surface-container-lowest rounded-xl p-4 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] flex items-center gap-4 group";
        item.dataset.index = index;
        
        item.innerHTML = `
            <span class="material-symbols-outlined text-outline-variant drag-handle">drag_handle</span>
            <div class="flex-1">
                <h3 class="font-body-lg text-body-lg font-medium text-on-surface">${escapeHtml(ex.name)}</h3>
                <p class="font-label-sm text-label-sm text-on-surface-variant">Genel • ${ex.defaultSets || 3} Set</p>
            </div>
            <button class="text-error opacity-70 hover:opacity-100 transition-opacity p-2 delete-btn">
                <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">delete</span>
            </button>
        `;
        
        item.querySelector(".delete-btn").onclick = () => {
            editingExercises.splice(index, 1);
            renderEditTemplateList();
        };
        
        listEl.appendChild(item);
    });
    
    // Init SortableJS
    if (window.Sortable && !listEl.sortableInstance) {
        listEl.sortableInstance = new Sortable(listEl, {
            handle: '.drag-handle',
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: function (evt) {
                const itemEl = editingExercises.splice(evt.oldIndex, 1)[0];
                editingExercises.splice(evt.newIndex, 0, itemEl);
            },
        });
    } else if (listEl.sortableInstance) {
        // Just keep the existing instance, it automatically works with DOM updates as long as we re-render or sync.
        // Wait, if we completely re-render, we might need to destroy and re-create.
        listEl.sortableInstance.destroy();
        listEl.sortableInstance = new Sortable(listEl, {
            handle: '.drag-handle',
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: function (evt) {
                const itemEl = editingExercises.splice(evt.oldIndex, 1)[0];
                editingExercises.splice(evt.newIndex, 0, itemEl);
            },
        });
    }
}

// Add New Exercise
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const addBtn = document.getElementById("edit-template-add-ex-btn");
        const addInput = document.getElementById("edit-template-new-ex-input");
        if(addBtn && addInput) {
            addBtn.onclick = () => {
                const name = addInput.value.trim();
                if(!name) return;
                editingExercises.push({
                    id: `e${Date.now()}`,
                    name: name,
                    defaultSets: 3
                });
                addInput.value = "";
                renderEditTemplateList();
            };
            addInput.addEventListener('keypress', (e) => {
                if(e.key === 'Enter') addBtn.click();
            });
        }
        
        // Back Btn
        const backBtn = document.getElementById("edit-template-back-btn");
        if(backBtn) {
            backBtn.onclick = () => {
                closeEditTemplateView();
            };
        }
        
        // Save Btn
        const saveBtn = document.getElementById("edit-template-save-btn");
        if(saveBtn) {
            saveBtn.onclick = async () => {
                if (!activeSplitId || !activeDayId) return;
                const split = splits.find(s => s.id === activeSplitId);
                if (!split) return;
                
                const dayIndex = split.days.findIndex(d => d.id === activeDayId);
                if (dayIndex === -1) return;
                
                // Update local split object
                const updatedSplit = JSON.parse(JSON.stringify(split));
                updatedSplit.days[dayIndex].exercises = editingExercises;
                
                try {
                    saveBtn.style.opacity = '0.5';
                    saveBtn.disabled = true;
                    
                    await setDoc(doc(db, "users", currentUid, "splits", activeSplitId), updatedSplit);
                    
                    saveBtn.style.opacity = '1';
                    saveBtn.disabled = false;
                    closeEditTemplateView();
                    
                } catch(e) {
                    console.error("Error updating template:", e);
                    alert("Şablon kaydedilirken hata oluştu.");
                    saveBtn.style.opacity = '1';
                    saveBtn.disabled = false;
                }
            };
        }
    }, 1000); // Give time for DOM parsing just in case since this is appended
});

function closeEditTemplateView() {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    document.getElementById("view-workout").classList.remove("hidden");
    
    // Show BottomNavBar again
    const navBar = document.getElementById("bottom-nav");
    if(navBar) navBar.style.display = "flex";
}

// ==========================================
// SPLIT SELECTION MODAL
// ==========================================

window.openSplitSelectionModal = function() {
    const modal = document.getElementById("splitSelectionModal");
    const content = document.getElementById("splitSelectionModalContent");
    const list = document.getElementById("split-selection-list");
    
    if(!modal || !content || !list) return;
    
    list.innerHTML = "";
    
    if (splits.length === 0) {
        list.innerHTML = `<p class="text-on-surface-variant text-center mt-6">Kayıtlı split yok.</p>`;
    } else {
        splits.forEach(split => {
            const isActive = split.id === activeSplitId;
            const btn = document.createElement("button");
            
            if (isActive) {
                btn.className = "w-full text-left bg-surface-container-low border-2 border-primary rounded-xl p-4 flex items-center justify-between group transition-transform active:scale-[0.98] relative overflow-hidden shadow-[0px_4px_20px_rgba(0,0,0,0.04)]";
                btn.innerHTML = `
                    <div class="flex flex-col gap-1 z-10">
                        <span class="font-body-lg text-body-lg text-on-background font-medium">${escapeHtml(split.name)}</span>
                        <span class="font-label-md text-label-md text-primary">Aktif Program</span>
                    </div>
                    <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center z-10">
                        <span class="material-symbols-outlined text-on-primary text-[20px] font-bold">check</span>
                    </div>
                    <div class="absolute inset-0 bg-primary/5 pointer-events-none"></div>
                `;
            } else {
                btn.className = "w-full text-left bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex items-center justify-between hover:bg-surface-container-low transition-colors active:scale-[0.98] shadow-sm";
                
                // For subtitle, we could show creation date if available
                let subTitle = "Kayıtlı Program";
                if (split.createdAt && split.createdAt.toDate) {
                    const d = split.createdAt.toDate();
                    subTitle = `Eklenme: ${formatDate(d)}`;
                }
                
                btn.innerHTML = `
                    <div class="flex flex-col gap-1">
                        <span class="font-body-lg text-body-lg text-on-background">${escapeHtml(split.name)}</span>
                        <span class="font-label-md text-label-md text-on-surface-variant">${subTitle}</span>
                    </div>
                `;
                
                btn.onclick = () => {
                    activeSplitId = split.id;
                    localStorage.setItem(`miz_activeSplit_${currentUid}`, split.id);
                    // activeDayId will be reset/fixed automatically in renderSplitView
                    activeDayId = null; 
                    renderSplitView();
                    closeSplitSelectionModal();
                };
            }
            list.appendChild(btn);
        });
    }
    
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        content.classList.remove('translate-y-full');
    }, 10);
};

window.closeSplitSelectionModal = function() {
    const modal = document.getElementById("splitSelectionModal");
    const content = document.getElementById("splitSelectionModalContent");
    if(modal && content) {
        modal.classList.add('opacity-0');
        content.classList.add('translate-y-full');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }
};


// ==========================================
// EXERCISE HISTORY VIEW
// ==========================================

function switchView(viewId) {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    const target = document.getElementById("view-" + viewId);
    if(target) target.classList.remove("hidden");
}

window.closeExerciseHistory = function() {

    switchView('workout');
    renderSplitView(); 
};

window.openExerciseHistory = async function(triggerExId, exName) {
    if(!currentUid) return;
    
    // Switch view
    switchView('exercise-history');
    
    // Setup UI loading state
    const titleEl = document.getElementById("history-title");
    const maxWeightEl = document.getElementById("history-max-weight");
    const trendBadgeEl = document.getElementById("history-trend-badge");
    const chartContainer = document.getElementById("history-chart-container");
    const listContainer = document.getElementById("history-list-container");
    
    titleEl.textContent = `${exName} Geçmişi`;
    maxWeightEl.textContent = "...";
    trendBadgeEl.innerHTML = ``;
    chartContainer.innerHTML = `<div class="absolute inset-0 flex items-center justify-center text-outline text-sm">Yükleniyor...</div>`;
    listContainer.innerHTML = `<div class="text-center text-outline text-sm py-4">Veriler getiriliyor...</div>`;
    
    // 1. Gather all exercise IDs that match the target name (case-insensitive) across all splits
    const targetNameLower = exName.toLowerCase().trim();
    const targetIds = new Set();
    
    splits.forEach(s => {
        s.days.forEach(d => {
            d.exercises.forEach(e => {
                if(e.name.toLowerCase().trim() === targetNameLower) {
                    targetIds.add(e.id);
                }
            });
        });
    });
    
    // 2. Fetch all workout logs for this user, ordered by date descending
    try {
        const q = query(
            collection(db, "users", currentUid, "workout_logs"),
            orderBy("dateStr", "desc") // Fetching all and filtering in memory, limits could be applied if >1000 logs, but ok for now
        );
        const snap = await getDocs(q);
        
        let historyRecords = []; // Array to store matching logs
        let overallMaxWeight = 0;
        
        snap.forEach(docSnap => {
            const logData = docSnap.data();
            const exData = logData.exercises || {};
            
            // Check if this log contains ANY of the target IDs
            let matchedSets = null;
            let matchedExId = null;
            for(let id of targetIds) {
                if(exData[id]) {
                    matchedSets = exData[id];
                    matchedExId = id;
                    break;
                }
            }
            
            if(matchedSets && matchedSets.length > 0) {
                // Calculate max weight and volume for this session
                let sessionMaxW = 0;
                let sessionTotalSets = matchedSets.length;
                let sessionTotalReps = 0;
                let bestSet = null;
                
                matchedSets.forEach(s => {
                    const w = parseFloat(s.weight) || 0;
                    const r = parseInt(s.reps) || 0;
                    sessionTotalReps += r;
                    if(w > sessionMaxW) sessionMaxW = w;
                    
                    if(!bestSet || w > parseFloat(bestSet.weight)) {
                        bestSet = s;
                    } else if (w === parseFloat(bestSet.weight) && r > parseInt(bestSet.reps)) {
                        bestSet = s;
                    }
                });
                
                if(sessionMaxW > overallMaxWeight) overallMaxWeight = sessionMaxW;
                
                historyRecords.push({
                    dateStr: logData.dateStr, // YYYY-MM-DD
                    maxWeight: sessionMaxW,
                    sets: matchedSets,
                    bestSet: bestSet,
                    totalSets: sessionTotalSets,
                    totalReps: sessionTotalReps
                });
            }
        });
        
        // 3. Process Data for UI
        if(historyRecords.length === 0) {
            maxWeightEl.textContent = "0.0 kg";
            chartContainer.innerHTML = `<div class="absolute inset-0 flex items-center justify-center text-outline text-sm">Veri bulunamadı.</div>`;
            listContainer.innerHTML = `<div class="text-center text-outline text-sm py-4">Henüz bu hareket için geçmiş kayıt yok.</div>`;
            return;
        }
        
        maxWeightEl.textContent = `${overallMaxWeight.toFixed(1)} kg`;
        
        // Trend calculation (compare most recent with the one before it, or oldest in this month)
        // Let's just compare the latest record's max weight with the second latest
        if(historyRecords.length >= 2) {
            const diff = historyRecords[0].maxWeight - historyRecords[1].maxWeight;
            if(diff > 0) {
                trendBadgeEl.innerHTML = `
                    <span class="material-symbols-outlined text-primary text-[14px]" data-icon="trending_up">trending_up</span>
                    <span class="font-label-sm text-label-sm text-primary inline-block min-w-[48px] text-right">+${diff.toFixed(1)} kg</span>
                `;
                trendBadgeEl.className = "bg-primary-container bg-opacity-20 rounded-full px-3 py-1 flex items-center gap-1";
            } else if (diff < 0) {
                trendBadgeEl.innerHTML = `
                    <span class="material-symbols-outlined text-error text-[14px]" data-icon="trending_down">trending_down</span>
                    <span class="font-label-sm text-label-sm text-error inline-block min-w-[48px] text-right">${diff.toFixed(1)} kg</span>
                `;
                trendBadgeEl.className = "bg-error-container bg-opacity-20 rounded-full px-3 py-1 flex items-center gap-1";
            } else {
                trendBadgeEl.innerHTML = `
                    <span class="material-symbols-outlined text-outline text-[14px]" data-icon="trending_flat">trending_flat</span>
                    <span class="font-label-sm text-label-sm text-outline">Değişim Yok</span>
                `;
                trendBadgeEl.className = "bg-surface-variant bg-opacity-50 rounded-full px-3 py-1 flex items-center gap-1";
            }
        } else {
             trendBadgeEl.innerHTML = `
                <span class="material-symbols-outlined text-primary text-[14px]" data-icon="fiber_new">fiber_new</span>
                <span class="font-label-sm text-label-sm text-primary">İlk Kayıt</span>
            `;
             trendBadgeEl.className = "bg-primary-container bg-opacity-20 rounded-full px-3 py-1 flex items-center gap-1";
        }
        
        // Render List (Only last 3)
        listContainer.innerHTML = "";
        const recordsToDisplay = historyRecords.slice(0, 3);
        
        recordsToDisplay.forEach((rec, idx) => {
            const dateObj = new Date(rec.dateStr);
            const dateFormatted = formatDate(dateObj, { day: 'numeric', month: 'long', year: 'numeric' });
            
            // Format best set like "4 x 8 x 85.0 kg" -> actually users want "Sets x Reps x Kg". 
            // In the UI mockup it is "4 x 8 x 85.0 kg". Let's show "Total Sets x Best Reps x Best Kg" or just "Best Set"
            // We'll show "Total Sets x BestReps x BestWeight kg"
            const bestW = rec.bestSet ? parseFloat(rec.bestSet.weight).toFixed(1) : 0;
            const bestR = rec.bestSet ? parseInt(rec.bestSet.reps) : 0;
            
            let diffBadge = `<div class="text-on-surface-variant font-label-md text-label-md px-2 py-1">-</div>`;
            if (idx < historyRecords.length - 1) {
                const prevRec = historyRecords[idx+1];
                const diff = rec.maxWeight - prevRec.maxWeight;
                if(diff > 0) {
                    diffBadge = `<div class="bg-primary-container bg-opacity-10 text-primary font-label-md text-label-md px-1 py-1 rounded inline-block min-w-[56px] text-center">+${diff.toFixed(1)} kg</div>`;
                } else if(diff < 0) {
                    diffBadge = `<div class="bg-error-container bg-opacity-10 text-error font-label-md text-label-md px-1 py-1 rounded inline-block min-w-[56px] text-center">${diff.toFixed(1)} kg</div>`;
                }
            }
            
            // Opacity for older items
            const opacityClass = idx === 0 ? "opacity-100" : (idx === 1 ? "opacity-90" : "opacity-80");
            
            listContainer.innerHTML += `
                <div class="bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] p-4 flex items-center justify-between interactive-card cursor-pointer ${opacityClass}">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-${idx===0 ? 'primary' : 'secondary'}">
                            <span class="material-symbols-outlined" data-icon="calendar_today" ${idx===0 ? "style=\"font-variation-settings: 'FILL' 1;\"" : ""}>calendar_today</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="font-label-sm text-label-sm text-on-surface-variant">${dateFormatted}</span>
                            <span class="font-body-md text-body-md font-medium text-on-background">${rec.totalSets} set (Max: ${bestR} x ${bestW}kg)</span>
                        </div>
                    </div>
                    ${diffBadge}
                </div>
            `;
        });
        
        // Render Chart
        // We take up to 5 points for the chart to make it look nice (ascending order for left-to-right)
        const chartData = historyRecords.slice(0, 5).reverse();
        if(chartData.length < 2) {
             chartContainer.innerHTML = `<div class="absolute inset-0 flex items-center justify-center text-outline text-sm">Grafik için yeterli veri yok.</div>`;
        } else {
            // Find Min and Max
            const weights = chartData.map(d => d.maxWeight);
            const maxW = Math.max(...weights);
            const minW = Math.max(0, Math.min(...weights) - 5); // padding below
            const range = maxW - minW || 1; // avoid div by 0
            
            // Y Axis Labels
            const yLabels = `
                <div class="absolute left-0 top-0 h-full flex flex-col justify-between text-[10px] text-outline font-label-sm pb-6 pr-2">
                    <span>${Math.round(maxW)}k</span>
                    <span>${Math.round(maxW - range*0.33)}k</span>
                    <span>${Math.round(maxW - range*0.66)}k</span>
                    <span>${Math.round(minW)}k</span>
                </div>
            `;
            
            const gridLines = `
                <div class="absolute inset-0 ml-6 mb-6 flex flex-col justify-between z-0">
                    <div class="w-full border-t border-surface-variant"></div>
                    <div class="w-full border-t border-surface-variant"></div>
                    <div class="w-full border-t border-surface-variant"></div>
                    <div class="w-full border-t border-surface-variant"></div>
                </div>
            `;
            
            let pathD = "";
            let pointsHtml = "";
            let xLabelsHtml = "";
            
            const width = 100; // SVG viewBox 0-100
            const height = 100;
            
            chartData.forEach((d, i) => {
                const x = 5 + (i * (90 / (chartData.length - 1))); // spread 5 to 95
                const y = 100 - (((d.maxWeight - minW) / range) * 80 + 10); // 10 to 90
                
                if(i === 0) pathD += `M ${x},${y} `;
                else pathD += `L ${x},${y} `;
                
                pointsHtml += `<div class="w-2 h-2 rounded-full bg-primary border-2 border-surface-container-lowest absolute bottom-[${100-y}%] left-[${x}%] transform -translate-x-1/2 translate-y-1/2"></div>`;
                
                const dObj = new Date(d.dateStr);
                const shortDate = formatDate(dObj, { day: 'numeric', month: 'short' });
                xLabelsHtml += `<span>${shortDate}</span>`;
            });
            
            const chartHtml = `
                ${yLabels}
                ${gridLines}
                <div class="relative w-full ml-6 mb-6 h-full z-10 flex items-end justify-between px-2">
                    <svg class="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                        <path d="${pathD}" fill="none" stroke="#446554" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
                    </svg>
                    ${pointsHtml}
                </div>
                <div class="absolute bottom-0 left-6 right-0 flex justify-between text-[10px] text-outline font-label-sm px-2">
                    ${xLabelsHtml}
                </div>
            `;
            
            chartContainer.innerHTML = chartHtml;
        }

    } catch (e) {
        console.error("Error loading history:", e);
        listContainer.innerHTML = `<div class="text-center text-error text-sm py-4">Veriler getirilirken bir hata oluştu.</div>`;
    }
};

