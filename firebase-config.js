import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, enableMultiTabIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
export const firebaseConfig = {
  apiKey: "AIzaSyDsl5JcjYP9Q37iU1cVCA9THW_N3DU-CQw",
  authDomain: "mylife-bfacc.firebaseapp.com",
  projectId: "mylife-bfacc",
  storageBucket: "mylife-bfacc.firebasestorage.app",
  messagingSenderId: "307968825724",
  appId: "1:307968825724:web:ea1f9aa2287549a8a1acf9"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.warn("Offline persistence: Multiple tabs open, persistence can only be enabled in one tab at a time.");
    } else if (err.code == 'unimplemented') {
        console.warn("Offline persistence: The current browser does not support all of the features required to enable persistence.");
    }
});
