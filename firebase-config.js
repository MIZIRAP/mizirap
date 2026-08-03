import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";

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
export const storage = getStorage(app);
