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

import { db } from './firebase-config.js';
import {
    doc, collection, setDoc, getDoc, getDocs,
    query, where, orderBy, limit,
    serverTimestamp, deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

// ─── Utilities ─────────────────────────────────────────────────────────────
function calculateE1RM(weight, reps, rpe) {
    if (!weight || !reps) return 0;
    const rir = rpe !== null ? (10 - rpe) : 0;
    const estimatedMaxReps = reps + rir;
    return Math.round(weight * (1 + estimatedMaxReps / 30) * 10) / 10;
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
            _prevData = lastDayLog.exercises;
        }

        // For any exercise not found in that day's last session, search all past logs for the most recent usage
        if (_day && _day.exercises) {
            for (const ex of _day.exercises) {
                if (!_prevData[ex.id]) {
                    const latestLogWithEx = allLogs.find(log => 
                        log.status === 'completed' && log.exercises && log.exercises[ex.id]
                    );
                    if (latestLogWithEx) {
                        _prevData[ex.id] = latestLogWithEx.exercises[ex.id];
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
        const draftSets = _sessionDoc?.exercises?.[ex.id]?.sets || [];
        const prevSets = _prevData?.[ex.id]?.sets || [];
        const defaultSets = ex.defaultSets || 3;
        let targetSetCount = defaultSets;

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
    if (!container || !_day) return;
    container.innerHTML = '';

    _day.exercises.forEach((ex, exIdx) => {
        const state = _exState[ex.id];
        if (!state) return;

        const isOpen = _openExAccordions.has(ex.id);
        const totalSets = state.sets.length;
        const prevLine = (state.prevBestWeight !== null)
            ? `Son antrenman: ${state.prevBestWeight}kg × ${state.prevBestReps} reps`
            : 'İlk antrenman';

        const card = document.createElement('section');
        card.className = 'bg-background shadow-neo rounded-[32px] shadow-sm border-none overflow-hidden';
        card.id = `session-card-${ex.id}`;

        card.innerHTML = `
            <!-- Accordion Header -->
            <button class="w-full flex items-center gap-sm p-md text-left hover:bg-background shadow-neo transition-colors"
                    data-action="sessionToggleExAccordion" data-ex-id="${ex.id}">
                <div class="w-10 h-10 rounded-full bg-gradient-to-r from-neon-purple to-neon-blue-container/20 flex items-center justify-center text-neon-blue shrink-0">
                    <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1">fitness_center</span>
                </div>
                <div class="flex-1 min-w-0">
                    <h2 class="font-title-lg text-title-lg text-on-surface truncate">${escHtml(ex.name)}</h2>
                    <p class="font-body-md text-body-md text-on-surface-variant">${prevLine}</p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <span class=\"font-label-sm text-label-sm text-on-surface-variant\">${totalSets} Set</span>
                    <span class="material-symbols-outlined text-on-surface-variant transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}" style="font-size:20px" id="chevron-${ex.id}">expand_more</span>
                </div>
            </button>
            <!-- Accordion Body -->
            <div id="accordion-body-${ex.id}" class="${isOpen ? '' : 'hidden'}">
                <div class="flex flex-col" id="sets-container-${ex.id}"></div>
            </div>
        `;

        container.appendChild(card);
        if (isOpen) _renderSets(ex.id);
    });

    // Wire up the finish button that lives in the header
    const finishBtn = document.getElementById('session-finish-btn');
    if (finishBtn) finishBtn.onclick = finishSession;
}

function _renderSets(exId) {
    const container = document.getElementById(`sets-container-${exId}`);
    if (!container) return;
    container.innerHTML = '';

    const state = _exState[exId];
    if (!state) return;

    state.sets.forEach((set, setIdx) => {
        const isCurrent = setIdx === state.sets.length - 1;
        const setEl = document.createElement('article');
        setEl.className = 'neo-surface overflow-hidden';
        setEl.id = `set-row-${exId}-${setIdx}`;
        
        setEl.innerHTML = _activeSetHTML(exId, setIdx, set, isCurrent);
        container.appendChild(setEl);
    });

    // Append Add Set Button
    const addSetBtn = document.createElement('button');
    addSetBtn.className = 'w-full py-4 neo-inset-pill flex items-center justify-center gap-2 text-primary font-body-md neo-surface-interactive mt-2';
    addSetBtn.innerHTML = '<span class="material-symbols-outlined">add</span>Yeni Set Ekle';
    addSetBtn.onclick = () => sessionAddSet(exId);
    container.appendChild(addSetBtn);

    // Update accordion header counter (legacy support if needed)
    // _updateExAccordionHeader(exId);
}

// ─── HTML templates ────────────────────────────────────────────────────────

function _activeSetHTML(exId, setIdx, set, isCurrent = false) {
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

    const titleText = isCurrent ? 'Şu anki set' : `${set.weight}kg × ${set.reps} reps`;
    const titleClass = isCurrent ? 'text-primary font-semibold' : 'text-on-surface';
    const numBgClass = isCurrent ? '' : 'bg-accent-green/10';
    const numTextClass = isCurrent ? 'text-primary' : 'text-accent-green';
    const rpeLabel = (set.rpe && !isCurrent) ? `<span class="font-label-sm text-label-sm text-outline ml-2" id="rpe-summary-${exId}-${setIdx}">RPE ${set.rpe}</span>` : `<span class="font-label-sm text-label-sm text-outline ml-2" id="rpe-summary-${exId}-${setIdx}"></span>`;
    
    // Icon colors: current set uses primary, completed sets use outline
    const chevronColor = isCurrent ? 'text-primary' : 'text-outline';
    
    // We will expand the current set by default, and collapse the completed sets by default
    const isExpanded = isCurrent; 

    // For completed sets, the inputs should be read-only (opacity-50 pointer-events-none)
    const wrapperClass = isCurrent ? '' : 'opacity-50 pointer-events-none';

    return `
        <button class="w-full p-4 flex items-center justify-between focus:outline-none" onclick="toggleSet(this)">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 neo-inset-circle flex items-center justify-center ${numBgClass}">
                    <span class="font-title-sm text-title-sm ${numTextClass} font-bold">${setIdx + 1}</span>
                </div>
                <span class="font-body-md text-body-md ${titleClass}" id="set-summary-${exId}-${setIdx}">${titleText}</span>
                ${rpeLabel}
            </div>
            <span class="material-symbols-outlined ${chevronColor} transition-transform duration-300 transform ${isExpanded ? 'rotate-180' : ''}" data-icon="expand_more">expand_more</span>
        </button>
        <div class="expandable-content ${isExpanded ? 'expanded' : ''}">
            <div class="expandable-inner px-5 pb-5">
                <div class="${wrapperClass}">
                    <!-- Weight Stepper -->
                    <div class="flex justify-between items-center mb-6 pt-2">
                        <span class="font-title-sm text-title-sm text-text-primary">Ağırlık (kg)</span>
                        <div class="flex items-center gap-4">
                            <button data-action="sessionStepWeight" data-ex-id="${exId}" data-set-idx="${setIdx}" data-delta="-2.5" class="w-12 h-12 neo-inset-circle flex items-center justify-center text-secondary neo-surface-interactive hover:text-primary transition-colors">
                                <span class="material-symbols-outlined" data-icon="remove">remove</span>
                            </button>
                            <span class="font-display-lg text-display-lg w-16 text-center text-on-surface" id="weight-val-${exId}-${setIdx}">${set.weight}</span>
                            <button data-action="sessionStepWeight" data-ex-id="${exId}" data-set-idx="${setIdx}" data-delta="2.5" class="w-12 h-12 neo-inset-circle flex items-center justify-center text-secondary neo-surface-interactive hover:text-primary transition-colors">
                                <span class="material-symbols-outlined" data-icon="add">add</span>
                            </button>
                        </div>
                    </div>
                    <!-- Reps Stepper -->
                    <div class="flex justify-between items-center mb-6">
                        <span class="font-title-sm text-title-sm text-text-primary">Tekrar</span>
                        <div class="flex items-center gap-4">
                            <button data-action="sessionStepReps" data-ex-id="${exId}" data-set-idx="${setIdx}" data-delta="-1" class="w-12 h-12 neo-inset-circle flex items-center justify-center text-secondary neo-surface-interactive hover:text-primary transition-colors">
                                <span class="material-symbols-outlined" data-icon="remove">remove</span>
                            </button>
                            <span class="font-display-lg text-display-lg w-16 text-center text-on-surface" id="reps-val-${exId}-${setIdx}">${set.reps}</span>
                            <button data-action="sessionStepReps" data-ex-id="${exId}" data-set-idx="${setIdx}" data-delta="1" class="w-12 h-12 neo-inset-circle flex items-center justify-center text-secondary neo-surface-interactive hover:text-primary transition-colors">
                                <span class="material-symbols-outlined" data-icon="add">add</span>
                            </button>
                        </div>
                    </div>
                    <hr class="border-surface-variant mb-6 mx-2">
                    <!-- RPE Selection -->
                    <div class="mb-6">
                        <p class="font-label-sm text-label-sm text-text-secondary mb-3">RPE (Zorluk) — opsiyonel</p>
                        <div class="rpe-btn-group flex justify-between gap-2">${rpeButtons}</div>
                    </div>
                    <!-- Actions & e1RM -->
                    <div class="flex justify-between items-center mt-2">
                        <div class="neo-inset-pill px-4 py-2 inline-flex items-center">
                            <span class="font-label-sm text-label-sm font-bold text-tertiary" id="e1rm-display-${exId}-${setIdx}">Tahmini e1RM: ${e1rmDisplay}</span>
                        </div>
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
        if (chevron) chevron.classList.remove('rotate-90');
    } else {
        _openExAccordions.add(exId);
        body.classList.remove('hidden');
        if (chevron) chevron.classList.add('rotate-90');
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

async function finishSession() {
    const btn = document.getElementById('session-finish-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Kaydediliyor...'; }

    try {
        const elapsed = _sessionStartTs
            ? Math.floor((Date.now() - _sessionStartTs.getTime()) / 1000)
            : 0;

        // Build exercises summary and auto-complete sets
        const exercises = {};
        if (_day && _day.exercises) {
            for (const ex of _day.exercises) {
                const state = _exState[ex.id];
                if (!state) continue;
                
                

                exercises[ex.id] = {
                    name: ex.name,
                    sets: state.sets.map(s => ({
                        weight: s.weight,
                        reps:   s.reps,
                        rpe:    s.rpe
                    }))
                };
            }
        }

        await setDoc(
            doc(db, 'users', _uid, 'workout_logs', _sessionId),
            { status: 'completed', durationSeconds: elapsed, exercises },
            { merge: true }
        );

        _stopTimer();

        // Reset button
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px">flag</span> Bitir`;
        }

        // Navigate back to workout home
        document.getElementById('view-active-session').classList.add('hidden');
        document.getElementById('view-workout').classList.remove('hidden');

        // Trigger a re-render of the workout summary
        if (typeof renderSplitView === 'function') renderSplitView();

    } catch (e) {
        console.error('[activeSession] finishSession error:', e);
        alert('Antrenman kaydedilemedi: ' + e.message);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px">flag</span> Bitir`;
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

function _debounceSaveSet(exId, setIdx) {
    const key = `${exId}_${setIdx}`;
    if (_debounceTimers[key]) clearTimeout(_debounceTimers[key]);
    _debounceTimers[key] = setTimeout(() => {
        const set = _exState[exId]?.sets[setIdx];
        if (set) {
            _persistSet(exId, setIdx, set);
        }
        delete _debounceTimers[key];
    }, 400);
}

async function _persistSet(exId, setIdx, set) {
    if (!_uid || !_sessionId) return;
    try {
        const sessionRef = doc(db, 'users', _uid, 'workout_logs', _sessionId);
        // Build nested update path for this exercise's sets array
        const state = _exState[exId];
        if (!state) return;

        // We store the full sets array per exercise (simpler than nested array writes)
        const setsData = state.sets.map(s => ({
            weight: s.weight,
            reps:   s.reps,
            rpe:    s.rpe ?? null
        }));

        await setDoc(sessionRef, {
            exercises: {
                [exId]: { sets: setsData }
            }
        }, { merge: true });
    } catch (e) {
        console.error('[activeSession] _persistSet error:', e);
        alert('Set veritabanına kaydedilemedi (Ağ veya yetki hatası): ' + e.message);
    }
}


// ─── Helper ────────────────────────────────────────────────────────────────

function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

window.toggleSet = function(button) {
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
