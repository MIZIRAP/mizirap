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

    // Try to resume an existing in-progress session for today
    const todayStr = new Date().toLocaleDateString('en-CA');
    const existingId = `${splitId}_${dayId}_${todayStr}`;
    const existingRef = doc(db, 'users', uid, 'workout_logs', existingId);
    const existingSnap = await getDoc(existingRef);

    if (existingSnap.exists() && existingSnap.data().status === 'in_progress') {
        _sessionId = existingId;
        _sessionDoc = existingSnap.data();
        _sessionStartTs = _sessionDoc.startedAt?.toDate?.() || new Date();
    } else {
        // Create a fresh session document
        _sessionId = existingId;
        _sessionDoc = {
            splitId,
            dayId,
            dateStr: todayStr,
            status: 'in_progress',
            startedAt: serverTimestamp(),
            exercises: {}
        };
        await setDoc(existingRef, _sessionDoc, { merge: true });
        // Re-fetch to get server timestamp
        const freshSnap = await getDoc(existingRef);
        _sessionStartTs = freshSnap.data().startedAt?.toDate?.() || new Date();
        _sessionDoc = freshSnap.data();
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

// ─── Previous session data ─────────────────────────────────────────────────

// Map: exerciseId → { weight, reps, e1rm, sets[] }
let _prevData = {};

async function _loadPreviousSessionData() {
    if (!_uid || !_splitId || !_dayId) return;
    _prevData = {};

    try {
        const logsRef = collection(db, 'users', _uid, 'workout_logs');
        const q = query(
            logsRef,
            where('splitId', '==', _splitId),
            where('dayId', '==', _dayId),
            where('status', '==', 'completed'),
            orderBy('dateStr', 'desc'),
            limit(1)
        );
        const snap = await getDocs(q);
        if (snap.empty) return;

        const lastLog = snap.docs[0].data();
        if (lastLog.exercises) {
            _prevData = lastLog.exercises; // { [exId]: { sets:[{weight,reps,rpe,e1rm}] } }
        }
    } catch (e) {
        // Index may not exist yet; silently fail — delta won't show
        console.warn('[activeSession] Could not load previous session:', e.message);
    }
}

// ─── Local state builder ───────────────────────────────────────────────────

function _buildExState() {
    if (!_day || !_day.exercises) return;

    _day.exercises.forEach(ex => {
        const defaultSets = ex.defaultSets || 3;
        const draftSets = _sessionDoc?.exercises?.[ex.id]?.sets || [];

        const sets = [];
        for (let i = 0; i < defaultSets; i++) {
            const draft = draftSets[i];
            const prevSet = _prevData?.[ex.id]?.sets?.[i];
            sets.push({
                weight: draft?.weight ?? prevSet?.weight ?? 60,
                reps:   draft?.reps   ?? prevSet?.reps   ?? (ex.defaultSets ? 8 : 8),
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
            prevBestReps:   prevBest?.sets?.[0]?.reps   ?? null,
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

function _renderSessionExercises() {
    const container = document.getElementById('session-exercises-container');
    if (!container || !_day) return;
    container.innerHTML = '';

    _day.exercises.forEach((ex, exIdx) => {
        const state = _exState[ex.id];
        if (!state) return;

        const card = document.createElement('section');
        card.className = 'bg-surface-container-lowest rounded-xl shadow-sm border border-surface-variant/20 flex flex-col overflow-hidden';
        card.id = `session-card-${ex.id}`;

        const prevLine = (state.prevBestWeight !== null)
            ? `Son antrenman: ${state.prevBestWeight}kg × ${state.prevBestReps} reps`
            : 'İlk antrenman';

        card.innerHTML = `
            <!-- Card Header -->
            <div class="flex items-center gap-sm p-md pb-sm">
                <div class="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center text-primary shrink-0">
                    <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1">fitness_center</span>
                </div>
                <div class="flex-1 min-w-0">
                    <h2 class="font-title-lg text-title-lg text-on-surface truncate">${escHtml(ex.name)}</h2>
                    <p class="font-body-md text-body-md text-on-surface-variant">${prevLine}</p>
                </div>
            </div>
            <!-- Set list -->
            <div class="flex flex-col" id="sets-container-${ex.id}"></div>
            <!-- Add Set -->
            <button onclick="sessionAddSet('${ex.id}')"
                class="font-label-lg text-label-lg text-primary self-center my-2 hover:bg-primary/5 px-4 py-2 rounded-full transition-colors">
                + Set Ekle
            </button>
        `;

        container.appendChild(card);
        _renderSets(ex.id);
    });

    // Finish session button
    const finishBtn = document.getElementById('session-finish-btn');
    if (finishBtn) {
        finishBtn.onclick = finishSession;
    }
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
            setEl.className = 'flex items-center gap-sm px-md py-sm border-b border-surface-container-high last:border-0 bg-surface-container/40';
            setEl.innerHTML = _completedSetHTML(exId, setIdx, set);
        } else {
            // Is this the first non-completed set?
            const isActive = state.sets.slice(0, setIdx).every(s => s.status === 'completed');
            if (isActive) {
                setEl.className = 'flex flex-col gap-md px-md py-md border-b border-surface-container-high last:border-0 bg-surface-container-low/60 border-l-4 border-l-primary relative';
                setEl.innerHTML = _activeSetHTML(exId, setIdx, set);
            } else {
                setEl.className = 'flex items-center gap-sm px-md py-sm border-b border-surface-container-high last:border-0 opacity-50';
                setEl.innerHTML = _pendingSetHTML(setIdx, set);
            }
        }

        container.appendChild(setEl);
    });
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
            <div class="flex justify-between items-center">${rpeButtons}</div>
            <p class="text-center font-body-md text-body-md text-on-surface-variant mt-1">
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

window.sessionStepWeight = function(exId, setIdx, delta) {
    const set = _exState[exId]?.sets[setIdx];
    if (!set || set.status === 'completed') return;
    set.weight = Math.max(0, Math.round((set.weight + delta) * 10) / 10);
    set.e1rm = calculateE1RM(set.weight, set.reps, set.rpe);
    _refreshActiveSetDisplay(exId, setIdx, set);
    _debounceSaveDraft(exId, setIdx);
};

window.sessionStepReps = function(exId, setIdx, delta) {
    const set = _exState[exId]?.sets[setIdx];
    if (!set || set.status === 'completed') return;
    set.reps = Math.max(1, set.reps + delta);
    set.e1rm = calculateE1RM(set.weight, set.reps, set.rpe);
    _refreshActiveSetDisplay(exId, setIdx, set);
    _debounceSaveDraft(exId, setIdx);
};

window.sessionSetRPE = function(exId, setIdx, rpe) {
    const set = _exState[exId]?.sets[setIdx];
    if (!set || set.status === 'completed') return;
    // Toggle off if same button tapped twice
    set.rpe = set.rpe === rpe ? null : rpe;
    set.e1rm = calculateE1RM(set.weight, set.reps, set.rpe);
    _refreshActiveSetDisplay(exId, setIdx, set);
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

        // Build exercises summary
        const exercises = {};
        if (_day && _day.exercises) {
            _day.exercises.forEach(ex => {
                const state = _exState[ex.id];
                if (!state) return;
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
            });
        }

        await setDoc(
            doc(db, 'users', _uid, 'workout_logs', _sessionId),
            { status: 'completed', durationSeconds: elapsed, exercises },
            { merge: true }
        );

        _stopTimer();

        // Navigate back to workout home
        document.getElementById('view-active-session').classList.add('hidden');
        document.getElementById('view-workout').classList.remove('hidden');

        // Trigger a re-render of the workout summary
        if (typeof renderSplitView === 'function') renderSplitView();

    } catch (e) {
        console.error('[activeSession] finishSession error:', e);
        alert('Antrenman kaydedilemedi: ' + e.message);
        if (btn) { btn.disabled = false; btn.textContent = 'Antrenmanı Bitir'; }
    }
};

// ─── Live display refresh (no full re-render) ──────────────────────────────

function _refreshActiveSetDisplay(exId, setIdx, set) {
    const row = document.getElementById(`set-row-${exId}-${setIdx}`);
    if (!row) return;

    // Update weight display
    const spans = row.querySelectorAll('.font-title-lg');
    if (spans[0]) spans[0].textContent = set.weight;
    if (spans[1]) spans[1].textContent = set.reps;

    // Update e1RM display
    const e1rmPara = row.querySelector('p');
    if (e1rmPara) {
        const isRough = set.rpe === null;
        const e1rmVal = set.e1rm ?? calculateE1RM(set.weight, set.reps, set.rpe);
        e1rmPara.innerHTML = `Tahmini e1RM: ${isRough ? `<span class="italic text-on-surface-variant/60">~${e1rmVal}kg</span>` : `<span>${e1rmVal}kg</span>`}`;
    }

    // Refresh RPE buttons
    const rpeButtons = row.querySelectorAll('.flex.justify-between.items-center button');
    rpeButtons.forEach((btn, i) => {
        const rpeVal = i + 6;
        const isSelected = set.rpe === rpeVal;
        btn.className = `w-10 h-10 rounded-full border transition-all duration-150 font-label-lg text-label-lg active:scale-95
            ${isSelected
                ? 'bg-primary text-on-primary border-transparent shadow-sm scale-110 ring-2 ring-primary/30 ring-offset-1 ring-offset-surface-container-low'
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

        const update = {
            currentE1RM:   (existing.currentE1RM == null || newE1RM > existing.currentE1RM) ? newE1RM : existing.currentE1RM,
            lastWeight:    completedSet.weight,
            lastReps:      completedSet.reps,
            last5SetsRPE:  trimmedRPE,
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
