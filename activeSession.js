/**
 * activeSession.js
 * Active Workout Session module for "My Life" app.
 *
 * Conventions followed:
 * - Firebase v10 CDN imports (same as workout.js)
 * - registerListener() for all onSnapshot calls
 * - setDoc with merge:true instead of updateDoc to avoid "document not found" errors
 * - window.xxx = function() for functions called from HTML onclick attributes
 * - Debounced Firestore writes (400ms) on stepper/RPE changes
 * - Session timer persisted in Firestore (not localStorage)
 */

import { db, auth } from './firebase-config.js';
import {
    doc, collection, setDoc, getDoc, getDocs, writeBatch,
    query, where, orderBy, limit,
    serverTimestamp, deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { getDailySummaryRef } from './dashboard.js';

// ─── Utilities ─────────────────────────────────────────────────────────────
export function calculateE1RM(weight, reps, rpe) {
    if (!weight || !reps) return 0;
    const effectiveRpe = (rpe === null || rpe === undefined) ? 10 : rpe;
    const rm = weight * (1 + (reps + (10 - effectiveRpe)) / 30);
    return Math.round(rm * 10) / 10;
}

// ─── Module state ──────────────────────────────────────────────────────────
let _uid = null;
let _splitId = null;
let _dayId = null;
let _day = null;           // full day object { id, name, exercises[] }
let _sessionId = null;     // Firestore doc id under workout_logs
let _sessionDocRef = null;
let _sessionDoc = null;

document.addEventListener('click', (e) => {
    const actionBtn = e.target.closest('[data-action]');
    if (!actionBtn) return;
    const action = actionBtn.getAttribute('data-action');

    if (action === 'sessionGoBack') sessionGoBack();
    else if (action === 'finishSession') finishSession();
    else if (action === 'sessionToggleExAccordion') sessionToggleExAccordion(actionBtn.getAttribute('data-ex-id'), actionBtn);
    else if (action === 'sessionStepWeight') sessionStepWeight(actionBtn.getAttribute('data-ex-id'), parseInt(actionBtn.getAttribute('data-set-idx'), 10), parseFloat(actionBtn.getAttribute('data-delta')));
    else if (action === 'sessionStepReps') sessionStepReps(actionBtn.getAttribute('data-ex-id'), parseInt(actionBtn.getAttribute('data-set-idx'), 10), parseFloat(actionBtn.getAttribute('data-delta')));
    else if (action === 'sessionSetRPE') sessionSetRPE(actionBtn.getAttribute('data-ex-id'), parseInt(actionBtn.getAttribute('data-set-idx'), 10), parseInt(actionBtn.getAttribute('data-rpe'), 10));
    else if (action === 'sessionToggleSet') toggleSet(actionBtn);
    else if (action === 'sessionCompleteSet') completeSet(actionBtn.getAttribute('data-ex-id'), parseInt(actionBtn.getAttribute('data-set-idx'), 10));
});

let _timerInterval = null;
let _sessionStartTs = null; // JS Date, derived from Firestore startedAt

// Per-exercise local state: { [exerciseId]: { sets: [{weight,reps,rpe,status,e1rm,delta}], prevBest: {weight,reps} } }
let _exState = {};

// Debounce timers keyed by `${exId}_${setIdx}`
const _debounceTimers = {};

// ─── Init / Destroy ────────────────────────────────────────────────────────

export async function openActiveSession(uid, splitId, dayId, dayObj) {
    _uid = uid;
    _splitId = splitId;
    _dayId = dayId;
    _day = dayObj;
    _exState = {};
    _openExAccordions.clear(); // reset accordion state for fresh session

    // Show the session view, hide workout home
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById('view-active-session').classList.remove('hidden');

    // Set header title
    const titleEl = document.getElementById('session-day-title');
    if (titleEl) titleEl.textContent = dayObj.name;

    // Try to resume an existing in-progress session for this specific day
    const logsRef = collection(db, 'users', uid, 'workout_logs');
    const q = query(logsRef, where('status', '==', 'in_progress'), where('dayId', '==', dayId));
    const querySnap = await getDocs(q).catch(e => { console.error('DB Error:', e); alert('Veritabanı işlemi sırasında bir hata oluştu.'); throw e; });

    if (!querySnap.empty) {
        const docSnap = querySnap.docs[0];
        _sessionId = docSnap.id;
        _sessionDoc = docSnap.data();
        _sessionStartTs = _sessionDoc.startedAt?.toDate?.() || new Date();
    } else {
        // Create a fresh session document with a unique ID so we don't overwrite completed ones
        const todayStr = new Date().toLocaleDateString('en-CA');
        _sessionId = `${splitId}_${dayId}_${todayStr}_${Date.now()}`;
        _sessionDoc = {
            splitId,
            dayId,
            dateStr: todayStr,
            status: 'in_progress',
            createdAt: serverTimestamp(),
            startedAt: serverTimestamp(),
            exercises: {}
        };
        const newRef = doc(db, 'users', uid, 'workout_logs', _sessionId);
        await setDoc(newRef, _sessionDoc).catch(e => { console.error('DB Error:', e); alert('Veritabanı işlemi sırasında bir hata oluştu.'); throw e; });

        // Reset timer explicitly to now
        _sessionStartTs = new Date();
    }

    // Load previous session data for delta calculations
    await _loadPreviousSessionData();

    // Build initial per-exercise state
    _buildExState();

    // Render the exercise list
    _renderSessionExercises();

    // Start the timer
    _startTimer();
}

export function closeActiveSession() {
    _stopTimer();
    _uid = null;
    _sessionId = null;
    _day = null;
    _exState = {};
    Object.values(_debounceTimers).forEach(t => clearTimeout(t));
}

// Go back without finishing — session stays as in_progress in Firestore
function sessionGoBack() {
    _stopTimer();
    document.getElementById('view-active-session').classList.add('hidden');
    document.getElementById('view-workout').classList.remove('hidden');
};

// ─── Previous session data ─────────────────────────────────────────────────

// Map: exerciseId → { weight, reps, e1rm, sets[] }
let _prevData = {};

async function _loadPreviousSessionData() {
    if (!_uid || !_splitId || !_dayId) return;
    _prevData = {};

    try {
        const allLogs = window._miz_last_workout_logs || [];

        // Find the most recent completed session for this specific day
        const lastDayLog = allLogs.find(log =>
            log.status === 'completed' && log.splitId === _splitId && log.dayId === _dayId
        );

        if (lastDayLog && lastDayLog.exercises) {
            _prevData = {};
            for (let k in lastDayLog.exercises) {
                const exVal = lastDayLog.exercises[k];
                _prevData[k] = Array.isArray(exVal) ? { sets: exVal } : exVal;
            }
        }

        // For any exercise not found in that day's last session, search all past logs for the most recent usage
        if (_day && _day.exercises) {
            for (const ex of _day.exercises) {
                if (!_prevData[ex.id]) {
                    const latestLogWithEx = allLogs.find(log =>
                        log.status === 'completed' && log.exercises && log.exercises[ex.id]
                    );
                    if (latestLogWithEx) {
                        const exVal = latestLogWithEx.exercises[ex.id];
                        _prevData[ex.id] = Array.isArray(exVal) ? { sets: exVal } : exVal;
                    }
                }
            }
        }
    } catch (e) {
        console.error('[activeSession] Could not load previous session from memory:', e);
        alert('Aktif seans yüklenirken hata oluştu. İndeks gerekiyor olabilir: ' + e.message);
    }
}

// ─── Local state builder ───────────────────────────────────────────────────

function _buildExState() {
    if (!_day || !_day.exercises) return;

    _day.exercises.forEach(ex => {
        let draftSets = _sessionDoc?.exercises?.[ex.id]?.sets || [];
        let prevSets = _prevData?.[ex.id]?.sets || [];
        if (!Array.isArray(draftSets)) draftSets = Object.values(draftSets);
        if (!Array.isArray(prevSets)) prevSets = Object.values(prevSets);

        const parsedDefault = parseInt(ex.defaultSets, 10);
        const defaultSets = isNaN(parsedDefault) || parsedDefault <= 0 ? 3 : parsedDefault;
        const targetSetCount = Math.max(defaultSets, draftSets.length);

        const sets = [];
        for (let i = 0; i < targetSetCount; i++) {
            const draft = draftSets[i];
            const prevSet = prevSets[i];
            // If we run out of previous sets but need more, copy the last one
            const fallbackPrevSet = prevSet || prevSets[prevSets.length - 1] || null;

            sets.push({
                weight: draft?.weight ?? fallbackPrevSet?.weight ?? 60,
                reps:   draft?.reps   ?? fallbackPrevSet?.reps   ?? 8,
                rpe:    draft?.rpe    ?? null,

            });
        }

        const prevBest = _prevData?.[ex.id];
        _exState[ex.id] = {
            sets,
            initialSetsSnapshot: JSON.stringify(sets),
            activeSetIdx: 0,
            prevBestWeight: prevBest?.sets?.[0]?.weight ?? null,
            prevBestReps:   prevBest?.sets?.[0]?.reps ?? null
        };
    });
}

// ─── Timer ─────────────────────────────────────────────────────────────────

function _startTimer() {
    _stopTimer();
    _timerInterval = setInterval(_updateTimerDisplay, 1000);
    _updateTimerDisplay();
}

function _stopTimer() {
    if (_timerInterval) {
        clearInterval(_timerInterval);
        _timerInterval = null;
    }
}

function _updateTimerDisplay() {
    const el = document.getElementById('session-timer');
    if (!el || !_sessionStartTs) return;
    const elapsed = Math.floor((Date.now() - _sessionStartTs.getTime()) / 1000);
    const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const s = (elapsed % 60).toString().padStart(2, '0');
    el.textContent = `${m}:${s}`;
}

// ─── Render ────────────────────────────────────────────────────────────────

// Track which exercise accordions are open
const _openExAccordions = new Set();

function _renderSessionExercises() {
    const container = document.getElementById('session-exercises-container');
    if (!container || !_day || !_day.exercises) return;
    container.innerHTML = '';

    _day.exercises.forEach((ex, exIdx) => {
        try {
            const state = _exState[ex.id];
            if (!state) { console.warn('[render] state missing for', ex.id); return; }

            // Auto-open first exercise when session starts
            if (exIdx === 0 && _openExAccordions.size === 0) {
                _openExAccordions.add(ex.id);
            }

            const isOpen = _openExAccordions.has(ex.id);
            const prevLine = (state.prevBestWeight !== null)
                ? `Son antrenman: ${state.prevBestWeight}kg × ${state.prevBestReps} reps`
                : '';

            const card = document.createElement('article');
            card.className = 'neo-surface overflow-hidden mb-4';
            card.id = `session-card-${ex.id}`;

            card.innerHTML = `
                <button class="w-full p-4 flex items-center justify-between focus:outline-none" data-action="sessionToggleExAccordion" data-ex-id="${ex.id}">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-full bg-[#F0F2F8] flex items-center justify-center shrink-0" style="box-shadow: inset 4px 4px 8px #D1D9E6, inset -4px -4px 8px rgba(255, 255, 255, 0.7);">
                            <span class="material-symbols-rounded text-[#1E293B] text-xl">fitness_center</span>
                        </div>
                        <div class="text-left min-w-0">
                            <h3 class="font-title-sm text-title-sm text-on-surface mb-1 truncate">${escHtml(ex.name)}</h3>
                            <p class="font-body-sm text-body-sm text-text-secondary truncate">${prevLine}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-3 shrink-0">
                        <span class="material-symbols-rounded text-outline transition-transform duration-300 transform ${isOpen ? 'rotate-180' : ''}" id="chevron-${ex.id}">expand_more</span>
                    </div>
                </button>
                <div id="accordion-body-${ex.id}" class="${isOpen ? '' : 'hidden'} border-t border-surface-variant/50">
                    <div class="flex flex-col gap-3 p-4 bg-surface-container-low" id="sets-container-${ex.id}"></div>
                </div>
            `;

            container.appendChild(card);

            if (isOpen) {
                _renderSets(ex.id);
            }
        } catch (err) {
            console.error('[render] exercise card error:', err);
        }
    });

    // Wire up the finish button that lives in the header
    const finishBtn = document.getElementById('session-finish-btn');
    if (finishBtn) finishBtn.onclick = finishSession;
}

function _renderSets(exId, optionalContainer) {
    const container = optionalContainer || document.getElementById(`sets-container-${exId}`);
    if (!container) return;
    container.innerHTML = '';

    const state = _exState[exId];
    if (!state) return;

    state.sets.forEach((set, setIdx) => {
        const isCurrent = setIdx === state.activeSetIdx;
        const isCompleted = setIdx < state.activeSetIdx;

        const setEl = document.createElement('article');
        setEl.className = 'neo-surface overflow-hidden rounded-2xl';
        setEl.id = `set-row-${exId}-${setIdx}`;

        setEl.innerHTML = _activeSetHTML(exId, setIdx, set, isCurrent, isCompleted);
        container.appendChild(setEl);
    });
}

// ─── HTML templates ────────────────────────────────────────────────────────

function _activeSetHTML(exId, setIdx, set, isCurrent = false, isCompleted = false) {
    const currentE1RM = calculateE1RM(set.weight, set.reps, set.rpe);
    const isRoughEstimate = set.rpe === null;
    const e1rmDisplay = isRoughEstimate
        ? `<span class="italic">~${currentE1RM}kg</span>`
        : `<span>${currentE1RM}kg</span>`;

    const rpeButtons = [6, 7, 8, 9, 10].map(r => {
        const isSelected = set.rpe === r;
        const btnClass = isSelected
            ? 'flex-1 py-3 neo-inset rounded-xl font-body-md text-body-md text-primary font-bold bg-primary/5'
            : 'flex-1 py-3 neo-surface rounded-xl font-body-md text-body-md text-text-secondary neo-surface-interactive';
        return `<button data-action="sessionSetRPE" data-ex-id="${exId}" data-set-idx="${setIdx}" data-rpe="${r}" class="${btnClass}">${r}</button>`;
    }).join('');

    const titleText = isCompleted ? 'Tamamlandı' : (isCurrent ? 'Şu anki set' : 'Bekliyor');
    const titleClass = isCompleted ? 'text-accent-green font-semibold' : (isCurrent ? 'text-primary font-semibold' : 'text-text-secondary');

    let numBgClass = 'bg-surface-container-high text-outline';
    if (isCurrent) numBgClass = 'bg-primary/10 text-primary';
    if (isCompleted) numBgClass = 'bg-accent-green/10 text-accent-green';

    const rpeLabel = (set.rpe && isCompleted) ? `<span class="font-label-sm text-label-sm text-outline ml-2" id="rpe-summary-${exId}-${setIdx}">RPE ${set.rpe}</span>` : `<span class="font-label-sm text-label-sm text-outline ml-2" id="rpe-summary-${exId}-${setIdx}"></span>`;
    const chevronColor = 'text-outline';

    // Auto-expand the current set. Users can toggle freely.
    const isExpanded = isCurrent;

    // Future sets are disabled until reached
    const isFuture = !isCurrent && !isCompleted;
    const wrapperClass = isFuture ? 'opacity-50 pointer-events-none' : '';

    return `
        <button class="w-full p-3 flex items-center justify-between focus:outline-none" data-action="sessionToggleSet">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full flex items-center justify-center ${numBgClass}">
                    ${isCompleted ? '<span class="material-symbols-rounded text-sm">check</span>' : `<span class="font-title-sm text-title-sm font-bold">${setIdx + 1}</span>`}
                </div>
                <span class="font-body-sm text-body-sm ${titleClass}" id="set-summary-${exId}-${setIdx}">${titleText}</span>
                ${rpeLabel}
            </div>
            <div class="flex items-center gap-2">
                <span class="font-label-sm text-text-secondary">${set.weight}kg × ${set.reps}</span>
                <span class="material-symbols-rounded ${chevronColor} transition-transform duration-300 transform ${isExpanded ? 'rotate-180' : ''}" data-icon="expand_more">expand_more</span>
            </div>
        </button>
        <div class="expandable-content ${isExpanded ? 'expanded' : ''}">
            <div class="expandable-inner px-4 pb-4">
                <div class="${wrapperClass}">
                    <!-- Weight & Reps Single Row -->
                    <div class="flex items-center justify-between gap-4 mb-4 pt-2">
                        <!-- Weight -->
                        <div class="flex-1 flex flex-col items-center">
                            <span class="font-label-sm text-label-sm text-text-secondary mb-2">Ağırlık (kg)</span>
                            <div class="flex items-center justify-center gap-2 w-full">
                                <button data-action="sessionStepWeight" data-ex-id="${exId}" data-set-idx="${setIdx}" data-delta="-2.5" class="w-10 h-10 neo-inset-circle flex items-center justify-center text-secondary neo-surface-interactive hover:text-primary transition-colors">
                                    <span class="material-symbols-rounded text-lg" data-icon="remove">remove</span>
                                </button>
                                <span class="font-title-lg text-title-lg w-12 text-center text-on-surface" id="weight-val-${exId}-${setIdx}">${set.weight}</span>
                                <button data-action="sessionStepWeight" data-ex-id="${exId}" data-set-idx="${setIdx}" data-delta="2.5" class="w-10 h-10 neo-inset-circle flex items-center justify-center text-secondary neo-surface-interactive hover:text-primary transition-colors">
                                    <span class="material-symbols-rounded text-lg" data-icon="add">add</span>
                                </button>
                            </div>
                        </div>
                        <!-- Divider -->
                        <div class="w-px h-12 bg-surface-variant"></div>
                        <!-- Reps -->
                        <div class="flex-1 flex flex-col items-center">
                            <span class="font-label-sm text-label-sm text-text-secondary mb-2">Tekrar</span>
                            <div class="flex items-center justify-center gap-2 w-full">
                                <button data-action="sessionStepReps" data-ex-id="${exId}" data-set-idx="${setIdx}" data-delta="-1" class="w-10 h-10 neo-inset-circle flex items-center justify-center text-secondary neo-surface-interactive hover:text-primary transition-colors">
                                    <span class="material-symbols-rounded text-lg" data-icon="remove">remove</span>
                                </button>
                                <span class="font-title-lg text-title-lg w-12 text-center text-on-surface" id="reps-val-${exId}-${setIdx}">${set.reps}</span>
                                <button data-action="sessionStepReps" data-ex-id="${exId}" data-set-idx="${setIdx}" data-delta="1" class="w-10 h-10 neo-inset-circle flex items-center justify-center text-secondary neo-surface-interactive hover:text-primary transition-colors">
                                    <span class="material-symbols-rounded text-lg" data-icon="add">add</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <hr class="border-surface-variant mb-4 mx-2">

                    <!-- RPE Selection -->
                    <div class="mb-4">
                        <p class="font-label-sm text-label-sm text-text-secondary mb-2 text-center">RPE (Zorluk) — opsiyonel</p>
                        <div class="rpe-btn-group flex justify-between gap-2">${rpeButtons}</div>
                    </div>

                    <!-- Actions & e1RM -->
                    <div class="flex justify-between items-center mt-4">
                        <div class="neo-inset-pill px-4 py-2 inline-flex items-center">
                            <span class="font-label-sm text-label-sm font-bold text-tertiary" id="e1rm-display-${exId}-${setIdx}">Tahmini e1RM: ${e1rmDisplay}</span>
                        </div>
                        ${isCurrent ? `<button class="px-5 py-2 rounded-full bg-primary text-white font-title-sm text-title-sm shadow-sm active:scale-95 transition-transform" data-action="sessionCompleteSet" data-ex-id="${exId}" data-set-idx="${setIdx}">Tamamla</button>` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ─── User actions (window.* for HTML onclick) ──────────────────────────────

function sessionToggleExAccordion(exId, headerBtn) {
    const body = document.getElementById(`accordion-body-${exId}`);
    const chevron = document.getElementById(`chevron-${exId}`);
    if (!body) return;

    if (_openExAccordions.has(exId)) {
        _openExAccordions.delete(exId);
        body.classList.add('hidden');
        if (chevron) chevron.classList.remove('rotate-180');
    } else {
        _openExAccordions.add(exId);
        body.classList.remove('hidden');
        if (chevron) chevron.classList.add('rotate-180');
        _renderSets(exId);
    }
};

function sessionStepWeight(exId, setIdx, delta) {
    const set = _exState[exId]?.sets[setIdx];
    if (!set) return;
    set.weight = Math.max(0, Math.round((set.weight + delta) * 10) / 10);
    _refreshWeightRepsDisplay(exId, setIdx, set);
    _refreshE1RMDisplay(exId, setIdx, set);
    _debounceSaveSet(exId, setIdx);
};

function sessionStepReps(exId, setIdx, delta) {
    const set = _exState[exId]?.sets[setIdx];
    if (!set) return;
    set.reps = Math.max(1, set.reps + delta);
    _refreshWeightRepsDisplay(exId, setIdx, set);
    _refreshE1RMDisplay(exId, setIdx, set);
    _debounceSaveSet(exId, setIdx);
};

function sessionSetRPE(exId, setIdx, rpe) {
    const set = _exState[exId]?.sets[setIdx];
    if (!set) return;
    set.rpe = set.rpe === rpe ? null : rpe;
    _refreshRPEButtons(exId, setIdx, set);
    _refreshE1RMDisplay(exId, setIdx, set);
    _debounceSaveSet(exId, setIdx);
};


function sessionAddSet(exId) {
    const state = _exState[exId];
    if (!state) return;
    const lastSet = state.sets[state.sets.length - 1] || { weight: 60, reps: 8 };
    state.sets.push({
        weight: lastSet.weight,
        reps:   lastSet.reps,
        rpe:    null
    });
    _renderSets(exId);
};

function getCategoryAndEquipment(exName) {
    const data = window.EXERCISE_MUSCLE_MAPPING ? window.EXERCISE_MUSCLE_MAPPING[exName] : null;
    let category = "Diğer";
    if (data && data.primary && data.primary.length > 0) {
        const catMapReverse = {
            'chest': 'Göğüs',
            'upper-back': 'Sırt',
            'lower-back': 'Sırt',
            'triceps': 'Triceps',
            'abs': 'Karın',
            'obliques': 'Karın',
            'shoulders': 'Omuz',
            'deltoids': 'Omuz',
            'biceps': 'Biceps',
            'legs': 'Bacak',
            'quadriceps': 'Bacak',
            'hamstrings': 'Bacak',
            'glutes': 'Bacak',
            'calves': 'Bacak'
        };
        category = catMapReverse[data.primary[0].toLowerCase()] || "Diğer";
    }

    let equipment = "Belirtilmedi";
    const nameLower = exName.toLowerCase();
    if (nameLower.includes("dumbbell")) equipment = "Dumbbell";
    else if (nameLower.includes("barbell")) equipment = "Barbell";
    else if (nameLower.includes("machine")) equipment = "Makine";
    else if (nameLower.includes("cable")) equipment = "Kablo";
    else if (nameLower.includes("smith")) equipment = "Smith Machine";
    else if (nameLower.includes("band")) equipment = "Direnç Bandı";
    else if (nameLower.includes("bodyweight") || nameLower.includes("push-up") || nameLower.includes("pull-up") || nameLower.includes("dip")) equipment = "Vücut Ağırlığı";

    return { category, equipment };
}

function getSafeExerciseId(exName) {
    return exName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function finishSession() {
    if (!auth.currentUser) return;
    const btn = document.getElementById('session-finish-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Kaydediliyor...'; }

    try {
        const elapsed = _sessionStartTs
            ? Math.floor((Date.now() - _sessionStartTs.getTime()) / 1000)
            : 0;
            
        // Fix: Use local time for calendar day grouping (prevents UTC shift bugs where morning/afternoon split across UTC midnight)
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const currentMonthStr = dateStr.substring(0, 7);
        const sessionName = _day ? _day.name : "İsimsiz Antrenman";

        // Build exercises summary and calculate progress updates
        const exercises = {};
        const progressUpdates = {};

        if (_day && _day.exercises) {
            for (const ex of _day.exercises) {
                const state = _exState[ex.id];
                if (!state) continue;

                // DEEP COMPARISON: Check if this exercise was touched at all
                // 1. Did they complete any sets? (activeSetIdx > 0 means isCompleted changed)
                // 2. Did they change any weight/reps/rpe? (compare current sets to initial snapshot)
                const currentSetsStr = JSON.stringify(state.sets);
                const hasCompletedSets = state.activeSetIdx > 0;
                const hasModifiedValues = currentSetsStr !== state.initialSetsSnapshot;

                // If NO sets are completed AND NO values were changed, skip this exercise entirely!
                if (!hasCompletedSets && !hasModifiedValues) {
                    console.log(`[finishSession] Skipping unmodified exercise: ${ex.id}`);
                    continue;
                }

                // WARNING: The volume calculation still counts ALL sets (even uncompleted ones) 
                // if the exercise was modified. We should only count completed sets for volume!
                // We'll slice the sets to only include the ones that were actually completed.
                const completedSets = state.sets.slice(0, state.activeSetIdx).map(s => ({
                    weight: s.weight,
                    reps:   s.reps,
                    rpe:    s.rpe
                }));
                
                // If they changed the weight/reps but never checked a single set, completedSets is empty.
                // We save it to session log so their draft changes aren't lost, but we skip progress tracking
                // if there's no volume to track.
                
                // For the session log (workout_logs), we keep ALL sets so their edits aren't lost if they view history
                const sessionLogSets = state.sets.map(s => ({
                    weight: s.weight,
                    reps:   s.reps,
                    rpe:    s.rpe
                }));

                exercises[ex.id] = {
                    name: ex.name,
                    sets: sessionLogSets
                };
                
                if (completedSets.length === 0) {
                    continue; // No completed sets to add to progress/volume index
                }
                
                // Progress calculations ONLY use completed sets
                let totalVolume = 0;
                let maxWeight = 0;
                let maxRepsAtMaxWeight = 0;
                
                for (const s of completedSets) {
                    if (s.weight > 0 && s.reps > 0) {
                        totalVolume += (s.weight * s.reps);
                    }
                    if (s.weight > maxWeight) {
                        maxWeight = s.weight;
                        maxRepsAtMaxWeight = s.reps;
                    } else if (s.weight === maxWeight && s.reps > maxRepsAtMaxWeight) {
                        maxRepsAtMaxWeight = s.reps;
                    }
                }
                
                const safeId = getSafeExerciseId(ex.name);
                if (!progressUpdates[safeId]) {
                    progressUpdates[safeId] = {
                        name: ex.name,
                        totalVolume: 0,
                        maxWeight: 0,
                        maxRepsAtMaxWeight: 0,
                        sets: []
                    };
                }
                
                // Aggregate in case the same exercise is in the split multiple times
                progressUpdates[safeId].totalVolume += totalVolume;
                if (maxWeight > progressUpdates[safeId].maxWeight) {
                    progressUpdates[safeId].maxWeight = maxWeight;
                    progressUpdates[safeId].maxRepsAtMaxWeight = maxRepsAtMaxWeight;
                } else if (maxWeight === progressUpdates[safeId].maxWeight && maxRepsAtMaxWeight > progressUpdates[safeId].maxRepsAtMaxWeight) {
                    progressUpdates[safeId].maxRepsAtMaxWeight = maxRepsAtMaxWeight;
                }
                progressUpdates[safeId].sets.push(...completedSets);
            }
        }

        // PRE-READ PHASE
        const indexRef = doc(db, 'users', _uid, 'summary', 'exerciseProgressIndex');
        const indexSnap = await getDoc(indexRef);
        let indexData = indexSnap.exists() ? indexSnap.data() : {
            trackedExerciseCount: 0,
            totalSessions: 0,
            thisMonthVolume: 0,
            lastMonthVolume: 0,
            volumeChangePercent: 0,
            lastMonthStr: currentMonthStr,
            exercises: []
        };
        
        if(!indexData.exercises) indexData.exercises = [];
        if(!indexData.lastMonthStr) indexData.lastMonthStr = currentMonthStr;
        if(typeof indexData.thisMonthVolume === 'undefined') indexData.thisMonthVolume = 0;
        if(typeof indexData.lastMonthVolume === 'undefined') indexData.lastMonthVolume = 0;
        if(typeof indexData.totalSessions === 'undefined') indexData.totalSessions = 0;
        if(typeof indexData.trackedExerciseCount === 'undefined') indexData.trackedExerciseCount = 0;
        
        const progressDocs = {};
        for (const safeId of Object.keys(progressUpdates)) {
            const docRef = doc(db, 'users', _uid, 'exerciseProgress', safeId);
            const docSnap = await getDoc(docRef);
            progressDocs[safeId] = docSnap.exists() ? docSnap.data() : null;
        }
        
        // BATCH PHASE
        const batch = writeBatch(db);
        
        // 1. Session Log
        const sessionRef = doc(db, 'users', _uid, 'workout_logs', _sessionId);
        
        if (Object.keys(exercises).length === 0) {
            console.log('[finishSession] No modified exercises found. Deleting empty session log.');
            batch.delete(sessionRef);
            
            // Navigate back to workout home
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<span class="material-symbols-rounded" style="font-size:16px">flag</span> Bitir`;
            }
            document.getElementById('view-active-session').classList.add('hidden');
            document.getElementById('view-workout').classList.remove('hidden');
            if (typeof renderSplitView === 'function') renderSplitView();
            
            await batch.commit();
            _clearSession();
            return; // EXIT EARLY! No progress/index updates.
        }

        batch.set(sessionRef, { status: 'completed', durationSeconds: elapsed, exercises }, { merge: true });
        
        // Month transition logic
        if (indexData.lastMonthStr !== currentMonthStr) {
            const lastDateObj = new Date(indexData.lastMonthStr + "-01");
            const currDateObj = new Date(currentMonthStr + "-01");
            const monthDiff = (currDateObj.getFullYear() - lastDateObj.getFullYear()) * 12 + (currDateObj.getMonth() - lastDateObj.getMonth());
            
            if (monthDiff === 1) {
                indexData.lastMonthVolume = indexData.thisMonthVolume || 0;
            } else {
                indexData.lastMonthVolume = 0; // Skipped months
            }
            indexData.thisMonthVolume = 0;
            indexData.lastMonthStr = currentMonthStr;
        }

        let sessionTotalVolume = 0;
        
        // 2. Exercise Progress Details & Index Updates
        for (const [safeId, update] of Object.entries(progressUpdates)) {
            sessionTotalVolume += update.totalVolume;
            
            const existing = progressDocs[safeId];
            const meta = getCategoryAndEquipment(update.name);
            
            let entries = existing && existing.entries ? existing.entries : [];
            let mergedThisDay = false;
            let combinedVolumeForToday = update.totalVolume;
            
            if (entries.length > 0 && entries[entries.length - 1].date === dateStr) {
                mergedThisDay = true;
                combinedVolumeForToday = entries[entries.length - 1].totalVolume + update.totalVolume;
            }
            
            // Check PR
            let isPR = false;
            let currentPR = existing && existing.personalRecord ? existing.personalRecord : { weight: 0, reps: 0 };
            if (update.maxWeight > currentPR.weight) {
                isPR = true;
                currentPR = { weight: update.maxWeight, reps: update.maxRepsAtMaxWeight, date: dateStr };
            } else if (update.maxWeight === currentPR.weight && update.maxRepsAtMaxWeight > currentPR.reps) {
                isPR = true;
                currentPR = { weight: update.maxWeight, reps: update.maxRepsAtMaxWeight, date: dateStr };
            }
            
            // Check Max Volume (based on combined daily volume)
            let maxVolume = existing && existing.maxVolume ? existing.maxVolume : { value: 0 };
            if (combinedVolumeForToday > maxVolume.value) {
                maxVolume = { value: combinedVolumeForToday, date: dateStr };
            }
            
            if (mergedThisDay) {
                let lastEntry = entries[entries.length - 1];
                lastEntry.sets.push(...update.sets);
                lastEntry.totalVolume = combinedVolumeForToday;
                lastEntry.isPR = lastEntry.isPR || isPR;
            } else {
                const newEntry = {
                    date: dateStr,
                    sessionId: _sessionId,
                    sessionName: sessionName,
                    sets: update.sets,
                    totalVolume: update.totalVolume,
                    isPR: isPR
                };
                entries.push(newEntry);
            }
            
            const progressRef = doc(db, 'users', _uid, 'exerciseProgress', safeId);
            batch.set(progressRef, {
                exerciseName: update.name,
                category: meta.category,
                equipment: meta.equipment,
                firstLoggedDate: existing && existing.firstLoggedDate ? existing.firstLoggedDate : dateStr,
                personalRecord: currentPR,
                maxVolume: maxVolume,
                entries: entries
            }, { merge: true });
            
            // Update Index for this exercise
            let idxEx = indexData.exercises.find(e => e.exerciseId === safeId);
            if (!idxEx) {
                idxEx = {
                    exerciseId: safeId,
                    exerciseName: update.name,
                    category: meta.category,
                    sparkline: []
                };
                indexData.exercises.push(idxEx);
                indexData.trackedExerciseCount++;
            }
            
            if (!idxEx.sparkline) idxEx.sparkline = [];
            
            if (mergedThisDay && idxEx.sparkline.length > 0) {
                idxEx.sparkline[idxEx.sparkline.length - 1] += update.totalVolume;
                idxEx.lastVolume = (idxEx.lastVolume || 0) + update.totalVolume;
                
                if (idxEx.sparkline.length > 1) {
                    const prevVol = idxEx.sparkline[idxEx.sparkline.length - 2];
                    idxEx.changePercent = prevVol > 0 ? ((idxEx.lastVolume - prevVol) / prevVol) * 100 : 0;
                } else {
                    idxEx.changePercent = 0;
                }
                idxEx.isNewPR = idxEx.isNewPR || isPR;
            } else {
                const lastVol = idxEx.lastVolume || 0;
                idxEx.changePercent = lastVol > 0 ? ((update.totalVolume - lastVol) / lastVol) * 100 : 0;
                idxEx.lastVolume = update.totalVolume;
                idxEx.isNewPR = isPR;
                
                idxEx.sparkline.push(update.totalVolume);
                if (idxEx.sparkline.length > 8) {
                    idxEx.sparkline.shift();
                }
            }
            
            idxEx.lastDate = dateStr;
            idxEx.personalRecord = { weight: currentPR.weight, reps: currentPR.reps };
        }
        
        // Finalize index updates
        indexData.totalSessions++;
        indexData.thisMonthVolume += sessionTotalVolume;
        if (indexData.lastMonthVolume > 0) {
            indexData.volumeChangePercent = ((indexData.thisMonthVolume - indexData.lastMonthVolume) / indexData.lastMonthVolume) * 100;
        } else {
            indexData.volumeChangePercent = indexData.thisMonthVolume > 0 ? 100 : 0;
        }
        
        batch.set(indexRef, indexData, { merge: true });

        batch.set(getDailySummaryRef(auth.currentUser.uid), {
            activeSplitName: sessionName
        }, { merge: true });
        
        // OPTIMISTIC UI
        _stopTimer();

        // Reset button
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<span class="material-symbols-rounded" style="font-size:16px">flag</span> Bitir`;
        }

        // Navigate back to workout home
        document.getElementById('view-active-session').classList.add('hidden');
        document.getElementById('view-workout').classList.remove('hidden');

        // Trigger a re-render of the workout summary
        if (typeof renderSplitView === 'function') renderSplitView();

        // COMMIT BATCH IN BACKGROUND
        await batch.commit();

    } catch (e) {
        console.error('[activeSession] finishSession error:', e);
        alert('Antrenman kaydedilemedi: ' + e.message);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<span class="material-symbols-rounded" style="font-size:16px">flag</span> Bitir`;
        }
    }
};

function _updateExAccordionHeader(exId) {
    const state = _exState[exId];
    if (!state) return;
    const totalSets = state.sets.length;
    const card = document.getElementById(`session-card-${exId}`);
    if (!card) return;
    const counterEl = card.querySelector('.shrink-0 .font-label-sm');
    if (counterEl) {
        counterEl.textContent = `${totalSets} Set`;
        counterEl.className = `font-label-sm text-label-sm text-on-surface-variant`;
    }
}

// Separate targeted refresh functions to avoid cross-contamination
function _refreshWeightRepsDisplay(exId, setIdx, set) {
    const weightEl = document.getElementById(`weight-val-${exId}-${setIdx}`);
    const repsEl = document.getElementById(`reps-val-${exId}-${setIdx}`);
    const summaryEl = document.getElementById(`set-summary-${exId}-${setIdx}`);

    if (weightEl) weightEl.textContent = set.weight;
    if (repsEl) repsEl.textContent = set.reps;

    // Only update summary if it's not the "current set" label
    if (summaryEl && summaryEl.textContent !== 'Şu anki set') {
        summaryEl.textContent = `${set.weight}kg × ${set.reps} reps`;
    }
}


function _refreshE1RMDisplay(exId, setIdx, set) {
    const el = document.getElementById(`e1rm-display-${exId}-${setIdx}`);
    if (!el) return;
    const isRough = set.rpe === null;
    const val = calculateE1RM(set.weight, set.reps, set.rpe);
    el.innerHTML = isRough
        ? `Tahmini e1RM: <span class="italic text-on-surface-variant/60">~${val}kg</span>`
        : `Tahmini e1RM: <span>${val}kg</span>`;
}

function _refreshRPEButtons(exId, setIdx, set) {
    const row = document.getElementById(`set-row-${exId}-${setIdx}`);
    if (!row) return;
    const rpeGroup = row.querySelector('.rpe-btn-group');
    if (!rpeGroup) return;

    rpeGroup.innerHTML = [6, 7, 8, 9, 10].map(r => {
        const isSelected = set.rpe === r;
        const btnClass = isSelected
            ? 'flex-1 py-3 neo-inset rounded-xl font-body-md text-body-md text-primary font-bold bg-primary/5'
            : 'flex-1 py-3 neo-surface rounded-xl font-body-md text-body-md text-text-secondary neo-surface-interactive';
        return `<button data-action="sessionSetRPE" data-ex-id="${exId}" data-set-idx="${setIdx}" data-rpe="${r}" class="${btnClass}">${r}</button>`;
    }).join('');

    const summaryLabel = document.getElementById(`rpe-summary-${exId}-${setIdx}`);
    if (summaryLabel) {
        summaryLabel.textContent = set.rpe ? `RPE ${set.rpe}` : '';
    }
}

// ─── Firestore persistence ─────────────────────────────────────────────────

let _sessionSaveTimer = null;

function _debounceSaveSet(exId, setIdx) {
    if (_sessionSaveTimer) clearTimeout(_sessionSaveTimer);
    _sessionSaveTimer = setTimeout(() => {
        _persistSessionState();
        _sessionSaveTimer = null;
    }, 5000); // 5 seconds debounce
}

async function _persistSessionState() {
    if (!_uid || !_sessionId) return;
    try {
        const sessionRef = doc(db, 'users', _uid, 'workout_logs', _sessionId);
        
        // Build full exercises object to merge
        const exercises = {};
        for (const [eId, state] of Object.entries(_exState)) {
            exercises[eId] = {
                sets: state.sets.map(s => ({
                    weight: s.weight,
                    reps: s.reps,
                    rpe: s.rpe ?? null
                }))
            };
        }

        await setDoc(sessionRef, { exercises }, { merge: true });
    } catch (e) {
        console.error('[activeSession] _persistSessionState error:', e);
    }
}


// ─── Helper ────────────────────────────────────────────────────────────────

function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

function toggleSet(button) {
    const content = button.nextElementSibling;
    const icon = button.querySelector('[data-icon="expand_more"]');

    if (content.classList.contains('expanded')) {
        content.classList.remove('expanded');
        if (icon) icon.classList.remove('rotate-180');
    } else {
        content.classList.add('expanded');
        if (icon) icon.classList.add('rotate-180');
    }
}

function completeSet(exId, setIdx) {
    const state = _exState[exId];
    if (!state) return;

    if (state.activeSetIdx !== setIdx) return;

    state.activeSetIdx++;

    // Re-render sets immediately (Optimistic UI)
    _renderSets(exId);

    // Save IMMEDIATELY to Firestore — don't wait debounce
    _persistSessionState();

    // Check if all sets for this exercise are done
    const allDone = state.activeSetIdx >= state.sets.length;
    if (allDone && _day && _day.exercises) {
        const exList = _day.exercises;
        const curIdx = exList.findIndex(e => e.id === exId);
        const nextEx = exList[curIdx + 1];

        // Close current accordion
        _openExAccordions.delete(exId);
        const curBody = document.getElementById(`accordion-body-${exId}`);
        const curChevron = document.getElementById(`chevron-${exId}`);
        if (curBody) curBody.classList.add('hidden');
        if (curChevron) curChevron.classList.remove('rotate-180');

        // Open next accordion if exists
        if (nextEx) {
            _openExAccordions.add(nextEx.id);
            const nextBody = document.getElementById(`accordion-body-${nextEx.id}`);
            const nextChevron = document.getElementById(`chevron-${nextEx.id}`);
            if (nextBody) nextBody.classList.remove('hidden');
            if (nextChevron) nextChevron.classList.add('rotate-180');
            _renderSets(nextEx.id);

            // Smooth scroll to next exercise card
            const nextCard = document.getElementById(`session-card-${nextEx.id}`);
            if (nextCard) nextCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
}
