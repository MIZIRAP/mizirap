export const activeListeners = [];
export const firestoreListeners = new Map(); // key -> { setupFn, unsub }

export function registerListener(unsubscribeFn) {
    if (typeof unsubscribeFn === 'function') {
        activeListeners.push(unsubscribeFn);
        return unsubscribeFn;
    }
    return null;
}

export function registerFirestoreListener(key, setupFn) {
    if (firestoreListeners.has(key)) {
        unregisterFirestoreListener(key);
    }
    const unsub = setupFn();
    firestoreListeners.set(key, { setupFn, unsub });
    return unsub;
}

export function unregisterFirestoreListener(key) {
    const listener = firestoreListeners.get(key);
    if (listener && listener.unsub) {
        try { listener.unsub(); } catch(e) { console.error("Error unsubscribing firestore listener:", e); }
        listener.unsub = null;
    }
}

export function resumeFirestoreListener(key) {
    const listener = firestoreListeners.get(key);
    if (listener && !listener.unsub) {
        listener.unsub = listener.setupFn();
    }
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

    firestoreListeners.forEach((listener, key) => {
        if (listener.unsub) {
            try { listener.unsub(); } catch(e) { console.error("Error unsubscribing firestore listener:", e); }
            listener.unsub = null;
        }
    });
    firestoreListeners.clear();
}
