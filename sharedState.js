// sharedState.js
import { db } from "./firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const state = {
    calories: [],
    water: [],
    finance: []
};

const listeners = {
    calories: [],
    water: [],
    finance: []
};

let currentProfileUid = null;
let profileCache = null;
let profilePromise = null;

export async function fetchSharedProfile(uid) {
    if (currentProfileUid !== uid) {
        profileCache = null;
        profilePromise = null;
        currentProfileUid = uid;
    }

    if (profileCache !== null) return profileCache;
    if (profilePromise !== null) return profilePromise;
    
    profilePromise = (async () => {
        try {
            const docRef = doc(db, "users", uid, "profile", "data");
            const snap = await getDoc(docRef);
            
            if (currentProfileUid !== uid) {
                return {}; // Stale response, don't write to cache
            }

            profileCache = snap.exists() ? snap.data() : {};
            return profileCache;
        } catch(e) {
            if (currentProfileUid === uid) {
                profilePromise = null;
            }
            throw e;
        }
    })();
    return profilePromise;
}

export function updateSharedProfile(newData) {
    if (profileCache !== null) {
        profileCache = { ...profileCache, ...newData };
    } else {
        profileCache = { ...newData };
    }
}

export function setSharedState(key, data) {
    state[key] = data;
    listeners[key].forEach(cb => cb(data));
}

export function getSharedState(key) {
    return state[key];
}

export function subscribeSharedState(key, cb) {
    listeners[key].push(cb);
    return () => {
        listeners[key] = listeners[key].filter(listener => listener !== cb);
    };
}

export function clearSharedState() {
    // 1. Clear data in memory
    state.calories = [];
    state.water = [];
    state.finance = [];
    profileCache = null;
    profilePromise = null;
    currentProfileUid = null;
    
    // 2. Safely broadcast empty data to any active subscribers
    Object.keys(listeners).forEach(key => {
        listeners[key].forEach(cb => {
            try {
                cb([]);
            } catch(e) {
                console.error('Error clearing shared state for listener', e);
            }
        });
    });
}
