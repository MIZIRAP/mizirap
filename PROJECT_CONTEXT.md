# MIZIRAP - Proje Hafızası (Project Context)

Bu dosya projenin teknik özetini, mimari kararlarını ve son durumunu tek bakışta anlayabilmek için hazırlanmıştır. 

## 1. DOSYA YAPISI
- `index.html`: Uygulamanın tüm görsel şablonlarını (views) tek sayfada barındıran Ana (Root) HTML dosyası.
- `style.css`: Tüm sayfalarda kullanılan özel UI/UX stil düzeltmelerini, animasyon ve neumorphic tasarımları barındıran temel stil.
- `app.js`: Yönlendirme (History API ile Routing), uygulama başlatma ve genel modüllerin birbirine bağlanmasından sorumlu ana kontrolcü.
- `auth.js`: Firebase kimlik doğrulama, giriş/kayıt ve oturum yönetimi işlevleri.
- `dashboard.js`: Tüm alt modüllerden (su, kalori, egzersiz vb.) gelen özet verileri toplayıp Ana Özet Ekranı'nı render eder.
- `workout.js` & `activeSession.js`: Egzersiz planı oluşturma, güncel split'leri listeleme ve anlık "aktif spor seansı" sürecini yönetme modülleri.
- `calories.js`: Besin arama, kütüphaneye ekleme, öğün/kalori takibi yapma modülü.
- `finance.js`: Gelir/Gider yönetimi, grafik gösterimi ve bütçe planlaması işlemlerini yürütür (Altın/Gümüş API entegrasyonu dahil).
- `water.js`: Günlük su tüketim hedeflerini kaydetme ve yönetme.
- `shopping.js`: Alınacaklar (Alışveriş listesi) CRUD işlemlerini yönetir.
- `books.js` & `movies.js`: Okunan kitaplar ve izlenen film/dizi medya arşivini takip eden listeler.
- `history.js`: Yapılan tüm hareketlerin / logların merkezi bir geçmişte görüntülenmesi.
- `profile.js`: Kullanıcı ayarları (boy, kilo, hedefler, profil resmi vb.) modülü.
- `utils.js` & `listenerManager.js`: Tarih manipülasyonları ve DOM olay dinleyicilerinin bellek sızıntısı yapmadan yönetimi.
- `firebase-config.js` & `api-config.js`: Veritabanı ve harici (CollectAPI gibi) API'lerin kimlik bilgilerini ve bağlantı ayarlarını içerir.

## 2. TEKNOLOJİ YIĞINI
- **Frontend Core:** Pure HTML5, Vanilla JavaScript (ES6+ Modules), Vanilla CSS.
- **Styling:** CSS-in-JS olarak eklenen Tailwind CSS (CDN üzerinden) ve Neumorphic Glassmorphism özel dizaynı.
- **İkonlar ve Fontlar:** Google Material Symbols (Rounded & Outlined) ve Plus Jakarta Sans.
- **Backend / BaaS:** Firebase v10.14.1
  - *Veritabanı:* Cloud Firestore (Çevrimdışı destek açık - `enableMultiTabIndexedDbPersistence`).
  - *Dosya Depolama:* Firebase Storage (Profil fotoğrafları vb. için).
  - *Kimlik Doğrulama:* Firebase Auth (E-posta/Şifre, Google Auth).
- **Harici API:** CollectAPI (Döviz/Altın kurları için).
- **Altyapı (Build/Deploy):** PWA (Progressive Web App) yapısı kullanılıyor (manifest.json ve service worker üzerinden mobil cihazlarda yerel uygulama gibi çalışır). Klasik manuel versiyonlama sistemi uygulanıyor (`?v=TIMESTAMP` URL parametreleriyle cache kırılması).

## 3. MODÜL / ÖZELLİK ENVANTERİ
- **Navigation (Routing):** Uygulama Single Page Application (SPA) olarak çalışıyor. Önceden `.hidden` class değiştirilerek yapılan geçişler, iOS/Android "Geri Kaydırma (Swipe)" hareketlerini native destekleyebilmesi için tam teşekküllü History API (`popstate`, `pushState`) altyapısına taşındı. (Tamamlandı)
- **Dashboard (Özet Ekranı):** Alt modüllerden asenkron gelen özetleri tek ekranda kartlar (`neon-card`) halinde gösterir. (Tamamlandı)
- **Workout (Spor Modülü):** Özel programlar (Splitler) yaratabilme, antrenman seanslarını canlı izleyebilme, "Muscle Map" ile kas gruplarını grafiksel gösterme özelliklerini içerir. Egzersiz kütüphanesi Firestore'a bağlı çalışır. (Büyük ölçüde Tamamlandı, test edilebilir)
- **Calories (Kalori Takibi):** Makro değer (Karbonhidrat, Yağ, Protein) girişleri, klavye kısıtlamalı porsiyon hesaplamaları, liste kaydırmalı (swipe) silme sistemi. (Tamamlandı)
- **Water (Su Takibi):** Dairesel neon dolum animasyonlu sıvı takip ekranı. (Tamamlandı)
- **Finance (Finans):** Canlı kurlar ile günlük gider/gelir dengesi grafikleri. (Tamamlandı)
- **Medya Takibi (Kitap & Film):** Firestore destekli arşiv özelliği. (Tamamlandı)

## 4. VERİ MODELİ
Tüm veriler NoSQL tabanlı Firestore'da, Kullanıcıya özel Alt Koleksiyonlar (Sub-collections) mantığı ile yapılandırılmıştır.
- `users/{uid}`: Kullanıcının ana profili ve meta bilgileri.
- `users/{uid}/workouts`: Egzersiz planları ve split verileri.
- `users/{uid}/workoutLogs`: Tamamlanan günlük egzersiz geçmişleri.
- `users/{uid}/water`: Günlük içilen suların kayıtları.
- `users/{uid}/calories` & `users/{uid}/foods`: Alınan kaloriler ve global besin arşivine eklenmiş şahsi besin veri tabanı.
- `users/{uid}/finance`: Gider/Gelir dökümü.
- `users/{uid}/shopping`: Alışveriş listesi maddeleri.

## 5. TASARIM KARARLARI VE KISITLAR
- **"Neumorphism" & "Neon-Glow" Yaklaşımı:** `neo-surface`, `neo-inset` ve `#F0F2F8` tabanlı, kullanıcıya kabartma ve içe çökme hissiyatı veren renk paletleri ve gölgelendirmeler titizlikle kurgulanmıştır. Tailwind'in standart kütüphanesi yerine özel gölgeler (box-shadow) kullanılmıştır. Tasarım tamamen sabitlenmiştir (değiştirilemez).
- **Kullanıcı Etkileşimi (UX):** İşletim sistemine doğal (Native) hissetmesi için mobildeki ok/geri butonları tamamen kaldırıldı; menü geçişleri History API Swipe (sağa kaydırarak geri gelme) sistemine emanet edildi. 
- **Veri Yükleme:** Sahte ve yanlış "0" verilerinin parlamasını engellemek için açılış yükleme ekranı `...` iskeletine dönüştürüldü.
- **Kısıtlar (Scope Dışı):** Masaüstü görünümü (Responsive PC uyumluluğu) odak dışıdır. Tasarım yalnızca `max-w-[420px]` bazlı katı bir mobil ekran simülasyonudur.

## 6. BİLİNEN SORUNLAR / YARIM KALANLAR
- Gelişmiş veri doğrulama eksiklikleri bazı metin tabanlı girişlerde bulunabilir (Kısmi).
- "Aktif Antrenman" bitirildiğinde Dashboard ve Geçmiş tablosunun anında kendini yenileyebilmesi konusunda race-condition (zamanlama çatışması) ihtimalleri incelenebilir.
- *Şu an bilinen acil veya kilitlenen (blocking) bir bug bulunmamaktadır.*

## 7. SON DURUM
- **En son çalışılan özellik:** Navigasyon mekanizmasının History API kullanacak şekilde tamamen baştan yazılması ve porsiyon klavyesi ile "FOUT (Font Unstyled)" hatalarının çözülmesi, geri (ok) tuşlarının arayüzden kaldırılarak yerlerine görünmez destekleyiciler konulması.
- **Bir Sonraki Adım:** Uygulama genelinde performans testleri, Firebase veri trafiğinin (Reads/Writes) azaltılması veya aktif spor seansı süreçlerinin cilalanması olabilir.

## 8. TERCİHLER / ÇALIŞMA TARZI NOTLARI
- **Güvenlik / Temizlik:* Büyük (mimari) bir kod refactoring veya silme işlemi yapılmadan hemen önce `cleanup: checkpoint before cleanup` etiketiyle proaktif bir şekilde `git commit` atılması zorunludur.
- **Tasarım Bütünlüğü:* UI/UX tasarımlarına (margin, padding, neo-shadows) kesinlikle müdahale edilmez. Yeni elementler var olan elementlerin birebir kopyası olarak uyarlanır.
