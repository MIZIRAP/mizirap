# PROJECT_CONTEXT

1. **DOSYA YAPISI**
   - `index.html`: Uygulamanın ana iskeleti, Tailwind konfigürasyonu ve DOM şablonları. Tüm `view` section'ları `#app-container` div'i içinde bulunmalı (split-screen hatasını önlemek için).
   - `app.js`: Ana kontrolcü, auth durumu yönetimi ve sekme/modül geçişlerini koordine eden dosya. `window.currentUid` ve `localStorage uid` burada set ediliyor.
   - `style.css`: Özel animasyonlar, gizli scrollbar ayarları ve genel UI stilleri.
   - `firebase-config.js`: Firebase bağlantı ve başlatma ayarları.
   - `api-config.js`: Dış servis (CollectAPI) anahtarları.
   - `utils.js`: Tarih formatlama, DOM güvenliği vb. yardımcı fonksiyonlar.
   - `listenerManager.js`: Firebase dinleyicilerini (onSnapshot) merkezi yöneten ve temizleyen araç.
   - `auth.js`: Giriş ekranı ve kimlik doğrulama işlemleri.
   - `dashboard.js`: Ana özet ekranının yönetimi.
   - `books.js`, `calories.js`, `finance.js`, `movies.js`, `shopping.js`, `water.js`, `history.js`, `profile.js`: İlgili özelliklerin UI ve veritabanı işlemlerini yürüten ayrık modül dosyaları.
   - `workout.js`: Antrenman programları (splits) ve aktif seans navigasyonu.
   - `activeSession.js`: **[YENİ]** Aktif antrenman seansının tüm state yönetimi, set tamamlama, RPE seçimi, zamanlayıcı ve Firestore yazma işlemleri. (workout.js'ten ayrıştırıldı)
   - `assets/exercises/muscle-map.js`: Egzersiz adı → kas grubu eşlemesi (`window.EXERCISE_MUSCLE_MAPPING`).
   - `firestore.rules`: Veritabanı okuma/yazma güvenlik izinleri. `match /users/{userId}/{document=**}` ile tüm alt koleksiyonlar kapsanıyor.

2. **TEKNOLOJİ YIĞINI**
   - **Frontend**: Vanilla JavaScript (ES Modules), HTML5, CSS3.
   - **Framework/Kütüphaneler**: Tailwind CSS (CDN üzerinden), Sortable.js (sürükle-bırak için), Material Symbols.
   - **Backend / Veritabanı**: Firebase v10 CDN (Authentication, Firestore).
   - **Harici API**: CollectAPI (Finans modülünde kur/metal verisi için).
   - **Build/Deploy**: Herhangi bir build aracı kullanılmıyor. `main` branch üzerinden GitHub Pages ile doğrudan barındırılıyor.
   - **Cache Busting**: JS modüllerine `?v=N` query string eklenerek tarayıcı önbellekleme zorla kırılıyor (`workout.js?v=4`, vb.).

3. **MODÜL / ÖZELLİK ENVANTERİ**
   - **Dashboard**: Diğer modüllerden verileri çekip ana sayfada gösterir. (Tamamlandı)
   - **Auth**: E-posta/Şifre veya Google giriş sağlar. (Tamamlandı)
   - **Books**: Okunan/okunacak kitaplar ve sayfa okuma logları. (Tamamlandı)
   - **Calories**: Hedef kalori takibi, besin kütüphanesi ve öğün logları. (Tamamlandı)
   - **Finance**: Gelir/Gider işlemleri, kategoriler, ödeme yöntemleri ve bakiye hesabı. (Tamamlandı)
   - **Shopping**: Alışveriş listesi yönetimi (ekle/çiz/sil). (Tamamlandı)
   - **Water**: Günlük hedefli su tüketim takibi. (Tamamlandı)
   - **Movies**: Film izleme listesi. (Tamamlandı)
   - **History**: Diğer modüllerdeki son aktivitelerin ortak listesi. (Tamamlandı)
   - **Workout / Egzersiz Kütüphanesi**: Split oluşturma, gün bazlı egzersiz seçimi, SVG kas haritası. (Tamamlandı)
   - **Aktif Antrenman Seansı** (`activeSession.js`): Akordiyon egzersiz kartları, ağırlık/tekrar stepper, RPE seçici (6–10), e1RM hesaplama, zamanlayıcı, otomatik taslak kayıt (400ms debounce), seti tamamlama. (Tamamlandı)


4. **VERİ MODELİ**
   - Tüm veriler Firestore'da izolasyon için `users/{userId}` path'i altında tutuluyor.
   - **Koleksiyonlar**:
     - `finance_categories`, `finance_payment_methods`, `finance_transactions` (Finans)
     - `calorieLogs`, `foodLibrary` (Kalori)
     - `shoppingList` (Alışveriş)
     - `waterLogs` (Su)
     - `books`, `book_logs` (Kitap)
     - `splits` (Antrenman programları — gün ve egzersiz listesiyle)
     - `workout_logs` (Seans kayıtları: `status: in_progress | completed`, `exercises: { [exId]: { sets: [...] } }`)
     - `movies` (Sinema)
   - **Dokümanlar**: Global ayarlar `users/{userId}/settings/` altında tutulur.
   - **Seans ID formatı**: `${splitId}_${dayId}_${dateStr}_${Date.now()}` — tekil, tamamlanan seansların üzerine yazılmaz.

5. **TASARIM KARARLARI VE KISITLAR**
   - **Mobil-first layout**: `#app-container` (`max-w-[420px]`) tüm `view` section'larını sarmalıyor. Bu div dışında kalan herhangi bir `view`, masaüstünde split-screen görünümüne yol açar — kritik kısıt.
   - **Tasarım Sistemi**: Tailwind Play CDN ile yapılandırılmış; ana renkler (`#446554` primary, `#7d562b` secondary), Inter fontu, Material Symbols ikonlar.
   - **Vanilla JS & Firebase CDN**: Build süreci olmaksızın GitHub Pages'te doğrudan çalışacak şekilde tasarlandı.
   - **Listener Yönetimi**: `listenerManager.js` üzerinden merkezi kayıt — logout'ta bellek sızıntısını önler.
   - **Global State**: `window.currentUid` ve `localStorage('uid')` ile uid, tüm modüller arası paylaşılıyor. `app.js`'de auth callback'te ve `workout.js`'de `initWorkout`'ta set ediliyor.
   - **Cache Busting**: Modül dosyalarına `?v=N` ekleniyor; production'da CDN'i zorla günceller.

6. **BİLİNEN SORUNLAR / YARIM KALANLAR**
   - **Firestore index**: `activeSession.js`'deki yeni seans sorgusu (`where('status','==','in_progress') + where('dayId','==', dayId)`) bileşik bir Firestore indeksi gerektirebilir — console'da "index required" hatası görülürse Firebase konsolundan ilgili indeksin oluşturulması gerekiyor.
   - **Teknik Borç**: Global değişkenler ve event listener'larla manuel state yönetimi. Tailwind CDN'in tarayıcıda derlenmesi (production için ağır, bilinçli olarak bırakılmış).
   - **Yarım Kalan / Planlanan**: Finans için grafik/pasta dilimi, notlarda arama, görevlere kategori.

7. **SON DURUM** *(Güncelleme: 17 Ağustos 2026)*
   - **Bu oturumda tamamlananlar:**
     - `#app-container` kapanış etiketi eksikliği düzeltildi → split-screen layout sorunu çözüldü.
     - Aktif antrenman seansında ağırlık/tekrar değişiklikleri artık otomatik kaydediliyor (debounced Firestore write).
     - "Antrenman Bitir" sonrası zamanlayıcı sıfırlanıyor; aynı gün tekrar girildiğinde yeni seans sıfırdan başlıyor.
     - `window.currentUid` ve `localStorage uid` tüm modüllere güvenilir şekilde yayılıyor.
   - **Mevcut durum:** Tüm temel modüller çalışıyor.
   - **Sonraki potansiyel adım:** Firestore bileşik indeks uyarısını izlemek.

8. **TERCİHLER / ÇALIŞMA TARZI NOTLARI**
   - Gereksiz dolgu metinleri ve uzatılmış açıklamalardan kaçınılmalı.
   - Kararlar rasyonel temellere (neden/sonuç) oturtularak, doğrudan amaca yönelik kısa cevaplarla ve kod/dosya odaklı ilerlenmeli.
