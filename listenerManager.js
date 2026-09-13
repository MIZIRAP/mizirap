export const activeListeners = [];
export const firestoreListeners = new Map();

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

// --- Firestore Listener Management ---
export function registerFirestoreListener(key, unsubscribeFn) {
    if (typeof unsubscribeFn === 'function') {
        // If a listener with this key already exists, unsubscribe it first
        if (firestoreListeners.has(key)) {
            unregisterFirestoreListener(key);
        }
        firestoreListeners.set(key, unsubscribeFn);
        return unsubscribeFn;
    }
    return null;
}

export function unregisterFirestoreListener(key) {
    if (firestoreListeners.has(key)) {
        try {
            const unsub = firestoreListeners.get(key);
            if (typeof unsub === 'function') unsub();
        } catch (e) {
            console.error(`Error unsubscribing firestore listener [${key}]:`, e);
        } finally {
            firestoreListeners.delete(key);
        }
    }
}

export function clearAllFirestoreListeners() {
    firestoreListeners.forEach((unsub, key) => {
        try {
            if (typeof unsub === 'function') unsub();
        } catch (e) {
            console.error(`Error unsubscribing firestore listener [${key}]:`, e);
        }
    });
    firestoreListeners.clear();
}
