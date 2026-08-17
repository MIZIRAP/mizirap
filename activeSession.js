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
import { calculateE1RM, calculateE1RMDelta } from './progressiveOverload.js';

// ─── Module state ──────────────────────────────────────────────────────────
let _uid = null;
let _splitId = null;
let _dayId = null;
let _day = null;           // full day object { id, name, exercises[] }
let _sessionId = null;     // Firestore doc id under workout_logs
let _sessionDoc = null;    // cached session data
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
    const querySnap = await getDocs(q);

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
        await setDoc(newRef, _sessionDoc);
        
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
window.sessionGoBack = function() {
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
        console.warn('[activeSession] Could not load previous session from memory:', e.message);
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
        if (draftSets.length > 0) {
            targetSetCount = Math.max(defaultSets, draftSets.length);
        } else if (prevSets.length > 0) {
            targetSetCount = prevSets.length;
        }

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
                e1rm:   draft?.e1rm   ?? null,
                status: draft?.status ?? 'pending',   // 'pending' | 'draft' | 'completed'
                delta:  null
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
        const completedCount = state.sets.filter(s => s.status === 'completed').length;
        const totalSets = state.sets.length;
        const prevLine = (state.prevBestWeight !== null)
            ? `Son antrenman: ${state.prevBestWeight}kg × ${state.prevBestReps} reps`
            : 'İlk antrenman';

        const card = document.createElement('section');
        card.className = 'bg-surface-container-lowest rounded-xl shadow-sm border border-surface-variant/20 overflow-hidden';
        card.id = `session-card-${ex.id}`;

        card.innerHTML = `
            <!-- Accordion Header -->
            <button class="w-full flex items-center gap-sm p-md text-left hover:bg-surface-container-low transition-colors"
                    onclick="sessionToggleExAccordion('${ex.id}', this)">
                <div class="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center text-primary shrink-0">
                    <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1">fitness_center</span>
                </div>
                <div class="flex-1 min-w-0">
                    <h2 class="font-title-lg text-title-lg text-on-surface truncate">${escHtml(ex.name)}</h2>
                    <p class="font-body-md text-body-md text-on-surface-variant">${prevLine}</p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <span class="font-label-sm text-label-sm ${completedCount === totalSets && completedCount > 0 ? 'text-tertiary' : 'text-on-surface-variant'}">${completedCount}/${totalSets}</span>
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
        const setEl = document.createElement('div');
        setEl.id = `set-row-${exId}-${setIdx}`;

        if (set.status === 'completed') {
            setEl.className = 'flex items-center gap-sm px-md py-2.5 border-t border-surface-container-high bg-surface-container/30';
            setEl.innerHTML = _completedSetHTML(exId, setIdx, set);
        } else {
            const isActive = state.sets.slice(0, setIdx).every(s => s.status === 'completed');
            if (isActive) {
                setEl.className = 'flex flex-col gap-md px-md py-md border-t border-surface-container-high bg-surface-container-low/40 border-l-4 border-l-primary';
                setEl.innerHTML = _activeSetHTML(exId, setIdx, set);
            } else {
                setEl.className = 'flex items-center gap-sm px-md py-2.5 border-t border-surface-container-high opacity-40';
                setEl.innerHTML = _pendingSetHTML(setIdx, set);
            }
        }

        container.appendChild(setEl);
    });

    // Update accordion header counter
    _updateExAccordionHeader(exId);
}

// ─── HTML templates ────────────────────────────────────────────────────────

function _completedSetHTML(exId, setIdx, set) {
    const rpeTag = set.rpe !== null
        ? `<span class="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-sm text-label-sm">${set.rpe}</span>`
        : '';

    const deltaHTML = set.delta !== null
        ? `<span class="font-label-sm text-label-sm flex items-center gap-0.5 ${set.delta >= 0 ? 'text-tertiary' : 'text-error'}">
               <span class="material-symbols-outlined" style="font-size:13px">${set.delta >= 0 ? 'arrow_upward' : 'arrow_downward'}</span>
               ${Math.abs(set.delta)}kg e1RM
           </span>`
        : '';

    const e1rmText = set.e1rm !== null
        ? `<span class="font-label-sm text-label-sm text-on-surface-variant/60">e1RM: ${set.e1rm}kg</span>`
        : '';

    return `
        <span class="font-label-lg text-label-lg text-on-surface-variant w-5 shrink-0">${setIdx + 1}</span>
        <div class="flex-1 min-w-0">
            <div class="font-label-lg text-label-lg text-on-surface">${set.weight}kg × ${set.reps} reps</div>
            <div class="flex items-center gap-2 flex-wrap mt-0.5">
                ${deltaHTML}
                ${e1rmText}
            </div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
            ${rpeTag}
            <span class="material-symbols-outlined text-primary">check_circle</span>
        </div>
    `;
}

function _activeSetHTML(exId, setIdx, set) {
    const currentE1RM = set.e1rm ?? calculateE1RM(set.weight, set.reps, set.rpe);
    const isRoughEstimate = set.rpe === null;
    const e1rmDisplay = isRoughEstimate
        ? `<span class="italic text-on-surface-variant/60">~${currentE1RM}kg</span>`
        : `<span>${currentE1RM}kg</span>`;

    const rpeButtons = [6, 7, 8, 9, 10].map(r => {
        const isSelected = set.rpe === r;
        return `<button onclick="sessionSetRPE('${exId}', ${setIdx}, ${r})"
            class="w-10 h-10 rounded-full border transition-all duration-150 font-label-lg text-label-lg active:scale-95
                ${isSelected
                    ? 'bg-primary text-on-primary border-transparent shadow-sm scale-110 ring-2 ring-primary/30 ring-offset-1 ring-offset-surface-container-low'
                    : 'bg-surface text-on-surface-variant border-surface-variant hover:border-primary/40'}">${r}</button>`;
    }).join('');

    return `
        <!-- Set number + weight×reps row -->
        <div class="flex items-center gap-md">
            <span class="font-label-lg text-label-lg text-on-surface-variant w-5 shrink-0">${setIdx + 1}</span>
            <div class="flex-1 grid grid-cols-2 gap-3">
                <!-- Weight -->
                <div class="flex flex-col items-center gap-1">
                    <span class="font-label-sm text-label-sm text-on-surface-variant">Ağırlık (kg)</span>
                    <div class="flex items-center bg-surface rounded-lg border border-surface-variant/30 w-full justify-between p-0.5">
                        <button onclick="sessionStepWeight('${exId}', ${setIdx}, -2.5)"
                            class="w-9 h-9 rounded-lg flex items-center justify-center text-primary hover:bg-primary/5 active:scale-90 transition-all">
                            <span class="material-symbols-outlined">remove</span>
                        </button>
                        <span class="font-title-lg text-title-lg text-on-surface min-w-[3rem] text-center">${set.weight}</span>
                        <button onclick="sessionStepWeight('${exId}', ${setIdx}, 2.5)"
                            class="w-9 h-9 rounded-lg flex items-center justify-center text-primary hover:bg-primary/5 active:scale-90 transition-all">
                            <span class="material-symbols-outlined">add</span>
                        </button>
                    </div>
                </div>
                <!-- Reps -->
                <div class="flex flex-col items-center gap-1">
                    <span class="font-label-sm text-label-sm text-on-surface-variant">Tekrar</span>
                    <div class="flex items-center bg-surface rounded-lg border border-surface-variant/30 w-full justify-between p-0.5">
                        <button onclick="sessionStepReps('${exId}', ${setIdx}, -1)"
                            class="w-9 h-9 rounded-lg flex items-center justify-center text-primary hover:bg-primary/5 active:scale-90 transition-all">
                            <span class="material-symbols-outlined">remove</span>
                        </button>
                        <span class="font-title-lg text-title-lg text-on-surface min-w-[2rem] text-center">${set.reps}</span>
                        <button onclick="sessionStepReps('${exId}', ${setIdx}, 1)"
                            class="w-9 h-9 rounded-lg flex items-center justify-center text-primary hover:bg-primary/5 active:scale-90 transition-all">
                            <span class="material-symbols-outlined">add</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <!-- RPE Selector -->
        <div class="flex flex-col gap-2">
            <span class="font-label-sm text-label-sm text-on-surface-variant">RPE (Zorluk) — opsiyonel</span>
            <div class="rpe-btn-group flex justify-between items-center">${rpeButtons}</div>
            <p class="text-center font-body-md text-body-md text-on-surface-variant mt-1" id="e1rm-display-${exId}-${setIdx}">
                Tahmini e1RM: ${e1rmDisplay}
            </p>
        </div>
        <!-- Complete Button -->
        <button onclick="sessionCompleteSet('${exId}', ${setIdx})"
            class="w-full h-12 bg-primary text-on-primary rounded-full font-label-lg text-label-lg flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-sm">
            <span class="material-symbols-outlined">check</span>
            Seti Tamamla
        </button>
    `;
}

function _pendingSetHTML(setIdx, set) {
    return `
        <span class="font-label-lg text-label-lg text-on-surface-variant w-5 shrink-0">${setIdx + 1}</span>
        <span class="flex-1 font-body-md text-body-md text-on-surface-variant">${set.weight}kg × ${set.reps} reps</span>
    `;
}

// ─── User actions (window.* for HTML onclick) ──────────────────────────────

window.sessionToggleExAccordion = function(exId, headerBtn) {
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

window.sessionStepWeight = function(exId, setIdx, delta) {
    const set = _exState[exId]?.sets[setIdx];
    if (!set || set.status === 'completed') return;
    set.weight = Math.max(0, Math.round((set.weight + delta) * 10) / 10);
    set.e1rm = calculateE1RM(set.weight, set.reps, set.rpe);
    _refreshWeightRepsDisplay(exId, setIdx, set);
    _refreshE1RMDisplay(exId, setIdx, set);
    _debounceSaveDraft(exId, setIdx);
};

window.sessionStepReps = function(exId, setIdx, delta) {
    const set = _exState[exId]?.sets[setIdx];
    if (!set || set.status === 'completed') return;
    set.reps = Math.max(1, set.reps + delta);
    set.e1rm = calculateE1RM(set.weight, set.reps, set.rpe);
    _refreshWeightRepsDisplay(exId, setIdx, set);
    _refreshE1RMDisplay(exId, setIdx, set);
    _debounceSaveDraft(exId, setIdx);
};

window.sessionSetRPE = function(exId, setIdx, rpe) {
    const set = _exState[exId]?.sets[setIdx];
    if (!set || set.status === 'completed') return;
    set.rpe = set.rpe === rpe ? null : rpe;
    set.e1rm = calculateE1RM(set.weight, set.reps, set.rpe);
    _refreshRPEButtons(exId, setIdx, set);
    _refreshE1RMDisplay(exId, setIdx, set);
    _debounceSaveDraft(exId, setIdx);
};

window.sessionCompleteSet = async function(exId, setIdx) {
    const state = _exState[exId];
    const set = state?.sets[setIdx];
    if (!set || set.status === 'completed') return;

    set.e1rm = calculateE1RM(set.weight, set.reps, set.rpe);
    set.status = 'completed';

    // Delta vs previous session same set
    const prevSet = _prevData?.[exId]?.sets?.[setIdx];
    const prevE1RM = prevSet?.e1rm ?? (prevSet ? calculateE1RM(prevSet.weight, prevSet.reps, prevSet.rpe ?? null) : null);
    set.delta = calculateE1RMDelta(set.e1rm, prevE1RM);

    // Re-render this exercise card
    _renderSets(exId);

    // Persist as completed
    await _persistSet(exId, setIdx, set, 'completed');

    // Update exercise_progress summary doc
    await _updateExerciseProgress(exId, set);
};

window.sessionAddSet = function(exId) {
    const state = _exState[exId];
    if (!state) return;
    const lastSet = state.sets[state.sets.length - 1] || { weight: 60, reps: 8 };
    state.sets.push({
        weight: lastSet.weight,
        reps:   lastSet.reps,
        rpe:    null,
        e1rm:   null,
        status: 'pending',
        delta:  null
    });
    _renderSets(exId);
};

window.finishSession = async function() {
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
                
                // Auto-complete pending sets and update progress
                for (const set of state.sets) {
                    if (set.status !== 'completed') {
                        set.status = 'completed';
                        await _updateExerciseProgress(ex.id, set);
                    }
                }

                exercises[ex.id] = {
                    name: ex.name,
                    sets: state.sets.map(s => ({
                        weight: s.weight,
                        reps:   s.reps,
                        rpe:    s.rpe,
                        e1rm:   s.e1rm,
                        status: s.status
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
    const completedCount = state.sets.filter(s => s.status === 'completed').length;
    const totalSets = state.sets.length;
    const card = document.getElementById(`session-card-${exId}`);
    if (!card) return;
    const counterEl = card.querySelector('.shrink-0 .font-label-sm');
    if (counterEl) {
        counterEl.textContent = `${completedCount}/${totalSets}`;
        counterEl.className = `font-label-sm text-label-sm ${completedCount === totalSets && completedCount > 0 ? 'text-tertiary' : 'text-on-surface-variant'}`;
    }
}

// Separate targeted refresh functions to avoid cross-contamination
function _refreshWeightRepsDisplay(exId, setIdx, set) {
    const row = document.getElementById(`set-row-${exId}-${setIdx}`);
    if (!row) return;
    // Weight and reps values are the only .font-title-lg spans
    const valueSpans = row.querySelectorAll('.font-title-lg');
    if (valueSpans[0]) valueSpans[0].textContent = set.weight;
    if (valueSpans[1]) valueSpans[1].textContent = set.reps;
}

function _refreshE1RMDisplay(exId, setIdx, set) {
    const el = document.getElementById(`e1rm-display-${exId}-${setIdx}`);
    if (!el) return;
    const isRough = set.rpe === null;
    const val = set.e1rm ?? calculateE1RM(set.weight, set.reps, set.rpe);
    el.innerHTML = isRough
        ? `Tahmini e1RM: <span class="italic text-on-surface-variant/60">~${val}kg</span>`
        : `Tahmini e1RM: <span>${val}kg</span>`;
}

function _refreshRPEButtons(exId, setIdx, set) {
    const row = document.getElementById(`set-row-${exId}-${setIdx}`);
    if (!row) return;
    // Only target buttons inside the dedicated .rpe-btn-group container
    const rpeGroup = row.querySelector('.rpe-btn-group');
    if (!rpeGroup) return;
    rpeGroup.querySelectorAll('button').forEach((btn, i) => {
        const rpeVal = i + 6;
        const isSelected = set.rpe === rpeVal;
        btn.className = `w-10 h-10 rounded-full border transition-all duration-150 font-label-lg text-label-lg active:scale-95
            ${isSelected
                ? 'bg-primary text-on-primary border-transparent shadow-sm scale-110 ring-2 ring-primary/30 ring-offset-1'
                : 'bg-surface text-on-surface-variant border-surface-variant hover:border-primary/40'}`;
    });
}

// ─── Firestore persistence ─────────────────────────────────────────────────

function _debounceSaveDraft(exId, setIdx) {
    const key = `${exId}_${setIdx}`;
    if (_debounceTimers[key]) clearTimeout(_debounceTimers[key]);
    _debounceTimers[key] = setTimeout(() => {
        const set = _exState[exId]?.sets[setIdx];
        if (set && set.status !== 'completed') {
            _persistSet(exId, setIdx, set, 'draft');
        }
        delete _debounceTimers[key];
    }, 400);
}

async function _persistSet(exId, setIdx, set, status) {
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
            rpe:    s.rpe ?? null,
            e1rm:   s.e1rm ?? null,
            status: s.status
        }));

        await setDoc(sessionRef, {
            exercises: {
                [exId]: { sets: setsData }
            }
        }, { merge: true });
    } catch (e) {
        console.warn('[activeSession] _persistSet error:', e.message);
    }
}

async function _updateExerciseProgress(exId, completedSet) {
    if (!_uid || !exId) return;
    try {
        const progressRef = doc(db, 'users', _uid, 'exercise_progress', exId);
        const existingSnap = await getDoc(progressRef);
        const existing = existingSnap.exists() ? existingSnap.data() : {};

        const newE1RM = completedSet.e1rm;
        const isPR = !existing.personalRecordE1RM || newE1RM > existing.personalRecordE1RM;

        const last5RPE = [...(existing.last5SetsRPE || [])];
        if (completedSet.rpe !== null) {
            last5RPE.push(completedSet.rpe);
        }
        const trimmedRPE = last5RPE.slice(-5);

        // Keep track of the best set of the last 5 sessions
        const recentSessionSummaries = [...(existing.recentSessionSummaries || [])];
        const dateStr = new Date().toLocaleDateString('en-CA');
        
        const summaryObj = {
            weight: completedSet.weight,
            reps: completedSet.reps,
            rpe: completedSet.rpe,
            e1rm: completedSet.e1rm,
            date: dateStr
        };

        if (recentSessionSummaries.length > 0 && recentSessionSummaries[recentSessionSummaries.length - 1].date === dateStr) {
            // Update today's summary if this set is better (higher e1RM)
            const currentBest = recentSessionSummaries[recentSessionSummaries.length - 1];
            if (completedSet.e1rm > currentBest.e1rm) {
                recentSessionSummaries[recentSessionSummaries.length - 1] = summaryObj;
            }
        } else {
            // New session day
            recentSessionSummaries.push(summaryObj);
        }
        
        const trimmedSummaries = recentSessionSummaries.slice(-5);

        const exObj = _day?.exercises?.find(e => e.id === exId);
        const exName = exObj ? exObj.name : 'Bilinmeyen Egzersiz';

        const update = {
            exName:        exName,
            currentE1RM:   (existing.currentE1RM == null || newE1RM > existing.currentE1RM) ? newE1RM : existing.currentE1RM,
            lastWeight:    completedSet.weight,
            lastReps:      completedSet.reps,
            last5SetsRPE:  trimmedRPE,
            recentSessionSummaries: trimmedSummaries,
            lastUpdated:   serverTimestamp()
        };

        if (isPR) {
            update.personalRecordE1RM  = newE1RM;
            update.personalRecordDate  = new Date().toLocaleDateString('en-CA');
        }

        await setDoc(progressRef, update, { merge: true });
    } catch (e) {
        console.warn('[activeSession] _updateExerciseProgress error:', e.message);
    }
}

// ─── Helper ────────────────────────────────────────────────────────────────

function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}
