# MIZIRAP - Güncel Durum Envanteri (18 Eylül 2026)

Bu belge, proje kod tabanından (statik analiz ile) derlenmiş **gerçek** durumu yansıtmaktadır. HİÇBİR tahmin veya eski rapora dayalı varsayım içermez; sadece kodun mevcut halinde yer alan yapılar belgelenmiştir.

---

## 1. Mimari & Modül Haritası

- **app.js**: Uygulamanın giriş noktası ve routing yöneticisidir.
  - **Statik Yüklenenler (İlk açılışta):** `auth.js`, `dashboard.js`, `water.js`, `profile.js`, `history.js`, `listenerManager.js`, `sharedState.js`, `workout.js`, `activeSession.js`.
  - **Lazy Load (Tıklanınca yüklenenler):** `window.showView` fonksiyonu içerisinde `import()` ile dinamik yüklenirler: `calories.js`, `finance.js`, `books.js`, `movies.js`, `shopping.js`, `tools.js`. 
  - *Not:* Routing mekanizması `history.pushState` ve `popstate` dinleyicisi ile tarayıcı geçmişini (Back/Forward) destekleyecek şekilde güncellenmiştir.
- **activeSession.js**: Aktif antrenman yönetimini üstlenir. `db`, `auth` (firebase-config) ve `getDailySummaryRef` (dashboard) modüllerini import eder.
- **dashboard.js**: Ana ekranı yönetir. `auth`, `db`, `utils`, `finance`, `sharedState` ve `listenerManager` modüllerine bağımlıdır.
- **profile.js / sharedState.js**: Profil verileri `sharedState.js` üzerinden bellekte (memory) önbelleklenir.

---

## 2. Firestore Şeması (Koddan Doğrulanan)

Kodda `collection(db, "users", uid, ...)` veya `doc(db, "users", uid, ...)` formatında geçen **gerçek** koleksiyonlar şunlardır:
- `splits`: Egzersiz programları (workout.js)
- `workout_logs`: Tamamlanmış antrenman kayıtları (workout.js, activeSession.js)
- `waterLogs`: Su içme kayıtları (water.js, dashboard.js)
- `shoppingList`: Alışveriş listesi (shopping.js)
- `movies`: Film/Dizi kütüphanesi (movies.js, dashboard.js)
- `book_logs`: Kitap okuma geçmişi (history.js)
- `books`: Kitap kütüphanesi (books.js, dashboard.js)
- `finance_categories`, `finance_payment_methods`, `finance_transactions`: Finans verileri (finance.js)
- `calorieLogs`: Kalori kayıtları (calories.js, dashboard.js)
- `foodLibrary`: Özel gıda kütüphanesi (calories.js)
- `exerciseProgress`: Her bir egzersizin (safeId) geçmişi ve PR durumu (activeSession.js)
- `summary/daily-{date}`: Günlük özet veri yapısı (dashboard.js, activeSession.js)
- `summary/exerciseProgressIndex`: Egzersiz gelişim ana dizini (activeSession.js)

**Kritik Gözlemler:**
- **dashboard.js Veri Çekme:** Dashboard, `summary/daily-{date}` dinleyicisine sahiptir (line 64: `registerFirestoreListener('dashboard', onSnapshot(dailyRef...))`). Ancak başlatma sırasında (initDashboard) `waterLogs`, `calorieLogs`, `books`, `movies`, `finance_transactions` koleksiyonlarına çoklu (multi-query) sorgular da atarak migration / default state oluşturmaktadır. 
- **exerciseProgressIndex Alanları:** `activeSession.js` satır 614'te; `trackedExerciseCount`, `totalSessions`, `thisMonthVolume`, `lastMonthVolume`, `volumeChangePercent`, `lastMonthStr`, `exercises` (array) barındırdığı görülmüştür. Array içindeki objeler: `exerciseId`, `exerciseName`, `category`, `sparkline`, `lastVolume`, `changePercent`, `isNewPR`.
- **movies (type/status):** `movies.js` 177. satırda `movie.type || 'series'` ve `movie.status` kontrolleri vardır. Eski kayıtlar için UI seviyesinde fallback (`isLegacy = (!type || !status)`) yapılmıştır, veri tabanında toplu (batch) migration kodu bulunmamaktadır.

---

## 3. Listener & Cache Durumu

- **listenerManager.js API'si:**
  - `activeListeners` (array) ve `firestoreListeners` (Map) mevcuttur.
  - `registerListener`, `clearAllListeners`, `registerFirestoreListener`, `unregisterFirestoreListener`, `clearAllFirestoreListeners` fonksiyonları aktif kullanılmaktadır.
  - `window.__debugListenerCount()` gibi bir debug aracı kod tabanında **BULUNAMAMIŞTIR**.
- **foodLibrary (calories.js) Önbelleği:** `calories.js` 129. satırda `getDocsFromCache(libRef)` kullanılarak gıda kütüphanesi çevrimdışı önbellekten okunmaktadır. Ancak `settingsRef`, `logsRef`, `weeklyRef` için `onSnapshot` (gerçek zamanlı) dinleme tercih edilmiştir.
- **profile.js Önbelleği:** `sharedState.js` içinde `profileCache` adında module-level bir obje bulunur. Invalid (sıfırlama) noktaları: `uid` değiştiğinde (auth state), manuel kayıt yapıldığında (`updateSharedProfile`) ve çıkışta (`clearSharedState`).

---

## 4. Aktif Seans (activeSession.js)

- **Akordiyon / Toggle:** Egzersiz hareketleri HTML'e string template literal ile basılmaktadır. Tıklama olayı **Event Delegation** ile `document.addEventListener('click', ...)` (satır 39) üzerinden yakalanmaktadır. Toggle işlevi, `.closest()` yerine doğrudan `document.getElementById` tabanlı (`_openExAccordions.has(exId)` mantığıyla) kararlı bir yapıda çalışmaktadır.
- **Batch Write (Faz 4):** Antrenmanı bitirme fonksiyonunda (`_finishSession` satır 638) `const batch = writeBatch(db);` kullanılmaktadır. Session Log, Progress detayları ve Progress Index tek seferde atomik olarak yazılmaktadır.
- **Yerel Yedekleme (Prompt B):** `localStorage` veya `IndexedDB` kullanımına dair bir kod antrenman state'i için **EKLENMEMİŞTİR**. Antrenman anlık olarak `setDoc(sessionRef, { exercises }, { merge: true })` ile Firestore'a kaydedilmektedir.
- **UID Referansı:** Çoğu fonksiyonda modül seviyesindeki `_uid` değişkeni kullanılsa da, dashboard entegrasyonu (satır 776) için `getDailySummaryRef(auth.currentUser.uid)` şeklinde fallback kullanılmıştır. İkisi de aynı değeri taşıdığından sorun yaratmamaktadır.

---

## 5. Tasarım Sistemi Referansı

- **CSS (Neo-surface):** Bu class'lar `style.css` yerine doğrudan `index.html` `<body>` üstündeki `<style>` etiketlerinde (satır 129) tanımlanmıştır:
  - `.neo-surface`: `background-color: #f0f2f8; box-shadow: 6px 6px 12px rgba(0,0,0,0.08), -6px -6px 12px rgba(255,255,255,0.7);`
  - `.neo-inset`: `box-shadow: inset 4px 4px 8px rgba(0,0,0,0.06), inset -4px -4px 8px rgba(255,255,255,0.7);`
- **Popup / Modal Pattern:** Finans modalı (`finance-add-tx-modal`) ve Filmler modalı (`movies-modal`) `bg-background shadow-neo w-full sm:w-[90%] sm:max-w-[390px] mx-auto rounded-t-2xl sm:rounded-[32px] ... max-h-[90dvh]` gibi sınıflarla Bottom-Sheet / ortalanmış neo-morfik modal standardına (daily-goal pattern) geçirilmiştir.
- **Movies Sekmeleri:** Egzersiz kütüphanesindeki sekme mantığı Filmler'e uygulanmıştır (Tümü, İzlenenler, İzlenecekler, Devam Edenler, Film, Dizi). `index.html` satır 3265-3270 arasında HTML tab'leri ve `movies.js` içinde filter fonksiyonları (`filterMovies`) doğrulanmıştır.

---

## 6. Bilinen Teknik Borç / Açık Uçlar

- **"ŞÜPHELİ" Dosyalar:** Kod tabanında "ŞÜPHELİ", "SUPHELI" kelimeleri içeren herhangi bir .js veya .md dosyası **BULUNMAMAKTADIR**. Geçmişteki şüpheli temizlikleri yapılmıştır.
- **Encoding (Mojibake):** Tüm `.js` ve `index.html` dosyalarında yapılan taramada "Ã, Ä, Å" gibi karakter bozulmalarına rastlanmamıştır. 
- **IndexedDB / BloomFilter Hatası:** `firebase-config.js` dosyası kontrol edildiğinde, Firebase 10.14.1 modüler SDK standartlarına uygun şekilde `persistentLocalCache({ tabManager: persistentMultipleTabManager() })` kullanıldığı görülmüştür. Eski v9 API'si olan `enableMultiTabIndexedDbPersistence` kullanılmadığı için konsol hatası muhtemelen giderilmiştir.
- **Son Commit Özetleri (Faz/Prompt Doğrulaması):**
  1. `fix(ios): safe-area-inset-top eklendi` (Çentik sorunu giderildi)
  2. `fix(ui): glass-nav backdrop-blur kaldirildi` (Bulanık başlık sorunu giderildi)
  3. `fix(ui): navbar olmadığı için safe-area-inset-bottom padding kaldırıldı` (Alt boşluk)
  4. `fix(mobile): cift tik zoom tamamen engellendi`
  5. `fix(finance): islem gir popup max-height duzeltildi`
  6. `feat(workout): set tamamlama aninda kaydediliyor`
  7. `fix(core): activeSession event delegation ile baştan yazıldı`
  8. `fix(workout): workout ve activeSession statik import'a alınarak timer hataları çözüldü` 
  - *Doğrulama:* Yukarıdaki commitler uygulamanın stabilizasyon promptlarına sadık kalındığını açıkça göstermektedir.
