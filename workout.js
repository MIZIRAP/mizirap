import { auth, db } from "./firebase-config.js";
import { collection, doc, addDoc, setDoc, getDocs, getDoc, query, orderBy, limit, serverTimestamp, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { escapeHtml } from "./utils.js";

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
    unsubSplits = onSnapshot(splitsRef, (snap) => {
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
    });

    const logsRef = query(collection(db, "users", uid, "workout_logs"), orderBy("dateStr", "desc"));
    unsubLogs = onSnapshot(logsRef, (snap) => {
        const allLogs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        const mappedLogs = allLogs.map(log => {
            const dateObj = new Date(log.dateStr);
            return {
                ...log,
                createdAt: log.createdAt || { toDate: () => dateObj }
            };
        });
        
        if(callback) callback(mappedLogs);
    });

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
    logs.sort((a,b) => new Date(b.dateStr) - new Date(a.dateStr));
    
    const todayStr = new Date().toLocaleDateString('en-CA'); 
    
    currentWorkoutLog = null;
    lastWorkoutLog = null;
    
    for (const log of logs) {
        if (log.dateStr === todayStr) {
            currentWorkoutLog = log;
        } else if (!lastWorkoutLog) {
            lastWorkoutLog = log;
        }
        if (currentWorkoutLog && lastWorkoutLog) break;
    }

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
            const formatted = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
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
        
        const card = document.createElement("div");
        card.className = "bg-surface-container-lowest rounded-xl p-5 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] border-none exercise-card";
        card.dataset.exerciseId = ex.id;
        
        const header = document.createElement("div");
        header.className = "flex flex-col gap-2 mb-4";
        header.innerHTML = `
            <div class="flex justify-between items-center w-full">
                <div class="flex items-center gap-2">
                    <h2 class="font-headline-sm text-headline-sm text-on-surface">${escapeHtml(ex.name)}</h2>
                    <button class="flex items-center justify-center p-1 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant active:scale-95" onclick="openExerciseHistory('${ex.id}', '${escapeHtml(ex.name)}')">
                        <span class="material-symbols-outlined" style="font-size: 18px;">history</span>
                    </button>
                </div>
                <span class="diff-badge bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm px-2 py-1 rounded">--</span>
            </div>
        `;
        
        const grid = document.createElement("div");
        grid.className = "grid grid-cols-2 gap-4";
        
        const prevCol = document.createElement("div");
        prevCol.className = "flex flex-col gap-unit";
        let lastDateLabel = "Kayıt Yok";
        if(lastLog) {
            const d = new Date(lastLog.dateStr);
            lastDateLabel = `Geçen ${day.name} (${d.toLocaleDateString('tr-TR', {day:'numeric', month:'short'})})`;
        }
        prevCol.innerHTML = `<span class="font-label-md text-label-md text-outline">${lastDateLabel}</span>`;
        
        lastSets.forEach((set, i) => {
            prevCol.innerHTML += `
            <div class="bg-surface-container rounded-lg p-3 flex justify-between items-center opacity-80 h-[48px]">
                <span class="font-body-md text-body-md text-on-surface-variant">Set ${i+1}</span>
                <span class="font-body-md text-body-md text-on-surface-variant font-medium">${set.weight} kg x ${set.reps}</span>
            </div>`;
        });
        
        const currCol = document.createElement("div");
        currCol.className = "flex flex-col gap-unit current-sets-container";
        currCol.innerHTML = `<span class="font-label-md text-label-md text-primary">Bugün</span>`;
        
        currentSets.forEach((set) => {
            currCol.appendChild(createSetInput(set.weight, set.reps, () => calculateDiff(card, lastSets)));
        });
        
        grid.appendChild(prevCol);
        grid.appendChild(currCol);
        
        const addSetBtn = document.createElement("button");
        addSetBtn.className = "w-full mt-4 py-2 border border-dashed border-outline-variant text-outline rounded-lg flex items-center justify-center gap-2 hover:bg-surface-container-low transition-colors";
        addSetBtn.innerHTML = `
            <span class="material-symbols-outlined text-sm" style="font-size: 16px;">add</span>
            <span class="font-label-md text-label-md">Set Ekle</span>
        `;
        addSetBtn.onclick = () => {
            currCol.appendChild(createSetInput('', '', () => calculateDiff(card, lastSets)));
            calculateDiff(card, lastSets);
        };
        
        card.appendChild(header);
        card.appendChild(grid);
        card.appendChild(addSetBtn);
        container.appendChild(card);
        
        calculateDiff(card, lastSets);
    });
}

function createSetInput(weight, reps, onChange) {
    const div = document.createElement("div");
    div.className = "flex gap-2 h-[48px] set-row";
    
    const wInput = document.createElement("input");
    wInput.className = "w-full bg-surface-dim border-none rounded-lg p-3 font-body-md text-body-md text-on-surface focus:ring-2 focus:ring-primary text-center weight-input";
    wInput.placeholder = "Kg";
    wInput.type = "number";
    if (weight !== undefined && weight !== '') wInput.value = weight;
    
    const rInput = document.createElement("input");
    rInput.className = "w-full bg-surface-dim border-none rounded-lg p-3 font-body-md text-body-md text-on-surface focus:ring-2 focus:ring-primary text-center reps-input";
    rInput.placeholder = "Tekrar";
    rInput.type = "number";
    if (reps !== undefined && reps !== '') rInput.value = reps;
    
    wInput.addEventListener('input', onChange);
    rInput.addEventListener('input', onChange);
    
    div.appendChild(wInput);
    div.appendChild(rInput);
    return div;
}

function calculateDiff(card, lastSets) {
    const badge = card.querySelector(".diff-badge");
    const setRows = card.querySelectorAll(".set-row");
    
    let currentVol = 0;
    let validCurrentSets = 0;
    setRows.forEach(row => {
        const w = parseFloat(row.querySelector(".weight-input").value) || 0;
        const r = parseInt(row.querySelector(".reps-input").value) || 0;
        if(w > 0 && r > 0) {
            currentVol += (w * r);
            validCurrentSets++;
        }
    });
    
    let lastVol = 0;
    lastSets.forEach(set => {
        lastVol += (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0);
    });
    
    if (validCurrentSets === 0 || lastSets.length === 0) {
        badge.className = "diff-badge bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm px-2 py-1 rounded";
        badge.textContent = "--";
        return;
    }
    
    const diff = currentVol - lastVol;
    if (diff > 0) {
        badge.className = "diff-badge bg-primary-container text-on-primary-container font-label-sm text-label-sm px-2 py-1 rounded";
        badge.textContent = `+${diff.toFixed(1)} vol`;
    } else if (diff < 0) {
        badge.className = "diff-badge bg-error-container text-on-error-container font-label-sm text-label-sm px-2 py-1 rounded";
        badge.textContent = `${diff.toFixed(1)} vol`;
    } else {
        badge.className = "diff-badge bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm px-2 py-1 rounded";
        badge.textContent = "=";
    }
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
        
        if (currentWorkoutLog) {
            await setDoc(doc(db, "users", currentUid, "workout_logs", currentWorkoutLog.id), logData, { merge: true });
        } else {
            const newDoc = await addDoc(collection(db, "users", currentUid, "workout_logs"), logData);
            currentWorkoutLog = { id: newDoc.id, ...logData };
        }
        
        saveBtn.innerHTML = `<span class="material-symbols-outlined">check_circle</span> Kaydedildi!`;
        saveBtn.classList.add("bg-primary-container", "text-on-primary-container");
        setTimeout(() => {
            saveBtn.innerHTML = originalText;
            saveBtn.classList.remove("bg-primary-container", "text-on-primary-container");
            saveBtn.disabled = false;
        }, 2000);
        
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
            const formatted = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
            
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
                    subTitle = `Eklenme: ${d.toLocaleDateString('tr-TR')}`;
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
