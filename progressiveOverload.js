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
