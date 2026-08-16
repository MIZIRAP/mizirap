/**
 * progressiveOverload.js
 * Shared calculation utilities for the active session and progress pages.
 */

/**
 * Calculate RPE-adjusted estimated 1RM using the Epley formula.
 * If rpe is null/undefined, RIR=0 is assumed (conservative/rough estimate).
 *
 * @param {number} weight - Weight lifted in kg
 * @param {number} reps   - Reps performed
 * @param {number|null} rpe - RPE (6–10), optional
 * @returns {number} e1RM rounded to 1 decimal place
 */
export function calculateE1RM(weight, reps, rpe) {
    const rir = (rpe !== null && rpe !== undefined) ? (10 - rpe) : 0;
    const estimatedMaxReps = reps + rir;
    const e1rm = weight * (1 + estimatedMaxReps / 30); // Epley, RIR-adjusted
    return Math.round(e1rm * 10) / 10;
}

/**
 * Calculate delta between current and previous e1RM.
 * Returns null if there's no previous value to compare against.
 *
 * @param {number} currentE1RM
 * @param {number|null|undefined} previousE1RM
 * @returns {number|null}
 */
export function calculateE1RMDelta(currentE1RM, previousE1RM) {
    if (previousE1RM === null || previousE1RM === undefined) return null;
    return Math.round((currentE1RM - previousE1RM) * 10) / 10;
}

// --- Dev-time verification ---
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    const assert = (desc, actual, expected) => {
        const ok = Math.abs(actual - expected) < 0.2;
        console[ok ? 'log' : 'error'](`[e1RM] ${ok ? '✓' : '✗'} ${desc}: got ${actual}, expected ~${expected}`);
    };
    assert('50kg×8@RPE7', calculateE1RM(50, 8, 7), 68.3);
    assert('55kg×6@RPE9', calculateE1RM(55, 6, 9), 67.8);
    assert('80kg×8@RPE null', calculateE1RM(80, 8, null), 101.3);
}

/**
 * Detect progress status based on recent session history for a specific exercise.
 * @param {Array} recentSessions - Array of best sets from recent sessions in chronological order (oldest to newest).
 *                                  Format: { weight, reps, rpe, e1rm, date }
 * @returns {string|null} "progressing", "plateaued", "attention" or null if insufficient data.
 */
export function detectProgressStatus(recentSessions) {
    if (!recentSessions || recentSessions.length < 2) return null;

    const last = recentSessions[recentSessions.length - 1];
    const prev = recentSessions[recentSessions.length - 2];

    // Rule 1: PLATEAUED — last 3+ sessions have exact same weight, reps, and RPE
    if (recentSessions.length >= 3) {
        const lastThree = recentSessions.slice(-3);
        const allSame = lastThree.every(s => 
            s.weight === lastThree[0].weight && 
            s.reps === lastThree[0].reps && 
            s.rpe === lastThree[0].rpe
        );
        if (allSame) return "plateaued";
    }

    // Rule 2: ATTENTION — RPE is increasing, but weight/reps are stagnant or dropping
    if (last.rpe && prev.rpe && last.rpe > prev.rpe && last.weight <= prev.weight && last.reps <= prev.reps) {
        return "attention";
    }

    // Rule 3: PROGRESSING — e1RM increases, OR same weight/reps with lower RPE
    if (last.e1rm > prev.e1rm) return "progressing";
    if (last.weight === prev.weight && last.reps === prev.reps && last.rpe && prev.rpe && last.rpe < prev.rpe) {
        return "progressing";
    }

    // Default to neutral / plateaued if not clearly progressing or needing attention
    return "plateaued";
}

/**
 * Get actionable suggestion text based on status.
 */
export function getSuggestionText(status, recentSessions) {
    if (status === "plateaued") return "3 antrenmandır aynı ağırlık — deload düşünülebilir";
    if (status === "attention") return "RPE yükseliyor, toparlanmaya dikkat";
    return null;
}
