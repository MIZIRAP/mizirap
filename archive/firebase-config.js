// ============================================
// FIREBASE YAPILANDIRMASI
// ============================================
// Bu bilgileri Firebase Console'dan alacaksın:
// 1. https://console.firebase.google.com adresine git
// 2. "Add project" ile yeni proje oluştur (örn. "hayat-defteri")
// 3. Sol menüden Project Settings (dişli ikonu) > General
// 4. "Your apps" bölümünden Web (</>) ikonuna tıkla, bir app kaydet
// 5. Sana verilen firebaseConfig nesnesini aşağıya yapıştır
//
// Ayrıca şunları AÇMAN gerekiyor (Firebase Console üzerinden):
// - Authentication > Sign-in method > Email/Password'ü etkinleştir
// - Firestore Database > Create database (production mode, en yakın bölge)
//
// Firestore Rules (Firestore > Rules sekmesinden yapıştır):
//   rules_version = '2';
//   service cloud.firestore {
//     match /databases/{database}/documents {
//       match /users/{userId}/{document=**} {
//         allow read, write: if request.auth != null && request.auth.uid == userId;
//       }
//     }
//   }
// ============================================

export const firebaseConfig = {
  apiKey: "AIzaSyDsl5JcjYP9Q37iU1cVCA9THW_N3DU-CQw",
  authDomain: "mylife-bfacc.firebaseapp.com",
  projectId: "mylife-bfacc",
  storageBucket: "mylife-bfacc.firebasestorage.app",
  messagingSenderId: "307968825724",
  appId: "1:307968825724:web:ea1f9aa2287549a8a1acf9"
};