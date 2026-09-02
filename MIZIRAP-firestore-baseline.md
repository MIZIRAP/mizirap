# MIZIRAP Firestore Analiz Raporu

## 1. Firestore Çağrıları Özeti

Aşağıdaki tabloda modüllerdeki temel Firestore okuma/dinleme ve önemli yazma işlemleri listelenmiştir (Tekil kayıt ekleme/güncelleme gibi çok sayıda olan kullanıcı aksiyonları genel olarak gruplanmıştır).

| Dosya | Fonksiyon | İşlem Tipi | Koleksiyon | Tetikleyici | Risk Notu |
|---|---|---|---|---|---|
| `dashboard.js` | `initWidgetSorting` | `getDoc` | `users/{uid}/profile/data` | Sayfa Girişi | Tekrar eden okuma (profile.js de kullanıyor) |
| `dashboard.js` | `eventListener` | `updateDoc` | `users/{uid}/profile/data` | Kullanıcı Aksiyonu | - |
| `workout.js` | `initWorkout` | `onSnapshot` (x2) | `splits`, `workout_logs` | Sayfa Girişi | `registerListener` ile güvenli |
| `workout.js` | (Çeşitli) | `setDoc`/`addDoc` vb. | `splits`, `workout_logs`, `users` | Kullanıcı Aksiyonu | - |
| `calories.js` | `initCalories` | `onSnapshot` (x4) | `settings/calories`, `calorieLogs` (x2), `foodLibrary` | Sayfa Girişi | `calorieLogs` history.js tarafından da okunuyor |
| `water.js` | `initWater` | `onSnapshot` (x2) | `settings/water`, `waterLogs` | Sayfa Girişi | `waterLogs` history.js tarafından da okunuyor |
| `shopping.js` | `initShopping` | `onSnapshot` | `shoppingList` | Sayfa Girişi | - |
| `finance.js` | `initFinance` | `onSnapshot` (x3) | `finance_categories`, `finance_payment_methods`, `finance_transactions` | Sayfa Girişi | `finance_transactions` history.js tarafından da okunuyor |
| `finance.js` | `loadCache`/`saveCache` | `getDoc`/`setDoc` | `finance_cache` | Sayfa Girişi | - |
| `books.js` | `initBooks` | `onSnapshot` | `books` | Sayfa Girişi | `history.js` de okuyor. `registerListener` kullanılmamış. |
| `movies.js` | `initMovies` | `onSnapshot` | `movies` | Sayfa Girişi | `registerListener` kullanılmamış. |
| `history.js` | `initHistory` | `onSnapshot` (x4) | `calorieLogs`, `waterLogs`, `finance_transactions`, `books` | Sayfa Girişi | **Tümü tekrar eden okumadır** |
| `profile.js` | `initProfile` | `getDoc` | `profile/data` | Sayfa Girişi | Tekrar eden okuma (dashboard.js de okuyor) |
| `activeSession.js`| `finishSession` vb. | `setDoc`/`getDocs` | `workout_logs` | Zamanlayıcı / Kullanıcı | - |

---

## 2. onSnapshot Unsubscribe (İptal) Analizi ve Sızıntı Riski

- **Güvenli (Sızıntı Riski Düşük):** `workout.js`, `calories.js`, `water.js`, `shopping.js`, `finance.js`, ve `history.js` modüllerindeki tüm `onSnapshot` çağrıları `registerListener()` fonksiyonu ile sarmalanmıştır. Bu yapı (`listenerManager.js`), modüller arası geçiş yapıldığında açık olan dinleyicileri otomatik olarak sonlandırdığı için bellek ve okuma sızıntısı riski taşımaz.
- **Potansiyel Riskli (Manuel Yönetim):** `books.js` ve `movies.js` modüllerinde `onSnapshot` çağrıları `registerListener` yerine doğrudan lokal değişkenlere (`booksUnsubscribe`, `moviesUnsubscribe`) atanmıştır. Bu dinleyiciler ilgili modüllerin `clearBooks()` ve `clearMovies()` fonksiyonlarında manuel olarak iptal edilmektedir. Mevcut akışta çalışıyor olsa da, standart dışı bu kullanım gelecekteki geliştirmelerde sızıntı (memory leak / gereksiz firestore okuması) potansiyeli taşır.

---

## 3. Dashboard.js Modül ve Sorgu Sayısı

- **Kendi Yaptığı Sorgular:** `dashboard.js`, sayfa yüklendiğinde widget sıralamasını getirmek ve değiştirmek için yalnızca kendi içinde **1 adet koleksiyona** (`users/{uid}/profile/data`) doğrudan sorgu atar (1 okuma, 1 yazma).
- **Diğer Modüllerden Gelen Veriler:** Dashboard, arayüzde gösterdiği asıl istatistikler için Firestore'a doğrudan sorgu **yapmaz**. Bunun yerine uygulamadaki **6 farklı modül** (`workout`, `finance`, `water`, `calories`, `books`, `movies`), verilerini çektiklerinde `dashboard.js`'e veriyi iletir (ör. `updateDashboardWorkouts`). 

---

## 4. Tekrar Eden Okumalar (Duplicate Reads)

Aynı verinin farklı modüller tarafından tekrar tekrar Firestore'dan çekildiği ana darboğazlar şunlardır:

1. **Geçmiş Verileri (En Yüksek Maliyet):** `history.js` modülü geçmişi göstermek için `calorieLogs`, `waterLogs`, `finance_transactions` ve `books` koleksiyonlarına kendine ait yepyeni `onSnapshot` dinleyicileri bağlamaktadır. Halbuki bu veriler ilgili ana modüllerde (`calories.js`, `water.js`, `finance.js`, `books.js`) halihazırda çekilmektedir. Global bir state management (veya window üzerinde cache) kullanılmadığı için gereksiz okuma (read) maliyeti oluşmaktadır.
2. **Kullanıcı Profil/Ayar Verisi:** `users/{uid}/profile/data` koleksiyonu, hem `dashboard.js` (widget sıralaması için) hem de `profile.js` (profil bilgileri için) tarafından ayrı ayrı `getDoc` ile okunmaktadır.
3. **Kalori Logları:** `calories.js` kendi içinde bile günlük loglar ve haftalık loglar için `calorieLogs` koleksiyonuna iki ayrı `onSnapshot` sorgusu (farklı query'ler ile) açmaktadır. Bu da kısmi tekrara neden olmaktadır.
