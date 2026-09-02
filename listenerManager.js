export const activeListeners = [];

export function registerListener(unsubscribeFn) {
    if (typeof unsubscribeFn === 'function') {
        activeListeners.push(unsubscribeFn);
        return unsubscribeFn;
    }
    return null;
}

export function clearAllListeners() {
    activeListeners.forEach(unsub => {
        try {
            unsub();
        } catch(e) {
            console.error("Error unsubscribing listener:", e);
        }
    });
    activeListeners.length = 0; // Clear the array
}
