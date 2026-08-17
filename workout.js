import { auth, db } from "./firebase-config.js";
import { formatDate, formatCurrency } from "./utils.js";
import { collection, doc, addDoc, setDoc, getDocs, getDoc, query, orderBy, limit, serverTimestamp, where, onSnapshot, updateDoc, deleteDoc, deleteField } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { escapeHtml, handleFormSubmit } from "./utils.js";
import { registerListener } from "./listenerManager.js";
import { openActiveSession, closeActiveSession } from "./activeSession.js?v=5";

let currentUid = null;
let splits = [];
let activeSplitId = null;
let activeDayId = null;
let currentWorkoutLog = null; 
let lastWorkoutLog = null; 

let callback = null; 

let unsubSplits = null;
let unsubLogs = null;
let unsubStretches = null;
let stretches = [];
let currentStretchImageBase64 = null;
let editingStretchId = null;
let editingStretchIsDefault = false;
let hiddenDefaultStretchIds = new Set(JSON.parse(localStorage.getItem('hiddenDefaultStretches') || '[]'));

const DEFAULT_STRETCHES = [
    { id: 'def_catcow', name: 'Cat-Cow Stretch', duration: 30, imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_cat_cow_stretch_fitness_exercise_a/screen.jpg', isDefault: true },
    { id: 'def_cobra', name: 'Cobra Pose (Abdominal Stretch)', duration: 30, imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_cobra_pose_fitness_exercise_a_person/screen.jpg', isDefault: true },
    { id: 'def_threadneedle', name: 'Thread the Needle Stretch', duration: 30, imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_thread_the_needle_fitness_exercise_a/screen.jpg', isDefault: true },
    { id: 'def_doorwaychest', name: 'Doorway Chest Stretch', duration: 30, imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_doorway_chest_stretch_fitness_exercise/screen.jpg', isDefault: true },
    { id: 'def_wallangel', name: 'Wall Angel (Scapular Slide)', duration: 30, imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_wall_angel_fitness_exercise_a_person/screen.jpg', isDefault: true },
    { id: 'def_crossbody', name: 'Cross-Body Shoulder Stretch', duration: 30, imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_cross_body_shoulder_stretch_fitness/screen.jpg', isDefault: true },
    { id: 'def_overheadtri', name: 'Overhead Triceps Stretch', duration: 30, imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_an_overhead_triceps_stretch_fitness/screen.jpg', isDefault: true },
    { id: 'def_wallbicep', name: 'Wall Biceps Stretch', duration: 30, imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_wall_biceps_stretch_fitness_exercise_a/screen.jpg', isDefault: true },
    { id: 'def_forearmflex', name: 'Forearm Flexor Stretch', duration: 30, imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_forearm_flexor_stretch_fitness/screen.jpg', isDefault: true },
    { id: 'def_forearmext', name: 'Forearm Extensor Stretch', duration: 30, imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_forearm_extensor_stretch_fitness/screen.jpg', isDefault: true },
    { id: 'def_kneelinghip', name: 'Kneeling Hip Flexor Stretch', duration: 30, imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_kneeling_hip_flexor_stretch_fitness/screen.jpg', isDefault: true },
    { id: 'def_standingquad', name: 'Standing Quadriceps Stretch', duration: 30, imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_standing_quadriceps_stretch_fitness/screen.jpg', isDefault: true },
    { id: 'def_supineham', name: 'Supine Hamstring Stretch', duration: 30, imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_supine_hamstring_stretch_fitness/screen.jpg', isDefault: true },
    { id: 'def_figure4', name: 'Figure 4 Glute Stretch', duration: 30, imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_figure_4_glute_stretch_fitness/screen.jpg', isDefault: true },
    { id: 'def_pigeon', name: 'Pigeon Pose Stretch', duration: 30, imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_pigeon_pose_fitness_exercise_a_person/screen.jpg', isDefault: true },
    { id: 'def_seatedspinal', name: 'Seated Spinal Twist Stretch', duration: 30, imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_seated_spinal_twist_fitness_exercise_a/screen.jpg', isDefault: true },
    { id: 'def_downdog', name: 'Downward-Facing Dog', duration: 30, imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_downward_facing_dog_fitness_exercise_a/screen.jpg', isDefault: true },
    { id: 'def_childspose', name: "Child's Pose", duration: 30, imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_child_s_pose_fitness_exercise_a_person/screen.jpg', isDefault: true },
    { id: 'def_wallcalf', name: 'Wall Calf Stretch', duration: 30, imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_wall_calf_stretch_fitness_exercise_a/screen.jpg', isDefault: true },
    { id: 'def_butterfly', name: 'Butterfly Stretch', duration: 30, imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_butterfly_stretch_fitness_exercise_a/screen.jpg', isDefault: true }
];

let unsubCores = null;
let cores = [];
let currentCoreImageBase64 = null;
let editingCoreId = null;

let unsubStretchSessions = null;
let stretchSessions = [];
let activeStretchSessionId = localStorage.getItem('activeStretchSessionId') || null;

let unsubCoreSessions = null;
let coreSessions = [];
let activeCoreSessionId = localStorage.getItem('activeCoreSessionId') || null;

let sessionDraftMovements = []; // [{id, name, duration, imageBase64}]
let editingSessionId = null;
let currentStretchTab = 'movements';

let coreSessionDraftMovements = [];
let editingCoreSessionId = null;
let currentCoreTab = 'movements';

document.addEventListener('click', (e) => {
    const actionBtn = e.target.closest('[data-action]');
    if (!actionBtn) return;
    const action = actionBtn.getAttribute('data-action');

    if (action === 'openSplitEdit') openSplitEdit();
    else if (action === 'closeSplitEdit') closeSplitEdit();
    else if (action === 'openStretchingView') openStretchingView();
    else if (action === 'closeStretchingView') closeStretchingView();
    else if (action === 'openCoreView') openCoreView();
    else if (action === 'closeCoreView') closeCoreView();
    else if (action === 'openAddStretchModal') openAddStretchModal();
    else if (action === 'closeAddStretchModal') closeAddStretchModal();
    else if (action === 'saveNewStretch') saveStretch();
    else if (action === 'deleteStretch') { e.stopPropagation(); deleteStretch(actionBtn.getAttribute('data-stretch-id')); }
    else if (action === 'editStretch') { e.stopPropagation(); editStretch(actionBtn.getAttribute('data-stretch-id')); }
    else if (action === 'triggerStretchImageUpload') document.getElementById('stretch-image-input').click();
    
    else if (action === 'openAddCoreModal') openAddCoreModal();
    else if (action === 'closeAddCoreModal') closeAddCoreModal();
    else if (action === 'saveNewCore') saveCore();
    else if (action === 'deleteCore') { e.stopPropagation(); deleteCore(actionBtn.getAttribute('data-core-id')); }
    else if (action === 'editCore') { e.stopPropagation(); editCore(actionBtn.getAttribute('data-core-id')); }
    else if (action === 'triggerCoreImageUpload') document.getElementById('core-image-input').click();

    else if (action === 'switchStretchTab') switchStretchTab(actionBtn.getAttribute('data-tab'));
    else if (action === 'openAddSessionModal') openAddSessionModal();
    else if (action === 'closeAddSessionModal') closeAddSessionModal();
    else if (action === 'saveStretchSession') saveStretchSession();
    else if (action === 'deleteStretchSession') { e.stopPropagation(); deleteStretchSession(actionBtn.getAttribute('data-session-id')); }
    else if (action === 'editStretchSession') { e.stopPropagation(); editStretchSession(actionBtn.getAttribute('data-session-id')); }
    else if (action === 'setActiveStretchSession') { e.stopPropagation(); setActiveStretchSession(actionBtn.getAttribute('data-session-id')); }
    else if (action === 'toggleSessionMovement') toggleSessionMovement(actionBtn.getAttribute('data-move-id'));
    else if (action === 'removeSessionMovement') { e.stopPropagation(); removeSessionMovement(actionBtn.getAttribute('data-move-id')); }

    else if (action === 'switchCoreTab') switchCoreTab(actionBtn.getAttribute('data-tab'));
    else if (action === 'openAddCoreSessionModal') openAddCoreSessionModal();
    else if (action === 'closeAddCoreSessionModal') closeAddCoreSessionModal();
    else if (action === 'saveCoreSession') saveCoreSession();
    else if (action === 'deleteCoreSession') { e.stopPropagation(); deleteCoreSession(actionBtn.getAttribute('data-session-id')); }
    else if (action === 'editCoreSession') { e.stopPropagation(); editCoreSession(actionBtn.getAttribute('data-session-id')); }
    else if (action === 'setActiveCoreSession') { e.stopPropagation(); setActiveCoreSession(actionBtn.getAttribute('data-session-id')); }
    else if (action === 'toggleCoreSessionMovement') toggleCoreSessionMovement(actionBtn.getAttribute('data-move-id'));
    else if (action === 'removeCoreSessionMovement') { e.stopPropagation(); removeCoreSessionMovement(actionBtn.getAttribute('data-move-id')); }

    else if (action === 'openStretchPlayer') openStretchPlayer();
    else if (action === 'closeStretchPlayer') closeStretchPlayer();
    else if (action === 'stretchPlayerPauseToggle') _spPauseToggle();
    else if (action === 'stretchPlayerPrev') stretchPlayerGoPrev();
    else if (action === 'stretchPlayerNext') stretchPlayerGoNext(true);
    else if (action === 'stretchPlayerEnd') stretchPlayerEnd();
    
    else if (action === 'openCorePlayer') openCorePlayer();
    else if (action === 'closeCorePlayer') closeCorePlayer();
    else if (action === 'corePlayerPauseToggle') _cpPauseToggle();
    else if (action === 'corePlayerPrev') corePlayerGoPrev();
    else if (action === 'corePlayerNext') corePlayerGoNext(true);
    else if (action === 'corePlayerEnd') corePlayerEnd();

    else if (action === 'closeExerciseHistory') closeExerciseHistory();
    else if (action === 'closeSplitSelectionModal') closeSplitSelectionModal();
    else if (action === 'closeSplitSelectionAndOpenModal') { closeSplitSelectionModal(); setTimeout(openSplitModal, 300); }
    else if (action === 'closeSplitModalAndOpenCreate') { closeSplitModal(); setTimeout(openCreateSplitView, 300); }
    else if (action === 'closeCreateSplitView') closeCreateSplitView();
    else if (action === 'changeExerciseSets') changeExerciseSets(actionBtn.getAttribute('data-split-id'), parseInt(actionBtn.getAttribute('data-day-idx'), 10), parseInt(actionBtn.getAttribute('data-ex-idx'), 10), parseInt(actionBtn.getAttribute('data-delta'), 10));
    else if (action === 'removeExerciseFromSplit') removeExerciseFromSplit(actionBtn.getAttribute('data-split-id'), parseInt(actionBtn.getAttribute('data-day-idx'), 10), parseInt(actionBtn.getAttribute('data-ex-idx'), 10));
    else if (action === 'toggleDayAccordion') toggleDayAccordion(actionBtn.getAttribute('data-accordion-key'), actionBtn);
    else if (action === 'openExercisePickerForSplit') openExercisePickerForSplit(actionBtn.getAttribute('data-split-id'), parseInt(actionBtn.getAttribute('data-day-idx'), 10));
    else if (action === 'removeExerciseFromNewDay') removeExerciseFromNewDay(parseInt(actionBtn.getAttribute('data-day-idx'), 10), parseInt(actionBtn.getAttribute('data-ex-idx'), 10));
    else if (action === 'removeDayFromNewSplit') removeDayFromNewSplit(parseInt(actionBtn.getAttribute('data-day-idx'), 10));
    else if (action === 'openExercisePicker') openExercisePicker(actionBtn.getAttribute('data-day-id'));
    else if (action === 'selectSplit') selectSplit(actionBtn.getAttribute('data-split-id'));
    else if (action === 'openEditSplitView') { e.stopPropagation(); openEditSplitView(actionBtn.getAttribute('data-split-id')); }
    else if (action === 'startActiveSession') startActiveSession();
    else if (action === 'deleteSplit') { e.stopPropagation(); deleteSplit(actionBtn.getAttribute('data-split-id')); }
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

    const stretchesRef = collection(db, "users", uid, "stretches");
    unsubStretches = registerListener(onSnapshot(stretchesRef, (snap) => {
        stretches = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderStretches();
    }));

    const coresRef = collection(db, "users", uid, "cores");
    unsubCores = registerListener(onSnapshot(coresRef, (snap) => {
        cores = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderCores();
    }));

    const stretchSessionsRef = collection(db, "users", uid, "stretchSessions");
    unsubStretchSessions = registerListener(onSnapshot(stretchSessionsRef, (snap) => {
        stretchSessions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderStretchSessions();
    }));

    const coreSessionsRef = collection(db, "users", uid, "coreSessions");
    unsubCoreSessions = registerListener(onSnapshot(coreSessionsRef, (snap) => {
        coreSessions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderCoreSessions();
    }));

    // Setup image picker
    const imageInput = document.getElementById('stretch-image-input');
    if (imageInput) {
        imageInput.addEventListener('change', handleStretchImageUpload);
    }
    const coreImageInput = document.getElementById('core-image-input');
    if (coreImageInput) {
        coreImageInput.addEventListener('change', handleCoreImageUpload);
    }

    setupEventListeners();
}

export function clearWorkout() {
    if(unsubSplits) unsubSplits();
    if(unsubLogs) unsubLogs();
    if(unsubStretches) unsubStretches();
    if(unsubCores) unsubCores();
    if(unsubStretchSessions) unsubStretchSessions();
    if(unsubCoreSessions) unsubCoreSessions();
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
            bar.className = `h-1.5 rounded-full transition-all duration-200 cursor-pointer ${isActive ? 'bg-white w-10' : 'bg-white/30 w-8 hover:bg-white/60'}`;
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
        const title = item.querySelector('h3').innerText;
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
    const exName = btn.closest('.exercise-item').querySelector('h3').innerText;
    let favs = JSON.parse(localStorage.getItem(`miz_fav_exercises_${currentUid}`) || "[]");
    
    if (favs.includes(exName)) {
        favs = favs.filter(f => f !== exName);
    } else {
        favs.push(exName);
    }
    localStorage.setItem(`miz_fav_exercises_${currentUid}`, JSON.stringify(favs));
    initFavoritesUI();
}

// override to also init favorites
const _oldFilterExercises = window.filterExercises; // or just write it here
function _setupFavoritesOnLoad() {
    // wait for DOM then init
    setTimeout(initFavoritesUI, 100);
}
_setupFavoritesOnLoad();

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
function openSplitEdit() {
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
                            <button data-action="changeExerciseSets" data-split-id="${activeSplit.id}" data-day-idx="${dayIdx}" data-ex-idx="${exIdx}" data-delta="-1"
                                class="w-7 h-7 rounded-full bg-surface-container-high flex items-center justify-center hover:bg-primary-container/40 transition-colors text-on-surface font-bold text-lg leading-none">−</button>
                            <span class="font-label-sm text-on-surface w-10 text-center whitespace-nowrap" id="sets-lbl-${activeSplit.id}-${dayIdx}-${exIdx}">${ex.defaultSets || 3} set</span>
                            <button data-action="changeExerciseSets" data-split-id="${activeSplit.id}" data-day-idx="${dayIdx}" data-ex-idx="${exIdx}" data-delta="1"
                                class="w-7 h-7 rounded-full bg-surface-container-high flex items-center justify-center hover:bg-primary-container/40 transition-colors text-on-surface font-bold text-lg leading-none">+</button>
                        </div>
                        <!-- Sil -->
                        <button data-action="removeExerciseFromSplit" data-split-id="${activeSplit.id}" data-day-idx="${dayIdx}" data-ex-idx="${exIdx}"
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
                    data-action="toggleDayAccordion" data-accordion-key="${accordionKey}">
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
                    <button data-action="openExercisePickerForSplit" data-split-id="${activeSplit.id}" data-day-idx="${dayIdx}"
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

function toggleDayAccordion(key, headerBtn) {
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
        await setDoc(doc(db, "users", currentUid, "splits", split.id), split);
        // Yerel listeyi de güncelle
        const idx = splits.findIndex(s => s.id === split.id);
        if(idx !== -1) splits[idx] = split;
    } catch(e) {
        console.error("Split kayıt hatası:", e);
    }
}

function openCreateSplitView() {
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

function closeCreateSplitView() {
    document.getElementById('view-create-split').classList.add('hidden');
    document.getElementById('view-split-edit').classList.remove('hidden');
};

function addDayToNewSplit() {
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
                        <button data-action="removeExerciseFromNewDay" data-day-idx="${index}" data-ex-idx="${exIdx}" class="text-error/80 hover:text-error p-1">
                            <span class="material-symbols-outlined" style="font-size: 18px">close</span>
                        </button>
                    </div>
                `;
            });
        }
        
        div.innerHTML = `
            <div class="flex items-center justify-between mb-sm">
                <input type="text" value="${day.name}" onchange="updateNewDayName(${index}, this.value)" class="font-title-md text-title-md font-bold text-on-surface bg-transparent outline-none w-3/4 border-b border-transparent focus:border-outline-variant">
                <button data-action="removeDayFromNewSplit" data-day-idx="${index}" class="text-on-surface-variant hover:text-error transition-colors p-1">
                    <span class="material-symbols-outlined" style="font-size: 20px">delete</span>
                </button>
            </div>
            <div class="mb-3">
                ${exHtml}
            </div>
            <button data-action="openExercisePicker" data-day-id="${day.id}" class="w-full py-2 bg-primary-container/30 text-primary rounded-lg font-label-sm hover:bg-primary-container/50 transition-colors flex items-center justify-center gap-1">
                <span class="material-symbols-outlined text-[18px]">add</span> Egzersiz Ekle
            </button>
        `;
        container.appendChild(div);
    });
}

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

function openSplitModal() {
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
            <div class="flex items-center justify-between mb-2" data-action="selectSplit" data-split-id="${split.id}">
                <div>
                    <div class="font-title-md text-on-surface font-bold">${split.name}</div>
                    <div class="font-label-sm text-on-surface-variant">${split.days ? split.days.length : 0} Gün</div>
                </div>
                ${isAct ? '<span class="material-symbols-outlined text-primary">check_circle</span>' : '<span class="material-symbols-outlined text-outline">radio_button_unchecked</span>'}
            </div>
            <div class="flex justify-end gap-2 mt-2 pt-2 border-t border-outline-variant/30">
                <button data-action="openEditSplitView" data-split-id="${split.id}" class="p-2 rounded-full text-primary hover:bg-primary-container/20 transition-colors flex items-center justify-center">
                    <span class="material-symbols-outlined text-sm">edit</span>
                </button>
                <button data-action="deleteSplit" data-split-id="${split.id}" class="p-2 rounded-full text-error hover:bg-error-container/20 transition-colors flex items-center justify-center">
                    <span class="material-symbols-outlined text-sm">delete</span>
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
        child.className = `flex flex-col p-4 rounded-xl border ${isSel ? 'border-primary bg-primary-container/10' : 'border-outline-variant bg-surface'} cursor-pointer hover:bg-surface-container-high transition-colors`;
        const icon = child.querySelector('.material-symbols-outlined.text-primary, .material-symbols-outlined.text-outline');
        if(icon) {
            icon.className = `material-symbols-outlined ${isSel ? 'text-primary' : 'text-outline'}`;
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

// ==========================================
// STRETCHING & CORE PLACEHOLDER VIEWS
// ==========================================

function openStretchingView() {
    document.getElementById('view-workout').classList.add('hidden');
    document.querySelectorAll('.view').forEach(v => {
        if(v.id !== 'view-stretching') v.classList.add('hidden');
    });
    document.getElementById('view-stretching').classList.remove('hidden');
}

function closeStretchingView() {
    document.getElementById('view-stretching').classList.add('hidden');
    document.getElementById('view-workout').classList.remove('hidden');
}

function openCoreView() {
    document.getElementById('view-workout').classList.add('hidden');
    document.querySelectorAll('.view').forEach(v => {
        if(v.id !== 'view-core') v.classList.add('hidden');
    });
    document.getElementById('view-core').classList.remove('hidden');
}

function closeCoreView() {
    document.getElementById('view-core').classList.add('hidden');
    document.getElementById('view-workout').classList.remove('hidden');
}

function openAddStretchModal(isEdit = false) {
    if (!isEdit) {
        editingStretchId = null;
        currentStretchImageBase64 = null;
        document.getElementById('stretch-name').value = '';
        document.getElementById('stretch-duration').value = '';
        document.getElementById('modal-title').textContent = "Yeni Hareket";
        
        const preview = document.getElementById('stretch-image-preview');
        const placeholder = document.getElementById('stretch-image-placeholder');
        if (preview && placeholder) {
            preview.src = "";
            preview.classList.add('hidden');
            placeholder.classList.remove('hidden');
        }
    }

    const modal = document.getElementById('addStretchModal');
    const content = document.getElementById('addStretchModalContent');
    modal.classList.remove('hidden');
    // small delay for transition
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        content.classList.remove('translate-y-full');
    }, 10);
}

function closeAddStretchModal() {
    const modal = document.getElementById('addStretchModal');
    const content = document.getElementById('addStretchModalContent');
    
    modal.classList.add('opacity-0');
    content.classList.add('translate-y-full');
    
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

// ==========================================
// STRETCHES CRUD & RENDERING
// ==========================================

function renderStretches() {
    const container = document.getElementById('stretching-list-container');
    if (!container) return;
    
    const allStretches = [...DEFAULT_STRETCHES, ...stretches];
    
    if (allStretches.length === 0) {
        container.innerHTML = `<p class="text-center text-on-surface-variant font-body-md mt-4">Henüz hareket eklenmedi.</p>`;
        return;
    }
    
    let html = '';
    
    // Group into defaults and customs for better UI
    const visibleDefaults = DEFAULT_STRETCHES.filter(s => !hiddenDefaultStretchIds.has(s.id));
    if (visibleDefaults.length > 0) {
        html += `<h3 class="font-title-sm text-on-surface-variant mb-2 mt-4 px-2">Temel Hareketler</h3>`;
        visibleDefaults.forEach(stretch => {
            html += generateStretchCard(stretch);
        });
    }
    
    if (stretches.length > 0) {
        html += `<h3 class="font-title-sm text-on-surface-variant mb-2 mt-4 px-2">Senin Eklediklerin</h3>`;
        stretches.forEach(stretch => {
            html += generateStretchCard(stretch);
        });
    }
    
    container.innerHTML = html;
}

function generateStretchCard(stretch) {
    return `
        <div class="bg-surface-container-low rounded-xl p-md flex items-center gap-md">
            <div class="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-surface-container-highest">
                ${stretch.imageBase64 ? `<img alt="${escapeHtml(stretch.name)}" class="w-full h-full object-cover" src="${stretch.imageBase64}"/>` : ''}
            </div>
            <div class="flex-1 flex flex-col justify-center">
                <h3 class="font-body-lg text-body-lg font-medium text-on-surface">${escapeHtml(stretch.name)}</h3>
                <div class="flex items-center gap-2 mt-1">
                    <span class="text-on-surface-variant font-label-sm text-label-sm flex items-center gap-1">
                        <span class="material-symbols-outlined text-[14px]" data-icon="timer">timer</span> ${stretch.duration}
                    </span>
                </div>
            </div>
            <div class="flex items-center gap-sm flex-shrink-0">
                <button data-action="editStretch" data-stretch-id="${stretch.id}" class="text-on-surface-variant hover:text-primary transition-colors p-1 rounded-full hover:bg-surface-variant active:scale-95">
                    <span class="material-symbols-outlined text-[20px]" data-icon="edit">edit</span>
                </button>
                <button data-action="deleteStretch" data-stretch-id="${stretch.id}" class="text-on-surface-variant hover:text-error transition-colors p-1 rounded-full hover:bg-surface-variant active:scale-95">
                    <span class="material-symbols-outlined text-[20px]" data-icon="delete">delete</span>
                </button>
            </div>
        </div>
    `;
}

function handleStretchImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 200;
            const MAX_HEIGHT = 200;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            currentStretchImageBase64 = canvas.toDataURL('image/jpeg', 0.8);
            
            const preview = document.getElementById('stretch-image-preview');
            const placeholder = document.getElementById('stretch-image-placeholder');
            
            if (preview && placeholder) {
                preview.src = currentStretchImageBase64;
                preview.classList.remove('hidden');
                placeholder.classList.add('hidden');
            }
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

async function saveStretch() {
    if (!currentUid) return;
    const nameInput = document.getElementById('stretch-name').value.trim();
    const durationInput = document.getElementById('stretch-duration').value.trim();
    
    if (!nameInput || !durationInput) {
        alert('Lütfen hareket adı ve süresi girin.');
        return;
    }
    
    const stretchData = {
        name: nameInput,
        duration: parseInt(durationInput, 10) || 30,
        imageBase64: currentStretchImageBase64 || null,
        updatedAt: serverTimestamp()
    };
    
    try {
        if (editingStretchId) {
            await updateDoc(doc(db, "users", currentUid, "stretches", editingStretchId), stretchData);
        } else {
            stretchData.createdAt = serverTimestamp();
            await addDoc(collection(db, "users", currentUid, "stretches"), stretchData);
        }
        
        closeAddStretchModal();
    } catch (e) {
        console.error("Error saving stretch: ", e);
        alert("Hareket kaydedilirken bir hata oluştu.");
    }
}

function editStretch(id) {
    // Check custom stretches first, then defaults
    let stretch = stretches.find(s => s.id === id);
    editingStretchIsDefault = false;
    
    if (!stretch) {
        stretch = DEFAULT_STRETCHES.find(s => s.id === id);
        editingStretchIsDefault = true;
    }
    if (!stretch) return;
    
    // For defaults: don't set editingStretchId so it saves as NEW Firestore doc
    editingStretchId = editingStretchIsDefault ? null : id;
    
    document.getElementById('stretch-name').value = stretch.name;
    document.getElementById('stretch-duration').value = stretch.duration;
    
    currentStretchImageBase64 = stretch.imageBase64 || null;
    
    const preview = document.getElementById('stretch-image-preview');
    const placeholder = document.getElementById('stretch-image-placeholder');
    
    if (currentStretchImageBase64) {
        preview.src = currentStretchImageBase64;
        preview.classList.remove('hidden');
        placeholder.classList.add('hidden');
    } else {
        preview.src = "";
        preview.classList.add('hidden');
        placeholder.classList.remove('hidden');
    }
    
    document.getElementById('modal-title').textContent = "Hareketi Düzenle";
    openAddStretchModal(true);
}

async function deleteStretch(id) {
    if (!confirm("Bu hareketi silmek istediğinize emin misiniz?")) return;
    
    const isDefault = DEFAULT_STRETCHES.some(s => s.id === id);
    
    if (isDefault) {
        // Hide default from list via localStorage
        hiddenDefaultStretchIds.add(id);
        localStorage.setItem('hiddenDefaultStretches', JSON.stringify([...hiddenDefaultStretchIds]));
        renderStretches();
        return;
    }
    
    if (!currentUid) return;
    try {
        await deleteDoc(doc(db, "users", currentUid, "stretches", id));
    } catch (e) {
        console.error("Error deleting stretch: ", e);
        alert("Hareket silinirken bir hata oluştu.");
    }
}

// ==========================================
// CORE CRUD & RENDERING
// ==========================================

function openAddCoreModal(isEdit = false) {
    if (!isEdit) {
        editingCoreId = null;
        currentCoreImageBase64 = null;
        document.getElementById('core-name').value = '';
        document.getElementById('core-duration').value = '';
        document.getElementById('core-modal-title').textContent = "Yeni Hareket";
        
        const preview = document.getElementById('core-image-preview');
        const placeholder = document.getElementById('core-image-placeholder');
        if (preview && placeholder) {
            preview.src = "";
            preview.classList.add('hidden');
            placeholder.classList.remove('hidden');
        }
    }

    const modal = document.getElementById('addCoreModal');
    const content = document.getElementById('addCoreModalContent');
    modal.classList.remove('hidden');
    // small delay for transition
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        content.classList.remove('translate-y-full');
    }, 10);
}

function closeAddCoreModal() {
    const modal = document.getElementById('addCoreModal');
    const content = document.getElementById('addCoreModalContent');
    
    modal.classList.add('opacity-0');
    content.classList.add('translate-y-full');
    
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

function renderCores() {
    const container = document.getElementById('core-list-container');
    if (!container) return;
    
    if (cores.length === 0) {
        container.innerHTML = `<p class="text-center text-on-surface-variant font-body-md mt-4">Henüz hareket eklenmedi.</p>`;
        return;
    }
    
    let html = '';
    cores.forEach(core => {
        html += `
            <div class="bg-surface-container-low rounded-xl p-md flex items-center gap-md">
                <div class="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-surface-container-highest">
                    ${core.imageBase64 ? `<img alt="${escapeHtml(core.name)}" class="w-full h-full object-cover" src="${core.imageBase64}"/>` : ''}
                </div>
                <div class="flex-1 flex flex-col justify-center">
                    <h3 class="font-body-lg text-body-lg font-medium text-on-surface">${escapeHtml(core.name)}</h3>
                    <div class="flex items-center gap-2 mt-1">
                        <span class="text-on-surface-variant font-label-sm text-label-sm flex items-center gap-1">
                            <span class="material-symbols-outlined text-[14px]" data-icon="timer">timer</span> ${core.duration}
                        </span>
                    </div>
                </div>
                <div class="flex items-center gap-sm flex-shrink-0">
                    <button data-action="editCore" data-core-id="${core.id}" class="text-on-surface-variant hover:text-primary transition-colors p-1 rounded-full hover:bg-surface-variant">
                        <span class="material-symbols-outlined" data-icon="edit">edit</span>
                    </button>
                    <button data-action="deleteCore" data-core-id="${core.id}" class="text-on-surface-variant hover:text-error transition-colors p-1 rounded-full hover:bg-surface-variant">
                        <span class="material-symbols-outlined" data-icon="delete">delete</span>
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function handleCoreImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 200;
            const MAX_HEIGHT = 200;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            currentCoreImageBase64 = canvas.toDataURL('image/jpeg', 0.8);
            
            const preview = document.getElementById('core-image-preview');
            const placeholder = document.getElementById('core-image-placeholder');
            
            if (preview && placeholder) {
                preview.src = currentCoreImageBase64;
                preview.classList.remove('hidden');
                placeholder.classList.add('hidden');
            }
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

async function saveCore() {
    if (!currentUid) return;
    const nameInput = document.getElementById('core-name').value.trim();
    const durationInput = document.getElementById('core-duration').value.trim();
    
    if (!nameInput || !durationInput) {
        alert('Lütfen hareket adı ve süresi/tekrarı girin.');
        return;
    }
    
    const coreData = {
        name: nameInput,
        duration: parseInt(durationInput, 10) || 30,
        imageBase64: currentCoreImageBase64 || null,
        updatedAt: serverTimestamp()
    };
    
    try {
        if (editingCoreId) {
            await updateDoc(doc(db, "users", currentUid, "cores", editingCoreId), coreData);
        } else {
            coreData.createdAt = serverTimestamp();
            await addDoc(collection(db, "users", currentUid, "cores"), coreData);
        }
        
        closeAddCoreModal();
    } catch (e) {
        console.error("Error saving core: ", e);
        alert("Hareket kaydedilirken bir hata oluştu.");
    }
}

function editCore(id) {
    const core = cores.find(s => s.id === id);
    if (!core) return;
    
    editingCoreId = id;
    
    document.getElementById('core-name').value = core.name;
    document.getElementById('core-duration').value = core.duration;
    
    currentCoreImageBase64 = core.imageBase64 || null;
    
    const preview = document.getElementById('core-image-preview');
    const placeholder = document.getElementById('core-image-placeholder');
    
    if (currentCoreImageBase64) {
        preview.src = currentCoreImageBase64;
        preview.classList.remove('hidden');
        placeholder.classList.add('hidden');
    } else {
        preview.src = "";
        preview.classList.add('hidden');
        placeholder.classList.remove('hidden');
    }
    
    document.getElementById('core-modal-title').textContent = "Hareketi Düzenle";
    openAddCoreModal(true);
}

async function deleteCore(id) {
    if (!currentUid) return;
    if (!confirm("Bu hareketi silmek istediğinize emin misiniz?")) return;
    
    try {
        await deleteDoc(doc(db, "users", currentUid, "cores", id));
    } catch (e) {
        console.error("Error deleting core: ", e);
        alert("Hareket silinirken bir hata oluştu.");
    }
}

// ==========================================
// STRETCH SESSIONS
// ==========================================

function switchStretchTab(tab) {
    currentStretchTab = tab;
    const movements = document.getElementById('stretch-panel-movements');
    const sessions = document.getElementById('stretch-panel-sessions');
    const tabMovements = document.getElementById('stretch-tab-movements');
    const tabSessions = document.getElementById('stretch-tab-sessions');
    if (!movements || !sessions) return;

    if (tab === 'movements') {
        movements.classList.remove('hidden');
        sessions.classList.add('hidden');
        tabMovements.className = 'flex-1 py-3 font-label-lg text-label-lg text-primary border-b-2 border-primary transition-colors';
        tabSessions.className = 'flex-1 py-3 font-label-lg text-label-lg text-on-surface-variant border-b-2 border-transparent hover:text-on-surface transition-colors';
    } else {
        movements.classList.add('hidden');
        sessions.classList.remove('hidden');
        tabMovements.className = 'flex-1 py-3 font-label-lg text-label-lg text-on-surface-variant border-b-2 border-transparent hover:text-on-surface transition-colors';
        tabSessions.className = 'flex-1 py-3 font-label-lg text-label-lg text-primary border-b-2 border-primary transition-colors';
        renderStretchSessions();
    }
}

function getAllStretchMovements() {
    const visibleDefaults = DEFAULT_STRETCHES.filter(s => !hiddenDefaultStretchIds.has(s.id));
    return [...visibleDefaults, ...stretches];
}

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
            class="flex items-center gap-3 p-2 rounded-lg transition-colors text-left w-full ${selected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-surface-container-low'}">
            <div class="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-surface-container-highest">
                ${m.imageBase64 ? `<img src="${m.imageBase64}" class="w-full h-full object-cover" alt="${escapeHtml(m.name)}"/>` : ''}
            </div>
            <span class="flex-1 font-body-md text-body-md text-on-surface truncate">${escapeHtml(m.name)}</span>
            <span class="material-symbols-outlined text-[18px] ${selected ? 'text-primary' : 'text-outline-variant'}" style="font-variation-settings: 'FILL' ${selected ? 1 : 0};">
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
        <div class="flex items-center gap-3 bg-surface-container-low rounded-lg p-2 cursor-grab active:cursor-grabbing session-drag-item"
            draggable="true" data-drag-idx="${i}">
            <span class="material-symbols-outlined text-outline text-[20px] select-none">drag_indicator</span>
            <div class="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-surface-container-highest">
                ${m.imageBase64 ? `<img src="${m.imageBase64}" class="w-full h-full object-cover" alt="${escapeHtml(m.name)}"/>` : ''}
            </div>
            <span class="flex-1 font-body-md text-body-md text-on-surface truncate">${escapeHtml(m.name)}</span>
            <span class="font-label-sm text-label-sm text-on-surface-variant">${m.duration}s</span>
            <button data-action="removeSessionMovement" data-move-id="${m.id}" class="text-on-surface-variant hover:text-error transition-colors p-1 rounded-full">
                <span class="material-symbols-outlined text-[18px]">close</span>
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

async function saveStretchSession() {
    if (!currentUid) return;
    const name = document.getElementById('session-name').value.trim();
    if (!name) { alert('Lütfen seans adı girin.'); return; }
    if (sessionDraftMovements.length === 0) { alert('En az bir hareket seçin.'); return; }

    const totalDuration = sessionDraftMovements.reduce((acc, m) => acc + (parseInt(m.duration) || 0), 0);
    const data = {
        name,
        movements: sessionDraftMovements,
        totalDuration,
        updatedAt: serverTimestamp()
    };

    try {
        if (editingSessionId) {
            await updateDoc(doc(db, "users", currentUid, "stretchSessions", editingSessionId), data);
        } else {
            data.createdAt = serverTimestamp();
            await addDoc(collection(db, "users", currentUid, "stretchSessions"), data);
        }
        closeAddSessionModal();
    } catch (e) {
        console.error("Error saving session:", e);
        alert("Seans kaydedilirken hata oluştu.");
    }
}

function editStretchSession(id) {
    const session = stretchSessions.find(s => s.id === id);
    if (!session) return;
    editingSessionId = id;
    sessionDraftMovements = [...(session.movements || [])];
    document.getElementById('session-name').value = session.name;
    document.getElementById('session-modal-title').textContent = 'Seans Düzenle';
    openAddSessionModal(true);
}

async function deleteStretchSession(id) {
    if (!currentUid) return;
    if (!confirm("Bu seansı silmek istediğinize emin misiniz?")) return;
    try {
        await deleteDoc(doc(db, "users", currentUid, "stretchSessions", id));
        if (activeStretchSessionId === id) {
            activeStretchSessionId = null;
            localStorage.removeItem('activeStretchSessionId');
        }
    } catch (e) {
        console.error("Error deleting session:", e);
        alert("Seans silinirken hata oluştu.");
    }
}

function setActiveStretchSession(id) {
    activeStretchSessionId = id;
    localStorage.setItem('activeStretchSessionId', id);
    renderStretchSessions();
}

function renderStretchSessions() {
    const container = document.getElementById('stretch-sessions-container');
    if (!container) return;

    if (stretchSessions.length === 0) {
        container.innerHTML = `<p class="text-center text-on-surface-variant font-body-md mt-4">Henüz seans eklenmedi.</p>`;
        return;
    }

    container.innerHTML = stretchSessions.map(session => {
        const isActive = session.id === activeStretchSessionId;
        const mins = Math.floor((session.totalDuration || 0) / 60);
        const secs = (session.totalDuration || 0) % 60;
        const durationStr = mins > 0 ? `${mins} dk ${secs > 0 ? secs + ' sn' : ''}` : `${secs} sn`;
        const moveCount = (session.movements || []).length;

        return `
        <div class="rounded-2xl p-4 flex flex-col gap-3 border transition-colors ${isActive ? 'bg-primary/8 border-primary/40' : 'bg-surface-container-low border-surface-variant/20'}">
            <!-- Header row -->
            <div class="flex items-start justify-between gap-2">
                <div class="flex-1">
                    <div class="flex items-center gap-2">
                        ${isActive ? `<span class="inline-flex items-center gap-1 bg-primary text-on-primary font-label-sm text-label-sm px-2 py-0.5 rounded-full text-[11px]">
                            <span class="material-symbols-outlined text-[12px]" style="font-variation-settings:'FILL' 1;">check_circle</span> Aktif
                        </span>` : ''}
                        <h3 class="font-title-sm text-title-sm font-semibold text-on-surface">${escapeHtml(session.name)}</h3>
                    </div>
                    <div class="flex items-center gap-3 mt-1">
                        <span class="flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm">
                            <span class="material-symbols-outlined text-[14px]">timer</span> ${durationStr}
                        </span>
                        <span class="flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm">
                            <span class="material-symbols-outlined text-[14px]">fitness_center</span> ${moveCount} hareket
                        </span>
                    </div>
                </div>
                <div class="flex items-center gap-1 flex-shrink-0">
                    ${!isActive ? `<button data-action="setActiveStretchSession" data-session-id="${session.id}"
                        class="text-on-surface-variant hover:text-primary transition-colors p-1.5 rounded-full hover:bg-surface-variant active:scale-95" title="Aktif Seans Yap">
                        <span class="material-symbols-outlined text-[20px]">play_circle</span>
                    </button>` : ''}
                    <button data-action="editStretchSession" data-session-id="${session.id}"
                        class="text-on-surface-variant hover:text-primary transition-colors p-1.5 rounded-full hover:bg-surface-variant active:scale-95">
                        <span class="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                    <button data-action="deleteStretchSession" data-session-id="${session.id}"
                        class="text-on-surface-variant hover:text-error transition-colors p-1.5 rounded-full hover:bg-surface-variant active:scale-95">
                        <span class="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                </div>
            </div>
            <!-- Movement Preview Strip -->
            ${moveCount > 0 ? `
            <div class="flex gap-1.5 overflow-x-auto hide-scrollbar">
                ${(session.movements || []).map(m => `
                    <div class="flex-shrink-0 flex flex-col items-center gap-1">
                        <div class="w-10 h-10 rounded-full overflow-hidden bg-surface-container-highest border border-surface-variant/30">
                            ${m.imageBase64 ? `<img src="${m.imageBase64}" class="w-full h-full object-cover" alt="${escapeHtml(m.name)}"/>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>` : ''}
        </div>`;
    }).join('');
}

// ==========================================
// STRETCH PLAYER
// ==========================================

let _spMovements = [];     // current session's movement list
let _spIdx = 0;            // current movement index
let _spTimeLeft = 0;       // seconds left for current movement
let _spTotalTime = 0;      // total duration of current movement
let _spInterval = null;    // setInterval handle
let _spPaused = false;
const CIRCUMFERENCE = 753.98; // 2 * π * 120

function _playBeep(freq = 880, duration = 0.3, vol = 0.4) {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    } catch(e) {}
}

function _playFinishBeep() {
    // Triple ascending beep on movement finish
    _playBeep(660, 0.15, 0.3);
    setTimeout(() => _playBeep(784, 0.15, 0.35), 180);
    setTimeout(() => _playBeep(1046, 0.25, 0.4), 360);
}

function openStretchPlayer() {
    // Decide which movements to use
    let movements = [];
    if (activeStretchSessionId) {
        const session = stretchSessions.find(s => s.id === activeStretchSessionId);
        if (session && session.movements && session.movements.length > 0) {
            movements = session.movements;
            const nameEl = document.getElementById('stretch-player-session-name');
            if (nameEl) nameEl.textContent = session.name;
        }
    }
    if (movements.length === 0) {
        // Fallback: use all visible movements
        movements = getAllStretchMovements();
        const nameEl = document.getElementById('stretch-player-session-name');
        if (nameEl) nameEl.textContent = 'Tüm Hareketler';
    }
    if (movements.length === 0) {
        alert('Önce Esneme Hareketleri sekmesinden hareket ekleyin veya bir seans oluşturun.');
        return;
    }

    _spMovements = movements;
    _spIdx = 0;
    _spPaused = false;

    // Find the currently active view and hide it
    const activeView = document.querySelector('.view:not(.hidden)');
    if (activeView && activeView.id !== 'view-stretch-player') {
        window._prevStretchView = activeView.id;
        activeView.classList.add('hidden');
    }

    const view = document.getElementById('view-stretch-player');
    view.classList.remove('hidden');
    // Ensure we start at the top of the player
    view.scrollTop = 0;

    _spLoadMovement(_spIdx);
    _spStartTimer();
}

function closeStretchPlayer() {
    _spStopTimer();
    const view = document.getElementById('view-stretch-player');
    view.classList.add('hidden');
    
    // Restore the previous view
    if (window._prevStretchView) {
        document.getElementById(window._prevStretchView).classList.remove('hidden');
        window._prevStretchView = null;
    } else {
        // Fallback
        document.getElementById('view-workout').classList.remove('hidden');
    }
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
}

function _spRenderProgressStrip(currentIdx) {
    const strip = document.getElementById('stretch-player-progress-strip');
    if (!strip) return;
    strip.innerHTML = _spMovements.map((_, i) => `
        <div class="flex-1 h-1 rounded-full transition-all duration-300 ${
            i < currentIdx ? 'bg-green-400' :
            i === currentIdx ? 'bg-green-400/80' :
            'bg-white/20'
        }"></div>
    `).join('');
}

function _spUpdateTimerUI() {
    const timeEl = document.getElementById('stretch-player-time');
    if (timeEl) timeEl.textContent = _spTimeLeft;
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

function stretchPlayerPauseToggle() {
    _spPaused = !_spPaused;
    const pauseIcon = document.getElementById('stretch-player-pause-icon');
    if (pauseIcon) pauseIcon.textContent = _spPaused ? 'play_arrow' : 'pause';
}

function stretchPlayerGoNext(userTriggered = true) {
    if (_spIdx >= _spMovements.length - 1) {
        // Session complete
        if (userTriggered) {
            closeStretchPlayer();
        } else {
            // Last movement finished naturally — play success beep and close
            _playBeep(1046, 0.5, 0.5);
            setTimeout(closeStretchPlayer, 800);
        }
        return;
    }
    _spIdx++;
    _spStopTimer();
    _spPaused = false;
    _spLoadMovement(_spIdx);
    _spStartTimer();
}

function stretchPlayerGoPrev() {
    if (_spIdx <= 0) return;
    _spIdx--;
    _spStopTimer();
    _spPaused = false;
    _spLoadMovement(_spIdx);
    _spStartTimer();
}


// ==========================================
// CORE SESSIONS & TABS
// ==========================================

function switchCoreTab(tab) {
    currentCoreTab = tab;
    document.getElementById('core-tab-movements').classList.toggle('text-primary', tab === 'movements');
    document.getElementById('core-tab-movements').classList.toggle('border-primary', tab === 'movements');
    document.getElementById('core-tab-movements').classList.toggle('text-on-surface-variant', tab !== 'movements');
    document.getElementById('core-tab-movements').classList.toggle('border-transparent', tab !== 'movements');

    document.getElementById('core-tab-sessions').classList.toggle('text-primary', tab === 'sessions');
    document.getElementById('core-tab-sessions').classList.toggle('border-primary', tab === 'sessions');
    document.getElementById('core-tab-sessions').classList.toggle('text-on-surface-variant', tab !== 'sessions');
    document.getElementById('core-tab-sessions').classList.toggle('border-transparent', tab !== 'sessions');

    if (tab === 'movements') {
        document.getElementById('core-panel-movements').classList.remove('hidden');
        document.getElementById('core-panel-sessions').classList.add('hidden');
    } else {
        document.getElementById('core-panel-movements').classList.add('hidden');
        document.getElementById('core-panel-sessions').classList.remove('hidden');
        renderCoreSessions();
    }
}

function renderCoreSessions() {
    const container = document.getElementById('core-sessions-container');
    if (!container) return;

    if (coreSessions.length === 0) {
        container.innerHTML = '<p class="text-center text-on-surface-variant mt-4 font-body-md">Henüz Core seansı eklenmemiş.</p>';
        return;
    }

    container.innerHTML = coreSessions.map(session => {
        const isActive = session.id === activeCoreSessionId;
        const totalSec = session.movements.reduce((acc, m) => acc + (parseInt(m.duration) || 0), 0);
        const totalMin = Math.ceil(totalSec / 60);

        return `
            <div class="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border ${isActive ? 'border-primary' : 'border-surface-variant/30'} flex flex-col gap-3 relative overflow-hidden">
                ${isActive ? '<div class="absolute top-0 right-0 bg-primary text-on-primary text-[10px] font-bold px-2 py-1 rounded-bl-lg uppercase tracking-wider">Aktif Seans</div>' : ''}
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <h3 class="font-title-md text-title-md font-semibold text-on-surface">${escapeHtml(session.name)}</h3>
                        <p class="font-body-sm text-body-sm text-on-surface-variant mt-1">${session.movements.length} hareket • ${totalMin} dk</p>
                    </div>
                </div>
                
                <div class="flex gap-2 mt-2">
                    <button data-action="setActiveCoreSession" data-session-id="${session.id}" 
                        class="flex-1 py-2 rounded-full font-label-md text-label-md transition-colors ${isActive ? 'bg-primary/20 text-primary' : 'bg-surface-variant text-on-surface-variant hover:bg-surface-container-high'}">
                        ${isActive ? 'Seçili' : 'Seç'}
                    </button>
                    <button data-action="editCoreSession" data-session-id="${session.id}" class="w-10 h-10 rounded-full bg-surface-variant text-on-surface-variant flex items-center justify-center hover:bg-surface-container-high transition-colors">
                        <span class="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                    <button data-action="deleteCoreSession" data-session-id="${session.id}" class="w-10 h-10 rounded-full bg-error/10 text-error flex items-center justify-center hover:bg-error/20 transition-colors">
                        <span class="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function openAddCoreSessionModal() {
    editingCoreSessionId = null;
    coreSessionDraftMovements = [];
    document.getElementById('core-session-name').value = '';
    document.getElementById('core-session-modal-title').textContent = "Yeni Core Seansı";
    
    renderCoreSessionMovementPicker();
    renderCoreSessionOrderedList();

    const modal = document.getElementById('addCoreSessionModal');
    const content = document.getElementById('addCoreSessionModalContent');
    modal.classList.remove('hidden');
    // small delay for transition
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        content.classList.remove('translate-y-full');
    }, 10);
}

function closeAddCoreSessionModal() {
    const modal = document.getElementById('addCoreSessionModal');
    const content = document.getElementById('addCoreSessionModalContent');
    
    modal.classList.add('opacity-0');
    content.classList.add('translate-y-full');
    
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

async function saveCoreSession() {
    if (!currentUid) return;
    
    const name = document.getElementById('core-session-name').value.trim();
    if (!name) { alert("Lütfen seans adı girin."); return; }
    if (coreSessionDraftMovements.length === 0) { alert("En az 1 hareket seçmelisiniz."); return; }

    const data = {
        name,
        movements: coreSessionDraftMovements
    };

    try {
        if (editingCoreSessionId) {
            await updateDoc(doc(db, "users", currentUid, "coreSessions", editingCoreSessionId), data);
        } else {
            data.createdAt = serverTimestamp();
            await addDoc(collection(db, "users", currentUid, "coreSessions"), data);
        }
        closeAddCoreSessionModal();
    } catch (e) {
        console.error("Error saving core session: ", e);
        alert("Kaydedilirken hata oluştu.");
    }
}

async function deleteCoreSession(id) {
    if (!currentUid || !confirm("Bu core seansını silmek istediğinize emin misiniz?")) return;
    try {
        await deleteDoc(doc(db, "users", currentUid, "coreSessions", id));
        if (activeCoreSessionId === id) {
            activeCoreSessionId = null;
            localStorage.removeItem('activeCoreSessionId');
        }
    } catch (e) {
        console.error("Error deleting core session: ", e);
    }
}

function editCoreSession(id) {
    const session = coreSessions.find(s => s.id === id);
    if (!session) return;

    editingCoreSessionId = id;
    document.getElementById('core-session-name').value = session.name;
    document.getElementById('core-session-modal-title').textContent = "Seansı Düzenle";
    coreSessionDraftMovements = JSON.parse(JSON.stringify(session.movements));

    renderCoreSessionMovementPicker();
    renderCoreSessionOrderedList();

    const modal = document.getElementById('addCoreSessionModal');
    const content = document.getElementById('addCoreSessionModalContent');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        content.classList.remove('translate-y-full');
    }, 10);
}

function setActiveCoreSession(id) {
    activeCoreSessionId = id;
    localStorage.setItem('activeCoreSessionId', id);
    renderCoreSessions();
}

function renderCoreSessionMovementPicker() {
    const picker = document.getElementById('core-session-movement-picker');
    if (!picker) return;

    if (cores.length === 0) {
        picker.innerHTML = '<p class="text-on-surface-variant font-body-sm">Önce Core Hareketleri eklemelisiniz.</p>';
        return;
    }

    picker.innerHTML = cores.map(m => {
        // Can be added multiple times, but we just provide an "Add" button
        return `
            <div class="flex items-center justify-between bg-surface-container-lowest border border-outline-variant/30 p-2 rounded-lg">
                <div class="flex items-center gap-3">
                    ${m.imageBase64 ? `<img src="${m.imageBase64}" class="w-10 h-10 rounded-md object-cover"/>` : `<div class="w-10 h-10 rounded-md bg-surface-variant flex items-center justify-center"><span class="material-symbols-outlined text-[20px] text-on-surface-variant">accessibility_new</span></div>`}
                    <div>
                        <p class="font-body-sm font-medium text-on-surface">${escapeHtml(m.name)}</p>
                        <p class="text-[12px] text-on-surface-variant">${m.duration}s</p>
                    </div>
                </div>
                <button data-action="toggleCoreSessionMovement" data-move-id="${m.id}" class="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20">
                    <span class="material-symbols-outlined text-[18px]">add</span>
                </button>
            </div>
        `;
    }).join('');
}

function toggleCoreSessionMovement(moveId) {
    const move = cores.find(m => m.id === moveId);
    if (!move) return;
    
    // Add to draft list
    coreSessionDraftMovements.push({
        id: move.id,
        name: move.name,
        duration: move.duration,
        imageBase64: move.imageBase64 || null,
        uid: Date.now().toString() + Math.random().toString() // unique instance id for reordering
    });
    
    renderCoreSessionOrderedList();
}

function removeCoreSessionMovement(uid) {
    coreSessionDraftMovements = coreSessionDraftMovements.filter(m => m.uid !== uid);
    renderCoreSessionOrderedList();
}

function renderCoreSessionOrderedList() {
    const list = document.getElementById('core-session-ordered-list');
    const totalEl = document.getElementById('core-session-total-duration');
    if (!list || !totalEl) return;

    if (coreSessionDraftMovements.length === 0) {
        list.innerHTML = '<p id="core-session-empty-hint" class="text-center text-on-surface-variant font-body-sm py-3">Yukarıdan hareket seçin</p>';
        totalEl.textContent = '0 dk';
        return;
    }

    const totalSec = coreSessionDraftMovements.reduce((acc, m) => acc + (parseInt(m.duration) || 0), 0);
    const totalMin = Math.ceil(totalSec / 60);
    totalEl.textContent = totalMin + ' dk';

    list.innerHTML = coreSessionDraftMovements.map((m, index) => `
        <div class="flex items-center justify-between bg-surface p-2 rounded-lg border border-outline-variant/30 shadow-sm" data-instance-uid="${m.uid}">
            <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-on-surface-variant cursor-grab drag-handle active:cursor-grabbing">drag_indicator</span>
                <span class="font-body-md font-bold text-on-surface w-4">${index + 1}.</span>
                <div>
                    <p class="font-body-sm font-medium text-on-surface">${escapeHtml(m.name)}</p>
                    <p class="text-[12px] text-on-surface-variant">${m.duration}s</p>
                </div>
            </div>
            <button data-action="removeCoreSessionMovement" data-move-id="${m.uid}" class="w-8 h-8 rounded-full text-error hover:bg-error/10 flex items-center justify-center transition-colors">
                <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
        </div>
    `).join('');

    initCoreSessionDragAndDrop();
}

function initCoreSessionDragAndDrop() {
    const list = document.getElementById('core-session-ordered-list');
    let draggedItem = null;

    Array.from(list.children).forEach(item => {
        if(item.id === 'core-session-empty-hint') return;

        item.setAttribute('draggable', true);

        item.addEventListener('dragstart', function(e) {
            draggedItem = item;
            setTimeout(() => item.classList.add('opacity-50'), 0);
        });

        item.addEventListener('dragend', function() {
            draggedItem.classList.remove('opacity-50');
            draggedItem = null;
            
            // Rebuild array based on new DOM order
            const newOrder = [];
            Array.from(list.children).forEach(child => {
                const uid = child.getAttribute('data-instance-uid');
                if (uid) {
                    const match = coreSessionDraftMovements.find(m => m.uid === uid);
                    if (match) newOrder.push(match);
                }
            });
            coreSessionDraftMovements = newOrder;
            renderCoreSessionOrderedList();
        });

        item.addEventListener('dragover', function(e) {
            e.preventDefault();
            const afterElement = getDragAfterElement(list, e.clientY);
            if (afterElement == null) {
                list.appendChild(draggedItem);
            } else {
                list.insertBefore(draggedItem, afterElement);
            }
        });
    });
}


// ==========================================
// CORE PLAYER ENGINE
// ==========================================

let _cpMovements = [];
let _cpIdx = 0;
let _cpTimeLeft = 0;
let _cpTotalTime = 0;
let _cpInterval = null;
let _cpPaused = false;

function openCorePlayer() {
    let movements = [];
    if (activeCoreSessionId) {
        const session = coreSessions.find(s => s.id === activeCoreSessionId);
        if (session && session.movements && session.movements.length > 0) {
            movements = session.movements;
            const nameEl = document.getElementById('core-player-session-name');
            if (nameEl) nameEl.textContent = session.name;
        }
    }
    if (movements.length === 0) {
        movements = cores;
        const nameEl = document.getElementById('core-player-session-name');
        if (nameEl) nameEl.textContent = 'Tüm Hareketler';
    }
    if (movements.length === 0) {
        alert('Önce Core Hareketleri ekleyin veya bir seans oluşturun.');
        return;
    }

    _cpMovements = movements;
    _cpIdx = 0;
    _cpPaused = false;

    // Find the currently active view and hide it
    const activeView = document.querySelector('.view:not(.hidden)');
    if (activeView && activeView.id !== 'view-core-player') {
        window._prevCoreView = activeView.id;
        activeView.classList.add('hidden');
    }

    const view = document.getElementById('view-core-player');
    view.classList.remove('hidden');
    view.scrollTop = 0;

    _cpLoadMovement(_cpIdx);
    _cpStartTimer();
}

function closeCorePlayer() {
    _cpStopTimer();
    const view = document.getElementById('view-core-player');
    view.classList.add('hidden');
    
    // Restore the previous view
    if (window._prevCoreView) {
        document.getElementById(window._prevCoreView).classList.remove('hidden');
        window._prevCoreView = null;
    } else {
        document.getElementById('view-workout').classList.remove('hidden');
    }
}

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

function _cpRenderProgressStrip(currentIdx) {
    const strip = document.getElementById('core-player-progress-strip');
    if (!strip) return;
    strip.innerHTML = _cpMovements.map((_, i) => `
        <div class="flex-1 h-1 rounded-full transition-all duration-300 ${
            i < currentIdx ? 'bg-white' :
            i === currentIdx ? 'bg-white/80' :
            'bg-white/20'
        }"></div>
    `).join('');
}

function _cpUpdateTimerUI() {
    const timeEl = document.getElementById('core-player-time');
    if (timeEl) timeEl.textContent = _cpTimeLeft;
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

function corePlayerGoNext(userTriggered = true) {
    if (_cpIdx >= _cpMovements.length - 1) {
        if (userTriggered) {
            closeCorePlayer();
        } else {
            _playBeep(1046, 0.5, 0.5);
            setTimeout(closeCorePlayer, 800);
        }
        return;
    }
    _cpIdx++;
    _cpStopTimer();
    _cpPaused = false;
    _cpLoadMovement(_cpIdx);
    _cpStartTimer();
}

function corePlayerGoPrev() {
    if (_cpIdx <= 0) return;
    _cpIdx--;
    _cpStopTimer();
    _cpPaused = false;
    _cpLoadMovement(_cpIdx);
    _cpStartTimer();
}

function corePlayerEnd() {
    closeCorePlayer();
}

