import { auth, db } from "./firebase-config.js";
import { formatDate, formatCurrency } from "./utils.js";
import { collection, doc, addDoc, setDoc, getDocs, getDoc, query, orderBy, limit, serverTimestamp, where, onSnapshot, updateDoc, deleteDoc, deleteField } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { escapeHtml, handleFormSubmit } from "./utils.js";
import { registerListener } from "./listenerManager.js";
import { openActiveSession, closeActiveSession } from "./activeSession.js?v=4";

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
    if(!uid) return;
    currentUid = uid;
    window.currentUid = uid;
    localStorage.setItem('uid', uid);
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
    
    
    const saveWorkoutBtn = document.getElementById("workout-save-btn");
    if (saveWorkoutBtn) saveWorkoutBtn.onclick = saveWorkoutSession;
}

function renderSplitView() {
    const titleEl = document.querySelector('#view-workout .font-title-lg.text-title-lg');
    const descEl = document.querySelector('#view-workout .font-body-md.text-body-md.opacity-90');
    const dotsContainer = document.querySelector('#view-workout .flex.gap-2.items-center.mt-2');
    const dashNameEl = document.getElementById('stat-workout-split');
    
    if (!activeSplitId || splits.length === 0) {
        if(titleEl) titleEl.innerText = "Split Bulunamadı";
        if(descEl) descEl.innerText = "Henüz bir program oluşturmadınız.";
        if(dotsContainer) dotsContainer.innerHTML = "";
        if(dashNameEl) dashNameEl.innerText = "Yapılmadı";
        return;
    }
    
    const activeSplit = splits.find(s => s.id === activeSplitId);
    if (!activeSplit) return;
    
    if(dashNameEl) dashNameEl.innerText = activeSplit.name;
    
    // Restore saved active day or default to first
    if(!activeDayId || !activeSplit.days.find(d => d.id === activeDayId)) {
        const savedDay = localStorage.getItem(`miz_activeDay_${currentUid}`);
        if(savedDay && activeSplit.days.find(d => d.id === savedDay)) {
            activeDayId = savedDay;
        } else {
            activeDayId = activeSplit.days.length > 0 ? activeSplit.days[0].id : null;
        }
    }
    
    const currentDay = activeSplit.days.find(d => d.id === activeDayId) || (activeSplit.days.length > 0 ? activeSplit.days[0] : null);
    if(currentDay) {
        if(titleEl) titleEl.innerText = "Bugün: " + currentDay.name;
        if(descEl) descEl.innerText = (currentDay.exercises ? currentDay.exercises.length : 0) + " Hareket içeren antrenman";
    }
    
    if(dotsContainer && activeSplit.days) {
        dotsContainer.innerHTML = '';
        activeSplit.days.forEach((day, idx) => {
            const isActive = day.id === activeDayId;
            const bar = document.createElement('button');
            bar.className = `h-1.5 rounded-full transition-all duration-200 cursor-pointer ${isActive ? 'bg-white w-10' : 'bg-white/30 w-8 hover:bg-white/60'}`;
            bar.title = day.name;
            bar.onclick = () => selectActiveDay(day.id);
            dotsContainer.appendChild(bar);
        });
    }
}

window.selectActiveDay = function(dayId) {
    if(!activeSplitId || !dayId) return;
    const activeSplit = splits.find(s => s.id === activeSplitId);
    if(!activeSplit) return;
    const day = activeSplit.days.find(d => d.id === dayId);
    if(!day) return;
    
    activeDayId = dayId;
    localStorage.setItem(`miz_activeDay_${currentUid}`, dayId);
    
    renderSplitView();
};

window.startActiveSession = function() {
    if(!currentUid || !activeSplitId || !activeDayId) {
        alert('Lütfen önce bir split ve gün seçin.');
        return;
    }
    const activeSplit = splits.find(s => s.id === activeSplitId);
    if(!activeSplit) return;
    const day = activeSplit.days.find(d => d.id === activeDayId);
    if(!day || !day.exercises || day.exercises.length === 0) {
        alert('Seçili günde egzersiz bulunmuyor. Önce split düzenleyenden egzersiz ekleyin.');
        return;
    }
    openActiveSession(currentUid, activeSplitId, activeDayId, day);
};

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
            card.className = "bg-surface-container-lowest rounded-2xl p-4 flex flex-col gap-2 shadow-sm";
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
        item.className = "exercise-item bg-surface-container-lowest rounded-xl p-4 shadow-sm flex items-center gap-4 group";
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
                btn.className = "w-full text-left bg-surface-container-low border-2 border-primary rounded-xl p-4 flex items-center justify-between group transition-transform active:scale-[0.98] relative overflow-hidden shadow-sm";
                btn.innerHTML = `
                    <div class="flex flex-col gap-1 z-10">
                        <span class="font-body-lg text-body-lg text-on-background font-medium">${escapeHtml(split.name)}</span>
                        <span class="font-label-md text-label-md text-primary">Aktif Program</span>
                    </div>
                    <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center z-10">
                        <span class="material-symbols-outlined text-on-primary icon-md font-bold">check</span>
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
                    <span class="material-symbols-outlined text-primary text-lg" data-icon="trending_up">trending_up</span>
                    <span class="font-label-sm text-label-sm text-primary inline-block min-w-[48px] text-right">+${diff.toFixed(1)} kg</span>
                `;
                trendBadgeEl.className = "bg-primary-container bg-opacity-20 rounded-full px-3 py-1 flex items-center gap-1";
            } else if (diff < 0) {
                trendBadgeEl.innerHTML = `
                    <span class="material-symbols-outlined text-error text-lg" data-icon="trending_down">trending_down</span>
                    <span class="font-label-sm text-label-sm text-error inline-block min-w-[48px] text-right">${diff.toFixed(1)} kg</span>
                `;
                trendBadgeEl.className = "bg-error-container bg-opacity-20 rounded-full px-3 py-1 flex items-center gap-1";
            } else {
                trendBadgeEl.innerHTML = `
                    <span class="material-symbols-outlined text-outline text-lg" data-icon="trending_flat">trending_flat</span>
                    <span class="font-label-sm text-label-sm text-outline">Değişim Yok</span>
                `;
                trendBadgeEl.className = "bg-surface-variant bg-opacity-50 rounded-full px-3 py-1 flex items-center gap-1";
            }
        } else {
             trendBadgeEl.innerHTML = `
                <span class="material-symbols-outlined text-primary text-lg" data-icon="fiber_new">fiber_new</span>
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
            
            // Format best set like "4 x 8 x 85.0 kg" as per UI mockup
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
                <div class="bg-surface-container-lowest rounded-xl shadow-sm p-4 flex items-center justify-between interactive-card cursor-pointer ${opacityClass}">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-${idx===0 ? 'primary' : 'secondary'}">
                            <span class="material-symbols-outlined" data-icon="calendar_today" ${idx===0 ? "style=\"font-variation-settings: 'FILL' 1;\"" : ""}>calendar_today</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="font-label-sm text-label-sm text-on-surface-variant">${dateFormatted}</span>
                            <span class="font-body-md text-body-md font-medium text-on-background">${rec.totalSets} x ${bestR} x ${bestW} kg</span>
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
                <div class="absolute left-0 top-0 h-full flex flex-col justify-between text-label-sm text-outline font-label-sm pb-6 pr-2">
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
                <div class="absolute bottom-0 left-6 right-0 flex justify-between text-label-sm text-outline font-label-sm px-2">
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



// ==========================================
// SPLIT EDIT & CREATE LOGIC
// ==========================================

let newSplitDays = [];
let currentPickerDayId = null;
let newSplitId = null;

// Extends the global scope
window.openSplitEdit = function() {
    // Hide workout home
    document.getElementById('view-workout').classList.add('hidden');
    // Hide all other views just in case
    document.querySelectorAll('.view').forEach(v => {
        if(v.id !== 'view-split-edit') v.classList.add('hidden');
    });
    
    document.getElementById('view-split-edit').classList.remove('hidden');
    renderSplitEditView();
};

window.closeSplitEdit = function() {
    document.getElementById('view-split-edit').classList.add('hidden');
    document.getElementById('view-workout').classList.remove('hidden');
};

// Track which day accordions are open
const _openDayAccordions = new Set();

function renderSplitEditView() {
    const activeNameEl = document.getElementById('split-edit-active-name');
    const daysContainer = document.getElementById('split-edit-days-container');
    const createBtn = document.getElementById('split-edit-create-btn');
    
    if(createBtn) createBtn.onclick = openCreateSplitView;
    
    if(!activeSplitId || splits.length === 0) {
        if(activeNameEl) activeNameEl.innerText = "Henüz Split Yok";
        if(daysContainer) {
            daysContainer.innerHTML = `<div class="text-center text-on-surface-variant p-4">Kayıtlı bir splitiniz bulunmuyor. Yeni bir split oluşturun.</div>`;
        }
        return;
    }
    
    const activeSplit = splits.find(s => s.id === activeSplitId);
    if(activeNameEl) activeNameEl.innerText = activeSplit.name;
    if(!daysContainer) return;
    
    daysContainer.innerHTML = '';
    
    activeSplit.days.forEach((day, dayIdx) => {
        const isOpen = _openDayAccordions.has(`${activeSplit.id}-${dayIdx}`);
        const exCount = day.exercises ? day.exercises.length : 0;
        const accordionKey = `${activeSplit.id}-${dayIdx}`;
        
        const dayCard = document.createElement('div');
        dayCard.className = "bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden";
        dayCard.dataset.dayIdx = dayIdx;
        dayCard.dataset.splitId = activeSplit.id;
        
        // Build exercise rows
        let exRows = '';
        if(exCount === 0) {
            exRows = `<p class="text-label-sm text-on-surface-variant italic px-md py-sm pb-3">Henüz hareket eklenmedi.</p>`;
        } else {
            day.exercises.forEach((ex, exIdx) => {
                exRows += `
                    <div class="ex-drag-item flex items-center gap-2 px-md py-2.5 border-b border-surface-container-highest last:border-0 active:bg-surface-container-high transition-colors"
                         data-ex-idx="${exIdx}" data-split-id="${activeSplit.id}" data-day-idx="${dayIdx}">
                        <!-- Drag Handle -->
                        <span class="material-symbols-outlined text-on-surface-variant/50 drag-handle select-none shrink-0 cursor-grab active:cursor-grabbing" style="font-size:20px">drag_indicator</span>
                        <!-- Hareket Adı -->
                        <span class="flex-1 font-body-md text-on-surface text-sm leading-tight">${ex.name}</span>
                        <!-- Set Sayısı -->
                        <div class="flex items-center gap-1 shrink-0">
                            <button onclick="changeExerciseSets('${activeSplit.id}', ${dayIdx}, ${exIdx}, -1)"
                                class="w-7 h-7 rounded-full bg-surface-container-high flex items-center justify-center hover:bg-primary-container/40 transition-colors text-on-surface font-bold text-lg leading-none">−</button>
                            <span class="font-label-sm text-on-surface w-10 text-center whitespace-nowrap" id="sets-lbl-${activeSplit.id}-${dayIdx}-${exIdx}">${ex.defaultSets || 3} set</span>
                            <button onclick="changeExerciseSets('${activeSplit.id}', ${dayIdx}, ${exIdx}, 1)"
                                class="w-7 h-7 rounded-full bg-surface-container-high flex items-center justify-center hover:bg-primary-container/40 transition-colors text-on-surface font-bold text-lg leading-none">+</button>
                        </div>
                        <!-- Sil -->
                        <button onclick="removeExerciseFromSplit('${activeSplit.id}', ${dayIdx}, ${exIdx})"
                            class="shrink-0 w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error-container/20 rounded-full transition-colors">
                            <span class="material-symbols-outlined" style="font-size:18px">delete</span>
                        </button>
                    </div>
                `;
            });
        }
        
        dayCard.innerHTML = `
            <!-- Accordion Header -->
            <button class="accordion-header w-full flex items-center justify-between px-md py-3.5 text-left group transition-colors hover:bg-surface-container-high"
                    onclick="toggleDayAccordion('${accordionKey}', this)">
                <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}" style="font-size:20px">chevron_right</span>
                    <h3 class="font-title-md text-title-md font-semibold text-on-surface">${day.name}</h3>
                </div>
                <span class="font-label-sm text-on-surface-variant">${exCount} hareket</span>
            </button>
            <!-- Accordion Body -->
            <div class="accordion-body ${isOpen ? '' : 'hidden'}">
                <div class="ex-list flex flex-col" id="ex-list-${activeSplit.id}-${dayIdx}">
                    ${exRows}
                </div>
                <div class="px-md pt-2 pb-md">
                    <button onclick="openExercisePickerForSplit('${activeSplit.id}', ${dayIdx})"
                        class="w-full py-2 bg-primary-container/20 text-primary rounded-lg font-label-sm hover:bg-primary-container/40 transition-colors flex items-center justify-center gap-1">
                        <span class="material-symbols-outlined text-[18px]">add</span> Egzersiz Ekle
                    </button>
                </div>
            </div>
        `;
        
        daysContainer.appendChild(dayCard);
        
        // Init Sortable on the exercise list
        if(isOpen) {
            const listEl = dayCard.querySelector(`#ex-list-${activeSplit.id}-${dayIdx}`);
            if(listEl) _initExSortable(listEl, activeSplit.id, dayIdx);
        }
    });
}

window.toggleDayAccordion = function(key, headerBtn) {
    const body = headerBtn.closest('.bg-surface-container-lowest').querySelector('.accordion-body');
    const chevron = headerBtn.querySelector('.material-symbols-outlined');
    
    if(_openDayAccordions.has(key)) {
        _openDayAccordions.delete(key);
        body.classList.add('hidden');
        chevron.classList.remove('rotate-90');
    } else {
        _openDayAccordions.add(key);
        body.classList.remove('hidden');
        chevron.classList.add('rotate-90');
        
        // Init sortable after opening
        const [splitId, dayIdx] = [key.split('-')[0] + '-' + key.split('-')[1] + '-' + key.split('-')[2], parseInt(key.split('-').pop())];
        // Re-parse key properly: key is `${activeSplit.id}-${dayIdx}` but splitId may contain dashes
        const lastDash = key.lastIndexOf('-');
        const parsedSplitId = key.substring(0, lastDash);
        const parsedDayIdx = parseInt(key.substring(lastDash + 1));
        
        const listEl = document.getElementById(`ex-list-${parsedSplitId}-${parsedDayIdx}`);
        if(listEl) _initExSortable(listEl, parsedSplitId, parsedDayIdx);
    }
};

function _initExSortable(listEl, splitId, dayIdx) {
    if(listEl._sortable) { listEl._sortable.destroy(); }
    if(typeof Sortable === 'undefined') return;
    
    listEl._sortable = Sortable.create(listEl, {
        handle: '.drag-handle',
        animation: 150,
        ghostClass: 'opacity-30',
        chosenClass: 'bg-primary-container/10',
        onEnd: function(evt) {
            const split = splits.find(s => s.id === splitId);
            if(!split) return;
            const day = split.days[dayIdx];
            const moved = day.exercises.splice(evt.oldIndex, 1)[0];
            day.exercises.splice(evt.newIndex, 0, moved);
            persistSplitEdit(split);
            // Re-render to update indices on buttons
            renderSplitEditView();
        }
    });
}

// ---------- Split Düzenle – Inline Hareket İşlemleri ----------

window.changeExerciseSets = function(splitId, dayIdx, exIdx, delta) {
    const split = splits.find(s => s.id === splitId);
    if(!split) return;
    const ex = split.days[dayIdx].exercises[exIdx];
    ex.defaultSets = Math.max(1, (ex.defaultSets || 3) + delta);
    
    const label = document.getElementById(`sets-lbl-${splitId}-${dayIdx}-${exIdx}`);
    if(label) label.innerText = `${ex.defaultSets} set`;
    
    persistSplitEdit(split);
};

window.removeExerciseFromSplit = function(splitId, dayIdx, exIdx) {
    const split = splits.find(s => s.id === splitId);
    if(!split) return;
    split.days[dayIdx].exercises.splice(exIdx, 1);
    persistSplitEdit(split);
    renderSplitEditView();
};

window.openExercisePickerForSplit = function(splitId, dayIdx) {
    // "Yeni Split Oluştur" formundaki picker'ı yeniden kullanıyoruz,
    // ama callback'i aktif split'e yazacak şekilde yönlendiriyoruz.
    currentPickerDayId = `__split__${splitId}__day__${dayIdx}`;
    document.getElementById('modal-exercise-picker').classList.remove('hidden');
    renderExercisePickerList('Tümü');
    
    const searchInput = document.getElementById('exercise-picker-search');
    if(searchInput) {
        searchInput.value = '';
        searchInput.oninput = (e) => renderExercisePickerList('Tümü', e.target.value);
    }
};

// Picker'daki "ekle" butonuna basıldığında çağrılan mevcut fonksiyonu override et
const _origPickerClick = window._origPickerClick;
function handlePickerSelect(exName) {
    if(!currentPickerDayId) return;
    
    if(currentPickerDayId.startsWith('__split__')) {
        // Mevcut split'e ekle
        const parts = currentPickerDayId.split('__');
        const splitId = parts[2];
        const dayIdx = parseInt(parts[4]);
        const split = splits.find(s => s.id === splitId);
        if(split) {
            split.days[dayIdx].exercises.push({
                id: `e${Date.now()}_${Math.floor(Math.random()*1000)}`,
                name: exName,
                defaultSets: 3
            });
            persistSplitEdit(split);
            closeExercisePickerModal();
            renderSplitEditView();
        }
    } else {
        // Yeni split formuna ekle
        const day = newSplitDays.find(d => d.id === currentPickerDayId);
        if(day) {
            day.exercises.push({
                id: `e${Date.now()}_${Math.floor(Math.random()*1000)}`,
                name: exName,
                defaultSets: 3
            });
            closeExercisePickerModal();
            renderCreateSplitDays();
        }
    }
}

// Picker listesi render fonksiyonu içindeki onclick'i override et
function patchPickerListClick() {
    const list = document.getElementById('exercise-picker-list');
    if(!list) return;
    list.querySelectorAll('button').forEach(btn => {
        const oldClick = btn.onclick;
        btn.onclick = function() {
            const nameEl = btn.querySelector('.font-body-md');
            if(nameEl) handlePickerSelect(nameEl.textContent.trim());
            else if(oldClick) oldClick.call(this);
        };
    });
}

async function persistSplitEdit(split) {
    try {
        await setDoc(doc(db, "users", currentUid, "splits", split.id), split);
        // Yerel listeyi de güncelle
        const idx = splits.findIndex(s => s.id === split.id);
        if(idx !== -1) splits[idx] = split;
    } catch(e) {
        console.error("Split kayıt hatası:", e);
    }
}

window.openCreateSplitView = function() {
    document.getElementById('view-split-edit').classList.add('hidden');
    document.getElementById('view-create-split').classList.remove('hidden');
    
    const headerTitle = document.querySelector('#view-create-split header h1');
    if(headerTitle) headerTitle.innerText = "Yeni Split";
    
    newSplitId = 'split_' + Date.now();
    newSplitDays = [];
    document.getElementById('create-split-name-input').value = "";
    renderCreateSplitDays();
    
    // Bind save button
    document.getElementById('create-split-save-btn').onclick = saveNewSplit;
};

window.closeCreateSplitView = function() {
    document.getElementById('view-create-split').classList.add('hidden');
    document.getElementById('view-split-edit').classList.remove('hidden');
};

window.addDayToNewSplit = function() {
    const dayCount = newSplitDays.length + 1;
    newSplitDays.push({
        id: `d${Date.now()}`,
        name: `Day ${dayCount}`,
        exercises: []
    });
    renderCreateSplitDays();
};

function renderCreateSplitDays() {
    const container = document.getElementById('create-split-days-container');
    container.innerHTML = '';
    
    newSplitDays.forEach((day, index) => {
        const div = document.createElement('div');
        div.className = "bg-surface-container-lowest rounded-xl p-md shadow-sm relative";
        
        let exHtml = '';
        if(day.exercises.length === 0) {
            exHtml = `<p class="text-label-sm text-on-surface-variant italic mb-2">Henüz hareket eklenmedi.</p>`;
        } else {
            day.exercises.forEach((ex, exIdx) => {
                exHtml += `
                    <div class="flex items-center justify-between py-2 border-b border-surface-container-highest last:border-0">
                        <span class="text-body-sm">${ex.name}</span>
                        <button onclick="removeExerciseFromNewDay(${index}, ${exIdx})" class="text-error/80 hover:text-error p-1">
                            <span class="material-symbols-outlined text-sm">close</span>
                        </button>
                    </div>
                `;
            });
        }
        
        div.innerHTML = `
            <div class="flex items-center justify-between mb-sm">
                <input type="text" value="${day.name}" onchange="updateNewDayName(${index}, this.value)" class="font-title-md text-title-md font-bold text-on-surface bg-transparent outline-none w-3/4 border-b border-transparent focus:border-outline-variant">
                <button onclick="removeDayFromNewSplit(${index})" class="text-on-surface-variant hover:text-error transition-colors p-1">
                    <span class="material-symbols-outlined text-[20px]">delete</span>
                </button>
            </div>
            <div class="mb-3">
                ${exHtml}
            </div>
            <button onclick="openExercisePicker('${day.id}')" class="w-full py-2 bg-primary-container/30 text-primary rounded-lg font-label-sm hover:bg-primary-container/50 transition-colors flex items-center justify-center gap-1">
                <span class="material-symbols-outlined text-[18px]">add</span> Egzersiz Ekle
            </button>
        `;
        container.appendChild(div);
    });
}

window.updateNewDayName = function(index, val) {
    newSplitDays[index].name = val;
};

window.removeDayFromNewSplit = function(index) {
    newSplitDays.splice(index, 1);
    renderCreateSplitDays();
};

window.removeExerciseFromNewDay = function(dayIndex, exIndex) {
    newSplitDays[dayIndex].exercises.splice(exIndex, 1);
    renderCreateSplitDays();
};

window.openExercisePicker = function(dayId) {
    currentPickerDayId = dayId;
    document.getElementById('modal-exercise-picker').classList.remove('hidden');
    renderExercisePickerList('Tümü');
    
    const searchInput = document.getElementById('exercise-picker-search');
    if(searchInput) {
        searchInput.value = '';
        searchInput.oninput = (e) => {
            renderExercisePickerList('Tümü', e.target.value);
        };
    }
};

window.closeExercisePickerModal = function() {
    document.getElementById('modal-exercise-picker').classList.add('hidden');
    currentPickerDayId = null;
};

window.filterPickerCategory = function(cat, btnElement) {
    const buttons = document.querySelectorAll('#exercise-picker-categories button');
    buttons.forEach(b => {
        b.className = "px-4 py-1.5 rounded-full border border-outline-variant text-on-surface-variant font-label-sm whitespace-nowrap";
    });
    if(btnElement) btnElement.className = "px-4 py-1.5 rounded-full bg-primary text-on-primary font-label-sm whitespace-nowrap";
    
    const searchInput = document.getElementById('exercise-picker-search');
    renderExercisePickerList(cat, searchInput ? searchInput.value : '');
};

function renderExercisePickerList(category, searchTerm = '') {
    const list = document.getElementById('exercise-picker-list');
    list.innerHTML = '';
    
    if(!window.EXERCISE_MUSCLE_MAPPING) {
        list.innerHTML = '<p class="text-on-surface-variant p-4">Egzersiz verisi bulunamadı. Lütfen sayfayı yenileyin.</p>';
        return;
    }
    
    const exercises = Object.keys(window.EXERCISE_MUSCLE_MAPPING);
    let filtered = exercises;
    
    if(category !== 'Tümü') {
        const catMap = {
            'Göğüs': ['chest'],
            'Sırt': ['upper-back', 'lower-back'],
            'Omuz': ['deltoids'],
            'Bacak': ['quadriceps', 'hamstring', 'calves', 'gluteal'],
            'Biceps': ['biceps'],
            'Triceps': ['triceps'],
            'Karın': ['abs', 'obliques']
        };
        const targets = catMap[category] || [category.toLowerCase()];
        
        filtered = filtered.filter(exName => {
            const data = window.EXERCISE_MUSCLE_MAPPING[exName];
            if(!data) return false;
            return targets.some(t =>
                (data.primary && data.primary.includes(t)) ||
                (data.secondary && data.secondary.includes(t))
            );
        });
    }
    
    if(searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(ex => ex.toLowerCase().includes(term));
    }
    
    filtered.forEach(exName => {
        const btn = document.createElement('button');
        btn.className = "w-full text-left p-3 rounded-xl hover:bg-surface-container-high transition-colors flex items-center justify-between border border-transparent hover:border-outline-variant/30";
        btn.innerHTML = `
            <span class="font-body-md text-on-surface">${exName}</span>
            <span class="material-symbols-outlined text-primary">add_circle</span>
        `;
        btn.onclick = () => handlePickerSelect(exName);
        list.appendChild(btn);
    });
}

window.saveNewSplit = async function() {
    const nameInput = document.getElementById('create-split-name-input').value.trim();
    if(!nameInput) {
        alert("Lütfen split adı girin.");
        return;
    }
    
    if(newSplitDays.length === 0) {
        alert("En az bir gün eklemelisiniz.");
        return;
    }
    
    const saveBtn = document.getElementById('create-split-save-btn');
    saveBtn.disabled = true;
    saveBtn.innerText = "Kaydediliyor...";
    
    try {
        
        const newSplit = {
            id: newSplitId,
            name: nameInput,
            days: newSplitDays,
            createdAt: new Date().toISOString()
        };
        
        await setDoc(doc(db, "users", currentUid, "splits", newSplitId), newSplit);
        
        const existingIdx = splits.findIndex(s => s.id === newSplitId);
        if (existingIdx !== -1) {
            splits[existingIdx] = newSplit;
        } else {
            splits.push(newSplit);
        }
        
        if(splits.length === 1 || !activeSplitId) {
            activeSplitId = newSplitId;
            await setDoc(doc(db, "users", currentUid), {
                activeSplitId: newSplitId
            }, { merge: true });
            localStorage.setItem(`miz_activeSplit_${currentUid}`, newSplitId);
        }
        
        closeCreateSplitView();
        renderSplitEditView();
        
        if(typeof renderSplitView === 'function') {
            renderSplitView();
        }
        
    } catch(e) {
        console.error("Error saving new split", e);
        alert("Kaydedilirken hata oluştu.");
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerText = "Kaydet";
    }
};

window.openSplitModal = function() {
    const modal = document.getElementById('modal-split-change');
    const optionsContainer = document.getElementById('split-modal-options');
    
    if(!modal || !optionsContainer) return;
    
    optionsContainer.innerHTML = '';
    tempSelectedSplitId = activeSplitId;
    
    splits.forEach(split => {
        const isAct = split.id === activeSplitId;
        const div = document.createElement('div');
        div.className = `flex flex-col p-4 rounded-xl border ${isAct ? 'border-primary bg-primary-container/10' : 'border-outline-variant bg-surface'} cursor-pointer hover:bg-surface-container-high transition-colors`;
        
        div.innerHTML = `
            <div class="flex items-center justify-between mb-2" onclick="selectSplit('${split.id}')">
                <div>
                    <div class="font-title-md text-on-surface font-bold">${split.name}</div>
                    <div class="font-label-sm text-on-surface-variant">${split.days ? split.days.length : 0} Gün</div>
                </div>
                ${isAct ? '<span class="material-symbols-outlined text-primary">check_circle</span>' : '<span class="material-symbols-outlined text-outline">radio_button_unchecked</span>'}
            </div>
            <div class="flex justify-end gap-2 mt-2 pt-2 border-t border-outline-variant/30">
                <button onclick="event.stopPropagation(); openEditSplitView('${split.id}')" class="p-2 rounded-full text-primary hover:bg-primary-container/20 transition-colors flex items-center justify-center">
                    <span class="material-symbols-outlined text-sm">edit</span>
                </button>
                <button onclick="event.stopPropagation(); deleteSplit('${split.id}')" class="p-2 rounded-full text-error hover:bg-error-container/20 transition-colors flex items-center justify-center">
                    <span class="material-symbols-outlined text-sm">delete</span>
                </button>
            </div>
        `;
        optionsContainer.appendChild(div);
    });
    
    modal.classList.remove('hidden');
};

window.closeSplitModal = function() {
    const modal = document.getElementById('modal-split-change');
    if(modal) modal.classList.add('hidden');
};

let tempSelectedSplitId = null;
window.selectSplit = function(splitId) {
    tempSelectedSplitId = splitId;
    const optionsContainer = document.getElementById('split-modal-options');
    Array.from(optionsContainer.children).forEach((child, index) => {
        const split = splits[index];
        const isSel = split.id === tempSelectedSplitId;
        child.className = `flex flex-col p-4 rounded-xl border ${isSel ? 'border-primary bg-primary-container/10' : 'border-outline-variant bg-surface'} cursor-pointer hover:bg-surface-container-high transition-colors`;
        const icon = child.querySelector('.material-symbols-outlined.text-primary, .material-symbols-outlined.text-outline');
        if(icon) {
            icon.className = `material-symbols-outlined ${isSel ? 'text-primary' : 'text-outline'}`;
            icon.innerText = isSel ? 'check_circle' : 'radio_button_unchecked';
        }
    });
};

window.applySplitSelection = async function() {
    if(!tempSelectedSplitId) return;
    activeSplitId = tempSelectedSplitId;
    
    try {
        await setDoc(doc(db, "users", currentUid), {
            activeSplitId: activeSplitId
        }, { merge: true });
        localStorage.setItem(`miz_activeSplit_${currentUid}`, activeSplitId);
        
        if (typeof renderSplitEditView === 'function') renderSplitEditView();
        if (typeof renderSplitView === 'function') renderSplitView();
        
        closeSplitModal();
    } catch(e) {
        console.error(e);
        alert("Split seçimi kaydedilemedi.");
    }
};

window.openEditSplitView = function(splitId) {
    const split = splits.find(s => s.id === splitId);
    if(!split) return;
    
    closeSplitModal();
    
    document.getElementById('view-split-edit').classList.add('hidden');
    document.getElementById('view-create-split').classList.remove('hidden');
    
    const headerTitle = document.querySelector('#view-create-split header h1');
    if(headerTitle) headerTitle.innerText = "Split Düzenle";
    
    newSplitId = split.id;
    newSplitDays = JSON.parse(JSON.stringify(split.days || []));
    
    document.getElementById('create-split-name-input').value = split.name;
    renderCreateSplitDays();
    
    document.getElementById('create-split-save-btn').onclick = saveNewSplit;
};

window.deleteSplit = async function(splitId) {
    if(!confirm("Bu split'i silmek istediğinize emin misiniz?")) return;
    
    try {
        await deleteDoc(doc(db, "users", currentUid, "splits", splitId));
        splits = splits.filter(s => s.id !== splitId);
        
        if(activeSplitId === splitId) {
            activeSplitId = splits.length > 0 ? splits[0].id : null;
            if(activeSplitId) {
                await setDoc(doc(db, "users", currentUid), { activeSplitId }, { merge: true });
                localStorage.setItem(`miz_activeSplit_${currentUid}`, activeSplitId);
            } else {
                await setDoc(doc(db, "users", currentUid), { activeSplitId: deleteField() }, { merge: true });
                localStorage.removeItem(`miz_activeSplit_${currentUid}`);
            }
        }
        
        if (typeof renderSplitEditView === 'function') renderSplitEditView();
        if (typeof renderSplitView === 'function') renderSplitView();
        
        const modal = document.getElementById('modal-split-change');
        if(modal && !modal.classList.contains('hidden')) {
            openSplitModal();
        }
        
    } catch(e) {
        console.error(e);
        alert("Silme işlemi başarısız.");
    }
};
