import { auth, db } from "./firebase-config.js";
import { formatDate, formatCurrency } from "./utils.js";
import { collection, doc, addDoc, setDoc, getDocs, getDoc, query, orderBy, limit, serverTimestamp, where, onSnapshot, updateDoc, deleteDoc, deleteField, writeBatch } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { escapeHtml, handleFormSubmit } from "./utils.js";
import { registerListener } from "./listenerManager.js";
import { openActiveSession, closeActiveSession } from "./activeSession.js?v=1787301376";

let currentUid = null;
let splits = [];
let activeSplitId = null;
let activeDayId = null;
let currentWorkoutLog = null;
let lastWorkoutLog = null;

let callback = null;

let unsubSplits = null;
let unsubLogs = null;

let sessionDraftMovements = []; // [{id, name, duration, imageBase64}]
let editingSessionId = null;


document.addEventListener('click', (e) => {
    const actionBtn = e.target.closest('[data-action]');
    if (!actionBtn) return;
    const action = actionBtn.getAttribute('data-action');

    if (action === 'openSplitEdit') openSplitEdit();
    else if (action === 'closeSplitEdit') closeSplitEdit();


    else if (action === 'closeExerciseHistory') closeExerciseHistory();
    else if (action === 'closeSplitSelectionModal') closeSplitSelectionModal();
    else if (action === 'closeSplitSelectionAndOpenModal') { closeSplitSelectionModal(); setTimeout(openSimpleNewSplitModal, 300); }
    else if (action === 'closeSplitModalAndOpenCreate') { closeSplitSelectionModal(); setTimeout(openSimpleNewSplitModal, 300); }
    else if (action === 'changeExerciseSets') changeExerciseSets(actionBtn.getAttribute('data-split-id'), parseInt(actionBtn.getAttribute('data-day-idx'), 10), parseInt(actionBtn.getAttribute('data-ex-idx'), 10), parseInt(actionBtn.getAttribute('data-delta'), 10));
    else if (action === 'removeExerciseFromSplit') removeExerciseFromSplit(actionBtn.getAttribute('data-split-id'), parseInt(actionBtn.getAttribute('data-day-idx'), 10), parseInt(actionBtn.getAttribute('data-ex-idx'), 10));
    else if (action === 'toggleDayAccordion') toggleDayAccordion(actionBtn.getAttribute('data-accordion-key'), actionBtn);
    else if (action === 'openExercisePickerForSplit') openExercisePickerForSplit(actionBtn.getAttribute('data-split-id'), parseInt(actionBtn.getAttribute('data-day-idx'), 10));
    else if (action === 'removeExerciseFromNewDay') removeExerciseFromNewDay(parseInt(actionBtn.getAttribute('data-day-idx'), 10), parseInt(actionBtn.getAttribute('data-ex-idx'), 10));
    else if (action === 'removeDayFromNewSplit') removeDayFromNewSplit(parseInt(actionBtn.getAttribute('data-day-idx'), 10));
    else if (action === 'openExercisePicker') openExercisePicker(actionBtn.getAttribute('data-day-id'));
    else if (action === 'closeExercisePickerModal') closeExercisePickerModal();
    else if (action === 'filterPickerCategory') filterPickerCategory(actionBtn.getAttribute('data-category'), actionBtn);
    else if (action === 'selectSplit') selectSplit(actionBtn.getAttribute('data-split-id'));
    else if (action === 'openEditSplitView') { e.stopPropagation(); openEditSplitView(actionBtn.getAttribute('data-split-id')); }
    else if (action === 'startActiveSession') startActiveSession();
    else if (action === 'deleteSplit') { e.stopPropagation(); deleteSplit(actionBtn.getAttribute('data-split-id')); }
    else if (action === 'addDayToSplit') { e.stopPropagation(); addDayToExistingSplit(actionBtn.getAttribute('data-split-id')); }
    else if (action === 'removeDayFromSplit') { e.stopPropagation(); removeDayFromSplit(actionBtn.getAttribute('data-split-id'), parseInt(actionBtn.getAttribute('data-day-idx'), 10)); }
    else if (action === 'openSplitModal') openSplitModal();
    else if (action === 'changeExerciseSets') {
        changeExerciseSets(actionBtn.getAttribute('data-split-id'), parseInt(actionBtn.getAttribute('data-day-idx')), parseInt(actionBtn.getAttribute('data-ex-idx')), parseInt(actionBtn.getAttribute('data-delta')));
    }
    else if (action === 'removeExerciseFromSplit') {
        removeExerciseFromSplit(actionBtn.getAttribute('data-split-id'), parseInt(actionBtn.getAttribute('data-day-idx')), parseInt(actionBtn.getAttribute('data-ex-idx')));
    }
    else if (action === 'openExercisePickerForSplit') {
        openExercisePickerForSplit(actionBtn.getAttribute('data-split-id'), parseInt(actionBtn.getAttribute('data-day-idx')));
    }
    else if (action === 'toggleFav') {
        toggleFavorite(e, actionBtn);
    }
    else if (action === 'removeExerciseFromNewDay') {
        removeExerciseFromNewDay(parseInt(actionBtn.getAttribute('data-day-idx')), parseInt(actionBtn.getAttribute('data-ex-idx')));
    }
    else if (action === 'removeDayFromNewSplit') {
        removeDayFromNewSplit(parseInt(actionBtn.getAttribute('data-day-idx')));
    }
});


export function initWorkout(uid, onChangeCallback) {
    if(!uid) return;
    currentUid = uid;
    if (typeof loadCustomExercises === 'function') {
        loadCustomExercises();
    }
    initFavoritesUI();
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


    // core-image-input: reserved for future core image upload UI

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
    const saveSplitBtn = document.getElementById("save-split-btn"); if (saveSplitBtn) saveSplitBtn.onclick = saveSimpleNewSplit; const closeSplitModalBtn = document.getElementById("close-split-modal-btn"); if(closeSplitModalBtn) closeSplitModalBtn.onclick = closeSimpleNewSplitModal;


    const saveWorkoutBtn = document.getElementById("workout-save-btn");
    if (saveWorkoutBtn) saveWorkoutBtn.onclick = saveWorkoutSession;
}

function renderSplitView() {
    const titleEl = document.getElementById('workout-split-title');
    const descEl = document.getElementById('workout-split-desc');
    const dotsContainer = document.getElementById('workout-day-indicator');
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
            const shadowStyle = isActive
                ? 'box-shadow: 2px 2px 5px #D1D9E6, -2px -2px 5px #FFFFFF;'
                : 'box-shadow: inset 2px 2px 5px #D1D9E6, inset -2px -2px 5px #FFFFFF;';
            const bgClass = isActive ? 'bg-gradient-to-r from-neon-purple to-neon-blue' : 'bg-[#E2E8F0]';
            bar.className = `h-2 rounded-full transition-all duration-300 cursor-pointer ${bgClass} ${isActive ? 'w-10' : 'w-6 opacity-80 hover:opacity-100'}`;
            bar.style = shadowStyle;
            bar.title = day.name;
            bar.onclick = () => selectActiveDay(day.id);
            dotsContainer.appendChild(bar);
        });
    }
}

function selectActiveDay(dayId) {
    if(!activeSplitId || !dayId) return;
    const activeSplit = splits.find(s => s.id === activeSplitId);
    if(!activeSplit) return;
    const day = activeSplit.days.find(d => d.id === dayId);
    if(!day) return;

    activeDayId = dayId;
    localStorage.setItem(`miz_activeDay_${currentUid}`, dayId);

    renderSplitView();
};

function startActiveSession() {
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
        await setDoc(doc(db, "users", currentUid, "workout_logs", docId), logData).catch(e => { console.error('DB Error:', e); alert('Veritabanı işlemi sırasında bir hata oluştu.'); throw e; });
        currentWorkoutLog = { id: docId, ...logData };

        saveBtn.innerHTML = `<span class="material-symbols-rounded">check_circle</span> Kaydedildi!`;
        saveBtn.classList.add("bg-gradient-to-r from-neon-purple to-neon-blue-container", "text-white-container");

        setTimeout(() => {
            saveBtn.innerHTML = originalText;
            saveBtn.classList.remove("bg-gradient-to-r from-neon-purple to-neon-blue-container", "text-white-container");
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

;

// ==========================================
// EDIT TEMPLATE VIEW
// ==========================================

let editingExercises = [];

function openEditTemplateView() {
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
        item.className = "exercise-item bg-background shadow-neo-lowest rounded-[32px] p-4 shadow-sm flex items-center gap-4 group";
        item.dataset.index = index;

        item.innerHTML = `
            <span class="material-symbols-rounded text-outline-variant drag-handle">drag_handle</span>
            <div class="flex-1">
                <h3 class="font-body-lg text-body-lg font-medium text-on-surface">${escapeHtml(ex.name)}</h3>
                <p class="font-label-sm text-label-sm text-on-surface-variant">Genel • ${ex.defaultSets || 3} Set</p>
            </div>
            <button class="text-error opacity-70 hover:opacity-100 transition-opacity p-2 delete-btn">
                <span class="material-symbols-rounded" style="font-variation-settings: 'FILL' 1;">delete</span>
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

                    await setDoc(doc(db, "users", currentUid, "splits", activeSplitId), updatedSplit).catch(e => { console.error('DB Error:', e); alert('Veritabanı işlemi sırasında bir hata oluştu.'); throw e; });

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

function openSplitSelectionModal() {
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
                btn.className = "w-full text-left bg-background shadow-neo-low border-2 border-primary rounded-[32px] p-4 flex items-center justify-between group transition-transform active:scale-[0.98] relative overflow-hidden shadow-sm";
                btn.innerHTML = `
                    <div class="flex flex-col gap-1 z-10">
                        <span class="font-body-lg text-body-lg text-on-background font-medium">${escapeHtml(split.name)}</span>
                        <span class="font-label-md text-label-md text-neon-blue">Aktif Program</span>
                    </div>
                    <div class="w-8 h-8 rounded-full bg-gradient-to-r from-neon-purple to-neon-blue flex items-center justify-center z-10">
                        <span class="material-symbols-rounded text-white icon-md font-bold">check</span>
                    </div>
                    <div class="absolute inset-0 bg-gradient-to-r from-neon-purple to-neon-blue/5 pointer-events-none"></div>
                `;
            } else {
                btn.className = "w-full text-left bg-background shadow-neo-lowest border-none rounded-[32px] p-4 flex items-center justify-between hover:bg-background shadow-neo-low transition-colors active:scale-[0.98] shadow-sm";

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

function closeSplitSelectionModal() {
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


function initFavoritesUI() {
    if(!currentUid) return;
    const favs = JSON.parse(localStorage.getItem(`miz_fav_exercises_${currentUid}`) || "[]");
    document.querySelectorAll('.exercise-item').forEach(item => {
        const title = item.querySelector('h4').innerText;
        const btn = item.querySelector('.exercise-fav-btn');
        if(!btn) return;
        const span = btn.querySelector('span');
        if (favs.includes(title)) {
            span.style.fontVariationSettings = "'FILL' 1";
            btn.classList.remove('text-on-surface-variant');
            btn.classList.add('text-primary');
            item.dataset.fav = "true";
        } else {
            span.style.fontVariationSettings = "'FILL' 0";
            btn.classList.add('text-on-surface-variant');
            btn.classList.remove('text-primary');
            item.dataset.fav = "false";
        }
    });
}

function toggleFavorite(e, btn) {
    e.stopPropagation();
    const exName = btn.closest('.exercise-item').querySelector('h4').innerText;
    let favs = JSON.parse(localStorage.getItem(`miz_fav_exercises_${currentUid}`) || "[]");

    if (favs.includes(exName)) {
        favs = favs.filter(f => f !== exName);
    } else {
        favs.push(exName);
    }
    localStorage.setItem(`miz_fav_exercises_${currentUid}`, JSON.stringify(favs));
    initFavoritesUI();
}

// ==========================================
// EXERCISE HISTORY VIEW
// ==========================================

function switchView(viewId) {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    const target = document.getElementById("view-" + viewId);
    if(target) target.classList.remove("hidden");
}

function closeExerciseHistory() {
    switchView('workout');
    renderSplitView();
};

async function openExerciseHistory(triggerExId, exName) {
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
        const snap = await getDocs(q).catch(e => { console.error('DB Error:', e); alert('Veritabanı işlemi sırasında bir hata oluştu.'); throw e; });

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
                    <span class="material-symbols-rounded text-neon-blue text-lg" data-icon="trending_up">trending_up</span>
                    <span class="font-label-sm text-label-sm text-neon-blue inline-block min-w-[48px] text-right">+${diff.toFixed(1)} kg</span>
                `;
                trendBadgeEl.className = "bg-gradient-to-r from-neon-purple to-neon-blue-container bg-opacity-20 rounded-full px-3 py-1 flex items-center gap-1";
            } else if (diff < 0) {
                trendBadgeEl.innerHTML = `
                    <span class="material-symbols-rounded text-error text-lg" data-icon="trending_down">trending_down</span>
                    <span class="font-label-sm text-label-sm text-error inline-block min-w-[48px] text-right">${diff.toFixed(1)} kg</span>
                `;
                trendBadgeEl.className = "bg-error-container bg-opacity-20 rounded-full px-3 py-1 flex items-center gap-1";
            } else {
                trendBadgeEl.innerHTML = `
                    <span class="material-symbols-rounded text-outline text-lg" data-icon="trending_flat">trending_flat</span>
                    <span class="font-label-sm text-label-sm text-outline">Değişim Yok</span>
                `;
                trendBadgeEl.className = "bg-background shadow-neo-variant bg-opacity-50 rounded-full px-3 py-1 flex items-center gap-1";
            }
        } else {
             trendBadgeEl.innerHTML = `
                <span class="material-symbols-rounded text-neon-blue text-lg" data-icon="fiber_new">fiber_new</span>
                <span class="font-label-sm text-label-sm text-neon-blue">İlk Kayıt</span>
            `;
             trendBadgeEl.className = "bg-gradient-to-r from-neon-purple to-neon-blue-container bg-opacity-20 rounded-full px-3 py-1 flex items-center gap-1";
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
                    diffBadge = `<div class="bg-gradient-to-r from-neon-purple to-neon-blue-container bg-opacity-10 text-neon-blue font-label-md text-label-md px-1 py-1 rounded inline-block min-w-[56px] text-center">+${diff.toFixed(1)} kg</div>`;
                } else if(diff < 0) {
                    diffBadge = `<div class="bg-error-container bg-opacity-10 text-error font-label-md text-label-md px-1 py-1 rounded inline-block min-w-[56px] text-center">${diff.toFixed(1)} kg</div>`;
                }
            }

            // Opacity for older items
            const opacityClass = idx === 0 ? "opacity-100" : (idx === 1 ? "opacity-90" : "opacity-80");

            listContainer.innerHTML += `
                <div class="bg-background shadow-neo-lowest rounded-[32px] shadow-sm p-4 flex items-center justify-between interactive-card cursor-pointer ${opacityClass}">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-lg bg-background shadow-neo flex items-center justify-center text-${idx===0 ? 'primary' : 'secondary'}">
                            <span class="material-symbols-rounded" data-icon="calendar_today" ${idx===0 ? "style=\"font-variation-settings: 'FILL' 1;\"" : ""}>calendar_today</span>
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

                pointsHtml += `<div class="w-2 h-2 rounded-full bg-gradient-to-r from-neon-purple to-neon-blue border-2 border-surface-container-lowest absolute bottom-[${100-y}%] left-[${x}%] transform -translate-x-1/2 translate-y-1/2"></div>`;

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
function openSplitEdit() {
    // Fix DOM nesting if it got stuck inside an unclosed modal
    const appScreen = document.getElementById("app-screen");
    const splitEdit = document.getElementById("view-split-edit");
    if (appScreen && splitEdit && splitEdit.parentNode !== appScreen) {
        appScreen.appendChild(splitEdit);
    }
    // Hide workout home
    document.getElementById('view-workout').classList.add('hidden');
    // Hide all other views just in case
    document.querySelectorAll('.view').forEach(v => {
        if(v.id !== 'view-split-edit') v.classList.add('hidden');
    });

    document.getElementById('view-split-edit').classList.remove('hidden');
    renderSplitEditView();
};

function closeSplitEdit() {
    document.getElementById('view-split-edit').classList.add('hidden');
    document.getElementById('view-workout').classList.remove('hidden');
    document.body.classList.remove("overflow-hidden");
};

// Track which day accordions are open
const _openDayAccordions = new Set();
const _openSplitAccordions = new Set();
const _openExAccordions = new Set();

function renderSplitEditView() {
    const mainContainer = document.getElementById('split-edit-main-container');
    if(!mainContainer) return;

    if(splits.length === 0) {
        mainContainer.innerHTML = `<div class="flex flex-col items-center justify-center py-8 opacity-40">
            <span class="material-symbols-outlined text-on-surface-variant mb-2">calendar_today</span>
            <p class="font-label-sm text-label-sm text-on-surface-variant">Henüz program eklenmemiş</p>
        </div>`;
        return;
    }

    mainContainer.innerHTML = '';

    splits.forEach(split => {
        const isSplitOpen = _openSplitAccordions.has(split.id);
        const splitCard = document.createElement('div');
        splitCard.className = `split-card w-full max-w-[342px] mx-auto flex flex-col items-center ${isSplitOpen ? 'expanded' : ''}`;

        const splitInitial = (split.name || 'S').charAt(0).toUpperCase();

        let daysHtml = '';
        if (!split.days || split.days.length === 0) {
            daysHtml = `
            <div class="flex flex-col items-center justify-center py-8 opacity-40">
                <span class="material-symbols-outlined text-on-surface-variant mb-2">calendar_today</span>
                <p class="font-label-sm text-label-sm text-on-surface-variant">Henüz gün eklenmemiş</p>
            </div>
            `;
        } else {
            daysHtml = '<div class="flex flex-col w-full items-center">';
            split.days.forEach((day, dayIdx) => {
                const dayAccordionKey = `${split.id}-${dayIdx}`;
                const isDayOpen = _openDayAccordions.has(dayAccordionKey);

                let exHtml = '';
                if (!day.exercises || day.exercises.length === 0) {
                    exHtml = `
                    <div class="flex flex-col items-center justify-center py-6 opacity-40">
                        <span class="material-symbols-outlined text-on-surface-variant mb-2">fitness_center</span>
                        <p class="font-label-sm text-label-sm text-on-surface-variant">Bu gün için hareket planlanmamış</p>
                    </div>
                    `;
                } else {
                    exHtml = `<div class="flex flex-col gap-3 w-full items-center ex-list" id="ex-list-${split.id}-${dayIdx}">`;
                    day.exercises.forEach((ex, exIdx) => {
                        const exAccordionKey = `${split.id}-${dayIdx}-${exIdx}`;
                        const isExOpen = _openExAccordions.has(exAccordionKey);
                        const initial = (ex.name || 'E').charAt(0).toUpperCase();
                        const sets = ex.defaultSets || 3;

                        exHtml += `
                        <div class="exercise-card w-[282px] flex flex-col items-center ${isExOpen ? 'expanded' : ''} ex-drag-item" data-ex-idx="${exIdx}" data-split-id="${split.id}" data-day-idx="${dayIdx}">
                            <div class="accordion-header w-[282px] h-[56px] bg-[#E8EAF0] rounded-[12px] p-3 flex items-center justify-between cursor-pointer transition-all z-20 relative" style="box-shadow: 4px 4px 8px rgba(0, 0, 0, 0.08), -4px -4px 8px rgba(255, 255, 255, 0.6);" onclick="toggleMizAccordion(this, '${exAccordionKey}', 'ex', event)">
                                <div class="flex items-center gap-3">
                                    <div class="w-[40px] h-[40px] bg-[#E8EAF0] rounded-full flex items-center justify-center text-[#712AE2] font-bold text-[16px] shrink-0" style="box-shadow: inset 2px 2px 4px rgba(0, 0, 0, 0.08), inset -2px -2px 4px rgba(255, 255, 255, 0.6);">${initial}</div>
                                    <div class="flex flex-col">
                                        <h4 class="font-semibold text-[#181C20] text-[14px] leading-[21px] tracking-[0.7px] drag-handle active:cursor-grabbing select-none">${ex.name}</h4>
                                        <p class="font-normal text-[#585A68] text-[12px] leading-[17px] mt-[-1px]" id="sets-lbl-${split.id}-${dayIdx}-${exIdx}">${sets} set</p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-2 shrink-0">
                                    <span class="material-symbols-rounded text-[#1E293B] text-[16px] transition-transform chevron">expand_more</span>
                                    <button class="p-1 transition-colors" data-action="removeExerciseFromSplit" data-split-id="${split.id}" data-day-idx="${dayIdx}" data-ex-idx="${exIdx}">
                                        <span class="material-symbols-rounded text-[#BA1A1A] text-[16px] pointer-events-none">delete</span>
                                    </button>
                                </div>
                            </div>

                            <!-- Ex Content -->
                            <div class="accordion-content w-[250px] bg-transparent pt-3 pb-3 flex flex-col gap-2 relative z-10 transition-all overflow-hidden ${isExOpen ? 'expanded' : ''}" style="margin-top: 0px; ${isExOpen ? 'max-height: 500px;' : ''}">
                                <div class="flex items-center gap-4 w-[160px] h-[40px] mx-auto mt-2">
                                    <button data-action="changeExerciseSets" data-split-id="${split.id}" data-day-idx="${dayIdx}" data-ex-idx="${exIdx}" data-delta="-1" class="w-10 h-10 rounded-full flex items-center justify-center bg-[rgba(255,255,255,0.002)]" style="box-shadow: inset 4px 4px 8px rgba(0, 0, 0, 0.08), inset -4px -4px 8px rgba(255, 255, 255, 0.6);">
                                        <div class="w-[14px] h-[2px] bg-[#5B5D6D] pointer-events-none"></div>
                                    </button>
                                    <span class="font-bold text-[24px] leading-[29px] tracking-[-0.48px] text-[#000000] min-w-[40px] text-center">${sets}</span>
                                    <button data-action="changeExerciseSets" data-split-id="${split.id}" data-day-idx="${dayIdx}" data-ex-idx="${exIdx}" data-delta="1" class="w-10 h-10 rounded-full flex items-center justify-center bg-[rgba(255,255,255,0.002)]" style="box-shadow: inset 4px 4px 8px rgba(0, 0, 0, 0.08), inset -4px -4px 8px rgba(255, 255, 255, 0.6);">
                                        <span class="material-symbols-rounded text-[#5B5D6D] text-[14px] font-bold pointer-events-none">add</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        `;
                    });
                    exHtml += `</div>`;
                }

                daysHtml += `
                <div class="day-card w-full flex flex-col items-center ${isDayOpen ? 'expanded' : ''}">
                    <!-- Day Header -->
                    <div class="accordion-header w-[300px] h-[56px] bg-[#E8EAF0] rounded-[12px] px-4 flex items-center justify-between cursor-pointer transition-all z-30 relative" style="box-shadow: 4px 4px 8px rgba(0, 0, 0, 0.08), -4px -4px 8px rgba(255, 255, 255, 0.6); ${dayIdx > 0 ? 'margin-top: 12px;' : ''}" onclick="toggleMizAccordion(this, '${dayAccordionKey}', 'day', event)">
                        <div class="flex items-center gap-3">
                            <span class="material-symbols-rounded text-[#C7C4D7] text-[16px] cursor-grab day-drag-handle shrink-0">drag_indicator</span>
                            <div class="bg-[#E8EAF0] px-2 py-1 rounded-[4px] flex items-center justify-center shrink-0" style="box-shadow: inset 2px 2px 4px rgba(0, 0, 0, 0.08), inset -2px -2px 4px rgba(255, 255, 255, 0.6);">
                                <span class="text-[#712AE2] font-normal text-[10px] leading-[15px]">Gün ${dayIdx + 1}</span>
                            </div>
                            <input type="text" value="${day.name}" class="font-medium text-[#181C20] text-[16px] leading-[24px] bg-transparent outline-none border-none focus:ring-0 shadow-none p-0 w-[110px] truncate" onclick="event.stopPropagation()" onchange="updateSplitDayName('${split.id}', ${dayIdx}, this.value)" />
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                            <span class="material-symbols-rounded text-[#1E293B] text-[16px] transition-transform chevron">expand_more</span>
                            <button class="p-1 transition-colors" data-action="removeDayFromSplit" data-split-id="${split.id}" data-day-idx="${dayIdx}">
                                <span class="material-symbols-rounded text-[#BA1A1A] text-[16px] pointer-events-none">delete</span>
                            </button>
                        </div>
                    </div>

                    <!-- Day Content -->
                    <div class="accordion-content w-[294px] bg-[#E8EAF0] rounded-[8px] pt-[24px] pb-[12px] px-[12px] relative z-20 flex flex-col items-center transition-all overflow-hidden ${isDayOpen ? 'expanded' : ''}" style="margin-top: -12px; ${isDayOpen ? 'max-height: 2000px;' : ''}">
                        ${exHtml}
                        <!-- Add Exercise Button -->
                        <button data-action="openExercisePickerForSplit" data-split-id="${split.id}" data-day-idx="${dayIdx}" class="mt-4 w-[156px] h-[40px] bg-[#F7F9FF] rounded-full flex items-center justify-center active:scale-95 transition-transform mx-auto shrink-0" style="box-shadow: 4px 4px 8px #D1D9E6, -4px -4px 8px #FFFFFF;">
                            <span class="font-bold text-[#1E293B] text-[12px] leading-[16px] tracking-[0.6px] uppercase pointer-events-none">Hareket Ekle</span>
                        </button>
                    </div>
                </div>
                `;
            });
            daysHtml += `</div>`;
        }

        let splitHeaderStyles = 'box-shadow: 6px 6px 12px rgba(0, 0, 0, 0.08), -6px -6px 12px rgba(255, 255, 255, 0.6);';
        let splitHeaderWrapperClass = 'accordion-header w-[342px] h-[72px] rounded-[24px] relative z-40 transition-all cursor-pointer p-[2px] bg-gradient-to-r from-[#4648D4] to-[#20E0B0]';

        splitCard.innerHTML = `
            <!-- Split Header Wrapper -->
            <div class="${splitHeaderWrapperClass}" style="${isSplitOpen ? 'box-shadow: 6px 6px 12px rgba(0, 0, 0, 0.08), -6px -6px 12px rgba(255, 255, 255, 0.6);' : splitHeaderStyles}" onclick="toggleMizAccordion(this, '${split.id}', 'split', event)">
                <div class="w-full h-full bg-[#E8EAF0] rounded-[22px] px-5 flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <div class="w-[48px] h-[48px] bg-[#E8EAF0] rounded-full flex items-center justify-center text-[#4648D4] font-bold text-[14px] leading-[21px] tracking-[0.7px] shrink-0" style="box-shadow: inset 4px 4px 8px rgba(0, 0, 0, 0.08), inset -4px -4px 8px rgba(255, 255, 255, 0.6);">
                            ${splitInitial}
                        </div>
                        <h2 class="font-bold text-[#181C20] text-[20px] leading-[26px] select-none" style="font-family: 'Plus Jakarta Sans', sans-serif;">${split.name}</h2>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                        <span class="material-symbols-rounded text-[#1E293B] text-[16px] transition-transform chevron">expand_more</span>
                    </div>
                </div>
            </div>

            <!-- Split Content -->
            <div class="accordion-content w-[342px] bg-[#E8EAF0] rounded-[16px] pt-[32px] px-[16px] pb-[16px] relative z-30 flex flex-col items-center transition-all overflow-hidden ${isSplitOpen ? 'expanded' : ''}" style="margin-top: -16px; ${isSplitOpen ? 'max-height: 5000px;' : ''}">
                ${daysHtml}
                <!-- Add Day Button -->
                <div class="w-full flex justify-center mt-6 mb-2">
                    <button data-action="addDayToSplit" data-split-id="${split.id}" class="w-[127px] h-[40px] bg-[#F7F9FF] rounded-full flex items-center justify-center active:scale-95 transition-transform shrink-0" style="box-shadow: 4px 4px 8px #D1D9E6, -4px -4px 8px #FFFFFF;">
                        <span class="font-bold text-[#1E293B] text-[12px] leading-[16px] tracking-[0.6px] uppercase pointer-events-none">Gün Ekle</span>
                    </button>
                </div>
            </div>
        `;


        const headerEl = splitCard.querySelector('.accordion-header');
        if(headerEl) {
            let startX=0, startY=0;
            headerEl.addEventListener('touchstart', e => {
                startX = e.changedTouches[0].screenX;
                startY = e.changedTouches[0].screenY;
            }, {passive: true});
            headerEl.addEventListener('touchend', e => {
                let endX = e.changedTouches[0].screenX;
                let endY = e.changedTouches[0].screenY;
                if (startX - endX > 60 && Math.abs(startY - endY) < 40) {
                    if(confirm("Bu programı silmek istediğinize emin misiniz?")) {
                        deleteSplit(split.id);
                    }
                }
            });
        }
        mainContainer.appendChild(splitCard);


        if (split.days) {
            split.days.forEach((day, dayIdx) => {
                const listEl = splitCard.querySelector(`#ex-list-${split.id}-${dayIdx}`);
                if(listEl) _initExSortable(listEl, split.id, dayIdx);
            });
        }
    });
}


function toggleDayAccordion(key, headerBtn) {
    const body = headerBtn.closest('.bg-background.shadow-neo-lowest').querySelector('.accordion-body');
    const chevron = headerBtn.querySelector('.material-symbols-rounded');

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
        chosenClass: 'bg-gradient-to-r from-neon-purple to-neon-blue-container/10',
        onEnd: function(evt) {
            const split = splits.find(s => s.id === splitId);
            if(!split) return;
            const day = split.days[dayIdx];
            const moved = day.exercises.splice(evt.oldIndex, 1)[0];
            day.exercises.splice(evt.newIndex, 0, moved);
            persistSplitEdit(split);
            persistSplitEdit(split);
            // Re-render to update indices on buttons
            renderSplitEditView();
        }
    });
}

// ---------- Split Düzenle – Inline Hareket İşlemleri ----------

function changeExerciseSets(splitId, dayIdx, exIdx, delta) {
    const split = splits.find(s => s.id === splitId);
    if(!split) return;
    const ex = split.days[dayIdx].exercises[exIdx];
    ex.defaultSets = Math.max(1, (ex.defaultSets || 3) + delta);

    const label = document.getElementById(`sets-lbl-${splitId}-${dayIdx}-${exIdx}`);
    if(label) label.innerText = `${ex.defaultSets} set`;

    persistSplitEdit(split);
};

function removeExerciseFromSplit(splitId, dayIdx, exIdx) {
    const split = splits.find(s => s.id === splitId);
    if(!split) return;
    split.days[dayIdx].exercises.splice(exIdx, 1);
    persistSplitEdit(split);
    renderSplitEditView();
};

function openExercisePickerForSplit(splitId, dayIdx) {
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
        await setDoc(doc(db, "users", currentUid, "splits", split.id), split).catch(e => { console.error('DB Error:', e); alert('Veritabanı işlemi sırasında bir hata oluştu.'); throw e; });
        // Yerel listeyi de güncelle
        const idx = splits.findIndex(s => s.id === split.id);
        if(idx !== -1) splits[idx] = split;
    } catch(e) {
        console.error("Split kayıt hatası:", e);
    }
}



function addDayToNewSplit() {
    const dayCount = newSplitDays.length + 1;
    newSplitDays.push({
        id: `d${Date.now()}`,
        name: `Day ${dayCount}`,
        exercises: []
    });
    renderCreateSplitDays();
};


function updateNewDayName(index, val) {
    newSplitDays[index].name = val;
};

function removeDayFromNewSplit(index) {
    newSplitDays.splice(index, 1);
    renderCreateSplitDays();
};

function removeExerciseFromNewDay(dayIndex, exIndex) {
    newSplitDays[dayIndex].exercises.splice(exIndex, 1);
    renderCreateSplitDays();
};

function openExercisePicker(dayId) {
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

function closeExercisePickerModal() {
    document.getElementById('modal-exercise-picker').classList.add('hidden');
    currentPickerDayId = null;
};

function filterPickerCategory(cat, btnElement) {
    const buttons = document.querySelectorAll('#exercise-picker-categories button');
    buttons.forEach(b => {
        b.className = "px-4 py-1.5 rounded-full border-none text-on-surface-variant font-label-sm whitespace-nowrap";
    });
    if(btnElement) btnElement.className = "px-4 py-1.5 rounded-full bg-gradient-to-r from-neon-purple to-neon-blue text-white font-label-sm whitespace-nowrap";

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
        btn.className = "w-full text-left p-3 rounded-[32px] hover:bg-background shadow-neo-high transition-colors flex items-center justify-between border-none hover:border-none shadow-neo-inset p-2 rounded";
        btn.innerHTML = `
            <span class="font-body-md text-on-surface">${exName}</span>
            <span class="material-symbols-rounded text-neon-blue">add_circle</span>
        `;
        btn.onclick = () => handlePickerSelect(exName);
        list.appendChild(btn);
    });
}

async function saveNewSplit() {
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

        await setDoc(doc(db, "users", currentUid, "splits", newSplitId), newSplit).catch(e => { console.error('DB Error:', e); alert('Veritabanı işlemi sırasında bir hata oluştu.'); throw e; });

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

function openSplitModal() {
    const modal = document.getElementById('modal-split-change');
    const optionsContainer = document.getElementById('split-modal-options');

    if(!modal || !optionsContainer) return;

    optionsContainer.innerHTML = '';
    tempSelectedSplitId = activeSplitId;

    splits.forEach(split => {
        const isAct = split.id === activeSplitId;
        const div = document.createElement('div');
        div.className = `flex flex-col p-4 rounded-[32px] border ${isAct ? 'border-none shadow-neo-inset bg-gradient-to-r from-neon-purple to-neon-blue-container/10' : 'border-none bg-background shadow-neo'} cursor-pointer hover:bg-background shadow-neo-high transition-colors`;

        div.innerHTML = `
            <div class="flex items-center justify-between mb-2" data-action="selectSplit" data-split-id="${split.id}">
                <div>
                    <div class="font-title-md text-on-surface font-bold">${split.name}</div>
                    <div class="font-label-sm text-on-surface-variant">${split.days ? split.days.length : 0} Gün</div>
                </div>
                ${isAct ? '<span class="material-symbols-rounded text-neon-blue">check_circle</span>' : '<span class="material-symbols-rounded text-outline">radio_button_unchecked</span>'}
            </div>
            <div class="flex justify-end gap-2 mt-2 pt-2 border-t border-none shadow-neo-inset p-2 rounded">
                <button data-action="openEditSplitView" data-split-id="${split.id}" class="p-2 rounded-full text-neon-blue hover:bg-gradient-to-r from-neon-purple to-neon-blue-container/20 transition-colors flex items-center justify-center">
                    <span class="material-symbols-rounded text-sm">edit</span>
                </button>
                <button data-action="deleteSplit" data-split-id="${split.id}" class="p-2 rounded-full text-error hover:bg-error-container/20 transition-colors flex items-center justify-center">
                    <span class="material-symbols-rounded text-sm">delete</span>
                </button>
            </div>
        `;
        optionsContainer.appendChild(div);
    });

    modal.classList.remove('hidden');
};

function closeSplitModal() {
    const modal = document.getElementById('modal-split-change');
    if(modal) modal.classList.add('hidden');
};

let tempSelectedSplitId = null;
function selectSplit(splitId) {
    tempSelectedSplitId = splitId;
    const optionsContainer = document.getElementById('split-modal-options');
    Array.from(optionsContainer.children).forEach((child, index) => {
        const split = splits[index];
        const isSel = split.id === tempSelectedSplitId;
        child.className = `flex flex-col p-4 rounded-[32px] border ${isSel ? 'border-none shadow-neo-inset bg-gradient-to-r from-neon-purple to-neon-blue-container/10' : 'border-none bg-background shadow-neo'} cursor-pointer hover:bg-background shadow-neo-high transition-colors`;
        const icon = child.querySelector('.material-symbols-rounded.text-neon-blue, .material-symbols-rounded.text-outline');
        if(icon) {
            icon.className = `material-symbols-rounded ${isSel ? 'text-neon-blue' : 'text-outline'}`;
            icon.innerText = isSel ? 'check_circle' : 'radio_button_unchecked';
        }
    });
};

async function applySplitSelection() {
    if(!tempSelectedSplitId) return;
    activeSplitId = tempSelectedSplitId;

    try {
        await setDoc(doc(db, "users", currentUid), {
            activeSplitId: activeSplitId
        }, { merge: true });
        localStorage.setItem(`miz_activeSplit_${currentUid}`, activeSplitId);

        if (typeof renderSplitEditView === 'function') renderSplitEditView();
        if (typeof renderSplitView === 'function') renderSplitView();

        // Notify dashboard of the split change so it doesn't revert
        if (callback) {
            const activeSplit = splits.find(s => s.id === activeSplitId);
            const activeSplitName = activeSplit ? activeSplit.name : "Yapılmadı";
            callback(window._miz_last_workout_logs || [], activeSplitName);
        }

        closeSplitModal();
    } catch(e) {
        console.error(e);
        alert("Split seçimi kaydedilemedi.");
    }
};

function openEditSplitView(splitId) {
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

async function deleteSplit(splitId) {
    if(!confirm("Bu split'i silmek istediğinize emin misiniz?")) return;

    try {
        await deleteDoc(doc(db, "users", currentUid, "splits", splitId)).catch(e => { console.error('DB Error:', e); alert('Veritabanı işlemi sırasında bir hata oluştu.'); throw e; });
        splits = splits.filter(s => s.id !== splitId);

        if(activeSplitId === splitId) {
            activeSplitId = splits.length > 0 ? splits[0].id : null;
            if(activeSplitId) {
                await setDoc(doc(db, "users", currentUid), { activeSplitId }, { merge: true }).catch(e => { console.error('DB Error:', e); alert('Veritabanı işlemi sırasında bir hata oluştu.'); throw e; });
                localStorage.setItem(`miz_activeSplit_${currentUid}`, activeSplitId);
            } else {
                await setDoc(doc(db, "users", currentUid), { activeSplitId: deleteField() }, { merge: true }).catch(e => { console.error('DB Error:', e); alert('Veritabanı işlemi sırasında bir hata oluştu.'); throw e; });
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

// ==========================================
// STRETCHING & CORE PLACEHOLDER VIEWS
// ==========================================


// ==========================================
// STRETCH SESSIONS
// ==========================================


function openAddSessionModal(isEdit = false) {
    if (!isEdit) {
        editingSessionId = null;
        sessionDraftMovements = [];
        document.getElementById('session-name').value = '';
        document.getElementById('session-modal-title').textContent = 'Yeni Seans';
    }
    renderSessionMovementPicker();
    renderSessionOrderedList();

    const modal = document.getElementById('addStretchSessionModal');
    const content = document.getElementById('addStretchSessionModalContent');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        content.classList.remove('translate-y-full');
    }, 10);
}

function closeAddSessionModal() {
    const modal = document.getElementById('addStretchSessionModal');
    const content = document.getElementById('addStretchSessionModalContent');
    modal.classList.add('opacity-0');
    content.classList.add('translate-y-full');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function renderSessionMovementPicker() {
    const picker = document.getElementById('session-movement-picker');
    if (!picker) return;
    const all = getAllStretchMovements();
    if (all.length === 0) {
        picker.innerHTML = `<p class="text-center text-on-surface-variant font-body-sm py-2">Önce Hareketler sekmesinden hareket ekleyin.</p>`;
        return;
    }
    picker.innerHTML = all.map(m => {
        const selected = sessionDraftMovements.some(d => d.id === m.id);
        return `
        <button data-action="toggleSessionMovement" data-move-id="${m.id}"
            class="flex items-center gap-3 p-2 rounded-lg transition-colors text-left w-full ${selected ? 'bg-gradient-to-r from-neon-purple to-neon-blue/10 border border-primary/30' : 'hover:bg-background shadow-neo-low'}">
            <div class="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-background shadow-neo-highest">
                ${m.imageBase64 ? `<img src="${m.imageBase64}" class="w-full h-full object-cover" alt="${escapeHtml(m.name)}"/>` : ''}
            </div>
            <span class="flex-1 font-body-md text-body-md text-on-surface truncate">${escapeHtml(m.name)}</span>
            <span class="material-symbols-rounded text-[18px] ${selected ? 'text-neon-blue' : 'text-outline-variant'}" style="font-variation-settings: 'FILL' ${selected ? 1 : 0};">
                ${selected ? 'check_circle' : 'radio_button_unchecked'}
            </span>
        </button>`;
    }).join('');
}

function toggleSessionMovement(id) {
    const all = getAllStretchMovements();
    const move = all.find(m => m.id === id);
    if (!move) return;
    const idx = sessionDraftMovements.findIndex(d => d.id === id);
    if (idx === -1) {
        sessionDraftMovements.push({ id: move.id, name: move.name, duration: move.duration, imageBase64: move.imageBase64 || null });
    } else {
        sessionDraftMovements.splice(idx, 1);
    }
    renderSessionMovementPicker();
    renderSessionOrderedList();
}

function removeSessionMovement(id) {
    sessionDraftMovements = sessionDraftMovements.filter(d => d.id !== id);
    renderSessionMovementPicker();
    renderSessionOrderedList();
}

function renderSessionOrderedList() {
    const list = document.getElementById('session-ordered-list');
    const hint = document.getElementById('session-empty-hint');
    const durationEl = document.getElementById('session-total-duration');
    if (!list) return;

    if (sessionDraftMovements.length === 0) {
        list.innerHTML = `<p id="session-empty-hint" class="text-center text-on-surface-variant font-body-sm py-3">Yukarıdan hareket seçin</p>`;
        if (durationEl) durationEl.textContent = '0 dk';
        return;
    }

    list.innerHTML = sessionDraftMovements.map((m, i) => `
        <div class="flex items-center gap-3 bg-background shadow-neo-low rounded-lg p-2 cursor-grab active:cursor-grabbing session-drag-item"
            draggable="true" data-drag-idx="${i}">
            <span class="material-symbols-rounded text-outline text-[20px] select-none">drag_indicator</span>
            <div class="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-background shadow-neo-highest">
                ${m.imageBase64 ? `<img src="${m.imageBase64}" class="w-full h-full object-cover" alt="${escapeHtml(m.name)}"/>` : ''}
            </div>
            <span class="flex-1 font-body-md text-body-md text-on-surface truncate">${escapeHtml(m.name)}</span>
            <span class="font-label-sm text-label-sm text-on-surface-variant">${m.duration}s</span>
            <button data-action="removeSessionMovement" data-move-id="${m.id}" class="text-on-surface-variant hover:text-error transition-colors p-1 rounded-full">
                <span class="material-symbols-rounded text-[18px]">close</span>
            </button>
        </div>
    `).join('');

    // Total duration
    const total = sessionDraftMovements.reduce((acc, m) => acc + (parseInt(m.duration) || 0), 0);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    if (durationEl) durationEl.textContent = mins > 0 ? `${mins} dk ${secs > 0 ? secs + ' sn' : ''}` : `${secs} sn`;

    initSessionDrag(list);
}

function initSessionDrag(list) {
    let dragIdx = null;
    list.querySelectorAll('.session-drag-item').forEach(item => {
        item.addEventListener('dragstart', (e) => {
            dragIdx = parseInt(item.getAttribute('data-drag-idx'));
            item.classList.add('opacity-50');
            e.dataTransfer.effectAllowed = 'move';
        });
        item.addEventListener('dragend', () => item.classList.remove('opacity-50'));
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });
        item.addEventListener('drop', (e) => {
            e.preventDefault();
            const targetIdx = parseInt(item.getAttribute('data-drag-idx'));
            if (dragIdx === null || dragIdx === targetIdx) return;
            const moved = sessionDraftMovements.splice(dragIdx, 1)[0];
            sessionDraftMovements.splice(targetIdx, 0, moved);
            dragIdx = null;
            renderSessionOrderedList();
        });
    });
}


function _playFinishBeep() {
    // Triple ascending beep on movement finish
    _playBeep(660, 0.15, 0.3);
    setTimeout(() => _playBeep(784, 0.15, 0.35), 180);
    setTimeout(() => _playBeep(1046, 0.25, 0.4), 360);
}


function _spLoadMovement(idx) {
    const m = _spMovements[idx];
    if (!m) return;

    _spTotalTime = parseInt(m.duration) || 30;
    _spTimeLeft = _spTotalTime;

    // Image
    const img = document.getElementById('stretch-player-image');
    const placeholder = document.getElementById('stretch-player-image-placeholder');
    if (m.imageBase64) {
        img.src = m.imageBase64;
        img.classList.remove('hidden');
        placeholder.classList.add('hidden');
    } else {
        img.src = '';
        img.classList.add('hidden');
        placeholder.classList.remove('hidden');
    }

    // Name
    document.getElementById('stretch-player-name').textContent = m.name;

    // Counter
    document.getElementById('stretch-player-counter').textContent = `${idx + 1} / ${_spMovements.length}`;

    // Progress strip
    _spRenderProgressStrip(idx);

    // Timer display
    _spUpdateTimerUI();

    _playBeep(660, 0.15, 0.3);
    setTimeout(() => _playBeep(784, 0.15, 0.35), 180);
    setTimeout(() => _playBeep(1046, 0.25, 0.4), 360);
}

function _spRenderProgressStrip(currentIdx) {}

function _spUpdateTimerUI() {
    const timeEl = document.getElementById('stretch-player-time');
    if (timeEl) {
        let dispTime = _spTimeLeft;
        const m = Math.floor(dispTime / 60);
        const s = dispTime % 60;
        timeEl.textContent = m > 0 ? `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : s.toString().padStart(2, '0');
    }

    const bar = document.getElementById('stretch-player-progress-bar');
    if (bar && _spMovements && _spMovements.length > 0) {
        let html = '';
        const total = _spMovements.length;
        for (let i = 0; i < total; i++) {
            if (i < _spIdx) {
                html += `<div class="h-1 flex-1 rounded-full bg-surface-variant overflow-hidden"><div class="h-full bg-primary w-full rounded-full"></div></div>`;
            } else if (i === _spIdx) {
                const totalDur = parseInt(_spMovements[i].duration) || 30;
                const passed = totalDur - _spTimeLeft;
                const pct = Math.max(0, Math.min(100, (passed / totalDur) * 100));
                html += `<div class="h-1 flex-1 rounded-full bg-surface-variant overflow-hidden"><div class="h-full bg-primary rounded-full transition-all duration-1000 ease-linear" style="width: ${pct}%"></div></div>`;
            } else {
                html += `<div class="h-1 flex-1 rounded-full bg-surface-variant overflow-hidden"></div>`;
            }
        }
        bar.innerHTML = html;
    }
}

function _spStartTimer() {
    _spStopTimer();
    _spPaused = false;
    const pauseIcon = document.getElementById('stretch-player-pause-icon');
    if (pauseIcon) pauseIcon.textContent = 'pause';

    _spInterval = setInterval(() => {
        if (_spPaused) return;
        _spTimeLeft--;
        _spUpdateTimerUI();

        if (_spTimeLeft <= 0) {
            _spStopTimer();
            _playFinishBeep();
            // Move to next or end session
            setTimeout(() => stretchPlayerGoNext(false), 600);
        }
    }, 1000);
}

function _spStopTimer() {
    if (_spInterval) {
        clearInterval(_spInterval);
        _spInterval = null;
    }
}


// ==========================================
// CORE PLAYER ENGINE
// ==========================================

let _cpTimeLeft = 0;
let _cpTotalTime = 0;
let _cpInterval = null;


function _cpLoadMovement(idx) {
    const move = _cpMovements[idx];
    if (!move) return;

    _cpTotalTime = parseInt(move.duration) || 30;
    _cpTimeLeft = _cpTotalTime;

    const imgEl = document.getElementById('core-player-image');
    const placeholder = document.getElementById('core-player-image-placeholder');
    if (move.imageBase64) {
        imgEl.src = move.imageBase64;
        imgEl.classList.remove('hidden');
        placeholder.classList.add('hidden');
    } else {
        imgEl.classList.add('hidden');
        imgEl.src = "";
        placeholder.classList.remove('hidden');
    }

    document.getElementById('core-player-name').textContent = move.name;
    document.getElementById('core-player-counter').textContent = `${idx + 1} / ${_cpMovements.length}`;

    _cpRenderProgressStrip(idx);

    _playBeep(660, 0.15, 0.3);
    setTimeout(() => _playBeep(784, 0.15, 0.35), 180);
    setTimeout(() => _playBeep(1046, 0.25, 0.4), 360);
}

function _cpRenderProgressStrip(currentIdx) {}

function _cpUpdateTimerUI() {
    const timeEl = document.getElementById('core-player-time');
    if (timeEl) {
        let dispTime = _cpTimeLeft;
        const m = Math.floor(dispTime / 60);
        const s = dispTime % 60;
        timeEl.textContent = m > 0 ? `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : s.toString().padStart(2, '0');
    }

    const bar = document.getElementById('core-player-progress-bar');
    if (bar && _cpMovements && _cpMovements.length > 0) {
        let html = '';
        const total = _cpMovements.length;
        for (let i = 0; i < total; i++) {
            if (i < _cpIdx) {
                html += `<div class="h-1 flex-1 rounded-full bg-surface-variant overflow-hidden"><div class="h-full bg-primary w-full rounded-full"></div></div>`;
            } else if (i === _cpIdx) {
                const totalDur = parseInt(_cpMovements[i].duration) || 30;
                const passed = totalDur - _cpTimeLeft;
                const pct = Math.max(0, Math.min(100, (passed / totalDur) * 100));
                html += `<div class="h-1 flex-1 rounded-full bg-surface-variant overflow-hidden"><div class="h-full bg-primary rounded-full transition-all duration-1000 ease-linear" style="width: ${pct}%"></div></div>`;
            } else {
                html += `<div class="h-1 flex-1 rounded-full bg-surface-variant overflow-hidden"></div>`;
            }
        }
        bar.innerHTML = html;
    }
}

function _cpStartTimer() {
    _cpStopTimer();
    _cpPaused = false;
    const pauseIcon = document.getElementById('core-player-pause-icon');
    if (pauseIcon) pauseIcon.textContent = 'pause';

    _cpInterval = setInterval(() => {
        if (_cpPaused) return;
        _cpTimeLeft--;
        _cpUpdateTimerUI();

        if (_cpTimeLeft <= 0) {
            _cpStopTimer();
            _playFinishBeep();
            setTimeout(() => corePlayerGoNext(false), 600);
        }
    }, 1000);
}

function _cpStopTimer() {
    if (_cpInterval) {
        clearInterval(_cpInterval);
        _cpInterval = null;
    }
}

function _cpPauseToggle() {
    _cpPaused = !_cpPaused;
    const pauseIcon = document.getElementById('core-player-pause-icon');
    if (pauseIcon) pauseIcon.textContent = _cpPaused ? 'play_arrow' : 'pause';
}


// category grid logic for Add Core Sheet
document.addEventListener('DOMContentLoaded', () => {
    const catBtns = document.querySelectorAll('#coreCategoryGrid .category-select-btn');
    catBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all
            catBtns.forEach(b => {
                b.classList.remove('border-primary', 'text-primary', 'bg-primary/5');
            });
            // Add to clicked
            btn.classList.add('border-primary', 'text-primary', 'bg-primary/5');
            document.getElementById('newCoreCategory').value = btn.getAttribute('data-cat');
        });
    });
});


// --- Global Exports for Inline HTML Handlers ---


// --- Stretch Add/Edit Bottom Sheet Functions ---


// Window Exports


// category grid logic for Add Stretch Sheet
document.addEventListener('DOMContentLoaded', () => {
    const stretchCatBtns = document.querySelectorAll('#newStretchCategoryOptions .category-select-btn');
    stretchCatBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all
            stretchCatBtns.forEach(b => {
                b.classList.remove('neo-inset', 'text-primary', 'border-primary/20');
                b.classList.add('neo-surface', 'text-on-surface-variant');
            });
            // Add to clicked
            btn.classList.add('neo-inset', 'text-primary', 'border-primary/20');
            btn.classList.remove('neo-surface', 'text-on-surface-variant');
            document.getElementById('newStretchCategory').value = btn.getAttribute('data-cat');
        });
    });
});


// --- Session Builder Logic ---
let currentSessionExercises = [];
let sessionSortableInstance = null;

function openCreateSessionSheet(type) {
    currentSessionType = type;
    currentSessionExercises = [];

    document.getElementById('newSessionName').value = '';
    document.getElementById('sessionSearchInput').value = '';

    const title = document.getElementById('create-session-title');
    title.textContent = type === 'core' ? 'Core Seansı Oluştur' : 'Esneme Seansı Oluştur';

    renderSessionAvailableExercises();
    renderSessionSelectedExercises();

    const sheet = document.getElementById('create-session-bottom-sheet');
    const sheetContent = document.getElementById('create-session-bottom-sheet-content');

    sheet.classList.remove('pointer-events-none');
    sheet.classList.remove('opacity-0');
    sheet.classList.add('opacity-100');

    setTimeout(() => {
        sheetContent.classList.remove('translate-y-full');
        sheetContent.classList.add('translate-y-0');

        // Init sortable if not already init
        if (!sessionSortableInstance && typeof Sortable !== 'undefined') {
            const el = document.getElementById('session-selected-exercises');
            sessionSortableInstance = new Sortable(el, {
                animation: 150,
                handle: '.drag-handle',
                ghostClass: 'opacity-50',
                onEnd: function (evt) {
                    // Update array order based on DOM
                    const itemEl = evt.item;
                    const newIndex = evt.newIndex;
                    const oldIndex = evt.oldIndex;

                    const movedItem = currentSessionExercises.splice(oldIndex, 1)[0];
                    currentSessionExercises.splice(newIndex, 0, movedItem);
                }
            });
        }
    }, 50);
}

function closeCreateSessionSheet() {
    const sheet = document.getElementById('create-session-bottom-sheet');
    const sheetContent = document.getElementById('create-session-bottom-sheet-content');

    sheetContent.classList.remove('translate-y-0');
    sheetContent.classList.add('translate-y-full');

    setTimeout(() => {
        sheet.classList.add('opacity-0');
        sheet.classList.remove('opacity-100');
        sheet.classList.add('pointer-events-none');
    }, 300);
}

function closeCreateSessionSheetOnOutsideClick(event) {
    if (event.target.id === 'create-session-bottom-sheet') {
        closeCreateSessionSheet();
    }
}

function renderSessionAvailableExercises() {
    const container = document.getElementById('session-available-exercises');
    const searchTerm = document.getElementById('sessionSearchInput').value.toLowerCase();

    let sourceArray = [];
    if (currentSessionType === 'core') {
        sourceArray = [...defaultCores, ...(typeof cores !== 'undefined' ? cores : [])];
    } else {
        sourceArray = [...DEFAULT_STRETCHES, ...(typeof stretches !== 'undefined' ? stretches : [])];
    }

    // Sort alphabetically
    sourceArray.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr'));

    let html = '';
    let hasMatch = false;

    sourceArray.forEach(ex => {
        if (ex.name && ex.name.toLowerCase().includes(searchTerm)) {
            hasMatch = true;
            // Determine image
            let imgHtml = '';
            if (ex.imageBase64) {
                imgHtml = `<img src="${ex.imageBase64}" class="w-10 h-10 rounded-xl object-cover">`;
            } else {
                imgHtml = `<div class="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center text-primary font-bold text-xs">${ex.name.substring(0,2).toUpperCase()}</div>`;
            }

            // Pass entire exercise as JSON to avoid complex string parsing
            const exJson = encodeURIComponent(JSON.stringify(ex));

            html += `
            <div class="flex items-center justify-between p-3 neo-surface rounded-2xl mb-2">
                <div class="flex items-center gap-3">
                    ${imgHtml}
                    <div>
                        <div class="font-bold text-sm text-on-surface">${ex.name}</div>
                        <div class="text-xs text-on-surface-variant">${ex.duration}s • ${ex.category}</div>
                    </div>
                </div>
                <button onclick="addExerciseToSession('${exJson}')" class="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                    <span class="material-symbols-rounded text-sm">add</span>
                </button>
            </div>`;
        }
    });

    if (!hasMatch) {
        html = '<div class="text-center text-on-surface-variant text-sm py-4">Sonuç bulunamadı.</div>';
    }
    container.innerHTML = html;
}

function filterSessionAvailableExercises() {
    renderSessionAvailableExercises();
}

function addExerciseToSession(exJsonStr) {
    try {
        const ex = JSON.parse(decodeURIComponent(exJsonStr));
        // Generate a unique instance ID so same exercise can be added twice
        const instanceId = 'inst_' + Math.random().toString(36).substr(2, 9);

        currentSessionExercises.push({
            instanceId,
            id: ex.id || null,
            name: ex.name,
            duration: ex.duration,
            category: ex.category,
            isDefault: ex.isDefault,
            imageBase64: ex.imageBase64 || null
        });

        renderSessionSelectedExercises();
    } catch(err) {
        console.error("Error adding exercise:", err);
    }
}

function removeExerciseFromSession(instanceId) {
    currentSessionExercises = currentSessionExercises.filter(ex => ex.instanceId !== instanceId);
    renderSessionSelectedExercises();
}

function renderSessionSelectedExercises() {
    const container = document.getElementById('session-selected-exercises');

    if (currentSessionExercises.length === 0) {
        container.innerHTML = `<div class="text-center text-on-surface-variant text-sm py-4 italic" id="session-empty-state">Henüz hareket seçilmedi.<br>Aşağıdan seçerek ekleyebilirsiniz.</div>`;
        return;
    }

    let html = '';
    currentSessionExercises.forEach(ex => {
        let imgHtml = '';
        if (ex.imageBase64) {
            imgHtml = `<img src="${ex.imageBase64}" class="w-8 h-8 rounded-lg object-cover">`;
        } else {
            imgHtml = `<div class="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary font-bold text-[10px]">${ex.name.substring(0,2).toUpperCase()}</div>`;
        }

        html += `
        <div class="flex items-center justify-between p-2 bg-surface rounded-xl border border-outline-variant/30" data-id="${ex.instanceId}">
            <div class="flex items-center gap-3">
                <div class="drag-handle cursor-grab active:cursor-grabbing text-on-surface-variant/50 hover:text-on-surface-variant p-1">
                    <span class="material-symbols-rounded text-lg">drag_indicator</span>
                </div>
                ${imgHtml}
                <div>
                    <div class="font-bold text-sm text-on-surface leading-tight">${ex.name}</div>
                    <div class="text-[10px] text-on-surface-variant">${ex.duration}s</div>
                </div>
            </div>
            <button onclick="removeExerciseFromSession('${ex.instanceId}')" class="p-2 text-error/70 hover:text-error transition-colors rounded-full hover:bg-error-container/50">
                <span class="material-symbols-rounded text-sm">remove</span>
            </button>
        </div>`;
    });

    container.innerHTML = html;
}

async function saveSession() {
    const name = document.getElementById('newSessionName').value.trim();
    if (!name) {
        alert("Lütfen seans adı girin.");
        return;
    }
    if (currentSessionExercises.length === 0) {
        alert("Lütfen seansa en az bir hareket ekleyin.");
        return;
    }

    const sessionData = {
        name,
        type: currentSessionType,
        movements: currentSessionExercises,
        createdAt: serverTimestamp()
    };

    try {
        const collectionName = currentSessionType === 'core' ? 'coreSessions' : 'stretchSessions';
        const sessionsRef = collection(db, "users", auth.currentUser.uid, collectionName);
        await addDoc(sessionsRef, sessionData);
        closeCreateSessionSheet();
        alert("Seans başarıyla kaydedildi!");
    } catch(err) {
        console.error("Error saving session:", err);
        alert("Kaydedilirken hata oluştu.");
    }
}


window.toggleMizAccordion = function(headerElement, key, type, event) {
    if (event && event.target.closest('button')) {
        return;
    }
    const parent = headerElement.parentElement;
    parent.classList.toggle('expanded');

    // Update state sets
    let stateSet;
    if (type === 'split') stateSet = _openSplitAccordions;
    else if (type === 'day') stateSet = _openDayAccordions;
    else if (type === 'ex') stateSet = _openExAccordions;

    if (stateSet) {
        if (parent.classList.contains('expanded')) {
            stateSet.add(key);
        } else {
            stateSet.delete(key);
        }
    }

    const content = headerElement.nextElementSibling;
    if (parent.classList.contains('expanded')) {
        content.classList.add("expanded");
        content.style.maxHeight = content.scrollHeight + 500 + "px";
    } else {
        content.classList.remove("expanded");
        content.style.maxHeight = null;
    }

    updateMizParentHeights(parent);
};

window.updateMizParentHeights = function(element) {
    let current = element.parentElement;
    while (current) {
        if (current.classList.contains('accordion-content') && current.style.maxHeight) {
             current.style.maxHeight = current.scrollHeight + 500 + "px";
        }
        current = current.parentElement;
    }
};

async function addDayToExistingSplit(splitId) {
    if(!auth.currentUser) return;
    const splitIndex = splits.findIndex(s => s.id === splitId);
    if(splitIndex === -1) return;

    const split = splits[splitIndex];
    const newDay = {
        id: 'day_' + Date.now(),
        name: `Gün ${split.days.length + 1}`,
        exercises: []
    };
    split.days.push(newDay);

    try {
        const docRef = doc(db, "users", auth.currentUser.uid, "splits", splitId);
        await updateDoc(docRef, {
            days: split.days,
            updatedAt: serverTimestamp()
        });

        // Ensure the split and the new day accordions are open so user sees it
        _openSplitAccordions.add(splitId);
        _openDayAccordions.add(`${splitId}-${split.days.length - 1}`);

        renderSplitEditView();
    } catch(err) {
        console.error("Error adding day:", err);
        alert("Gün eklenirken bir hata oluştu.");
    }
}

async function removeDayFromSplit(splitId, dayIdx) {
    if(!auth.currentUser) return;
    const splitIndex = splits.findIndex(s => s.id === splitId);
    if(splitIndex === -1) return;

    if(!confirm("Bu günü silmek istediğinize emin misiniz?")) return;

    const split = splits[splitIndex];
    split.days.splice(dayIdx, 1);

    try {
        const docRef = doc(db, "users", auth.currentUser.uid, "splits", splitId);
        await updateDoc(docRef, {
            days: split.days,
            updatedAt: serverTimestamp()
        });

        renderSplitEditView();
    } catch(err) {
        console.error("Error removing day:", err);
        alert("Gün silinirken bir hata oluştu.");
    }
}


window.updateSplitDayName = function(splitId, dayIdx, newName) {
    const split = splits.find(s => s.id === splitId);
    if(split && split.days[dayIdx]) {
        split.days[dayIdx].name = newName;
        persistSplitEdit(split);
    }
};


function openSimpleNewSplitModal() {
    const modal = document.getElementById('newSplitModal');
    const content = document.getElementById('newSplitModalContent');
    const input = document.getElementById('new-split-name');
    
    if(modal && content) {
        modal.classList.remove('hidden');
        if(input) { input.value = ""; } // clear input
        // Small delay to allow display:block to apply before animating opacity/transform
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            content.classList.remove('translate-y-full');
            if(input) input.focus();
        }, 10);
    }
}

function closeSimpleNewSplitModal() {
    const modal = document.getElementById('newSplitModal');
    const content = document.getElementById('newSplitModalContent');
    if(modal && content) {
        modal.classList.add('opacity-0');
        content.classList.add('translate-y-full');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }
}

async function saveSimpleNewSplit() {
    const nameInput = document.getElementById('new-split-name').value.trim();
    if(!nameInput) {
        alert("Lütfen split adı girin.");
        return;
    }

    const saveBtn = document.getElementById('save-split-btn');
    saveBtn.disabled = true;
    saveBtn.innerText = "Oluşturuluyor...";

    try {
        const newSplitId = 'split_' + Date.now();
        const newSplit = {
            id: newSplitId,
            name: nameInput,
            days: [], 
            createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, "users", currentUid, "splits", newSplitId), newSplit);
        
        // If already in splits array (shouldn't be), update it
        const existingIdx = splits.findIndex(s => s.id === newSplitId);
        if (existingIdx !== -1) {
            splits[existingIdx] = newSplit;
        } else {
            splits.push(newSplit);
        }

        if(splits.length === 1 || !activeSplitId) {
            activeSplitId = newSplitId;
            localStorage.setItem(`miz_activeSplit_${currentUid}`, activeSplitId);
        }

        // Update all UI immediately — no refresh needed
        renderSplitView();
        renderSplitEditView();
        closeSimpleNewSplitModal();
        
        // Navigate to split edit view so user can add days to the new split
        setTimeout(() => {
            openSplitEdit();
        }, 300);

    } catch(err) {
        console.error(err);
        alert("Oluşturulurken hata meydana geldi.");
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<span class="font-label-md text-label-md text-body-lg font-body-lg">Oluştur</span><span class="material-symbols-rounded icon-md">add_circle</span>`;
    }
}
